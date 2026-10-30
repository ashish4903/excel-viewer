// Small GitHub API helper for reviewing and merging pull requests (no gh CLI needed).
// The token comes from git's credential manager and is never printed.
//
//   node gh.mjs list                        open PRs
//   node gh.mjs show <n> [--wait]           details, files, checks, reviews, open threads (--wait: until checks finish)
//   node gh.mjs diff <n>                    unified diff
//   node gh.mjs threads <n>                 review threads with resolved state and replies
//   node gh.mjs review <n> <review.json>    post a review: { "body": "...", "comments": [{ "path", "line", "body" }] }
//   node gh.mjs merge <n> <headSha>         merge only if every gate passes, then wait for the main workflow run
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

const [cmd, n, arg] = process.argv.slice(2)
const remote = execFileSync('git', ['remote', 'get-url', 'origin']).toString().trim()
const [, owner, repo] = /github\.com[/:]([^/]+)\/(.+?)(\.git)?$/.exec(remote)
const credential = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n' }).toString()
const token = /^password=(.*)$/m.exec(credential)[1]
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': `${repo}-pr-review` }
const base = `https://api.github.com/repos/${owner}/${repo}`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, options = {}) {
  const res = await fetch(path.startsWith('https:') ? path : base + path, { ...options, headers: { ...headers, ...options.headers } })
  if (options.raw) return res.text()
  const data = res.status === 204 ? {} : await res.json()
  if (!res.ok) throw new Error(`${res.status} ${data.message ?? ''} ${JSON.stringify(data.errors ?? '')}`)
  return data
}

async function threads(number) {
  const query = `query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){
    reviewThreads(first:100){nodes{isResolved isOutdated path line comments(first:20){nodes{author{login} body createdAt}}}}}}}`
  const data = await api('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables: { owner, repo, n: Number(number) } }),
  })
  if (data.errors) throw new Error(JSON.stringify(data.errors))
  return data.data.repository.pullRequest.reviewThreads.nodes
}

const checksFor = async (sha) => (await api(`/commits/${sha}/check-runs?per_page=100`)).check_runs

// Waits until every workflow run for the commit (CI, CodeQL, …) has finished and returns them.
// Checking the check runs alone is not enough: a job that is skipped (deploy on PRs) completes at
// once, before the other jobs even appear. Workflows can also start a few seconds apart, so the
// runs must be finished, with the same count, on two polls in a row.
async function waitForRuns(sha) {
  let runs = []
  let settled = 0
  for (let i = 0; i < 60; i++) {
    const previous = runs.length
    runs = (await api(`/actions/runs?head_sha=${sha}`)).workflow_runs ?? []
    const done = runs.length > 0 && runs.every((r) => r.status === 'completed')
    settled = done && runs.length === previous ? settled + 1 : 0
    if (settled >= 1) return runs
    await wait(10000)
  }
  console.log('Still running after 10 minutes; showing the current state.')
  return runs
}

async function show(number, waitForChecks) {
  let pr = await api(`/pulls/${number}`)
  if (waitForChecks) await waitForRuns(pr.head.sha)
  const checks = await checksFor(pr.head.sha)
  // mergeable_state is computed lazily; ask again until GitHub has an answer.
  for (let i = 0; i < 5 && pr.mergeable_state === 'unknown'; i++) {
    await wait(3000)
    pr = await api(`/pulls/${number}`)
  }
  const files = await api(`/pulls/${number}/files?per_page=100`)
  const reviews = await api(`/pulls/${number}/reviews?per_page=100`)
  const open = (await threads(number)).filter((t) => !t.isResolved)
  console.log(`#${pr.number} ${pr.title}`)
  console.log(`author ${pr.user.login} · ${pr.head.ref} → ${pr.base.ref} · head ${pr.head.sha}`)
  console.log(`state ${pr.state}${pr.draft ? ' (draft)' : ''} · merged ${pr.merged} · mergeable_state ${pr.mergeable_state}`)
  console.log(`\nfiles (${files.length}):`)
  for (const f of files) console.log(`  ${f.status.padEnd(8)} ${f.filename} +${f.additions} -${f.deletions}`)
  console.log('\nchecks:')
  for (const c of checks) console.log(`  ${c.name}: ${c.status} ${c.conclusion ?? ''}`)
  console.log('\nreviews:')
  for (const r of reviews) console.log(`  ${r.user.login} ${r.state} on ${r.commit_id.slice(0, 7)}`)
  console.log(`\nunresolved threads: ${open.length}`)
  for (const t of open) console.log(`  ${t.path}:${t.line ?? '?'} ${t.comments.nodes[0]?.body.split('\n')[0].slice(0, 100)}`)
  console.log(`\ndescription:\n${pr.body ?? '(none)'}`)
}

async function merge(number, expectedSha) {
  if (!expectedSha) throw new Error('Pass the head SHA you reviewed: merge <n> <headSha>')
  const pr = await api(`/pulls/${number}`)
  const checks = await checksFor(pr.head.sha)
  const open = (await threads(number)).filter((t) => !t.isResolved)
  const failedChecks = checks.filter((c) => c.status !== 'completed' || !['success', 'skipped', 'neutral'].includes(c.conclusion))
  const problems = [
    pr.state !== 'open' && `PR is ${pr.state}`,
    pr.draft && 'PR is a draft',
    pr.head.sha !== expectedSha && `new commits since review (head is ${pr.head.sha.slice(0, 7)}, reviewed ${expectedSha.slice(0, 7)})`,
    !checks.length && 'no checks have run',
    ...failedChecks.map((c) => `check ${c.name} is ${c.conclusion ?? c.status}`),
    open.length && `${open.length} unresolved review thread(s)`,
    pr.mergeable_state !== 'clean' && `mergeable_state is ${pr.mergeable_state}`,
  ].filter(Boolean)
  if (problems.length) {
    console.log(`Not merging #${number}:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
    process.exit(1)
  }
  const result = await api(`/pulls/${number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: 'merge', sha: expectedSha }),
  })
  console.log(`Merged #${number} as ${result.sha.slice(0, 7)}; waiting for the ${pr.base.ref} workflow runs…`)
  const runs = await waitForRuns(result.sha)
  if (!runs.length) return console.log('No workflow run appeared for the merge commit.')
  for (const run of runs) {
    console.log(`${run.name}: ${run.status} ${run.conclusion ?? ''} ${run.html_url}`)
    for (const job of (await api(`/actions/runs/${run.id}/jobs`)).jobs) console.log(`  ${job.name}: ${job.conclusion ?? job.status}`)
  }
}

if (cmd === 'list') {
  for (const pr of await api('/pulls?state=open&per_page=100'))
    console.log(`#${pr.number} ${pr.title} · ${pr.user.login} · ${pr.head.ref}${pr.draft ? ' (draft)' : ''}`)
} else if (cmd === 'show') {
  await show(n, arg === '--wait')
} else if (cmd === 'diff') {
  process.stdout.write(await api(`/pulls/${n}`, { raw: true, headers: { Accept: 'application/vnd.github.diff' } }))
} else if (cmd === 'threads') {
  for (const t of await threads(n)) {
    console.log(`\n[${t.isResolved ? 'resolved' : 'OPEN'}${t.isOutdated ? ', outdated' : ''}] ${t.path}:${t.line ?? '?'}`)
    for (const c of t.comments.nodes) console.log(`  ${c.author?.login}: ${c.body.replace(/\n/g, '\n    ')}`)
  }
} else if (cmd === 'review') {
  const { body, comments = [] } = JSON.parse(readFileSync(arg, 'utf8'))
  const pr = await api(`/pulls/${n}`)
  const review = await api(`/pulls/${n}/reviews`, {
    method: 'POST',
    // COMMENT works on every PR; GitHub refuses APPROVE / REQUEST_CHANGES on your own PRs.
    body: JSON.stringify({ commit_id: pr.head.sha, event: 'COMMENT', body, comments: comments.map((c) => ({ side: 'RIGHT', ...c })) }),
  })
  console.log(`Posted review on ${pr.head.sha.slice(0, 7)} with ${comments.length} inline comment(s): ${review.html_url}`)
} else if (cmd === 'merge') {
  await merge(n, arg)
} else {
  console.log('Usage: node gh.mjs list | show <n> [--wait] | diff <n> | threads <n> | review <n> <file.json> | merge <n> <headSha>')
  process.exit(1)
}

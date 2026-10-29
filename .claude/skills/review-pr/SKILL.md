---
name: review-pr
description: Use when asked to review a pull request, check open PRs, follow up on review comments, or merge a reviewed PR into main. Reviews the code changes, posts comments on GitHub, and merges only after every comment is resolved and all checks pass.
---

# Review and merge pull requests

All GitHub calls go through `node .claude/skills/review-pr/scripts/gh.mjs` (run it from the repo root). Commands: `list`, `show <n> [--wait]`, `diff <n>`, `threads <n>`, `review <n> <file.json>`, `merge <n> <headSha>`. The token comes from `git credential fill` inside the script; never print, log or store it.

With no PR number, run `list` and review every open PR, oldest first.

## 1. Gather

1. `show <n> --wait`: note the head SHA, files, checks, earlier reviews and unresolved threads.
2. If this PR was already reviewed at the current head SHA and nothing changed, skip to step 4.
3. `diff <n>`, saved to a file in the scratchpad. For each changed source file, read the whole file at the PR head (`git fetch origin <branch>` then `git show origin/<branch>:<path>`), not only the diff, so the change is judged in context.

## 2. Review

Check the change against the project rules in CLAUDE.md, then for:

- **Correctness**: logic errors, edge cases (empty sheet, missing header, huge file, odd cell types), React state and effect mistakes, broken keyboard or screen-reader behaviour.
- **Project rules**: parsing only in `src/utils/parseExcel.js`; columns detected per file, never hard-coded in components; plain React + CSS; one small component per file; mobile-first CSS.
- **Tests**: new behaviour in `src/utils` has a `*.test.js`; screen behaviour is covered in `src/App.test.jsx` when it matters.
- **Security and privacy**: no secrets or tokens, nothing from `sample-data/`, no file contents sent off the device, no new network calls.
- **Dependency bumps** (Dependabot): read the release notes in the PR body for breaking changes and Node engine changes, and say whether each one affects this repo. The `deploy` job only runs on main, so changes to it are untested until merge; say so.

Only comment on real problems or clear improvements. Do not nitpick style that ESLint already accepts.

## 3. Comment

Write a review JSON in the scratchpad and post it with `review <n> <file.json>`:

```json
{
  "body": "Summary: what the PR does, what was checked, and the verdict.",
  "comments": [{ "path": "src/components/DataTable.jsx", "line": 42, "body": "What is wrong, why it matters, and a suggested fix." }]
}
```

- `line` is a line number in the new version of the file and must be part of the diff.
- Each inline comment opens a thread the author must resolve on GitHub.
- No inline comments means the PR is ready; say so in the body.
- Never add AI or tool attribution to review text.

Tell the user the verdict and list each comment in one line.

## 4. Follow up and merge

When asked to check a reviewed PR again, or when the user says comments are addressed:

1. `show <n> --wait` and `threads <n>`.
2. If there are new commits, review the new changes (steps 1–3) before going on.
3. For each thread the author resolved, confirm the fix is really in the code. If it is not, post a new review with an inline comment on that line explaining what is still missing, and leave the PR unmerged.
4. Merge with `merge <n> <headSha>`, passing the SHA you reviewed. The script refuses unless:
   - the PR is open and not a draft
   - the head is still the reviewed SHA
   - every check passed
   - no review threads are unresolved
   - GitHub reports the branch mergeable (`clean`)
5. After merging, the script waits for the main workflow run. Report the build, audit and deploy result. If deploy fails, tell the user right away; the live site keeps the previous version.
6. `git switch main` and `git pull --ff-only` so the local copy matches.

Never bypass branch protection, force-push, or delete branches. If any gate fails, report what is blocking and stop.

// Wraps case-insensitive matches of `query` in <mark>.
function Highlight({ text, query }) {
  const q = query.trim()
  if (!q) return text

  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts = []
  let start = 0
  let index = lower.indexOf(needle)
  while (index !== -1) {
    if (index > start) parts.push(text.slice(start, index))
    parts.push(<mark key={index}>{text.slice(index, index + needle.length)}</mark>)
    start = index + needle.length
    index = lower.indexOf(needle, start)
  }
  if (start < text.length) parts.push(text.slice(start))
  return parts
}

export default Highlight

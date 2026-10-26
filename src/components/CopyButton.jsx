import { useState } from 'react'
import Icon from './Icon.jsx'

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (e.g. insecure context); nothing to do.
    }
  }

  return (
    <button
      type="button"
      className={`icon-button ghost copy${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : `Copy ${label}`}
      title={copied ? 'Copied!' : 'Copy'}
    >
      <Icon name={copied ? 'check' : 'copy'} size={15} />
    </button>
  )
}

export default CopyButton

import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

function SearchBar({ value, onChange }) {
  const inputRef = useRef(null)

  // Press "/" anywhere (outside a form field) to jump to search.
  useEffect(() => {
    function handleKey(event) {
      const tag = event.target.tagName
      if (event.key === '/' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
        event.preventDefault()
        inputRef.current.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="search">
      <Icon name="search" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && onChange('')}
        placeholder="Search across all columns…"
        aria-label="Search all columns"
      />
      {value ? (
        <button type="button" className="icon-button ghost" onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="x" size={16} />
        </button>
      ) : (
        <kbd className="hide-mobile">/</kbd>
      )}
    </div>
  )
}

export default SearchBar

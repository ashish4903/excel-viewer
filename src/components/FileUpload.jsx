import { useRef, useState } from 'react'
import Icon from './Icon.jsx'

// variant 'hero': large drag-and-drop zone; 'compact': header button (also accepts drops).
// progress: status text from the parser while loading (e.g. "Preparing rows… 40%").
function FileUpload({ onFile, loading, progress, variant = 'hero' }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function openPicker() {
    if (!loading) inputRef.current.click()
  }

  function handleChange(event) {
    const file = event.target.files?.[0]
    // Reset so choosing the same file again still triggers a change.
    event.target.value = ''
    if (file) onFile(file)
  }

  const dropProps = {
    onDragOver: (event) => {
      event.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event) => {
      event.preventDefault()
      setDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) onFile(file)
    },
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      onChange={handleChange}
      hidden
    />
  )

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          className={`button glass${dragging ? ' dragging' : ''}`}
          onClick={openPicker}
          disabled={loading}
          title={loading ? progress : undefined}
          {...dropProps}
        >
          {loading ? <span className="spinner small" /> : <Icon name="upload" />}
          <span className="hide-mobile">{loading ? progress || 'Reading…' : 'Open file'}</span>
        </button>
        {input}
      </>
    )
  }

  return (
    <>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Choose an .xlsx file"
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        {...dropProps}
      >
        <div className="dropzone-icon">{loading ? <span className="spinner" /> : <Icon name="upload" size={32} />}</div>
        <h2>{loading ? 'Reading your file…' : dragging ? 'Release to upload' : 'Drop your Excel file here'}</h2>
        {loading ? (
          <p aria-live="polite">{progress || 'Starting…'}</p>
        ) : (
          <p>
            or <span className="link">browse your computer</span> · .xlsx files only
          </p>
        )}
      </div>
      {input}
    </>
  )
}

export default FileUpload

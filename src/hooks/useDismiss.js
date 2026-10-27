import { useEffect } from 'react'

// While open, calls setOpen(false) on a mousedown outside ref or on Escape.
export function useDismiss(ref, open, setOpen) {
  useEffect(() => {
    if (!open) return
    function handlePointer(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [ref, open, setOpen])
}

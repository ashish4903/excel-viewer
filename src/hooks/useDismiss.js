import { useEffect } from 'react'

// While open, calls setOpen(false) on a mousedown outside ref, when keyboard focus leaves ref,
// or on Escape. Escape also moves focus back to the button that opened it (the first button in ref).
export function useDismiss(ref, open, setOpen) {
  useEffect(() => {
    if (!open) return
    function handlePointer(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    function handleFocus(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    function handleKey(event) {
      if (event.key !== 'Escape') return
      setOpen(false)
      ref.current?.querySelector('button')?.focus()
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('focusin', handleFocus)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('focusin', handleFocus)
      document.removeEventListener('keydown', handleKey)
    }
  }, [ref, open, setOpen])
}

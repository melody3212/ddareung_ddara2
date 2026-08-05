import { useCallback, useRef, useState } from 'react'

/** 짧은 토스트 메시지 */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const showToast = useCallback((message: string, ms = 3500) => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    setToast(message)
    timerRef.current = window.setTimeout(() => {
      setToast(null)
      timerRef.current = null
    }, ms)
  }, [])

  const clearToast = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setToast(null)
  }, [])

  return { toast, showToast, clearToast }
}

import { useCallback, useMemo, useRef, useState } from 'react'
import { buildCourseMapOverlay } from '../lib/courseMapOverlay'
import type { Course } from '../types'

type Options = {
  boundsPadding?: [number, number, number, number]
  onSelectExtra?: (course: Course | null) => void
}

/** 코스 선택 + 지도 오버레이 focusKey */
export function useCourseSelection(options: Options = {}) {
  const [selected, setSelected] = useState<Course | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  const extraRef = useRef(options.onSelectExtra)
  extraRef.current = options.onSelectExtra
  const pad = options.boundsPadding

  const select = useCallback((course: Course | null) => {
    setSelected(course)
    if (course) setFocusKey((n) => n + 1)
    extraRef.current?.(course)
  }, [])

  const clear = useCallback(() => {
    setSelected(null)
    extraRef.current?.(null)
  }, [])

  const refocus = useCallback(() => {
    setFocusKey((n) => n + 1)
  }, [])

  const overlay = useMemo(
    () => buildCourseMapOverlay(selected, focusKey, pad),
    [selected, focusKey, pad],
  )

  return {
    selected,
    focusKey,
    select,
    clear,
    refocus,
    overlay,
    selectedId: selected?.course_id ?? null,
  }
}

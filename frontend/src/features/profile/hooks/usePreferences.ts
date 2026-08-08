import { useCallback, useState } from 'react'
import { useUiStore } from '../../../shared/store/uiStore'
import {
  loadPreferences,
  savePreferences,
} from '../preferencesStorage'
import type { UserPreferences } from '../types'

/** 설정 읽기/쓰기 + 지도 기본값 즉시 반영 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences())
  const setShowStations = useUiStore((s) => s.setShowStations)
  const setShowBikePaths = useUiStore((s) => s.setShowBikePaths)
  const setShowSlope = useUiStore((s) => s.setShowSlope)

  const update = useCallback(
    (partial: Partial<UserPreferences>) => {
      const next = savePreferences(partial)
      setPrefs(next)
      if (partial.defaultShowStations != null) {
        setShowStations(next.defaultShowStations)
      }
      if (partial.defaultShowBikePaths != null) {
        setShowBikePaths(next.defaultShowBikePaths)
      }
      if (partial.defaultShowSlope != null) {
        setShowSlope(next.defaultShowSlope)
      }
      return next
    },
    [setShowStations, setShowBikePaths, setShowSlope],
  )

  const reload = useCallback(() => {
    setPrefs(loadPreferences())
  }, [])

  return { prefs, update, reload }
}

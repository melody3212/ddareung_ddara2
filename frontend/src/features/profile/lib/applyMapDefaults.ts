import { useUiStore } from '../../../shared/store/uiStore'
import { loadPreferences } from '../preferencesStorage'

/** 앱 기동 시 저장된 지도 기본 레이어 적용 */
export function applyMapDefaultsFromPreferences(): void {
  const p = loadPreferences()
  const st = useUiStore.getState()
  st.setShowStations(p.defaultShowStations)
  st.setShowBikePaths(p.defaultShowBikePaths)
  st.setShowSlope(p.defaultShowSlope)
}

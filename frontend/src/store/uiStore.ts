import { create } from 'zustand'

type UiState = {
  /** 따릉이 대여소 레이어 */
  showStations: boolean
  setShowStations: (on: boolean) => void
  toggleStations: () => void
  /** 자전거 도로 레이어 */
  showBikePaths: boolean
  setShowBikePaths: (on: boolean) => void
  toggleBikePaths: () => void
  bottomSheetOpen: boolean
  setBottomSheetOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  showStations: true,
  setShowStations: (showStations) => set({ showStations }),
  toggleStations: () => set((s) => ({ showStations: !s.showStations })),
  showBikePaths: true,
  setShowBikePaths: (showBikePaths) => set({ showBikePaths }),
  toggleBikePaths: () => set((s) => ({ showBikePaths: !s.showBikePaths })),
  bottomSheetOpen: true,
  setBottomSheetOpen: (bottomSheetOpen) => set({ bottomSheetOpen }),
}))

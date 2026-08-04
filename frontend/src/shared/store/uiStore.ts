import { create } from 'zustand'

export type SheetSnap = 'collapsed' | 'half' | 'full'

type UiState = {
  showStations: boolean
  setShowStations: (on: boolean) => void
  toggleStations: () => void
  showBikePaths: boolean
  setShowBikePaths: (on: boolean) => void
  toggleBikePaths: () => void
  /** 급경사 구간을 붉은색 계열로 강조 */
  showSlope: boolean
  setShowSlope: (on: boolean) => void
  toggleSlope: () => void
  sheetSnap: SheetSnap
  setSheetSnap: (snap: SheetSnap) => void
  cycleSheetSnap: () => void
}

const SNAP_ORDER: SheetSnap[] = ['collapsed', 'half', 'full']

export const useUiStore = create<UiState>((set, get) => ({
  showStations: true,
  setShowStations: (showStations) => set({ showStations }),
  toggleStations: () => set((s) => ({ showStations: !s.showStations })),
  showBikePaths: true,
  setShowBikePaths: (showBikePaths) => set({ showBikePaths }),
  toggleBikePaths: () => set((s) => ({ showBikePaths: !s.showBikePaths })),
  showSlope: false,
  setShowSlope: (showSlope) => set({ showSlope }),
  toggleSlope: () => set((s) => ({ showSlope: !s.showSlope })),
  sheetSnap: 'half',
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  cycleSheetSnap: () => {
    const cur = get().sheetSnap
    const i = SNAP_ORDER.indexOf(cur)
    set({ sheetSnap: SNAP_ORDER[(i + 1) % SNAP_ORDER.length] })
  },
}))

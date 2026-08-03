import { create } from 'zustand'

export type MapMode = 'personal' | 'ddareung' | 'road' | 'route'

type UiState = {
  mapMode: MapMode
  setMapMode: (mode: MapMode) => void
  bottomSheetOpen: boolean
  setBottomSheetOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  mapMode: 'ddareung',
  setMapMode: (mapMode) => set({ mapMode }),
  bottomSheetOpen: true,
  setBottomSheetOpen: (bottomSheetOpen) => set({ bottomSheetOpen }),
}))

import type { SelectedPlace } from '../places'

/** 빠른 테스트용 서울 프리셋 (장소명) */
export const ROUTE_PRESETS: Array<{
  label: string
  origin: SelectedPlace
  destination: SelectedPlace
}> = [
  {
    label: '여의도 → 시청',
    origin: {
      name: '여의도역',
      lat: 37.5219,
      lng: 126.9245,
      address: '서울 영등포구',
    },
    destination: {
      name: '서울시청',
      lat: 37.5665,
      lng: 126.978,
      address: '서울 중구',
    },
  },
  {
    label: '광화문 → 잠실한강',
    origin: {
      name: '광화문',
      lat: 37.5759,
      lng: 126.9768,
      address: '서울 종로구',
    },
    destination: {
      name: '잠실한강공원',
      lat: 37.5178,
      lng: 127.0824,
      address: '서울 송파구',
    },
  },
  {
    label: '홍대 → 여의나루',
    origin: {
      name: '홍대입구역',
      lat: 37.5563,
      lng: 126.9236,
      address: '서울 마포구',
    },
    destination: {
      name: '여의나루역',
      lat: 37.527,
      lng: 126.9326,
      address: '서울 영등포구',
    },
  },
]

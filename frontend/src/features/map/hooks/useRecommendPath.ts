import { useCallback, useEffect, type MutableRefObject, type RefObject } from 'react'
import type { BikeRoadLine } from '../../bike-roads'
import { formatDistance, getDistanceMeters } from '../../../shared/geo'

type MapStatus = 'loading' | 'ready' | 'error'
type LatLng = { lat: number; lng: number }

type Args = {
  mapRef: RefObject<kakao.maps.Map | null>
  status: MapStatus
  bikeRoads: BikeRoadLine[] | null
  centerRef: MutableRefObject<LatLng>
  recommendLineRef: MutableRefObject<kakao.maps.Polyline | null>
  setRecommendHint: (hint: string | null) => void
}

/** 가까운 하천/공원형 도로 추천 폴리라인 */
export function useRecommendPath({
  mapRef,
  status,
  bikeRoads,
  centerRef,
  recommendLineRef,
  setRecommendHint,
}: Args) {
  const updateRecommendedPath = useCallback(
    (lat: number, lng: number) => {
      const map = mapRef.current
      if (!map || !window.kakao?.maps || !bikeRoads?.length) return

      const riverPark = bikeRoads.filter((item) => item.type === '하천/공원형')
      if (!riverPark.length) {
        setRecommendHint(null)
        recommendLineRef.current?.setMap(null)
        return
      }

      let best: BikeRoadLine | null = null
      let bestDist = Infinity
      for (const cur of riverPark) {
        const p0 = cur.path[0]
        if (!p0) continue
        const dist = getDistanceMeters({ lat, lng }, p0)
        if (dist < bestDist) {
          bestDist = dist
          best = cur
        }
      }
      if (!best) return

      const maps = window.kakao.maps
      recommendLineRef.current?.setMap(null)
      const pathLatLng = best.path.map((p) => new maps.LatLng(p.lat, p.lng))
      recommendLineRef.current = new maps.Polyline({
        map,
        path: pathLatLng,
        strokeWeight: 6,
        strokeColor: 'blue',
        strokeOpacity: 1,
        strokeStyle: 'dash',
      })
      setRecommendHint(`추천(하천/공원형) · 약 ${formatDistance(bestDist)}`)
    },
    [mapRef, bikeRoads, recommendLineRef, setRecommendHint],
  )

  useEffect(() => {
    if (status !== 'ready' || !bikeRoads?.length) return
    const { lat, lng } = centerRef.current
    updateRecommendedPath(lat, lng)
  }, [bikeRoads, status, centerRef, updateRecommendedPath])

  return { updateRecommendedPath }
}

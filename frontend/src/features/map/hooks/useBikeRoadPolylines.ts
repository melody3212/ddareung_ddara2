import { useEffect, type MutableRefObject, type RefObject } from 'react'
import { courseTypeColor, type BikeRoadLine } from '../../bike-roads'

type MapStatus = 'loading' | 'ready' | 'error'

type Args = {
  mapRef: RefObject<kakao.maps.Map | null>
  status: MapStatus
  showBikePaths: boolean
  showSlope: boolean
  bikeRoads: BikeRoadLine[] | null
  polylinesRef: MutableRefObject<kakao.maps.Polyline[]>
}

/** 자전거도로 타입별 폴리라인 */
export function useBikeRoadPolylines({
  mapRef,
  status,
  showBikePaths,
  showSlope,
  bikeRoads,
  polylinesRef,
}: Args) {
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []

    if (!showBikePaths || !bikeRoads?.length) return

    let i = 0
    const batch = 200
    let cancelled = false
    let raf = 0
    const opacity = showSlope ? 0.18 : 0.45

    const drawBatch = () => {
      if (cancelled || !mapRef.current) return
      const end = Math.min(i + batch, bikeRoads.length)
      for (; i < end; i++) {
        const { path, type } = bikeRoads[i]
        const pathLatLng = path.map((p) => new maps.LatLng(p.lat, p.lng))
        const line = new maps.Polyline({
          map: mapRef.current,
          path: pathLatLng,
          strokeWeight: 4,
          strokeColor: courseTypeColor(type),
          strokeOpacity: opacity,
          strokeStyle: 'solid',
        })
        polylinesRef.current.push(line)
      }
      if (i < bikeRoads.length) raf = requestAnimationFrame(drawBatch)
    }
    drawBatch()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      polylinesRef.current.forEach((p) => p.setMap(null))
      polylinesRef.current = []
    }
  }, [mapRef, status, showBikePaths, showSlope, bikeRoads, polylinesRef])
}

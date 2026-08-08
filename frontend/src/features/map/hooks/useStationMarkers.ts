import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { Station } from '../../stations'
import { buildStationInfoHtml } from '../lib/stationInfoHtml'

type MapStatus = 'loading' | 'ready' | 'error'

type Args = {
  mapRef: RefObject<kakao.maps.Map | null>
  status: MapStatus
  showStations: boolean
  stations: Station[]
  clustererRef: MutableRefObject<kakao.maps.MarkerClusterer | null>
  markersRef: MutableRefObject<kakao.maps.Marker[]>
  markerImageRef: MutableRefObject<kakao.maps.MarkerImage | null>
  infoRef: MutableRefObject<kakao.maps.InfoWindow | null>
}

/** 따릉이 대여소 마커 + 클러스터 + 카드형 정보 팝업 */
export function useStationMarkers({
  mapRef,
  status,
  showStations,
  stations,
  clustererRef,
  markersRef,
  markerImageRef,
  infoRef,
}: Args) {
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    clustererRef.current?.clear()
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoRef.current?.close()

    if (!showStations || stations.length === 0) return

    const markers: kakao.maps.Marker[] = []

    stations.forEach((s) => {
      const pos = new maps.LatLng(s.lat, s.lng)
      const marker = new maps.Marker({
        position: pos,
        title: s.name,
        image: markerImageRef.current ?? undefined,
      })
      maps.event.addListener(marker, 'click', () => {
        const iw = infoRef.current
        if (!iw) return
        iw.setContent(buildStationInfoHtml(s))
        iw.open(map, marker)
      })
      markers.push(marker)
    })

    markersRef.current = markers
    if (clustererRef.current) {
      clustererRef.current.addMarkers(markers)
    } else {
      markers.forEach((m) => m.setMap(map))
    }
  }, [
    mapRef,
    status,
    showStations,
    stations,
    clustererRef,
    markersRef,
    markerImageRef,
    infoRef,
  ])
}

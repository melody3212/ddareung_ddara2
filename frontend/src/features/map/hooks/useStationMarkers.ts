import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { Station } from '../../stations'
import { escapeHtml } from '../lib/escapeHtml'

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

/** 따릉이 대여소 마커 + 클러스터 */
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
        const detail = [
          s.bike_count != null ? `남은 자전거: ${s.bike_count} 대` : null,
          s.rack_tot_cnt != null ? `거치대 ${s.rack_tot_cnt}` : null,
        ].filter(Boolean)
        const iw = infoRef.current
        if (iw) {
          iw.setContent(
            `<div style="padding:8px 10px;font-size:12px;min-width:140px;line-height:1.4;">
              <strong>${escapeHtml(s.name)}</strong><br/>
              <span style="color:#64748b">${escapeHtml(detail.join(' · ') || '정보 없음')}</span>
            </div>`,
          )
          iw.open(map, marker)
        }
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

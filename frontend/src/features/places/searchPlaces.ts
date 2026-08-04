/**
 * 장소 검색
 * 1) 백엔드 /api/places/search (카카오 REST 또는 mock)
 * 2) 결과가 빈약하면 카카오 JS Places 키워드 검색 폴백
 */
import { request } from '../../shared/api/client'
import { loadKakaoMaps } from '../map'
import type { PlaceItem, PlaceMeta, PlaceSearchResponse } from './types'

export const placesApi = {
  meta: () => request<PlaceMeta>('/places/meta'),
  search: (q: string, opts?: { size?: number; lat?: number; lng?: number }) => {
    const params = new URLSearchParams({ q: q.trim() })
    if (opts?.size != null) params.set('size', String(opts.size))
    if (opts?.lat != null) params.set('lat', String(opts.lat))
    if (opts?.lng != null) params.set('lng', String(opts.lng))
    return request<PlaceSearchResponse>(`/places/search?${params.toString()}`)
  },
}

/** 카카오 Maps JS SDK Places 키워드 검색 */
export function searchPlacesViaKakaoJs(
  query: string,
  opts?: { lat?: number; lng?: number; size?: number },
): Promise<PlaceItem[]> {
  const q = query.trim()
  if (!q) return Promise.resolve([])

  return loadKakaoMaps().then(
    (maps) =>
      new Promise((resolve) => {
        const placesService = new maps.services.Places()
        const size = opts?.size ?? 10

        const done = (data: kakao.maps.services.PlacesSearchResult, status: kakao.maps.services.Status) => {
          if (status !== maps.services.Status.OK || !Array.isArray(data)) {
            resolve([])
            return
          }
          const items: PlaceItem[] = data.slice(0, size).map((row, i) => ({
            id: String(row.id || `js-${i}-${row.x},${row.y}`),
            name: row.place_name,
            address: row.address_name || null,
            road_address: row.road_address_name || null,
            category: row.category_name || null,
            phone: row.phone || null,
            lat: Number(row.y),
            lng: Number(row.x),
            source: 'kakao_js',
          }))
          resolve(items.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)))
        }

        if (opts?.lat != null && opts?.lng != null) {
          placesService.keywordSearch(q, done, {
            location: new maps.LatLng(opts.lat, opts.lng),
            size,
          })
        } else {
          placesService.keywordSearch(q, done, { size })
        }
      }),
  )
}

function mergePlaces(a: PlaceItem[], b: PlaceItem[], limit: number): PlaceItem[] {
  const seen = new Set<string>()
  const out: PlaceItem[] = []
  for (const p of [...a, ...b]) {
    const key = `${p.name}|${p.lat.toFixed(5)}|${p.lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
    if (out.length >= limit) break
  }
  return out
}

/**
 * 통합 검색: 서버 + (필요 시) JS Places
 */
export async function searchPlaces(
  query: string,
  opts?: { size?: number; lat?: number; lng?: number },
): Promise<{ places: PlaceItem[]; source: string; note?: string }> {
  const q = query.trim()
  if (q.length < 1) return { places: [], source: 'empty' }

  const size = opts?.size ?? 10
  let serverPlaces: PlaceItem[] = []
  let serverSource = 'none'
  let note: string | undefined

  try {
    const res = await placesApi.search(q, opts)
    serverPlaces = res.places ?? []
    serverSource = res.source
    note = res.note ?? undefined
  } catch {
    // 백엔드 다운 시 JS만
  }

  // 카카오 REST 결과 충분하면 그대로
  if (serverSource === 'kakao_local' && serverPlaces.length > 0) {
    return { places: serverPlaces.slice(0, size), source: serverSource, note }
  }

  // mock 이거나 결과 부족 → JS Places 보완
  let jsPlaces: PlaceItem[] = []
  try {
    jsPlaces = await searchPlacesViaKakaoJs(q, opts)
  } catch {
    // JS 키/SDK 실패
  }

  const merged = mergePlaces(serverPlaces, jsPlaces, size)
  const source =
    jsPlaces.length && serverPlaces.length
      ? `${serverSource}+kakao_js`
      : jsPlaces.length
        ? 'kakao_js'
        : serverSource

  return {
    places: merged,
    source,
    note:
      note ||
      (merged.length === 0
        ? '검색 결과가 없습니다. 다른 상호·지명을 입력해 보세요.'
        : undefined),
  }
}

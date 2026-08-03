/**
 * 원본: https://github.com/melody3212/ddareung-ddara
 * MapPage.jsx 자전거도로 분류·파싱 (VALUE_03 + bikeload.geojson)
 */

export type CourseType = '하천/공원형' | '도로변형' | '기타'

export type BikeRoadLine = {
  path: { lat: number; lng: number }[]
  type: CourseType
  rawType?: string
}

/**
 * VALUE_03 기반 안전성 중심 분류
 * - 전용도로/전용차로/겸용(분리형) → 하천/공원형 (상대적으로 안전)
 * - 우선도로/차도높이형/겸용(비분리형) → 도로변형
 */
export function getCourseType(raw?: string | null): CourseType {
  if (!raw) return '기타'
  if (raw.includes('전용도로') && !raw.includes('차도높이형')) return '하천/공원형'
  if (raw.includes('전용차로') || raw.includes('겸용도로(분리형)')) return '하천/공원형'
  if (
    raw.includes('우선도로') ||
    raw.includes('차도높이형') ||
    raw.includes('겸용도로(비분리형)')
  ) {
    return '도로변형'
  }
  return '기타'
}

/** GitHub 원본 MapPage 색상: 하천/공원 green, 도로변형 gray, 기타 red */
export function courseTypeColor(type: CourseType): string {
  if (type === '하천/공원형') return 'green'
  if (type === '도로변형') return 'gray'
  return 'red'
}

type GeoJsonLike = {
  type?: string
  features?: Array<{
    properties?: Record<string, unknown>
    geometry?: {
      type?: string
      coordinates?: number[][]
      geometries?: Array<{ type?: string; coordinates?: number[][] }>
    }
  }>
}

/**
 * GeometryCollection 안의 LineString 만 추출 → 카카오 Polyline path
 */
export function parseBikeRoadGeoJson(geojson: GeoJsonLike): BikeRoadLine[] {
  const lines: BikeRoadLine[] = []
  const features = geojson.features ?? []

  for (const feature of features) {
    const raw = String(feature.properties?.['VALUE_03'] ?? feature.properties?.VALUE_03 ?? '')
    const type = getCourseType(raw)
    const geom = feature.geometry
    if (!geom) continue

    const pushLineString = (coords: number[][] | undefined) => {
      if (!Array.isArray(coords) || coords.length < 2) return
      const path = coords
        .map(([lng, lat]) => ({
          lat: Number(lat),
          lng: Number(lng),
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      if (path.length > 1) {
        lines.push({ path, type, rawType: raw || undefined })
      }
    }

    if (geom.type === 'GeometryCollection') {
      geom.geometries?.forEach((g) => {
        if (g.type === 'LineString') pushLineString(g.coordinates)
        // MultiLineString 지원
        if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
          ;(g.coordinates as unknown as number[][][]).forEach((line) => pushLineString(line))
        }
      })
    } else if (geom.type === 'LineString') {
      pushLineString(geom.coordinates)
    } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
      ;(geom.coordinates as unknown as number[][][]).forEach((line) => pushLineString(line))
    }
  }

  return lines
}

let _cache: BikeRoadLine[] | null = null
let _loadPromise: Promise<BikeRoadLine[]> | null = null

/** public/data/bikeload.geojson 로드 (한 번 캐시) */
export function loadBikeRoads(): Promise<BikeRoadLine[]> {
  if (_cache) return Promise.resolve(_cache)
  if (_loadPromise) return _loadPromise

  _loadPromise = fetch('/data/bikeload.geojson')
    .then(async (res) => {
      if (!res.ok) throw new Error(`bikeload.geojson HTTP ${res.status}`)
      const geojson = (await res.json()) as GeoJsonLike
      _cache = parseBikeRoadGeoJson(geojson)
      return _cache
    })
    .catch((e) => {
      _loadPromise = null
      throw e
    })

  return _loadPromise
}

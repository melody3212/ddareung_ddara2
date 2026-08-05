/**
 * 관리자 대시보드 — 백엔드/클라이언트 상태 프로브 (키·시크릿 노출 없음)
 */
import { bikeRoadsApi } from '../bike-roads'
import { coursesApi } from '../courses'
import { elevationApi } from '../elevation'
import { placesApi } from '../places'
import { routesApi } from '../routes'
import {
  countRideRecords,
  listRideRecords,
  loadActiveRideSession,
} from '../rides'
import { stationsApi } from '../stations'
import { weatherApi } from '../weather'
import { getApiBase, request } from '../../shared/api/client'
import type { ClientEnvInfo, LocalRideInfo, ProbeResult, ProbeStatus } from './types'

async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; latencyMs: number }> {
  const t0 = performance.now()
  const data = await fn()
  return { data, latencyMs: Math.round(performance.now() - t0) }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message.slice(0, 240)
  return String(e).slice(0, 240)
}

export function getClientEnvInfo(): ClientEnvInfo {
  const kakao = (import.meta.env.VITE_KAKAO_JS_KEY as string | undefined)?.trim()
  return {
    apiBase: getApiBase(),
    kakaoJsKeySet: Boolean(kakao),
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    geolocation:
      typeof navigator !== 'undefined' && 'geolocation' in navigator,
    secureContext:
      typeof window !== 'undefined' ? window.isSecureContext : false,
  }
}

export function getLocalRideInfo(): LocalRideInfo {
  const records = listRideRecords()
  const active = loadActiveRideSession()
  const totalDistanceM = records.reduce((s, r) => s + (r.distanceM || 0), 0)
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('ddareung_')) keys.push(k)
    }
  } catch {
    /* private mode */
  }
  return {
    recordCount: countRideRecords(),
    hasActiveSession: Boolean(active),
    totalDistanceM,
    storageKeys: keys.sort(),
  }
}

export async function runAllProbes(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = []

  // 1) Health
  try {
    const { data, latencyMs } = await timed(() =>
      request<{ status: string; app: string; env?: string }>('/health'),
    )
    results.push({
      id: 'health',
      label: 'Backend Health',
      group: 'core',
      status: data.status === 'ok' ? 'ok' : 'warn',
      latencyMs,
      summary: `${data.app} · ${data.status}`,
      detail: data.env ? `env=${data.env}` : undefined,
      source: 'GET /api/health',
    })
  } catch (e) {
    results.push({
      id: 'health',
      label: 'Backend Health',
      group: 'core',
      status: 'error',
      latencyMs: null,
      summary: '연결 실패',
      detail: errMsg(e),
      source: 'GET /api/health',
    })
  }

  // 2) Stations
  try {
    const { data, latencyMs } = await timed(() => stationsApi.meta())
    const status: ProbeStatus =
      data.count > 0 ? (data.source === 'mock' ? 'warn' : 'ok') : 'error'
    results.push({
      id: 'stations',
      label: '따릉이 대여소',
      group: 'data',
      status,
      latencyMs,
      summary: `${data.count}곳 · source=${data.source}`,
      detail: data.note,
      source: data.source,
    })
  } catch (e) {
    results.push({
      id: 'stations',
      label: '따릉이 대여소',
      group: 'data',
      status: 'error',
      latencyMs: null,
      summary: 'meta 실패',
      detail: errMsg(e),
    })
  }

  // 3) Weather
  try {
    const { data, latencyMs } = await timed(() => weatherApi.get())
    const status: ProbeStatus =
      data.source?.includes('mock') || data.source === 'mock' ? 'warn' : 'ok'
    results.push({
      id: 'weather',
      label: '날씨 / 라이딩점수',
      group: 'data',
      status,
      latencyMs,
      summary: `${data.temp_c ?? '?'}°C · score ${data.score ?? '?'} · ${data.source ?? '?'}`,
      detail: data.message || undefined,
      source: data.source,
    })
  } catch (e) {
    results.push({
      id: 'weather',
      label: '날씨 / 라이딩점수',
      group: 'data',
      status: 'error',
      latencyMs: null,
      summary: '조회 실패',
      detail: errMsg(e),
    })
  }

  // 4) Courses
  try {
    const { data, latencyMs } = await timed(() => coursesApi.list())
    const withPath = data.filter((c) => c.path && c.path.length >= 2).length
    results.push({
      id: 'courses',
      label: '추천코스',
      group: 'data',
      status: data.length > 0 ? 'ok' : 'warn',
      latencyMs,
      summary: `${data.length}개 · path 있음 ${withPath}개`,
      detail: data
        .map((c) => c.title)
        .join(', ')
        .slice(0, 200),
      source: 'GET /api/courses',
    })
  } catch (e) {
    results.push({
      id: 'courses',
      label: '추천코스',
      group: 'data',
      status: 'error',
      latencyMs: null,
      summary: '조회 실패',
      detail: errMsg(e),
    })
  }

  // 5) Places
  try {
    const { data, latencyMs } = await timed(() => placesApi.meta())
    results.push({
      id: 'places',
      label: '장소 검색 (카카오 REST)',
      group: 'data',
      status: data.configured ? 'ok' : 'warn',
      latencyMs,
      summary: data.configured
        ? `configured · source=${data.source}`
        : `키 미설정 · source=${data.source}`,
      detail: data.note,
      source: data.source,
    })
  } catch (e) {
    results.push({
      id: 'places',
      label: '장소 검색 (카카오 REST)',
      group: 'data',
      status: 'error',
      latencyMs: null,
      summary: 'meta 실패',
      detail: errMsg(e),
    })
  }

  // 6) Routes meta
  try {
    const { data, latencyMs } = await timed(() => routesApi.meta())
    results.push({
      id: 'routes',
      label: '길찾기 엔진',
      group: 'data',
      status: data.status === 'osrm' ? 'ok' : 'warn',
      latencyMs,
      summary: `status=${data.status}`,
      detail: data.note,
      source: data.status,
    })
  } catch (e) {
    results.push({
      id: 'routes',
      label: '길찾기 엔진',
      group: 'data',
      status: 'error',
      latencyMs: null,
      summary: 'meta 실패',
      detail: errMsg(e),
    })
  }

  // 7) Elevation
  try {
    const { data, latencyMs } = await timed(() => elevationApi.meta())
    results.push({
      id: 'elevation',
      label: '경사도 (DEM)',
      group: 'data',
      status: 'ok',
      latencyMs,
      summary: data.source
        ? `source=${data.source}${data.note ? ` · ${data.note}` : ''}`
        : JSON.stringify(data).slice(0, 120),
      detail: data.note,
      source: data.source,
    })
  } catch (e) {
    results.push({
      id: 'elevation',
      label: '경사도 (DEM)',
      group: 'data',
      status: 'error',
      latencyMs: null,
      summary: 'meta 실패',
      detail: errMsg(e),
    })
  }

  // 8) Bike paths
  try {
    const { data, latencyMs } = await timed(() => bikeRoadsApi.meta())
    results.push({
      id: 'bike-paths',
      label: '자전거도로',
      group: 'map',
      status: data.configured || data.source ? 'ok' : 'warn',
      latencyMs,
      summary: `source=${data.source}${data.configured === false ? ' · 키 미설정' : ''}`,
      detail: data.note,
      source: data.source,
    })
  } catch (e) {
    results.push({
      id: 'bike-paths',
      label: '자전거도로',
      group: 'map',
      status: 'error',
      latencyMs: null,
      summary: 'meta 실패',
      detail: errMsg(e),
    })
  }

  // 9) Mini route search smoke (여의도→시청)
  try {
    const { data, latencyMs } = await timed(() =>
      routesApi.search({
        origin: { lat: 37.5219, lng: 126.9245 },
        destination: { lat: 37.5665, lng: 126.978 },
        mode: 'personal',
        preference: 'safe',
      }),
    )
    const n = data.routes?.length ?? 0
    const segs = data.routes?.[0]?.segments?.length ?? 0
    results.push({
      id: 'routes-smoke',
      label: '경로 검색 스모크',
      group: 'data',
      status: n > 0 ? 'ok' : 'error',
      latencyMs,
      summary: `routes=${n} · segs≈${segs} · ${data.source ?? ''}`,
      detail: '여의도→시청 personal 테스트',
      source: data.source,
    })
  } catch (e) {
    results.push({
      id: 'routes-smoke',
      label: '경로 검색 스모크',
      group: 'data',
      status: 'error',
      latencyMs: null,
      summary: '검색 실패',
      detail: errMsg(e),
    })
  }

  // 10) Client env
  const env = getClientEnvInfo()
  results.push({
    id: 'api-base',
    label: 'API Base URL',
    group: 'client',
    status: env.apiBase ? 'ok' : 'error',
    latencyMs: null,
    summary: env.apiBase || '(비어 있음)',
    detail: `origin=${env.origin}`,
  })
  results.push({
    id: 'kakao-js',
    label: '카카오 JS 키',
    group: 'client',
    status: env.kakaoJsKeySet ? 'ok' : 'warn',
    latencyMs: null,
    summary: env.kakaoJsKeySet
      ? 'VITE_KAKAO_JS_KEY 설정됨'
      : '미설정 — 지도 실패 가능',
  })
  results.push({
    id: 'secure',
    label: 'Secure Context / GPS',
    group: 'client',
    status:
      env.secureContext || env.origin.includes('localhost') ? 'ok' : 'warn',
    latencyMs: null,
    summary: `secure=${env.secureContext} · geo=${env.geolocation} · online=${env.online}`,
    detail: 'HTTP LAN 은 일부 폰에서 위치 거부될 수 있음',
  })

  return results
}

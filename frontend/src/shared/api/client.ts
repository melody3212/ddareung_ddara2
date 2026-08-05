/** HTTP 클라이언트 — 기능 API 모듈에서만 사용 */

// 기본: 같은 출처 /api (Vite 프록시 → 백엔드). 폰·PC 공통.
// 직접 백엔드 URL이 필요하면 VITE_API_BASE_URL 로 덮어쓰기.
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export function getApiBase(): string {
  return BASE
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

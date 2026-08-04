/** HTTP 클라이언트 — 기능 API 모듈에서만 사용 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

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

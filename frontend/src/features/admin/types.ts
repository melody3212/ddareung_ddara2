export type ProbeStatus = 'ok' | 'warn' | 'error' | 'idle' | 'loading'

export type ProbeResult = {
  id: string
  label: string
  group: 'core' | 'data' | 'map' | 'client'
  status: ProbeStatus
  latencyMs: number | null
  summary: string
  detail?: string
  source?: string
}

export type ClientEnvInfo = {
  apiBase: string
  kakaoJsKeySet: boolean
  origin: string
  userAgent: string
  online: boolean
  geolocation: boolean
  secureContext: boolean
}

export type LocalRideInfo = {
  recordCount: number
  hasActiveSession: boolean
  totalDistanceM: number
  storageKeys: string[]
}

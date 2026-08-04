import { request } from '../../shared/api/client'
import type { Weather } from './types'

export const weatherApi = {
  get: (lat?: number, lng?: number) => {
    const q = new URLSearchParams()
    if (lat != null) q.set('lat', String(lat))
    if (lng != null) q.set('lng', String(lng))
    const qs = q.toString()
    return request<Weather>(`/weather${qs ? `?${qs}` : ''}`)
  },
}

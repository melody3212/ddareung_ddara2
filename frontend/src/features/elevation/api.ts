import { request } from '../../shared/api/client'
import type {
  ElevationBatchResponse,
  ElevationMeta,
  ElevationProfile,
} from './types'

export const elevationApi = {
  profile: (coordinates: number[][], maxPoints = 40) =>
    request<ElevationProfile>('/elevation/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, max_points: maxPoints }),
    }),

  batch: (
    paths: Array<{ path_id?: string | number; coordinates: number[][] }>,
    maxPoints = 12,
  ) =>
    request<ElevationBatchResponse>('/elevation/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, max_points: maxPoints }),
    }),

  meta: () => request<ElevationMeta>('/elevation/meta'),
}

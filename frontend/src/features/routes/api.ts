import { request } from '../../shared/api/client'
import type {
  RouteMeta,
  RouteSearchRequest,
  RouteSearchResponse,
} from './types'

export const routesApi = {
  search: (body: RouteSearchRequest) =>
    request<RouteSearchResponse>('/routes/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  meta: () => request<RouteMeta>('/routes/meta'),
}

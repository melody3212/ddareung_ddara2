import { request } from '../../shared/api/client'
import type { Course } from './types'

export const coursesApi = {
  list: (opts?: { difficulty?: string; tag?: string }) => {
    const q = new URLSearchParams()
    if (opts?.difficulty) q.set('difficulty', opts.difficulty)
    if (opts?.tag) q.set('tag', opts.tag)
    const qs = q.toString()
    return request<Course[]>(qs ? `/courses?${qs}` : '/courses')
  },
  get: (id: number) => request<Course>(`/courses/${id}`),
}

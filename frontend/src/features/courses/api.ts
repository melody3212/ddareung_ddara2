import { request } from '../../shared/api/client'
import type { Course } from './types'

export const coursesApi = {
  list: (difficulty?: string) =>
    request<Course[]>(difficulty ? `/courses?difficulty=${difficulty}` : '/courses'),
  get: (id: number) => request<Course>(`/courses/${id}`),
}

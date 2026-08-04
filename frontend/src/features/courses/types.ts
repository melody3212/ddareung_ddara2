export type Course = {
  course_id: number
  title: string
  distance_km: number
  duration_min: number
  difficulty: string
  tags: string[]
  rating: number | null
  description: string | null
  path: number[][] | null
}

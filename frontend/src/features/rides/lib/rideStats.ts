import type { RideRecord } from '../types'

export type RideTotals = {
  count: number
  distanceM: number
  calories: number
  movingMs: number
}

export type WeekRideStats = RideTotals & {
  /** 주 시작 (로컬 월 0시) */
  weekStart: number
  weekEnd: number
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 이번 주 월요일 00:00 (로컬) */
export function startOfWeek(now = Date.now()): number {
  const d = new Date(startOfLocalDay(now))
  const day = d.getDay() // 0=일
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.getTime()
}

export function endOfWeek(weekStart: number): number {
  return weekStart + 7 * 24 * 60 * 60 * 1000 - 1
}

export function sumRecords(records: RideRecord[]): RideTotals {
  return {
    count: records.length,
    distanceM: records.reduce((s, r) => s + (r.distanceM || 0), 0),
    calories: records.reduce((s, r) => s + (r.caloriesKcal || 0), 0),
    movingMs: records.reduce((s, r) => s + (r.movingMs || 0), 0),
  }
}

export function weekStats(records: RideRecord[], now = Date.now()): WeekRideStats {
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(weekStart)
  const inWeek = records.filter(
    (r) => r.startedAt >= weekStart && r.startedAt <= weekEnd,
  )
  return {
    ...sumRecords(inWeek),
    weekStart,
    weekEnd,
  }
}

export function formatWeekRange(weekStart: number): string {
  const a = new Date(weekStart)
  const b = new Date(weekStart + 6 * 24 * 60 * 60 * 1000)
  const f = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${f(a)} – ${f(b)}`
}

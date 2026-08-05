import { useCallback, useState } from 'react'
import { listRideRecords } from '../storage'
import type { RideRecord } from '../types'
import { sumRecords, weekStats } from '../lib/rideStats'

/** 완료 기록 목록 + 주간/누적 요약 */
export function useRideRecords() {
  const [records, setRecords] = useState<RideRecord[]>(() => listRideRecords())

  const refresh = useCallback(() => {
    setRecords(listRideRecords())
  }, [])

  const allTotals = sumRecords(records)
  const thisWeek = weekStats(records)

  return { records, refresh, allTotals, thisWeek }
}

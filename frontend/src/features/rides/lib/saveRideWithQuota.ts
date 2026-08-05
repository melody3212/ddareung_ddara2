/**
 * 용량 부족 시 사진 줄여 재시도하는 기록 저장
 */
import { saveRideRecord } from '../storage'
import type { RideRecord } from '../types'

export function saveRideRecordWithQuota(record: RideRecord): RideRecord {
  try {
    saveRideRecord(record)
    return record
  } catch {
    const slim = {
      ...record,
      photos: (record.photos ?? []).slice(0, 1),
    }
    try {
      saveRideRecord(slim)
      return slim
    } catch {
      const bare = { ...record, photos: [] as RideRecord['photos'] }
      saveRideRecord(bare)
      return bare
    }
  }
}

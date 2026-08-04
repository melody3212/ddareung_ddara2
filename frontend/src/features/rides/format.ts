/** 주행 UI용 표시 포맷 */

export function formatRideDistance(m: number): string {
  if (!Number.isFinite(m) || m < 0) return '0.00 km'
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(2)} km`
}

export function formatRideDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatRideSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh < 0) return '0.0'
  return kmh.toFixed(1)
}

export function formatRideCalories(kcal: number): string {
  if (!Number.isFinite(kcal) || kcal < 0) return '0'
  return String(Math.round(kcal))
}

export function formatRideDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${mo}.${day} ${hh}:${mm}`
}

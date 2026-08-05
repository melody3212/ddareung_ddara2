/**
 * 주행 기록 상세 — 지도 · 통계 · 사진 · 코스 저장 · 삭제
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { KakaoMap } from '../../map'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { RideDetailStats } from '../components/RideDetailStats'
import { RidePhotoStrip } from '../components/RidePhotoStrip'
import { SaveAsCourseCard } from '../components/SaveAsCourseCard'
import { formatRideDate } from '../format'
import {
  compressImageFile,
  MAX_RIDE_PHOTOS,
  newPhotoId,
} from '../lib/photoCompress'
import { deleteRideRecord, getRideRecord, saveRideRecord } from '../storage'
import type { RidePhoto, RideRecord } from '../types'

export function RideDetailPage() {
  const { rideId } = useParams<{ rideId: string }>()
  const navigate = useNavigate()
  const [gone, setGone] = useState(false)
  const [record, setRecord] = useState<RideRecord | null>(() =>
    rideId ? getRideRecord(rideId) : null,
  )
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!rideId || gone) {
      setRecord(null)
      return
    }
    setRecord(getRideRecord(rideId))
  }, [rideId, gone])

  const routeOverlay = useMemo(() => {
    if (!record?.path?.length) return null
    return {
      path: record.path,
      fitBounds: true as const,
      variant: 'course' as const,
    }
  }, [record])

  const photos = record?.photos ?? []

  const persist = useCallback((next: RideRecord) => {
    saveRideRecord(next)
    setRecord(next)
  }, [])

  const handleAddPhoto = async (file: File) => {
    if (!record) return
    if (photos.length >= MAX_RIDE_PHOTOS) {
      setPhotoError(`사진은 최대 ${MAX_RIDE_PHOTOS}장까지입니다.`)
      return
    }
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      const dataUrl = await compressImageFile(file)
      const photo: RidePhoto = {
        id: newPhotoId(),
        dataUrl,
        takenAt: Date.now(),
        lat: null,
        lng: null,
      }
      persist({ ...record, photos: [...photos, photo] })
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : '사진 추가 실패')
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleRemovePhoto = (photoId: string) => {
    if (!record) return
    persist({
      ...record,
      photos: photos.filter((p) => p.id !== photoId),
    })
    setPhotoError(null)
  }

  const handleDelete = () => {
    if (!record) return
    if (!window.confirm('이 주행 기록을 삭제할까요? 되돌릴 수 없습니다.')) return
    deleteRideRecord(record.id)
    setGone(true)
    navigate('/riding', { replace: true })
  }

  if (!record) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
        <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
          <Link
            to="/riding"
            className="rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            ← 목록
          </Link>
          <h1 className="text-lg font-bold text-slate-800">기록 상세</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
          <p className="text-sm text-slate-500">기록을 찾을 수 없습니다.</p>
          <Link
            to="/riding"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            주행 탭으로
          </Link>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
        <Link
          to="/riding"
          className="rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          ← 목록
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-slate-800">
            주행 상세
          </h1>
          <p className="truncate text-[11px] text-slate-500">
            {formatRideDate(record.startedAt)}
          </p>
        </div>
      </header>

      <div className="relative h-[36vh] min-h-[200px] max-h-[320px] w-full shrink-0 border-b border-slate-200">
        {record.path.length >= 2 ? (
          <KakaoMap
            showStations={false}
            showBikePaths={false}
            showSlope={false}
            routeOverlay={routeOverlay}
            compact
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
            저장된 경로 좌표가 없습니다
          </div>
        )}
      </div>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <RideDetailStats record={record} />

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <RidePhotoStrip
            photos={photos}
            max={MAX_RIDE_PHOTOS}
            busy={photoBusy}
            error={photoError}
            canAdd
            canRemove
            onAddFile={handleAddPhoto}
            onRemove={handleRemovePhoto}
            onOpen={(p) => setLightbox(p.dataUrl)}
          />
          <p className="mt-2 text-center text-[10px] text-slate-400">
            사진은 이 기기에만 저장됩니다 · 최대 {MAX_RIDE_PHOTOS}장
          </p>
        </section>

        {record.note && (
          <section className="rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-600 shadow-sm">
            {record.note}
          </section>
        )}

        <SaveAsCourseCard record={record} />

        <button
          type="button"
          onClick={handleDelete}
          className="mb-6 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
        >
          이 기록 삭제
        </button>
      </main>

      {lightbox && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
          aria-label="사진 닫기"
        >
          <img
            src={lightbox}
            alt="확대"
            className="max-h-[85dvh] max-w-full rounded-lg object-contain"
          />
        </button>
      )}

      <BottomNav />
    </div>
  )
}

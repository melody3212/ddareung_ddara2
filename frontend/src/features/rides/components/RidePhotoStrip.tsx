import { useRef } from 'react'
import { MAX_RIDE_PHOTOS } from '../lib/photoCompress'
import type { RidePhoto } from '../types'

type Props = {
  photos: RidePhoto[]
  max?: number
  busy?: boolean
  error?: string | null
  /** 추가 가능 (라이브/상세) */
  canAdd?: boolean
  canRemove?: boolean
  onAddFile?: (file: File) => void | Promise<void>
  onRemove?: (photoId: string) => void
  /** 크게 보기 */
  onOpen?: (photo: RidePhoto, index: number) => void
  compact?: boolean
}

export function RidePhotoStrip({
  photos,
  max = MAX_RIDE_PHOTOS,
  busy,
  error,
  canAdd,
  canRemove,
  onAddFile,
  onRemove,
  onOpen,
  compact,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const remaining = max - photos.length

  return (
    <div className={compact ? '' : 'mt-3'}>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-600">
          📷 추억 사진{' '}
          <span className="font-normal text-slate-400">
            {photos.length}/{max}
          </span>
        </p>
        {canAdd && remaining > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
          >
            {busy ? '처리 중…' : '사진 추가'}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f && onAddFile) void onAddFile(f)
        }}
      />

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-400">
          {canAdd
            ? '라이딩 중 풍경을 남겨 보세요 (최대 5장)'
            : '첨부된 사진이 없습니다'}
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <li key={p.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => onOpen?.(p, i)}
                className="block h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={p.dataUrl}
                  alt={`추억 ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
              {canRemove && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white shadow"
                  aria-label="사진 삭제"
                >
                  ×
                </button>
              )}
            </li>
          ))}
          {canAdd && remaining > 0 && (
            <li className="shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 disabled:opacity-50"
              >
                <span className="text-lg">＋</span>
                <span className="text-[9px]">추가</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {error && (
        <p className="mt-1.5 text-center text-[11px] text-red-500">{error}</p>
      )}
    </div>
  )
}

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { searchPlaces } from '../searchPlaces'
import type { PlaceItem, SelectedPlace } from '../types'

type Props = {
  label: string
  colorClass: string
  value: SelectedPlace | null
  placeholder?: string
  onChange: (place: SelectedPlace | null) => void
  /** 검색 결과 거리 정렬 기준 (선택) */
  bias?: { lat: number; lng: number } | null
  /** 라벨 오른쪽 액션 (예: 현재 위치를 출발로) */
  headerAction?: ReactNode
}

/**
 * 상호·장소명 검색 입력 (자동완성)
 */
export function PlaceSearchInput({
  label,
  colorClass,
  value,
  placeholder = '장소명, 상호, 주소 검색',
  onChange,
  bias,
  headerAction,
}: Props) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PlaceItem[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const reqIdRef = useRef(0)

  // 외부 value 변경 시 표시 동기화 (스왑·프리셋)
  useEffect(() => {
    setQuery(value?.name ?? '')
  }, [value?.name, value?.lat, value?.lng])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    const q = query.trim()

    // 이미 선택된 장소와 동일 텍스트면 재검색 안 함
    if (value && q === value.name) {
      setResults([])
      setHint(null)
      return
    }

    if (q.length < 2) {
      setResults([])
      setLoading(false)
      setHint(q.length === 1 ? '두 글자 이상 입력해 주세요' : null)
      return
    }

    setLoading(true)
    debounceRef.current = window.setTimeout(() => {
      const myReq = ++reqIdRef.current
      void searchPlaces(q, {
        size: 8,
        lat: bias?.lat,
        lng: bias?.lng,
      }).then((res) => {
        if (myReq !== reqIdRef.current) return
        setResults(res.places)
        setHint(res.places.length ? null : res.note || '검색 결과 없음')
        setOpen(true)
        setLoading(false)
      })
    }, 320)

    return () => window.clearTimeout(debounceRef.current)
  }, [query, value, bias?.lat, bias?.lng])

  const select = (p: PlaceItem) => {
    const next: SelectedPlace = {
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      address: p.road_address || p.address || null,
    }
    onChange(next)
    setQuery(p.name)
    setResults([])
    setOpen(false)
    setHint(null)
  }

  const clear = () => {
    onChange(null)
    setQuery('')
    setResults([])
    setHint(null)
  }

  return (
    <div ref={wrapRef} className="relative flex items-start gap-2">
      <span className={`mt-3 h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-slate-600">{label}</p>
          <div className="flex items-center gap-2">
            {headerAction}
            {value && (
              <button
                type="button"
                onClick={clear}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                지우기
              </button>
            )}
          </div>
        </div>
        <input
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            // 타이핑 중이면 선택 해제 (다시 고르게)
            if (value && e.target.value !== value.name) {
              onChange(null)
            }
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length) setOpen(true)
          }}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-blue-500 placeholder:text-slate-400 focus:ring-2"
        />
        {value?.address && (
          <p className="mt-1 truncate text-[10px] text-slate-400">{value.address}</p>
        )}
        {loading && (
          <p className="mt-1 text-[10px] text-blue-500">검색 중…</p>
        )}
        {!loading && hint && query.trim().length >= 1 && !value && (
          <p className="mt-1 text-[10px] text-slate-400">{hint}</p>
        )}

        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {results.map((p) => (
              <li key={p.id} role="option">
                <button
                  type="button"
                  onClick={() => select(p)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-blue-50"
                >
                  <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                  <span className="line-clamp-1 text-[11px] text-slate-500">
                    {p.road_address || p.address || p.category || ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

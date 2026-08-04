import { PlaceSearchInput, type SelectedPlace } from '../../places'
import type { RouteMode, RoutePreference } from '../types'
import { ROUTE_PRESETS } from '../presets'

type Props = {
  origin: SelectedPlace | null
  destination: SelectedPlace | null
  mode: RouteMode
  preference: RoutePreference
  loading: boolean
  onOriginChange: (v: SelectedPlace | null) => void
  onDestinationChange: (v: SelectedPlace | null) => void
  onModeChange: (m: RouteMode) => void
  onPreferenceChange: (p: RoutePreference) => void
  onSearch: () => void
  onSwap: () => void
  onUseMyLocation: () => void
}

export function RouteSearchForm({
  origin,
  destination,
  mode,
  preference,
  loading,
  onOriginChange,
  onDestinationChange,
  onModeChange,
  onPreferenceChange,
  onSearch,
  onSwap,
  onUseMyLocation,
}: Props) {
  const canSearch = Boolean(origin && destination) && !loading

  return (
    <div className="space-y-3">
      {/* 모드 */}
      <div className="flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="라이딩 모드">
        <ModeTab
          active={mode === 'personal'}
          onClick={() => onModeChange('personal')}
          label="내 자전거"
          hint="지금 바로"
        />
        <ModeTab
          active={mode === 'ddareung'}
          onClick={() => onModeChange('ddareung')}
          label="따릉이"
          hint="대여·반납"
        />
      </div>

      {/* 장소명 검색 */}
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <PlaceSearchInput
          label="출발"
          colorClass="bg-blue-500"
          value={origin}
          placeholder="출발 장소·상호 검색"
          onChange={onOriginChange}
          bias={destination ? { lat: destination.lat, lng: destination.lng } : null}
          headerAction={
            <button
              type="button"
              onClick={onUseMyLocation}
              className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
            >
              📍 현재 위치
            </button>
          }
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onSwap}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            ↕ 출발·도착 바꾸기
          </button>
        </div>
        <PlaceSearchInput
          label="도착"
          colorClass="bg-rose-500"
          value={destination}
          placeholder="도착 장소·상호 검색"
          onChange={onDestinationChange}
          bias={origin ? { lat: origin.lat, lng: origin.lng } : null}
        />
        <p className="text-[10px] text-slate-400">
          예: 여의도역, 서울시청, 강남역, 잠실한강공원 …
        </p>
      </div>

      {/* 프리셋 */}
      <div className="flex flex-wrap gap-1.5">
        {ROUTE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              onOriginChange(p.origin)
              onDestinationChange(p.destination)
            }}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 선호 */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-slate-500">경로 선호</p>
        <div className="flex gap-2">
          {(
            [
              ['safe', '안전'],
              ['fast', '빠른'],
              ['scenic', '경치'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onPreferenceChange(key)}
              className={[
                'flex-1 rounded-xl border py-2 text-xs font-semibold transition',
                preference === key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-500',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!canSearch}
        onClick={onSearch}
        className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-60"
      >
        {loading
          ? '경로 계산 중…'
          : !origin || !destination
            ? '출발·도착 장소를 선택하세요'
            : '경로 검색'}
      </button>
    </div>
  )
}

function ModeTab({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex-1 rounded-lg py-2.5 transition',
        active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
      ].join(' ')}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="block text-[10px] opacity-70">{hint}</span>
    </button>
  )
}

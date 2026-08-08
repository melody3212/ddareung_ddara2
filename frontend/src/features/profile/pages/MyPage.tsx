/**
 * 마이페이지 — 프로필 · 활동 요약 · 바로가기 · 설정 진입
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { countLocalCourses } from '../../courses'
import {
  formatRideCalories,
  formatRideDistance,
  formatRideDuration,
  listRideRecords,
  RideRecordCard,
  weekStats,
  sumRecords,
  formatWeekRange,
  type RideRecord,
} from '../../rides'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { usePreferences } from '../hooks/usePreferences'

export function MyPage() {
  const { prefs, update } = usePreferences()
  const [weightDraft, setWeightDraft] = useState(String(prefs.weightKg))
  const [nickDraft, setNickDraft] = useState(prefs.nickname)
  const [editingNick, setEditingNick] = useState(false)
  const [records, setRecords] = useState<RideRecord[]>(() => listRideRecords())
  const [courseCount, setCourseCount] = useState(() => countLocalCourses())

  useEffect(() => {
    const refresh = () => {
      setRecords(listRideRecords())
      setCourseCount(countLocalCourses())
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const thisWeek = useMemo(() => weekStats(records), [records])
  const totals = useMemo(() => sumRecords(records), [records])
  const recent = records.slice(0, 3)

  const saveWeight = () => {
    const n = Number(weightDraft)
    if (!Number.isFinite(n)) {
      setWeightDraft(String(prefs.weightKg))
      return
    }
    const next = update({ weightKg: n })
    setWeightDraft(String(next.weightKg))
  }

  const saveNick = () => {
    const next = update({ nickname: nickDraft })
    setNickDraft(next.nickname)
    setEditingNick(false)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">마이</h1>
          <p className="mt-0.5 text-xs text-slate-500">활동 요약 · 설정</p>
        </div>
        <Link
          to="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200"
          aria-label="앱 설정"
          title="앱 설정"
        >
          <GearIcon />
        </Link>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {/* 프로필 */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {(prefs.nickname || '게')[0]}
            </div>
            <div className="min-w-0 flex-1">
              {editingNick ? (
                <div className="flex gap-2">
                  <input
                    value={nickDraft}
                    onChange={(e) => setNickDraft(e.target.value)}
                    maxLength={20}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveNick}
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingNick(true)}
                  className="text-left"
                >
                  <p className="text-base font-bold text-slate-800">
                    {prefs.nickname}
                  </p>
                  <p className="text-[11px] text-slate-400">탭해서 닉네임 수정</p>
                </button>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                비회원 · 기록은 이 기기에만 저장
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="mt-3 block rounded-xl border border-dashed border-slate-200 py-2 text-center text-xs font-semibold text-slate-500"
          >
            로그인 (예정)
          </Link>
        </section>

        {/* 이번 주 */}
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-700">이번 주</p>
            <p className="text-[10px] text-blue-500/80">
              {formatWeekRange(thisWeek.weekStart)}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat n={String(thisWeek.count)} l="횟수" />
            <Stat n={formatRideDistance(thisWeek.distanceM)} l="거리" />
            <Stat
              n={`${formatRideCalories(thisWeek.calories)}`}
              l="kcal"
            />
          </div>
          {thisWeek.movingMs > 0 && (
            <p className="mt-2 text-center text-[11px] text-slate-400">
              이동 {formatRideDuration(thisWeek.movingMs)}
            </p>
          )}
          <p className="mt-2 text-center text-[11px] text-slate-500">
            전체 {totals.count}회 · {formatRideDistance(totals.distanceM)} ·{' '}
            {formatRideCalories(totals.calories)} kcal
          </p>
        </section>

        {/* 체중 */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-800">체중 (칼로리 추정)</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            주행 칼로리 계산에 사용됩니다. 이 기기에만 저장돼요.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={30}
              max={200}
              step={0.5}
              value={weightDraft}
              onChange={(e) => setWeightDraft(e.target.value)}
              onBlur={saveWeight}
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
            />
            <span className="text-sm text-slate-500">kg</span>
            <button
              type="button"
              onClick={saveWeight}
              className="ml-auto rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white"
            >
              적용
            </button>
          </div>
        </section>

        {/* 바로가기 */}
        <section className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
          <LinkRow to="/my-courses" title="내 코스" sub={`${courseCount}개 저장`} />
          <LinkRow to="/riding" title="주행 기록" sub={`${totals.count}건`} />
          <LinkRow to="/settings" title="앱 설정" sub="지도 · 알림 · 데이터" />
        </section>

        {/* 최근 주행 */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">최근 주행</h2>
            <Link to="/riding" className="text-[11px] font-medium text-blue-600">
              전체
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-xs text-slate-400 shadow-sm">
              아직 기록이 없습니다
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={r.id}>
                  <RideRecordCard record={r} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-800">{n}</p>
      <p className="text-[10px] text-slate-500">{l}</p>
    </div>
  )
}

function LinkRow({
  to,
  title,
  sub,
}: {
  to: string
  title: string
  sub: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-slate-50"
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-400">{sub}</p>
      </div>
      <span className="text-slate-300">›</span>
    </Link>
  )
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
      />
    </svg>
  )
}

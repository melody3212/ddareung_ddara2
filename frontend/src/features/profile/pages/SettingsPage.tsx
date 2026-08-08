/**
 * 앱 설정 — 지도 기본값 · 알림 · 데이터 · 정보
 */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { countLocalCourses } from '../../courses'
import {
  clearAllRideRecords,
  countRideRecords,
} from '../../rides'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { usePreferences } from '../hooks/usePreferences'

export function SettingsPage() {
  const { prefs, update } = usePreferences()
  const [msg, setMsg] = useState<string | null>(null)

  const rideCount = countRideRecords()
  const courseCount = countLocalCourses()

  const flash = (t: string) => {
    setMsg(t)
    window.setTimeout(() => setMsg(null), 2500)
  }

  const clearRides = () => {
    if (
      !window.confirm(
        `주행 기록 ${rideCount}건을 모두 삭제할까요? 되돌릴 수 없습니다.`,
      )
    ) {
      return
    }
    clearAllRideRecords()
    flash('주행 기록을 삭제했습니다.')
  }

  const clearCourses = () => {
    if (
      !window.confirm(
        `내 코스 ${courseCount}개를 모두 삭제할까요? 되돌릴 수 없습니다.`,
      )
    ) {
      return
    }
    try {
      localStorage.removeItem('ddareung_my_courses_v1')
    } catch {
      /* ignore */
    }
    flash('내 코스를 삭제했습니다.')
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
        <Link
          to="/mypage"
          className="rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          ← 마이
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-slate-800">앱 설정</h1>
          <p className="text-[11px] text-slate-500">지도 · 알림 · 데이터</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {msg && (
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white">
            {msg}
          </div>
        )}

        <Section title="홈 지도 기본값">
          <p className="mb-2 text-[11px] text-slate-500">
            홈을 열 때 기본으로 켤 레이어입니다. 지금 지도에도 바로 반영됩니다.
          </p>
          <Toggle
            label="따릉이 대여소"
            on={prefs.defaultShowStations}
            onChange={(v) => update({ defaultShowStations: v })}
          />
          <Toggle
            label="자전거도로"
            on={prefs.defaultShowBikePaths}
            onChange={(v) => update({ defaultShowBikePaths: v })}
          />
          <Toggle
            label="경사 강조"
            on={prefs.defaultShowSlope}
            onChange={(v) => update({ defaultShowSlope: v })}
          />
        </Section>

        <Section title="길찾기">
          <p className="mb-2 text-[11px] text-slate-500">
            길찾기 화면 기본 모드 (화면에서 언제든 변경 가능)
          </p>
          <div className="flex gap-2">
            <ModeBtn
              active={prefs.defaultRouteMode === 'personal'}
              onClick={() => update({ defaultRouteMode: 'personal' })}
              label="내 자전거"
            />
            <ModeBtn
              active={prefs.defaultRouteMode === 'ddareung'}
              onClick={() => update({ defaultRouteMode: 'ddareung' })}
              label="따릉이"
            />
          </div>
        </Section>

        <Section title="알림">
          <p className="mb-2 text-[11px] text-amber-700">
            푸시 알림은 아직 연결되지 않았습니다. 선호만 저장해 둡니다.
          </p>
          <Toggle
            label="라이딩 점수·날씨 안내"
            on={prefs.notifyWeather}
            onChange={(v) => update({ notifyWeather: v })}
          />
          <Toggle
            label="주간 목표 알림"
            on={prefs.notifyGoals}
            onChange={(v) => update({ notifyGoals: v })}
          />
        </Section>

        <Section title="데이터">
          <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
            주행 기록·내 코스·설정은 이 브라우저(기기)에만 저장됩니다. 로그인
            동기화는 추후 지원 예정입니다.
          </p>
          <p className="mb-2 text-[11px] text-slate-600">
            주행 {rideCount}건 · 내 코스 {courseCount}개
          </p>
          <button
            type="button"
            onClick={clearRides}
            className="mb-2 w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-600"
          >
            주행 기록 전체 삭제
          </button>
          <button
            type="button"
            onClick={clearCourses}
            className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-600"
          >
            내 코스 전체 삭제
          </button>
        </Section>

        <Section title="정보">
          <InfoRow k="앱" v="따릉따라" />
          <InfoRow k="버전" v="0.1.0 MVP" />
          <InfoRow k="저장" v="로컬 (비회원)" />
          <Link
            to="/admin"
            className="mt-2 block rounded-xl bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-700"
          >
            관리자 대시보드 (개발)
          </Link>
        </Section>
      </main>

      <BottomNav />
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  )
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-slate-50 py-2.5 first:border-t-0 first:pt-0">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={[
          'relative h-7 w-12 shrink-0 rounded-full transition',
          on ? 'bg-blue-600' : 'bg-slate-300',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
            on ? 'left-5' : 'left-0.5',
          ].join(' ')}
        />
      </button>
    </label>
  )
}

function ModeBtn({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 rounded-xl py-2.5 text-xs font-bold',
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-t border-slate-50 py-2 text-xs first:border-t-0 first:pt-0">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-800">{v}</span>
    </div>
  )
}

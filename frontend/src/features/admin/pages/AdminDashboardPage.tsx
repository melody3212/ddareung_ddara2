/**
 * 관리자 대시보드 — API·환경·로컬 저장 상태 한눈에
 * URL: /admin  (인증 없음 · 개발용)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getClientEnvInfo,
  getLocalRideInfo,
  runAllProbes,
} from '../probe'
import type { ProbeResult, ProbeStatus } from '../types'

const STATUS_STYLE: Record<
  ProbeStatus,
  { bg: string; text: string; label: string }
> = {
  ok: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'OK' },
  warn: { bg: 'bg-amber-100', text: 'text-amber-900', label: 'WARN' },
  error: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'ERR' },
  idle: { bg: 'bg-slate-100', text: 'text-slate-600', label: '—' },
  loading: { bg: 'bg-blue-100', text: 'text-blue-800', label: '…' },
}

const GROUP_LABEL: Record<ProbeResult['group'], string> = {
  core: '코어',
  data: '데이터 API',
  map: '지도·도로',
  client: '클라이언트',
}

function StatusBadge({ status }: { status: ProbeStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span
      className={`inline-flex min-w-[3.25rem] justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  )
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(1)}km`
}

export function AdminDashboardPage() {
  const [probes, setProbes] = useState<ProbeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const clientEnv = useMemo(() => getClientEnvInfo(), [])
  const [rideInfo, setRideInfo] = useState(() => getLocalRideInfo())

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await runAllProbes()
      setProbes(list)
      setRideInfo(getLocalRideInfo())
      setLastRunAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run()
  }, [run])

  useEffect(() => {
    if (!autoRefresh) return
    const id = window.setInterval(() => {
      void run()
    }, 30_000)
    return () => window.clearInterval(id)
  }, [autoRefresh, run])

  const counts = useMemo(() => {
    const c = { ok: 0, warn: 0, error: 0, other: 0 }
    for (const p of probes) {
      if (p.status === 'ok') c.ok++
      else if (p.status === 'warn') c.warn++
      else if (p.status === 'error') c.error++
      else c.other++
    }
    return c
  }, [probes])

  const grouped = useMemo(() => {
    const order: ProbeResult['group'][] = ['core', 'data', 'map', 'client']
    return order.map((g) => ({
      group: g,
      items: probes.filter((p) => p.group === g),
    }))
  }, [probes])

  const overall: ProbeStatus =
    counts.error > 0 ? 'error' : counts.warn > 0 ? 'warn' : probes.length ? 'ok' : 'idle'

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Admin · 개발용
            </p>
            <h1 className="text-lg font-bold text-slate-900">시스템 상태 대시보드</h1>
            <p className="text-xs text-slate-500">
              API · 환경변수(유무) · 로컬 주행 기록 · 스모크 테스트
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/home"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← 앱 홈
            </Link>
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              API Docs
            </a>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              30초 자동
            </label>
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '점검 중…' : '다시 점검'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4 pb-12">
        {/* 요약 */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryCard
            title="전체"
            value={STATUS_STYLE[overall].label}
            hint={
              lastRunAt
                ? new Date(lastRunAt).toLocaleTimeString()
                : '아직 실행 안 함'
            }
            tone={overall}
          />
          <SummaryCard title="OK" value={String(counts.ok)} hint="정상" tone="ok" />
          <SummaryCard
            title="WARN"
            value={String(counts.warn)}
            hint="mock/키 미설정 등"
            tone="warn"
          />
          <SummaryCard
            title="ERR"
            value={String(counts.error)}
            hint="연결·조회 실패"
            tone="error"
          />
        </section>

        {error && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            점검 중 오류: {error}
          </div>
        )}

        {/* 클라이언트 / 로컬 */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">클라이언트 환경</h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Row k="API Base" v={clientEnv.apiBase} />
              <Row k="Origin" v={clientEnv.origin} />
              <Row
                k="카카오 JS 키"
                v={clientEnv.kakaoJsKeySet ? '설정됨' : '없음'}
              />
              <Row
                k="Secure / Online"
                v={`${clientEnv.secureContext ? 'secure' : 'insecure'} · ${clientEnv.online ? 'online' : 'offline'}`}
              />
              <Row
                k="Geolocation"
                v={clientEnv.geolocation ? '지원' : '미지원'}
              />
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">로컬 주행 데이터</h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Row k="저장 기록" v={`${rideInfo.recordCount}건`} />
              <Row
                k="누적 거리"
                v={formatDistance(rideInfo.totalDistanceM)}
              />
              <Row
                k="진행 중 세션"
                v={rideInfo.hasActiveSession ? '있음' : '없음'}
              />
              <Row
                k="localStorage 키"
                v={
                  rideInfo.storageKeys.length
                    ? rideInfo.storageKeys.join(', ')
                    : '(없음)'
                }
              />
            </dl>
            <p className="mt-2 text-[10px] text-slate-400">
              비회원 기록은 이 브라우저에만 저장됩니다.
            </p>
          </div>
        </section>

        {/* 프로브 그룹 */}
        {loading && !probes.length && (
          <p className="py-8 text-center text-sm text-slate-500">
            API 점검 중…
          </p>
        )}

        {grouped.map(
          ({ group, items }) =>
            items.length > 0 && (
              <section key={group}>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {GROUP_LABEL[group]}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {p.label}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {p.summary}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={p.status} />
                          {p.latencyMs != null && (
                            <span className="text-[10px] tabular-nums text-slate-400">
                              {p.latencyMs}ms
                            </span>
                          )}
                        </div>
                      </div>
                      {p.detail && (
                        <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-500">
                          {p.detail}
                        </p>
                      )}
                      {p.source && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          source: {p.source}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}

        {/* 빠른 링크 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800">빠른 이동</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { to: '/home', label: '홈' },
              { to: '/search-route', label: '길찾기' },
              { to: '/riding', label: '주행' },
              { to: '/mypage', label: '마이' },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            이 페이지는 인증 없는 개발용입니다. 프로덕션에서는 보호하거나
            제거하세요. 시크릿 키 값은 표시하지 않습니다.
          </p>
        </section>
      </main>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string
  value: string
  hint: string
  tone: ProbeStatus
}) {
  const s = STATUS_STYLE[tone]
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase text-slate-400">{title}</p>
      <p className={`mt-1 text-xl font-bold ${s.text}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 font-medium text-slate-500">{k}</dt>
      <dd className="min-w-0 break-all text-slate-800">{v}</dd>
    </div>
  )
}

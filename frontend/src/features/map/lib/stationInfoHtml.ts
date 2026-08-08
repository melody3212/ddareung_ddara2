import type { Station } from '../../stations'
import { escapeHtml } from './escapeHtml'

/** 따릉이 대여소 InfoWindow HTML — 긴 이름·수치 잘림 방지 + 앱 톤 카드 */
export function buildStationInfoHtml(s: Station): string {
  const name = escapeHtml(s.name || '대여소')
  const bike =
    s.bike_count != null ? String(s.bike_count) : '—'
  const racks =
    s.rack_tot_cnt != null ? String(s.rack_tot_cnt) : '—'
  const shared =
    s.shared != null && Number.isFinite(s.shared)
      ? `${Math.round(s.shared)}%`
      : null
  const id = s.station_id ? escapeHtml(s.station_id) : ''

  // 인라인 스타일만 (InfoWindow 는 앱 CSS 스코프 밖)
  return `
<div style="
  box-sizing:border-box;
  min-width:220px;
  max-width:min(300px,78vw);
  padding:12px 14px 11px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',sans-serif;
  color:#0f172a;
  line-height:1.45;
">
  <div style="
    display:inline-block;
    margin-bottom:6px;
    padding:2px 8px;
    border-radius:999px;
    background:#eff6ff;
    color:#2563eb;
    font-size:10px;
    font-weight:700;
    letter-spacing:0.02em;
  ">따릉이 대여소</div>

  <div style="
    font-size:14px;
    font-weight:700;
    color:#0f172a;
    word-break:keep-all;
    overflow-wrap:anywhere;
    white-space:normal;
    margin-bottom:10px;
  ">${name}</div>

  <div style="
    display:flex;
    gap:8px;
    margin-bottom:8px;
  ">
    <div style="
      flex:1;
      min-width:0;
      border-radius:12px;
      background:linear-gradient(145deg,#eff6ff,#f8fafc);
      border:1px solid #dbeafe;
      padding:8px 6px;
      text-align:center;
    ">
      <div style="font-size:10px;color:#64748b;font-weight:600;">남은 자전거</div>
      <div style="font-size:18px;font-weight:800;color:#2563eb;margin-top:2px;">${escapeHtml(bike)}<span style="font-size:11px;font-weight:600;color:#64748b;"> 대</span></div>
    </div>
    <div style="
      flex:1;
      min-width:0;
      border-radius:12px;
      background:#f8fafc;
      border:1px solid #e2e8f0;
      padding:8px 6px;
      text-align:center;
    ">
      <div style="font-size:10px;color:#64748b;font-weight:600;">거치대</div>
      <div style="font-size:18px;font-weight:800;color:#334155;margin-top:2px;">${escapeHtml(racks)}</div>
    </div>
  </div>

  ${
    shared
      ? `<div style="
          font-size:11px;
          color:#475569;
          background:#f1f5f9;
          border-radius:8px;
          padding:6px 8px;
          margin-bottom:6px;
        ">거치율 <strong style="color:#0f172a;">${escapeHtml(shared)}</strong></div>`
      : ''
  }

  ${
    id
      ? `<div style="font-size:10px;color:#94a3b8;word-break:break-all;">ID ${id}</div>`
      : ''
  }
</div>`.trim()
}

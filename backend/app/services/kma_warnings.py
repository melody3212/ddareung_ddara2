"""
기상청 API 허브 — 기상특보 현황

문서/신청: https://apihub.kma.go.kr/
예특보 → 기상특보 → 특보현황 조회 (wrn_now_data)

  https://apihub.kma.go.kr/api/typ01/url/wrn_now_data.php?fe=f&tm=&disp=1&authKey={KEY}

authKey: backend/.env 의 KMA_APIHUB_KEY
"""

from __future__ import annotations

import re
import time
from typing import Any

import httpx

from app.core.config import get_settings

WRN_URL = "https://apihub.kma.go.kr/api/typ01/url/wrn_now_data.php"

# 서울·수도권 (육상 + 인근 해상 일부)
_SEOUL_METRO = (
    "서울",
    "인천",
    "경기",
    "수원",
    "성남",
    "고양",
    "용인",
    "부천",
    "안양",
    "남양주",
    "화성",
    "평택",
    "의정부",
    "시흥",
    "파주",
    "김포",
    "광명",
    "군포",
    "하남",
    "오산",
    "이천",
    "안성",
    "의왕",
    "양주",
    "구리",
    "포천",
    "여주",
    "동두천",
    "과천",
    "가평",
    "연천",
    "양평",
    "서해중부",  # 인천·경기 인근 해상
    "서해북부",
)

_ICON: dict[str, str] = {
    "폭염": "🥵",
    "한파": "🥶",
    "호우": "⛈️",
    "강풍": "💨",
    "대설": "❄️",
    "태풍": "🌀",
    "황사": "😷",
    "건조": "🔥",
    "안개": "🌫️",
    "풍랑": "🌊",
    "해일": "🌊",
    "폭풍해일": "🌊",
}

_cache: dict[str, Any] = {"ts": 0.0, "data": None}
CACHE_TTL = 300.0


def _level_from_text(level_raw: str) -> str:
    t = (level_raw or "").strip()
    if "경보" in t:
        return "warning"
    if "주의" in t:
        return "watch"
    if "예비" in t:
        return "info"
    return "watch"


def _is_seoul_metro(reg_ko: str, reg_up_ko: str = "") -> bool:
    text = f"{reg_up_ko} {reg_ko}"
    if "전라" in text or "광주광역" in text:
        if "경기" not in text and "서울" not in text:
            return False
    return any(k in text for k in _SEOUL_METRO)


def _parse_wrn_rows(text: str) -> list[dict[str, str]]:
    """
    KMA wrn_now_data 고정 컬럼 CSV:
    REG_UP, REG_UP_KO, REG_ID, REG_KO, TM_FC, TM_EF, WRN, LVL, CMD, ED_TM,=
    """
    rows: list[dict[str, str]] = []
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#") or ln.startswith("="):
            continue
        if ln.startswith("#START") or ln.startswith("#END"):
            continue
        # 데이터 줄: 구역코드로 시작 (L... 육상 / S... 해상 등)
        if not re.match(r"^[A-Z]\d", ln):
            continue
        # trailing ,= 제거
        cleaned = re.sub(r",=\s*$", "", ln)
        parts = [p.strip() for p in cleaned.split(",")]
        if len(parts) < 8:
            continue
        # ED_TM 에 콤마가 있을 수 있음 → 9번째 이후 합침
        ed_tm = ",".join(parts[9:]).strip() if len(parts) > 9 else ""
        rows.append(
            {
                "REG_UP": parts[0],
                "REG_UP_KO": parts[1],
                "REG_ID": parts[2],
                "REG_KO": parts[3],
                "TM_FC": parts[4],
                "TM_EF": parts[5],
                "WRN": parts[6],
                "LVL": parts[7],
                "CMD": parts[8] if len(parts) > 8 else "",
                "ED_TM": ed_tm,
            }
        )
    return rows


def _fmt_tm(tm: str) -> str:
    """202608081200 -> 08-08 12:00"""
    t = re.sub(r"\D", "", tm or "")
    if len(t) >= 12:
        return f"{t[4:6]}-{t[6:8]} {t[8:10]}:{t[10:12]}"
    if len(t) >= 8:
        return f"{t[4:6]}-{t[6:8]}"
    return tm


def _row_to_alert(
    row: dict[str, str],
    *,
    regional_only: bool,
) -> dict[str, Any] | None:
    reg_ko = row.get("REG_KO", "")
    reg_up = row.get("REG_UP_KO", "")
    if regional_only and not _is_seoul_metro(reg_ko, reg_up):
        return None

    wrn = (row.get("WRN") or "").strip()
    lvl = (row.get("LVL") or "").strip()
    cmd = (row.get("CMD") or "").strip()
    level = _level_from_text(lvl)
    level_ko = "경보" if level == "warning" else "주의보" if level == "watch" else lvl
    kind = wrn or "기상특보"
    icon = _ICON.get(kind, "⚠️")
    area = reg_ko or reg_up or "해당 지역"
    tm_ef = _fmt_tm(row.get("TM_EF", ""))
    tm_fc = _fmt_tm(row.get("TM_FC", ""))
    ed = (row.get("ED_TM") or "").strip()

    msg_parts = [area]
    if cmd:
        msg_parts.append(cmd)
    if tm_ef:
        msg_parts.append(f"발효 {tm_ef}")
    elif tm_fc:
        msg_parts.append(f"발표 {tm_fc}")
    if ed:
        msg_parts.append(f"해제예고 {ed}")
    msg_parts.append("기상청 공식 특보")

    code = re.sub(r"\s+", "_", f"kma_{kind}_{level}_{area}")[:80]
    return {
        "code": code,
        "level": level,
        "title": f"{kind}{level_ko}",
        "message": " · ".join(msg_parts),
        "icon": icon,
        "source": "kma",
    }


def _group_by_title(alerts: list[dict[str, Any]], max_areas: int = 8) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for a in alerts:
        key_g = a["title"]
        area0 = a["message"].split(" · ")[0]
        if key_g not in grouped:
            grouped[key_g] = {**a, "_areas": [area0]}
        else:
            areas = grouped[key_g]["_areas"]
            if area0 not in areas and len(areas) < max_areas:
                areas.append(area0)
    compact: list[dict[str, Any]] = []
    for a in grouped.values():
        areas = a.pop("_areas", [])
        rest = " · ".join(a["message"].split(" · ")[1:])
        a["message"] = f"{', '.join(areas)}" + (f" · {rest}" if rest else "")
        a["code"] = re.sub(r"\s+", "_", f"kma_{a['title']}")[:64]
        compact.append(a)
    return compact


async def fetch_kma_warnings() -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    """
    Returns (regional_alerts, national_alerts, note)
    """
    settings = get_settings()
    key = (settings.kma_apihub_key or settings.weather_api_key or "").strip()
    if not key:
        return [], [], "KMA_APIHUB_KEY 미설정 — 조건 기반 안내만 사용"

    now = time.time()
    if _cache["data"] is not None and now - float(_cache["ts"]) < CACHE_TTL:
        return _cache["data"]  # type: ignore[return-value]

    params = {"fe": "f", "tm": "", "disp": "1", "authKey": key}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(WRN_URL, params=params)
            text = res.text
            if res.status_code == 401:
                return [], [], "기상청 authKey 권한 없음(401)"
            res.raise_for_status()
    except Exception as e:
        return [], [], f"기상청 특보 조회 실패 ({type(e).__name__})"

    if ("인증" in text and "실패" in text) or "invalid" in text.lower():
        return [], [], "기상청 authKey 인증 실패"

    rows = _parse_wrn_rows(text)
    regional_raw: list[dict[str, Any]] = []
    national_raw: list[dict[str, Any]] = []
    seen_r: set[str] = set()
    seen_n: set[str] = set()
    for row in rows:
        a_all = _row_to_alert(row, regional_only=False)
        if a_all and a_all["code"] not in seen_n:
            seen_n.add(a_all["code"])
            national_raw.append(a_all)
        a_reg = _row_to_alert(row, regional_only=True)
        if a_reg and a_reg["code"] not in seen_r:
            seen_r.add(a_reg["code"])
            regional_raw.append(a_reg)

    regional = _group_by_title(regional_raw, max_areas=6)
    national = _group_by_title(national_raw, max_areas=10)

    if regional:
        note = f"기상청 공식 · 지역 {len(regional)}건 · 전국 {len(national)}건"
    elif national:
        note = f"기상청 공식 전국 {len(national)}건 · 수도권 발효 없음"
    else:
        note = "기상청 특보: 발효 건 없음"

    result = (regional, national, note)
    _cache["ts"] = now
    _cache["data"] = result
    return result


# 하위 호환
async def fetch_kma_warnings_seoul() -> tuple[list[dict[str, Any]], str]:
    reg, _nat, note = await fetch_kma_warnings()
    return reg, note


def merge_alerts(
    official: list[dict[str, Any]],
    condition: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    out = list(official)
    official_kinds = " ".join(a.get("title", "") for a in official)

    def overlaps(cond_title: str) -> bool:
        for k in ("폭염", "한파", "호우", "강풍", "대설", "태풍", "황사", "풍랑", "대기"):
            if k in cond_title and k in official_kinds:
                return True
        return False

    for c in condition:
        if overlaps(c.get("title", "")):
            continue
        out.append(c)

    order = {"warning": 0, "watch": 1, "info": 2}
    out.sort(
        key=lambda a: (
            0 if a.get("source") == "kma" else 1,
            order.get(a.get("level", "info"), 9),
        )
    )
    return out

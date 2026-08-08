"""
날씨·대기질 조회 (Open-Meteo — API 키 불필요, 1시간 단위)

- Weather: https://open-meteo.com/
- Air quality: https://air-quality-api.open-meteo.com/
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta
from typing import Any

import httpx

from app.services.kma_warnings import fetch_kma_warnings, merge_alerts
from app.services.riding_score import WeatherInputs, compute_riding_score
from app.services.weather_alerts import build_weather_alerts

_WMO: dict[int, tuple[str, str]] = {
    0: ("맑음", "☀️"),
    1: ("대체로 맑음", "🌤️"),
    2: ("부분 흐림", "⛅"),
    3: ("흐림", "☁️"),
    45: ("안개", "🌫️"),
    48: ("착빙 안개", "🌫️"),
    51: ("이슬비", "🌦️"),
    53: ("이슬비", "🌦️"),
    55: ("강한 이슬비", "🌧️"),
    61: ("비", "☔"),
    63: ("비", "☔"),
    65: ("폭우", "🌧️"),
    66: ("어는 비", "🌧️"),
    67: ("강한 어는 비", "🌧️"),
    71: ("눈", "❄️"),
    73: ("눈", "❄️"),
    75: ("폭설", "❄️"),
    77: ("싸락눈", "❄️"),
    80: ("소나기", "🌦️"),
    81: ("소나기", "🌧️"),
    82: ("강한 소나기", "🌧️"),
    85: ("눈 소나기", "🌨️"),
    86: ("강한 눈 소나기", "🌨️"),
    95: ("뇌우", "⛈️"),
    96: ("뇌우·우박", "⛈️"),
    99: ("강한 뇌우·우박", "⛈️"),
}

_GRADE_LABEL = {1: "좋음", 2: "보통", 3: "나쁨", 4: "매우나쁨"}

_cache: dict[str, Any] = {"ts": 0.0, "key": None, "data": None}
CACHE_TTL = 600.0


def _weather_label(code: int, is_night: bool = False) -> tuple[str, str]:
    text, icon = _WMO.get(int(code), ("알 수 없음", "🌡️"))
    if code == 0 and is_night:
        return "맑음", "🌙"
    if code in (1, 2) and is_night:
        return text, "🌙"
    return text, icon


def _pm10_grade(v: float | None) -> int:
    if v is None:
        return 2
    if v <= 30:
        return 1
    if v <= 80:
        return 2
    if v <= 150:
        return 3
    return 4


def _pm25_grade(v: float | None) -> int:
    if v is None:
        return 2
    if v <= 15:
        return 1
    if v <= 35:
        return 2
    if v <= 75:
        return 3
    return 4


def _dust_grade(dust: float | None) -> int:
    if dust is None:
        return 1
    if dust <= 25:
        return 1
    if dust <= 50:
        return 2
    if dust <= 100:
        return 3
    return 4


def _f(v: Any, default: float = 0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _i(v: Any, default: int = 0) -> int:
    try:
        if v is None:
            return default
        return int(v)
    except (TypeError, ValueError):
        return default


async def fetch_weather_bundle(lat: float, lng: float) -> dict[str, Any]:
    cache_key = f"{round(lat, 3)},{round(lng, 3)}"
    now_ts = time.time()
    if (
        _cache["key"] == cache_key
        and _cache["data"]
        and now_ts - float(_cache["ts"]) < CACHE_TTL
    ):
        return _cache["data"]  # type: ignore[return-value]

    weather_url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        "&current=temperature_2m,apparent_temperature,relative_humidity_2m,"
        "precipitation_probability,weather_code,wind_speed_10m"
        "&hourly=temperature_2m,apparent_temperature,precipitation_probability,"
        "weather_code,wind_speed_10m,relative_humidity_2m"
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"
        "&timezone=Asia%2FSeoul&forecast_days=2"
        "&wind_speed_unit=ms"
    )
    air_url = (
        "https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={lat}&longitude={lng}"
        "&current=pm10,pm2_5,dust,european_aqi"
        "&hourly=pm10,pm2_5,dust"
        "&timezone=Asia%2FSeoul&forecast_days=2"
    )

    async with httpx.AsyncClient(timeout=20.0) as client:
        w_res = await client.get(weather_url)
        a_res = await client.get(air_url)
        w_res.raise_for_status()
        a_res.raise_for_status()
        w = w_res.json()
        a = a_res.json()

    cur = w.get("current") or {}
    acur = a.get("current") or {}

    temp = _f(cur.get("temperature_2m"), 20.0)
    feels = _f(cur.get("apparent_temperature"), temp)
    humidity = _f(cur.get("relative_humidity_2m"), 50.0)
    pop = _f(cur.get("precipitation_probability"), 0.0)
    wind = _f(cur.get("wind_speed_10m"), 0.0)
    wcode = _i(cur.get("weather_code"), 0)

    pm10 = _f(acur.get("pm10"), 0.0) if acur.get("pm10") is not None else None
    pm25 = _f(acur.get("pm2_5"), 0.0) if acur.get("pm2_5") is not None else None
    dust = _f(acur.get("dust"), 0.0) if acur.get("dust") is not None else None

    pm10_g = _pm10_grade(pm10)
    pm25_g = _pm25_grade(pm25)
    dust_g = _dust_grade(dust)

    # Open-Meteo timezone=Asia/Seoul → 로컬 벽시계 기준으로 비교
    hour_now = datetime.now().hour
    is_night = hour_now >= 21 or hour_now <= 4
    cond_text, cond_icon = _weather_label(wcode, is_night)

    inputs = WeatherInputs(
        temp_c=temp,
        feels_like_c=feels,
        precip_prob=pop,
        humidity=humidity,
        wind_ms=wind,
        pm10_grade=pm10_g,
        pm25_grade=pm25_g,
        dust_grade=dust_g,
        weather_code=wcode,
    )
    score, message = compute_riding_score(inputs)

    # 1시간 간격 예보: 현재 시각 이후 12시간
    hourly_out: list[dict[str, Any]] = []
    h = w.get("hourly") or {}
    times: list[str] = h.get("time") or []
    temps = h.get("temperature_2m") or []
    feels_l = h.get("apparent_temperature") or []
    pops = h.get("precipitation_probability") or []
    codes = h.get("weather_code") or []
    winds = h.get("wind_speed_10m") or []
    hums = h.get("relative_humidity_2m") or []

    now_local = datetime.now().replace(minute=0, second=0, microsecond=0) - timedelta(minutes=30)
    for i, t_str in enumerate(times):
        try:
            # open-meteo: "2026-03-26T14:00" (Asia/Seoul wall time, no offset)
            t_local = datetime.fromisoformat(t_str)
        except ValueError:
            continue
        if t_local < now_local:
            continue
        code = _i(codes[i] if i < len(codes) else 0, 0)
        hr = t_local.hour
        night = hr >= 21 or hr <= 4
        ctext, cicon = _weather_label(code, night)
        hourly_out.append(
            {
                "time": t_str,
                "hour": hr,
                "temp_c": round(_f(temps[i] if i < len(temps) else temp), 1),
                "feels_like_c": round(_f(feels_l[i] if i < len(feels_l) else feels), 1),
                "precip_prob": round(_f(pops[i] if i < len(pops) else 0), 0),
                "weather_code": code,
                "condition": ctext,
                "icon": cicon,
                "wind_ms": round(_f(winds[i] if i < len(winds) else 0), 1),
                "humidity": round(_f(hums[i] if i < len(hums) else humidity), 0),
            }
        )
        if len(hourly_out) >= 12:
            break

    daily = w.get("daily") or {}
    dmax_list = daily.get("temperature_2m_max") or []
    dmin_list = daily.get("temperature_2m_min") or []
    daily_max = _f(dmax_list[0], temp) if dmax_list else max(
        [temp, feels] + [x["temp_c"] for x in hourly_out[:8]],
        default=temp,
    )
    daily_min = _f(dmin_list[0], temp) if dmin_list else min(
        [temp, feels] + [x["temp_c"] for x in hourly_out[:8]],
        default=temp,
    )

    condition_alerts = build_weather_alerts(
        temp_c=temp,
        feels_like_c=feels,
        precip_prob=pop,
        wind_ms=wind,
        humidity=humidity,
        weather_code=wcode,
        pm10_grade=pm10_g,
        pm25_grade=pm25_g,
        dust_grade=dust_g,
        daily_max_c=daily_max,
        daily_min_c=daily_min,
    )
    # 지역(수도권) 특보 + 조건 안내 → 라이딩 점수 카드
    # 전국 특보 → 날씨 탭 하단
    kma_regional, kma_national, kma_note = await fetch_kma_warnings()
    alerts = merge_alerts(kma_regional, condition_alerts)
    alerts_all = list(kma_national)
    if kma_regional or kma_national:
        alerts_note = f"{kma_note}."
        source = "open-meteo+kma"
    else:
        alerts_note = (
            "현재 기상·대기 조건 기반 안내입니다. 기상청 공식 특보와 다를 수 있습니다. "
            f"({kma_note})"
        )
        source = "open-meteo"

    bundle = {
        "lat": lat,
        "lng": lng,
        "location_name": "서울",
        "temp_c": round(temp, 1),
        "feels_like_c": round(feels, 1),
        "precip_prob": round(pop, 0),
        "humidity": round(humidity, 0),
        "wind_ms": round(wind, 1),
        "weather_code": wcode,
        "condition": cond_text,
        "icon": cond_icon,
        "pm10": round(pm10, 1) if pm10 is not None else None,
        "pm25": round(pm25, 1) if pm25 is not None else None,
        "dust": round(dust, 1) if dust is not None else None,
        "pm10_grade": pm10_g,
        "pm25_grade": pm25_g,
        "dust_grade": dust_g,
        "pm10_label": _GRADE_LABEL.get(pm10_g, "정보없음"),
        "pm25_label": _GRADE_LABEL.get(pm25_g, "정보없음"),
        "dust_label": _GRADE_LABEL.get(dust_g, "정보없음"),
        "score": score,
        "message": message,
        "hourly": hourly_out,
        "alerts": alerts,
        "alerts_all": alerts_all,
        "alerts_note": alerts_note,
        "source": source,
    }

    _cache["ts"] = now_ts
    _cache["key"] = cache_key
    _cache["data"] = bundle
    return bundle

"""
라이딩용 기상·대기 주의 안내

- 기상청 **공식 특보 API가 아님**
- Open-Meteo 현재/일 최고 기온 등으로 폭염·한파·강풍·호우·미세먼지 조건을 추정
- 공식 특보 연동은 추후 KMA API 키로 확장 가능
"""

from __future__ import annotations

from typing import Any, Literal

AlertLevel = Literal["info", "watch", "warning"]


def build_weather_alerts(
    *,
    temp_c: float,
    feels_like_c: float,
    precip_prob: float,
    wind_ms: float,
    humidity: float,
    weather_code: int,
    pm10_grade: int,
    pm25_grade: int,
    dust_grade: int,
    daily_max_c: float | None = None,
    daily_min_c: float | None = None,
) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    peak = daily_max_c if daily_max_c is not None else max(temp_c, feels_like_c)
    low = daily_min_c if daily_min_c is not None else min(temp_c, feels_like_c)

    # 폭염 — 기상청 기준(최고 33/35)에 가깝게, 당일 peak 기준
    if peak >= 35 or feels_like_c >= 37:
        alerts.append(
            {
                "code": "heat_warning",
                "level": "warning",
                "title": "폭염경보급",
                "message": f"일 최고 약 {peak:.0f}°C · 체감 {feels_like_c:.0f}°C. 한낮 라이딩을 피하고 수분·그늘을 챙기세요.",
                "icon": "🥵",
                "source": "condition",
            }
        )
    elif peak >= 33 or feels_like_c >= 34:
        alerts.append(
            {
                "code": "heat_watch",
                "level": "watch",
                "title": "폭염주의보급",
                "message": f"일 최고 약 {peak:.0f}°C · 체감 {feels_like_c:.0f}°C. 장시간·오르막 라이딩에 주의하세요.",
                "icon": "🌡️",
                "source": "condition",
            }
        )
    elif temp_c >= 30 or feels_like_c >= 32:
        alerts.append(
            {
                "code": "heat_info",
                "level": "info",
                "title": "더위 주의",
                "message": f"기온 {temp_c:.0f}°C · 체감 {feels_like_c:.0f}°C. 수분 섭취를 권장합니다.",
                "icon": "☀️",
                "source": "condition",
            }
        )

    # 한파
    if low <= -12 or temp_c <= -10:
        alerts.append(
            {
                "code": "cold_warning",
                "level": "warning",
                "title": "한파경보급",
                "message": f"기온 {temp_c:.0f}°C · 최저 약 {low:.0f}°C. 동상·노면 결빙에 주의하세요.",
                "icon": "🥶",
                "source": "condition",
            }
        )
    elif low <= -5 or temp_c <= -3 or feels_like_c <= -8:
        alerts.append(
            {
                "code": "cold_watch",
                "level": "watch",
                "title": "한파주의보급",
                "message": f"기온 {temp_c:.0f}°C · 체감 {feels_like_c:.0f}°C. 방한 장비와 미끄러운 노면을 확인하세요.",
                "icon": "❄️",
                "source": "condition",
            }
        )

    # 강풍 (대략 14m/s 주의, 21m/s 경보급)
    if wind_ms >= 21:
        alerts.append(
            {
                "code": "wind_warning",
                "level": "warning",
                "title": "강풍경보급",
                "message": f"바람 {wind_ms:.1f}m/s. 고가·교량·횡풍 구간 라이딩을 피하세요.",
                "icon": "💨",
                "source": "condition",
            }
        )
    elif wind_ms >= 14:
        alerts.append(
            {
                "code": "wind_watch",
                "level": "watch",
                "title": "강풍주의보급",
                "message": f"바람 {wind_ms:.1f}m/s. 불안정한 자세·낙하물에 주의하세요.",
                "icon": "🌬️",
                "source": "condition",
            }
        )

    # 호우·뇌우 (강수확률 + weather code)
    heavy_codes = {65, 82, 95, 96, 99}
    if weather_code in heavy_codes or precip_prob >= 80:
        alerts.append(
            {
                "code": "rain_warning",
                "level": "warning" if weather_code in heavy_codes or precip_prob >= 90 else "watch",
                "title": "호우·뇌우 주의",
                "message": f"강수확률 {precip_prob:.0f}%. 미끄러운 노면·시야 불량에 대비하세요.",
                "icon": "⛈️",
                "source": "condition",
            }
        )
    elif precip_prob >= 55:
        alerts.append(
            {
                "code": "rain_info",
                "level": "info",
                "title": "강수 가능성",
                "message": f"강수확률 {precip_prob:.0f}%. 우비·방수 장비를 챙기세요.",
                "icon": "☔",
                "source": "condition",
            }
        )

    # 미세먼지·황사
    air_worst = max(pm10_grade, pm25_grade, dust_grade)
    if air_worst >= 4:
        alerts.append(
            {
                "code": "air_warning",
                "level": "warning",
                "title": "대기질 매우나쁨",
                "message": "미세/초미세 또는 황사가 매우 나쁩니다. 실외 라이딩을 자제하세요.",
                "icon": "😷",
                "source": "condition",
            }
        )
    elif air_worst >= 3:
        alerts.append(
            {
                "code": "air_watch",
                "level": "watch",
                "title": "대기질 나쁨",
                "message": "미세먼지 나쁨. 마스크·단거리 위주를 권장합니다.",
                "icon": "🌫️",
                "source": "condition",
            }
        )

    # 습도 매우 높고 더우면
    if humidity >= 85 and (temp_c >= 28 or feels_like_c >= 30):
        if not any(a["code"].startswith("heat") for a in alerts):
            alerts.append(
                {
                    "code": "humid_heat",
                    "level": "info",
                    "title": "고온다습",
                    "message": f"습도 {humidity:.0f}% · 체감 {feels_like_c:.0f}°C. 탈수에 주의하세요.",
                    "icon": "💧",
                    "source": "condition",
                }
            )

    # 심각도 순 정렬
    order = {"warning": 0, "watch": 1, "info": 2}
    alerts.sort(key=lambda a: order.get(a.get("level", "info"), 9))
    return alerts

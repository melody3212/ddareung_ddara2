"""Rule-based riding score (0–100) from weather & air quality."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WeatherInputs:
    temp_c: float
    feels_like_c: float
    precip_prob: float  # 0–100
    humidity: float  # 0–100
    wind_ms: float
    pm10_grade: int  # 1 good … 4 very bad
    pm25_grade: int = 1
    dust_grade: int = 1  # 황사/먼지 등급 1–4
    weather_code: int = 0  # WMO code (open-meteo)


def compute_riding_score(w: WeatherInputs) -> tuple[int, str]:
    score = 100.0

    # Temperature (ideal ~12–26°C, feels-like weighted)
    t = (w.temp_c * 0.6) + (w.feels_like_c * 0.4)
    if t < -5 or t > 36:
        score -= 40
    elif t < 0 or t > 33:
        score -= 28
    elif t < 5 or t > 30:
        score -= 16
    elif t < 10 or t > 28:
        score -= 8

    # Precipitation probability
    if w.precip_prob >= 70:
        score -= 32
    elif w.precip_prob >= 40:
        score -= 18
    elif w.precip_prob >= 20:
        score -= 8

    # Weather code (rain/snow/thunder heavier than pop alone)
    code = w.weather_code
    if code >= 95:  # thunder
        score -= 25
    elif code in (65, 67, 82) or 80 <= code <= 82:  # heavy rain
        score -= 20
    elif 51 <= code <= 67 or 80 <= code <= 86:  # rain/snow showers
        score -= 12
    elif 71 <= code <= 77:  # snow
        score -= 18
    elif 45 <= code <= 48:  # fog
        score -= 10

    # Wind (m/s)
    if w.wind_ms >= 12:
        score -= 22
    elif w.wind_ms >= 8:
        score -= 12
    elif w.wind_ms >= 5:
        score -= 5

    # Humidity extremes
    if w.humidity >= 90 or w.humidity <= 15:
        score -= 8
    elif w.humidity >= 80:
        score -= 4

    # Air quality
    score -= {1: 0, 2: 6, 3: 18, 4: 32}.get(w.pm10_grade, 8)
    score -= {1: 0, 2: 5, 3: 14, 4: 28}.get(w.pm25_grade, 6)
    score -= {1: 0, 2: 8, 3: 20, 4: 35}.get(w.dust_grade, 5)  # 황사 가중

    score_i = max(0, min(100, int(round(score))))

    if score_i >= 85:
        msg = "라이딩하기 완벽한 날!"
    elif score_i >= 70:
        msg = "쾌적하게 타기 좋은 날씨예요."
    elif score_i >= 50:
        msg = "무난하지만 날씨·대기질을 한 번 더 확인하세요."
    elif score_i >= 30:
        msg = "실외 라이딩은 신중히 결정하세요."
    else:
        msg = "오늘은 실내 운동을 추천해요."

    # 구체 사유 한 줄 추가
    reasons: list[str] = []
    if w.precip_prob >= 40 or (51 <= code <= 86) or code >= 95:
        reasons.append("강수")
    if max(w.pm10_grade, w.pm25_grade) >= 3:
        reasons.append("미세먼지")
    if w.dust_grade >= 3:
        reasons.append("황사·먼지")
    if w.wind_ms >= 8:
        reasons.append("강풍")
    if t < 5 or t > 30:
        reasons.append("기온")
    if reasons and score_i < 85:
        msg = f"{msg} ({', '.join(reasons)} 참고)"

    return score_i, msg

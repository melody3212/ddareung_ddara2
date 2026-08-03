"""Rule-based riding score (0–100) from weather & air inputs."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WeatherInputs:
    temp_c: float
    feels_like_c: float
    precip_prob: float  # 0–100
    humidity: float  # 0–100
    wind_ms: float
    pm10_grade: int  # 1 good … 4 very bad (Korean common scale)


def compute_riding_score(w: WeatherInputs) -> tuple[int, str]:
    score = 100.0

    # Temperature comfort (ideal ~15–25°C)
    if w.temp_c < 0 or w.temp_c > 35:
        score -= 35
    elif w.temp_c < 5 or w.temp_c > 32:
        score -= 20
    elif w.temp_c < 10 or w.temp_c > 28:
        score -= 10

    # Precipitation
    if w.precip_prob >= 70:
        score -= 30
    elif w.precip_prob >= 40:
        score -= 15
    elif w.precip_prob >= 20:
        score -= 5

    # Wind
    if w.wind_ms >= 10:
        score -= 20
    elif w.wind_ms >= 6:
        score -= 10

    # Humidity extremes
    if w.humidity >= 90 or w.humidity <= 20:
        score -= 8

    # Air quality
    score -= {1: 0, 2: 5, 3: 18, 4: 35}.get(w.pm10_grade, 10)

    score_i = max(0, min(100, int(round(score))))

    if score_i >= 85:
        msg = "라이딩하기 완벽한 날!"
    elif score_i >= 70:
        msg = "쾌적하게 타기 좋은 날씨예요."
    elif score_i >= 50:
        msg = "무난하지만 날씨를 한 번 더 확인하세요."
    elif score_i >= 30:
        msg = "실외 라이딩은 신중히 결정하세요."
    else:
        msg = "오늘은 실내 운동을 추천해요."

    return score_i, msg

"""OSRM maneuver → 한국어 안내."""

from __future__ import annotations

from typing import Any

_MODIFIER_KO = {
    "left": "좌회전",
    "right": "우회전",
    "slight left": "좌측으로",
    "slight right": "우측으로",
    "sharp left": "크게 좌회전",
    "sharp right": "크게 우회전",
    "straight": "직진",
    "uturn": "유턴",
}


def _mod_ko(modifier: str | None) -> str:
    if not modifier:
        return ""
    return _MODIFIER_KO.get(modifier, modifier)


def format_instruction(
    *,
    maneuver_type: str,
    modifier: str | None,
    road_name: str | None,
    leg_kind: str = "bike",
) -> str:
    name = (road_name or "").strip()
    on = f" ({name})" if name else ""
    mode = "도보" if leg_kind == "walk" else "자전거"
    m = _mod_ko(modifier)
    t = (maneuver_type or "").lower()
    if t in ("depart", "notification"):
        return f"{mode} 출발{on}"
    if t == "arrive":
        return f"목적지에 도착했습니다{on}"
    if t == "turn":
        return f"{m or '회전'}하세요{on}" if m else f"회전하세요{on}"
    if t == "new name":
        return f"계속 직진{on}" if not m else f"{m} 직진{on}"
    if t == "continue":
        return f"계속 직진{on}"
    if t == "merge":
        return f"합류하세요{on}"
    if t in ("on ramp", "off ramp", "fork"):
        return f"{m or '분기'} 방향으로 진행{on}"
    if t == "end of road":
        return f"도로 끝에서 {m or '진행'}{on}"
    if t in ("roundabout", "rotary"):
        return f"회전 교차로에서 {m or '진행'}{on}"
    if t in ("exit roundabout", "exit rotary"):
        return f"회전 교차로에서 나오세요{on}"
    if t == "uturn":
        return f"유턴하세요{on}"
    if m:
        return f"{m} 진행{on}"
    return f"진행하세요{on}"


def parse_osrm_steps(route_json: dict[str, Any], *, leg_kind: str = "bike") -> list[dict[str, Any]]:
    steps_out: list[dict[str, Any]] = []
    along = 0.0
    for leg in route_json.get("legs") or []:
        for step in leg.get("steps") or []:
            man = step.get("maneuver") or {}
            loc = man.get("location") or [0, 0]
            try:
                lng, lat = float(loc[0]), float(loc[1])
            except (TypeError, ValueError, IndexError):
                continue
            dist = float(step.get("distance") or 0)
            dur = float(step.get("duration") or 0)
            mtype = str(man.get("type") or "")
            modifier = man.get("modifier")
            if modifier is not None:
                modifier = str(modifier)
            name = step.get("name") or step.get("ref") or ""
            icon = _icon_for(mtype, modifier)
            steps_out.append(
                {
                    "instruction": format_instruction(
                        maneuver_type=mtype,
                        modifier=modifier,
                        road_name=str(name) if name else None,
                        leg_kind=leg_kind,
                    ),
                    "maneuver_type": mtype,
                    "modifier": modifier,
                    "road_name": str(name) if name else None,
                    "distance_m": round(dist, 1),
                    "duration_s": round(dur, 1),
                    "lat": lat,
                    "lng": lng,
                    "distance_along_m": round(along, 1),
                    "leg_kind": leg_kind,
                    "icon": icon,
                }
            )
            along += dist
    return steps_out


def _icon_for(maneuver_type: str, modifier: str | None) -> str:
    t = (maneuver_type or "").lower()
    m = (modifier or "").lower()
    if t == "arrive":
        return "finish"
    if t == "depart":
        return "start"
    if t == "uturn" or m == "uturn":
        return "uturn"
    if "left" in m:
        return "left"
    if "right" in m:
        return "right"
    if t in ("roundabout", "rotary", "exit roundabout", "exit rotary"):
        return "roundabout"
    return "straight"

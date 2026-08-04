# features / shared 구조

기능 단위로 프론트 코드를 나눕니다.

```
src/
  features/
    map/          # 카카오 지도, 레이어 훅, 토글 버튼
    stations/     # 따릉이 대여소 API·타입
    bike-roads/   # GeoJSON 도로 파싱·API
    elevation/    # 고도·경사 API·타입
    weather/      # 날씨 UI·API
    courses/      # 추천 코스 UI·API
    routes/       # 길찾기 화면·API (stub + 경사 프로필)
    places/       # 장소·상호 검색 (카카오 로컬 / JS Places)
  shared/
    api/          # HTTP client + 통합 api 파사드
    geo/          # 거리 유틸
    store/        # UI 전역 상태
    ui/           # BottomNav, BottomSheet
  pages/          # 라우트 페이지 (기능 조합)
  lib/            # 하위 호환 re-export (deprecated)
```

## 규칙

- **기능 추가** 시 해당 `features/<name>/` 에 `types.ts`, `api.ts`, `components/`, `hooks/` 를 둡니다.
- 페이지는 features 를 import 해서 조합만 합니다.
- 공통 HTTP 는 `shared/api/client.ts` 만 사용합니다.
- 길찾기 구현 시 `features/routes/` 에 API·화면·훅을 추가합니다.

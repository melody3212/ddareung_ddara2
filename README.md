# 따릉따라 (Ddareung Ddara)

서울 자전거 유저를 위한 **지도 기반 코스 추천** 플랫폼.

React 웹 MVP → PWA → 앱 확장.

## 문서

| 문서 | 설명 |
|------|------|
| **[docs/로컬실행가이드.md](docs/로컬실행가이드.md)** | **백엔드·프론트 로컬 실행 (필독)** |
| **[docs/데이터연동가이드.md](docs/데이터연동가이드.md)** | 따릉이·자전거도로·지도 데이터 출처 |
| `따릉따라_로컬실행가이드_v1.0.docx` | 로컬 실행 Word 버전 |
| `따릉따라_개발문서_v1.1.docx` | 요구사항 · 화면 · 아키텍처 요약 · DB · 로드맵 |
| `따릉따라_시스템아키텍처_v1.0.docx` | 시스템 아키텍처 상세 |

문서 재생성:

```bash
node generate-dev-doc.js
node generate-architecture-doc.js
node generate-local-run-doc.js
```

## 기술 스택 (기준선)

| 영역 | 선택 |
|------|------|
| FE | React + TypeScript + Vite |
| 지도 | **Kakao Maps** |
| 상태 | TanStack Query + Zustand |
| UI | Tailwind CSS |
| BE | **FastAPI** (NestJS는 학습 경로) |
| DB | PostgreSQL (확장) |

## 프로젝트 구조

```
frontend/   # React 웹앱 (Vite :5173)
backend/    # FastAPI (:8000)
scripts/    # start-backend.ps1 / start-frontend.ps1
docs/       # 마크다운 가이드
```

## 로컬 실행 (요약)

**터미널 2개**가 필요합니다. 상세는 [로컬 실행 가이드](docs/로컬실행가이드.md).

### 1) Backend (대여소·날씨·코스 API)

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

또는:

```powershell
.\scripts\start-backend.ps1
```

- Health: http://localhost:8000/api/health  
- Swagger: http://localhost:8000/docs  

### 2) Frontend (화면 + 카카오 지도)

```powershell
cd frontend
npm run dev
```

또는:

```powershell
.\scripts\start-frontend.ps1
```

- App: http://localhost:5173  

| 보고 싶은 것 | 켤 것 |
|--------------|--------|
| 지도 UI | Frontend + Kakao JS 키 |
| 대여소·날씨·코스 | **Frontend + Backend** |

종료: 각 터미널에서 `Ctrl + C`

### 최초 1회

```powershell
# Frontend
cd frontend
npm install
copy .env.example .env
# → VITE_KAKAO_JS_KEY 입력

# Backend
cd ..\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

카카오 개발자 콘솔 → Web 도메인에 `http://localhost:5173` 등록.

## 환경 변수 · 시크릿

**API 키·시크릿은 Git에 올리지 않습니다.** `.env` 는 `.gitignore` 대상입니다.

```powershell
copy frontend\.env.example frontend\.env
copy backend\.env.example backend\.env
```

| 위치 | 변수 예시 |
|------|-----------|
| Web | `VITE_API_BASE_URL`, `VITE_KAKAO_JS_KEY` |
| API | `CORS_ORIGINS`, `KAKAO_REST_KEY`, `SEOUL_OPENAPI_KEY`, … |

커밋 전: `git status` 에 `.env` 가 보이면 안 됩니다.

## 저장소

https://github.com/melody3212/ddareung_ddara2

## 라이선스

Private / 학습·프로젝트용

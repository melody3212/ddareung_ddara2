# 따릉따라 (Ddareung Ddara)

서울 자전거 유저를 위한 **지도 기반 코스 추천** 플랫폼.

React 웹 MVP → PWA → 앱 확장.

## 문서

| 문서 | 설명 |
|------|------|
| `따릉따라_개발문서_v1.1.docx` | 요구사항 · 화면 · 아키텍처 요약 · DB · 로드맵 |
| `따릉따라_시스템아키텍처_v1.0.docx` | 시스템 아키텍처 상세 |

문서 재생성:

```bash
node generate-dev-doc.js
node generate-architecture-doc.js
```

## 기술 스택 (기준선)

| 영역 | 선택 |
|------|------|
| FE | React + TypeScript + Vite |
| 지도 | **Kakao Maps** |
| 상태 | TanStack Query + Zustand |
| UI | Tailwind CSS + shadcn/ui |
| BE | **FastAPI** (NestJS는 학습 경로) |
| DB | PostgreSQL |

## 프로젝트 구조

```
frontend/   # React 웹앱
backend/    # FastAPI
docs 산출물 # *.docx
```

## 로컬 실행

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL, VITE_KAKAO_JS_KEY
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

## 환경 변수 · 시크릿

**API 키·시크릿은 Git에 올리지 않습니다.** `.env` 는 `.gitignore` 대상입니다.

```bash
cp frontend/.env.example frontend/.env   # VITE_KAKAO_JS_KEY 등 입력
cp backend/.env.example backend/.env     # REST/공공 API 키 등 입력
```

| 위치 | 변수 예시 |
|------|-----------|
| Web | `VITE_API_BASE_URL`, `VITE_KAKAO_JS_KEY` |
| API | `DATABASE_URL`, `CORS_ORIGINS`, `KAKAO_REST_KEY`, `SEOUL_OPENAPI_KEY`, `JWT_SECRET` … |

커밋 전 확인: `git status` 에 `.env` 가 보이면 안 됩니다.

## 라이선스

Private / 학습·프로젝트용

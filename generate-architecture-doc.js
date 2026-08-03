/**
 * 따릉따라 시스템 아키텍처 문서 생성기
 * 실행: node generate-architecture-doc.js
 */
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
        VerticalAlign } = require('docx');
const fs = require('fs');
const path = require('path');

const A4_W = 11906;
const A4_H = 16838;
const MARGIN = 850;
const CONTENT_W = A4_W - MARGIN * 2;

const thin = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };

const BLUE = "2B6CB0";
const LIGHT_BLUE = "EBF4FF";
const HEADER_BG = "2B6CB0";
const ALT_BG = "F7FAFC";
const GREEN = "276749";
const ORANGE = "C05621";
const GRAY = "718096";

function p(text, opts = {}) {
  const { bold = false, size = 20, color = "1A202C", align, spacing, italics } = opts;
  return new Paragraph({
    alignment: align,
    spacing: spacing || { after: 80, line: 276 },
    children: [new TextRun({ text, bold, size, font: "Malgun Gothic", color, italics })]
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Malgun Gothic", color: BLUE })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Malgun Gothic", color: "2D3748" })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Malgun Gothic", color: "4A5568" })]
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

function bullet(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60, line: 276 },
    children: [new TextRun({ text, size: 20, font: "Malgun Gothic", color: "1A202C" })]
  });
}

function monoBlock(lines) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: "1A202C", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: lines.map(line => new Paragraph({
              spacing: { after: 20, line: 260 },
              children: [new TextRun({
                text: line || " ",
                size: 16,
                font: "Consolas",
                color: "E2E8F0"
              })]
            }))
          })
        ]
      })
    ]
  });
}

function callout(text, bg = LIGHT_BLUE) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: bg, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [p(text, { size: 19, color: "2D3748" })]
          })
        ]
      })
    ]
  });
}

function cell(text, opts = {}) {
  const {
    width = 2000, bold = false, fill, align = AlignmentType.LEFT,
    size = 17, color = "1A202C"
  } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: 0, line: 240 },
        children: [new TextRun({
          text,
          bold,
          size,
          font: "Malgun Gothic",
          color: fill === HEADER_BG ? "FFFFFF" : color
        })]
      })
    ]
  });
}

function multiCell(paragraphs, opts = {}) {
  const { width = 2000, fill } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    verticalAlign: VerticalAlign.TOP,
    children: paragraphs
  });
}

function headerRow(labels, widths) {
  return new TableRow({
    children: labels.map((label, i) =>
      cell(label, { width: widths[i], bold: true, fill: HEADER_BG, align: AlignmentType.CENTER, size: 16 })
    )
  });
}

function dataRow(values, widths, alt = false) {
  return new TableRow({
    children: values.map((v, i) =>
      cell(String(v), { width: widths[i], fill: alt ? ALT_BG : undefined, size: 16 })
    )
  });
}

function simpleTable(headers, rows, widths) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      headerRow(headers, widths),
      ...rows.map((r, idx) => dataRow(r, widths, idx % 2 === 1))
    ]
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function kvTable(pairs) {
  const wLabel = 2800;
  const wValue = CONTENT_W - wLabel;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [wLabel, wValue],
    rows: pairs.map(([label, value], idx) => new TableRow({
      children: [
        cell(label, { width: wLabel, bold: true, fill: idx % 2 ? ALT_BG : LIGHT_BLUE, size: 17 }),
        multiCell(
          String(value).split("\n").map(line => p(line, { size: 17 })),
          { width: wValue, fill: idx % 2 ? ALT_BG : undefined }
        )
      ]
    }))
  });
}

// ─── document body ─────────────────────────────────────────
const children = [];

// COVER
children.push(emptyLine());
children.push(emptyLine());
children.push(p("SYSTEM ARCHITECTURE DOCUMENT", {
  size: 22, color: BLUE, align: AlignmentType.CENTER, bold: true,
  spacing: { after: 200 }
}));
children.push(p("따릉따라", {
  size: 56, color: "1A202C", align: AlignmentType.CENTER, bold: true,
  spacing: { after: 120 }
}));
children.push(p("시스템 아키텍처 설계서", {
  size: 32, color: "2D3748", align: AlignmentType.CENTER, bold: true,
  spacing: { after: 280 }
}));
children.push(p("서울 자전거 코스 · 지도 기반 라이딩 가이드 플랫폼", {
  size: 20, color: GRAY, align: AlignmentType.CENTER, spacing: { after: 400 }
}));
children.push(emptyLine());
children.push(kvTable([
  ["문서 버전", "v1.0"],
  ["작성일", "2026-08-04"],
  ["문서 유형", "시스템 아키텍처 (논리·기술·배포·API·보안)"],
  ["관련 문서", "따릉따라_개발문서_v1.0 (요구사항 · 화면설계 · DB)"],
  ["서비스명", "따릉따라 (Ddareung Ddara)"],
  ["대상 플랫폼", "React 웹앱 (SPA) → PWA → 앱 확장"],
  ["지도", "Kakao Maps API / SDK (확정)"],
  ["백엔드 기준안", "FastAPI (본편) · NestJS (학습·대안 경로)"],
]));
children.push(emptyLine());
children.push(callout(
  "본 문서는 요구사항·화면설계를 바탕으로 시스템 구조, 기술 스택, 데이터 흐름, 외부 연동, 배포 전략을 정의한다. " +
  "MVP 구현의 기술 기준선이며, 확장 단계 로드맵을 함께 포함한다."
));

children.push(pageBreak());

// TOC-like
children.push(h1("목차"));
const toc = [
  "1. 문서 목적 및 범위",
  "2. 아키텍처 목표와 설계 원칙",
  "3. 시스템 컨텍스트 (C4 L1)",
  "4. 논리 아키텍처 (C4 L2)",
  "5. 기술 스택",
  "6. 컴포넌트 상세 설계",
  "7. 데이터 아키텍처",
  "8. API 설계 개요",
  "9. 주요 시퀀스 (데이터 흐름)",
  "10. 외부 시스템 연동",
  "11. 보안 · 인증",
  "12. 배포 · 인프라 · 환경 구성",
  "13. 비기능 요구사항 (NFR)",
  "14. 단계별 아키텍처 로드맵",
  "15. 백엔드 이중 경로 (FastAPI / NestJS)",
  "16. 리스크 및 의사결정 기록",
  "17. 부록 — 디렉터리 구조 예시",
];
toc.forEach(t => children.push(bullet(t)));

children.push(pageBreak());

// 1
children.push(h1("1. 문서 목적 및 범위"));
children.push(h2("1.1 목적"));
children.push(bullet("개발·협업 시 공통의 시스템 구조 기준을 제공한다."));
children.push(bullet("프론트엔드·백엔드·외부 API·DB 간 책임 경계를 명확히 한다."));
children.push(bullet("MVP와 확장 단계에서 기술 선택이 흔들리지 않도록 기준선을 고정한다."));
children.push(bullet("배포, 보안, 캐시, 키 관리 등 운영 관점을 사전에 정의한다."));

children.push(h2("1.2 범위"));
children.push(simpleTable(
  ["포함", "비포함 (별도 문서)"],
  [
    ["논리/물리 아키텍처, 기술 스택", "상세 UI 와이어프레임 (화면설계서)"],
    ["API 엔드포인트 초안, 인증 흐름", "세부 유스케이스 명세서"],
    ["외부 API 연동 방식, 캐시 정책", "상세 ERD·객체 정의서 전부"],
    ["배포 토폴로지, 환경 변수 목록", "코드 레벨 구현 스펙"],
    ["MVP ↔ 확장 로드맵", "인프라 비용 견적 상세"],
  ],
  [Math.floor(CONTENT_W / 2), Math.ceil(CONTENT_W / 2)]
));

children.push(h2("1.3 대상 독자"));
children.push(bullet("프론트엔드 / 백엔드 개발자"));
children.push(bullet("프로젝트 기획·문서 작성 담당"));
children.push(bullet("배포·연동 검토 시 참고하는 팀원"));

// 2
children.push(h1("2. 아키텍처 목표와 설계 원칙"));
children.push(h2("2.1 비즈니스 목표와의 정합"));
children.push(bullet("서울 자전거 유저를 위한 지도 기반 코스·대여소·도로 시각화"));
children.push(bullet("날씨·미세먼지 기반 라이딩 점수와 추천 코스 제공"));
children.push(bullet("게스트 중심 MVP → 회원·주행·길찾기·커뮤니티로 확장"));
children.push(bullet("React 웹 MVP → PWA → 네이티브/하이브리드 앱 확장"));

children.push(h2("2.2 설계 원칙"));
children.push(simpleTable(
  ["원칙", "설명"],
  [
    ["지도 중심", "Kakao Maps를 단일 지도 제공자로 사용. 렌더링은 클라이언트, 민감 키·프록시는 서버."],
    ["BFF / API 게이트 역할", "공공·날씨 API 키와 CORS 이슈를 백엔드가 흡수. 프론트는 자사 API만 호출."],
    ["MVP 단순성", "초기 단일 백엔드 프로세스. 마이크로서비스 분할은 확장 단계에서만 검토."],
    ["관심사 분리", "UI 상태(Zustand)와 서버 상태(TanStack Query) 분리. API는 도메인 모듈 단위."],
    ["확장 가능 스키마", "공간 데이터는 GeoJSON으로 시작하되, PostGIS 전환을 염두에 둔 모델."],
    ["보안 기본값", "시크릿은 환경변수. JWT는 확장 단계. HTTPS 필수."],
    ["점진적 고도화", "캐시(Redis), 길찾기, 실시간 주행은 단계적으로 도입."],
  ],
  [2400, CONTENT_W - 2400]
));

children.push(h2("2.3 품질 속성 우선순위 (MVP)"));
children.push(simpleTable(
  ["우선순위", "품질 속성", "목표"],
  [
    ["1", "사용성 / 모바일 UX", "모바일 퍼스트, 지도·바텀시트 반응성"],
    ["2", "개발 속도", "익숙한 스택으로 MVP 기능 완성"],
    ["3", "연동 안정성", "외부 API 장애 시 폴백·에러 UI"],
    ["4", "보안", "키 비노출, 기본 입력 검증"],
    ["5", "확장성", "회원·기록·길찾기 추가 시 구조 변경 최소화"],
    ["6", "성능", "대여소 다수 마커 클러스터, 캐시로 외부 호출 절감"],
  ],
  [1400, 2400, CONTENT_W - 3800]
));

// 3
children.push(h1("3. 시스템 컨텍스트 (C4 L1)"));
children.push(p("시스템과 외부 액터·외부 시스템의 경계를 정의한다."));
children.push(emptyLine());
children.push(monoBlock([
  "                    ┌──────────────┐",
  "                    │  게스트/회원  │",
  "                    │ (Web / PWA)  │",
  "                    └──────┬───────┘",
  "                           │ HTTPS",
  "                           ▼",
  "              ┌────────────────────────┐",
  "              │     따릉따라 시스템      │",
  "              │  Web Client + API Server │",
  "              └────────────┬───────────┘",
  "           ┌───────────────┼───────────────────┐",
  "           ▼               ▼                   ▼",
  "   ┌──────────────┐ ┌─────────────┐   ┌────────────────┐",
  "   │ Kakao Maps / │ │ 서울 열린   │   │ 기상청·에어    │",
  "   │ Local API    │ │ 데이터광장  │   │ 코리아 등      │",
  "   └──────────────┘ └─────────────┘   └────────────────┘",
]));
children.push(emptyLine());
children.push(simpleTable(
  ["액터/시스템", "유형", "상호작용"],
  [
    ["게스트", "주 액터", "지도·대여소·도로·날씨·추천 코스 조회 (비로그인)"],
    ["회원", "주 액터", "게스트 기능 + 주행 기록, 통계, 마이페이지, 커뮤니티 (확장)"],
    ["관리자", "보조 (확장)", "코스·공지·신고 관리"],
    ["Kakao Maps SDK/API", "외부", "지도 타일, 마커, 폴리라인, 장소 검색, (확장) 길찾기"],
    ["서울 열린데이터", "외부", "따릉이 대여소·잔여 대수, 자전거 도로"],
    ["날씨·대기 API", "외부", "기온·강수·풍속·습도·미세먼지 → 라이딩 점수 산출 입력"],
  ],
  [2600, 1600, CONTENT_W - 4200]
));

// 4
children.push(h1("4. 논리 아키텍처 (C4 L2)"));
children.push(h2("4.1 전체 구성도"));
children.push(monoBlock([
  "[ Client — Presentation ]",
  "  React 19 + TypeScript + Vite (SPA)",
  "  Kakao Maps JS SDK",
  "  React Router · TanStack Query · Zustand",
  "  Tailwind CSS + shadcn/ui · Recharts",
  "  PWA (vite-plugin-pwa)",
  "        │  HTTPS / JSON REST",
  "        ▼",
  "[ Backend — Application ]",
  "  FastAPI (본편 기준)  또는  NestJS (학습·대안)",
  "  Auth(JWT) · Stations · Paths · Weather · Courses · Rides",
  "  External API Client · Riding Score Engine · Cache",
  "        │",
  "        ├──────────────► PostgreSQL (+ PostGIS 확장 예정)",
  "        └──────────────► Redis (선택, 캐시·rate limit)",
  "",
  "[ External ]",
  "  Kakao REST/Local · 서울 공공데이터 · 기상/대기 API",
]));

children.push(h2("4.2 계층별 역할"));
children.push(simpleTable(
  ["계층", "역할", "기술"],
  [
    ["Presentation", "화면, 지도 렌더, PWA, 차트", "React, Kakao SDK, Router"],
    ["Client State", "서버 캐시·UI 전역 상태", "TanStack Query, Zustand"],
    ["API Server", "REST, 인증, 비즈니스 로직, 외부 프록시", "FastAPI / NestJS"],
    ["Score Engine", "날씨·대기 → 라이딩 점수(0~100)", "서버 내 규칙 모듈"],
    ["Persistence", "유저·코스·기록·동기화 대여소", "PostgreSQL"],
    ["Cache", "대여소·날씨 TTL 캐시", "Redis 또는 인메모리"],
    ["External", "지도·공공·기상 데이터", "Open API"],
  ],
  [2000, 3600, CONTENT_W - 5600]
));

children.push(h2("4.3 책임 경계 (중요)"));
children.push(simpleTable(
  ["영역", "클라이언트", "서버"],
  [
    ["지도 타일·마커 표시", "Kakao Maps SDK", "대여소/도로/코스 좌표 데이터 제공"],
    ["장소 검색 UI", "검색창·결과 표시", "Kakao Local 프록시(키 보호) 권장"],
    ["따릉이 실시간", "표시·클러스터", "공공 API 호출·캐시·정규화"],
    ["날씨·점수", "카드 UI", "외부 조회 + 점수 산출"],
    ["추천 코스", "목록·상세·경로 하이라이트", "CRUD/조회, GeoJSON 제공"],
    ["JWT 인증(확장)", "토큰 저장·헤더 첨부", "발급·검증·Refresh"],
    ["주행 GPS(확장)", "위치 수집·게이지 UI", "기록 저장·통계 집계"],
  ],
  [2400, 3400, CONTENT_W - 5800]
));
children.push(emptyLine());
children.push(callout(
  "원칙: 브라우저에 넣지 말아야 할 키(서울 공공, 기상, 카카오 REST 등)는 반드시 서버 경유. " +
  "카카오 JavaScript 키는 도메인 제한을 걸고 클라이언트 SDK에 사용한다."
));

// 5
children.push(pageBreak());
children.push(h1("5. 기술 스택"));
children.push(h2("5.1 확정 · 권장 스택 요약"));
children.push(simpleTable(
  ["영역", "선택", "상태"],
  [
    ["프론트엔드", "React + TypeScript + Vite", "권장 확정"],
    ["라우팅", "React Router", "권장"],
    ["서버 상태", "TanStack Query", "권장"],
    ["UI 상태", "Zustand", "권장"],
    ["스타일/UI", "Tailwind CSS + shadcn/ui", "권장"],
    ["지도", "Kakao Maps JS SDK + Local/REST API", "확정"],
    ["차트", "Recharts", "확장 시"],
    ["PWA", "vite-plugin-pwa", "MVP 후반"],
    ["백엔드 (본편)", "FastAPI (Python)", "권장 확정"],
    ["백엔드 (대안/학습)", "NestJS (TypeScript)", "학습 경로"],
    ["DB", "PostgreSQL 16+", "권장"],
    ["공간 DB", "PostGIS", "확장"],
    ["ORM", "SQLAlchemy/SQLModel (FastAPI) · Prisma (Nest)", "권장"],
    ["캐시", "Redis (Upstash 등) 또는 인메모리", "선택→권장"],
    ["인증", "JWT Access + Refresh", "확장 1차"],
    ["FE 배포", "Vercel", "권장"],
    ["BE/DB 배포", "Railway / Render", "권장"],
    ["CI/CD", "GitHub Actions", "권장"],
  ],
  [2400, 4200, CONTENT_W - 6600]
));

children.push(h2("5.2 프론트엔드 상세"));
children.push(bullet("React 19: 메이저 최신 버전. 핵심 hooks 패턴은 18과 동일. 신기능은 필요 시 점진 도입."));
children.push(bullet("Vite: 개발 서버·빌드. CRA 대비 설정 단순·속도 우수."));
children.push(bullet("TypeScript: API 응답 타입·DTO 정합, 리팩터링 안정성."));
children.push(bullet("TanStack Query: 대여소 폴링, 날씨 staleTime, 코스 목록 캐시."));
children.push(bullet("Zustand: 지도 모드 탭, 레이어 토글, 바텀시트 높이 등 클라이언트 UI 상태."));
children.push(bullet("Tailwind + shadcn/ui: 모바일 퍼스트 카드·칩·바텀시트 구현 속도."));

children.push(h2("5.3 백엔드 상세 (본편 FastAPI)"));
children.push(bullet("이미 사용 경험이 있어 MVP 속도에 유리."));
children.push(bullet("Pydantic으로 요청/응답 스키마, 자동 OpenAPI(Swagger) 문서화."));
children.push(bullet("모듈 예: routers(auth, stations, weather, courses, rides), services, core(config, security)."));
children.push(bullet("httpx/aiohttp로 외부 API 비동기 호출 + TTL 캐시."));
children.push(bullet("라이딩 점수는 pure function 모듈로 분리해 단위 테스트 용이하게 유지."));

children.push(h2("5.4 데이터·인프라"));
children.push(bullet("PostgreSQL: User, Course, Ride, Station snapshot 등 관계 데이터."));
children.push(bullet("GeoJSON: 자전거 도로·코스 경로. MVP는 JSON/JSONB 컬럼 또는 정적 파일 + API 제공."));
children.push(bullet("PostGIS: 주변 검색·공간 인덱스가 필요해지는 확장 단계에서 도입."));
children.push(bullet("Redis: 따릉이 실시간(1~2분), 날씨(10~30분) 캐시. 없으면 프로세스 메모리 캐시로 대체 가능."));

// 6
children.push(h1("6. 컴포넌트 상세 설계"));
children.push(h2("6.1 Web Client 모듈"));
children.push(simpleTable(
  ["모듈", "책임", "주요 화면"],
  [
    ["app / router", "라우팅, 레이아웃, 하단 탭", "전체"],
    ["map", "Kakao Map 초기화, 레이어, 마커, 폴리라인", "홈, 길찾기, 주행"],
    ["weather", "날씨 카드, 라이딩 점수 표시", "홈 바텀시트"],
    ["courses", "추천 코스 목록·상세", "홈, 코스 상세"],
    ["auth (확장)", "로그인·가입·토큰", "스플래시, login, signup"],
    ["riding (확장)", "GPS 추적, 속도 게이지, 알림", "주행"],
    ["mypage (확장)", "프로필, 통계, 설정", "마이페이지"],
    ["shared/ui", "버튼, 시트, 칩, 로딩·에러", "공통"],
  ],
  [2200, 4000, CONTENT_W - 6200]
));

children.push(h2("6.2 API Server 모듈"));
children.push(simpleTable(
  ["모듈", "책임", "단계"],
  [
    ["stations", "대여소 동기화·조회, 정규화 DTO", "MVP"],
    ["bike_paths", "자전거 도로 Geo 데이터 제공", "MVP"],
    ["weather", "날씨·대기 조회 프록시 + 점수 산출", "MVP"],
    ["courses", "추천 코스 목록·상세", "MVP"],
    ["auth", "회원가입·로그인·JWT", "확장"],
    ["routes", "길찾기 요청 중계/보정", "확장"],
    ["rides", "주행 기록 저장·통계", "확장"],
    ["users", "마이페이지 프로필", "확장"],
    ["community", "게시판·후기", "확장 후반"],
  ],
  [2200, 4200, CONTENT_W - 6400]
));

children.push(h2("6.3 지도(Kakao) 연동 설계"));
children.push(simpleTable(
  ["기능", "사용 수단", "비고"],
  [
    ["지도 표시", "Kakao Maps JS SDK", "JS 키 + 도메인 제한"],
    ["대여소 마커", "SDK CustomOverlay / Marker + 클러스터", "서버에서 좌표·잔여 대수 수신"],
    ["자전거 도로", "Polyline 또는 데이터 레이어", "등급별 색상(녹/황 등)"],
    ["코스 경로", "Polyline", "코스 GeoJSON 좌표"],
    ["현재 위치", "Geolocation API + SDK setCenter", "권한 거부 시 서울 시청 등 기본 좌표"],
    ["장소 검색", "Kakao Local API", "서버 프록시 권장"],
    ["길찾기", "Kakao Mobility/Directions 또는 자체", "확장. 자전거 모드 제약 검토 필요"],
  ],
  [2200, 3600, CONTENT_W - 5800]
));

// 7
children.push(pageBreak());
children.push(h1("7. 데이터 아키텍처"));
children.push(h2("7.1 논리 데이터 저장소"));
children.push(simpleTable(
  ["저장소", "저장 대상", "비고"],
  [
    ["PostgreSQL", "User, Course, Ride, SavedCourse, Station cache", "주 저장소"],
    ["JSONB / GeoJSON 파일", "도로·코스 geometry", "MVP 단순 운영"],
    ["Redis (선택)", "stations:*, weather:* 키", "TTL 기반"],
    ["브라우저", "JWT(확장), 테마, 최근 검색", "민감정보는 httpOnly 검토"],
  ],
  [2600, 4200, CONTENT_W - 6800]
));

children.push(h2("7.2 핵심 엔티티 (요약)"));
children.push(p("상세 ERD는 개발문서 DB 섹션을 따른다. 아키텍처 관점 요약만 기술한다.", { size: 19, color: GRAY }));
children.push(simpleTable(
  ["엔티티", "핵심 필드", "비고"],
  [
    ["User", "id, email, password_hash, skill_level, grade, total_distance_km", "확장"],
    ["BikeStation", "station_id, name, lat, lng, bike_count, updated_at", "공공 동기화"],
    ["BikePath", "path_id, name, grade, geojson, is_disconnected", "MVP 조회"],
    ["Course", "title, distance_km, duration_min, difficulty, tags, rating, geojson", "MVP"],
    ["Ride", "user_id, course_id?, metrics, path_geojson, started_at/ended_at", "확장"],
    ["SavedCourse", "user_id, course_id", "확장"],
  ],
  [2200, 5200, CONTENT_W - 7400]
));

children.push(h2("7.3 캐시 정책 (초안)"));
children.push(simpleTable(
  ["데이터", "TTL", "무효화/비고"],
  [
    ["따릉이 대여소 실시간", "60~120초", "주기 폴링 또는 요청 시 refresh"],
    ["자전거 도로", "24시간~정적", "데이터 갱신 시 배포/수동 갱신"],
    ["날씨·미세먼지", "10~30분", "좌표 그리드 단위 키 권장"],
    ["라이딩 점수", "날씨와 동일", "서버에서 날씨 응답과 함께 계산"],
    ["추천 코스 목록", "5~60분 또는 DB 직조회", "초기 데이터량 적으면 캐시 불필요"],
  ],
  [2800, 2200, CONTENT_W - 5000]
));

// 8
children.push(h1("8. API 설계 개요"));
children.push(h2("8.1 공통 규칙"));
children.push(bullet("Base URL: /api  (예: https://api.example.com/api)"));
children.push(bullet("형식: JSON, UTF-8"));
children.push(bullet("인증: Authorization: Bearer <access_token>  (Y 표시 엔드포인트)"));
children.push(bullet("에러: { \"code\": \"...\", \"message\": \"...\" } 형태 통일 권장"));
children.push(bullet("버전: MVP는 /api 단일. 필요 시 /api/v1 로 승격"));

children.push(h2("8.2 엔드포인트 목록"));
children.push(simpleTable(
  ["Method", "Path", "설명", "인증", "단계"],
  [
    ["POST", "/api/auth/signup", "회원가입", "N", "확장"],
    ["POST", "/api/auth/login", "로그인·JWT 발급", "N", "확장"],
    ["POST", "/api/auth/refresh", "토큰 갱신", "Y*", "확장"],
    ["GET", "/api/stations", "따릉이 대여소 목록", "N", "MVP"],
    ["GET", "/api/stations/{id}", "대여소 상세", "N", "MVP"],
    ["GET", "/api/bike-paths", "자전거 도로 Geo", "N", "MVP"],
    ["GET", "/api/weather", "날씨·미세먼지·점수", "N", "MVP"],
    ["GET", "/api/courses", "추천 코스 목록", "N", "MVP"],
    ["GET", "/api/courses/{id}", "코스 상세", "N", "MVP"],
    ["POST", "/api/routes/search", "길찾기", "N/Y", "확장"],
    ["POST", "/api/rides", "주행 기록 저장", "Y", "확장"],
    ["GET", "/api/rides", "내 주행 목록", "Y", "확장"],
    ["GET", "/api/rides/stats", "주간/월간 통계", "Y", "확장"],
    ["GET", "/api/users/me", "마이페이지 프로필", "Y", "확장"],
  ],
  [1200, 2600, 2800, 1000, CONTENT_W - 7600]
));

children.push(h2("8.3 주요 쿼리 파라미터 예시"));
children.push(simpleTable(
  ["API", "파라미터", "설명"],
  [
    ["GET /weather", "lat, lng", "현재 위치 기준 조회. 없으면 서울 기본 좌표"],
    ["GET /courses", "difficulty, sort, limit", "난이도 필터, 거리/평점 정렬"],
    ["GET /stations", "bbox 또는 lat,lng,radius", "지도 영역 또는 반경 필터 (선택)"],
    ["POST /routes/search", "origin, destination, mode, ride_type", "좌표/장소, 경치·스피드 등, 개인/따릉이"],
  ],
  [2600, 3200, CONTENT_W - 5800]
));

// 9
children.push(pageBreak());
children.push(h1("9. 주요 시퀀스 (데이터 흐름)"));
children.push(h2("9.1 홈 진입 — 지도 + 대여소 + 도로 (MVP)"));
children.push(monoBlock([
  "User → Web: /home 진입",
  "Web → Kakao SDK: 지도 초기화 (중심=내 위치 or 서울)",
  "Web → API: GET /api/stations",
  "API → Redis?: cache hit? 있으면 반환",
  "API → 서울 공공 API: 대여소 조회 (miss 시)",
  "API → Redis: TTL 저장 후 Web 응답",
  "Web → Kakao SDK: 마커/클러스터 렌더",
  "Web → API: GET /api/bike-paths",
  "API → DB/File: GeoJSON 로드 → Web",
  "Web → Kakao SDK: 도로 폴리라인 표시",
]));

children.push(h2("9.2 날씨 · 라이딩 점수 (MVP)"));
children.push(monoBlock([
  "User → Web: 바텀시트 확장",
  "Web → API: GET /api/weather?lat=&lng=",
  "API → Cache: weather:{grid} 조회",
  "API → 기상/대기 API: 현재 기상·미세먼지 (miss 시)",
  "API → ScoreEngine: score=f(temp, rain, wind, humidity, pm)",
  "API → Web: { weather, air, score, message }",
  "Web: 카드·점수·문구 렌더 후 추천 코스 섹션 노출",
]));

children.push(h2("9.3 추천 코스 조회 (MVP)"));
children.push(monoBlock([
  "Web → API: GET /api/courses",
  "API → DB: courses 조회 (difficulty 등 필터)",
  "API → Web: 목록 DTO",
  "User → Web: 코스 카드 선택",
  "Web → API: GET /api/courses/{id}",
  "Web → Kakao SDK: 경로 폴리라인 하이라이트",
]));

children.push(h2("9.4 로그인 · 주행 기록 저장 (확장)"));
children.push(monoBlock([
  "User → Web: 로그인",
  "Web → API: POST /api/auth/login",
  "API → DB: 검증 후 Access/Refresh JWT 발급",
  "Web: 토큰 저장, 인증 헤더 설정",
  "... 주행 중 GPS는 클라이언트에서 집계 ...",
  "Web → API: POST /api/rides (Bearer)",
  "API → Guard: JWT 검증",
  "API → DB: ride insert, user.total_distance 갱신",
]));

// 10
children.push(h1("10. 외부 시스템 연동"));
children.push(simpleTable(
  ["시스템", "용도", "호출 주체", "비고"],
  [
    ["Kakao Maps JS SDK", "지도 UI", "Client", "JavaScript 키, 도메인 제한"],
    ["Kakao Local/REST", "지오코딩·키워드 검색", "Server 권장", "REST 키 보호"],
    ["Kakao 길찾기(확장)", "자전거/자동차 경로", "Server", "자전거 모드 제약 확인"],
    ["서울 열린데이터 — 따릉이", "대여소·잔여", "Server", "인증키, 호출 한도, 캐시"],
    ["서울 — 자전거도로", "도로 선형", "Server/배치", "초기 적재 후 정적 제공 가능"],
    ["기상청 또는 OpenWeather", "기온·강수·풍속 등", "Server", "좌표 격자 변환 주의"],
    ["에어코리아", "미세먼지 등급", "Server", "측정소/좌표 매핑"],
  ],
  [2800, 2200, 1600, CONTENT_W - 6600]
));
children.push(emptyLine());
children.push(callout(
  "연동 실패 시: 부분 장애를 허용한다. 예) 날씨 API 실패 → 점수 영역 폴백 메시지, 지도·코스는 정상. " +
  "대여소 API 실패 → 마지막 캐시 또는 재시도 CTA."
));

// 11
children.push(h1("11. 보안 · 인증"));
children.push(h2("11.1 MVP"));
children.push(bullet("게스트 이용 가능 기능이 중심 → 인증 없이도 지도·코스·날씨 조회."));
children.push(bullet("모든 시크릿은 서버 환경변수. Git에 커밋 금지 (.env, .gitignore)."));
children.push(bullet("HTTPS 배포. CORS는 프론트 배포 도메인만 allow."));
children.push(bullet("입력 검증: 쿼리 lat/lng 범위, pagination limit 상한."));

children.push(h2("11.2 확장 — JWT"));
children.push(bullet("비밀번호: bcrypt 또는 argon2 해시 저장."));
children.push(bullet("Access Token 단기 + Refresh Token 장기."));
children.push(bullet("보호 API는 Guard/Dependency로 user_id 주입."));
children.push(bullet("XSS 대비: 토큰을 localStorage에 둘 경우 위험 인지. 가능하면 httpOnly Secure Cookie 검토."));
children.push(bullet("향후 카카오 로그인 연동 시 소셜 OAuth 추가 가능 (UX 일관성)."));

children.push(h2("11.3 키 종류 정리"));
children.push(simpleTable(
  ["키", "위치", "비고"],
  [
    ["Kakao JavaScript 키", "Client (Vite env)", "도메인 제한 필수"],
    ["Kakao REST 키", "Server only", "Local/Directions"],
    ["서울 공공데이터 키", "Server only", ""],
    ["기상/대기 API 키", "Server only", ""],
    ["JWT Secret", "Server only", "충분히 긴 랜덤 값"],
    ["DB URL", "Server only", ""],
  ],
  [2800, 2400, CONTENT_W - 5200]
));

// 12
children.push(pageBreak());
children.push(h1("12. 배포 · 인프라 · 환경 구성"));
children.push(h2("12.1 배포 토폴로지"));
children.push(monoBlock([
  "GitHub Repository",
  "   │ push / PR",
  "   ▼",
  "GitHub Actions (lint → test → build)",
  "   │                    │",
  "   ▼                    ▼",
  "Vercel (Web SPA/PWA)   Railway/Render (API + PostgreSQL)",
  "   │                    │",
  "   └──── HTTPS API ─────┘",
  "        (선택) Upstash Redis",
]));

children.push(h2("12.2 환경 분리"));
children.push(simpleTable(
  ["환경", "용도", "비고"],
  [
    ["local", "개발자 로컬", "docker compose 또는 로컬 Postgres 선택"],
    ["preview", "PR 미리보기", "Vercel Preview + 스테이징 API (선택)"],
    ["production", "실서비스", "도메인, 모니터링, 키 분리"],
  ],
  [2200, 2800, CONTENT_W - 5000]
));

children.push(h2("12.3 환경 변수 (예시)"));
children.push(h3("Web (VITE_*)"));
children.push(bullet("VITE_API_BASE_URL"));
children.push(bullet("VITE_KAKAO_JS_KEY"));
children.push(h3("API"));
children.push(bullet("DATABASE_URL"));
children.push(bullet("JWT_SECRET / JWT_ACCESS_EXPIRE / JWT_REFRESH_EXPIRE"));
children.push(bullet("KAKAO_REST_KEY"));
children.push(bullet("SEOUL_OPENAPI_KEY"));
children.push(bullet("WEATHER_API_KEY / AIR_API_KEY"));
children.push(bullet("REDIS_URL (선택)"));
children.push(bullet("CORS_ORIGINS"));
children.push(bullet("DEFAULT_LAT / DEFAULT_LNG (서울 기본 좌표)"));

children.push(h2("12.4 관측 가능성 (Observability)"));
children.push(bullet("에러 추적: Sentry (FE/BE) 권장"));
children.push(bullet("기본 헬스체크: GET /api/health"));
children.push(bullet("외부 API 실패율 로그 (구조화 로그 JSON)"));

// 13
children.push(h1("13. 비기능 요구사항 (NFR)"));
children.push(simpleTable(
  ["ID", "항목", "목표 (MVP)"],
  [
    ["NFR-01", "초기 로딩", "홈 지도 골격 3초 내 표시 (일반 모바일망 기준 목표)"],
    ["NFR-02", "API 응답", "캐시 hit 시 대여소/날씨 300ms급 (인프라 의존)"],
    ["NFR-03", "가용성", "외부 API 장애 시 핵심 지도·코스 기능 부분 동작"],
    ["NFR-04", "보안", "시크릿 비노출, HTTPS, CORS 제한"],
    ["NFR-05", "호환", "최신 Chrome/Safari 모바일, 반응형 레이아웃"],
    ["NFR-06", "확장성", "회원·기록 추가 시 모듈 추가로 수용"],
    ["NFR-07", "유지보수", "OpenAPI 문서, 환경 기반 설정, 도메인 모듈 구조"],
  ],
  [1400, 2200, CONTENT_W - 3600]
));

// 14
children.push(h1("14. 단계별 아키텍처 로드맵"));
children.push(simpleTable(
  ["Phase", "범위", "아키텍처 상태"],
  [
    ["0. Scaffold", "모노레포 또는 fe/be 분리, CI 뼈대", "빈 API + 빈 맵 페이지"],
    ["1. MVP", "지도·대여소·도로·날씨·점수·코스·반응형", "단일 FastAPI + Postgres + Kakao"],
    ["2. PWA", "설치 가능, 기본 오프라인 셸", "vite-plugin-pwa"],
    ["3. 확장 인증", "JWT, 마이페이지 골격", "Auth 모듈, 보호 라우트"],
    ["4. 주행·통계", "GPS 기록, Recharts", "rides 테이블, 집계 API"],
    ["5. 길찾기", "출발·도착·모드", "Kakao/자체 라우팅 + 단절 도로 로직"],
    ["6. 고도화", "PostGIS, Redis 본격, 커뮤니티, 앱", "공간 인덱스, Capacitor 등"],
  ],
  [2000, 3600, CONTENT_W - 5600]
));

// 15
children.push(pageBreak());
children.push(h1("15. 백엔드 이중 경로 (FastAPI / NestJS)"));
children.push(callout(
  "본 프로젝트 본편 구현 기준은 FastAPI이다. NestJS는 학습·포트폴리오 확장 또는 팀 TS 통일 시 대안으로 둔다. " +
  "두 경로 모두 동일한 API 계약(8장)을 따르면 프론트엔드는 교체 가능하다."
));
children.push(h2("15.1 비교"));
children.push(simpleTable(
  ["항목", "FastAPI (본편)", "NestJS (대안/학습)"],
  [
    ["언어", "Python", "TypeScript"],
    ["강점", "개발 속도, 경험 보유, 데이터/알고리즘 확장", "모듈·DI 구조, FE와 언어 통일, Spring식 설계 학습"],
    ["검증/문서", "Pydantic + Swagger 자동", "DTO + class-validator + Swagger 모듈"],
    ["ORM", "SQLAlchemy / SQLModel", "Prisma / TypeORM"],
    ["적합 시점", "MVP 일정 우선", "구조 학습·TS 풀스택 실험"],
  ],
  [2000, 3600, CONTENT_W - 5600]
));
children.push(h2("15.2 학습 전략 (권장)"));
children.push(bullet("1순위: FastAPI로 MVP API 완성."));
children.push(bullet("2순위: 동일 스펙으로 NestJS에 courses + auth 미니 구현 (비교 학습)."));
children.push(bullet("프론트는 baseURL만 바꿔 스모크 테스트 가능하도록 API 계약 유지."));

// 16
children.push(h1("16. 리스크 및 의사결정 기록"));
children.push(h2("16.1 리스크"));
children.push(simpleTable(
  ["리스크", "영향", "완화"],
  [
    ["공공 API 호출 한도·장애", "대여소 정보 공백", "TTL 캐시, 스태일 데이터 표시, 재시도 UI"],
    ["카카오 자전거 길찾기 제약", "경로 품질 저하", "확장 시 OSRM/자체 보정, 도로 네트워크 데이터 검토"],
    ["대량 마커 성능", "지도 버벅임", "클러스터링, bbox 조회, 줌 레벨별 표시"],
    ["GeoJSON 용량", "초기 로딩 지연", "타일/분할 로딩, 간소화 geometry"],
    ["API 키 노출", "과금·남용", "서버 프록시, 도메인 제한, 환경변수"],
    ["범위 과다 (실시간·커뮤니티)", "MVP 지연", "Phase 분리, 게스트 MVP 우선"],
  ],
  [2800, 2200, CONTENT_W - 5000]
));

children.push(h2("16.2 주요 의사결정 (ADR 요약)"));
children.push(simpleTable(
  ["ID", "결정", "이유"],
  [
    ["ADR-01", "지도 = Kakao", "국내 지도·로컬 검색 적합, 요구사항 확정"],
    ["ADR-02", "FE = React + Vite + TS", "생태계, PWA, 앱 확장, 자료 풍부"],
    ["ADR-03", "BE 본편 = FastAPI", "팀 경험, MVP 속도"],
    ["ADR-04", "NestJS는 학습 경로", "구조·DI 학습, API 계약 공유"],
    ["ADR-05", "외부 API는 서버 프록시", "키 보호, CORS, 캐시·점수 일원화"],
    ["ADR-06", "DB = PostgreSQL", "관계형 + 향후 PostGIS"],
    ["ADR-07", "MVP 인증 생략 가능", "게스트 핵심 가치 우선, JWT는 확장"],
    ["ADR-08", "배포 = Vercel + Railway/Render", "초기 운영 부담 최소화"],
  ],
  [1200, 3200, CONTENT_W - 4400]
));

// 17
children.push(h1("17. 부록 — 디렉터리 구조 예시"));
children.push(h2("17.1 리포지토리 (분리형)"));
children.push(monoBlock([
  "ddareung_ddara/",
  "├─ frontend/                 # React + Vite + TS",
  "│  ├─ src/",
  "│  │  ├─ app/                # router, providers",
  "│  │  ├─ features/",
  "│  │  │  ├─ map/",
  "│  │  │  ├─ weather/",
  "│  │  │  ├─ courses/",
  "│  │  │  ├─ auth/",
  "│  │  │  └─ riding/",
  "│  │  ├─ shared/             # ui, lib, types",
  "│  │  └─ main.tsx",
  "│  └─ package.json",
  "├─ backend/                  # FastAPI",
  "│  ├─ app/",
  "│  │  ├─ api/                # routers",
  "│  │  ├─ core/               # config, security",
  "│  │  ├─ models/",
  "│  │  ├─ schemas/",
  "│  │  ├─ services/           # external clients, score",
  "│  │  └─ main.py",
  "│  ├─ tests/",
  "│  └─ requirements.txt",
  "├─ data/geojson/              # 도로 등 정적 데이터",
  "├─ docs/                     # 아키텍처·개발 문서",
  "└─ README.md",
]));

children.push(h2("17.2 NestJS 대안 시 backend 스케치"));
children.push(monoBlock([
  "backend-nest/src/",
  "├─ main.ts",
  "├─ app.module.ts",
  "├─ config/",
  "├─ common/                   # filters, guards, interceptors",
  "├─ auth/",
  "├─ stations/",
  "├─ weather/",
  "├─ courses/",
  "├─ rides/",
  "└─ prisma/                   # schema.prisma",
]));

children.push(emptyLine());
children.push(h1("변경 이력"));
children.push(simpleTable(
  ["버전", "일자", "내용"],
  [
    ["v1.0", "2026-08-04", "최초 작성. Kakao 지도 확정, FastAPI 본편·NestJS 학습 경로, MVP/확장 아키텍처 정의"],
  ],
  [1400, 2200, CONTENT_W - 3600]
));

children.push(emptyLine());
children.push(callout(
  "다음 작업 제안: (1) 본 문서를 개발문서 4·7장과 동기화 (2) OpenAPI 초안 YAML 작성 " +
  "(3) frontend/backend 스캐폴딩 (4) Kakao 지도 스파이크 (지도 1장 + 마커)."
));

// ─── build document ────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Malgun Gothic", size: 20 }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Malgun Gothic", color: BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Malgun Gothic", color: "2D3748" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Malgun Gothic", color: "4A5568" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "bullets2",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: A4_W, height: A4_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "따릉따라  ", bold: true, size: 16, font: "Malgun Gothic", color: BLUE }),
            new TextRun({ text: "시스템 아키텍처 설계서 v1.0", size: 16, font: "Malgun Gothic", color: GRAY }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 6 } },
          spacing: { before: 80 },
          children: [
            new TextRun({ text: "Confidential · Ddareung Ddara  ·  ", size: 14, font: "Malgun Gothic", color: GRAY }),
            new TextRun({ text: "Page ", size: 14, font: "Malgun Gothic", color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], size: 14, font: "Malgun Gothic", color: GRAY }),
            new TextRun({ text: " / ", size: 14, font: "Malgun Gothic", color: GRAY }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, font: "Malgun Gothic", color: GRAY }),
          ]
        })]
      })
    },
    children
  }]
});

const outPath = path.join(__dirname, "따릉따라_시스템아키텍처_v1.0.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log("Created:", outPath);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

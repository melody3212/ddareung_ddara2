const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
        ImageRun, VerticalAlign } = require('docx');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SCREEN_DIR = path.join(ROOT, '화면설계서');

// ─── helpers ───────────────────────────────────────────────
const A4_W = 11906;
const A4_H = 16838;
const MARGIN = 850;
const CONTENT_W = A4_W - MARGIN * 2; // ~10206

const thin = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const BLUE = "2B6CB0";
const LIGHT_BLUE = "EBF4FF";
const HEADER_BG = "2B6CB0";
const ALT_BG = "F7FAFC";
const GREEN = "276749";
const ORANGE = "C05621";

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

function bullet2(text, ref = "bullets2") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 40, line: 276 },
    children: [new TextRun({ text, size: 19, font: "Malgun Gothic", color: "2D3748" })]
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
    size = 18, color = "1A202C", vAlign = VerticalAlign.CENTER
  } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    verticalAlign: vAlign,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: 0, line: 240 },
        children: [new TextRun({ text, bold, size, font: "Malgun Gothic", color: fill === HEADER_BG ? "FFFFFF" : color })]
      })
    ]
  });
}

function multiCell(paragraphs, opts = {}) {
  const { width = 2000, fill, vAlign = VerticalAlign.TOP } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    verticalAlign: vAlign,
    children: paragraphs
  });
}

function headerRow(labels, widths) {
  return new TableRow({
    children: labels.map((label, i) =>
      cell(label, { width: widths[i], bold: true, fill: HEADER_BG, align: AlignmentType.CENTER, size: 17 })
    )
  });
}

function dataRow(values, widths, alt = false) {
  return new TableRow({
    children: values.map((v, i) =>
      cell(String(v), { width: widths[i], fill: alt ? ALT_BG : undefined, size: 17 })
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

function loadImage(filename) {
  const full = path.join(SCREEN_DIR, filename);
  return fs.readFileSync(full);
}

function screenImage(filename, widthPx = 220, heightPx = 420) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        type: "png",
        data: loadImage(filename),
        transformation: { width: widthPx, height: heightPx },
        altText: { title: filename, description: "화면 스크린샷", name: filename }
      })
    ]
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 16, font: "Malgun Gothic", color: "718096", italics: true })]
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function sectionLabel(label, value) {
  return new Paragraph({
    spacing: { after: 40, line: 260 },
    children: [
      new TextRun({ text: label + "  ", bold: true, size: 19, font: "Malgun Gothic", color: BLUE }),
      new TextRun({ text: value, size: 19, font: "Malgun Gothic", color: "1A202C" })
    ]
  });
}

function ucSpecTable(spec) {
  const wLabel = 2200;
  const wValue = CONTENT_W - wLabel;
  const rows = [
    ["유스케이스 이름", spec.name],
    ["유스케이스 ID", spec.id],
    ["관련 요구사항", spec.reqs],
    ["선행 조건", spec.pre],
    ["관련 액터", spec.actors],
    ["이벤트 흐름", spec.flow],
    ["종료 조건", spec.end],
    ["우선 순위", spec.priority],
  ];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [wLabel, wValue],
    rows: rows.map(([label, value], idx) => new TableRow({
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

// ─── screenshots ───────────────────────────────────────────
const shots = {
  splash: "스크린샷 2026-08-04 013657.png",
  signup1: "스크린샷 2026-08-04 013809.png",
  signup2: "스크린샷 2026-08-04 013816.png",
  homeMap: "스크린샷 2026-08-04 013836.png",
  weather: "스크린샷 2026-08-04 013845.png",
  courses: "스크린샷 2026-08-04 013852.png",
  route: "스크린샷 2026-08-04 013917.png",
  riding: "스크린샷 2026-08-04 013945.png",
  mypage: "스크린샷 2026-08-04 014025.png",
};

// ─── document body ─────────────────────────────────────────
const children = [];

// ========== COVER ==========
children.push(emptyLine());
children.push(emptyLine());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 80 },
  children: [new TextRun({ text: "PROJECT DEVELOPMENT DOCUMENT", size: 18, font: "Arial", color: "A0AEC0", bold: true })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: BLUE, space: 8 } },
  children: [new TextRun({ text: "따릉따라", size: 56, font: "Malgun Gothic", bold: true, color: BLUE })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 160, after: 80 },
  children: [new TextRun({ text: "서울 자전거 코스, 이제 따릉따라로 간편하게", size: 22, font: "Malgun Gothic", color: "4A5568" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new TextRun({ text: "한 번에 확인하는 스마트 자전거 라이딩 가이드", size: 20, font: "Malgun Gothic", color: "718096" })]
}));
children.push(emptyLine());
children.push(callout("서울 자전거 유저를 위한 지도 기반 코스 추천 플랫폼을 React 웹앱으로 MVP 개발 → 추후 PWA 및 앱으로 확장하며 기능을 고도화하는 프로젝트"));
children.push(emptyLine());
children.push(emptyLine());

children.push(simpleTable(
  ["항목", "내용"],
  [
    ["문서 버전", "v1.2"],
    ["작성일", "2026-08-04"],
    ["최종 수정", "2026-08-04 (구현 현황 반영: 지도·대여소·도로·날씨·바텀시트)"],
    ["문서 유형", "개발 문서 (요구사항 · 화면설계 · 아키텍처 · DB · 구현현황)"],
    ["서비스명", "따릉따라 (Ddareung Ddara)"],
    ["대상 플랫폼", "React 웹앱 (SPA) → PWA → 앱 확장"],
    ["개발 범위", "MVP 구현 중 + 확장 기능 로드맵"],
    ["저장소", "https://github.com/melody3212/ddareung_ddara2"],
    ["원본 참고", "https://github.com/melody3212/ddareung-ddara"],
  ],
  [2800, CONTENT_W - 2800]
));

children.push(pageBreak());

// ========== TOC ==========
children.push(h1("목차"));
const tocItems = [
  "1. 프로젝트 개요",
  "2. 요구사항 정의서",
  "    2.1 유스케이스 다이어그램",
  "    2.2 유스케이스 명세서",
  "    2.3 기능 명세서",
  "3. 화면설계서",
  "    3.1 메뉴 구조도 (IA)",
  "    3.2 서비스 흐름도",
  "    3.3 화면정의서 (와이어프레임 기반)",
  "4. 시스템 아키텍처",
  "5. 데이터베이스 요구사항 분석서",
  "    5.1 객체 정의서",
  "    5.2 ERD (데이터 관계도)",
  "6. 개발 로드맵",
  "7. 기술 스택 및 배포 전략",
  "8. 구현 현황 (As-Is)",
  "9. 관련 문서 · 변경 이력",
];
tocItems.forEach(t => children.push(p(t, { size: 20, spacing: { after: 100, line: 300 } })));

children.push(pageBreak());

// ========== 1. 프로젝트 개요 ==========
children.push(h1("1. 프로젝트 개요"));

children.push(h2("1.1 서비스 소개"));
children.push(p("따릉따라는 서울 내 자전거 유저들을 위한 위치 기반 서비스입니다. 자전거 도로, 따릉이 대여소, 추천 코스를 시각화하여 보다 쉽고 즐겁게 자전거를 탈 수 있도록 유도하는 플랫폼입니다."));
children.push(emptyLine());
children.push(bullet("타겟 유저: 서울 거주/방문 자전거 라이더 (초급~고급)"));
children.push(bullet("핵심 가치: 지도 기반 시각화 + 날씨/라이딩 점수 + 코스 추천 + 실시간 주행 지원"));
children.push(bullet("차별점: 개인 자전거 / 따릉이 모드 분리, 라이딩 실력 기반 맞춤, 단절 도로 연결 길찾기"));

children.push(h2("1.2 MVP 범위"));
children.push(callout("초점: 지도 기반 시각화 + 날씨/라이딩 점수 + 기본 추천 코스. 모바일 퍼스트 레이아웃·바텀시트 UX. PWA/앱은 확장 단계."));
children.push(emptyLine());
children.push(simpleTable(
  ["구분", "기능", "우선순위"],
  [
    ["MVP", "서울 따릉이 대여소 위치 지도 연동", "상"],
    ["MVP", "서울 자전거 도로 시각화", "상"],
    ["MVP", "거리/난이도 기반 추천 자전거 코스 제공", "상"],
    ["MVP", "날씨·미세먼지·라이딩 점수 표시", "상"],
    ["MVP", "반응형 UI / 모바일 퍼스트 레이아웃", "상"],
    ["확장", "회원가입/로그인 (JWT)", "중"],
    ["확장", "자전거용 길찾기 + 단절 도로 연결", "중"],
    ["확장", "주행 기록 저장 및 통계 시각화", "중"],
    ["확장", "라이딩 스타일 기반 맞춤 추천", "중"],
    ["확장", "유저 커뮤니티 (게시판·후기·공유)", "하"],
    ["확장", "서울 외 지역 확장 / 소셜 연동", "하"],
  ],
  [1600, 6200, 2406]
));

children.push(h2("1.3 한 줄 요약"));
children.push(callout("서울 자전거 유저를 위한 지도 기반 코스 추천 플랫폼을 React 웹앱으로 MVP 개발 → 추후 PWA 및 앱으로 확장하며 기능을 고도화하는 프로젝트!"));

children.push(pageBreak());

// ========== 2. 요구사항 정의서 ==========
children.push(h1("2. 요구사항 정의서"));
children.push(p("개발할 서비스가 무엇인지 기능과 목적을 정리한 기초 문서입니다. 모든 팀원이 제품에 대해 동일한 이해를 공유하기 위한 문서입니다.", { color: "4A5568" }));

children.push(h2("2.1 유스케이스 다이어그램"));
children.push(p("사용자의 주요 행동(Use Case)과 시스템을 연결해 기능 요구사항을 한눈에 파악합니다."));
children.push(emptyLine());

children.push(h3("액터 정의"));
children.push(simpleTable(
  ["액터", "유형", "설명"],
  [
    ["게스트", "주 액터", "비로그인 사용자. 지도·코스·날씨 조회 가능"],
    ["회원", "주 액터", "로그인 사용자. 기록 저장, 마이페이지, 커뮤니티 이용"],
    ["관리자", "보조 액터", "코스·공지·신고 콘텐츠 관리 (확장 단계)"],
    ["서울시 공공데이터 API", "외부 시스템", "따릉이 대여소, 자전거 도로 데이터 제공"],
    ["지도 API (Kakao/Leaflet)", "외부 시스템", "지도 타일, 마커, 경로 폴리라인 렌더링"],
    ["날씨/대기 API", "외부 시스템", "기온, 강수확률, 습도, 풍속, 미세먼지 제공"],
  ],
  [2400, 1800, CONTENT_W - 4200]
));

children.push(h3("유스케이스 목록"));
children.push(simpleTable(
  ["ID", "유스케이스", "주 액터", "단계"],
  [
    ["DDR_001", "스플래시/온보딩 진입", "게스트", "MVP"],
    ["DDR_002", "회원가입", "게스트", "확장"],
    ["DDR_003", "로그인", "게스트", "확장"],
    ["DDR_004", "지도 조회 (대여소·도로)", "게스트/회원", "MVP"],
    ["DDR_005", "레이어 필터 토글", "게스트/회원", "MVP"],
    ["DDR_006", "날씨·라이딩 점수 확인", "게스트/회원", "MVP"],
    ["DDR_007", "추천 코스 목록 조회", "게스트/회원", "MVP"],
    ["DDR_008", "코스 상세 조회", "게스트/회원", "MVP"],
    ["DDR_009", "길찾기 (경로 검색)", "게스트/회원", "확장"],
    ["DDR_010", "실시간 주행 모니터링", "회원", "확장"],
    ["DDR_011", "주행 기록 저장", "회원", "확장"],
    ["DDR_012", "주행 통계 조회", "회원", "확장"],
    ["DDR_013", "마이페이지 관리", "회원", "확장"],
    ["DDR_014", "커뮤니티 이용", "회원", "확장"],
  ],
  [1400, 3200, 2400, CONTENT_W - 7000]
));

children.push(emptyLine());
children.push(h3("유스케이스 관계 요약 (텍스트 다이어그램)"));
children.push(callout(
  "[게스트] ── 스플래시 진입, 회원가입, 로그인, 지도 조회, 날씨 확인, 추천 코스 조회, 길찾기\n" +
  "[회원]   ── (게스트 기능 포함) + 주행 모니터링, 기록 저장, 통계, 마이페이지, 커뮤니티\n" +
  "[외부]   ── 공공데이터(include: 지도 조회), 날씨 API(include: 라이딩 점수), 지도 SDK(include: 지도/길찾기)\n" +
  "include: 로그인 ← 기록 저장, 통계, 마이페이지, 커뮤니티\n" +
  "extend : 길찾기 ← 라이딩 모드 선택 / 주행 ← 전방 위험 알림"
));

children.push(pageBreak());

// ========== 2.2 유스케이스 명세서 ==========
children.push(h2("2.2 유스케이스 명세서"));
children.push(p("핵심 유스케이스를 상세히 기술합니다. 개발 시 세부 동작의 기준이 됩니다."));

const useCases = [
  {
    name: "회원가입",
    id: "DDR_002",
    reqs: "REQ-AUTH-001 이름·이메일·비밀번호로 가입할 수 있어야 한다.\nREQ-AUTH-002 라이딩 실력(초급/중급/고급)을 선택할 수 있어야 한다.\nREQ-AUTH-003 이메일 중복 및 비밀번호 유효성을 검증해야 한다.",
    pre: "사용자가 스플래시 또는 로그인 화면에서 회원가입 진입\n네트워크 연결 상태",
    actors: "주 액터: 게스트\n보조: 인증 서버",
    flow: "1. 사용자가 이름, 이메일, 비밀번호를 입력한다.\n2. 라이딩 실력(초급/중급/고급)을 선택한다.\n3. [가입 완료] 버튼을 누른다.\n4. 시스템은 입력 유효성·이메일 중복을 검증한다.\n5. 성공 시 회원 정보를 저장하고 JWT를 발급한다.\n6. 홈 화면으로 이동한다.\n7. 실패 시 오류 메시지를 표시한다.",
    end: "가입 완료 후 홈 진입 / 유효성 실패 시 폼 유지",
    priority: "중 (확장 1차)"
  },
  {
    name: "지도 조회 (대여소·도로)",
    id: "DDR_004",
    reqs: "REQ-MAP-001 서울 따릉이 대여소 위치를 지도에 표시해야 한다.\nREQ-MAP-002 자전거 도로를 라인으로 시각화해야 한다.\nREQ-MAP-003 개인 자전거 / 따릉이 / 도로 / 길찾기 탭을 제공해야 한다.",
    pre: "앱 홈(/home) 진입\n지도 SDK 및 공공데이터 접근 가능",
    actors: "주 액터: 게스트/회원\n외부: 지도 API, 서울시 공공데이터",
    flow: "1. 홈 진입 시 지도 로딩 상태를 표시한다.\n2. 사용자 위치(또는 서울 중심) 기준으로 지도를 렌더링한다.\n3. 상단 탭(개인/따릉이/도로/길찾기)에 따라 레이어를 전환한다.\n4. 우측 컨트롤로 도로 등급·위험 구간·현재 위치 등을 토글한다.\n5. 대여소 마커 탭 시 상세 정보를 표시한다.",
    end: "지도 렌더 완료 / 로딩 실패 시 재시도 안내",
    priority: "상 (MVP)"
  },
  {
    name: "날씨·라이딩 점수 확인",
    id: "DDR_006",
    reqs: "REQ-WX-001 기온, 체감, 강수확률, 습도, 풍속을 표시해야 한다.\nREQ-WX-002 미세먼지 등급을 표시해야 한다.\nREQ-WX-003 종합 라이딩 점수(0~100)와 메시지를 제공해야 한다.",
    pre: "홈 하단 시트 또는 날씨 패널 열기\n날씨/대기 API 응답 가능",
    actors: "주 액터: 게스트/회원\n외부: 날씨·대기 API",
    flow: "1. 하단 시트를 올리거나 날씨 영역을 탭한다.\n2. 시스템은 현재 위치 기준 날씨·미세먼지를 조회한다.\n3. 기온/체감/강수/습도/풍속/미세먼지를 카드로 표시한다.\n4. 규칙 기반(또는 모델)으로 라이딩 점수를 산출한다.\n5. 점수와 안내 문구(예: 라이딩하기 완벽한 날!)를 표시한다.\n6. 이어서 추천 여가 코스 목록을 노출한다.",
    end: "날씨·점수 표시 완료 / API 오류 시 기본 안내",
    priority: "상 (MVP)"
  },
  {
    name: "추천 코스 목록 조회",
    id: "DDR_007",
    reqs: "REQ-COURSE-001 거리·예상시간·태그·평점이 포함된 코스 목록을 제공해야 한다.\nREQ-COURSE-002 거리/난이도 기반으로 추천해야 한다.\nREQ-COURSE-003 (확장) 라이딩 실력·스타일 기반 맞춤 추천",
    pre: "홈 날씨 시트 확장 또는 코스 메뉴 진입\n코스 DB 또는 목데이터 준비",
    actors: "주 액터: 게스트/회원",
    flow: "1. 추천 여가 코스 섹션을 표시한다.\n2. 각 카드에 코스명, 거리, 소요시간, 해시태그, 평점을 보여준다.\n3. 사용자가 코스를 선택하면 상세(경로 라인, 설명)로 이동한다.\n4. (확장) 회원 실력·선호에 따라 정렬/필터한다.",
    end: "코스 목록 표시 / 상세 진입",
    priority: "상 (MVP)"
  },
  {
    name: "길찾기 (경로 검색)",
    id: "DDR_009",
    reqs: "REQ-ROUTE-001 출발지·도착지를 입력해 자전거 경로를 검색할 수 있어야 한다.\nREQ-ROUTE-002 개인 자전거 / 따릉이 모드를 선택할 수 있어야 한다.\nREQ-ROUTE-003 라이딩 모드(경치/스피드/나이트/칼로리)를 선택 가능해야 한다.\nREQ-ROUTE-004 (확장) 단절된 자전거 도로를 연결하는 경로를 제안해야 한다.",
    pre: "길찾기 화면(/search-route) 진입",
    actors: "주 액터: 게스트/회원\n외부: 지도·경로 API",
    flow: "1. 개인 자전거 또는 따릉이 모드를 선택한다.\n2. 출발지·도착지를 입력(또는 선택)한다.\n3. 필요 시 출발/도착을 서로 바꾼다.\n4. 라이딩 모드(경치/스피드/나이트/칼로리 버닝)를 선택한다.\n5. [경로 검색]을 누른다.\n6. 시스템은 자전거 도로 우선 경로를 계산하고 지도에 표시한다.\n7. 단절 구간이 있으면 연결 대안을 안내한다.",
    end: "경로 결과 표시 / 검색 실패 시 안내",
    priority: "중 (확장)"
  },
  {
    name: "실시간 주행 모니터링",
    id: "DDR_010",
    reqs: "REQ-RIDE-001 현재 속도, 시간, 거리, 평균, 상승고도를 표시해야 한다.\nREQ-RIDE-002 최고속도·심박·칼로리·케이던스 등 확장 지표를 표시할 수 있어야 한다.\nREQ-RIDE-003 전방 급경사·횡단보도 등 위험 알림을 제공해야 한다.",
    pre: "회원 로그인 상태\n주행 시작 또는 /riding 진입\n위치 권한 허용",
    actors: "주 액터: 회원",
    flow: "1. 주행을 시작하면 GPS 기반 추적을 시작한다.\n2. 속도계(원형 게이지)와 타이머를 실시간 갱신한다.\n3. 거리·평균·상승 지표를 갱신한다.\n4. 전방 위험 구간 접근 시 상단 알림 카드를 표시한다.\n5. 사용자가 알림을 닫거나 구간을 통과하면 알림을 제거한다.\n6. 종료 시 기록을 저장할지 확인한다.",
    end: "주행 종료 및 기록 저장 여부 결정",
    priority: "중 (확장)"
  },
  {
    name: "마이페이지 관리",
    id: "DDR_013",
    reqs: "REQ-MY-001 프로필·등급·총 주행거리를 표시해야 한다.\nREQ-MY-002 주행 기록 통계, 자전거 정보, 저장 코스, 알림 설정 메뉴를 제공해야 한다.",
    pre: "회원 로그인\n/mypage 진입",
    actors: "주 액터: 회원",
    flow: "1. 프로필 카드(닉네임, 등급 뱃지, 상위 %, 총 거리)를 표시한다.\n2. 메뉴: 내 주행 기록 통계 / 내 자전거 정보 / 저장한 코스 / 주행 기록 보기 / 알림 설정\n3. 각 메뉴 선택 시 하위 화면으로 이동한다.\n4. 다크모드 토글을 제공한다.",
    end: "메뉴 탐색 완료 또는 하위 화면 진입",
    priority: "중 (확장)"
  },
];

useCases.forEach((uc, i) => {
  children.push(h3(`${i + 1}) ${uc.name} (${uc.id})`));
  children.push(ucSpecTable(uc));
  children.push(emptyLine());
});

children.push(pageBreak());

// ========== 2.3 기능 명세서 ==========
children.push(h2("2.3 기능 명세서"));
children.push(p("세부 기능을 ID 단위로 관리합니다. QA 체크리스트 및 우선순위 개발의 기준이 됩니다."));
children.push(callout("ID 규칙: FR-AD-xxx (비즈니스/데이터), FR-UU-xxx (UI/UX). 번호대: 100 인증, 200 지도, 300 날씨/코스, 400 길찾기·주행, 500 마이페이지·커뮤니티, 600 UI 공통"));
children.push(emptyLine());

children.push(h3("A. 인증 / 회원 (100번대)"));
children.push(simpleTable(
  ["ID", "기능명", "설명", "우선순위"],
  [
    ["FR-AD-100", "회원가입", "이름, 이메일, 비밀번호, 라이딩 실력으로 가입", "중"],
    ["FR-AD-101", "로그인", "이메일/비밀번호 + JWT 발급", "중"],
    ["FR-AD-102", "로그아웃", "토큰 폐기 및 세션 종료", "중"],
    ["FR-AD-103", "라이딩 실력 설정", "초급/중급/고급 선택 및 변경", "중"],
    ["FR-AD-104", "게스트 이용", "비로그인으로 지도·코스·날씨 조회 허용", "상"],
  ],
  [1400, 2000, 5200, 1606]
));

children.push(h3("B. 지도 / 대여소 / 도로 (200번대)"));
children.push(simpleTable(
  ["ID", "기능명", "설명", "우선순위"],
  [
    ["FR-AD-200", "지도 렌더링", "Kakao Maps 또는 Leaflet으로 서울 지도 표시", "상"],
    ["FR-AD-201", "따릉이 대여소 마커", "공공데이터 기반 대여소 위치·잔여 대수 표시", "상"],
    ["FR-AD-202", "자전거 도로 라인", "자전거 도로 GeoJSON/폴리라인 시각화", "상"],
    ["FR-AD-203", "모드 탭 전환", "개인 / 따릉이 / 도로 / 길찾기 탭", "상"],
    ["FR-AD-204", "레이어 컨트롤", "도로 등급(녹/황), 위험, 자전거 아이콘, 내 위치", "상"],
    ["FR-AD-205", "현재 위치 이동", "GPS 기반 지도 중심 이동", "상"],
  ],
  [1400, 2200, 5000, 1606]
));

children.push(h3("C. 날씨 / 추천 코스 (300번대)"));
children.push(simpleTable(
  ["ID", "기능명", "설명", "우선순위"],
  [
    ["FR-AD-300", "날씨 조회", "기온, 체감, 강수확률, 습도, 풍속 표시", "상"],
    ["FR-AD-301", "미세먼지 표시", "등급(좋음 등) 배지 표시", "상"],
    ["FR-AD-302", "라이딩 점수", "날씨·대기 기반 0~100점 및 메시지", "상"],
    ["FR-AD-303", "추천 코스 목록", "거리·시간·태그·평점 카드 리스트", "상"],
    ["FR-AD-304", "코스 상세", "경로 라인, 설명, 시작 버튼", "상"],
    ["FR-AD-305", "맞춤 추천", "실력·스타일 기반 코스 정렬 (확장)", "중"],
  ],
  [1400, 2000, 5200, 1606]
));

children.push(h3("D. 길찾기 / 주행 (400번대)"));
children.push(simpleTable(
  ["ID", "기능명", "설명", "우선순위"],
  [
    ["FR-AD-400", "출발·도착 입력", "장소 검색 및 출발/도착 스왑", "중"],
    ["FR-AD-401", "자전거 유형 선택", "개인 자전거 / 따릉이 모드", "중"],
    ["FR-AD-402", "라이딩 모드", "경치 / 스피드 / 나이트 / 칼로리 버닝", "중"],
    ["FR-AD-403", "경로 검색", "자전거 도로 우선 경로 계산·표시", "중"],
    ["FR-AD-404", "단절 도로 연결", "끊긴 구간 우회·연결 제안 (확장)", "중"],
    ["FR-AD-405", "주행 대시보드", "속도·시간·거리·평균·상승 실시간 표시", "중"],
    ["FR-AD-406", "전방 위험 알림", "급경사·횡단보도 등 접근 알림", "중"],
    ["FR-AD-407", "주행 기록 저장", "날짜, 거리, 시간, 경로 저장", "중"],
    ["FR-AD-408", "통계 시각화", "주간/월간 차트 (Chart.js/Recharts)", "중"],
  ],
  [1400, 2200, 5000, 1606]
));

children.push(h3("E. 마이페이지 / 커뮤니티 (500번대)"));
children.push(simpleTable(
  ["ID", "기능명", "설명", "우선순위"],
  [
    ["FR-AD-500", "프로필 카드", "닉네임, 등급, 상위%, 총 주행거리", "중"],
    ["FR-AD-501", "내 자전거 정보", "자전거 스펙 등록·수정", "하"],
    ["FR-AD-502", "저장한 코스", "즐겨찾기 코스 목록", "중"],
    ["FR-AD-503", "알림 설정", "푸시/위험 알림 on·off", "하"],
    ["FR-AD-510", "커뮤니티 게시판", "후기·추천 공유 (확장)", "하"],
    ["FR-AD-511", "친구·공유", "소셜 연동 (확장)", "하"],
  ],
  [1400, 2200, 5000, 1606]
));

children.push(h3("F. UI/UX 공통 (600번대)"));
children.push(simpleTable(
  ["ID", "기능명", "설명", "우선순위"],
  [
    ["FR-UU-600", "하단 탭 네비게이션", "홈 / 주행 / 커뮤니티 / 마이페이지", "상"],
    ["FR-UU-601", "스플래시 화면", "로고, 슬로건, 시작하기·로그인", "상"],
    ["FR-UU-602", "하단 바텀시트", "날씨·코스 정보를 드래그로 확장", "상"],
    ["FR-UU-603", "다크모드 토글", "라이트/다크 테마 전환", "하"],
    ["FR-UU-604", "반응형·PWA", "모바일 퍼스트, 홈화면 설치 가능", "상"],
    ["FR-UU-605", "로딩·에러 상태", "지도 로딩, API 실패 안내 UI", "상"],
  ],
  [1400, 2400, 4800, 1606]
));

children.push(pageBreak());

// ========== 3. 화면설계서 ==========
children.push(h1("3. 화면설계서"));
children.push(p("디자이너·개발자에게 화면 구성과 흐름을 명확히 전달하는 UI/UX 설계 문서입니다. 실제 프로토타입 스크린샷을 기준으로 작성했습니다.", { color: "4A5568" }));

children.push(h2("3.1 메뉴 구조도 (IA)"));
children.push(callout(
  "따릉따라\n" +
  "├─ 스플래시 (/) …………… 시작하기 / 로그인 / 다크모드\n" +
  "├─ 회원가입 (/signup) …… 이름·이메일·비밀번호·라이딩 실력\n" +
  "├─ 로그인 (/login)\n" +
  "├─ 홈 (/home) …………… [하단탭: 홈]\n" +
  "│   ├─ 상단 모드 탭: 개인 | 따릉이 | 도로 | 길찾기\n" +
  "│   ├─ 지도 레이어 컨트롤\n" +
  "│   └─ 바텀시트: 날씨 · 라이딩 점수 · 추천 여가 코스\n" +
  "├─ 길찾기 (/search-route)\n" +
  "│   ├─ 개인 자전거 / 따릉이\n" +
  "│   ├─ 출발·도착 입력\n" +
  "│   └─ 라이딩 모드 · 경로 검색\n" +
  "├─ 주행 (/riding) ………… [하단탭: 주행]\n" +
  "│   ├─ 미니맵 · 전방 알림\n" +
  "│   └─ 속도·지표 대시보드\n" +
  "├─ 커뮤니티 (/community) … [하단탭: 커뮤니티] (확장)\n" +
  "└─ 마이페이지 (/mypage) … [하단탭: 마이페이지]\n" +
  "    ├─ 프로필·등급\n" +
  "    ├─ 내 주행 기록 통계\n" +
  "    ├─ 내 자전거 정보\n" +
  "    ├─ 저장한 코스\n" +
  "    ├─ 주행 기록 보기\n" +
  "    └─ 알림 설정"
));

children.push(h2("3.2 서비스 흐름도"));
children.push(h3("A. 진입 · 인증 흐름"));
children.push(callout(
  "시작 → 스플래시\n" +
  "  ├─ [시작하기] → 홈 (게스트)\n" +
  "  └─ [로그인]\n" +
  "        ├─ 기존 회원 → 로그인 폼 → 성공 → 홈\n" +
  "        └─ 신규 → 회원가입 폼 → 실력 선택 → 가입 완료 → 홈"
));
children.push(emptyLine());
children.push(h3("B. 홈 · 코스 · 길찾기 흐름"));
children.push(callout(
  "홈 지도\n" +
  "  ├─ 모드 탭 전환 (개인/따릉이/도로)\n" +
  "  ├─ 바텀시트 확장 → 날씨·점수 확인 → 추천 코스 선택 → 코스 상세 → 주행 시작\n" +
  "  └─ 길찾기 탭/메뉴 → 출발·도착·모드 입력 → 경로 검색 → 경로 결과 → 주행 시작"
));
children.push(emptyLine());
children.push(h3("C. 주행 · 기록 흐름"));
children.push(callout(
  "주행 시작 → GPS 추적 → 실시간 지표 갱신\n" +
  "  ├─ 전방 위험 접근 시 알림 카드 표시\n" +
  "  └─ 주행 종료 → 기록 저장? → Yes: 마이페이지 통계 반영 / No: 홈 복귀"
));

children.push(pageBreak());

// ========== 3.3 화면정의서 ==========
children.push(h2("3.3 화면정의서"));
children.push(p("화면 ID, 주요 UI 요소, 동작, 이동 경로를 정의합니다. 스크린샷은 현재 프로토타입 UI를 기준으로 합니다."));

// SCR-001
children.push(h3("SCR-001 스플래시 / 온보딩  (/)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-001"],
    ["경로", "/"],
    ["목적", "브랜드 인지 및 서비스 진입 유도"],
    ["주요 요소", "로고(핀 아이콘), 서비스명, 슬로건, 시작하기(Primary), 로그인(Outline), 다크모드 토글"],
    ["동작", "시작하기 → /home (게스트) / 로그인 → /login 또는 가입 유도"],
    ["비고", "모바일 카드형 중앙 정렬, 미니멀 화이트 톤"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.splash, 230, 400));
children.push(caption("그림 SCR-001. 스플래시 화면 — 시작하기 / 로그인"));

// SCR-002
children.push(h3("SCR-002 회원가입  (/signup)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-002"],
    ["경로", "/signup"],
    ["목적", "회원 정보 등록 및 라이딩 실력 프로파일링"],
    ["주요 요소", "뒤로가기, 이름/이메일/비밀번호 입력, 비밀번호 표시 토글, 라이딩 실력 선택 카드(초급·중급·고급), 가입 완료"],
    ["실력 옵션", "초급: 평지·한강변 중심 / 중급: 일반 공도·완만 경사 / 고급: 높은 경사·장거리"],
    ["동작", "유효성 통과 시 가입 → JWT 저장 → /home"],
    ["관련 FR", "FR-AD-100, FR-AD-103, FR-UU-601"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.signup1, 230, 400));
children.push(caption("그림 SCR-002-a. 회원가입 상단 — 기본 정보 입력"));
children.push(screenImage(shots.signup2, 230, 400));
children.push(caption("그림 SCR-002-b. 회원가입 하단 — 라이딩 실력 3단계 선택"));

children.push(pageBreak());

// SCR-003
children.push(h3("SCR-003 홈 지도  (/home)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-003"],
    ["경로", "/home"],
    ["목적", "지도 기반 대여소·도로 시각화 및 탐색"],
    ["상단 탭", "개인 | 따릉이 | 도로 | 길찾기"],
    ["우측 컨트롤", "도로 등급(녹/황), 위험(빨강), 자전거 레이어, 내 위치"],
    ["하단", "바텀시트 핸들 + 요약 날씨 + 하단 탭(홈/주행/커뮤니티/마이페이지)"],
    ["상태", "로딩 시 '지도를 불러오는 중...' 스피너"],
    ["관련 FR", "FR-AD-200~205, FR-UU-600, FR-UU-602, FR-UU-605"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.homeMap, 230, 400));
children.push(caption("그림 SCR-003. 홈 지도 — 로딩 및 레이어 컨트롤"));

// SCR-004
children.push(h3("SCR-004 날씨 · 라이딩 점수 패널  (홈 바텀시트)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-004"],
    ["위치", "홈 바텀시트 확장"],
    ["목적", "라이딩 전 날씨·대기 상태 판단 지원"],
    ["표시 정보", "기온, 체감, 강수확률, 습도, 풍속, 미세먼지, 라이딩 점수(0~100)"],
    ["UX", "점수에 따른 이모지·문구 변화 (예: 98점 — 라이딩하기 완벽한 날!)"],
    ["관련 FR", "FR-AD-300~302, FR-UU-602"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.weather, 230, 400));
children.push(caption("그림 SCR-004. 날씨 카드 및 라이딩 점수"));

children.push(pageBreak());

// SCR-005
children.push(h3("SCR-005 추천 여가 코스 목록  (홈 바텀시트)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-005"],
    ["위치", "홈 바텀시트 — 추천 여가 코스 섹션"],
    ["목적", "거리·난이도 기반 코스 탐색"],
    ["카드 구성", "코스명, 거리, 예상 시간, 해시태그, 별점"],
    ["예시 코스", "여의도 샛강 / 반포대교 달빛무지개 / 남산 둘레길 / 한강 종주 등"],
    ["동작", "카드 탭 → 코스 상세 → 지도 경로 하이라이트"],
    ["관련 FR", "FR-AD-303, FR-AD-304"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.courses, 230, 420));
children.push(caption("그림 SCR-005. 추천 여가 코스 리스트"));

// SCR-006
children.push(h3("SCR-006 길찾기  (/search-route)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-006"],
    ["경로", "/search-route"],
    ["목적", "출발·도착 기반 자전거 경로 검색"],
    ["주요 요소", "개인/따릉이 토글, 출발·도착 입력, 스왑 버튼, 라이딩 모드 칩, 경로 검색 CTA"],
    ["라이딩 모드", "경치 모드 / 스피드 모드 / 나이트 모드 / 칼로리 버닝"],
    ["관련 FR", "FR-AD-400~404"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.route, 230, 400));
children.push(caption("그림 SCR-006. 길찾기 — 출발·도착 및 라이딩 모드"));

children.push(pageBreak());

// SCR-007
children.push(h3("SCR-007 주행 대시보드  (/riding)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-007"],
    ["경로", "/riding"],
    ["목적", "실시간 주행 지표 모니터링 및 전방 위험 안내"],
    ["상단", "미니맵, 전방 급경사/횡단보도 알림 카드(닫기 가능)"],
    ["중앙", "원형 속도 게이지 (km/h), 주행 시간"],
    ["지표", "거리 · 평균 · 상승 / 최고 · 심박 · 칼로리 · 케이던스"],
    ["하단 탭", "주행 탭 활성"],
    ["관련 FR", "FR-AD-405, FR-AD-406, FR-UU-600"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.riding, 230, 420));
children.push(caption("그림 SCR-007. 주행 중 대시보드 및 전방 알림"));

// SCR-008
children.push(h3("SCR-008 마이페이지  (/mypage)"));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["화면 ID", "SCR-008"],
    ["경로", "/mypage"],
    ["목적", "개인 프로필·기록·설정 허브"],
    ["프로필", "닉네임, 등급 뱃지(예: 실버 라이더), 상위 %, 총 주행거리"],
    ["메뉴", "내 주행 기록 통계 / 내 자전거 정보 / 저장한 코스 / 주행 기록 보기 / 알림 설정"],
    ["기타", "다크모드 토글"],
    ["관련 FR", "FR-AD-500~503, FR-AD-407, FR-AD-408"],
  ],
  [2000, CONTENT_W - 2000]
));
children.push(screenImage(shots.mypage, 230, 400));
children.push(caption("그림 SCR-008. 마이페이지 메뉴 구조"));

children.push(h3("UI/UX 공통 가이드 (프로토타입 기준)"));
children.push(bullet("컬러: Primary Blue (#3B82F6 계열), 배경 라이트 그레이, 위험 알림 Red/Yellow"));
children.push(bullet("레이아웃: 모바일 퍼스트 카드형, 하단 고정 4탭 네비게이션"));
children.push(bullet("컴포넌트: Rounded pill 버튼, 칩(모드 선택), 바텀시트, 원형 게이지"));
children.push(bullet("인터랙션: 탭 전환, 시트 드래그, 토글, 스와이프 친화적 터치 타겟"));
children.push(bullet("접근성: 대비 확보, 아이콘+텍스트 병기, 로딩/에러 상태 명시"));

children.push(pageBreak());

// ========== 4. 시스템 아키텍처 ==========
// 상세본: 따릉따라_시스템아키텍처_v1.0.docx 와 동기화
children.push(h1("4. 시스템 아키텍처"));
children.push(p("프론트엔드, API, 외부 서비스, DB의 전체 구조와 데이터 흐름을 정의합니다. 상세 설계는 「따릉따라_시스템아키텍처_v1.0」 문서를 기준선으로 합니다."));

children.push(h2("4.1 설계 원칙"));
children.push(bullet("지도: Kakao Maps 단일 제공. 렌더링은 클라이언트, REST 키·공공 API는 서버 프록시."));
children.push(bullet("BFF: 프론트는 자사 /api 만 호출. 외부 키·CORS·캐시·라이딩 점수는 백엔드 책임."));
children.push(bullet("MVP 단순성: 단일 FastAPI 프로세스. 마이크로서비스 분할은 확장 단계에서만 검토."));
children.push(bullet("상태 분리: 서버 상태(TanStack Query) / UI 상태(Zustand)."));
children.push(bullet("점진 고도화: Redis·PostGIS·JWT·길찾기는 Phase에 따라 도입."));

children.push(h2("4.2 논리 구성도"));
children.push(callout(
  "[ Client ] React + TypeScript + Vite (SPA/PWA) · Kakao Maps SDK · TanStack Query · Zustand · Tailwind/shadcn · Recharts"
));
children.push(p("↓ HTTPS / JSON REST", { align: AlignmentType.CENTER, size: 18, color: "4A5568" }));
children.push(callout(
  "[ Backend ] FastAPI 본편 (인증·대여소·도로·날씨·점수·코스·주행) · NestJS는 학습/대안 경로(동일 API 계약)"
));
children.push(p("↓", { align: AlignmentType.CENTER, size: 18, color: "4A5568" }));
children.push(callout(
  "[ Data ] PostgreSQL (+ PostGIS 확장) · GeoJSON(JSONB/파일) · Redis 선택(대여소·날씨 TTL 캐시)"
));
children.push(p("↓", { align: AlignmentType.CENTER, size: 18, color: "4A5568" }));
children.push(callout(
  "[ External ] Kakao Maps · 서울 열린데이터 bikeList(따릉이) · 정적 GeoJSON 자전거도로 · Open-Meteo(날씨·대기질·황사)"
));

children.push(h2("4.3 계층별 역할"));
children.push(simpleTable(
  ["계층", "역할", "기술"],
  [
    ["Presentation", "화면, 지도 렌더, PWA, 차트", "React, Router, Kakao SDK"],
    ["Client State", "서버 캐시·UI 전역 상태", "TanStack Query, Zustand"],
    ["API Server", "REST, 인증, 비즈니스 로직, 외부 프록시", "FastAPI (본편)"],
    ["Score Engine", "날씨·대기 → 라이딩 점수 0~100", "서버 규칙 모듈"],
    ["Persistence", "유저·코스·기록·대여소 스냅샷", "PostgreSQL"],
    ["Cache", "대여소·날씨 TTL", "Redis 또는 인메모리"],
    ["External", "지도·공공·기상 데이터", "Open API"],
  ],
  [2200, 4200, CONTENT_W - 6400]
));

children.push(h2("4.4 책임 경계"));
children.push(simpleTable(
  ["영역", "클라이언트", "서버"],
  [
    ["지도 표시", "Kakao Maps SDK", "—"],
    ["자전거 도로", "정적 GeoJSON 로드·Polyline·유형 색상", "WMS 프록시(선택·레거시)"],
    ["따릉이 실시간", "마커·클러스터·토글", "bikeList 페이징·캐시·정규화"],
    ["날씨·대기·점수", "WeatherPanel·탭 UI", "Open-Meteo 조회 + 점수 엔진"],
    ["추천 코스", "목록 탭·카드", "mock/CRUD 목록 API"],
    ["JWT (확장)", "토큰 보관·헤더", "발급·검증·Refresh"],
  ],
  [2000, 3400, CONTENT_W - 5400]
));

children.push(h2("4.5 주요 API 엔드포인트"));
children.push(simpleTable(
  ["Method", "Path", "설명", "인증", "단계"],
  [
    ["GET", "/api/health", "헬스체크", "N", "구현"],
    ["GET", "/api/stations", "따릉이 대여소 전체(페이징 수집)", "N", "구현"],
    ["GET", "/api/stations/meta", "대여소 출처·건수", "N", "구현"],
    ["GET", "/api/weather", "현재·시간별 날씨·대기·라이딩점수", "N", "구현"],
    ["GET", "/api/courses", "추천 코스 목록", "N", "구현(mock)"],
    ["GET", "/api/courses/{id}", "코스 상세", "N", "구현(mock)"],
    ["GET", "/api/bike-paths", "도로 mock 벡터(폴백)", "N", "구현"],
    ["GET", "/api/bike-paths/meta", "도로 소스 메타", "N", "구현"],
    ["POST", "/api/auth/signup", "회원가입", "N", "확장"],
    ["POST", "/api/auth/login", "로그인·JWT", "N", "확장"],
    ["POST", "/api/routes/search", "길찾기", "N/Y", "확장"],
    ["POST", "/api/rides", "주행 기록 저장", "Y", "확장"],
  ],
  [1100, 2800, 3400, 900, CONTENT_W - 8200]
));

children.push(h2("4.6 배포 아키텍처"));
children.push(bullet("프론트엔드: Vercel (SPA + PWA 정적 배포)"));
children.push(bullet("백엔드: Railway 또는 Render (FastAPI)"));
children.push(bullet("DB: Railway PostgreSQL / Neon / Supabase 등 관리형 Postgres"));
children.push(bullet("캐시(선택): Upstash Redis"));
children.push(bullet("CI/CD: GitHub Actions (lint → test → build → deploy)"));
children.push(bullet("시크릿: Kakao/공공/기상 키, JWT Secret, DATABASE_URL 은 환경변수 (Git 커밋 금지)"));
children.push(bullet("관측: GET /api/health, Sentry 권장"));

children.push(pageBreak());

// ========== 5. DB ==========
children.push(h1("5. 데이터베이스 요구사항 분석서"));

children.push(h2("5.1 객체 정의서"));
children.push(h3("User (회원)"));
children.push(simpleTable(
  ["속성", "타입", "제약", "설명"],
  [
    ["user_id", "UUID/INT", "PK", "회원 고유 ID"],
    ["name", "VARCHAR", "NOT NULL", "이름/닉네임"],
    ["email", "VARCHAR", "UNIQUE, NOT NULL", "로그인 이메일"],
    ["password_hash", "VARCHAR", "NOT NULL", "해시된 비밀번호"],
    ["skill_level", "ENUM", "NOT NULL", "beginner/intermediate/advanced"],
    ["grade", "VARCHAR", "NULL", "등급 뱃지 (브론즈/실버 등)"],
    ["total_distance_km", "DECIMAL", "DEFAULT 0", "누적 주행거리"],
    ["created_at", "DATETIME", "NOT NULL", "가입 일시"],
  ],
  [2400, 2000, 2600, CONTENT_W - 7000]
));

children.push(h3("BikeStation (따릉이 대여소)"));
children.push(simpleTable(
  ["속성", "타입", "제약", "설명"],
  [
    ["station_id", "VARCHAR", "PK", "대여소 ID (공공데이터)"],
    ["name", "VARCHAR", "NOT NULL", "대여소명"],
    ["lat", "DECIMAL", "NOT NULL", "위도"],
    ["lng", "DECIMAL", "NOT NULL", "경도"],
    ["bike_count", "INT", "NULL", "잔여 자전거 수"],
    ["updated_at", "DATETIME", "NULL", "동기화 시각"],
  ],
  [2400, 2000, 2600, CONTENT_W - 7000]
));

children.push(h3("BikePath (자전거 도로)"));
children.push(simpleTable(
  ["속성", "타입", "제약", "설명"],
  [
    ["path_id", "INT", "PK", "도로 세그먼트 ID"],
    ["name", "VARCHAR", "NULL", "구간명"],
    ["grade", "ENUM", "NULL", "easy/normal/hard 또는 색 등급"],
    ["geojson", "JSON/TEXT", "NOT NULL", "라인 좌표"],
    ["is_disconnected", "BOOLEAN", "DEFAULT false", "단절 구간 여부"],
  ],
  [2400, 2000, 2600, CONTENT_W - 7000]
));

children.push(h3("Course (추천 코스)"));
children.push(simpleTable(
  ["속성", "타입", "제약", "설명"],
  [
    ["course_id", "INT", "PK", "코스 ID"],
    ["title", "VARCHAR", "NOT NULL", "코스명"],
    ["distance_km", "DECIMAL", "NOT NULL", "거리"],
    ["duration_min", "INT", "NOT NULL", "예상 소요(분)"],
    ["difficulty", "ENUM", "NOT NULL", "초급/중급/고급"],
    ["tags", "VARCHAR/JSON", "NULL", "해시태그"],
    ["rating", "DECIMAL", "NULL", "평점"],
    ["geojson", "JSON/TEXT", "NULL", "경로 좌표"],
    ["description", "TEXT", "NULL", "설명"],
  ],
  [2400, 2000, 2600, CONTENT_W - 7000]
));

children.push(h3("Ride (주행 기록)"));
children.push(simpleTable(
  ["속성", "타입", "제약", "설명"],
  [
    ["ride_id", "INT", "PK", "기록 ID"],
    ["user_id", "INT", "FK → User", "회원"],
    ["course_id", "INT", "FK NULL", "연결 코스(선택)"],
    ["started_at", "DATETIME", "NOT NULL", "시작"],
    ["ended_at", "DATETIME", "NULL", "종료"],
    ["distance_km", "DECIMAL", "NULL", "거리"],
    ["duration_sec", "INT", "NULL", "시간(초)"],
    ["avg_speed", "DECIMAL", "NULL", "평균 속도"],
    ["max_speed", "DECIMAL", "NULL", "최고 속도"],
    ["elevation_m", "DECIMAL", "NULL", "상승 고도"],
    ["calories", "INT", "NULL", "칼로리"],
    ["path_geojson", "JSON", "NULL", "실제 궤적"],
  ],
  [2400, 2000, 2600, CONTENT_W - 7000]
));

children.push(h3("SavedCourse / BikeProfile / Post (확장)"));
children.push(simpleTable(
  ["객체", "핵심 속성", "설명"],
  [
    ["SavedCourse", "user_id, course_id, created_at", "저장한 코스 (N:M)"],
    ["BikeProfile", "user_id, brand, model, type", "내 자전거 정보"],
    ["Post", "post_id, user_id, title, body, course_id", "커뮤니티 게시글"],
    ["RouteSearchLog", "user_id, origin, dest, mode, result", "길찾기 로그(선택)"],
  ],
  [2400, 4200, CONTENT_W - 6600]
));

children.push(pageBreak());

children.push(h2("5.2 ERD (데이터 관계도)"));
children.push(callout(
  "User 1 ─── * Ride\n" +
  "User 1 ─── * SavedCourse * ─── 1 Course\n" +
  "User 1 ─── 0..1 BikeProfile\n" +
  "User 1 ─── * Post\n" +
  "Course 1 ─── * Ride (optional)\n" +
  "Course 1 ─── * Post (optional)\n" +
  "BikeStation (독립, 공공 동기화)\n" +
  "BikePath (독립, 도로 네트워크)\n\n" +
  "카디널리티: 회원은 여러 주행 기록을 가짐. 코스는 여러 회원에게 저장될 수 있음.\n" +
  "대여소·도로는 마스터 데이터로 유저와 직접 FK 없이 지도 레이어로 소비."
));
children.push(emptyLine());
children.push(p("초기에는 코스·대여소·도로를 목데이터/GeoJSON 파일로 제공하고, 인증·기록 기능 추가 시 User·Ride 테이블부터 RDB에 적재하는 전략을 권장합니다.", { color: "4A5568" }));

children.push(pageBreak());

// ========== 6. 로드맵 ==========
children.push(h1("6. 개발 로드맵"));

children.push(simpleTable(
  ["Step", "단계", "주요 작업", "산출물"],
  [
    ["1", "데이터 조사·기획", "서울 공공데이터 확인, Kakao 지도 스파이크, 코스 목데이터", "데이터 목록, API 키, 목DB"],
    ["2", "MVP 개발", "지도+마커+라인, 추천 코스, 날씨 점수, 반응형 UI, FastAPI", "SCR-001,003~005 구현"],
    ["3", "PWA·안정화", "vite-plugin-pwa, 캐시·에러 폴백, 배포 파이프라인", "설치 가능 웹앱"],
    ["4", "로그인 구현", "FastAPI JWT, 회원가입/로그인 UI", "SCR-002, 인증 API"],
    ["5", "주행 기록", "기록 저장 API, 통계 차트, 주행 대시보드", "SCR-007~008 기록 연동"],
    ["6", "길찾기·커뮤니티", "경로 검색, 단절 도로, 게시판, (학습) Nest 미니 클론", "확장 기능 릴리즈"],
  ],
  [900, 2000, 4600, CONTENT_W - 7500]
));

children.push(h2("6.1 MVP 완료 기준 (Definition of Done)"));
children.push(bullet("서울 영역에서 따릉이 대여소 마커(클러스터)와 자전거 도로 라인이 지도에 표시된다. ✅"));
children.push(bullet("도로 유형(VALUE_03)에 따라 하천/공원형·도로변형 색 구분이 된다. ✅"));
children.push(bullet("바텀시트에 라이딩 점수 + 날씨/추천코스 탭이 동작한다. ✅"));
children.push(bullet("1시간 단위 예보·미세/초미세/황사 정보가 표시된다. ✅"));
children.push(bullet("모바일 폭(max-w-lg) 하단 네비·시트 드래그 스냅이 동작한다. ✅"));
children.push(bullet("스플래시·홈 라우팅이 동작한다. ✅"));
children.push(bullet("(잔여) PWA 설치, 로그인/JWT, 길찾기, 주행 기록 — 확장"));

children.push(h2("6.2 웹 → 앱 전환 전략"));
children.push(simpleTable(
  ["전략", "설명", "시점"],
  [
    ["PWA", "홈화면 설치, 풀스크린, 오프라인 캐시 등 앱처럼 사용", "MVP 직후"],
    ["Capacitor / Ionic", "웹 코드를 감싸 스토어 배포 가능한 하이브리드 앱", "사용자 확보 후"],
    ["React Native", "JS 로직 재사용, 네이티브 성능·센서 활용", "고도화 단계"],
  ],
  [2400, 5200, CONTENT_W - 7600]
));

children.push(pageBreak());

// ========== 7. 기술 스택 ==========
// 시스템아키텍처 v1.0 5·12·13·15장과 동기화
children.push(h1("7. 기술 스택 및 배포 전략"));

children.push(h2("7.1 프론트엔드"));
children.push(simpleTable(
  ["구분", "선택", "비고"],
  [
    ["프레임워크", "React + TypeScript + Vite", "SPA → PWA"],
    ["라우팅", "React Router", ""],
    ["지도", "Kakao Maps JS SDK", "확정 (JS 키 + 도메인 제한)"],
    ["서버 상태", "TanStack Query", "대여소 폴링·날씨 캐시"],
    ["UI 상태", "Zustand", "지도 모드·레이어·바텀시트"],
    ["스타일", "Tailwind CSS + shadcn/ui", "모바일 퍼스트"],
    ["차트", "Recharts", "주행 통계 (확장)"],
    ["PWA", "vite-plugin-pwa", "설치·오프라인 셸"],
  ],
  [2200, 3600, CONTENT_W - 5800]
));

children.push(h2("7.2 백엔드 · 데이터"));
children.push(simpleTable(
  ["구분", "선택", "비고"],
  [
    ["본편 API", "FastAPI (Python)", "MVP·확장 주 서버"],
    ["학습/대안", "NestJS (TypeScript)", "동일 REST 계약, 구조·DI 학습"],
    ["ORM", "SQLAlchemy/SQLModel · (Nest) Prisma", ""],
    ["인증", "JWT Access + Refresh", "확장 1차"],
    ["DB", "PostgreSQL 16+", "운영 표준"],
    ["공간 DB", "PostGIS", "확장 (주변 검색 등)"],
    ["캐시", "Redis (선택) / 인메모리", "대여소 60~120s, 날씨 10~30m"],
    ["API 스타일", "REST + OpenAPI", "/api/*"],
  ],
  [2400, 3600, CONTENT_W - 6000]
));

children.push(h2("7.3 외부 연동 (현재)"));
children.push(simpleTable(
  ["시스템", "용도", "호출 주체", "비고"],
  [
    ["Kakao Maps JS SDK", "지도·마커·폴리라인·클러스터", "Client", "VITE_KAKAO_JS_KEY"],
    ["서울 열린데이터 bikeList", "따릉이 실시간 대여소", "Server", "SEOUL_OPENAPI_KEY, 1000건 페이징"],
    ["bikeload.geojson", "자전거 도로 라인", "Client 정적", "VALUE_03 유형 분류"],
    ["Open-Meteo Weather", "현재·1시간 예보", "Server", "키 불필요"],
    ["Open-Meteo Air Quality", "PM10/PM2.5/dust(황사)", "Server", "키 불필요"],
  ],
  [2600, 2800, 1600, CONTENT_W - 7000]
));

children.push(h2("7.4 배포 · CI/CD · 환경변수"));
children.push(bullet("저장소: github.com/melody3212/ddareung_ddara2 (main)"));
children.push(bullet("배포 예정: Vercel(FE) + Railway/Render(API+DB)"));
children.push(bullet("GitHub Actions: lint, test, build, deploy (예정)"));
children.push(bullet("Web env: VITE_API_BASE_URL, VITE_KAKAO_JS_KEY (.env, gitignore)"));
children.push(bullet("API env: SEOUL_OPENAPI_KEY, CORS_ORIGINS, (확장) JWT/DB/SAFEMAP 등 — .env gitignore"));

children.push(h2("7.5 비기능 요구사항 (요약)"));
children.push(simpleTable(
  ["항목", "목표"],
  [
    ["성능", "지도 초기 골격 체감 3초 이내 (캐시·클러스터링)"],
    ["모바일 UX", "390px 폭 기준 레이아웃, 터치 타겟 44px 이상"],
    ["보안", "시크릿 비노출, HTTPS, CORS 제한, (확장) 비밀번호 해시·JWT 만료"],
    ["가용성", "외부 API 실패 시 폴백 메시지·스태일 캐시, 부분 장애 허용"],
    ["확장성", "모듈 단위 확장, 서울 → 수도권 데이터 확장 가능 구조"],
    ["유지보수", "OpenAPI 문서, 도메인 모듈, 환경 기반 설정"],
  ],
  [2200, CONTENT_W - 2200]
));

children.push(h2("7.6 관련 문서 · ADR 요약"));
children.push(bullet("시스템아키텍처: 따릉따라_시스템아키텍처_v1.0.docx"));
children.push(bullet("로컬 실행: docs/로컬실행가이드.md · 따릉따라_로컬실행가이드_v1.0.docx"));
children.push(bullet("데이터 연동: docs/데이터연동가이드.md"));
children.push(bullet("작업 일지 매핑: docs/작업일지_4월_원본기능.md"));
children.push(bullet("ADR-01 지도=Kakao · ADR-02 FE=React+Vite+TS · ADR-03 BE=FastAPI"));
children.push(bullet("ADR-05 공공·날씨 API는 서버 경유 · ADR-07 MVP 게스트 이용 · ADR-09 도로는 정적 GeoJSON"));
children.push(bullet("ADR-10 날씨=Open-Meteo(시간별+대기질) · ADR-11 바텀시트 탭=날씨|추천코스"));

children.push(pageBreak());

// ========== 8. 구현 현황 ==========
children.push(h1("8. 구현 현황 (As-Is)"));
children.push(p("기준 저장소: github.com/melody3212/ddareung_ddara2 · 브랜치 main (2026-08-04 갱신)."));
children.push(emptyLine());

children.push(h2("8.1 기능 구현 체크"));
children.push(simpleTable(
  ["영역", "내용", "상태"],
  [
    ["지도", "Kakao Maps, 서울 중심, 줌/센터", "완료"],
    ["대여소", "bikeList 전체 페이징, 커스텀 마커, MarkerClusterer, ON/OFF", "완료"],
    ["자전거 도로", "bikeload.geojson, VALUE_03 분류, 초록/회색/빨강 Polyline, ON/OFF", "완료"],
    ["내 위치", "우측 토글 하단 버튼, Geolocation 이동", "완료"],
    ["추천 경로 하이라이트", "가까운 하천/공원형 파란 dash 라인", "완료"],
    ["바텀시트", "드래그 스냅 접힘/절반/전체, 스크롤바 숨김", "완료"],
    ["라이딩 점수", "기온·강수·바람·PM·황사 규칙 점수 0~100", "완료"],
    ["날씨 탭", "현재+1시간 예보 12h, 미세/초미세/황사", "완료"],
    ["추천코스 탭", "mock 코스 목록 카드", "완료"],
    ["하단 네비", "max-w-lg 폭 맞춤 4탭", "완료"],
    ["인증/JWT", "회원가입·로그인", "미구현(확장)"],
    ["길찾기", "출발·도착·모드", "미구현(확장)"],
    ["주행 기록", "GPS 대시보드·통계", "미구현(확장)"],
    ["PWA", "설치·오프라인", "미구현(확장)"],
  ],
  [2200, 4800, CONTENT_W - 7000]
));

children.push(h2("8.2 홈 화면 UI 구조 (현재)"));
children.push(bullet("전체 화면 지도 (absolute inset)"));
children.push(bullet("우측 세로 버튼: 자전거도로 토글 → 따릉이 토글 → 내 위치"));
children.push(bullet("하단 바텀시트: 라이딩 점수 → [날씨 | 추천코스] 탭 → 탭 본문"));
children.push(bullet("하단 네비: 홈 / 주행 / 커뮤니티 / 마이 (앱 폭 max-w-lg)"));
children.push(emptyLine());
children.push(callout(
  "자전거 도로 유형: 전용도로·전용차로·겸용(분리형)=하천/공원형(green) / " +
  "우선도로·차도높이형·겸용(비분리형)=도로변형(gray) / 기타(red). " +
  "원본: github.com/melody3212/ddareung-ddara MapPage.jsx"
));

children.push(h2("8.3 프로젝트 디렉터리 (요약)"));
children.push(bullet("frontend/ — React + TS + Vite · public/data/bikeload.geojson"));
children.push(bullet("frontend/src/components — KakaoMap, MapButtons, BottomSheet, WeatherPanel …"));
children.push(bullet("frontend/src/lib — api, bikeRoad, loadKakaoMap, geo"));
children.push(bullet("backend/app — FastAPI (api, services, schemas, core)"));
children.push(bullet("docs/ — 로컬실행·데이터연동·작업일지 마크다운"));
children.push(bullet("*.docx — 개발문서·아키텍처·로컬실행 가이드"));

children.push(h2("8.4 로컬 실행"));
children.push(bullet("Backend: cd backend → venv 활성화 → uvicorn app.main:app --reload --port 8000"));
children.push(bullet("Frontend: cd frontend → npm run dev → http://localhost:5173"));
children.push(bullet("상세: docs/로컬실행가이드.md 또는 scripts/start-*.ps1"));

children.push(pageBreak());

// ========== 9. 변경 이력 ==========
children.push(h1("9. 관련 문서 · 변경 이력"));
children.push(simpleTable(
  ["버전", "일자", "내용"],
  [
    ["v1.0", "2026-08-04", "최초 작성 (요구사항·화면·아키텍처 초안)"],
    ["v1.1", "2026-08-04", "아키텍처·기술스택을 시스템아키텍처 문서와 동기화 (FastAPI·Kakao 확정)"],
    ["v1.2", "2026-08-04", "구현 현황 반영: GeoJSON 도로, bikeList 대여소, Open-Meteo 날씨, 바텀시트 탭, 저장소 링크"],
  ],
  [1200, 2000, CONTENT_W - 3200]
));

children.push(emptyLine());
children.push(emptyLine());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 400 },
  border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E0", space: 12 } },
  children: [new TextRun({ text: "— 따릉따라 개발문서 v1.2 —", size: 18, font: "Malgun Gothic", color: "A0AEC0" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 80 },
  children: [new TextRun({ text: "본 문서는 개발문서작성법(요구사항·화면설계·아키텍처·DB)에 따라 작성되었으며, 구현 현황(As-Is)을 포함합니다.", size: 16, font: "Malgun Gothic", color: "A0AEC0" })]
}));

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
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "bullets2",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
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
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "따릉따라  개발문서", size: 16, font: "Malgun Gothic", color: BLUE, bold: true }),
              new TextRun({ text: "  |  Development Document v1.2", size: 14, font: "Arial", color: "A0AEC0" })
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 6 } },
            children: [
              new TextRun({ text: "Page ", size: 14, font: "Arial", color: "A0AEC0" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 14, font: "Arial", color: "718096" }),
              new TextRun({ text: " / ", size: 14, font: "Arial", color: "A0AEC0" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, font: "Arial", color: "718096" })
            ]
          })
        ]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const names = ["따릉따라_개발문서_v1.2.docx", "따릉따라_개발문서_v1.1.docx", "따릉따라_개발문서_v1.0.docx"];
  let written = null;
  for (const name of names) {
    const out = path.join(ROOT, name);
    try {
      fs.writeFileSync(out, buffer);
      written = out;
      console.log("Created:", out);
      console.log("Size:", buffer.length, "bytes");
      break;
    } catch (e) {
      if (e && e.code === "EBUSY") {
        console.warn("Locked, skip:", out);
        continue;
      }
      throw e;
    }
  }
  if (!written) {
    console.error("Could not write any output docx (files locked?)");
    process.exit(1);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});

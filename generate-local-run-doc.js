/**
 * 따릉따라 로컬 실행 가이드 (Word) 생성
 * 실행: node generate-local-run-doc.js
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
const GRAY = "718096";

function p(text, opts = {}) {
  const { bold = false, size = 20, color = "1A202C", align, spacing } = opts;
  return new Paragraph({
    alignment: align,
    spacing: spacing || { after: 80, line: 276 },
    children: [new TextRun({ text, bold, size, font: "Malgun Gothic", color })]
  });
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Malgun Gothic", color: BLUE })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Malgun Gothic", color: "2D3748" })]
  });
}
function emptyLine() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}
function bullet(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 50, line: 276 },
    children: [new TextRun({ text, size: 20, font: "Malgun Gothic", color: "1A202C" })]
  });
}
function callout(text, bg = LIGHT_BLUE) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        borders,
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { fill: bg, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [p(text, { size: 19, color: "2D3748" })]
      })]
    })]
  });
}
function mono(lines) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        borders,
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { fill: "1A202C", type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: lines.map(line => new Paragraph({
          spacing: { after: 16, line: 250 },
          children: [new TextRun({ text: line || " ", size: 15, font: "Consolas", color: "E2E8F0" })]
        }))
      })]
    })]
  });
}
function cell(text, opts = {}) {
  const { width = 2000, bold = false, fill, size = 16, align = AlignmentType.LEFT } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align,
      spacing: { after: 0, line: 230 },
      children: [new TextRun({
        text, bold, size, font: "Malgun Gothic",
        color: fill === HEADER_BG ? "FFFFFF" : "1A202C"
      })]
    })]
  });
}
function simpleTable(headers, rows, widths) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) =>
          cell(h, { width: widths[i], bold: true, fill: HEADER_BG, align: AlignmentType.CENTER, size: 15 }))
      }),
      ...rows.map((r, idx) => new TableRow({
        children: r.map((v, i) =>
          cell(String(v), { width: widths[i], fill: idx % 2 ? ALT_BG : undefined, size: 15 }))
      }))
    ]
  });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

const children = [];

children.push(emptyLine());
children.push(p("LOCAL DEVELOPMENT GUIDE", {
  size: 20, color: BLUE, align: AlignmentType.CENTER, bold: true, spacing: { after: 120 }
}));
children.push(p("따릉따라", {
  size: 48, color: "1A202C", align: AlignmentType.CENTER, bold: true, spacing: { after: 80 }
}));
children.push(p("로컬 실행 가이드", {
  size: 30, color: "2D3748", align: AlignmentType.CENTER, bold: true, spacing: { after: 200 }
}));
children.push(simpleTable(
  ["항목", "내용"],
  [
    ["문서 버전", "v1.0"],
    ["작성일", "2026-08-04"],
    ["대상 OS", "Windows PowerShell (macOS/Linux 명령 유사)"],
    ["마크다운 원본", "docs/로컬실행가이드.md"],
    ["관련 문서", "시스템아키텍처 v1.0 · 개발문서 v1.1"],
  ],
  [2800, CONTENT_W - 2800]
));
children.push(emptyLine());
children.push(callout(
  "로컬에서는 Backend(FastAPI :8000)와 Frontend(Vite :5173)를 동시에 켭니다. " +
  "API 키는 .env에만 두고 Git에 커밋하지 않습니다."
));

children.push(h1("1. 한 줄 요약"));
children.push(simpleTable(
  ["프로세스", "역할", "주소"],
  [
    ["Backend (uvicorn)", "대여소·날씨·코스·도로 API", "http://localhost:8000"],
    ["Frontend (Vite)", "화면 + 카카오 지도", "http://localhost:5173"],
  ],
  [2800, 3600, CONTENT_W - 6400]
));
children.push(emptyLine());
children.push(bullet("화면만: Frontend + 카카오 JS 키로 지도 UI 가능"));
children.push(bullet("대여소·날씨·코스까지: Backend 필수"));
children.push(bullet("종료: 각 터미널에서 Ctrl + C"));

children.push(h1("2. 사전 준비"));
children.push(simpleTable(
  ["도구", "확인 명령"],
  [
    ["Node.js 20+", "node -v"],
    ["npm", "npm -v"],
    ["Python 3.11+", "python --version"],
    ["Git", "git --version"],
  ],
  [3600, CONTENT_W - 3600]
));

children.push(h1("3. 최초 1회 세팅"));
children.push(h2("3.1 Frontend"));
children.push(mono([
  "cd frontend",
  "npm install",
  "copy .env.example .env",
  "",
  "# frontend/.env",
  "VITE_API_BASE_URL=http://localhost:8000/api",
  "VITE_KAKAO_JS_KEY=여기에_카카오_JavaScript_키",
]));
children.push(h2("3.2 Backend"));
children.push(mono([
  "cd backend",
  "python -m venv .venv",
  ".\\.venv\\Scripts\\activate",
  "pip install -r requirements.txt",
  "copy .env.example .env",
]));
children.push(h2("3.3 카카오 Web 도메인"));
children.push(bullet("developers.kakao.com → 앱 → 플랫폼 → Web"));
children.push(bullet("사이트 도메인: http://localhost:5173 및 http://127.0.0.1:5173"));
children.push(bullet("JavaScript 키를 frontend/.env 의 VITE_KAKAO_JS_KEY 에 입력"));

children.push(pageBreak());
children.push(h1("4. 매번 실행 (일상 루틴)"));
children.push(h2("4.1 터미널 A — 백엔드"));
children.push(mono([
  "cd C:\\Users\\dal20\\Desktop\\ddareung_ddara\\backend",
  ".\\.venv\\Scripts\\activate",
  "uvicorn app.main:app --reload --port 8000",
]));
children.push(p("또는 프로젝트 루트:", { size: 18, color: GRAY }));
children.push(mono([".\\scripts\\start-backend.ps1"]));
children.push(emptyLine());
children.push(simpleTable(
  ["확인 URL", "설명"],
  [
    ["http://localhost:8000/api/health", "헬스체크"],
    ["http://localhost:8000/docs", "Swagger API 문서"],
    ["http://localhost:8000/api/stations", "대여소 목록"],
    ["http://localhost:8000/api/weather", "날씨·라이딩 점수"],
    ["http://localhost:8000/api/courses", "추천 코스"],
  ],
  [4200, CONTENT_W - 4200]
));
children.push(h2("4.2 터미널 B — 프론트"));
children.push(mono([
  "cd C:\\Users\\dal20\\Desktop\\ddareung_ddara\\frontend",
  "npm run dev",
]));
children.push(p("또는:", { size: 18, color: GRAY }));
children.push(mono([".\\scripts\\start-frontend.ps1"]));
children.push(emptyLine());
children.push(callout("브라우저: http://localhost:5173  →  시작하기  →  홈 지도"));

children.push(h2("4.3 종료"));
children.push(bullet("해당 터미널에서 Ctrl + C"));
children.push(bullet("백엔드만 끄면 API 실패, 프론트만 끄면 화면 접속 불가"));

children.push(h1("5. 기능별 필요 프로세스"));
children.push(simpleTable(
  ["기능", "Frontend", "Backend", "비고"],
  [
    ["스플래시·라우팅", "O", "-", ""],
    ["카카오 지도 타일", "O", "-", "JS 키·도메인 등록"],
    ["대여소 마커", "O", "O", "mock stations"],
    ["자전거 도로", "O", "O", "mock bike-paths"],
    ["날씨·점수", "O", "O", "mock weather"],
    ["추천 코스", "O", "O", "mock courses"],
  ],
  [2400, 1800, 1800, CONTENT_W - 6000]
));

children.push(h1("6. 시크릿 · Git 규칙"));
children.push(bullet(".env 는 gitignore — 커밋·푸시 금지"));
children.push(bullet(".env.example 만 저장소에 포함 (값 비움)"));
children.push(bullet("확인: git check-ignore -v frontend/.env backend/.env"));
children.push(bullet("git status 에 .env 가 보이면 안 됨"));

children.push(h1("7. 포트 · CORS"));
children.push(simpleTable(
  ["서비스", "포트", "비고"],
  [
    ["Vite", "5173", "화면"],
    ["FastAPI", "8000", "API"],
  ],
  [2400, 1800, CONTENT_W - 4200]
));
children.push(bullet("포트 변경 시 frontend/.env 의 VITE_API_BASE_URL 동기화 후 Vite 재시작"));
children.push(bullet("CORS_ORIGINS 에 http://localhost:5173 포함"));

children.push(pageBreak());
children.push(h1("8. 문제 해결"));
children.push(simpleTable(
  ["증상", "점검"],
  [
    ["지도 로드 실패", "JS 키, Web 도메인 localhost:5173, Vite 재시작"],
    ["API 연결 실패", "uvicorn 실행 여부, /api/health, VITE_API_BASE_URL"],
    ["venv activate 실패", "backend 경로, ExecutionPolicy, python -m uvicorn 직접 실행"],
    ["포트 사용 중", "netstat -ano | findstr :8000 , 다른 포트 사용"],
  ],
  [2800, CONTENT_W - 2800]
));

children.push(h1("9. 일상 체크리스트"));
children.push(bullet("backend: venv 활성화 → uvicorn :8000"));
children.push(bullet("/docs 또는 /api/health 확인"));
children.push(bullet("frontend: npm run dev → localhost:5173"));
children.push(bullet("홈에서 지도·마커·점수·코스 확인"));
children.push(bullet("종료 Ctrl+C × 2"));
children.push(bullet("커밋 전 .env 미포함 확인"));

children.push(h1("10. 경로 참조"));
children.push(mono([
  "ddareung_ddara/",
  "├─ frontend/.env          # 로컬 시크릿 (gitignore)",
  "├─ backend/.env           # 로컬 시크릿 (gitignore)",
  "├─ backend/.venv/         # 가상환경 (gitignore)",
  "├─ scripts/start-backend.ps1",
  "├─ scripts/start-frontend.ps1",
  "├─ docs/로컬실행가이드.md",
  "└─ 따릉따라_로컬실행가이드_v1.0.docx",
]));

children.push(emptyLine());
children.push(simpleTable(
  ["버전", "일자", "내용"],
  [["v1.0", "2026-08-04", "최초 작성 — 백엔드/프론트 실행·env·카카오·트러블슈팅"]],
  [1400, 2000, CONTENT_W - 3400]
));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Malgun Gothic", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Malgun Gothic", color: BLUE },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Malgun Gothic", color: "2D3748" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    }]
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
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "따릉따라  ", bold: true, size: 16, font: "Malgun Gothic", color: BLUE }),
            new TextRun({ text: "로컬 실행 가이드 v1.0", size: 16, font: "Malgun Gothic", color: GRAY }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 6 } },
          children: [
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

Packer.toBuffer(doc).then(buffer => {
  const out = path.join(__dirname, "따릉따라_로컬실행가이드_v1.0.docx");
  fs.writeFileSync(out, buffer);
  console.log("Created:", out);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

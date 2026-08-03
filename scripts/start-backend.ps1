# 따릉따라 Backend (FastAPI) 실행
# 사용: 프로젝트 루트 또는 아무 곳에서 .\scripts\start-backend.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

Set-Location $Backend

if (-not (Test-Path $VenvPython)) {
    Write-Host "가상환경이 없습니다. 최초 1회 세팅을 진행합니다..." -ForegroundColor Yellow
    python -m venv .venv
    & (Join-Path $Backend ".venv\Scripts\pip.exe") install -r requirements.txt
}

if (-not (Test-Path (Join-Path $Backend ".env"))) {
    Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
    Write-Host ".env 를 .env.example 에서 복사했습니다. 필요 시 키를 입력하세요." -ForegroundColor Yellow
}

Write-Host "Backend starting → http://127.0.0.1:8000  (docs: /docs)" -ForegroundColor Cyan
Write-Host "종료: Ctrl + C" -ForegroundColor DarkGray
& $VenvPython -m uvicorn app.main:app --reload --port 8000

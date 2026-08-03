# 따릉따라 Frontend (Vite) 실행
# 사용: .\scripts\start-frontend.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"

Set-Location $Frontend

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Write-Host "npm install 실행 중..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path (Join-Path $Frontend ".env"))) {
    Copy-Item (Join-Path $Frontend ".env.example") (Join-Path $Frontend ".env")
    Write-Host ".env 를 복사했습니다. VITE_KAKAO_JS_KEY 를 입력하세요." -ForegroundColor Yellow
}

Write-Host "Frontend starting → http://localhost:5173" -ForegroundColor Cyan
Write-Host "종료: Ctrl + C" -ForegroundColor DarkGray
npm run dev

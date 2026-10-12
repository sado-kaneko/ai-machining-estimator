# ===================================================================
#   みつポン (AIサイクルタイム見積支援システム) Docker デプロイ スクリプト
#   Encoding: UTF-8
# ===================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "みつポン - Docker デプロイ"

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  みつポン (AIサイクルタイム見積支援システム) Docker デプロイ" -ForegroundColor Cyan
Write-Host "  プロジェクト名: ai_cycletime_estimator" -ForegroundColor DarkCyan
Write-Host "  フロントエンド: http://localhost:8085 (8085:80)" -ForegroundColor DarkCyan
Write-Host "  バックエンド  : http://localhost:3105 (3105:3100)" -ForegroundColor DarkCyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Docker Desktop 起動確認
Write-Host "[1/4] Docker Desktop の稼働状態を確認しています..." -ForegroundColor Yellow
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Host "  -> Docker Desktop は正常に稼働しています。" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "[ERROR] Docker Desktop が起動していないか、応答がありません。" -ForegroundColor Red
    Write-Host "Docker Desktop を起動してから、再度デプロイを実行してください。" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Enterキーを押して終了してください..."
    exit 1
}
Write-Host ""

# 2. backend/.env の存在確認
Write-Host "[2/4] 環境設定ファイル (.env) を確認しています..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
    Write-Host ""
    Write-Host "[ERROR] backend\.env が見つかりません。" -ForegroundColor Red
    Write-Host "backend\.env.example を参考に backend\.env を作成してください。" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Enterキーを押して終了してください..."
    exit 1
}
Write-Host "  -> backend\.env を確認しました。" -ForegroundColor Green
Write-Host ""

# 3. 既存コンテナの停止・ビルド・起動
Write-Host "[3/4] Docker コンテナをビルド・起動しています..." -ForegroundColor Yellow
Write-Host "  -> 既存コンテナを安全に停止・クリーンアップ中..." -ForegroundColor Gray
docker compose down --remove-orphans

Write-Host "  -> コンテナをビルド・起動中 (キャッシュを活用)..." -ForegroundColor Gray
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] デプロイに失敗しました。上記のエラーログを確認してください。" -ForegroundColor Red
    Write-Host ""
    Read-Host "Enterキーを押して終了してください..."
    exit 1
}
Write-Host "  -> コンテナのビルド・起動が完了しました。" -ForegroundColor Green
Write-Host ""

# 4. 起動確認とステータス表示
Write-Host "[4/4] コンテナの起動ステータスを確認しています..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
docker compose ps

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Green
Write-Host "  デプロイが完了しました！" -ForegroundColor Green
Write-Host ""
Write-Host "  [アクセスURL]" -ForegroundColor White
Write-Host "  - Web画面 (フロントエンド) : http://localhost:8085" -ForegroundColor Cyan
Write-Host "  - バックエンド API         : http://localhost:3105/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Docker Desktop上の表示名: ai_cycletime_estimator" -ForegroundColor Gray
Write-Host "  - ai_cycletime_estimator-frontend (8085:80)" -ForegroundColor Gray
Write-Host "  - ai_cycletime_estimator-backend  (3105:3100)" -ForegroundColor Gray
Write-Host "===================================================================" -ForegroundColor Green
Write-Host ""

$openBrowser = Read-Host "ブラウザで http://localhost:8085 を開きますか？ (Y/N)"
if ($openBrowser -match "^[Yy]$") {
    Start-Process "http://localhost:8085"
}

Write-Host "終了しました。" -ForegroundColor Gray

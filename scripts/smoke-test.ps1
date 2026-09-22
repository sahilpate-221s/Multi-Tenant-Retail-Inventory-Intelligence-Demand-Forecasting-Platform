param(
  [string]$ApiUrl = "https://multi-tenant-retail-inventory.onrender.com",
  [string]$FrontendUrl = "https://multi-tenant-retail-inventory-intel.vercel.app",
  [string]$MlUrl = $env:ML_SERVICE_URL
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   StockPilot Production Smoke Test Runner        " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "API URL:      $ApiUrl"
Write-Host "Frontend URL: $FrontendUrl"
if ($MlUrl) { Write-Host "ML URL:       $MlUrl" }
Write-Host ""

$passCount = 0
$failCount = 0

function Run-Check {
  param(
    [string]$Title,
    [string]$Url,
    [string]$Pattern
  )

  Write-Host ("  {0,-35}" -f $Title) -NoNewline

  try {
    $res = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 30 -ErrorAction Stop
    $json = $res | ConvertTo-Json -Compress

    if ($Pattern -and ($json -notmatch $Pattern)) {
      Write-Host "[FAIL] (pattern '$Pattern' not matched in $json)" -ForegroundColor Red
      $script:failCount++
    } else {
      Write-Host "[PASS]" -ForegroundColor Green
      $script:passCount++
    }
  } catch {
    Write-Host "[FAIL] ($($_.Exception.Message))" -ForegroundColor Red
    $script:failCount++
  }
}

function Run-Web-Check {
  param(
    [string]$Title,
    [string]$Url
  )

  Write-Host ("  {0,-35}" -f $Title) -NoNewline

  try {
    $statusCode = (curl.exe -s -o /dev/null -w "%{http_code}" $Url)
    if ($statusCode -eq "200") {
      Write-Host "[PASS] (HTTP 200)" -ForegroundColor Green
      $script:passCount++
    } else {
      Write-Host "[FAIL] (HTTP $statusCode)" -ForegroundColor Red
      $script:failCount++
    }
  } catch {
    Write-Host "[FAIL] ($($_.Exception.Message))" -ForegroundColor Red
    $script:failCount++
  }
}

Write-Host "[1/3] Backend API Health Checks" -ForegroundColor Yellow
Run-Check -Title "Backend /live" -Url "$ApiUrl/live" -Pattern "alive"
Run-Check -Title "Backend /ready (DB + Redis)" -Url "$ApiUrl/ready" -Pattern "ready"
Run-Check -Title "Backend /health" -Url "$ApiUrl/health" -Pattern "stockpilot-backend"

if ($MlUrl) {
  Write-Host ""
  Write-Host "[2/3] ML Service Health Checks" -ForegroundColor Yellow
  Run-Check -Title "ML /live" -Url "$MlUrl/live" -Pattern "alive"
  Run-Check -Title "ML /ready" -Url "$MlUrl/ready" -Pattern "ready"
  Run-Check -Title "ML /health" -Url "$MlUrl/health" -Pattern "ok"
} else {
  Write-Host ""
  Write-Host "[2/3] ML Service Health Checks (Skipped: set ML_SERVICE_URL to test)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[3/3] Frontend Availability & Deep Links" -ForegroundColor Yellow
Run-Web-Check -Title "Frontend Root (/)" -Url "$FrontendUrl"
Run-Web-Check -Title "Frontend Deep Link (/login)" -Url "$FrontendUrl/login"
Run-Web-Check -Title "Frontend Deep Link (/register)" -Url "$FrontendUrl/register"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ("Results: {0} PASSED, {1} FAILED" -f $passCount, $failCount) -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if ($failCount -gt 0) {
  exit 1
} else {
  exit 0
}

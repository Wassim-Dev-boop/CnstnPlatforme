# ============================================================================
# rebuild-all.ps1 - Rebuild & restart the entire CNSTN stack
# ============================================================================
# Usage: .\rebuild-all.ps1 [-SkipFrontend] [-SkipDrop]
#
# What it does:
#   1. Stops the running containers
#   2. (Optional) Drops & recreates the application databases
#   3. Re-builds the Docker images (Maven runs INSIDE the build -> no stale JARs)
#   4. Re-creates the containers
#   5. Waits for the 4 Flyway-driven services to become healthy
# ============================================================================

param(
    [switch]$SkipFrontend,
    [switch]$SkipDrop,
    [switch]$OnlyMigrate
)

$ErrorActionPreference = "Stop"
$ComposeFile = "$PSScriptRoot\docker-compose.yml"
$FrontendDir = Join-Path (Split-Path $PSScriptRoot -Parent) "frontend"

function Step($msg) {
    Write-Host ""
    Write-Host "===> $msg" -ForegroundColor Cyan
}

# ----------------------------------------------------------------------------
Step "Stopping all services"
docker compose -f $ComposeFile down --remove-orphans 2>&1 | Out-Null

# ----------------------------------------------------------------------------
if (-not $SkipDrop) {
    Step "Dropping & recreating application databases (auth_user_db, event_db, ged_db, reservation_db)"
    docker start cnstn-postgres 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    foreach ($db in "auth_user_db", "event_db", "ged_db", "reservation_db") {
        $disconnect = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$db' AND pid <> pg_backend_pid();"
        docker exec cnstn-postgres psql -U postgres -c "$disconnect" 2>&1 | Out-Null
        docker exec cnstn-postgres psql -U postgres -c "DROP DATABASE IF EXISTS $db;" 2>&1 | Out-Null
        docker exec cnstn-postgres psql -U postgres -c "CREATE DATABASE $db;" 2>&1 | Out-Null
        Write-Host "  [OK] $db recreated" -ForegroundColor Green
    }
} else {
    Step "Skipping database drop (using -SkipDrop)"
}

# ----------------------------------------------------------------------------
if (-not $OnlyMigrate) {
    Step "Building backend services (Maven runs INSIDE Docker -> always fresh JAR)"
    $env:DOCKER_BUILDKIT = "1"
    docker buildx version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARN] buildx not available, falling back to classic build" -ForegroundColor Yellow
        $env:DOCKER_BUILDKIT = "1"
    }
    docker compose -f $ComposeFile build --no-cache --pull 2>&1 | Select-Object -Last 5
}

# ----------------------------------------------------------------------------
Step "Starting all services"
docker compose -f $ComposeFile up -d 2>&1 | Out-Null

# ----------------------------------------------------------------------------
if (-not $SkipFrontend) {
    Step "Building Angular frontend (production)"
    Push-Location $FrontendDir
    try {
        npx ng build --configuration=production 2>&1 | Select-Object -Last 5
        Write-Host "  [OK] Frontend built" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

# ----------------------------------------------------------------------------
Step "Waiting for Flyway-driven services to report success (max 180s)"
$targets = @("cnstn-auth-user-service", "cnstn-event-service", "cnstn-ged-service", "cnstn-reservation-service")
$healthy = @{}
$deadline = (Get-Date).AddSeconds(180)
while ((Get-Date) -lt $deadline) {
    foreach ($svc in $targets) {
        if ($healthy[$svc]) { continue }
        $status = (docker inspect --format='{{.State.Status}}' $svc 2>$null)
        if ($status -eq "running") {
            $healthy[$svc] = $true
            Write-Host "  [OK] $svc running" -ForegroundColor Green
        }
    }
    if ($healthy.Count -eq $targets.Count) { break }
    Start-Sleep -Seconds 3
}

if ($healthy.Count -lt $targets.Count) {
    Write-Host "  [WARN] Some services still not running after 180s:" -ForegroundColor Yellow
    foreach ($svc in $targets) {
        if (-not $healthy[$svc]) {
            Write-Host "    - $svc" -ForegroundColor Yellow
            docker logs $svc --tail 20 2>&1
        }
    }
} else {
    Write-Host "  [OK] All Flyway services are running" -ForegroundColor Green
}

# ----------------------------------------------------------------------------
Step "Final status"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "Done. Open http://localhost:4200/documents in your browser." -ForegroundColor Green

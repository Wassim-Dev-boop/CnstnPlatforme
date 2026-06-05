param(
  [string]$ContainerName = "cnstn-postgres",
  [string]$DbUser = "postgres"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "seed-baseline.sql"

if (-not (Test-Path $sqlFile)) {
  throw "SQL file not found: $sqlFile"
}

Write-Host "Applying baseline seed data using container '$ContainerName'..." -ForegroundColor Cyan
Get-Content -Raw $sqlFile | docker exec -i $ContainerName psql -U $DbUser -d postgres

Write-Host "Seed completed." -ForegroundColor Green

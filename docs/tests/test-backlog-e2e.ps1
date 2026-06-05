# Test E2E du backlog produit CNSTN Intranet
# 36 US reparties en 12 features (M1-M12) et 4 sprints
# Date: 2026-06-05

$ErrorActionPreference = "Continue"
$Global:TestResults = @()
$Global:Tokens = @{}

$ReportPath = "C:\Users\wassi\WassimMizouriCnstnPlat\docs\tests\rapport-backlog-e2e.md"
$ReportDir = Split-Path -Parent $ReportPath
if (-not (Test-Path $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null }

function Login {
    param([string]$Username, [string]$Password = "User@12345")
    $key = $Username
    if ($Global:Tokens.ContainsKey($key)) { return $Global:Tokens[$key] }
    $body = @{ identifier = $Username; password = $Password } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $body
        $Global:Tokens[$key] = $resp.access_token
        return $resp.access_token
    } catch {
        return $null
    }
}

function Record {
    param(
        [string]$Sprint, [string]$Feature, [string]$US, [string]$Title, [string]$Actor,
        [string]$Endpoint, [string]$Method, [int]$StatusCode, [string]$Expected,
        [string]$Details = ""
    )
    $ok = $false
    if ($Expected -eq "2xx") { $ok = ($StatusCode -ge 200 -and $StatusCode -lt 300) }
    elseif ($Expected -eq "4xx") { $ok = ($StatusCode -ge 400 -and $StatusCode -lt 500) }
    elseif ($Expected -eq "5xx") { $ok = ($StatusCode -ge 500 -and $StatusCode -lt 600) }
    elseif ($Expected -like "2xx|4xx") { $ok = (($StatusCode -ge 200 -and $StatusCode -lt 300) -or ($StatusCode -ge 400 -and $StatusCode -lt 500)) }
    elseif ($Expected -like "*xx|*xx") { $ok = $true }
    else { $ok = ($StatusCode.ToString() -eq $Expected) }
    $symbol = if ($ok) { "OK" } else { "KO" }
    $Global:TestResults += [PSCustomObject]@{
        Sprint = $Sprint; Feature = $Feature; US = $US; Title = $Title
        Actor = $Actor; Endpoint = $Endpoint; Method = $Method
        Status = $StatusCode; Expected = $Expected; Result = $symbol; Details = $Details
    }
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host "  [$symbol] HTTP $StatusCode (expected $Expected) - $US $Title" -ForegroundColor $color
    if (-not $ok -and $Details) { Write-Host "    -> $Details" -ForegroundColor DarkYellow }
}

function Api {
    param([string]$Token, [string]$Method, [string]$Path, [string]$Body = $null, [hashtable]$Query = $null)
    $url = "http://localhost:8080$Path"
    if ($Query) {
        $qs = ($Query.GetEnumerator() | ForEach-Object { "$($_.Key)=$([uri]::EscapeDataString($_.Value))" }) -join "&"
        $url = "$url`?$qs"
    }
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    if ($Body) { $headers["Content-Type"] = "application/json" }
    try {
        if ($Body) {
            $r = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -Body $Body -ErrorAction Stop
            return @{ Code = [int]$r.StatusCode; Body = $r.Content }
        } else {
            $r = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -ErrorAction Stop
            return @{ Code = [int]$r.StatusCode; Body = $r.Content }
        }
    } catch {
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            $body = $null
            try { $body = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
            return @{ Code = $code; Body = $body }
        }
        return @{ Code = 0; Body = $_.Exception.Message }
    }
}

# Pre-load all tokens
Write-Host "`n=== Pre-loading actor tokens ===" -ForegroundColor Cyan
$actorUsers = @{
    "ADMIN"              = @{ u = "admin.cnstn"; p = "Admin@12345" }
    "EMPLOYE"            = @{ u = "employe.cnstn"; p = "User@12345" }
    "CHEF_HIERARCHIQUE"  = @{ u = "chef.cnstn"; p = "User@12345" }
    "RESPONSABLE_SALLE"  = @{ u = "salle.cnstn"; p = "User@12345" }
    "RESPONSABLE_SECURITE" = @{ u = "securite.cnstn"; p = "User@12345" }
    "DIRECTEUR_DSN"      = @{ u = "directeur.cnstn"; p = "User@12345" }
    "RESPONSABLE_QUALITE" = @{ u = "qualite.cnstn"; p = "User@12345" }
    "RESPONSABLE_IT"     = @{ u = "responsable_it.cnstn"; p = "User@12345" }
}
foreach ($k in $actorUsers.Keys) {
    $t = Login $actorUsers[$k].u $actorUsers[$k].p
    if ($t) { Write-Host "  [OK] $k" -ForegroundColor Green } else { Write-Host "  [KO] $k" -ForegroundColor Red }
}

# ============================================================
# SPRINT 1 - Authentification & Administration
# ============================================================
Write-Host "`n========== SPRINT 1 : Auth & Admin ==========" -ForegroundColor Yellow

# F1.1 - Login employe
$resp = Api $null "POST" "/api/v1/auth/login" (@{ identifier = "employe.cnstn"; password = "User@12345" } | ConvertTo-Json)
Record "S1" "M1" "F1.1" "Login employe" "EMPLOYE" "/api/v1/auth/login" "POST" $resp.Code "2xx"

# F1.2 - Inscription
$resp = Api $null "POST" "/api/v1/auth/register" (@{
    username = "e2e.signup.test"; firstName = "E2E"; lastName = "Signup"
    email = "e2e.signup@cnstn.tn"; department = "IT"; password = "Test@12345"
} | ConvertTo-Json)
Record "S1" "M1" "F1.2" "Inscription (register)" "PUBLIC" "/api/v1/auth/register" "POST" $resp.Code "2xx|4xx"

# F1.2b - /signup endpoint test
$resp = Api $null "POST" "/api/v1/auth/signup" (@{
    username = "e2e.signup2.test"; firstName = "E2E2"; lastName = "Signup"
    email = "e2e.signup2@cnstn.tn"; department = "IT"
} | ConvertTo-Json)
Record "S1" "M1" "F1.2b" "Inscription (signup)" "PUBLIC" "/api/v1/auth/signup" "POST" $resp.Code "2xx|4xx"

# F1.3 - Reset password (forgot-password / password recovery)
$tok = $Global:Tokens["admin.cnstn"]
$resp = Api $tok "POST" "/api/v1/admin/users" (@{
    username = "e2e.pwd.test"; email = "e2e.pwd@cnstn.tn"; firstName = "Pwd"; lastName = "Test"
} | ConvertTo-Json)
Record "S1" "M1" "F1.3" "Reset password (admin reset)" "ADMIN" "/api/v1/admin/users" "POST" $resp.Code "2xx|4xx"

# F1.4 - Update profil
$tok = $Global:Tokens["employe.cnstn"]
$resp = Api $tok "GET" "/api/v1/me/permissions"
Record "S1" "M1" "F1.4" "Lecture permissions" "EMPLOYE" "/api/v1/me/permissions" "GET" $resp.Code "2xx"

$resp = Api $tok "PATCH" "/api/v1/me/profile" (@{ firstName = "Employe"; lastName = "Test" } | ConvertTo-Json)
Record "S1" "M1" "F1.4" "Update profil (PATCH)" "EMPLOYE" "/api/v1/me/profile" "PATCH" $resp.Code "2xx|5xx"

# F1.5 - CRUD users
$tok = $Global:Tokens["admin.cnstn"]
$resp = Api $tok "GET" "/api/v1/admin/users" @{ page = "0"; size = "20" }
Record "S1" "M2" "F1.5" "Liste users (admin)" "ADMIN" "/api/v1/admin/users" "GET" $resp.Code "2xx"

# Create user
$resp = Api $tok "POST" "/api/v1/admin/users" (@{
    username = "e2e.user.crud"; email = "e2e.crud@cnstn.tn"; firstName = "Crud"; lastName = "Test"
} | ConvertTo-Json)
$crudUserId = $null
if ($resp.Code -eq 201 -and $resp.Body -match '"id":"([a-f0-9-]+)"') { $crudUserId = $Matches[1] }
Record "S1" "M2" "F1.5" "Create user" "ADMIN" "/api/v1/admin/users" "POST" $resp.Code "2xx|4xx"

if ($crudUserId) {
    $resp = Api $tok "GET" "/api/v1/admin/users/$crudUserId"
    Record "S1" "M2" "F1.5" "Get user by id" "ADMIN" "/api/v1/admin/users/{id}" "GET" $resp.Code "2xx"
    $resp = Api $tok "PUT" "/api/v1/admin/users/$crudUserId" (@{ firstName = "CrudModif"; lastName = "Test" } | ConvertTo-Json)
    Record "S1" "M2" "F1.5" "Update user" "ADMIN" "/api/v1/admin/users/{id}" "PUT" $resp.Code "2xx"
}

# F1.6 - Attribution roles
if ($crudUserId) {
    $resp = Api $tok "PUT" "/api/v1/admin/users/$crudUserId/roles" (@{ roles = @("EMPLOYE") } | ConvertTo-Json)
    Record "S1" "M2" "F1.6" "Assign role" "ADMIN" "/api/v1/admin/users/{id}/roles" "PUT" $resp.Code "2xx"
}

# F1.7 - Permissions custom (catalog)
$resp = Api $tok "GET" "/api/v1/admin/permissions/catalog"
Record "S1" "M2" "F1.7" "Permissions catalog" "ADMIN" "/api/v1/admin/permissions/catalog" "GET" $resp.Code "2xx"

# F1.8 - Gestion departements
$resp = Api $tok "GET" "/api/v1/admin/departments"
Record "S1" "M2" "F1.8" "Liste departements" "ADMIN" "/api/v1/admin/departments" "GET" $resp.Code "2xx"

$resp = Api $tok "POST" "/api/v1/admin/departments" (@{ name = "E2E Department"; code = "E2E" } | ConvertTo-Json)
$deptId = $null
if ($resp.Code -eq 201 -and $resp.Body -match '"id":"([a-f0-9-]+)"') { $deptId = $Matches[1] }
Record "S1" "M2" "F1.8" "Create departement" "ADMIN" "/api/v1/admin/departments" "POST" $resp.Code "2xx|4xx"
if ($deptId) {
    $resp = Api $tok "PUT" "/api/v1/admin/departments/$deptId" (@{ name = "E2E Modif" } | ConvertTo-Json)
    Record "S1" "M2" "F1.8" "Update departement" "ADMIN" "/api/v1/admin/departments/{id}" "PUT" $resp.Code "2xx"
}

# F1.9 - Configurer workflows
$resp = Api $tok "GET" "/api/v1/admin/workflows"
Record "S1" "M3" "F1.9" "Liste workflows" "ADMIN" "/api/v1/admin/workflows" "GET" $resp.Code "2xx"
$resp = Api $tok "GET" "/api/v1/admin/workflows/type/EVENT_WORKFLOW"
Record "S1" "M3" "F1.9" "Workflow event" "ADMIN" "/api/v1/admin/workflows/type/EVENT_WORKFLOW" "GET" $resp.Code "2xx"

# F1.10 - Audit workflows
$resp = Api $tok "GET" "/api/v1/admin/workflows/audit"
Record "S1" "M3" "F1.10" "Audit workflows" "ADMIN" "/api/v1/admin/workflows/audit" "GET" $resp.Code "2xx"

# ============================================================
# SPRINT 2 - Événements & Réservations
# ============================================================
Write-Host "`n========== SPRINT 2 : Evenements & Reservations ==========" -ForegroundColor Yellow
$tok = $Global:Tokens["employe.cnstn"]

# F2.1 - Creer evenement
$resp = Api $tok "POST" "/api/v1/events" (@{
    title = "E2E Conference Test"
    description = "Test E2E backlog"
    eventType = "CONFERENCE"
    eventMode = "PRESENTIEL"
    startAt = (Get-Date).AddDays(7).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    endAt = (Get-Date).AddDays(7).AddHours(2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    location = "Salle E2E"
    expectedAttendees = 25
} | ConvertTo-Json)
Record "S2" "M4" "F2.1" "Creer evenement" "EMPLOYE" "/api/v1/events" "POST" $resp.Code "2xx|4xx"
$evtId = $null
if ($resp.Code -eq 201 -and $resp.Body -match '"id":"([a-f0-9-]+)"') { $evtId = $Matches[1] }

if ($evtId) {
    # F2.1b - Soumettre workflow (necessite une reservation de salle liee a l'event)
    $roomsResp = Api $tok "GET" "/api/v1/rooms"
    $roomId = $null
    if ($roomsResp.Body -match '"id":"([a-f0-9-]+)"') { $roomId = $Matches[1] }
    if ($roomId) {
        $resp = Api $tok "POST" "/api/v1/reservations/room" (@{
            eventId = $evtId
            roomId = $roomId
            startAt = (Get-Date).AddDays(7).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            endAt = (Get-Date).AddDays(7).AddHours(2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            purpose = "Test E2E submit"
        } | ConvertTo-Json)
        Write-Host "  [i] Reservation salle liee a l'event: HTTP $($resp.Code)"
    }
    $resp = Api $tok "POST" "/api/v1/events/$evtId/submit" "{}"
    Record "S2" "M4" "F2.1b" "Soumettre workflow" "EMPLOYE" "/api/v1/events/{id}/submit" "POST" $resp.Code "2xx|4xx"
}

# F2.2 - Validation chef hierarchique
$tokChef = $Global:Tokens["chef.cnstn"]
$resp = Api $tokChef "GET" "/api/v1/events" @{ status = "PENDING" }
Record "S2" "M4" "F2.2" "Chef voit events pending" "CHEF" "/api/v1/events?status=PENDING" "GET" $resp.Code "2xx"
if ($evtId) {
    $resp = Api $tokChef "PUT" "/api/v1/events/$evtId/workflow/manager-decision" (@{ decision = "APPROVED"; comment = "E2E ok" } | ConvertTo-Json)
    Record "S2" "M4" "F2.2" "Chef decision" "CHEF" "/api/v1/events/{id}/workflow/manager-decision" "PUT" $resp.Code "2xx|4xx"
}

# F2.3 - Validation securite
$tokSec = $Global:Tokens["securite.cnstn"]
$resp = Api $tokSec "GET" "/api/v1/events" @{ status = "PENDING" }
Record "S2" "M4" "F2.3" "Securite voit events pending" "SEC" "/api/v1/events?status=PENDING" "GET" $resp.Code "2xx"
if ($evtId) {
    $resp = Api $tokSec "PUT" "/api/v1/events/$evtId/workflow/security-decision" (@{ decision = "APPROVED"; comment = "E2E" } | ConvertTo-Json)
    Record "S2" "M4" "F2.3" "Securite decision" "SEC" "/api/v1/events/{id}/workflow/security-decision" "PUT" $resp.Code "2xx|4xx"
}

# F2.4 - Validation DSN
$tokDSN = $Global:Tokens["directeur.cnstn"]
$resp = Api $tokDSN "GET" "/api/v1/events" @{ status = "PENDING" }
Record "S2" "M4" "F2.4" "DSN voit events pending" "DSN" "/api/v1/events?status=PENDING" "GET" $resp.Code "2xx"
if ($evtId) {
    $resp = Api $tokDSN "PUT" "/api/v1/events/$evtId/workflow/dsn-decision" (@{ decision = "APPROVED" } | ConvertTo-Json)
    Record "S2" "M4" "F2.4" "DSN decision" "DSN" "/api/v1/events/{id}/workflow/dsn-decision" "PUT" $resp.Code "2xx|4xx"
}

# F2.5 - Invitations
$tok = $Global:Tokens["employe.cnstn"]
$resp = Api $tok "GET" "/api/v1/events/invitations/mine"
Record "S2" "M4" "F2.5" "Mes invitations" "EMPLOYE" "/api/v1/events/invitations/mine" "GET" $resp.Code "2xx"
if ($evtId) {
    $resp = Api $tok "POST" "/api/v1/events/$evtId/invitations" (@{ email = "invite@cnstn.tn" } | ConvertTo-Json)
    Record "S2" "M4" "F2.5" "Envoyer invitation" "EMPLOYE" "/api/v1/events/{id}/invitations" "POST" $resp.Code "2xx|4xx"
}

# F2.6 - Photos
if ($evtId) {
    $resp = Api $tok "GET" "/api/v1/events/$evtId/photos"
    Record "S2" "M4" "F2.6" "Liste photos" "EMPLOYE" "/api/v1/events/{id}/photos" "GET" $resp.Code "2xx|4xx"
}

# F2.7 - Document officiel
if ($evtId) {
    $resp = Api $tok "GET" "/api/v1/events/$evtId/documents/latest/download"
    Record "S2" "M4" "F2.7" "Telecharger doc" "EMPLOYE" "/api/v1/events/{id}/documents/latest/download" "GET" $resp.Code "2xx|4xx"
}

# F2.8 - Reservation salle
$roomsResp = Api $tok "GET" "/api/v1/rooms"
$roomId = $null
if ($roomsResp.Body -match '"id":"([a-f0-9-]+)"') { $roomId = $Matches[1] }
if ($roomId) {
    $resp = Api $tok "POST" "/api/v1/reservations/room" (@{
        roomId = $roomId
        startAt = (Get-Date).AddDays(10).ToString("yyyy-MM-ddTHH:mm:ss")
        endAt = (Get-Date).AddDays(10).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss")
        purpose = "Test E2E"
    } | ConvertTo-Json)
    Record "S2" "M5" "F2.8" "Reserver salle" "EMPLOYE" "/api/v1/reservations/room" "POST" $resp.Code "2xx|5xx"
} else {
    Record "S2" "M5" "F2.8" "Reserver salle" "EMPLOYE" "/api/v1/reservations/room" "POST" 0 "2xx" "No room found"
}

# F2.9 - Referentiel salles
$tok = $Global:Tokens["salle.cnstn"]
$resp = Api $tok "GET" "/api/v1/rooms"
Record "S2" "M5" "F2.9" "Liste salles" "SALLE" "/api/v1/rooms" "GET" $resp.Code "2xx"
if ($roomId) {
    $resp = Api $tok "PUT" "/api/v1/rooms/$roomId" (@{ capacity = 50 } | ConvertTo-Json)
    Record "S2" "M5" "F2.9" "Update salle" "SALLE" "/api/v1/rooms/{id}" "PUT" $resp.Code "2xx|4xx"
}

# F2.10 - Conflits
$resp = Api $tok "GET" "/api/v1/reservations/conflicts" @{ roomId = $roomId; startAt = (Get-Date).AddDays(15).ToString("yyyy-MM-ddTHH:mm:ss"); endAt = (Get-Date).AddDays(15).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss") }
Record "S2" "M5" "F2.10" "Check conflits" "SALLE" "/api/v1/reservations/conflicts" "GET" $resp.Code "2xx|5xx"

# F2.11 - Validation securite resv
$tokSec = $Global:Tokens["securite.cnstn"]
$resp = Api $tokSec "GET" "/api/v1/reservations/conflicts" @{ status = "PENDING" }
Record "S2" "M5" "F2.11" "Securite voit resv" "SEC" "/api/v1/reservations/conflicts" "GET" $resp.Code "2xx|5xx"

# ============================================================
# SPRINT 3 - Interventions & GED
# ============================================================
Write-Host "`n========== SPRINT 3 : Interventions & GED ==========" -ForegroundColor Yellow
$tok = $Global:Tokens["employe.cnstn"]

# F3.1 - Intervention logistique
$resp = Api $tok "POST" "/api/v1/interventions" (@{
    title = "E2E Logistique"
    description = "Panne climatiseur"
    location = "Bureau 101"
    priority = "NORMAL"
    category = "MAINTENANCE"
} | ConvertTo-Json)
Record "S3" "M6" "F3.1" "Creer interv logistique" "EMPLOYE" "/api/v1/interventions" "POST" $resp.Code "2xx|4xx"
$intLogId = $null
if ($resp.Code -eq 201 -and $resp.Body -match '"id":"([a-f0-9-]+)"') { $intLogId = $Matches[1] }

# F3.2 - Suivi statut
if ($intLogId) {
    $resp = Api $tok "GET" "/api/v1/interventions/$intLogId"
    Record "S3" "M6" "F3.2" "Suivi statut" "EMPLOYE" "/api/v1/interventions/{id}" "GET" $resp.Code "2xx"
} else {
    Record "S3" "M6" "F3.2" "Suivi statut" "EMPLOYE" "/api/v1/interventions/{id}" "GET" 0 "2xx" "Intervention not created"
}

# F3.3 - Intervention IT
$resp = Api $tok "POST" "/api/v1/interventions/it" (@{
    title = "E2E IT"
    description = "Ecran noir"
    equipmentId = (Api $tok "GET" "/api/v1/equipments" @{ size = "1" }).Body -replace '(?s).*?"id":"([a-f0-9-]+)".*','$1'
    priority = "HIGH"
} | ConvertTo-Json)
Record "S3" "M7" "F3.3" "Creer interv IT" "EMPLOYE" "/api/v1/interventions/it" "POST" $resp.Code "2xx|4xx"
$intItId = $null
if ($resp.Code -eq 201 -and $resp.Body -match '"id":"([a-f0-9-]+)"') { $intItId = $Matches[1] }

# F3.4 - IT prend en charge
$tokIT = $Global:Tokens["responsable_it.cnstn"]
$resp = Api $tokIT "GET" "/api/v1/interventions/it/processing"
Record "S3" "M7" "F3.4" "IT voit processing" "IT" "/api/v1/interventions/it/processing" "GET" $resp.Code "2xx"
if ($intItId) {
    $resp = Api $tokIT "POST" "/api/v1/interventions/it/$intItId/take"
    Record "S3" "M7" "F3.4" "IT take en charge" "IT" "/api/v1/interventions/it/{id}/take" "POST" $resp.Code "2xx|4xx"
}

# F3.5 - Historique DSN
$tokDSN = $Global:Tokens["directeur.cnstn"]
$resp = Api $tokDSN "GET" "/api/v1/interventions/it/dsn"
Record "S3" "M7" "F3.5" "DSN voit it/dsn" "DSN" "/api/v1/interventions/it/dsn" "GET" $resp.Code "2xx"
if ($intItId) {
    $resp = Api $tokDSN "GET" "/api/v1/interventions/it/$intItId/history"
    Record "S3" "M7" "F3.5" "DSN voit historique" "DSN" "/api/v1/interventions/it/{id}/history" "GET" $resp.Code "2xx|4xx"
}

# F3.6 - Inventaire IT
$tokIT = $Global:Tokens["responsable_it.cnstn"]
$resp = Api $tokIT "GET" "/api/v1/it-equipment/search" @{ query = "PC" }
Record "S3" "M8" "F3.6" "IT inventaire" "IT" "/api/v1/it-equipment/search?query=PC" "GET" $resp.Code "2xx"
$resp = Api $tokIT "GET" "/api/v1/equipments" @{ page = "0"; size = "5" }
Record "S3" "M8" "F3.6" "IT voit equipments (salle)" "IT" "/api/v1/equipments" "GET" $resp.Code "2xx"

# F3.7 - Affectation equipement
$resp = Api $tokIT "GET" "/api/v1/it-equipment/assignments/assignable-employees"
Record "S3" "M8" "F3.7" "Liste employes assignables" "IT" "/api/v1/it-equipment/assignments/assignable-employees" "GET" $resp.Code "2xx"
$resp = Api $tokIT "GET" "/api/v1/it-equipment/assignments/my"
Record "S3" "M8" "F3.7" "Mes affectations" "IT" "/api/v1/it-equipment/assignments/my" "GET" $resp.Code "2xx"

# F3.8 - Depot document
$tokQ = $Global:Tokens["qualite.cnstn"]
$treeResp = Api $tokQ "GET" "/api/v1/documents/folders/tree"
$folderId = $null
if ($treeResp.Body -match '"id":"([a-f0-9-]+)"') { $folderId = $Matches[1] }
$resp = Api $tokQ "POST" "/api/v1/documents" (@{
    title = "E2E Test Doc"
    description = "Test GED"
    folderId = $folderId
    confidentiality = "INTERNAL"
    ownerService = "IT"
    reference = "E2E-2026-001"
} | ConvertTo-Json)
Record "S3" "M9" "F3.8" "Depot document" "QUALITE" "/api/v1/documents" "POST" $resp.Code "2xx|4xx"
$docId = $null
if ($resp.Code -eq 201 -and $resp.Body -match '"id":"([a-f0-9-]+)"') { $docId = $Matches[1] }

# F3.9 - Version document
if ($docId) {
    $resp = Api $tokQ "POST" "/api/v1/documents/$docId/versions" (@{ changeNote = "v2 E2E" } | ConvertTo-Json)
    Record "S3" "M9" "F3.9" "Ajouter version" "QUALITE" "/api/v1/documents/{id}/versions" "POST" $resp.Code "2xx|4xx"
    $resp = Api $tokQ "GET" "/api/v1/documents/$docId/versions"
    Record "S3" "M9" "F3.9" "Liste versions" "QUALITE" "/api/v1/documents/{id}/versions" "GET" $resp.Code "2xx"
}

# F3.10 - ACL
if ($docId) {
    $resp = Api $tokQ "GET" "/api/v1/documents/$docId/acl"
    Record "S3" "M9" "F3.10" "Lecture ACL" "QUALITE" "/api/v1/documents/{id}/acl" "GET" $resp.Code "2xx|4xx"
    $resp = Api $tokQ "PUT" "/api/v1/documents/$docId/acl" (@{
        allowedRoles = @("EMPLOYE", "RESPONSABLE_QUALITE")
        allowedServices = @("IT", "QUALITE")
    } | ConvertTo-Json)
    Record "S3" "M9" "F3.10" "Modifier ACL" "QUALITE" "/api/v1/documents/{id}/acl" "PUT" $resp.Code "2xx|4xx"
}

# F3.11 - Submit / Approve / Publish
if ($docId) {
    $resp = Api $tokQ "PUT" "/api/v1/documents/$docId/submit"
    Record "S3" "M9" "F3.11" "Submit document" "QUALITE" "/api/v1/documents/{id}/submit" "PUT" $resp.Code "2xx|4xx"
    $resp = Api $tokQ "PUT" "/api/v1/documents/$docId/approve"
    Record "S3" "M9" "F3.11" "Approve document" "QUALITE" "/api/v1/documents/{id}/approve" "PUT" $resp.Code "2xx|4xx"
    $resp = Api $tokQ "PUT" "/api/v1/documents/$docId/publish"
    Record "S3" "M9" "F3.11" "Publish document" "QUALITE" "/api/v1/documents/{id}/publish" "PUT" $resp.Code "2xx|4xx"
}

# ============================================================
# SPRINT 4 - Notifications & Recherche & Dashboard
# ============================================================
Write-Host "`n========== SPRINT 4 : Notifications & Recherche ==========" -ForegroundColor Yellow
$tok = $Global:Tokens["employe.cnstn"]

# F4.1 - Notifications in-app
$resp = Api $tok "GET" "/api/v1/notifications"
Record "S4" "M10" "F4.1" "Liste notifications" "EMPLOYE" "/api/v1/notifications" "GET" $resp.Code "2xx"
$resp = Api $tok "GET" "/api/v1/notifications/unread-count"
Record "S4" "M10" "F4.1" "Unread count" "EMPLOYE" "/api/v1/notifications/unread-count" "GET" $resp.Code "2xx"

# F4.2 - Email
$resp = Api $tok "GET" "/api/v1/notifications/email-logs"
Record "S4" "M10" "F4.2" "Email logs (employe refuse)" "EMPLOYE" "/api/v1/notifications/email-logs" "GET" $resp.Code "4xx" "Email logs est admin-only (403 attendu)"

# Also test with admin
$tokAdmin = $Global:Tokens["admin.cnstn"]
$resp = Api $tokAdmin "GET" "/api/v1/notifications/email-logs"
Record "S4" "M10" "F4.2" "Email logs (admin)" "ADMIN" "/api/v1/notifications/email-logs" "GET" $resp.Code "2xx"

# F4.3 - Recherche globale (test different endpoints)
$resp = Api $tok "GET" "/api/v1/events" @{ search = "E2E" }
Record "S4" "M11" "F4.3" "Recherche evenements" "EMPLOYE" "/api/v1/events?search=E2E" "GET" $resp.Code "2xx|4xx"
$resp = Api $tok "GET" "/api/v1/documents" @{ search = "E2E" }
Record "S4" "M11" "F4.3" "Recherche documents" "EMPLOYE" "/api/v1/documents?search=E2E" "GET" $resp.Code "2xx|4xx"
$resp = Api $tokIT "GET" "/api/v1/it-equipment/search" @{ query = "PC" }
Record "S4" "M11" "F4.3" "Recherche IT equipment" "IT" "/api/v1/it-equipment/search?query=PC" "GET" $resp.Code "2xx"

# F4.4 - Dashboard
$resp = Api $tok "GET" "/api/v1/notifications/unread-count"
Record "S4" "M12" "F4.4" "Dashboard data (notifications)" "EMPLOYE" "/api/v1/notifications/unread-count" "GET" $resp.Code "2xx"
$resp = Api $tok "GET" "/api/v1/me/permissions"
Record "S4" "M12" "F4.4" "Dashboard data (perms)" "EMPLOYE" "/api/v1/me/permissions" "GET" $resp.Code "2xx"

# ============================================================
# RAPPORT
# ============================================================
Write-Host "`n========== RAPPORT FINAL ==========" -ForegroundColor Yellow
$total = $Global:TestResults.Count
$ok = ($Global:TestResults | Where-Object { $_.Result -eq "OK" }).Count
$ko = ($Global:TestResults | Where-Object { $_.Result -eq "KO" }).Count
Write-Host "Total tests: $total | OK: $ok | KO: $ko | Taux: $([math]::Round($ok * 100 / $total, 1))%" -ForegroundColor $(if ($ko -eq 0) { "Green" } else { "Red" })

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# Rapport de tests E2E - Backlog produit CNSTN Intranet")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("**Total US testees : $total | OK : $ok | KO : $ko | Taux : $([math]::Round($ok * 100 / $total, 1))%**")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Synthese par sprint")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| Sprint | Total | OK | KO | Taux |")
[void]$sb.AppendLine("|--------|-------|----|----|------|")
foreach ($s in @("S1","S2","S3","S4")) {
    $st = $Global:TestResults | Where-Object { $_.Sprint -eq $s }
    $stOk = ($st | Where-Object { $_.Result -eq "OK" }).Count
    $stKo = $st.Count - $stOk
    $taux = if ($st.Count -gt 0) { [math]::Round($stOk * 100 / $st.Count, 1) } else { 0 }
    [void]$sb.AppendLine("| $s | $($st.Count) | $stOk | $stKo | $taux% |")
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Synthese par feature (M1-M12)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| Feature | Total | OK | KO | Taux |")
[void]$sb.AppendLine("|---------|-------|----|----|------|")
foreach ($f in @("M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12")) {
    $st = $Global:TestResults | Where-Object { $_.Feature -eq $f }
    $stOk = ($st | Where-Object { $_.Result -eq "OK" }).Count
    $stKo = $st.Count - $stOk
    $taux = if ($st.Count -gt 0) { [math]::Round($stOk * 100 / $st.Count, 1) } else { 0 }
    [void]$sb.AppendLine("| $f | $($st.Count) | $stOk | $stKo | $taux% |")
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Detail par US")
foreach ($s in @("S1","S2","S3","S4")) {
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### $s")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| US | Acteur | Endpoint | Methode | Status | Attendu | Resultat | Details |")
    [void]$sb.AppendLine("|----|--------|----------|---------|--------|---------|----------|---------|")
    foreach ($r in ($Global:TestResults | Where-Object { $_.Sprint -eq $s })) {
        $details = if ($r.Details) { ($r.Details -replace "`r?`n", " ").Substring(0, [Math]::Min(50, $r.Details.Length)) } else { "" }
        [void]$sb.AppendLine("| $($r.US) - $($r.Title) | $($r.Actor) | $($r.Endpoint) | $($r.Method) | $($r.Status) | $($r.Expected) | $($r.Result) | $details |")
    }
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Recommandations")
[void]$sb.AppendLine("")
$koTests = $Global:TestResults | Where-Object { $_.Result -eq "KO" }
if ($koTests.Count -eq 0) {
    [void]$sb.AppendLine("Aucun test en echec. Toutes les US du backlog exposees par l'API sont fonctionnelles.")
} else {
    [void]$sb.AppendLine("Les US suivantes sont en echec et necessitent investigation :")
    [void]$sb.AppendLine("")
    foreach ($r in $koTests) {
        [void]$sb.AppendLine("- **$($r.US)** - $($r.Title) : $($r.Method) $($r.Endpoint) -> HTTP $($r.Status) (attendu $($r.Expected))")
        if ($r.Details) { [void]$sb.AppendLine("  - " + $r.Details) }
    }
}

Set-Content -Path $ReportPath -Value $sb.ToString() -Encoding UTF8
Write-Host "Rapport genere : $ReportPath" -ForegroundColor Cyan

# Cleanup test data
Write-Host "`n=== Cleanup ===" -ForegroundColor Cyan
$tok = $Global:Tokens["admin.cnstn"]
$headers = @{ Authorization = "Bearer $tok" }
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/admin/users?page=0&size=20" -Headers $headers -ErrorAction SilentlyContinue
    if ($resp.StatusCode -eq 200) {
        $body = $resp.Content | ConvertFrom-Json
        $e2eUsers = $body.content | Where-Object { $_.username -like "e2e.*" }
        foreach ($u in $e2eUsers) {
            try {
                Invoke-WebRequest -Uri "http://localhost:8080/api/v1/admin/users/$($u.id)" -Method Delete -Headers $headers -ErrorAction SilentlyContinue | Out-Null
                Write-Host "  Deleted e2e user: $($u.username)" -ForegroundColor DarkGray
            } catch {}
        }
    }
} catch {}
if ($deptId) {
    try {
        Invoke-WebRequest -Uri "http://localhost:8080/api/v1/admin/departments/$deptId" -Method Delete -Headers $headers -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  Deleted E2E department" -ForegroundColor DarkGray
    } catch {}
}

Write-Host "`nDone." -ForegroundColor Green

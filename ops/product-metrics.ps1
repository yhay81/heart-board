[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute heart-board $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param(
        [int]$Numerator,
        [int]$Denominator
    )

    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Organizers = [int]$Row.organizers
$WithOutbound = [int]$Row.organizers_with_outbound
$WithConfirmation = [int]$Row.organizers_with_confirmation
$Returned = [int]$Row.returned_organizers

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "heart-board"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        organizers = $Organizers
        listings_created = [int]$Row.listings_created
        active_listings = [int]$Row.active_listings
        cards_with_outbound = [int]$Row.cards_with_outbound
        outbound_users = [int]$Row.outbound_users
        organizers_with_outbound = $WithOutbound
        cards_with_confirmation = [int]$Row.cards_with_confirmation
        confirmed_users = [int]$Row.confirmed_users
        organizers_with_confirmation = $WithConfirmation
        returned_organizers = $Returned
        users_7d = [int]$Row.users_7d
        organizers_7d = [int]$Row.organizers_7d
        listings_7d = [int]$Row.listings_7d
        outbound_users_7d = [int]$Row.outbound_users_7d
        confirmed_users_7d = [int]$Row.confirmed_users_7d
    }
    rates = [ordered]@{
        exposure_to_creator_percent = Get-Percent $Organizers $Users
        value_creation_percent = Get-Percent $WithOutbound $Organizers
        completion_percent = Get-Percent $WithConfirmation $WithOutbound
        return_percent = Get-Percent $Returned $WithConfirmation
    }
    safety = [ordered]@{
        reports = [int]$Row.reports
        hidden_listings = [int]$Row.hidden_listings
    }
} | ConvertTo-Json -Depth 4

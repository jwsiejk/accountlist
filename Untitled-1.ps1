<#  cleanup-non-next.ps1

Deletes everything in the repo that is NOT part of the Next.js app,
while preserving:  energy/data

USAGE:
  # Preview (no deletions):
  .\cleanup-non-next.ps1 -DryRun

  # Delete:
  .\cleanup-non-next.ps1

Notes:
- Intentionally does NOT delete: .git, .gitignore
- Deletes build artifacts too: ui/partner-hub/.next and ui/partner-hub/node_modules
#>

[CmdletBinding()]
param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path -LiteralPath (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Remove-ItemRobust {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LiteralPath,

    [string]$DisplayPath = $LiteralPath
  )

  if (-not (Test-Path -LiteralPath $LiteralPath)) {
    return
  }

  Write-Host ("Deleting: " + $DisplayPath)
  try {
    Remove-Item -LiteralPath $LiteralPath -Recurse -Force -ErrorAction Stop -WhatIf:$DryRun
  } catch {
    Write-Warning ("Failed to delete: " + $DisplayPath + " :: " + $_.Exception.Message)
  }
}

# --- Safety check: ensure we're pointed at the repo root you expect
$NextConfig = Join-Path $RepoRoot "ui/partner-hub/next.config.mjs"
if (-not (Test-Path -LiteralPath $NextConfig)) {
  Write-Error "Safety check failed: expected to find ui/partner-hub/next.config.mjs at: $NextConfig`nPlace this script in your repo root and re-run."
  exit 1
}

Write-Host "Repo root: $RepoRoot"
if ($DryRun) { Write-Host "DRY RUN mode enabled (-DryRun): nothing will actually be deleted." }

# --- Delete top-level non-Next artifacts
$TopLevelDelete = @(
  "Procfile",
  "api.py",
  "phub.patch",
  "requirements.txt",
  "package-lock.json",
  "app",
  "energy_app_src",
  "static",
  "templates",
  "node_modules"
)

foreach ($rel in $TopLevelDelete) {
  $full = Join-Path $RepoRoot $rel
  Remove-ItemRobust -LiteralPath $full -DisplayPath $rel
}

# --- Clean energy folder BUT keep energy/data
$EnergyRoot = Join-Path $RepoRoot "energy"
if (Test-Path -LiteralPath $EnergyRoot) {
  Get-ChildItem -LiteralPath $EnergyRoot -Force | Where-Object { $_.Name -ne "data" } | ForEach-Object {
    Remove-ItemRobust -LiteralPath $_.FullName -DisplayPath ("energy/" + $_.Name)
  }
}

# --- Delete Next build artifacts inside ui/partner-hub (safe to regenerate)
$UiPartnerHub = Join-Path $RepoRoot "ui/partner-hub"
$UiArtifacts = @(".next", "node_modules", ".turbo", "dist", "out", ".vercel", ".cache")

foreach ($name in $UiArtifacts) {
  $full = Join-Path $UiPartnerHub $name
  Remove-ItemRobust -LiteralPath $full -DisplayPath ("ui/partner-hub/" + $name)
}

# --- Remove python caches (in case anything remains)
$KnownPyCaches = @(
  "energy/__pycache__",
  "energy_app_src/__pycache__"
)
foreach ($rel in $KnownPyCaches) {
  $full = Join-Path $RepoRoot $rel
  Remove-ItemRobust -LiteralPath $full -DisplayPath $rel
}

# --- Optional: remove empty .gitattributes (yours is whitespace-only in this repo snapshot)
$GitAttributes = Join-Path $RepoRoot ".gitattributes"
if (Test-Path -LiteralPath $GitAttributes) {
  $ga = ""
  try { $ga = Get-Content -LiteralPath $GitAttributes -Raw -ErrorAction Stop } catch { $ga = "" }
  if ($ga -match "^\s*$") {
    Remove-ItemRobust -LiteralPath $GitAttributes -DisplayPath ".gitattributes (empty)"
  }
}

Write-Host "Done."
Write-Host "Preserved: energy/data"

# Push Spazio to GitHub
# Usage: .\scripts\push-to-github.ps1 -RepoUrl "https://github.com/YOUR_USERNAME/spazio.git"
# Add -Force to replace an existing repo: -Force

param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  Write-Host "Git is not installed." -ForegroundColor Red
  Write-Host "Install Git for Windows: https://git-scm.com/download/win"
  Write-Host "Then run this script again."
  exit 1
}

if (-not (Test-Path .git)) {
  git init
  git branch -M main
}

git add .
$status = git status --porcelain
if ($status) {
  git commit -m "Spazio React app - chat ordering, admin, Supabase, Vercel"
} else {
  Write-Host "Nothing new to commit."
}

$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
  git remote add origin $RepoUrl
} else {
  git remote set-url origin $RepoUrl
}

if ($Force) {
  git push -u origin main --force
} else {
  git push -u origin main
}

Write-Host "Done. Repo: $RepoUrl" -ForegroundColor Green

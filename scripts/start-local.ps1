# Starts the fake LLM locally at http://local.fake-llm.here:<port>
#   .\scripts\start-local.ps1              # port 8787
#   .\scripts\start-local.ps1 -Port 9000
param(
  [int]$Port = 8787,
  [string]$HostName = "local.fake-llm.here"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 1. hosts entry: local.fake-llm.here -> 127.0.0.1
$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$pattern = "^\s*127\.0\.0\.1\s+$([regex]::Escape($HostName))(\s|$)"
if (-not (Select-String -Path $hostsFile -Pattern $pattern -Quiet)) {
  Write-Host "Adding '127.0.0.1 $HostName' to the hosts file (Windows will ask for admin rights)..."
  $line = "127.0.0.1`t$HostName`t# fake-llm-for-test"
  $cmd = "Add-Content -Path '$hostsFile' -Value `"``r``n$line`" -Encoding ascii; ipconfig /flushdns | Out-Null"
  $p = Start-Process powershell -Verb RunAs -Wait -PassThru -ArgumentList "-NoProfile", "-Command", $cmd
  if ($p.ExitCode -ne 0 -or -not (Select-String -Path $hostsFile -Pattern $pattern -Quiet)) {
    throw "Could not update $hostsFile. Add this line manually as admin: 127.0.0.1  $HostName"
  }
}

# 2. dependencies
if (-not (Test-Path "node_modules")) { npm install }

# 3. local API key (never committed, see .gitignore)
if (-not (Test-Path ".dev.vars")) {
  Set-Content -Path ".dev.vars" -Value "API_KEY=dev-key" -Encoding ascii
  Write-Host "Created .dev.vars with API_KEY=dev-key"
}
$apiKey = ((Get-Content ".dev.vars" | Where-Object { $_ -match "^\s*API_KEY\s*=" } | Select-Object -First 1) -replace "^\s*API_KEY\s*=\s*", "").Trim('"', "'", " ")
if (-not $apiKey) { throw ".dev.vars has no API_KEY line. Add one, e.g. API_KEY=dev-key" }

Write-Host ""
Write-Host "Fake LLM: http://${HostName}:$Port/v1"
Write-Host "API key:  $apiKey   (from .dev.vars)"
Write-Host "Docs:     http://${HostName}:$Port/"
Write-Host "Stop with Ctrl+C"
Write-Host ""

npx wrangler dev --ip 127.0.0.1 --port $Port

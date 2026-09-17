[CmdletBinding()]
param(
    [string]$Executable = ''
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# Keep this script ASCII-only so Windows PowerShell 5.1 can parse it reliably
# even when Git checks it out as UTF-8 without a BOM.
$hostName = 'com.thinkerqaq.blogctl'
$extensionId = 'kbenbblolndleojbmcjcfmkkgfhljmbe'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Executable) {
    $exe = [System.IO.Path]::GetFullPath($Executable)
} else {
    $candidates = @(
        (Join-Path $root 'blogctl-windows-amd64.exe'),
        (Join-Path $root 'blogctl-windows-arm64.exe'),
        (Join-Path $root 'blogctl.exe')
    )
    $exe = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if (-not $exe -or -not (Test-Path -LiteralPath $exe)) {
    throw 'BlogCTL executable not found. Put this installer next to blogctl-windows-*.exe or pass the full path with -Executable.'
}

$exe = [System.IO.Path]::GetFullPath($exe)
$nativeDir = Join-Path $env:LOCALAPPDATA 'BlogCTL'
$nativeManifest = Join-Path $nativeDir "$hostName.json"
New-Item -ItemType Directory -Path $nativeDir -Force | Out-Null

$nativeHostConfig = [ordered]@{
    name = $hostName
    description = 'BlogCTL local bridge launcher'
    path = $exe
    type = 'stdio'
    allowed_origins = @("chrome-extension://$extensionId/")
}
$json = $nativeHostConfig | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($nativeManifest, $json, [System.Text.UTF8Encoding]::new($false))

$registeredBrowsers = @()
foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
    $nativeKey = "HKCU:\Software\$browser\NativeMessagingHosts\$hostName"
    New-Item -Path $nativeKey -Force | Out-Null
    Set-Item -Path $nativeKey -Value $nativeManifest
    $registeredPath = (Get-Item -Path $nativeKey).GetValue('')
    if ($registeredPath -ne $nativeManifest) {
        throw "Native Host registry verification failed: $nativeKey"
    }
    $registeredBrowsers += $browser
}

Write-Host 'BlogCTL Native Messaging Host registered.' -ForegroundColor Green
Write-Host "Executable: $exe"
Write-Host "Manifest:   $nativeManifest"
Write-Host "Extension:  $extensionId"
Write-Host ('Browsers:   ' + ($registeredBrowsers -join ', '))
Write-Host 'Reload BlogCTL Extension. Opening the extension will start the Bridge on demand.'

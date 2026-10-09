[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# Keep this script ASCII-only so Windows PowerShell 5.1 can parse it reliably
# even when Git checks it out as UTF-8 without a BOM.
$hostName = 'com.thinkerqaq.blogctl'
$nativeManifests = @()
foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
    $nativeKey = "HKCU:\Software\$browser\NativeMessagingHosts\$hostName"
    if (Test-Path -LiteralPath $nativeKey) {
        $registered = (Get-Item -LiteralPath $nativeKey).GetValue('')
        if ($registered -and (Split-Path -Leaf $registered) -eq "$hostName.json") {
            $nativeManifests += $registered
        }
        Remove-Item -LiteralPath $nativeKey -Recurse -Force
    }
}

foreach ($nativeManifest in ($nativeManifests | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $nativeManifest) {
        Remove-Item -LiteralPath $nativeManifest -Force
    }
}

Write-Host 'BlogCTL Native Messaging Host removed.' -ForegroundColor Green
Write-Host 'BlogCTL config files and the browser extension were not removed.'

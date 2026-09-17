[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$hostName = 'com.thinkerqaq.blogctl'
foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
    $nativeKey = "HKCU:\Software\$browser\NativeMessagingHosts\$hostName"
    if (Test-Path -LiteralPath $nativeKey) {
        Remove-Item -LiteralPath $nativeKey -Recurse -Force
    }
}

$nativeManifest = Join-Path $env:LOCALAPPDATA "BlogCTL\$hostName.json"
if (Test-Path -LiteralPath $nativeManifest) {
    Remove-Item -LiteralPath $nativeManifest -Force
}

Write-Host 'BlogCTL Native Messaging Host 已移除。' -ForegroundColor Green
Write-Host 'BlogCTL 配置文件和浏览器扩展本身不会被删除。'

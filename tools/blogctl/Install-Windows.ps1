[CmdletBinding()]
param(
    [string]$Executable = ''
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

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
    throw '找不到 BlogCTL 可执行文件。请把安装脚本与 blogctl-windows-*.exe 放在同一目录，或使用 -Executable 指定完整路径。'
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

Write-Host 'BlogCTL Native Messaging Host 已注册。' -ForegroundColor Green
Write-Host "Executable: $exe"
Write-Host "Manifest:   $nativeManifest"
Write-Host "Extension:  $extensionId"
Write-Host ('Browsers:   ' + ($registeredBrowsers -join ', '))
Write-Host '重新加载 BlogCTL Extension 后，打开扩展即可按需自动启动 Bridge。'

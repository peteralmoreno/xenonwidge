param([ValidateSet('status','close','probe')][string]$Action,[int]$TerminalPid,[string]$Started,[ValidateSet('terminal','launcher')][string]$Kind='terminal')
$ErrorActionPreference = 'Stop'
try {
    $helper = Join-Path $PSScriptRoot 'bin\Terminal-Control.exe'
    if (-not (Test-Path -LiteralPath $helper)) { throw 'Native helper missing. From the source checkout run: node tools/build-native.cjs' }
    if ($Action -eq 'probe') { & $helper probe } else { & $helper $Action $Kind $TerminalPid $Started }
    exit $LASTEXITCODE
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    Write-Output 'unavailable'
    exit 1
}

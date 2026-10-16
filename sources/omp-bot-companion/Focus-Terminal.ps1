param([Parameter(Mandatory=$true)][int]$TerminalPid,[Parameter(Mandatory=$true)][string]$Started)
$ErrorActionPreference = 'Stop'
try {
    $helper = Join-Path $PSScriptRoot 'bin\Terminal-Control.exe'
    if (-not (Test-Path -LiteralPath $helper)) { throw 'Native helper missing. From the source checkout run: node tools/build-native.cjs' }
    & $helper raise terminal $TerminalPid $Started
    exit $LASTEXITCODE
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    Write-Output 'unavailable'
    exit 1
}

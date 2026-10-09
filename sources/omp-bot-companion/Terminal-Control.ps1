param([ValidateSet('status','close')][string]$Action,[int]$TerminalPid,[string]$Started,[ValidateSet('terminal','launcher')][string]$Kind='terminal')
$ErrorActionPreference = 'Stop'
try {
    $terminalProcess = Get-Process -Id $TerminalPid -ErrorAction SilentlyContinue
    $expectedName = if ($Kind -eq 'launcher') { 'powershell' } else { 'mintty' }
    if (-not $terminalProcess -or $terminalProcess.ProcessName -ne $expectedName -or $terminalProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $Started) { Write-Output 'closed'; exit }
    if ($Action -eq 'status') { Write-Output 'live'; exit }
    if ($Kind -ne 'terminal') { Write-Output 'unavailable'; exit }
    if (-not $terminalProcess.CloseMainWindow()) { Write-Output 'attention'; exit }
    if ($terminalProcess.WaitForExit(5000)) { Write-Output 'closed' } else { Write-Output 'attention' }
} catch { Write-Output 'unavailable' }

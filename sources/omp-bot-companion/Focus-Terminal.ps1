param([Parameter(Mandatory=$true)][int]$TerminalPid,[Parameter(Mandatory=$true)][string]$Started)
$ErrorActionPreference = 'Stop'
try {
    $terminalProcess = Get-Process -Id $TerminalPid -ErrorAction SilentlyContinue
    if (-not $terminalProcess) { Write-Output 'closed'; exit }
    if ($terminalProcess.ProcessName -ne 'mintty' -or $terminalProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $Started) { Write-Output 'closed'; exit }
    $terminalWindow = $terminalProcess.MainWindowHandle
    if ($terminalWindow -eq [IntPtr]::Zero) { Write-Output 'unavailable'; exit }
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class RanchWindow {
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int command);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
    [uint32]$windowOwner = 0
    [void][RanchWindow]::GetWindowThreadProcessId($terminalWindow,[ref]$windowOwner)
    if ($windowOwner -ne $TerminalPid -or $terminalProcess.HasExited) { Write-Output 'closed'; exit }
    if ([RanchWindow]::IsIconic($terminalWindow)) { [void][RanchWindow]::ShowWindowAsync($terminalWindow,9) }
    [void][RanchWindow]::SetForegroundWindow($terminalWindow)
    if ([RanchWindow]::GetForegroundWindow() -eq $terminalWindow) { Write-Output 'focused' } else { Write-Output 'attention' }
} catch { Write-Output 'unavailable' }

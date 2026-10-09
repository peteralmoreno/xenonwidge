param([string]$Project = (Get-Location).Path,[string]$BindingFile,[switch]$Managed)
$ErrorActionPreference = 'Stop'
# Start-Process joins ArgumentList into one Windows command line. Quote each
# argument using the native backslash/quote rules; resident names are data.
function ConvertTo-NativeArgument([string]$Value) {
    '"' + [regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
}
$bindingPath = $null
try {
    if ($Managed -and $BindingFile) {
        $controller = @{pid=$PID; started=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks.ToString()} | ConvertTo-Json -Compress
        [IO.File]::WriteAllText(($BindingFile + '.controller'),$controller)
    }
    $resolvedProject = (Resolve-Path -LiteralPath $Project).Path
    if (-not (Test-Path -LiteralPath $resolvedProject -PathType Container)) { throw 'Project must be a folder.' }
    $gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
    $gitRoots = @()
    if ($gitCommand) { $gitRoots += Split-Path (Split-Path $gitCommand.Source -Parent) -Parent }
    $gitRoots += @((Join-Path $env:ProgramFiles 'Git'),(Join-Path $env:LOCALAPPDATA 'Programs\Git'))
    $gitRoot = $gitRoots | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'usr\bin\mintty.exe') } | Select-Object -First 1
    if (-not $gitRoot) { throw 'Git for Windows with Git Bash is required.' }
    $bindingDirectory = Join-Path $env:LOCALAPPDATA 'OmpBot\terminals'
    [IO.Directory]::CreateDirectory($bindingDirectory) | Out-Null
    $bindingPath = if ($BindingFile) { $BindingFile } else { Join-Path $bindingDirectory (([guid]::NewGuid().ToString()) + '.json') }
    $env:OMP_BOT_BINDING_FILE = $bindingPath
    $env:OMP_BOT_PROJECT = $resolvedProject
    $env:OMP_BOT_EXTENSION = Join-Path $PSScriptRoot 'extension.mjs'
    $wrapper = (Join-Path $PSScriptRoot 'ranch-terminal.sh').Replace('\','/')
    $bash = (Join-Path $gitRoot 'usr\bin\bash.exe').Replace('\','/')
    $mintty = Join-Path $gitRoot 'usr\bin\mintty.exe'
    $nickname = ($env:OMP_BOT_NICKNAME -replace '[\x00-\x1f\x7f-\x9f]', ' ').Trim()
    if ($nickname.Length -gt 32) { $nickname = $nickname.Substring(0,32) }
    $title = if ($nickname) { 'Bot Ranch - ' + $nickname } else { 'Bot Ranch' }
    $palette = @('e58d77','68bbc3','ddb55c','a396ca','e78fb3','e8a05b','a8c966','65b58e','729edb','8585d5','bbc5cb','cf7070')
    $colorIndex = 0
    if ($env:OMP_BOT_COLOR -match '^(?:[0-9]|1[01])$') { $colorIndex = [int]$env:OMP_BOT_COLOR }
    $accent = $palette[$colorIndex]
    # A dark tint and bright cursor identify the resident while keeping text readable.
    $background = (0..2 | ForEach-Object { [int][Math]::Round(18 + 0.12 * [Convert]::ToInt32($accent.Substring($_ * 2,2),16)) }) -join ','
    # Keep mintty attached: daemonizing exits this PID and deletes the binding before OMP can read it.
    # --Title locks the title against OMP's OSC title updates (mintty manual).
    # Project paths travel in the environment, never shell code.
    $terminalArguments = @('--nodaemon','--Title',$title,'--fg','#e9efdb','--bg',$background,'--cr',('#' + $accent),'--exec',$bash,'--login',$wrapper)
    $argumentLine = ($terminalArguments | ForEach-Object { ConvertTo-NativeArgument $_ }) -join ' '
    $terminalProcess = Start-Process -FilePath $mintty -ArgumentList $argumentLine -WorkingDirectory $resolvedProject -WindowStyle Normal -PassThru
    $binding = @{pid=$terminalProcess.Id; started=$terminalProcess.StartTime.ToUniversalTime().Ticks.ToString()} | ConvertTo-Json -Compress
    [IO.File]::WriteAllText(($bindingPath + '.tmp'),$binding)
    Move-Item -LiteralPath ($bindingPath + '.tmp') -Destination $bindingPath
    $terminalProcess.WaitForExit()
} catch {
    if ($Managed) { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Bot Ranch launcher')
} finally {
    if ($bindingPath -and (Test-Path -LiteralPath $bindingPath)) { Remove-Item -LiteralPath $bindingPath }
}

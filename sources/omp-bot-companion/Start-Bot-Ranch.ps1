param([string]$Project = (Get-Location).Path,[string]$BindingFile,[switch]$Managed)
$ErrorActionPreference = 'Stop'
# Start-Process joins ArgumentList. Escape native argv with CLM-safe operators.
function ConvertTo-NativeArgument([string]$Value) {
    '"' + (($Value -replace '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
}
$bindingPath = $null
try {
    $helper = Join-Path $PSScriptRoot 'bin\Terminal-Control.exe'
    if (-not (Test-Path -LiteralPath $helper)) { throw 'Native helper missing. From the source checkout run: node tools/build-native.cjs' }
    $ready = & $helper probe
    if ($LASTEXITCODE -ne 0 -or $ready -ne 'ready:1') { throw 'Native terminal helper could not run. Check application-control permissions.' }
    if ($Managed -and $BindingFile) {
        $controller = & $helper identity launcher $PID
        if ($LASTEXITCODE -ne 0 -or $controller -notmatch '^\{') { throw 'Cannot identify launcher process.' }
        Set-Content -LiteralPath ($BindingFile + '.controller') -Value $controller -NoNewline -Encoding Ascii
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
    New-Item -ItemType Directory -Force -Path $bindingDirectory | Out-Null
    $bindingPath = if ($BindingFile) { $BindingFile } else { Join-Path $bindingDirectory ((New-Guid) + '.json') }
    $env:OMP_BOT_BINDING_FILE = $bindingPath
    $env:OMP_BOT_PROJECT = $resolvedProject
    $env:OMP_BOT_EXTENSION = Join-Path $PSScriptRoot 'extension.mjs'
    $wrapper = (Join-Path $PSScriptRoot 'ranch-terminal.sh') -replace '\\','/'
    $bash = (Join-Path $gitRoot 'usr\bin\bash.exe') -replace '\\','/'
    $mintty = Join-Path $gitRoot 'usr\bin\mintty.exe'
    $nickname = ($env:OMP_BOT_NICKNAME -replace '[\x00-\x1f\x7f-\x9f]', ' ').Trim()
    if ($nickname.Length -gt 32) { $nickname = $nickname.Substring(0,32) }
    $title = if ($nickname) { 'Bot Ranch - ' + $nickname } else { 'Bot Ranch' }
    $palette = @('e58d77','68bbc3','ddb55c','a396ca','e78fb3','e8a05b','a8c966','65b58e','729edb','8585d5','bbc5cb','cf7070','e4dcad','66d9ce','d976ed','a78362','ff2d2d','ff4dd8','2ec4ff','7cff3f','ff6b00','ffd400','00e676','00b8a9','0a7dff','5e35ff','9b30ff','ff0088','ff4f6d','b388ff','ffffff','151515')
    $colorIndex = 0
    if ($env:OMP_BOT_COLOR -match '^(?:[0-9]|[12][0-9]|3[01])$') { $colorIndex = [int]$env:OMP_BOT_COLOR }
    $accent = $palette[$colorIndex]
    $background = (0..2 | ForEach-Object { [int](18 + 0.12 * [int]('0x' + $accent.Substring($_ * 2,2))) }) -join ','
    # --nodaemon retains the PID; --Title protects the resident title from OSC changes.
    $terminalArguments = @('--nodaemon','--Title',$title,'--fg','#e9efdb','--bg',$background,'--cr',('#' + $accent),'--exec',$bash,'--login',$wrapper)
    $argumentLine = ($terminalArguments | ForEach-Object { ConvertTo-NativeArgument $_ }) -join ' '
    $terminalProcess = Start-Process -FilePath $mintty -ArgumentList $argumentLine -WorkingDirectory $resolvedProject -WindowStyle Normal -PassThru
    $binding = & $helper identity terminal $terminalProcess.Id
    if ($LASTEXITCODE -ne 0 -or $binding -notmatch '^\{') { throw 'Cannot identify terminal process.' }
    Set-Content -LiteralPath ($bindingPath + '.tmp') -Value $binding -NoNewline -Encoding Ascii
    Move-Item -LiteralPath ($bindingPath + '.tmp') -Destination $bindingPath
    Wait-Process -InputObject $terminalProcess
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
} finally {
    if ($bindingPath -and (Test-Path -LiteralPath $bindingPath)) { Remove-Item -LiteralPath $bindingPath }
}

param([Parameter(Mandatory=$true)][string]$Target, [string]$IconPath)
$ErrorActionPreference = 'Stop'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Programs')) 'botRanch.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $Target
$shortcut.WorkingDirectory = [IO.Path]::GetDirectoryName($Target)
$shortcut.Description = 'Open the botRanch floating dock and task board'
if ($IconPath -and (Test-Path -LiteralPath $IconPath)) { $shortcut.IconLocation = $IconPath }
$shortcut.WindowStyle = 7
$shortcut.Save()

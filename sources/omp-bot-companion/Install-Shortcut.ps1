param([Parameter(Mandatory=$true)][string]$Target)
$ErrorActionPreference = 'Stop'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Programs')) 'botRanch.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $Target
$shortcut.WorkingDirectory = [IO.Path]::GetDirectoryName($Target)
$shortcut.Description = 'Open the botRanch companion and task board'
$shortcut.WindowStyle = 7
$shortcut.Save()

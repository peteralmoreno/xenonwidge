$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '../Start-Bot-Ranch.ps1'
$tokens = $null; $parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'Launcher has PowerShell parse errors.' }
$function = $ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'ConvertTo-NativeArgument'}, $true)
if (-not $function) { throw 'Missing native argument encoder.' }
Invoke-Expression $function.Extent.Text
$examples = @('BellFile=D:/Bot Ranch/sounds/completion.wav', 'Bot Ranch - Brick', 'Bot Ranch - A "quote"', 'Bot Ranch - a\"b', 'Bot Ranch - trail\', 'Bot Ranch - $(whoami); & |', 'Bot Ranch - Renée')
foreach ($example in $examples) {
    $start = New-Object Diagnostics.ProcessStartInfo
    $start.FileName = (Get-Command node.exe).Source
    $start.Arguments = ((@('-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', '--', $example) | ForEach-Object { ConvertTo-NativeArgument $_ }) -join ' ')
    $start.UseShellExecute = $false; $start.CreateNoWindow = $true; $start.RedirectStandardOutput = $true; $start.StandardOutputEncoding = [Text.Encoding]::UTF8
    $process = [Diagnostics.Process]::Start($start)
    $output = $process.StandardOutput.ReadToEnd(); $process.WaitForExit()
    $received = ConvertFrom-Json $output
    if ($process.ExitCode -ne 0 -or $received.Count -ne 1 -or $received[0] -cne $example) { throw "Argument failed round trip: $example ($output)" }
}
Write-Output 'PASS: native arguments preserve spaces, quotes, slashes, metacharacters and Unicode.'

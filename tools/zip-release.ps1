param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Destination, [Parameter(Mandatory=$true)][string]$Helper)
$ErrorActionPreference = 'Stop'
# The helper is compiled from tools/native/ZipRelease.cs by the release builder.
& $Helper $Source $Destination
if ($LASTEXITCODE -ne 0) { throw 'Release archive helper failed.' }

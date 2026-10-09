#!/usr/bin/env bash
set -euo pipefail
script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ $# -gt 0 ]]; then cd -- "$1"; fi
powershell.exe -NoProfile -WindowStyle Hidden -File "$(cygpath -w "$script_dir/Start-Bot-Ranch.ps1")" -Project "$(cygpath -w "$PWD")" </dev/null &

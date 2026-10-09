#!/usr/bin/env bash
set -euo pipefail
# Windows executable: use Git Bash, or WSL with Windows interoperability enabled.
script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$script_dir"
if [[ ! -f "$script_dir/AudioDeck.Companion.exe" ]]; then
  printf '%s\n' 'Audio Deck Companion is missing. Extract the entire companion release first.' >&2
  exit 1
fi
exec "$script_dir/AudioDeck.Companion.exe" "$@"

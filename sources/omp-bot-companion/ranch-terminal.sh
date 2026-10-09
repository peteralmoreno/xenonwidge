#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
binding="$(cygpath -u "$OMP_BOT_BINDING_FILE")"
for ((attempt=0; attempt<100; attempt++)); do
  if [[ -s "$binding" ]]; then break; fi
  sleep 0.1
done
if [[ ! -s "$binding" ]]; then printf '%s\n' 'Bot Ranch could not link this terminal.'; read -r -p 'Press Enter to close.'; exit 1; fi
cd -- "$(cygpath -u "$OMP_BOT_PROJECT")"
if ! command -v omp >/dev/null 2>&1; then printf '%s\n' 'Oh My Pi is not installed or not on PATH.'; read -r -p 'Press Enter to close.'; exit 1; fi
# Keep this shell attached to mintty, so its recorded window remains the one running OMP.
omp_args=(--extension "$OMP_BOT_EXTENSION")
if [[ -n "${OMP_BOT_SESSION_DIR:-}" ]]; then
  omp_args+=(--session-dir "$OMP_BOT_SESSION_DIR")
  if [[ "${OMP_BOT_OPEN_MODE:-resume}" == "resume" ]]; then omp_args+=(--continue); fi
fi
omp "${omp_args[@]}" || result=$?
printf '\n%s\n' 'OMP has exited. This ranch terminal can now close.'
read -r -p 'Press Enter to close.'
exit "${result:-0}"

#!/bin/zsh
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  open http://127.0.0.1:3000
  exit 0
fi
npm start &
prep_pid=$!
trap 'kill $prep_pid 2>/dev/null' EXIT INT TERM
for n in {1..60}; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    open http://127.0.0.1:3000
    wait $prep_pid
    exit $?
  fi
  sleep 1
done
echo "Startup failed. See the output above."
wait $prep_pid

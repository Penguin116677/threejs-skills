#!/usr/bin/env bash
# Resumable render queue. Skips clips that already have an out/<name>.done marker.
# 1080p and vertical run 2 jobs in parallel; 4K runs one at a time (two 4K jobs exceed ~14 GB RAM).
#   setsid nohup bash render-queue.sh > out/render.log 2>&1 &
cd "$(dirname "$0")"
job() {
  local s=$1 r=$2 base
  case $s in A) base=A-blueprint-grid-loop;; B) base=B-hologram-knot-loop;; C) base=C-synthwave-horizon-loop;;
    D) base=D-wireframe-city-buildup;; E) base=E-morph-sphere-loop;; F) base=F-tunnel-warp-loop;; esac
  base=$base-$r
  [ -f "out/$base.done" ] && return 0
  for attempt in 1 2; do
    if node render.mjs --scene "$s" --res "$r" > "out/log-$s-$r.txt" 2>&1; then
      touch "out/$base.done"; echo "OK $s $r $(date +%T)"; return 0
    fi
    echo "FAIL $s $r attempt $attempt $(date +%T) $(tr '\r' '\n' < "out/log-$s-$r.txt" | grep -E 'CRASH|STALL|ERROR|EXCEPTION' | head -1)"
  done
}
export -f job
for pass in "1080p 2" "vertical 2" "4k 1"; do
  set -- $pass
  printf '%s\n' A B C D E F | xargs -P "$2" -I{} bash -c "job {} $1"
done
python3 make-metadata.py
echo "QUEUE FINISHED $(date +%T)"

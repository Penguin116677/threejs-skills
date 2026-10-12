#!/usr/bin/env bash
# Detached render queue with 2 parallel workers (SwiftShader uses ~2 cores per job).
#   setsid nohup bash render-queue.sh > out/render.log 2>&1 &
cd "$(dirname "$0")"
jobs=""
for res in 1080p 4k; do for s in A B C D E F; do
  base=$(node -e "const m={A:'A-blueprint-grid-loop',B:'B-hologram-knot-loop',C:'C-synthwave-horizon-loop',D:'D-wireframe-city-buildup',E:'E-morph-sphere-loop',F:'F-tunnel-warp-loop'};console.log(m['$s'])")
  [ -f "out/$base-$res.done" ] || jobs+="$s:$res "
done; done
echo $jobs | tr ' ' '\n' | xargs -P 2 -I{} bash -c '
  s=${1%%:*}; r=${1##*:}
  if node render.mjs --scene $s --res $r > out/log-$s-$r.txt 2>&1; then
    f=$(grep -o "done [^ ]*" out/log-$s-$r.txt | cut -d" " -f2); touch "out/$f.done"; echo "OK $s $r $(date +%T)"
  else echo "FAIL $s $r $(date +%T)"; fi' _ {}
python3 make-metadata.py
echo "QUEUE FINISHED $(date +%T)"

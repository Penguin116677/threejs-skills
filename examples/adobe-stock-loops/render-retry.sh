#!/usr/bin/env bash
# Re-renders any horizontal clip without a .done marker, once the other queues are finished.
cd "$(dirname "$0")"
while pgrep -f "render-queue" > /dev/null; do sleep 30; done
for res in 1080p 4k; do for s in A B C D E F; do
  base=$(node -e "const m={A:'A-blueprint-grid-loop',B:'B-hologram-knot-loop',C:'C-synthwave-horizon-loop',D:'D-wireframe-city-buildup',E:'E-morph-sphere-loop',F:'F-tunnel-warp-loop'};console.log(m['$s'])")
  [ -f "out/$base-$res.done" ] && continue
  if node render.mjs --scene $s --res $res > out/log-$s-$res.txt 2>&1; then touch "out/$base-$res.done"; echo "OK $s $res (retry) $(date +%T)"
  else echo "FAIL $s $res (retry) $(date +%T)"; fi
done; done
python3 make-metadata.py
echo "RETRY FINISHED $(date +%T)"

#!/usr/bin/env bash
# One-command pipeline: render both deliverables -> encode -> QC -> contact sheets.
#   bash scripts/build-all.sh                     # native 3840x2160 masters
#   WIDTH=1280 HEIGHT=720 bash scripts/build-all.sh   # fast development preview
# Extra scene parameters are forwarded, e.g. PARAMS="--preset violet-shift" or
# PARAMS="--param hue=25 --param seed=11".
set -euo pipefail
cd "$(dirname "$0")/.."
W=${WIDTH:-3840}
H=${HEIGHT:-2160}
WORKERS=${WORKERS:-3}
PARAMS=${PARAMS:-}
PRESET=default
if [[ "$PARAMS" =~ --preset[[:space:]=]+([A-Za-z0-9_-]+) ]]; then PRESET="${BASH_REMATCH[1]}"; fi
SUFFIX=$([ "$PRESET" = default ] && echo "" || echo "_$PRESET")
LOOP="holographic-ai-core_loop${SUFFIX}_${W}x${H}"
STORY="holographic-ai-core_story${SUFFIX}_${W}x${H}"
COPY_SIDE=left
[[ "$PARAMS" == *"composition=left"* || "$PRESET" == hero-left || "$PRESET" == violet-shift ]] && COPY_SIDE=right
[[ "$PARAMS" == *"composition=center"* || "$PRESET" == centered-wide || "$PRESET" == macro-close ]] && COPY_SIDE=none

# --extra renders frame N (t = T) as well: used to prove the loop/handoff is exact.
node scripts/render.mjs --mode loop  --width "$W" --height "$H" --workers "$WORKERS" --extra $PARAMS
node scripts/render.mjs --mode story --width "$W" --height "$H" --workers "$WORKERS" --extra $PARAMS

node scripts/encode.mjs --mode loop  --width "$W" --height "$H" --preview $PARAMS
node scripts/encode.mjs --mode story --width "$W" --height "$H" --preview $PARAMS

mkdir -p output/qc
python3 scripts/qc.py --frames "output/$LOOP/frames" --video "output/video/${LOOP}_h264.mp4" \
  --loop --expect-size "${W}x${H}" --copy-side "$COPY_SIDE" \
  --handoff "output/$STORY/frames/frame_00479.png" --report "output/qc/${LOOP}.json"
python3 scripts/qc.py --frames "output/$STORY/frames" --video "output/video/${STORY}_h264.mp4" \
  --story --expect-size "${W}x${H}" --copy-side "$COPY_SIDE" --report "output/qc/${STORY}.json"

for N in "$LOOP" "$STORY"; do
  F="output/$N/frames"
  python3 scripts/contact_sheet.py "output/qc/${N}_contact.jpg" \
    $F/frame_00000.png $F/frame_00045.png $F/frame_00090.png $F/frame_00150.png $F/frame_00210.png \
    $F/frame_00270.png $F/frame_00330.png $F/frame_00405.png $F/frame_00479.png --cols 3 --width 640
done
echo "All deliverables in output/video, QC reports in output/qc"

#!/usr/bin/env bash
# Loop & continuity check on the rendered PNG sequence (needs only ffmpeg).
#   bash tools/check-loop.sh [frames_dir]
# 1) frame_00000 vs loopcheck_T (t = 15 s) → should be identical (PSNR "inf" or > 50 dB)
# 2) seam: frame_00449 → frame_00000 compared with ordinary neighbours (PSNR should be similar)
set -euo pipefail
IN="${1:-frames}"
N=$(ls "$IN"/frame_*.png | wc -l)
LAST=$(printf "%05d" $((N - 1)))
psnr() { ffmpeg -hide_banner -loglevel info -i "$1" -i "$2" -lavfi "[0][1]psnr" -f null - 2>&1 | grep -o 'average:[^ ]*' | cut -d: -f2; }

if [ -f "$IN/loopcheck_T.png" ]; then
  echo "identity  t=0 vs t=T          : PSNR $(psnr "$IN/frame_00000.png" "$IN/loopcheck_T.png") dB  (inf / >50 = identical)"
fi
echo "seam      f$LAST → f00000       : PSNR $(psnr "$IN/frame_$LAST.png" "$IN/frame_00000.png") dB"
for n in 50 150 250 350; do
  a=$(printf "%05d" $n); b=$(printf "%05d" $((n + 1)))
  echo "reference f$a → f$b       : PSNR $(psnr "$IN/frame_$a.png" "$IN/frame_$b.png") dB"
done
echo "Seam PSNR should sit inside the range of the reference pairs (higher = smaller change)."

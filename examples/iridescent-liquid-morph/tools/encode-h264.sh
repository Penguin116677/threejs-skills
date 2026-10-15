#!/usr/bin/env bash
# Encode the PNG sequence to an Adobe-Stock-friendly H.264 MP4 (and optional ProRes master).
#   bash tools/encode-h264.sh [frames_dir] [output.mp4]
# Works on desktop Linux/macOS/WSL and in Termux (pkg install ffmpeg).
set -euo pipefail
IN="${1:-frames}"
OUT="${2:-iridescent-liquid-morph_1920x1080_30fps.mp4}"
FPS=30

[ -f "$IN/frame_00000.png" ] || { echo "No $IN/frame_00000.png — render frames first."; exit 1; }
COUNT=$(ls "$IN"/frame_*.png | wc -l)
echo "Encoding $COUNT frames from $IN → $OUT"

# scale: SSAA downsample (3840→1920) with lanczos + RGB→YUV with the BT.709 matrix, limited range.
VF="scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p"

ffmpeg -hide_banner -y -framerate $FPS -i "$IN/frame_%05d.png" \
  -vf "$VF" -c:v libx264 -preset slow -crf 14 -profile:v high -level:v 4.2 \
  -g $FPS -bf 2 -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -r $FPS -an -movflags +faststart "$OUT"

if [ "${PRORES:-0}" = "1" ]; then
  MOV="${OUT%.mp4}_prores422hq.mov"
  ffmpeg -hide_banner -y -framerate $FPS -i "$IN/frame_%05d.png" \
    -vf "scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv422p10le" \
    -c:v prores_ks -profile:v 3 -vendor apl0 -pix_fmt yuv422p10le \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -an "$MOV"
  echo "ProRes master: $MOV"
fi

ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_primaries,nb_frames \
  -show_entries format=duration,size -of default=nw=1 "$OUT"

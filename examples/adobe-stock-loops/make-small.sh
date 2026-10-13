#!/usr/bin/env bash
# Small H.264 copies (≈27 MB each, under a 30 MiB transfer limit) from the ProRes masters.
# 2-pass at 10.5 Mbit/s; 20 s × 10.5 Mbit/s ≈ 26 MB + container overhead.
cd "$(dirname "$0")/out"; mkdir -p small
enc() {
  f=$1; o=small/${f%.mov}.mp4; [ -f "$o" ] && return
  common=(-c:v libx264 -preset slow -profile:v high -b:v 10500k -maxrate 14000k -bufsize 21000k -pix_fmt yuv420p
          -color_primaries bt709 -color_trc bt709 -colorspace bt709 -an)
  ffmpeg -v error -y -i "$f" "${common[@]}" -pass 1 -passlogfile "small/$f" -f null - &&
  ffmpeg -v error -y -i "$f" "${common[@]}" -pass 2 -passlogfile "small/$f" -movflags +faststart "$o.tmp.mp4" &&
  mv "$o.tmp.mp4" "$o" && rm -f "small/$f"*.log* && echo "OK $o $(du -m "$o" | cut -f1)MB"
}
export -f enc
ls *.mov | xargs -P 2 -I{} bash -c 'enc {}'
echo "SMALL FINISHED"

#!/usr/bin/env bash
# Native 1080x1920 renders (2 parallel workers). Waits for render-queue.sh to finish first.
#   setsid nohup bash render-queue-vertical.sh > out/render-vertical.log 2>&1 &
cd "$(dirname "$0")"
while pgrep -f "bash render-queue.sh" > /dev/null; do sleep 30; done
echo "start $(date +%T)"
printf '%s\n' A B C D E F | xargs -P 2 -I{} bash -c '
  s=$1
  if node render.mjs --scene $s --res vertical > out/log-$s-vertical.txt 2>&1; then echo "OK $s vertical $(date +%T)"
  else echo "FAIL $s vertical $(date +%T)"; fi' _ {}
python3 make-metadata.py
echo "VERTICAL FINISHED $(date +%T)"

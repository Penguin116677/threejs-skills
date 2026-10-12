#!/usr/bin/env bash
# Renders every clip at 1080p, then at DCI 4K. Usage: bash render-all.sh [1080p|4k ...]
set -euo pipefail
cd "$(dirname "$0")"
RES=("${@:-1080p 4k}")
for res in ${RES[@]}; do
  for s in A B C D E F; do
    node render.mjs --scene "$s" --res "$res"
  done
done
python3 make-metadata.py

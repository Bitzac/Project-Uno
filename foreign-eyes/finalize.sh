#!/usr/bin/env bash
# 拼接分段 + 胶片颗粒 + 响度标准化（-16 LUFS）-> foreign-eyes.mp4
set -euo pipefail
cd "$(dirname "$0")"
ls build/seg_*.mp4 | sort -V | sed "s#^build/#file '#; s#\$#'#" > build/segs.txt
ffmpeg -y -hide_banner -loglevel warning -stats \
  -f concat -safe 0 -i build/segs.txt -i build/mix.wav \
  -filter_complex "[0:v]noise=alls=5:allf=t,format=yuv420p[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -crf 21 -profile:v high -tune film -g 60 \
  -c:a aac -b:a 224k -movflags +faststart -shortest \
  -metadata title="他者之眼 · Through Foreign Eyes" \
  foreign-eyes.mp4
ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate -of compact foreign-eyes.mp4

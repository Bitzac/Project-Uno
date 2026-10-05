#!/usr/bin/env bash
# 拼接分段 + 淡入淡出 + 配乐（沿用 samba-dance 的桑巴配乐，两遍响度标准化 -14 LUFS）-> factory-samba.mp4
set -euo pipefail
cd "$(dirname "$0")"
MUSIC=../samba-dance/build/music.wav
ls build/seg_*.mp4 | sort -V | sed "s#^build/#file '#; s#\$#'#" > build/segs.txt
M=$(ffmpeg -hide_banner -nostats -i $MUSIC -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
val() { python3 -c "import json,sys; print(json.loads(sys.argv[1])['$1'])" "$M"; }
LN="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true"
ffmpeg -y -hide_banner -loglevel warning -stats \
  -f concat -safe 0 -i build/segs.txt -i $MUSIC \
  -filter_complex "[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st=29.25:d=0.75,format=yuv420p[v];[1:a]$LN,aresample=48000[a]" \
  -map "[v]" -map "[a]" -t 30 \
  -c:v libx264 -preset slow -crf 18 -profile:v high -g 120 \
  -c:a aac -b:a 192k -movflags +faststart \
  -metadata title="工厂桑巴 · Factory Samba" \
  factory-samba.mp4
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of compact factory-samba.mp4

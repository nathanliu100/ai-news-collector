#!/bin/bash
# nearby 媒体压缩 + 上传 Cloudflare R2
# 用法:
#   ./scripts/r2-upload.sh <本地文件> [远程文件名]
# 示例:
#   ./scripts/r2-upload.sh ~/Desktop/chen-post.png            # 自动压缩并传，远程名=原名
#   ./scripts/r2-upload.sh ~/Desktop/big-video.mov clip01.mp4 # 指定远程名
#
# 依赖: sips(系统自带) / ffmpeg(brew install ffmpeg) / wrangler(已装)
# 需要环境变量（首次配一次）:
#   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, R2_BUCKET
#   见同目录 r2.env.example
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/r2.env" ] && source "$SCRIPT_DIR/r2.env"

WRANGLER="/Users/nate/.workbuddy/binaries/node/workspace/node_modules/.bin/wrangler"
R2_PREFIX="nearby/"            # 远程统一放 nearby/ 目录
IMG_MAX=1280                   # 信息流配图最长边
IMG_QUALITY=82                 # JPEG 质量
VIDEO_CRF=28                   # 视频压缩率（越大越小，23~30 合理）
VIDEO_MAXW=1080                # 视频最大宽

SRC="${1:?用法: r2-upload.sh <本地文件> [远程文件名]}"
[ -f "$SRC" ] || { echo "找不到文件: $SRC"; exit 1; }

ext="${SRC##*.}"; ext="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"
base="$(basename "${2:-$SRC}")"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

case "$ext" in
  jpg|jpeg|png|heic|webp)
    out="$tmp/${base%.*}.jpg"
    echo "▶ 压缩图片 (最长边 ${IMG_MAX}px, 质量 ${IMG_QUALITY})..."
    sips -Z "$IMG_MAX" -s format jpeg -s formatOptions "$IMG_QUALITY" "$SRC" --out "$out" >/dev/null
    remote="${base%.*}.jpg"
    ;;
  mp4|mov|m4v|webm)
    out="$tmp/${base%.*}.mp4"
    echo "▶ 压缩视频 (H.264 CRF ${VIDEO_CRF}, 最大宽 ${VIDEO_MAXW})..."
    ffmpeg -i "$SRC" -vf "scale='min(${VIDEO_MAXW},iw)':-2" -c:v libx264 -crf "$VIDEO_CRF" \
      -preset slow -c:a aac -b:a 128k -movflags +faststart -y "$out" >/dev/null 2>&1
    remote="${base%.*}.mp4"
    ;;
  *) echo "不支持的格式: .$ext"; exit 1;;
esac

obefore=$(du -h "$SRC" | cut -f1); oafter=$(du -h "$out" | cut -f1)
echo "  原始 $obefore → 压缩后 $oafter"

: "${CLOUDFLARE_ACCOUNT_ID:?请先在 scripts/r2.env 配 CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_API_TOKEN:?请先在 scripts/r2.env 配 CLOUDFLARE_API_TOKEN}"
: "${R2_BUCKET:?请先在 scripts/r2.env 配 R2_BUCKET}"

key="${R2_PREFIX}${remote}"
echo "▶ 上传到 R2: $R2_BUCKET/$key ..."
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
  "$WRANGLER" r2 object put "$R2_BUCKET/$key" --file "$out" --remote

echo "✅ 完成。在 feed JSON 里这样引用（image 或 video 字段填）:"
echo "   $remote"
echo "   （mediaBase 已指向 R2 nearby/，所以只写文件名即可）"

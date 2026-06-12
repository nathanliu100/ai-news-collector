#!/usr/bin/env python3
"""
nearby 媒体压缩 + 上传 Cloudflare R2（S3 兼容 API，直连，不依赖 wrangler）

用法:
    python3 scripts/r2_upload.py <本地文件> [远程文件名]

示例:
    python3 scripts/r2_upload.py ~/Desktop/chen-post.png
    python3 scripts/r2_upload.py ~/Desktop/clip.mov clip01.mp4

依赖:
    - boto3 (venv: /Users/nate/.workbuddy/binaries/python/envs/default)
    - sips (系统自带, 图片压缩)
    - ffmpeg (/opt/homebrew/bin/ffmpeg, 视频压缩)
凭证:
    读取同目录 r2.env (KEY=VALUE)，需含:
      R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE
"""
import os, sys, subprocess, tempfile, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
R2_PREFIX = "nearby/"        # 远程统一目录
IMG_MAX = 1280               # 图片最长边
IMG_QUALITY = 82             # JPEG 质量
VIDEO_CRF = 28               # 视频压缩率(越大越小)
VIDEO_MAXW = 1080            # 视频最大宽
FFMPEG = "/opt/homebrew/bin/ffmpeg"

def load_env():
    p = os.path.join(HERE, "r2.env")
    if not os.path.exists(p):
        sys.exit(f"❌ 缺少凭证文件 {p}（复制 r2.env.example 为 r2.env 并填写）")
    env = {}
    for line in open(p):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    for k in ("R2_ACCOUNT_ID","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","R2_BUCKET","R2_PUBLIC_BASE"):
        if not env.get(k):
            sys.exit(f"❌ r2.env 缺少 {k}")
    return env

def human(n):
    for u in ("B","KB","MB","GB"):
        if n < 1024: return f"{n:.1f}{u}"
        n /= 1024
    return f"{n:.1f}TB"

def compress(src, remote_name, tmp):
    ext = src.rsplit(".",1)[-1].lower() if "." in src else ""
    stem = os.path.splitext(os.path.basename(remote_name or src))[0]
    if ext in ("jpg","jpeg","png","heic","webp","tif","tiff"):
        out = os.path.join(tmp, stem + ".jpg")
        print(f"▶ 压缩图片 (最长边 {IMG_MAX}px / JPEG q{IMG_QUALITY})")
        subprocess.run(["sips","-Z",str(IMG_MAX),"-s","format","jpeg",
                        "-s","formatOptions",str(IMG_QUALITY),src,"--out",out],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return out, stem + ".jpg", "image/jpeg"
    if ext in ("mp4","mov","m4v","webm","avi","mkv"):
        out = os.path.join(tmp, stem + ".mp4")
        print(f"▶ 压缩视频 (H.264 CRF{VIDEO_CRF} / 最大宽 {VIDEO_MAXW} / faststart)")
        subprocess.run([FFMPEG,"-i",src,"-vf",f"scale='min({VIDEO_MAXW},iw)':-2",
                        "-c:v","libx264","-crf",str(VIDEO_CRF),"-preset","slow",
                        "-c:a","aac","-b:a","128k","-movflags","+faststart","-y",out],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return out, stem + ".mp4", "video/mp4"
    sys.exit(f"❌ 不支持的格式: .{ext}")

def main():
    if len(sys.argv) < 2:
        sys.exit("用法: r2_upload.py <本地文件> [远程文件名]")
    src = os.path.expanduser(sys.argv[1])
    remote_arg = sys.argv[2] if len(sys.argv) > 2 else None
    if not os.path.isfile(src):
        sys.exit(f"❌ 找不到文件: {src}")

    env = load_env()
    import boto3
    from botocore.config import Config

    tmp = tempfile.mkdtemp()
    try:
        out, remote_name, ctype = compress(src, remote_arg, tmp)
        sb, sa = os.path.getsize(src), os.path.getsize(out)
        print(f"  {human(sb)} → {human(sa)}  (省 {100*(1-sa/sb):.0f}%)")

        key = R2_PREFIX + remote_name
        s3 = boto3.client("s3",
            endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=env["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4", region_name="auto", proxies={}))
        print(f"▶ 上传 R2: {env['R2_BUCKET']}/{key}")
        with open(out,"rb") as f:
            s3.put_object(Bucket=env["R2_BUCKET"], Key=key, Body=f, ContentType=ctype)

        url = env["R2_PUBLIC_BASE"].rstrip("/") + "/" + key
        print("✅ 上传完成")
        print(f"   公开 URL: {url}")
        print(f"   在 feed JSON 里填: \"{'video' if ctype.startswith('video') else 'image'}\": \"{url}\"")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    main()

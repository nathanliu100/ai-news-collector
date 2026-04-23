#!/bin/bash
# ============================================================
# 企业微信群机器人 - AI 周末特刊推送脚本
# 从 news/YYYY-MM-DD-weekend.md 提取四大板块，轻松风格推送
# ============================================================

set -euo pipefail

# ---------- 配置 ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEWS_DIR="${SCRIPT_DIR}/news"
DATE="${1:-$(date +%Y-%m-%d)}"
NEWS_FILE="${NEWS_DIR}/${DATE}-weekend.md"

# Webhook URL
WECOM_WEBHOOK="${WECOM_WEBHOOK:-}"

if [[ -z "$WECOM_WEBHOOK" ]] && [[ -f "${SCRIPT_DIR}/.env" ]]; then
    source "${SCRIPT_DIR}/.env"
fi

# ---------- 校验 ----------
if [[ -z "$WECOM_WEBHOOK" ]]; then
    echo "❌ 错误：未设置 WECOM_WEBHOOK"
    exit 1
fi

if [[ ! -f "$NEWS_FILE" ]]; then
    echo "❌ 错误：周末特刊文件不存在: ${NEWS_FILE}"
    exit 1
fi

echo "📅 准备推送 ${DATE} 的周末特刊到企业微信..."

VIEWER_URL="https://nathanliu100.github.io/ai-news-collector/"
# UTM 参数：企微渠道 · 周末特刊
VIEWER_URL_UTM="${VIEWER_URL}?utm_source=wecom&utm_medium=bot&utm_campaign=weekend"

# ---------- 提取内容 ----------

# 提取「八卦」板块（每条 ☕ 开头的行）
GOSSIP=$(awk '
    /^## ☕/ { found=1; next }
    found && /^---$/ { exit }
    found && /^## / { exit }
    found && /^☕/ { print }
' "$NEWS_FILE" | sed 's/\*\*//g; s/☕ /· /g' | head -3)

# 提取「工具」板块（每条 🎮 开头的行，只取工具名和链接）
TOOLS=$(awk '
    /^## 🎮/ { found=1; next }
    found && /^---$/ { exit }
    found && /^## / { exit }
    found && /^🎮/ { print }
' "$NEWS_FILE" | sed 's/\*\*//g' | head -3)

# 提取「大问题」标题（H2 后的第一行有实质内容）
BIG_Q_TITLE=$(awk '
    /^## 🔭/ { found=1; next }
    found && /^---$/ { exit }
    found && /^## / { exit }
    found && /^$/ { next }
    found && NF { print; exit }
' "$NEWS_FILE" | sed 's/\*\*//g' | head -c 100)

# ---------- 构建消息 ----------
MESSAGE="# 📅 AI 周末特刊 · ${DATE}

## ☕ 本周八卦
${GOSSIP:-暂无}

## 🎮 周末试试这几个
${TOOLS:-暂无}

## 🔭 本周大问题
${BIG_Q_TITLE:-暂无}

[📖 查看完整特刊 →](${VIEWER_URL_UTM})"

# ---------- 发送 ----------
PAYLOAD=$(cat <<EOF
{
    "msgtype": "markdown",
    "markdown": {
        "content": $(echo "$MESSAGE" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
    }
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$WECOM_WEBHOOK")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
    ERRCODE=$(echo "$BODY" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('errcode','-1'))" 2>/dev/null || echo "-1")
    if [[ "$ERRCODE" == "0" ]]; then
        echo "✅ 周末特刊推送成功！"
    else
        echo "⚠️ 企微返回错误：${BODY}"
        exit 1
    fi
else
    echo "❌ HTTP 请求失败 (${HTTP_CODE}): ${BODY}"
    exit 1
fi

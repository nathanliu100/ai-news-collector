#!/bin/bash
# ============================================================
# 企业微信群机器人 - AI 每日新闻推送脚本
# 从 news/YYYY-MM-DD.md 提取「今日必看」摘要，推送到企微群
# v2: + 锚点链接 + 编辑推荐一句话
# ============================================================

set -euo pipefail

# ---------- 配置 ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEWS_DIR="${SCRIPT_DIR}/news"
DATE="${1:-$(date +%Y-%m-%d)}"
NEWS_FILE="${NEWS_DIR}/${DATE}.md"

# Webhook URL（从环境变量读取，或使用配置文件）
WECOM_WEBHOOK="${WECOM_WEBHOOK:-}"

# 如果环境变量为空，尝试从 .env 文件读取
if [[ -z "$WECOM_WEBHOOK" ]] && [[ -f "${SCRIPT_DIR}/.env" ]]; then
    source "${SCRIPT_DIR}/.env"
fi

# ---------- 校验 ----------
if [[ -z "$WECOM_WEBHOOK" ]]; then
    echo "❌ 错误：未设置 WECOM_WEBHOOK"
    echo "   方法1：export WECOM_WEBHOOK='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY'"
    echo "   方法2：在 ${SCRIPT_DIR}/.env 中添加 WECOM_WEBHOOK=..."
    exit 1
fi

if [[ ! -f "$NEWS_FILE" ]]; then
    echo "❌ 错误：新闻文件不存在: ${NEWS_FILE}"
    exit 1
fi

echo "📰 准备推送 ${DATE} 的新闻到企业微信..."

# ---------- 配置 ----------
VIEWER_URL="https://nathanliu100.github.io/ai-news-collector/"

# ---------- 提取内容 ----------

# 提取标题行的统计数据
STATS_LINE=$(grep -m1 '今日共收集\|Today.*collection' "$NEWS_FILE" || echo "")

# 提取「今日必看」/「Today's Must-Read」板块，带序号用于生成锚点
MUST_READ=$(awk '
    /^## ⚡/ { found=1; next }
    found && /^---$/ { exit }
    found && /^## / { exit }
    found { print }
' "$NEWS_FILE" | sed '/^$/d')

# 计算今日新闻总 H3 数（用于锚点编号对齐检查）
TOTAL_H3=$(grep -c '^### ' "$NEWS_FILE" || echo "0")

# 提取「数据快照」表格内容
DATA_SNAPSHOT=$(awk '
    /^## 📊/ { found=1; next }
    found && /^---$/ { exit }
    found && /^## / { exit }
    found && /^\|.*\|$/ { print }
' "$NEWS_FILE" | grep -v '^|[-—]' | grep -v '指标.*数值\|Metric.*Value' | sed 's/|//g; s/^[[:space:]]*//; s/[[:space:]]*$//' | sed '/^$/d')

# 提取「编辑观察」
EDITOR_NOTE=$(awk '
    /^## 🔭/ { found=1; next }
    found && /^---$/ { exit }
    found && /^## / { exit }
    found && /^>/ { gsub(/^>[[:space:]]*/, ""); print }
' "$NEWS_FILE")

# ---------- 构建消息 (v2: 带锚点链接) ----------

# 格式化今日必看：去掉 Markdown 加粗，每条追加锚点链接
# 必看板块条目对应的 #news-N 编号需要匹配：
# 必看条目通常是全文 H3 中的前几条，按出现顺序编号
MUST_READ_WITH_LINKS=""
LINE_NUM=0
while IFS= read -r line; do
    # 只处理有序列表项（1. 2. 3. ...）
    if echo "$line" | grep -qE '^[0-9]+\.'; then
        LINE_NUM=$((LINE_NUM + 1))
        # 去掉加粗标记
        cleaned=$(echo "$line" | sed 's/\*\*//g')
        # 追加锚点链接（企微 markdown 支持 [text](url) 格式）
        MUST_READ_WITH_LINKS="${MUST_READ_WITH_LINKS}${cleaned} [📖 详情](${VIEWER_URL}#news-${LINE_NUM})
"
    else
        MUST_READ_WITH_LINKS="${MUST_READ_WITH_LINKS}${line}
"
    fi
done <<< "$MUST_READ"

# 格式化数据快照为紧凑行
SNAPSHOT_LINE=""
if [[ -n "$DATA_SNAPSHOT" ]]; then
    SNAPSHOT_LINE=$(echo "$DATA_SNAPSHOT" | head -5 | while IFS= read -r line; do
        cleaned=$(echo "$line" | sed 's/[[:space:]]\{2,\}/ /g; s/^[[:space:]]*//; s/[[:space:]]*$//')
        echo "  ${cleaned}"
    done)
fi

# 截取编辑观察前200字
if [[ -n "$EDITOR_NOTE" ]]; then
    EDITOR_SHORT=$(echo "$EDITOR_NOTE" | head -c 200)
    if [[ ${#EDITOR_NOTE} -gt 200 ]]; then
        EDITOR_SHORT="${EDITOR_SHORT}..."
    fi
fi

# 构建最终消息
MESSAGE="# 🗞️ AI 每日新闻速递 - ${DATE}
${STATS_LINE:+> ${STATS_LINE//> /}}

## ⚡ 今日必看
${MUST_READ_WITH_LINKS}
📊 **数据快照**
${SNAPSHOT_LINE:-暂无}

🔭 **编辑观察**
${EDITOR_SHORT:-暂无}

[📖 查看完整快报 →](${VIEWER_URL})"

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
        echo "✅ 推送成功！消息已发送到企业微信群"
        echo "   📌 今日必看含 ${LINE_NUM} 条锚点链接"
    else
        echo "⚠️ 企微返回错误：${BODY}"
        exit 1
    fi
else
    echo "❌ HTTP 请求失败 (${HTTP_CODE}): ${BODY}"
    exit 1
fi

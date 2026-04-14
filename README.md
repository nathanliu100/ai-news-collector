# AI Daily Briefing 🗞️

每日 AI 新闻自动收集 + 结构化整理，由 WorkBuddy Automation 驱动。

## 🔗 在线查看

**GitHub Pages**: [点击查看](https://nathanliu100.github.io/ai-news-collector/)

## 功能

- 📰 每日自动收集 8 大分类 AI 新闻
- 🔴🟡🟢 重要性分级 + 过滤
- 💎 部门关联标记（游戏多媒体设计）
- 🎯 重点设计工具追踪
- 🐦 X/KOL 动态聚合
- 📱 响应式设计，支持浅色/深色模式
- 💬 企业微信群自动推送「今日必看」摘要

## 分类

1. 🧪 模型发布 & 更新
2. 🎨 AI + 设计
3. 🎮 AI + 游戏
4. 📈 AI 市场动态
5. 🛠️ AI 工具 & 产品
6. 🔮 未来趋势
7. 🇨🇳 国内 AI 动态
8. 💡 AI 效率技巧

## 💬 企业微信推送

每日新闻收集完成后，自动推送「⚡ 今日必看」摘要到企业微信群。

### 配置

1. 在企业微信群 → 右上角 → 添加群机器人 → 复制 Webhook 地址
2. 编辑 `.env` 文件，填入 Webhook URL：
   ```
   WECOM_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
   ```

### 使用

```bash
# 推送今天的新闻
./notify-wecom.sh

# 推送指定日期
./notify-wecom.sh 2026-04-02
```

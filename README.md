# 🦞 企业微信助手 WeCom Helper

> ✅ **官方 API 支持，合规自动化，无封号风险**

![版本](https://img.shields.io/badge/版本 -1.0.0-blue)
![许可](https://img.shields.io/badge/许可-MIT-green)
![合规](https://img.shields.io/badge/合规 -✅ 企业微信官方 API-success)
![平台](https://img.shields.io/badge/平台 -macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)

---

## ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 🤖 **自动回复** | 关键词匹配，智能回复客户咨询 |
| 👤 **人工介入** | 自动检测，一键转接人工客服 |
| 📝 **话术管理** | 术语解释、禁用词过滤、客户专属配置 |
| 🛡️ **频率控制** | 内置速率限制，符合平台规范 |
| 📊 **会话管理** | 超时检测、情绪分析、历史记录 |

---

## 🚀 快速开始

### 安装

```bash
npx clawhub@latest install wecom-helper
```

### 配置

#### 1. 获取企业微信凭证

登录 [企业微信管理后台](https://work.weixin.qq.com)：
1. 创建自建应用
2. 获取 `CorpID`、`Secret`、`AgentID`

#### 2. 编辑配置文件

```bash
cd ~/.openclaw/skills/wecom-helper
nano config.json
```

填写你的企业微信配置：
```json
{
  "wecom": {
    "corpId": "wwXXXXXXXXXXXXXX",
    "agentId": "1000001",
    "secret": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

#### 3. 配置回调 URL

在企业微信管理后台设置：
```
http://你的服务器 IP:3000/wecom/callback
```

#### 4. 启动服务

```bash
node index.js
```

---

## 🎯 人工介入机制

### 自动触发条件

| 条件 | 示例 | 处理方式 |
|------|------|---------|
| **用户请求** | "转人工"、"客服" | 立即通知人工 |
| **负面情绪** | "垃圾"、"骗子"、"投诉" | 立即通知人工 |
| **超时未解决** | 300 秒未解决问题 | 自动升级 |
| **无匹配规则** | 无法自动回复 | 转人工 |
| **客户特殊要求** | 禁止讨论价格 | 按配置处理 |

### 通知方式

```json
{
  "humanHandoff": {
    "notifyMethods": ["webhook", "message"],
    "agents": [
      {
        "name": "客服小王",
        "userId": "wangqiongzl",
        "phone": "138****8888",
        "available": true
      }
    ]
  }
}
```

### 工作流程

```
用户：我要转人工
   │
   ▼
检测到"人工"关键词
   │
   ▼
1. 标记会话为"已请求人工"
2. 通知客服（Webhook + 企业微信消息）
3. 回复用户："已为您转接人工客服，请稍候"
   │
   ▼
客服接入处理
```

---

## 📝 话术管理

### 术语自动解释

```json
{
  "terminology": {
    "SaaS": "软件即服务（Software as a Service）",
    "API": "应用程序接口",
    "ROI": "投资回报率"
  }
}
```

**效果**：
- 用户问："你们 SaaS 怎么收费？"
- 自动回复："我们的软件即服务（Software as a Service）产品..."

### 禁用词过滤（广告法合规）

```json
{
  "forbiddenWords": {
    "最便宜": "性价比高",
    "最好": "优质",
    "第一": "领先",
    "绝对": "非常",
    "100%": "很高",
    "保证": "致力于"
  }
}
```

### 客户专属配置

```json
{
  "clientSpecific": {
    "client_001": {
      "name": "XX 公司",
      "greeting": "尊敬的 XX 公司客户，您好！",
      "forbiddenTopics": ["价格", "竞品"],
      "escalationLevel": "high"
    }
  }
}
```

---

## ⚙️ 高级配置

### 自动回复规则

```json
{
  "autoReplies": {
    "price": {
      "keywords": ["价格", "多少钱", "费用"],
      "reply": "您好！产品价格根据需求定制，请提供具体需求。",
      "priority": 2
    }
  }
}
```

### 频率限制

```json
{
  "rateLimit": {
    "messagesPerSecond": 5,
    "messagesPerMinute": 100,
    "messagesPerHour": 2000
  }
}
```

---

## 📋 合规性

✅ **完全合规，可商用**

- 使用企业微信官方 API
- 符合《网络安全法》《数据安全法》
- 内置广告法禁用词过滤
- 数据本地存储

详见 [COMPLIANCE_REPORT.md](COMPLIANCE_REPORT.md)

---

## 💰 商业模式

| 模式 | 说明 | 价格建议 |
|------|------|---------|
| **免费开源** | 积累用户和口碑 | 免费 |
| **企业定制** | 根据需求定制开发 | ¥5,000-50,000/单 |
| **SaaS 托管** | 提供托管服务 | ¥500-5,000/月 |
| **技能培训** | 教别人部署使用 | ¥999-2,999/人 |

---

## 🤝 技术支持

**作者**: 光锥科技实验室  
**邮箱**: contact@lightconelab.tech（待设置）  
**GitHub**: [仓库链接]

---

## 📄 许可

MIT License

**商用声明**: 本软件可自由用于商业用途，无需支付授权费。

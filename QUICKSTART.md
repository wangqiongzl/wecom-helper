# WeCom Helper - 5 分钟快速开始

## 🚀 第一步：安装依赖

```bash
cd /path/to/wecom-helper
npm install
```

## 📝 第二步：配置企业微信

### 1. 获取企业微信凭证

登录 [企业微信管理后台](https://work.weixin.qq.com/)：

1. 进入「应用管理」→「自建」→「创建应用」
2. 记录以下信息：
   - **企业 ID**（在企业信息里）
   - **应用 AgentId**
   - **应用 Secret**

### 2. 编辑配置文件

```bash
# 复制示例配置
cp config.example.json config.json

# 编辑配置
vim config.json
```

填写你的企业微信信息：

```json
{
  "wecom": {
    "corpId": "ww1234567890abcdef",
    "agentId": "1000001",
    "secret": "abcdefg1234567890"
  }
}
```

## ✅ 第三步：测试运行

```bash
# 运行测试
node test.js

# 如果看到 "✅ 所有测试通过"，说明配置正确
```

## ▶️ 第四步：启动服务

```bash
# 启动企业微信助手
node index.js
```

看到以下输出表示成功启动：

```
╔════════════════════════════════════════════════════╗
║  ✅ 企业微信官方 API - 合规自动化                  ║
╠════════════════════════════════════════════════════╣
║  企业 ID: ww1234567890abcdef                       ║
║  应用 ID: 1000001                                  ║
║  自动回复规则：5 条                                ║
║  人工客服：2 人                                    ║
╚════════════════════════════════════════════════════╝

🌐 回调服务器运行在 http://localhost:8899/wecom/callback
```

## 🔧 第五步：配置回调 URL（可选）

如需接收客户消息，在企业微信管理后台配置：

1. 进入「应用管理」→ 你的应用 →「接收消息」
2. 启用「API 接收消息」
3. 填写：
   - **URL**: `http://你的服务器 IP:8899/wecom/callback`
   - **Token**: 自定义（需与 config.json 一致）
   - **EncodingAESKey**: 随机生成（需与 config.json 一致）
4. 保存

## 🎉 完成！

现在你的企业微信客服机器人已经运行了！

### 测试自动回复

用企业微信给客户发消息：
- 发送 "你好" → 应该收到欢迎消息
- 发送 "多少钱" → 应该收到价格说明
- 发送 "转人工" → 应该触发人工客服通知

---

## 🆘 遇到问题？

### 查看日志

```bash
# 实时查看日志
tail -f logs/wecom-helper.log
```

### 运行诊断

```bash
# 检查配置
node index.js --check-config

# 测试回复匹配
node index.js --test-reply "你好"
```

### 常见问题

详见 [TESTING.md](./TESTING.md) 故障排查章节。

---

## 📚 下一步

- [完整文档](./README.md) - 所有功能说明
- [测试指南](./TESTING.md) - 测试和 Debug
- [合规报告](./COMPLIANCE_REPORT.md) - 法律合规性说明

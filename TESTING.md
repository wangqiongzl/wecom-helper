# WeCom Helper - 测试指南

## 🧪 测试模式

### 快速测试（无需企业微信配置）

```bash
# 1. 测试配置加载
node index.js --test-config

# 2. 测试自动回复匹配
node index.js --test-reply "你好，请问价格怎么算？"

# 3. 测试术语替换
node index.js --test-terminology "我们的 SaaS 产品 ROI 很高"

# 4. 测试人工触发检测
node index.js --test-handoff "我要投诉，转人工"
```

### 完整测试（需企业微信配置）

```bash
# 1. 初始化测试配置
node index.js --init-test

# 2. 启动测试服务器
node index.js --test

# 3. 发送测试消息（另一个终端）
curl -X POST http://localhost:8899/wecom/callback \
  -H "Content-Type: application/json" \
  -d '{"FromUserName":"test_user","MsgType":"text","Content":"你好"}'
```

---

## 🐛 Debug 模式

### 启用详细日志

```bash
# 设置环境变量
export DEBUG=true
node index.js

# 或在 config.json 中设置
{
  "debug": true
}
```

### 日志级别

| 级别 | 说明 | 输出内容 |
|------|------|----------|
| `error` | 错误 | 仅错误信息 |
| `warn` | 警告 | 错误 + 警告 |
| `info` | 信息 | 错误 + 警告 + 关键操作 |
| `debug` | 调试 | 所有日志（包括 API 请求/响应） |

### 查看日志

```bash
# 实时查看日志
tail -f logs/wecom-helper.log

# 查看错误日志
tail -f logs/error.log

# 搜索特定用户日志
grep "user_123" logs/wecom-helper.log
```

---

## 🔧 故障排查

### 问题 1: 配置加载失败

**错误**: `无法加载配置文件`

**解决**:
```bash
# 1. 检查配置文件是否存在
ls -la config.json

# 2. 生成默认配置
node index.js --init

# 3. 验证 JSON 格式
node -e "console.log(JSON.parse(require('fs').readFileSync('config.json')))"
```

### 问题 2: 获取 Token 失败

**错误**: `获取访问令牌失败：invalid credential`

**解决**:
1. 检查 `config.json` 中的 `corpId`、`agentId`、`secret`
2. 登录企业微信管理后台验证
3. 检查企业微信应用权限

```bash
# 测试 Token 获取
node -e "
const WeComHelper = require('./index.js');
const helper = new WeComHelper();
helper.getAccessToken().then(console.log).catch(console.error);
"
```

### 问题 3: 回调服务器无法启动

**错误**: `EADDRINUSE: address already in use`

**解决**:
```bash
# 1. 检查端口占用
lsof -i :8899

# 2. 更换端口
export WECOM_CALLBACK_PORT=8900
node index.js

# 3. 或在 config.json 中修改
{
  "callback": {
    "port": 8900
  }
}
```

### 问题 4: 自动回复不触发

**排查步骤**:

```bash
# 1. 启用调试模式
export DEBUG=true
node index.js

# 2. 发送测试消息
curl -X POST http://localhost:8899/wecom/callback \
  -H "Content-Type: application/json" \
  -d '{"FromUserName":"test","MsgType":"text","Content":"你好"}'

# 3. 查看日志，确认：
# - 消息是否收到
# - 关键词匹配结果
# - 回复内容
```

### 问题 5: 人工客服未收到通知

**排查**:

1. 检查 webhook URL 是否配置
2. 检查客服人员 `userId` 是否正确
3. 查看通知发送日志

```bash
# 测试 webhook
curl -X POST https://your-webhook-url.com \
  -H "Content-Type: application/json" \
  -d '{"text":"测试通知"}'
```

---

## 📊 性能测试

### 压力测试

```bash
# 使用 Apache Bench 测试
ab -n 1000 -c 10 \
  -H "Content-Type: application/json" \
  -d '{"FromUserName":"test","MsgType":"text","Content":"你好"}' \
  http://localhost:8899/wecom/callback
```

### 响应时间监控

```bash
# 记录每次请求的响应时间
export LOG_RESPONSE_TIME=true
node index.js

# 分析日志
cat logs/wecom-helper.log | grep "响应时间" | awk '{sum+=$3; count++} END {print "平均响应时间:", sum/count, "ms"}'
```

---

## ✅ 上线前检查清单

- [ ] 配置文件已填写正确的企业微信凭证
- [ ] 自动回复规则已配置
- [ ] 人工客服列表已设置
- [ ] Webhook 通知已测试
- [ ] 回调服务器可公网访问（如需）
- [ ] 日志目录有写入权限
- [ ] 已运行 `node index.js --test-all` 通过所有测试
- [ ] 已阅读 COMPLIANCE_REPORT.md 合规报告

---

## 🆘 获取帮助

```bash
# 查看所有命令
node index.js --help

# 查看版本
node index.js --version

# 查看配置状态
node index.js --show-config
```

---

## 📝 反馈问题

遇到问题？请提供以下信息：

1. **错误信息**（完整堆栈）
2. **配置文件**（隐藏敏感信息）
3. **日志片段**（前后各 10 行）
4. **复现步骤**

提交到：https://github.com/wangqiongzl/wecom-helper/issues

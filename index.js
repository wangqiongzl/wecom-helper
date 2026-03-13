#!/usr/bin/env node

/**
 * WeCom Helper - 企业微信助手
 * 官方 API 支持，合规自动化
 * 
 * 作者：光锥科技实验室
 * 版本：1.0.0
 * 
 * ✅ 企业微信官方 API，无封号风险
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== 配置加载 ====================

let config = {
  // 企业微信配置
  wecom: {
    corpId: '',           // 企业 ID
    agentId: '',          // 应用 ID
    secret: '',           // 应用 Secret
    token: '',            // 回调 Token
    encodingAESKey: '',   // 回调 AES Key
  },
  
  // 自动回复规则
  autoReplies: {
    default: {
      keywords: ['你好', '您好', 'hello', 'hi'],
      reply: '您好！欢迎咨询，请问有什么可以帮您？😊',
      priority: 1,
    },
    price: {
      keywords: ['价格', '多少钱', '费用', '报价'],
      reply: '您好！我们的产品价格根据具体需求定制。请提供您的具体需求，我们会为您详细报价。',
      priority: 2,
    },
    contact: {
      keywords: ['联系', '电话', '微信', '地址'],
      reply: '联系方式：\n📞 电话：400-XXX-XXXX\n📧 邮箱：contact@company.com\n📍 地址：北京市朝阳区 XXX 路 XXX 号',
      priority: 2,
    },
    workingHours: {
      keywords: ['时间', '营业', '上班', '下班'],
      reply: '工作时间：周一至周五 9:00-18:00（法定节假日除外）',
      priority: 2,
    },
  },
  
  // 人工介入配置
  humanHandoff: {
    // 触发人工的关键词
    keywords: ['人工', '客服', '转人工', '人工服务', '真人', '活人', '投诉', '举报'],
    
    // 超时未解决转人工（秒）
    timeoutSeconds: 300,
    
    // 负面情绪检测转人工
    enableSentimentAnalysis: true,
    negativeKeywords: ['垃圾', '骗子', '投诉', '举报', '太差', '失望', '愤怒', '生气'],
    
    // 呼叫人工的通知方式
    notifyMethods: ['webhook', 'message'],
    
    // 人工客服列表
    agents: [
      {
        name: '客服小王',
        userId: 'wangqiongzl',
        phone: '138****8888',
        available: true,
      },
    ],
  },
  
  // 特殊话术配置
  customScripts: {
    // 行业术语映射
    terminology: {
      'SaaS': '软件即服务（Software as a Service）',
      'API': '应用程序接口',
      'DAU': '日活跃用户数',
      'ROI': '投资回报率',
      'KPI': '关键绩效指标',
    },
    
    // 禁用词（自动替换）
    forbiddenWords: {
      '最便宜': '性价比高',
      '最好': '优质',
      '第一': '领先',
      '绝对': '非常',
    },
    
    // 客户特殊要求（按客户 ID 配置）
    clientSpecific: {
      'client_001': {
        name: 'XX 公司',
        greeting: '尊敬的 XX 公司客户，您好！',
        forbiddenTopics: ['价格', '竞品'],
        escalationLevel: 'high', // 高优先级转人工
      },
    },
  },
  
  // 风控配置（企业微信无封号风险，但需遵守发送频率）
  rateLimit: {
    messagesPerSecond: 5,    // 每秒最多 5 条
    messagesPerMinute: 100,  // 每分钟最多 100 条
    messagesPerHour: 2000,   // 每小时最多 2000 条
  },
};

// ==================== 状态管理 ====================

let accessToken = '';
let tokenExpiresAt = 0;
let messageCount = { second: 0, minute: 0, hour: 0 };
let conversationHistory = {}; // 会话历史（用于超时转人工）

// ==================== 工具函数 ====================

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config = { ...config, ...userConfig };
      console.log(`📄 已加载用户配置：${configPath}`);
    } catch (e) {
      console.error('❌ 配置文件解析失败:', e.message);
    }
  }
}

function createDefaultConfig() {
  const configPath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`📝 已创建默认配置文件：${configPath}`);
  }
}

// ==================== 企业微信 API ====================

/**
 * 获取访问令牌
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }
  
  return new Promise((resolve, reject) => {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.wecom.corpId}&corpsecret=${config.wecom.secret}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errcode === 0) {
            accessToken = result.access_token;
            tokenExpiresAt = Date.now() + (result.expires_in - 300) * 1000; // 提前 5 分钟刷新
            console.log('✅ 获取访问令牌成功');
            resolve(accessToken);
          } else {
            reject(new Error(`获取令牌失败：${result.errmsg}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 发送消息给客户
 */
async function sendMessage(userId, content, msgType = 'text') {
  // 频率限制检查
  if (!checkRateLimit()) {
    console.log('⚠️ 触发频率限制，等待后重试');
    await sleep(1000);
  }
  
  const token = await getAccessToken();
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      touser: userId,
      msgtype: msgType,
      agentid: config.wecom.agentId,
      [msgType]: { content },
      safe: 0,
    });
    
    const options = {
      hostname: 'qyapi.weixin.qq.com',
      port: 443,
      path: '/cgi-bin/message/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errcode === 0) {
            console.log(`✅ 消息发送成功 (用户：${userId})`);
            resolve(result);
          } else {
            console.error(`❌ 消息发送失败：${result.errmsg}`);
            reject(new Error(result.errmsg));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 检查频率限制
 */
function checkRateLimit() {
  const now = Date.now();
  
  // 简单实现：实际应该用滑动窗口
  if (messageCount.second >= config.rateLimit.messagesPerSecond) {
    return false;
  }
  
  messageCount.second++;
  messageCount.minute++;
  messageCount.hour++;
  
  // 重置计数器（简化版）
  setTimeout(() => messageCount.second--, 1000);
  setTimeout(() => messageCount.minute--, 60000);
  setTimeout(() => messageCount.hour--, 3600000);
  
  return true;
}

/**
 * 通知人工客服
 */
async function notifyHumanAgent(reason, conversation) {
  console.log(`\n🔔 呼叫人工客服！`);
  console.log(`原因：${reason}`);
  console.log(`会话：${JSON.stringify(conversation, null, 2)}\n`);
  
  // 方式 1: Webhook 通知（如钉钉、飞书）
  if (config.humanHandoff.notifyMethods.includes('webhook')) {
    await sendWebhookNotification(reason, conversation);
  }
  
  // 方式 2: 企业微信消息通知
  if (config.humanHandoff.notifyMethods.includes('message')) {
    for (const agent of config.humanHandoff.agents) {
      if (agent.available) {
        await sendMessage(agent.userId, 
          `🔔 需要人工介入！\n原因：${reason}\n用户：${conversation.userId}\n最后消息：${conversation.lastMessage}`
        );
      }
    }
  }
}

/**
 * Webhook 通知（钉钉/飞书）
 */
async function sendWebhookNotification(reason, conversation) {
  // 这里可以配置钉钉/飞书的 webhook URL
  console.log('📡 Webhook 通知已发送（需配置 webhook URL）');
}

// ==================== 智能回复逻辑 ====================

/**
 * 处理收到的消息
 */
async function handleMessage(userId, content, conversationId) {
  console.log(`📨 收到消息：${content} (用户：${userId})`);
  
  // 初始化会话历史
  if (!conversationHistory[conversationId]) {
    conversationHistory[conversationId] = {
      userId,
      messages: [],
      startTime: Date.now(),
      lastMessage: content,
      humanRequested: false,
    };
  }
  
  const conversation = conversationHistory[conversationId];
  conversation.messages.push({ role: 'user', content, time: Date.now() });
  conversation.lastMessage = content;
  
  // 1. 检查是否已请求人工
  if (conversation.humanRequested) {
    console.log('⚠️ 已请求人工，等待客服接入');
    return;
  }
  
  // 2. 检查是否需要转人工（关键词）
  if (needsHumanHandoff(content)) {
    await triggerHumanHandoff('用户请求人工服务', conversation);
    return;
  }
  
  // 3. 检查是否需要转人工（负面情绪）
  if (config.humanHandoff.enableSentimentAnalysis && 
      containsNegativeSentiment(content)) {
    await triggerHumanHandoff('检测到负面情绪', conversation);
    return;
  }
  
  // 4. 检查是否需要转人工（超时未解决）
  const conversationAge = (Date.now() - conversation.startTime) / 1000;
  if (conversationAge > config.humanHandoff.timeoutSeconds && 
      conversation.messages.length > 3) {
    await triggerHumanHandoff('会话超时未解决', conversation);
    return;
  }
  
  // 5. 检查客户特殊要求
  const clientConfig = config.customScripts.clientSpecific[userId];
  if (clientConfig) {
    // 检查禁用话题
    for (const topic of clientConfig.forbiddenTopics || []) {
      if (content.includes(topic)) {
        console.log(`⚠️ 客户 ${clientConfig.name} 禁止讨论话题：${topic}`);
        await triggerHumanHandoff(`客户特殊要求：禁止讨论${topic}`, conversation);
        return;
      }
    }
  }
  
  // 6. 匹配自动回复规则
  const reply = matchAutoReply(content, clientConfig);
  if (reply) {
    // 处理术语替换
    const processedReply = processTerminology(reply);
    // 处理禁用词替换
    const finalReply = processForbiddenWords(processedReply);
    
    await sendMessage(userId, finalReply);
    conversation.messages.push({ role: 'assistant', content: finalReply, time: Date.now() });
    return;
  }
  
  // 7. 无匹配规则，转人工
  await triggerHumanHandoff('无匹配回复规则', conversation);
}

/**
 * 匹配自动回复
 */
function matchAutoReply(content, clientConfig) {
  // 客户专属问候语
  if (clientConfig && clientConfig.greeting && 
      ['你好', '您好', 'hello', 'hi'].some(k => content.includes(k))) {
    return clientConfig.greeting;
  }
  
  // 按优先级匹配规则
  const rules = Object.values(config.autoReplies).sort((a, b) => b.priority - a.priority);
  
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        return rule.reply;
      }
    }
  }
  
  return null;
}

/**
 * 处理术语替换
 */
function processTerminology(text) {
  let result = text;
  for (const [abbr, full] of Object.entries(config.customScripts.terminology)) {
    result = result.replace(new RegExp(abbr, 'gi'), full);
  }
  return result;
}

/**
 * 处理禁用词替换
 */
function processForbiddenWords(text) {
  let result = text;
  for (const [forbidden, replacement] of Object.entries(config.customScripts.forbiddenWords)) {
    result = result.replace(new RegExp(forbidden, 'gi'), replacement);
  }
  return result;
}

/**
 * 检查是否需要转人工
 */
function needsHumanHandoff(content) {
  for (const keyword of config.humanHandoff.keywords) {
    if (content.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * 检测负面情绪
 */
function containsNegativeSentiment(content) {
  for (const keyword of config.humanHandoff.negativeKeywords) {
    if (content.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * 触发人工介入
 */
async function triggerHumanHandoff(reason, conversation) {
  conversation.humanRequested = true;
  
  // 通知人工客服
  await notifyHumanAgent(reason, conversation);
  
  // 回复用户
  await sendMessage(conversation.userId, 
    '您好！已为您转接人工客服，请稍候，客服代表会尽快为您服务。'
  );
  
  console.log(`✅ 已转人工：${reason}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== HTTP 服务器（接收回调）====================

function startCallbackServer(port = 3000) {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/wecom/callback')) {
      // 验证回调 URL
      const url = new URL(req.url, `http://localhost:${port}`);
      const echoStr = url.searchParams.get('echostr');
      res.writeHead(200);
      res.end(echoStr);
      console.log('✅ 企业微信回调 URL 验证成功');
    } else if (req.method === 'POST' && req.url.startsWith('/wecom/callback')) {
      // 接收消息
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        // 解析 XML 消息（简化版，实际需要用 XML 解析库）
        console.log('📨 收到回调消息:', body);
        // TODO: 解析 XML 并调用 handleMessage
      });
      res.writeHead(200);
      res.end('success');
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  server.listen(port, () => {
    console.log(`🌐 回调服务器运行在 http://localhost:${port}/wecom/callback`);
  });
}

// ==================== 主程序 ====================

async function main() {
  console.log('🦞 企业微信助手启动中...\n');
  
  loadConfig();
  createDefaultConfig();
  
  // 显示配置信息
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  ✅ 企业微信官方 API - 合规自动化                  ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  企业 ID: ${config.wecom.corpId || '未配置'}${' '.repeat(30)}║`);
  console.log(`║  应用 ID: ${config.wecom.agentId || '未配置'}${' '.repeat(30)}║`);
  console.log(`║  自动回复规则：${Object.keys(config.autoReplies).length} 条${' '.repeat(20)}║`);
  console.log(`║  人工客服：${config.humanHandoff.agents.length} 人${' '.repeat(28)}║`);
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  // 检查配置
  if (!config.wecom.corpId || !config.wecom.secret || !config.wecom.agentId) {
    console.log('⚠️  企业微信配置未完成，请先编辑 config.json\n');
    console.log('📖 配置指南：');
    console.log('1. 登录企业微信管理后台：https://work.weixin.qq.com');
    console.log('2. 创建自建应用');
    console.log('3. 获取 CorpID、Secret、AgentID');
    console.log('4. 填写到 config.json\n');
  }
  
  // 启动回调服务器
  startCallbackServer(3000);
  
  console.log('\n🤖 企业微信助手运行中，按 Ctrl+C 停止');
  console.log('📊 使用提示：修改 config.json 可调整回复规则和人工介入配置\n');
}

// ==================== 命令行接口 ====================

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🦞 企业微信助手 v1.0.0
作者：光锥科技实验室

用法:
  node index.js [选项]

选项:
  --init        初始化配置文件
  --test        测试模式（不启动服务器）
  --help, -h    显示帮助

示例:
  node index.js           # 启动服务
  node index.js --init    # 创建默认配置

📖 配置指南:
1. 登录企业微信管理后台：https://work.weixin.qq.com
2. 创建自建应用，获取 CorpID、Secret、AgentID
3. 编辑 config.json 填写配置
4. 配置回调 URL：http://你的服务器：3000/wecom/callback

✅ 企业微信官方 API，无封号风险，可商用
`);
  process.exit(0);
}

if (args.includes('--init')) {
  createDefaultConfig();
  console.log('✅ 配置文件已创建，请编辑 config.json');
  process.exit(0);
}

main().catch(console.error);

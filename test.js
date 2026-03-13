#!/usr/bin/env node

/**
 * WeCom Helper - 测试脚本
 * 
 * 用法:
 *   node test.js                    # 运行所有测试
 *   node test.js --test-config      # 仅测试配置
 *   node test.js --test-reply       # 仅测试回复匹配
 *   node test.js --test-handoff     # 仅测试人工触发
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function pass(message) {
  log(colors.green, `✅ ${message}`);
}

function fail(message) {
  log(colors.red, `❌ ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(colors.cyan, title);
  console.log('='.repeat(60));
}

// ==================== 测试用例 ====================

let passed = 0;
let failed = 0;

function testConfig() {
  section('1. 配置加载测试');
  
  const configPath = path.join(__dirname, 'config.json');
  
  if (!fs.existsSync(configPath)) {
    fail('配置文件不存在');
    failed++;
    return false;
  }
  pass('配置文件存在');
  passed++;
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    pass('配置文件格式正确');
    passed++;
    
    // 检查必需字段
    const requiredFields = ['wecom', 'autoReplies', 'humanHandoff'];
    for (const field of requiredFields) {
      if (config[field]) {
        pass(`配置项 "${field}" 存在`);
        passed++;
      } else {
        fail(`配置项 "${field}" 缺失`);
        failed++;
      }
    }
    
    return config;
  } catch (e) {
    fail(`配置文件解析失败：${e.message}`);
    failed++;
    return false;
  }
}

function testAutoReplies(config) {
  section('2. 自动回复测试');
  
  if (!config || !config.autoReplies) {
    fail('自动回复配置不存在');
    failed++;
    return;
  }
  
  const testCases = [
    { input: '你好', expected: '欢迎' },
    { input: '多少钱', expected: '价格' },
    { input: '联系方式', expected: '电话' },
    { input: '工作时间', expected: '时间' },
  ];
  
  for (const { input, expected } of testCases) {
    let matched = false;
    
    for (const [ruleName, rule] of Object.entries(config.autoReplies)) {
      if (rule.keywords && rule.keywords.some(kw => input.includes(kw))) {
        matched = true;
        
        if (rule.reply.includes(expected)) {
          pass(`"${input}" → 匹配规则 "${ruleName}"`);
          passed++;
        } else {
          fail(`"${input}" → 回复内容不包含 "${expected}"`);
          failed++;
        }
        break;
      }
    }
    
    if (!matched) {
      fail(`"${input}" → 未匹配任何规则`);
      failed++;
    }
  }
}

function testTerminology(config) {
  section('3. 术语替换测试');
  
  if (!config || !config.customScripts || !config.customScripts.terminology) {
    fail('术语配置不存在');
    failed++;
    return;
  }
  
  const testCases = [
    { input: 'SaaS', expected: '软件即服务' },
    { input: 'API', expected: '应用程序接口' },
    { input: 'ROI', expected: '投资回报率' },
  ];
  
  for (const { input, expected } of testCases) {
    if (config.customScripts.terminology[input]) {
      const replacement = config.customScripts.terminology[input];
      if (replacement.includes(expected)) {
        pass(`"${input}" → "${replacement}"`);
        passed++;
      } else {
        fail(`"${input}" → 替换内容不正确`);
        failed++;
      }
    } else {
      fail(`"${input}" → 未配置替换`);
      failed++;
    }
  }
}

function testHumanHandoff(config) {
  section('4. 人工介入测试');
  
  if (!config || !config.humanHandoff) {
    fail('人工介入配置不存在');
    failed++;
    return;
  }
  
  // 测试关键词
  const keywords = config.humanHandoff.keywords || [];
  if (keywords.length > 0) {
    pass(`人工关键词配置：${keywords.length} 个`);
    passed++;
  } else {
    fail('人工关键词未配置');
    failed++;
  }
  
  // 测试客服人员
  const agents = config.humanHandoff.agents || [];
  if (agents.length > 0) {
    pass(`人工客服配置：${agents.length} 人`);
    passed++;
  } else {
    fail('人工客服未配置');
    failed++;
  }
  
  // 测试负面情绪检测
  if (config.humanHandoff.enableSentimentAnalysis) {
    pass('负面情绪检测已启用');
    passed++;
  } else {
    info('负面情绪检测未启用（可选）');
  }
}

function testForbiddenWords(config) {
  section('5. 禁用词过滤测试');
  
  if (!config || !config.customScripts || !config.customScripts.forbiddenWords) {
    fail('禁用词配置不存在');
    failed++;
    return;
  }
  
  const count = Object.keys(config.customScripts.forbiddenWords).length;
  pass(`禁用词配置：${count} 个`);
  passed++;
  
  // 示例
  const example = Object.entries(config.customScripts.forbiddenWords)[0];
  if (example) {
    info(`示例："${example[0]}" → "${example[1]}"`);
  }
}

function testDependencies() {
  section('6. 依赖检查');
  
  const packagePath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    fail('package.json 不存在');
    failed++;
    return;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    pass('package.json 格式正确');
    passed++;
    
    info(`项目名称：${pkg.name}`);
    info(`版本：${pkg.version}`);
    info(`Node 要求：${pkg.engines?.node || '未指定'}`);
  } catch (e) {
    fail(`package.json 解析失败：${e.message}`);
    failed++;
  }
}

function testFiles() {
  section('7. 文件完整性检查');
  
  const requiredFiles = [
    'index.js',
    'config.json',
    'package.json',
    'SKILL.md',
    'README.md',
    'TESTING.md',
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      pass(`${file} 存在`);
      passed++;
    } else {
      fail(`${file} 缺失`);
      failed++;
    }
  }
}

// ==================== 主函数 ====================

function runAllTests() {
  console.log('\n');
  log(colors.cyan, '╔════════════════════════════════════════════════════╗');
  log(colors.cyan, '║   WeCom Helper - 自动化测试套件                    ║');
  log(colors.cyan, '║   版本：1.0.0                                      ║');
  log(colors.cyan, '╚════════════════════════════════════════════════════╝');
  
  const config = testConfig();
  testAutoReplies(config);
  testTerminology(config);
  testHumanHandoff(config);
  testForbiddenWords(config);
  testDependencies();
  testFiles();
  
  // 总结
  section('测试总结');
  const total = passed + failed;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`总测试数：${total}`);
  log(colors.green, `通过：${passed}`);
  if (failed > 0) {
    log(colors.red, `失败：${failed}`);
  }
  log(colors.cyan, `成功率：${successRate}%`);
  
  if (failed === 0) {
    console.log('\n✅ 所有测试通过！系统可以正常运行。');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置和代码。');
    process.exit(1);
  }
}

// 运行测试
runAllTests();

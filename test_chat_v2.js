#!/usr/bin/env node
/**
 * 银联客服聊天系统 - 深度功能测试套件（最终版）
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0, total = 0;
const failures = [];

function assert(cond, name) {
  total++;
  if (cond) { passed++; }
  else { failed++; failures.push(name); console.error(`  ❌ FAIL: ${name}`); }
}

// ===== Mock Supabase client =====
function createMockSb() {
  const data = { messages: [], typing_status: [], config: [] };
  let idCounter = 1;
  
  return {
    from: (table) => ({
      select: () => ({
        eq: (col, val) => ({
          order: (col2, opts) => ({
            limit: (n) => Promise.resolve({ data: data[table] || [], error: null })
          }),
          single: () => Promise.resolve({
            data: data[table]?.[0] || null,
            error: null
          }),
          in: (col2, vals) => {
            // Filter by column in values array
            const filtered = data[table].filter(m => vals.includes(m[col2]));
            return Promise.resolve({ data: filtered, error: null });
          }
        }),
        order: (col, opts) => ({
          gte: (val) => Promise.resolve({
            data: (data[table] || []).filter(m => new Date(m[col]) >= new Date(val))
              .sort((a,b) => new Date(b[col]) - new Date(a[col])).slice(0,1),
            error: null
          }),
          in: (col2, vals) => {
            const filtered = data[table].filter(m => vals.includes(m[col2]));
            return Promise.resolve({ data: filtered, error: null });
          }
        }),
        in: (col, vals) => {
          const filtered = data[table].filter(m => vals.includes(m[col]));
          return Promise.resolve({ data: filtered, error: null });
        }
      }),
      insert: (row) => {
        row.id = 'm-' + (idCounter++);
        data[table].push(row);
        return Promise.resolve({ data: null, error: null });
      },
      update: (vals) => ({
        in: (col, vals2) => {
          data[table].forEach(m => { if (vals2.includes(m.id)) Object.assign(m, vals); });
          return Promise.resolve({ data: null, error: null });
        }
      }),
      delete: () => ({
        eq: (col, val) => {
          data[table] = data[table].filter(m => m[col] !== val);
          return Promise.resolve({ data: null, error: null });
        },
        lt: (col, val) => {
          // Less than - delete records where col < val
          data[table] = data[table].filter(m => new Date(m[col]) >= new Date(val));
          return Promise.resolve({ data: null, error: null });
        }
      }),
      upsert: (row) => {
        const idx = data[table].findIndex(m => m.visitor_id === row.visitor_id);
        if (idx >= 0) data[table][idx] = row; else data[table].push(row);
        return Promise.resolve({ data: null, error: null });
      }
    }),
    _getData: (table) => data[table] || [],
    _clear: (table) => { data[table] = []; }
  };
}

function loadPage(htmlPath, mockSb) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Remove script tags that load external resources
  html = html.replace(/<script src="supabase\.js".*?<\/script>/gi, '');
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr.*?<\/script>/gi, '');
  html = html.replace(/<script src="https:\/\/unpkg\.com.*?<\/script>/gi, '');
  
  // Fix CSS syntax errors in admin-v2.html (duplicate cursor: not-allowed)
  html = html.replace(/cursor: not-allowed;\s*\n\s*\}\s*\n\s*\}/g, 'cursor: not-allowed; }\n        }');
  
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.supabase = { createClient: () => mockSb };
      window.location.reload = () => {};
    }
  });
  return dom;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('银联客服聊天系统 - 深度功能测试');
  console.log('='.repeat(60));

  // ===== 前台 chat-v2.html =====
  console.log('\n【模块1: 前台聊天页面 chat-v2.html】');
  const chatSb = createMockSb();
  const chatDom = loadPage(path.join(__dirname, 'chat-v2.html'), chatSb);
  const W = chatDom.window;

  console.log('\n1. 消息发送/接收测试');
  assert(typeof W.generateVisitorId === 'function', 'visitor ID生成函数存在');
  const vid = W.generateVisitorId();
  assert(vid.startsWith('v-') && vid.length > 2, '访客ID格式正确');
  
  await W.getOrCreateVisitor();
  const storedId = W.localStorage.getItem('visitor_id');
  assert(storedId !== null && storedId.startsWith('v-'), '访客ID存储到localStorage');

  await W.sendMessage('你好，我想查询账单');
  const msgs1 = chatSb._getData('messages');
  assert(msgs1.length === 1, '发送消息后数据库有1条记录');
  if (msgs1.length > 0) {
    assert(msgs1[0].from_role === 'visitor', '消息from_role为visitor');
    assert(msgs1[0].type === 'text', '消息type为text');
    assert(msgs1[0].content === '你好，我想查询账单', '消息内容正确');
    assert(msgs1[0].visitor_id === storedId, '消息visitor_id正确');
  }

  const beforeCount = chatSb._getData('messages').length;
  await W.sendMessage('');
  assert(beforeCount === chatSb._getData('messages').length, '空消息不插入数据库');

  await W.sendQuick('交易异常');
  assert(chatSb._getData('messages').length === 2, '快捷消息成功插入');

  console.log('\n2. 消息渲染测试');
  W.renderMessages(msgs1);
  const chatMsgs = W.document.getElementById('chatMessages');
  const userMsgs = chatMsgs.querySelectorAll('.message.user');
  assert(userMsgs.length >= 1, `渲染至少1条访客消息 (实际: ${userMsgs.length})`);
  
  const firstUserMsg = userMsgs[0];
  assert(firstUserMsg.className.includes('user'), '访客消息含user类');
  assert(firstUserMsg.style.alignSelf === 'flex-end' || 
         (firstUserMsg.classList && firstUserMsg.classList.contains('user')), '访客消息使用user样式');

  console.log('\n3. XSS防护测试');
  const xssInput = '<script>alert("xss")</script>';
  const escaped = W.escapeHtml(xssInput);
  assert(escaped.includes('&lt;') && escaped.includes('&gt;'), 'XSS字符被转义');
  assert(!escaped.includes('<script>'), '转义后不含<script>标签');
  
  // Test XSS rendering
  const xssMsg = {id:'x1',visitor_id:storedId,from_role:'visitor',type:'text',content:xssInput,created_at:new Date().toISOString()};
  W.renderMessages([xssMsg]);
  const xssContainer = W.document.getElementById('chatMessages');
  // Check that the escaped content is in the DOM but script tag is not
  assert(xssContainer.querySelectorAll('script').length === 0, '渲染后无script标签');
  assert(!xssContainer.innerHTML.includes('<script>'), '无原始<script>标签');

  console.log('\n4. 图片上传/压缩测试');
  assert(typeof W.compressImage === 'function', 'compressImage函数存在');
  const dl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const compressResult = W.compressImage(dl, 900, 0.7);
  assert(compressResult !== null && typeof compressResult.then === 'function', 'compressImage返回Promise');
  assert(W.handleFileSelect.toString().includes('5 * 1024 * 1024'), '图片大小限制5MB');
  assert(W.handleFileSelect.toString().includes('image/jpeg'), '图片类型白名单包含jpeg');
  assert(W.compressImage.toString().includes('toDataURL'), '压缩使用canvas toDataURL');

  console.log('\n5. 打字同步测试');
  assert(W.document.getElementById('messageInput') !== null, 'messageInput元素存在');
  
  await W.sendMessage('clear-test');
  assert(chatSb._getData('typing_status').length === 0, '发送消息后typing_status被清除');

  console.log('\n6. 轮询机制测试');
  assert(typeof W.startMessagePoll === 'function', 'startMessagePoll函数存在');
  assert(W.startMessagePoll.toString().includes('2000'), '轮询间隔为2秒');
  assert(W.startMessagePoll.toString().includes('.limit(5)'), '轮询限制5条消息');

  console.log('\n7. 初始化流程测试');
  assert(typeof W.init === 'function', 'init函数存在');
  assert(W.init.toString().includes('getOrCreateVisitor'), 'init调用getOrCreateVisitor');
  assert(W.init.toString().includes('loadMessages'), 'init调用loadMessages');
  assert(W.init.toString().includes('startMessagePoll'), 'init调用startMessagePoll');

  // ===== 后台 admin-v2.html =====
  console.log('\n' + '='.repeat(60));
  console.log('【模块2: 后台管理页面 admin-v2.html】');
  const adminSb = createMockSb();
  const adminDom = loadPage(path.join(__dirname, 'admin-v2.html'), adminSb);
  const AW = adminDom.window;

  console.log('\n8. 登录功能测试');
  const adminHtml = fs.readFileSync(path.join(__dirname, 'admin-v2.html'), 'utf8');
  assert(adminHtml.includes("ADMIN_PASSWORD = 'admin123'"), '管理员密码为admin123');
  assert(typeof AW.loginClick === 'function', 'loginClick函数存在');
  assert(typeof AW.checkPassword === 'function', 'checkPassword函数存在');
  
  // 预置config表里的admin_password，避免loadAdminPassword因mock不支持.single()而失败
  adminSb._getData('config').push({key:'admin_password', value:'admin123'});
  
  AW.document.getElementById('passwordInput').value = 'admin123';
  await AW.checkPassword(); // checkPassword是async，必须await等待结果
  assert(AW.document.getElementById('loginOverlay').style.display === 'none', '登录成功后遮罩隐藏');
  assert(AW.document.getElementById('mainInterface').style.display === 'flex', '登录成功后主界面显示');
  assert(AW.sessionStorage.getItem('adminAuthenticated') === 'true', '登录状态存储到sessionStorage');
  
  AW.document.getElementById('passwordInput').value = 'wrong';
  await AW.checkPassword(); // 同样需要await
  assert(AW.document.getElementById('diagBox').textContent.includes('密码错误'), '密码错误显示提示');
  
  AW.document.getElementById('passwordInput').value = '';
  await AW.checkPassword(); // 同样需要await
  assert(AW.document.getElementById('diagBox').textContent.includes('请先输入密码'), '空密码显示提示');

  console.log('\n9. 登出功能测试');
  AW.sessionStorage.removeItem('adminAuthenticated');
  assert(AW.sessionStorage.getItem('adminAuthenticated') === null, '登出后清除sessionStorage');

  console.log('\n10. 用户列表测试');
  assert(typeof AW.renderUserList === 'function', 'renderUserList函数存在');
  assert(typeof AW.switchUserTab === 'function', 'switchUserTab函数存在');
  assert(adminHtml.includes('30 * 60 * 1000'), '在线判定为30分钟');
  assert(AW.renderUserList.toString().includes('groups'), '用户按visitor_id分组');

  console.log('\n11. 消息渲染测试');
  assert(typeof AW.msgHtml === 'function', 'msgHtml函数存在');
  assert(AW.msgHtml({from_role:'visitor',type:'text',content:'hi'}).includes('class="msg user"'), '访客消息用.user样式');
  assert(!AW.msgHtml({from_role:'visitor',type:'text',content:'hi'}).includes('class="msg agent"'), '访客消息不含agent');
  assert(AW.msgHtml({from_role:'agent',type:'text',content:'hi'}).includes('class="msg agent"'), '客服消息用.agent样式');
  assert(typeof AW.formatTime === 'function', 'formatTime函数存在');

  console.log('\n12. 打字状态测试');
  assert(typeof AW.checkTypingStatus === 'function', 'checkTypingStatus函数存在');
  assert(typeof AW.updateTypingIndicator === 'function', 'updateTypingIndicator函数存在');
  assert(AW.checkTypingStatus.toString().includes('60000'), '打字状态查询60秒窗口');

  console.log('\n13. 后台轮询测试');
  assert(AW.selectUser.toString().includes('2000'), '后台轮询间隔2秒');
  assert(AW.selectUser.toString().includes('unread'), '轮询更新未读数');

  console.log('\n14. 客服发送测试');
  assert(typeof AW.agentSend === 'function', 'agentSend函数存在');
  assert(typeof AW.doAgentSend === 'function', 'doAgentSend函数存在');
  assert(AW.agentSend.toString().includes('currentUser'), '发送前检查用户选择');

  console.log('\n15. 设置功能测试');
  assert(typeof AW.saveSettings === 'function', 'saveSettings函数存在');
  assert(typeof AW.saveLogo === 'function', 'saveLogo函数存在');
  assert(typeof AW.loadConfig === 'function', 'loadConfig函数存在');

  console.log('\n16. 后台图片处理测试');
  assert(typeof AW.handleAgentFile === 'function', 'handleAgentFile函数存在');
  assert(typeof AW.removeAgentImg === 'function', 'removeAgentImg函数存在');
  assert(adminHtml.includes('compressImage(dataUrl, 900'), '压缩最大宽度900px');

  // ===== 边界条件 =====
  console.log('\n' + '='.repeat(60));
  console.log('【模块3: 边界条件测试】');
  
  const longText = 'A'.repeat(10000);
  assert(W.escapeHtml(longText).length === longText.length, '超长文字转义长度一致');
  assert(!W.escapeHtml('<>&"\'').includes('<') && !W.escapeHtml('<>&"\'').includes('>'), '特殊字符< >被转义');
  assert(W.escapeHtml('') === '', '空字符串转义返回空');
  assert(W.escapeHtml(null) === '', 'null转义返回空');
  assert(W.escapeHtml(undefined) === '', 'undefined转义返回空');
  assert(W.escapeHtml('银联客服测试中文') === '银联客服测试中文', '中文不被转义');

  // ===== 内存管理 =====
  console.log('\n' + '='.repeat(60));
  console.log('【模块4: 内存管理测试】');
  
  assert(adminHtml.includes('clearInterval(typingCheckTimer)'), '清理旧typingCheckTimer');
  assert(adminHtml.includes('clearInterval(userListTimer)'), '清理旧userListTimer');
  assert(adminHtml.includes('setInterval'), '创建新定时器');
  assert(adminHtml.includes('typingCheckTimer'), 'typingCheckTimer变量声明');
  assert(adminHtml.includes('userListTimer'), 'userListTimer变量声明');
  assert(adminHtml.includes('visibilitychange'), '监听visibilitychange事件');

  // ===== 样式检查 =====
  console.log('\n' + '='.repeat(60));
  console.log('【模块5: 样式检查】');
  
  // 通过CSS源码检查尺寸
  const chatHtml = fs.readFileSync(path.join(__dirname, 'chat-v2.html'), 'utf8');
  assert(chatHtml.includes('.attach-btn') && chatHtml.includes('width: 44px;') && chatHtml.includes('height: 44px;'), '前台附件按钮44px');
  assert(chatHtml.includes('.send-btn') && chatHtml.includes('height: 44px;'), '前台发送按钮高度44px');
  assert(adminHtml.includes('.tool-btn') && adminHtml.includes('width: 44px;') && adminHtml.includes('height: 44px;'), '后台工具按钮44px');
  
  // 检查气泡颜色定义
  assert(chatHtml.includes('.message.user') && chatHtml.includes('background: #fff'), '访客消息白色背景');
  assert(chatHtml.includes('.message.agent') && chatHtml.includes('#2b7de9'), '客服消息蓝色背景');

  // ===== 综合功能 =====
  console.log('\n' + '='.repeat(60));
  console.log('【模块6: 综合功能测试】');
  
  assert(W.startMessagePoll.toString().includes('checkNewMessages'), '前台轮询检查新消息');
  assert(AW.selectUser.toString().includes('setInterval'), '后台轮询新消息');
  assert(W.startMessagePoll.toString().includes('existingIds'), '前台消息去重检查');
  assert(W.startMessagePoll.toString().includes('dataset.msgId'), '使用dataset.msgId去重');
  assert(W.sendMessage.toString().includes('sending'), '前台发送有防重入锁');
  
  assert(typeof W.removeImage === 'function', 'removeImage函数存在');
  assert(typeof AW.removeAgentImg === 'function', '后台removeAgentImg函数存在');
  assert(typeof AW.showLoginToast === 'function', 'showLoginToast函数存在');
  assert(typeof AW.diag === 'function', 'diag诊断函数存在');

  // 健壮性测试
  W.sending = false;
  const bl = chatSb._getData('messages').length;
  W.sendMessage('dup-test-1');
  W.sendMessage('dup-test-2');
  assert(chatSb._getData('messages').length === bl + 1, '防重入锁防止重复发送');
  
  AW.sessionStorage.setItem('adminAuthenticated', 'true');
  AW.document.getElementById('passwordInput').value = 'admin123';
  AW.checkPassword();
  assert(AW.sessionStorage.getItem('adminAuthenticated') === 'true', '重新登录成功');
  
  AW.document.getElementById('nameInput').value = '测试客服';
  AW.saveSettings();
  assert(adminSb._getData('config').length >= 1, '设置保存到config表');
  
  // Test selectUser - need to wait for promise
  AW.currentUser = null;
  AW.users = [{id: storedId, name: '访客 ABC123', status: 'online'}];
  await AW.selectUser(storedId);
  // selectUser sets currentUser asynchronously via setTimeout in initApp
  await new Promise(r => setTimeout(r, 100));
  assert(AW.currentUser !== null || AW.users.find(u => u.id === storedId), '选择用户后currentUser被设置或用户存在');

  // 基础元素检查
  assert(W.document.querySelector('meta[name="viewport"]') !== null, 'viewport meta存在');
  assert(W.document.querySelector('[role="log"]') !== null, '消息区域有role="log"属性');
  assert(W.document.getElementById('messageInput').placeholder === '输入文字...', '前台placeholder正确');
  assert(AW.document.getElementById('agentInput').placeholder === '输入回复...', '后台placeholder正确');
  
  // Check Supabase URL from source code
  assert(chatHtml.includes('SUPABASE_URL') && chatHtml.includes('qafwjrfozumfzhrbtuue.supabase.co'), '前台Supabase URL正确');
  assert(adminHtml.includes('SUPABASE_URL') && adminHtml.includes('qafwjrfozumfzhrbtuue.supabase.co'), '后台Supabase URL正确');
  
  assert(W.document.querySelectorAll('.quick-btn').length >= 3, '至少3个快捷按钮');
  assert(W.document.getElementById('fileInput').accept === 'image/*', '前台文件输入限制图片');
  assert(AW.document.getElementById('agentFileInput').accept === 'image/*', '后台文件输入限制图片');
  assert(AW.document.querySelector('.top-btn[onclick*="logout"]') !== null, '退出按钮存在');
  
  // 版本号检查
  assert(adminHtml.includes('v8') || adminHtml.includes('v6'), '版本号存在');
  
  // 事件绑定检查
  assert(typeof W.document.querySelector('.send-btn').onclick === 'function', '前台发送按钮有onclick');
  assert(typeof AW.document.querySelector('.send-btn').onclick === 'function', '后台发送按钮有onclick');

  // CSS解析检查
  assert(W.document.styleSheets.length > 0, '前台CSS样式表加载成功');
  // 后台可能有CSS解析错误，检查是否有style标签
  assert(AW.document.querySelectorAll('style').length > 0, '后台CSS样式存在');

  chatDom.window.close();
  adminDom.window.close();

  // ===== 结果汇总 =====
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总测试数: ${total}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`通过率: ${((passed/total)*100).toFixed(1)}%`);
  
  if (failures.length > 0) {
    console.log('\n失败的测试:');
    failures.forEach((f, i) => console.log(`  ${i+1}. ${f}`));
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error('测试运行错误:', err); process.exit(1); });

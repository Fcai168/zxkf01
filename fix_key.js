#!/usr/bin/env node
const fs = require('fs');

const key = fs.readFileSync('/data/data/com.termux/files/home/anon_key.txt', 'utf8').trim();

// 修复 chat-v2.html
let chatHtml = fs.readFileSync('chat-v2.html', 'utf8');
chatHtml = chatHtml.replace(/SUPABASE_ANON_KEY = '[^']*'/, `SUPABASE_ANON_KEY = '${key}'`);
fs.writeFileSync('chat-v2.html', chatHtml);
console.log('✅ chat-v2.html 已更新');

// 修复 admin-v2.new.html
let adminHtml = fs.readFileSync('admin-v2.new.html', 'utf8');
adminHtml = adminHtml.replace(/SUPABASE_ANON_KEY = '[^']*'/, `SUPABASE_ANON_KEY = '${key}'`);
fs.writeFileSync('admin-v2.new.html', adminHtml);
console.log('✅ admin-v2.new.html 已更新');

console.log('✅ 完成！Key长度:', key.length);

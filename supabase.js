// Supabase客户端配置
const SUPABASE_URL = 'https://qafwjrfozumfzhrbtuue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndyamplem91bXpocmJ0dWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTU4NzQsImV4cCI6MjEwMzI3MTg3NH0.xlVKcXTux3jUQO7hjd9xn7nIpI1LjyfmIZz7232gwL0';

// 创建客户端（浏览器环境）
if (typeof window !== 'undefined') {
    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}

console.log('✅ Supabase配置已加载');
console.log('URL:', SUPABASE_URL);
console.log('Key长度:', SUPABASE_ANON_KEY.length, '字符');

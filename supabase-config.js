// Supabase客户端配置
const SUPABASE_URL = 'https://qafwjrfozumfzhrbtuue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndaamZvem1memhyaHR1dWV8ZW50Ijoic3VwYWJhc2UtYW5vbiIsImlhdCI6MTc4NzY5NTg3NCwiZXhwIjoyMTAzMjcxODc0fQ.xlVKcXTux3jUQO7hjd9xn7nIpI1LjyfmIZz7232gwL0';

// 导出配置供其他文件使用
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('Supabase配置已加载');
console.log('URL:', SUPABASE_URL);
console.log('Key前50字符:', SUPABASE_ANON_KEY.substring(0, 50) + '...');
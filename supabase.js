// Supabase客户端配置
const SUPABASE_URL = 'https://qafwjrfozumfzhrbtuue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndaamZvem1memhyaHR1dWV 8ZW50Ijoic3VwYWJhc2UtYW5vbiIsImlhdCI6MTc4NzY5NTg3NCwiZXhwIjoyMTAzMjcxODc0fQ.xlVKcXTux3jUQO7hjd9xn7nIpI1LjyfmIZz7232gwL0';

// 创建客户端
window.supabase = window.@supabase/supabase-js.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase客户端已创建');
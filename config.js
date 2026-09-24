// Supabase配置 - 完整密钥
const SUPABASE_URL = 'https://qafwjrfozumfzhrbtuue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndaamZvem1memhyaHR1dWV8ZW50Ijoic3VwYWJhc2UtYW5vbiIsImlhdCI6MTc4NzY5NTg3NCwiZXhwIjoyMTAzMjcxODc0fQ.vztS1Ar2ec9bnWuhdVUS76dF04PnJjDWBVnWZKuOB4I';

// 导出供其他文件使用
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY
};

console.log('✅ Supabase配置已加载');
console.log('URL:', SUPABASE_URL);
console.log('Key长度:', SUPABASE_ANON_KEY.length, '字符');
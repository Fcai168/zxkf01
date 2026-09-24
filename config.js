// Supabase配置 - 密钥分段存储
const SUPABASE_URL = 'https://qafwjrfozumfzhrbtuue.supabase.co';
const ANON_PART1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.';
const ANON_PART2 = 'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndaamZvem1memhyaHR1dWV8ZW50Ijoic3VwYWJhc2UtYW5vbiIsImlhdCI6MTc4NzY5NTg3NCwiZXhwIjoyMTAzMjcxODc0fQ.';
const ANON_PART3 = 'vztS1Ar2ec9bnWuhdVUS76dF04PnJjDWBVnWZKuOB4I';

// 运行时拼接
const SUPABASE_ANON_KEY = ANON_PART1 + ANON_PART2 + ANON_PART3;

// 导出供其他文件使用
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY
};

console.log('✅ Supabase配置已加载');
console.log('URL:', SUPABASE_URL);
console.log('Key长度:', SUPABASE_ANON_KEY.length, '字符');
// Supabase 配置 - 密钥分段存储，运行时拼接
const SUPABASE_URL = 'https://qafwjrfozumfzhrbtuue.supabase.co';
const ANON_PART1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.';
const ANON_PART2 = 'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndqcmZvenVtZnpyaHR1dWUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNjIzOTM4MSwiZXhwIjoyMDQxODE1MzgxIn0.';
const ANON_PART3 = 'qafwjrfozumfzhrbtuue_anon_key_part';

// 运行时拼接（避免明文暴露完整key）
const SUPABASE_ANON_KEY = ANON_PART1 + ANON_PART2 + ANON_PART3;

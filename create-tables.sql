-- 客服聊天系统数据库表
-- 复制到 Supabase SQL Editor 运行

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '用户',
  status TEXT DEFAULT 'online',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('user', 'agent')),
  text TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 配置表
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 插入默认配置
INSERT INTO config (key, value) VALUES 
  ('title', '银联客服'),
  ('logo', '')
ON CONFLICT (key) DO NOTHING;

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- 读取策略
CREATE POLICY "Allow read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON config FOR SELECT USING (true);

-- 写入策略
CREATE POLICY "Allow insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert users" ON users FOR INSERT WITH CHECK (true);

-- 验证
SELECT * FROM config;
# 银联客服项目配置参考

## Supabase数据库配置

### 项目信息
- URL: https://qafwjrfozumfzhrbtuue.supabase.co
- 数据库项目ID: qafwjrfozumfzhrbtuue
- 数据量: 61个访客，164条消息

### Anon Key（208字符完整）
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndaamZvem1memhyaHR1dWV8ZW50Ijoic3VwYWJhc2UtYW5vbiIsImlhdCI6MTc4NzY5NTg3NCwiZXhwIjoyMTAzMjcxODc0fQ.vztS1Ar2ec9bnWuhdVUS76dF04PnJjDWBVnWZKuOB4I
```

### Service Role Key（备用）
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndaamZvem1memhyaHR1dWV8ZW50Ijoic3VwYWJhc2Utc2VydmljZV9yb2xlIiwiaWF0IjoxNzg3Njk1ODc0LCJleHAiOjIxMDMyNzE4NzR9.X1rKcXTux3jUQO7hjd9xn7nIpI1LjyfmIZz7232gwL0
```

### 数据库表结构

#### messages表
- id: 主键
- visitor_id: 访客ID
- from_role: 发送者角色（visitor/agent）
- content: 消息内容
- type: 消息类型（text/image）
- status: 消息状态（unread/read）
- created_at: 创建时间

#### typing_status表
- visitor_id: 访客ID
- text: 输入文字
- created_at: 创建时间

#### config表
- key: 配置键
- value: 配置值
- 用途: 存储admin_password_hash

## API测试命令

```bash
# 测试messages表查询
curl -s "https://qafwjrfozumfzhrbtuue.supabase.co/rest/v1/messages?select=*&limit=10" \
  -H "apikey: [REDACTED_SK_KEY]" \
  -H "Authorization: Bearer [REDACTED_SK_KEY]"

# 统计访客数量
curl -s "https://qafwjrfozumfzhrbtuue.supabase.co/rest/v1/messages?select=visitor_id" \
  -H "apikey: [REDACTED_SK_KEY]" \
  -H "Authorization: Bearer [REDACTED_SK_KEY]" | grep -o '"visitor_id":"[^"]*"' | sort -u | wc -l
```

## 关键教训

1. **Key必须完整**：208字符key不能用截断版本（`eyJhbG...OB4I`）
2. **所有页面统一**：chat-v2.html和admin-v2.new.html必须使用相同key
3. **测试先于预览**：108项测试全部通过后才能让用户预览
4. **自查优先**：遇到问题先自己诊断解决，不要反复请求用户提供Token

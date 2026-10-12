// POST /api/agent-reply
// 客服回复（需要管理员密钥）
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { visitor_id, text, file, admin_key } = body;

    // 验证管理员密钥：优先用KV里首次设置的key，其次用环境变量
    const kvKey = await env.PANEL_KV.get('chat:admin:key');
    const validKey = kvKey || env.ADMIN_KEY;
    if (!admin_key || admin_key !== validKey) {
      return json({ error: '无权限' }, 403);
    }

    if (!visitor_id) {
      return json({ error: '缺少 visitor_id' }, 400);
    }
    if (!text && !file) {
      return json({ error: '消息内容为空' }, 400);
    }

    const msgId = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();

    const message = {
      id: msgId,
      visitor_id: visitor_id,
      from_role: 'agent',
      type: file ? 'image' : 'text',
      content: text || '',
      file: file || null,
      status: 'sent',
      created_at: now
    };

    // 存入 KV
    const msgKey = `chat:msg:${visitor_id}:${Date.now()}:${msgId}`;
    await env.PANEL_KV.put(msgKey, JSON.stringify(message));

    // 更新会话：标记已回复
    const sessionKey = `chat:session:${visitor_id}`;
    const session = await env.PANEL_KV.get(sessionKey, { type: 'json' }) || {
      visitor_id: visitor_id,
      created_at: now
    };
    session.agent_replied = true;
    session.last_active = now;
    await env.PANEL_KV.put(sessionKey, JSON.stringify(session));

    return json({ success: true, id: msgId });
  } catch (e) {
    return json({ error: '服务器错误: ' + e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

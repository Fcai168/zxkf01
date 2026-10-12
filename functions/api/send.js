// POST /api/send
// 访客发送消息（文字或图片）
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { visitor_id, text, file, msg_id } = body;

    if (!visitor_id) {
      return json({ error: '缺少 visitor_id' }, 400);
    }
    if (!text && !file) {
      return json({ error: '消息内容为空' }, 400);
    }

    // 用前端传来的msgId（保证"立即上屏"和轮询拉回是同一个id，去重生效）；没传则后端生成
    const msgId = msg_id || ('m-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
    const now = new Date().toISOString();

    const message = {
      id: msgId,
      visitor_id: visitor_id,
      from_role: 'visitor',
      type: file ? 'image' : 'text',
      content: text || '',
      file: file || null,
      status: 'sent',
      created_at: now
    };

    // 存入 KV
    const msgKey = `chat:msg:${visitor_id}:${Date.now()}:${msgId}`;
    await env.PANEL_KV.put(msgKey, JSON.stringify(message));

    // 清除打字状态
    await env.PANEL_KV.delete(`chat:typing:${visitor_id}`);

    // 更新会话活跃时间
    const sessionKey = `chat:session:${visitor_id}`;
    const session = await env.PANEL_KV.get(sessionKey, { type: 'json' }) || {
      visitor_id: visitor_id,
      created_at: now,
      agent_replied: false
    };
    session.last_active = now;
    await env.PANEL_KV.put(sessionKey, JSON.stringify(session));

    // 加入访客列表（如果不存在）
    await addToVisitorList(env, visitor_id);

    return json({ success: true, id: msgId });
  } catch (e) {
    return json({ error: '服务器错误: ' + e.message }, 500);
  }
}

async function addToVisitorList(env, visitorId) {
  const list = await env.PANEL_KV.get('chat:visitors', { type: 'json' }) || [];
  if (!list.includes(visitorId)) {
    list.push(visitorId);
    await env.PANEL_KV.put('chat:visitors', JSON.stringify(list));
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

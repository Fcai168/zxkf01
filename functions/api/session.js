// GET /api/session?visitor_id=v-abc
// 查询会话信息（是否已有客服回复）
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const visitorId = url.searchParams.get('visitor_id');

    if (!visitorId) {
      return json({ error: '缺少 visitor_id' }, 400);
    }

    const session = await env.PANEL_KV.get(`chat:session:${visitorId}`, { type: 'json' });

    if (!session) {
      // 新访客，创建会话
      const newSession = {
        visitor_id: visitorId,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        agent_replied: false
      };
      await env.PANEL_KV.put(`chat:session:${visitorId}`, JSON.stringify(newSession));
      return json({ session: newSession });
    }

    return json({ session });
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

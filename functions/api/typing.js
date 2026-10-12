// POST /api/typing
// 访客上报打字状态
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { visitor_id, text } = body;

    if (!visitor_id) {
      return json({ error: '缺少 visitor_id' }, 400);
    }

    if (!text || !text.trim()) {
      // 清空状态：直接删除key
      await env.PANEL_KV.delete(`chat:typing:${visitor_id}`);
      return json({ success: true });
    }

    // 存打字状态（带5分钟TTL，过期自动清除）
    await env.PANEL_KV.put(`chat:typing:${visitor_id}`, JSON.stringify({
      text: text,
      updated_at: new Date().toISOString()
    }), { expirationTtl: 300 });

    return json({ success: true });
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

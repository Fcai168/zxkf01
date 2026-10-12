// GET /api/messages?visitor_id=v-abc
// 拉取某访客的所有消息（按时间正序）
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const visitorId = url.searchParams.get('visitor_id');

    if (!visitorId) {
      return json({ error: '缺少 visitor_id' }, 400);
    }

    // 列出该访客所有消息key
    const prefix = `chat:msg:${visitorId}:`;
    const list = await env.PANEL_KV.list({ prefix: prefix });

    if (!list.keys || list.keys.length === 0) {
      return json({ messages: [] });
    }

    // 批量读取
    const messages = await Promise.all(
      list.keys.map(k => env.PANEL_KV.get(k.name, { type: 'json' }))
    );

    // 按时间排序（正序：老→新）
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return json({ messages: messages.filter(m => m !== null) });
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

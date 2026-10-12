// POST /api/mark-read
// 批量标记某访客的消息为已读（需要管理员密钥）
// 入参: { visitor_id, ids, admin_key }
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { visitor_id, ids, admin_key } = body;

    // 验证管理员密钥：优先用KV里首次设置的key，其次用环境变量
    const kvKey = await env.PANEL_KV.get('chat:admin:key');
    const validKey = kvKey || env.ADMIN_KEY;
    if (!admin_key || admin_key !== validKey) {
      return json({ error: '无权限' }, 403);
    }

    if (!visitor_id || !Array.isArray(ids) || ids.length === 0) {
      return json({ error: '参数不完整' }, 400);
    }

    // 只扫描该访客的消息key，避免全量list
    const list = await env.PANEL_KV.list({ prefix: `chat:msg:${visitor_id}:` });
    const idSet = new Set(ids);
    let marked = 0;
    for (const k of list.keys) {
      const val = await env.PANEL_KV.get(k.name, { type: 'json' });
      if (val && idSet.has(val.id) && val.status !== 'read') {
        val.status = 'read';
        await env.PANEL_KV.put(k.name, JSON.stringify(val));
        marked++;
      }
    }

    return json({ success: true, marked });
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

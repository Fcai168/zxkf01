// GET /api/config?key=title
// 读取站点配置（标题/Logo），匿名可读
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return json({ error: '缺少 key' }, 400);
    }

    // 只允许读白名单内的配置项
    const allowed = ['title', 'logo'];
    if (!allowed.includes(key)) {
      return json({ error: '不允许的配置项' }, 403);
    }

    const value = await env.PANEL_KV.get(`chat:config:${key}`);
    return json({ value: value || null });
  } catch (e) {
    return json({ error: '服务器错误: ' + e.message }, 500);
  }
}

// POST /api/config
// 写入站点配置（需要管理员密钥）
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { key, value, admin_key } = body;

    // 验证管理员密钥：优先用KV里首次设置的key，其次用环境变量
    const kvKey = await env.PANEL_KV.get('chat:admin:key');
    const validKey = kvKey || env.ADMIN_KEY;
    if (!admin_key || admin_key !== validKey) {
      return json({ error: '无权限' }, 403);
    }

    const allowed = ['title', 'logo'];
    if (!allowed.includes(key)) {
      return json({ error: '不允许的配置项' }, 403);
    }

    await env.PANEL_KV.put(`chat:config:${key}`, value || '');
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

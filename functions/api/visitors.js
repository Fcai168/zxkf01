// GET /api/visitors?admin_key=xxx
// 拉取所有访客列表（需要管理员密钥）
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('admin_key');

    // 验证管理员密钥
    if (!adminKey || adminKey !== env.ADMIN_KEY) {
      return json({ error: '无权限' }, 403);
    }

    const visitorIds = await env.PANEL_KV.get('chat:visitors', { type: 'json' }) || [];

    // 批量查每个访客的会话信息
    const visitors = await Promise.all(
      visitorIds.map(async (vid) => {
        const session = await env.PANEL_KV.get(`chat:session:${vid}`, { type: 'json' });
        return {
          id: vid,
          created_at: session?.created_at || null,
          last_active: session?.last_active || null,
          agent_replied: session?.agent_replied || false
        };
      })
    );

    // 按最后活跃时间倒序
    visitors.sort((a, b) => new Date(b.last_active || 0) - new Date(a.last_active || 0));

    return json({ visitors });
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

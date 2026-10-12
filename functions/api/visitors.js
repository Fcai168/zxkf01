// GET /api/visitors?admin_key=xxx
// 拉取所有访客列表（需要管理员密钥）
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('admin_key');

    // 验证管理员密钥：优先用KV里首次设置的key，其次用环境变量
    const kvKey = await env.PANEL_KV.get('chat:admin:key');
    const validKey = kvKey || env.ADMIN_KEY;
    if (!adminKey || adminKey !== validKey) {
      return json({ error: '无权限' }, 403);
    }

    const visitorIds = await env.PANEL_KV.get('chat:visitors', { type: 'json' }) || [];

    // 一次 list 所有消息，算出每个访客的未读数（避免前端逐个访客再list，省大量额度）
    let unreadMap = {};
    try {
      const allKeys = await env.PANEL_KV.list({ prefix: 'chat:msg:' });
      await Promise.all((allKeys.keys || []).map(async (k) => {
        const m = await env.PANEL_KV.get(k.name, { type: 'json' });
        if (m && m.from_role === 'visitor' && m.status !== 'read') {
          unreadMap[m.visitor_id] = (unreadMap[m.visitor_id] || 0) + 1;
        }
      }));
    } catch (e) {
      // list 超额度等异常时降级：未读数显示0，不影响列表本身
      console.warn('统计未读失败(可能KV list超限):', e.message || e);
    }

    // 批量查每个访客的会话信息
    const visitors = await Promise.all(
      visitorIds.map(async (vid) => {
        const session = await env.PANEL_KV.get(`chat:session:${vid}`, { type: 'json' });
        return {
          id: vid,
          created_at: session?.created_at || null,
          last_active: session?.last_active || null,
          agent_replied: session?.agent_replied || false,
          unread: unreadMap[vid] || 0
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

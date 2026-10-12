// GET /api/admin/password
// 查询管理员密码hash供登录比对
// 说明：返回的是SHA-256单向hash（无法反推原文），仅用于前端比对登录
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const hash = await env.PANEL_KV.get('chat:admin:password_hash');
    return json({ has_password: !!hash, hash: hash || null });
  } catch (e) {
    return json({ error: '服务器错误: ' + e.message }, 500);
  }
}

// POST /api/admin/password
// 首次设置管理员密码
// 逻辑：如果KV已存在密码，拒绝（需用环境变量ADMIN_KEY或后台重置）
//      如果KV无密码，接受设置，同时把 admin_key 写入 KV 供后续校验
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { admin_key, hash } = body;

    if (!admin_key || !hash) {
      return json({ error: '参数不完整' }, 400);
    }

    // 已设置过密码则拒绝重复设置
    const existing = await env.PANEL_KV.get('chat:admin:password_hash');
    if (existing) {
      return json({ error: '密码已设置，无法重复设置' }, 403);
    }

    // 存入密码hash
    await env.PANEL_KV.put('chat:admin:password_hash', hash);
    // 把 admin_key 也存入KV，作为后续所有管理操作的校验密钥
    await env.PANEL_KV.put('chat:admin:key', admin_key);

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

export async function onRequest(context) {
  const { request, env } = context;
  
  // 读取admin-panel.html文件
  const html = await Deno.readTextFile('./admin-panel.html');
  
  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}

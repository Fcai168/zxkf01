export async function onRequest(context) {
  const { request, env } = context;
  
  // 读取chat-v2.html文件
  const html = await Deno.readTextFile('./chat-v2.html');
  
  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}

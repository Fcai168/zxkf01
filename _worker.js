// Cloudflare Pages routing config
export default {
  routes: [
    {
      pattern: '/chat-fullscreen.html',
      handler: 'staticAssets'
    },
    {
      pattern: '/admin-chat.new.html',
      handler: 'staticAssets'
    },
    {
      pattern: '/customer-service.new.html',
      handler: 'staticAssets'
    }
  ]
};

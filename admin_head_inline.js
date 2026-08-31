        const ADMIN_PASSWORD = 'admin123';
        
        function checkPassword() {
            const input = document.getElementById('passwordInput').value;
            if (input === ADMIN_PASSWORD) {
                sessionStorage.setItem('adminAuthenticated', 'true');
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('mainInterface').style.display = 'flex';
                initApp();
            } else {
                alert('密码错误，请重试');
            }
        }
        
        document.getElementById('passwordInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') checkPassword();
        });

        // ===== Supabase 数据层（跨设备同步）=====
        const SUPABASE_URL = 'https://qafwjrfozumfzhrbtuue.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZndqcmZvenVtZnpocmJ0dXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDk0NjQsImV4cCI6MjEwMTUyNTQ2NH0.vztS1Ar2ec9bnWuhdVUS76dF04PnJjDWBVnWZKuOB4I';
        let supabase;
        try { supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
        catch(e) { console.error('Supabase初始化失败', e); }

        let pendingLogo = null;

        function formatTime(ts) {
            if (!ts) return '';
            return new Date(ts).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
        }

        function compressImage(dataUrl, maxW, quality) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    const scale = Math.min(1, maxW / img.width);
                    const c = document.createElement('canvas');
                    c.width = Math.round(img.width * scale);
                    c.height = Math.round(img.height * scale);
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    resolve(c.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => resolve(dataUrl);
                img.src = dataUrl;
            });
        }

        function initApp() {
            if (!sessionStorage.getItem('adminAuthenticated')) {
                document.getElementById('loginOverlay').style.display = 'flex';
                document.getElementById('mainInterface').style.display = 'none';
                return;
            }
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainInterface').style.display = 'flex';
            loadConfig();
            renderUserList();
            startListening();
        }

        function logout() {
            sessionStorage.removeItem('adminAuthenticated');
            window.location.reload();
        }

        let users = [];
        let currentUser = null;
        let agentImage = null;
        let currentTab = 'online';

        function switchMain(tab) {
            if (tab === 'settings') {
                document.querySelector('.main-wrapper').style.display = 'none';
                document.getElementById('settings').style.display = 'flex';
            } else {
                document.querySelector('.main-wrapper').style.display = 'flex';
                document.getElementById('settings').style.display = 'none';
            }
        }

        function switchToSettings() {
            switchMain('settings');
        }

        function switchUserTab(type, el) {
            document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('active'));
            el.classList.add('active');
            currentTab = type;
            renderUserList();
        }

        async function renderUserList() {
            const list = document.getElementById('userList');
            if (!supabase) { list.innerHTML = '<div class="empty-tip">数据库连接失败</div>'; return; }
            try {
                // 拉取全部消息，按访客分组
                const { data: msgs, error } = await supabase.from('messages').select('*').order('created_at', {ascending: true});
                if (error) throw error;
                const groups = {};
                (msgs || []).forEach(m => {
                    if (!groups[m.visitor_id]) groups[m.visitor_id] = {id: m.visitor_id, last: 0, total: 0, unread: 0};
                    groups[m.visitor_id].total++;
                    const t = new Date(m.created_at).getTime();
                    if (t > groups[m.visitor_id].last) groups[m.visitor_id].last = t;
                    if (m.from_role === 'visitor' && m.status !== 'read') groups[m.visitor_id].unread++;
                });
                const now = Date.now();
                const ONLINE_MS = 30 * 60 * 1000; // 30分钟内有消息视为在线
                users = Object.values(groups)
                    .map(g => ({...g, status: now - g.last < ONLINE_MS ? 'online' : 'offline', name: '访客 ' + g.id.slice(-4).toUpperCase()}))
                    .sort((a, b) => b.last - a.last);
                
                const filtered = currentTab === 'online' ? users.filter(u => u.status === 'online') : users;
                if (filtered.length === 0) {
                    list.innerHTML = '<div class="empty-tip">暂无用户</div>';
                    return;
                }
                list.innerHTML = filtered.map(u => `
                    <div class="user-item ${currentUser?.id === u.id ? 'active' : ''}" 
                         onclick="selectUser('${escapeHtml(u.id)}')" 
                         role="button" 
                         tabindex="0" 
                         aria-label="选择用户 ${escapeHtml(u.name)}">
                        <div class="user-avatar">👤</div>
                        <div class="user-name">${escapeHtml(u.name)}</div>
                        <div class="user-status ${u.status}">${u.status === 'online' ? '在线' : '离线'}</div>
                    </div>
                `).join('');
            } catch(e) {
                console.error('渲染用户列表失败', e);
                list.innerHTML = '<div class="empty-tip">加载用户失败，请刷新</div>';
            }
        }

        let agentChannel = null;
        function msgHtml(m) {
            const cls = m.from_role === 'agent' ? 'agent' : 'user';
            const pic = m.type === 'image' && m.file ? `<img src="${escapeHtml(m.file)}" alt="图片">` : '';
            const txt = m.type === 'text' && m.content ? escapeHtml(m.content).replace(/\n/g, '<br>') : '';
            return `<div class="msg ${cls}">${pic}${txt}<div class="msg-time">${escapeHtml(formatTime(m.created_at))}</div></div>`;
        }

        async function selectUser(userId) {
            currentUser = users.find(u => u.id === userId);
            if (!currentUser) return;
            document.getElementById('chatName').textContent = currentUser.name;
            document.getElementById('chatStatus').textContent = currentUser.status === 'online' ? '在线' : '离线';
            renderUserList();
            await renderChat();
            // 订阅该访客的实时消息
            if (agentChannel) agentChannel.unsubscribe();
            agentChannel = supabase.channel('admin-' + userId)
                .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'messages'}, async (payload) => {
                    const m = payload.new;
                    if (m.visitor_id !== userId) return;
                    if (m.from_role === 'visitor') {
                        const g = users.find(u => u.id === userId);
                        if (g) g.unread++;
                    }
                    if (currentUser && currentUser.id === userId) {
                        const container = document.getElementById('chatMessages');
                        container.insertAdjacentHTML('beforeend', msgHtml(m));
                        container.scrollTop = container.scrollHeight;
                    }
                    renderUserList();
                }).subscribe();
        }

        async function renderChat() {
            const container = document.getElementById('chatMessages');
            if (!currentUser || !supabase) { container.innerHTML = '<div class="empty-tip">暂无消息</div>'; return; }
            try {
                const { data: msgs, error } = await supabase
                    .from('messages').select('*').eq('visitor_id', currentUser.id).order('created_at', {ascending: true});
                if (error) throw error;
                container.innerHTML = (msgs || []).length
                    ? msgs.map(msgHtml).join('')
                    : '<div class="empty-tip">暂无消息</div>';
                // 标记访客消息为已读
                const unread = (msgs || []).filter(m => m.from_role === 'visitor' && m.status !== 'read').map(m => m.id);
                if (unread.length) await supabase.from('messages').update({status: 'read'}).in('id', unread);
                container.scrollTop = container.scrollHeight;
            } catch(e) {
                console.error('渲染聊天失败', e);
                container.innerHTML = '<div class="empty-tip">加载消息失败，请刷新</div>';
            }
        }

        function startListening() {
            // 每3秒刷新用户列表（发现新访客）；选中访客的消息走 Supabase 实时推送
            renderUserList();
            setInterval(renderUserList, 3000);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') renderUserList();
            });
        }

        function agentSend() {
            const text = document.getElementById('agentInput').value.trim();
            if (!text && !agentImage) return;
            if (!currentUser) { alert('请先选择用户'); return; }
            if (!supabase) { alert('数据库连接失败'); return; }

            const btn = document.getElementById('agentSendBtn');
            btn.disabled = true;
            doAgentSend(text, btn);
        }

        async function doAgentSend(text, btn) {
            try {
                let file = agentImage;
                if (file) file = await compressImage(file, 900, 0.7);
                const msgId = 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                const { error } = await supabase.from('messages').insert({
                    id: msgId,
                    visitor_id: currentUser.id,
                    from_role: 'agent',
                    type: file ? 'image' : 'text',
                    content: text || null,
                    file: file || null,
                    status: 'sent',
                    created_at: new Date().toISOString()
                });
                if (error) throw error;
                document.getElementById('agentInput').value = '';
                removeAgentImg();
                await renderChat();
                renderUserList();
            } catch(e) {
                console.error('发送失败', e);
                alert('发送失败，请重试');
            } finally {
                btn.disabled = false;
            }
        }

        function handleAgentFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 5 * 1024 * 1024) {
                alert('图片大小不能超过5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(ev) {
                agentImage = ev.target.result;
                document.getElementById('agentPreviewImg').src = agentImage;
                document.getElementById('agentImgPreview').classList.add('active');
            };
            reader.onerror = function() {
                alert('图片读取失败，请重试');
            };
            reader.readAsDataURL(file);
        }

        function removeAgentImg() {
            agentImage = null;
            document.getElementById('agentImgPreview').classList.remove('active');
            document.getElementById('agentFileInput').value = '';
        }

        function handleLogo(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                pendingLogo = ev.target.result;
                const preview = document.getElementById('logoPreview');
                preview.innerHTML = `<img src="${pendingLogo}" alt="Logo">`;
            };
            reader.readAsDataURL(file);
        }

        async function saveSettings() {
            const name = document.getElementById('nameInput').value.trim();
            if (!name) { alert('请输入名称'); return; }
            if (!supabase) { alert('数据库连接失败'); return; }
            const { error } = await supabase.from('config').upsert({key: 'title', value: name});
            alert(error ? '保存失败：' + error.message : '✅ 保存成功（所有设备生效）');
        }

        async function saveLogo() {
            if (!pendingLogo) { alert('请先选择Logo图片'); return; }
            if (!supabase) { alert('数据库连接失败'); return; }
            const logo = await compressImage(pendingLogo, 300, 0.85);
            const { error } = await supabase.from('config').upsert({key: 'logo', value: logo});
            if (error) { alert('保存失败：' + error.message); return; }
            pendingLogo = null;
            alert('✅ Logo已保存（所有设备生效）');
        }

        async function loadConfig() {
            if (!supabase) return;
            try {
                const { data } = await supabase.from('config').select('key, value').in('key', ['title', 'logo']);
                const cfg = {};
                (data || []).forEach(r => cfg[r.key] = r.value);
                const preview = document.getElementById('logoPreview');
                if (cfg.logo) {
                    preview.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = cfg.logo;
                    img.alt = 'Logo';
                    preview.appendChild(img);
                }
                if (cfg.title) document.getElementById('nameInput').value = cfg.title;
            } catch(e) { console.error('加载配置失败', e); }
        }

        function escapeHtml(text) {
            if (!text) return '';
            const d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        }

        document.getElementById('agentInput').addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 80) + 'px';
            document.getElementById('agentSendBtn').disabled = !this.value.trim() && !agentImage;
        });

        document.getElementById('agentInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                agentSend(); 
            }
        });

        window.addEventListener('load', function() {
            if (sessionStorage.getItem('adminAuthenticated')) {
                initApp();
            }
        });

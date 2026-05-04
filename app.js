// ===== TASKFLOW — Todo List with Supabase Database =====
// Konfigurasi Supabase - Ganti dengan kredensial Anda
const SUPABASE_URL = 'https://vquvvbjrnwwruhnxbpdn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdXZ2Ympybnd3cnVobnhicGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTkzNjEsImV4cCI6MjA5MzM5NTM2MX0.z-PblW64skuUgAIfXh-IppGBkV2BK5GbeOOA9P2nk8w';

class TaskflowApp {
    constructor() {
        this.supabase = null;
        this.tasks = [];
        this.currentFilter = 'incomplete';
        this.searchQuery = '';
        this.editingId = null;
        this.username = '';
        this.init();
    }

    init() {
        this.initTheme();

        // Try hardcoded config first, then localStorage
        let config = null;
        if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
            config = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
        } else {
            try {
                const saved = localStorage.getItem('taskflow_config');
                config = saved ? JSON.parse(saved) : null;
            } catch { }
        }

        if (config) {
            try {
                this.supabase = window.supabase.createClient(config.url, config.key);
            } catch (err) {
                console.error('Supabase init error:', err);
            }
        }

        // Setup all event listeners first
        this.setupEventListeners();

        // Set default tanggal ke hari ini
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-date').value = today;

        // Show setup modal if no config
        if (!this.supabase) {
            document.getElementById('setup-modal').classList.add('active');
            return;
        }

        // Check if user is logged in
        const savedUser = localStorage.getItem('taskflow_user');
        if (savedUser) {
            this.username = savedUser;
            this.showApp();
        }
    }

    setupEventListeners() {
        // Setup modal
        document.getElementById('setup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });
        document.getElementById('btn-setup-close').addEventListener('click', () => {
            document.getElementById('setup-modal').classList.remove('active');
        });

        // Theme
        document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());

        // Users
        document.getElementById('btn-users').addEventListener('click', () => this.openUsersModal());
        document.getElementById('btn-users-close').addEventListener('click', () => {
            document.getElementById('users-modal').classList.remove('active');
        });

        // Subtasks UI
        const hasSubtasksToggle = document.getElementById('has-subtasks');
        if (hasSubtasksToggle) {
            hasSubtasksToggle.addEventListener('change', (e) => {
                document.getElementById('subtasks-container').style.display = e.target.checked ? 'block' : 'none';
            });
        }
        
        document.getElementById('btn-add-subtask').addEventListener('click', () => {
            const list = document.getElementById('subtasks-list');
            list.insertAdjacentHTML('beforeend', `
                <div class="subtask-input-wrapper" style="display: flex; gap: 8px;">
                    <input type="text" class="subtask-input main-input" placeholder="Nama sub-task..." style="padding: 8px 12px; font-size: 0.85rem;">
                    <button type="button" class="btn-icon btn-remove-subtask" onclick="this.parentElement.remove()" style="width: 34px; height: 34px; flex-shrink: 0; color: var(--danger);">&times;</button>
                </div>
            `);
        });

        document.getElementById('btn-edit-add-subtask').addEventListener('click', () => {
            const list = document.getElementById('edit-subtasks-list');
            list.insertAdjacentHTML('beforeend', `
                <div class="subtask-input-wrapper" style="display: flex; gap: 8px; align-items: center;">
                    <input type="checkbox" class="edit-subtask-check" style="cursor: pointer; width: 16px; height: 16px;">
                    <input type="text" class="edit-subtask-input main-input" placeholder="Nama sub-task..." style="padding: 6px 10px; font-size: 0.85rem;">
                    <button type="button" class="btn-icon btn-remove-subtask" onclick="this.parentElement.remove()" style="width: 30px; height: 30px; flex-shrink: 0; color: var(--danger);">&times;</button>
                </div>
            `);
        });

        const editHasSubtasks = document.getElementById('edit-has-subtasks');
        if (editHasSubtasks) {
            editHasSubtasks.addEventListener('change', (e) => {
                document.getElementById('edit-notes-group').style.display = e.target.checked ? 'none' : 'block';
                document.getElementById('edit-subtasks-group').style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', () => this.logout());

        // Add task form
        document.getElementById('add-task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTasks();
        });

        // Filter tabs
        document.getElementById('filter-tabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tab')) {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderTasks();
            }
        });

        // Clear completed
        document.getElementById('btn-clear-completed').addEventListener('click', () => this.clearCompleted());

        // Export/Import
        document.getElementById('btn-export').addEventListener('click', () => this.exportJSON());
        document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', (e) => this.importJSON(e));

        // Edit Modal
        document.getElementById('btn-modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-edit').addEventListener('click', () => this.closeModal());
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') this.closeModal();
        });
        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.getElementById('setup-modal').classList.remove('active');
            }
        });
    }

    // ===== THEME =====
    initTheme() {
        const savedTheme = localStorage.getItem('taskflow_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            const btn = document.getElementById('btn-theme');
            if(btn) btn.textContent = '🌙';
        } else {
            const btn = document.getElementById('btn-theme');
            if(btn) btn.textContent = '☀️';
        }
    }

    toggleTheme() {
        const isLight = document.body.classList.toggle('light-mode');
        const btn = document.getElementById('btn-theme');
        if(btn) btn.textContent = isLight ? '🌙' : '☀️';
        localStorage.setItem('taskflow_theme', isLight ? 'light' : 'dark');
    }

    // ===== USERS =====
    async openUsersModal() {
        document.getElementById('users-modal').classList.add('active');
        document.getElementById('users-spinner').style.display = 'block';
        document.getElementById('users-list').innerHTML = '';

        try {
            const { data, error } = await this.supabase
                .from('todos')
                .select('username, status, completed');

            if (error) throw error;

            const userMap = {};
            (data || []).forEach(row => {
                const u = row.username;
                if (!u) return;
                if (!userMap[u]) userMap[u] = { active: 0, completed: 0, total: 0 };
                userMap[u].total++;
                if (row.status === 'completed' || row.completed) userMap[u].completed++;
                else userMap[u].active++;
            });

            const users = Object.keys(userMap).map(u => ({ username: u, ...userMap[u] }));
            users.sort((a, b) => b.total - a.total);

            const listHtml = users.map(u => `
                <li class="task-item" style="justify-content: space-between;">
                    <div class="task-info">
                        <div class="task-title" style="font-weight:700;">👤 ${this.escapeHtml(u.username)}</div>
                        <div class="task-meta" style="margin-top: 6px;">
                            <span class="task-tag tag-category">Total: ${u.total}</span>
                            <span class="task-tag tag-status-active">Aktif: ${u.active}</span>
                            <span class="task-tag tag-status-completed">Selesai: ${u.completed}</span>
                        </div>
                    </div>
                </li>
            `).join('');

            document.getElementById('users-list').innerHTML = users.length ? listHtml : '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">Belum ada user</p>';
        } catch (err) {
            console.error('Fetch users error:', err);
            this.showToast('Gagal memuat data user', 'error');
        }

        document.getElementById('users-spinner').style.display = 'none';
    }

    // ===== SUPABASE CONFIG =====
    saveConfig() {
        const url = document.getElementById('setup-url').value.trim();
        const key = document.getElementById('setup-key').value.trim();
        if (!url || !key) return;

        try {
            this.supabase = window.supabase.createClient(url, key);
            localStorage.setItem('taskflow_config', JSON.stringify({ url, key }));
            document.getElementById('setup-modal').classList.remove('active');
            this.showToast('Konfigurasi berhasil disimpan!', 'success');
        } catch (err) {
            this.showToast('Konfigurasi tidak valid: ' + err.message, 'error');
        }
    }

    // ===== AUTH (Simple Username) =====
    async login() {
        const input = document.getElementById('login-username');
        const btn = document.getElementById('btn-login');
        const username = input.value.trim().toLowerCase();
        if (!username || username.length < 3) {
            this.showToast('Username minimal 3 karakter', 'error');
            return;
        }

        if (!this.supabase) {
            this.showToast('Database belum dikonfigurasi!', 'error');
            document.getElementById('setup-modal').classList.add('active');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Memuat...';

        try {
            // Test connection by trying to read
            const { error } = await this.supabase
                .from('todos')
                .select('id')
                .eq('username', username)
                .limit(1);

            if (error) throw error;

            this.username = username;
            localStorage.setItem('taskflow_user', username);
            this.showApp();
        } catch (err) {
            console.error('Login error:', err);
            this.showToast('Gagal terhubung ke database: ' + (err.message || 'Cek konfigurasi Supabase'), 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Masuk';
    }

    logout() {
        localStorage.removeItem('taskflow_user');
        this.username = '';
        this.tasks = [];
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-screen').style.display = '';
        document.getElementById('login-screen').classList.remove('hidden');
    }

    async showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = '';
        document.getElementById('user-badge').textContent = '👤 ' + this.username;
        await this.loadTasks();
    }

    // ===== DATABASE OPERATIONS =====
    async loadTasks() {
        document.getElementById('loading-spinner').classList.add('visible');
        try {
            const { data, error } = await this.supabase
                .from('todos')
                .select('*')
                .eq('username', this.username)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const todayDate = new Date().toISOString().split('T')[0];
            const updates = [];

            this.tasks = (data || []).map(row => {
                const parsed = this.parseNotes(row.notes);
                let status = row.status || (row.completed ? 'completed' : 'active');
                let notes = row.notes || '';

                if (parsed.isDaily && status === 'completed') {
                    const updatedDate = new Date(row.updated_at).toISOString().split('T')[0];
                    if (updatedDate < todayDate) {
                        status = 'active';
                        if (parsed.subtasks.length > 0) {
                            parsed.subtasks.forEach(s => s.completed = false);
                        }
                        notes = this.buildNotes(true, parsed.subtasks, parsed.text, null);
                        updates.push({ id: row.id, status: 'active', completed: false, notes: notes, updated_at: new Date().toISOString() });
                    }
                }

                return {
                    id: row.id,
                    title: row.title,
                    status: status,
                    priority: row.priority,
                    category: row.category,
                    dueDate: row.due_date,
                    notes: notes,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
            });

            if (updates.length > 0) {
                updates.forEach(async u => {
                    await this.supabase.from('todos').update(u).eq('id', u.id);
                });
            }
        } catch (err) {
            console.error('Load error:', err);
            this.showToast('Gagal memuat data: ' + (err.message || 'Unknown error'), 'error');
        }
        document.getElementById('loading-spinner').classList.remove('visible');
        this.updateStats();
        this.renderTasks();
    }

    async addTask() {
        const input = document.getElementById('task-input');
        const title = input.value.trim();
        if (!title) return;

        let notesValue = '';
        const isDailyToggle = document.getElementById('has-daily');
        const isDaily = isDailyToggle ? isDailyToggle.checked : false;
        const hasSubtasksToggle = document.getElementById('has-subtasks');
        
        let subInputs = [];
        if (hasSubtasksToggle && hasSubtasksToggle.checked) {
            subInputs = Array.from(document.querySelectorAll('.subtask-input')).map(i => i.value.trim()).filter(v => v);
        }
        
        notesValue = this.buildNotes(isDaily, subInputs.map(t => ({ title: t, completed: false })), '');

        const now = new Date().toISOString();
        const taskData = {
            username: this.username,
            title,
            completed: false,
            status: 'active',
            priority: document.getElementById('task-priority').value,
            category: document.getElementById('task-category').value,
            due_date: document.getElementById('task-date').value || null,
            notes: notesValue,
            created_at: now,
            updated_at: now
        };

        try {
            const { data, error } = await this.supabase
                .from('todos')
                .insert([taskData])
                .select();

            if (error) throw error;

            const row = data[0];
            this.tasks.unshift({
                id: row.id,
                title: row.title,
                status: row.status || 'active',
                priority: row.priority,
                category: row.category,
                dueDate: row.due_date,
                notes: row.notes || '',
                createdAt: row.created_at,
                updatedAt: row.updated_at
            });

            this.updateStats();
            this.renderTasks();
            input.value = '';
            document.getElementById('task-date').value = new Date().toISOString().split('T')[0];
            const hasSubtasksToggle = document.getElementById('has-subtasks');
            if (hasSubtasksToggle) {
                hasSubtasksToggle.checked = false;
                document.getElementById('subtasks-container').style.display = 'none';
                document.getElementById('subtasks-list').innerHTML = `
                    <div class="subtask-input-wrapper" style="display: flex; gap: 8px;">
                        <input type="text" class="subtask-input main-input" placeholder="Nama sub-task..." style="padding: 8px 12px; font-size: 0.85rem;">
                        <button type="button" class="btn-icon btn-remove-subtask" onclick="this.parentElement.remove()" style="width: 34px; height: 34px; flex-shrink: 0; color: var(--danger);">&times;</button>
                    </div>`;
            }
            const isDailyToggle = document.getElementById('has-daily');
            if (isDailyToggle) isDailyToggle.checked = false;
            input.focus();
            this.showToast('Tugas berhasil ditambahkan!', 'success');
        } catch (err) {
            console.error('Add error:', err);
            this.showToast('Gagal menambahkan tugas: ' + err.message, 'error');
        }
    }

    async cycleStatus(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const cycle = { active: 'progress', progress: 'completed', completed: 'active' };
        const newStatus = cycle[task.status] || 'active';
        const newCompleted = newStatus === 'completed';
        
        let newNotes = task.notes;
        const parsed = this.parseNotes(task.notes);
        if (newCompleted) {
            newNotes = this.buildNotes(parsed.isDaily, parsed.subtasks, parsed.text, new Date().toISOString());
        } else if (parsed.completedAt) {
            newNotes = this.buildNotes(parsed.isDaily, parsed.subtasks, parsed.text, null);
        }

        try {
            const { error } = await this.supabase
                .from('todos')
                .update({ status: newStatus, completed: newCompleted, notes: newNotes, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            task.status = newStatus;
            task.notes = newNotes;
            task.updatedAt = new Date().toISOString();
            this.updateStats();
            this.renderTasks();
        } catch (err) {
            this.showToast('Gagal mengupdate status', 'error');
        }
    }

    async toggleSubtask(taskId, subtaskIdx) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        try {
            const parsed = this.parseNotes(task.notes);
            if (parsed.subtasks[subtaskIdx]) {
                parsed.subtasks[subtaskIdx].completed = !parsed.subtasks[subtaskIdx].completed;
            }
            const newNotes = this.buildNotes(parsed.isDaily, parsed.subtasks, parsed.text);
            
            const { error } = await this.supabase
                .from('todos')
                .update({ notes: newNotes, updated_at: new Date().toISOString() })
                .eq('id', taskId);

            if (error) throw error;
            
            task.notes = newNotes;
            task.updatedAt = new Date().toISOString();
            this.renderTasks();
        } catch (err) {
            console.error(err);
            this.showToast('Gagal mengubah status sub-task', 'error');
        }
    }

    async deleteTask(id) {
        const item = document.querySelector(`[data-id="${id}"]`);
        if (item) item.classList.add('removing');

        try {
            const { error } = await this.supabase
                .from('todos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTimeout(() => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.updateStats();
                this.renderTasks();
                this.showToast('Tugas dihapus', 'info');
            }, 300);
        } catch (err) {
            if (item) item.classList.remove('removing');
            this.showToast('Gagal menghapus tugas', 'error');
        }
    }

    openEdit(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        this.editingId = id;
        document.getElementById('edit-title').value = task.title;
        document.getElementById('edit-status').value = task.status;
        document.getElementById('edit-priority').value = task.priority;
        document.getElementById('edit-category').value = task.category;
        document.getElementById('edit-date').value = task.dueDate || '';
        
        const parsed = this.parseNotes(task.notes);
        let isSubtask = parsed.subtasks.length > 0;
        let isDaily = parsed.isDaily;

        const toggle = document.getElementById('edit-has-subtasks');
        if (toggle) {
            toggle.checked = isSubtask;
            document.getElementById('edit-notes-group').style.display = isSubtask ? 'none' : 'block';
            document.getElementById('edit-subtasks-group').style.display = isSubtask ? 'block' : 'none';
        }
        
        const dailyToggle = document.getElementById('edit-has-daily');
        if (dailyToggle) dailyToggle.checked = isDaily;

        if (isSubtask) {
            const list = document.getElementById('edit-subtasks-list');
            list.innerHTML = parsed.subtasks.map(s => `
                <div class="subtask-input-wrapper" style="display: flex; gap: 8px; align-items: center;">
                    <input type="checkbox" class="edit-subtask-check" ${s.completed ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
                    <input type="text" class="edit-subtask-input main-input" value="${this.escapeHtml(s.title).replace(/"/g, '&quot;')}" style="padding: 6px 10px; font-size: 0.85rem;">
                    <button type="button" class="btn-icon btn-remove-subtask" onclick="this.parentElement.remove()" style="width: 30px; height: 30px; flex-shrink: 0; color: var(--danger);">&times;</button>
                </div>
            `).join('');
            document.getElementById('edit-notes').value = parsed.text || '';
        } else {
            document.getElementById('edit-notes').value = parsed.text || '';
            document.getElementById('edit-subtasks-list').innerHTML = `
                <div class="subtask-input-wrapper" style="display: flex; gap: 8px; align-items: center;">
                    <input type="checkbox" class="edit-subtask-check" style="cursor: pointer; width: 16px; height: 16px;">
                    <input type="text" class="edit-subtask-input main-input" placeholder="Nama sub-task..." style="padding: 6px 10px; font-size: 0.85rem;">
                    <button type="button" class="btn-icon btn-remove-subtask" onclick="this.parentElement.remove()" style="width: 30px; height: 30px; flex-shrink: 0; color: var(--danger);">&times;</button>
                </div>`;
        }

        document.getElementById('edit-modal').classList.add('active');
    }

    async saveEdit() {
        const task = this.tasks.find(t => t.id === this.editingId);
        if (!task) return;

        const parsed = this.parseNotes(task.notes);
        let notesValue = '';
        const toggle = document.getElementById('edit-has-subtasks');
        const dailyToggle = document.getElementById('edit-has-daily');
        const isDaily = dailyToggle ? dailyToggle.checked : false;
        const textNotes = document.getElementById('edit-notes').value.trim();
        
        const newStatus = document.getElementById('edit-status').value;
        const newCompleted = newStatus === 'completed';
        let completedAt = parsed.completedAt;
        if (newCompleted && task.status !== 'completed') {
            completedAt = new Date().toISOString();
        } else if (!newCompleted) {
            completedAt = null;
        }

        if (toggle && toggle.checked) {
            const wrappers = document.querySelectorAll('#edit-subtasks-list .subtask-input-wrapper');
            const items = [];
            wrappers.forEach(w => {
                const title = w.querySelector('.edit-subtask-input').value.trim();
                const completed = w.querySelector('.edit-subtask-check').checked;
                if (title) items.push({ title, completed });
            });
            notesValue = this.buildNotes(isDaily, items, textNotes, completedAt);
        } else {
            notesValue = this.buildNotes(isDaily, [], textNotes, completedAt);
        }

        const updates = {
            title: document.getElementById('edit-title').value.trim(),
            status: document.getElementById('edit-status').value,
            completed: document.getElementById('edit-status').value === 'completed',
            priority: document.getElementById('edit-priority').value,
            category: document.getElementById('edit-category').value,
            due_date: document.getElementById('edit-date').value || null,
            notes: notesValue,
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await this.supabase
                .from('todos')
                .update(updates)
                .eq('id', this.editingId);

            if (error) throw error;

            task.title = updates.title;
            task.status = updates.status;
            task.priority = updates.priority;
            task.category = updates.category;
            task.dueDate = updates.due_date;
            task.notes = updates.notes;
            task.updatedAt = updates.updated_at;

            this.updateStats();
            this.renderTasks();
            this.closeModal();
            this.showToast('Tugas berhasil diperbarui!', 'success');
        } catch (err) {
            this.showToast('Gagal menyimpan perubahan', 'error');
        }
    }

    closeModal() {
        document.getElementById('edit-modal').classList.remove('active');
        this.editingId = null;
    }

    async clearCompleted() {
        const count = this.tasks.filter(t => t.status === 'completed').length;
        if (count === 0) return;
        if (!confirm(`Hapus ${count} tugas yang sudah selesai?`)) return;

        try {
            const { error } = await this.supabase
                .from('todos')
                .delete()
                .eq('username', this.username)
                .eq('status', 'completed');

            if (error) throw error;
            this.tasks = this.tasks.filter(t => t.status !== 'completed');
            this.updateStats();
            this.renderTasks();
            this.showToast(`${count} tugas dihapus`, 'info');
        } catch (err) {
            this.showToast('Gagal menghapus tugas', 'error');
        }
    }

    // ===== RENDER =====
    getFilteredTasks() {
        return this.tasks.filter(task => {
            const matchFilter = this.currentFilter === 'all' ||
                (this.currentFilter === 'incomplete' && (task.status === 'active' || task.status === 'progress')) ||
                (this.currentFilter === 'active' && task.status === 'active') ||
                (this.currentFilter === 'progress' && task.status === 'progress') ||
                (this.currentFilter === 'completed' && task.status === 'completed');
            const matchSearch = !this.searchQuery ||
                task.title.toLowerCase().includes(this.searchQuery) ||
                (task.notes && task.notes.toLowerCase().includes(this.searchQuery));
            return matchFilter && matchSearch;
        });
    }

    renderTasks() {
        const list = document.getElementById('task-list');
        const empty = document.getElementById('empty-state');
        const filtered = this.getFilteredTasks();
        const btnClear = document.getElementById('btn-clear-completed');
        const hasCompleted = this.tasks.some(t => t.status === 'completed');

        btnClear.classList.toggle('visible', hasCompleted);

        if (filtered.length === 0) {
            list.innerHTML = '';
            empty.classList.add('visible');
            return;
        }

        empty.classList.remove('visible');
        const categoryLabels = {
            personal: '👤', work: '💼', study: '📚',
            health: '💪', finance: '💰', other: '📌'
        };
        const statusLabels = {
            active: '📝 Aktif',
            progress: '🔄 Proses',
            completed: '✅ Selesai'
        };
        const statusIcons = { active: '', progress: '◐', completed: '✓' };

        list.innerHTML = filtered.map(task => {
            const isOverdue = task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < new Date();
            const dateStr = task.dueDate ? this.formatDate(task.dueDate) : '';
            
            const parsed = this.parseNotes(task.notes);
            const isDaily = parsed.isDaily;
            let subtasksHtml = '';
            
            if (parsed.subtasks.length > 0) {
                const subtasks = parsed.subtasks;
                const completedCount = subtasks.filter(s => s.completed).length;
                subtasksHtml = `
                    <div class="subtasks-wrapper" style="margin-top: 12px; width: 100%; border-top: 1px dashed var(--border); padding-top: 10px;">
                        <div class="subtasks-progress" style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px;">
                            Progress: ${completedCount}/${subtasks.length} Selesai
                        </div>
                        <ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;">
                            ${subtasks.map((s, idx) => `
                                <li style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" ${s.completed ? 'checked' : ''} onclick="app.toggleSubtask(${task.id}, ${idx})" style="cursor: pointer; width: 16px; height: 16px; flex-shrink:0;">
                                    <span style="font-size: 0.85rem; color: var(--text-secondary); ${s.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${this.escapeHtml(s.title)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }

            const dailyBadge = isDaily ? `<span class="task-tag" style="background:rgba(6, 182, 212, 0.15); color:#06b6d4;">🔄 Daily</span>` : '';

            return `
                <li class="task-item ${task.status}" data-id="${task.id}" style="flex-wrap: wrap;">
                    <div style="display: flex; width: 100%; gap: 12px; align-items: center;">
                        <div class="drag-handle" style="cursor: grab; color: var(--text-muted); font-size: 1.2rem; padding-right: 4px; user-select: none;" title="Drag untuk mengubah urutan">⋮⋮</div>
                        <button class="task-checkbox" onclick="app.cycleStatus(${task.id})" aria-label="Ubah status" title="Klik: ${task.status === 'active' ? 'Mulai Proses' : task.status === 'progress' ? 'Tandai Selesai' : 'Reset ke Aktif'}">
                            ${statusIcons[task.status] || ''}
                        </button>
                        <div class="task-info">
                            <div class="task-title">${this.escapeHtml(task.title)}</div>
                            <div class="task-meta">
                                ${dailyBadge}
                                ${task.status === 'completed' && parsed.completedAt ? `<span class="task-tag tag-status-completed" style="background:rgba(52,211,153,0.15); color:var(--success);">🏁 ${this.formatDate(parsed.completedAt)} ${new Date(parsed.completedAt).getHours().toString().padStart(2,'0')}:${new Date(parsed.completedAt).getMinutes().toString().padStart(2,'0')}</span>` : ''}
                                <span class="task-tag tag-status-${task.status}">${statusLabels[task.status]}</span>
                                <span class="task-tag tag-priority-${task.priority}">${task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}</span>
                                <span class="task-tag tag-category">${categoryLabels[task.category] || '📌'} ${task.category}</span>
                                ${dateStr ? `<span class="task-tag ${isOverdue ? 'tag-overdue' : 'tag-date'}">${isOverdue ? '⚠️ ' : '📅 '}${dateStr}</span>` : ''}
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="btn-task" onclick="app.openEdit(${task.id})" title="Edit">✏️</button>
                            <button class="btn-task btn-delete" onclick="app.deleteTask(${task.id})" title="Hapus">🗑️</button>
                        </div>
                    </div>
                    ${subtasksHtml}
                </li>
            `;
        }).join('');

        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }
        
        // Cek jika Sortable tersedia
        if (typeof Sortable !== 'undefined') {
            this.sortableInstance = new Sortable(list, {
                handle: '.drag-handle',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    if (newIndex === oldIndex) return;

                    const movedTask = filtered[oldIndex];
                    let prevTask = null;
                    let nextTask = null;

                    if (newIndex > oldIndex) {
                        prevTask = filtered[newIndex];
                        nextTask = filtered[newIndex + 1] || null;
                    } else {
                        prevTask = filtered[newIndex - 1] || null;
                        nextTask = filtered[newIndex];
                    }

                    let newTime;
                    if (!prevTask && nextTask) {
                        newTime = new Date(new Date(nextTask.createdAt).getTime() + 60000).toISOString();
                    } else if (prevTask && !nextTask) {
                        newTime = new Date(new Date(prevTask.createdAt).getTime() - 60000).toISOString();
                    } else if (prevTask && nextTask) {
                        const prevTime = new Date(prevTask.createdAt).getTime();
                        const nextTime = new Date(nextTask.createdAt).getTime();
                        newTime = new Date((prevTime + nextTime) / 2).toISOString();
                    } else {
                        return;
                    }

                    const taskRef = this.tasks.find(t => t.id === movedTask.id);
                    if (taskRef) taskRef.createdAt = newTime;

                    this.tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    this.supabase.from('todos').update({ created_at: newTime }).eq('id', movedTask.id).then();
                    this.renderTasks();
                }
            });
        }
    }

    // ===== STATS =====
    updateStats() {
        const total = this.tasks.length;
        const active = this.tasks.filter(t => t.status === 'active').length;
        const progress = this.tasks.filter(t => t.status === 'progress').length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-active').textContent = active;
        document.getElementById('stat-progress').textContent = progress;
        document.getElementById('stat-completed').textContent = completed;
    }

    // ===== EXPORT / IMPORT =====
    exportJSON() {
        const data = JSON.stringify(this.tasks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow_${this.username}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Data berhasil di-export!', 'success');
    }

    async importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error('Format tidak valid');
                if (!confirm(`Import ${data.length} tugas?`)) return;

                const now = new Date().toISOString();
                const rows = data.map(t => ({
                    username: this.username,
                    title: t.title,
                    completed: t.completed || false,
                    priority: t.priority || 'medium',
                    category: t.category || 'other',
                    due_date: t.dueDate || t.due_date || null,
                    notes: t.notes || '',
                    created_at: t.createdAt || t.created_at || now,
                    updated_at: now
                }));

                const { error } = await this.supabase.from('todos').insert(rows);
                if (error) throw error;

                await this.loadTasks();
                this.showToast(`${rows.length} tugas berhasil di-import!`, 'success');
            } catch (err) {
                this.showToast('Gagal import: ' + (err.message || 'File tidak valid'), 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // ===== UTILS =====
    parseNotes(notesStr) {
        let isDaily = false;
        let subtasks = [];
        let text = notesStr || '';
        let isJson = false;
        let completedAt = null;

        if (notesStr && notesStr.startsWith('{')) {
            try {
                const parsed = JSON.parse(notesStr);
                if (parsed.type === 'subtasks' || parsed.type === 'meta') {
                    isJson = true;
                    isDaily = !!parsed.isDaily;
                    subtasks = parsed.items || parsed.subtasks || [];
                    text = parsed.text || '';
                    completedAt = parsed.completedAt || null;
                }
            } catch(e) {}
        }
        
        return { isJson, isDaily, subtasks, text, completedAt };
    }

    buildNotes(isDaily, subtasks, text, completedAt = null) {
        if (isDaily || subtasks.length > 0 || completedAt) {
            return JSON.stringify({ type: 'meta', isDaily, subtasks, text, completedAt });
        }
        return text;
    }

    formatDate(dateStr) {
        const d = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

const app = new TaskflowApp();

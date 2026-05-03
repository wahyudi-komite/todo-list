// ===== TASKFLOW — Todo List with Supabase Database =====
// Konfigurasi Supabase - Ganti dengan kredensial Anda
const SUPABASE_URL = 'https://vquvvbjrnwwruhnxbpdn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdXZ2Ympybnd3cnVobnhicGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTkzNjEsImV4cCI6MjA5MzM5NTM2MX0.z-PblW64skuUgAIfXh-IppGBkV2BK5GbeOOA9P2nk8w';

class TaskflowApp {
    constructor() {
        this.supabase = null;
        this.tasks = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.editingId = null;
        this.username = '';
        this.init();
    }

    init() {
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
            this.tasks = (data || []).map(row => ({
                id: row.id,
                title: row.title,
                status: row.status || (row.completed ? 'completed' : 'active'),
                priority: row.priority,
                category: row.category,
                dueDate: row.due_date,
                notes: row.notes || '',
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
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

        const now = new Date().toISOString();
        const taskData = {
            username: this.username,
            title,
            completed: false,
            status: 'active',
            priority: document.getElementById('task-priority').value,
            category: document.getElementById('task-category').value,
            due_date: document.getElementById('task-date').value || null,
            notes: '',
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
        try {
            const { error } = await this.supabase
                .from('todos')
                .update({ status: newStatus, completed: newCompleted, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            task.status = newStatus;
            task.updatedAt = new Date().toISOString();
            this.updateStats();
            this.renderTasks();
        } catch (err) {
            this.showToast('Gagal mengupdate status', 'error');
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
        document.getElementById('edit-notes').value = task.notes || '';
        document.getElementById('edit-modal').classList.add('active');
    }

    async saveEdit() {
        const task = this.tasks.find(t => t.id === this.editingId);
        if (!task) return;

        const updates = {
            title: document.getElementById('edit-title').value.trim(),
            status: document.getElementById('edit-status').value,
            completed: document.getElementById('edit-status').value === 'completed',
            priority: document.getElementById('edit-priority').value,
            category: document.getElementById('edit-category').value,
            due_date: document.getElementById('edit-date').value || null,
            notes: document.getElementById('edit-notes').value.trim(),
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
            return `
                <li class="task-item ${task.status}" data-id="${task.id}">
                    <button class="task-checkbox" onclick="app.cycleStatus(${task.id})" aria-label="Ubah status" title="Klik: ${task.status === 'active' ? 'Mulai Proses' : task.status === 'progress' ? 'Tandai Selesai' : 'Reset ke Aktif'}">
                        ${statusIcons[task.status] || ''}
                    </button>
                    <div class="task-info">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <div class="task-meta">
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
                </li>
            `;
        }).join('');
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

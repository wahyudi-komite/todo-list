// ===== TASKFLOW — Todo List with Supabase Database =====

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

    // ===== INIT =====
    init() {
        // Check if Supabase config exists
        const config = this.getConfig();
        if (!config) {
            this.showSetupModal();
            return;
        }
        this.initSupabase(config);

        // Check if user is logged in
        const savedUser = localStorage.getItem('taskflow_user');
        if (savedUser) {
            this.username = savedUser;
            this.showApp();
        }

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

        // Form
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
            if (e.key === 'Escape') this.closeModal();
        });
    }

    // ===== SUPABASE CONFIG =====
    getConfig() {
        try {
            const data = localStorage.getItem('taskflow_config');
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }

    initSupabase(config) {
        this.supabase = window.supabase.createClient(config.url, config.key);
    }

    showSetupModal() {
        document.getElementById('setup-modal').classList.add('active');
    }

    saveConfig() {
        const url = document.getElementById('setup-url').value.trim();
        const key = document.getElementById('setup-key').value.trim();
        if (!url || !key) return;
        localStorage.setItem('taskflow_config', JSON.stringify({ url, key }));
        this.initSupabase({ url, key });
        document.getElementById('setup-modal').classList.remove('active');
        this.showToast('Konfigurasi berhasil disimpan!', 'success');
    }

    // ===== AUTH (Simple Username) =====
    async login() {
        const input = document.getElementById('login-username');
        const username = input.value.trim().toLowerCase();
        if (!username || username.length < 3) return;

        if (!this.supabase) {
            this.showToast('Supabase belum dikonfigurasi!', 'error');
            this.showSetupModal();
            return;
        }

        this.username = username;
        localStorage.setItem('taskflow_user', username);
        this.showApp();
    }

    logout() {
        localStorage.removeItem('taskflow_user');
        this.username = '';
        this.tasks = [];
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-screen').style.display = '';
    }

    async showApp() {
        document.getElementById('login-screen').classList.add('hidden');
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
                completed: row.completed,
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
                completed: row.completed,
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
            document.getElementById('task-date').value = '';
            input.focus();
            this.showToast('Tugas berhasil ditambahkan!', 'success');
        } catch (err) {
            console.error('Add error:', err);
            this.showToast('Gagal menambahkan tugas: ' + err.message, 'error');
        }
    }

    async toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const newVal = !task.completed;
        try {
            const { error } = await this.supabase
                .from('todos')
                .update({ completed: newVal, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            task.completed = newVal;
            task.updatedAt = new Date().toISOString();
            this.updateStats();
            this.renderTasks();
        } catch (err) {
            this.showToast('Gagal mengupdate tugas', 'error');
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
        const count = this.tasks.filter(t => t.completed).length;
        if (count === 0) return;
        if (!confirm(`Hapus ${count} tugas yang sudah selesai?`)) return;

        try {
            const { error } = await this.supabase
                .from('todos')
                .delete()
                .eq('username', this.username)
                .eq('completed', true);

            if (error) throw error;
            this.tasks = this.tasks.filter(t => !t.completed);
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
                (this.currentFilter === 'active' && !task.completed) ||
                (this.currentFilter === 'completed' && task.completed);
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
        const hasCompleted = this.tasks.some(t => t.completed);

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

        list.innerHTML = filtered.map(task => {
            const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
            const dateStr = task.dueDate ? this.formatDate(task.dueDate) : '';
            return `
                <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                    <button class="task-checkbox" onclick="app.toggleTask(${task.id})" aria-label="Toggle">
                        ${task.completed ? '✓' : ''}
                    </button>
                    <div class="task-info">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <div class="task-meta">
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
        const completed = this.tasks.filter(t => t.completed).length;
        const active = total - completed;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-active').textContent = active;
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('progress-text').textContent = pct + '%';

        const circle = document.getElementById('progress-circle');
        const circumference = 2 * Math.PI * 18;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    }

    // ===== EXPORT / IMPORT =====
    exportJSON() {
        const data = JSON.stringify(this.tasks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow_${this.username}_${new Date().toISOString().slice(0,10)}.json`;
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
        const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
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

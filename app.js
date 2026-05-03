// ===== TASKFLOW - Todo List App =====
// Database: localStorage (JSON-based, free, no backend needed)

class TaskflowApp {
    constructor() {
        this.DB_KEY = 'taskflow_todos';
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.editingId = null;
        this.init();
    }

    // ===== DATABASE (localStorage JSON) =====
    loadTasks() {
        try {
            const data = localStorage.getItem(this.DB_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    saveTasks() {
        localStorage.setItem(this.DB_KEY, JSON.stringify(this.tasks));
        this.updateStats();
        this.renderTasks();
    }

    // ===== INIT =====
    init() {
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
        // Modal
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

        this.updateStats();
        this.renderTasks();
    }

    // ===== CRUD =====
    addTask() {
        const input = document.getElementById('task-input');
        const title = input.value.trim();
        if (!title) return;

        const task = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            title,
            completed: false,
            priority: document.getElementById('task-priority').value,
            category: document.getElementById('task-category').value,
            dueDate: document.getElementById('task-date').value || null,
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        input.value = '';
        document.getElementById('task-date').value = '';
        input.focus();
        this.showToast('Tugas berhasil ditambahkan!', 'success');
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
        }
    }

    deleteTask(id) {
        const item = document.querySelector(`[data-id="${id}"]`);
        if (item) {
            item.classList.add('removing');
            setTimeout(() => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.saveTasks();
                this.showToast('Tugas dihapus', 'info');
            }, 300);
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

    saveEdit() {
        const task = this.tasks.find(t => t.id === this.editingId);
        if (!task) return;
        task.title = document.getElementById('edit-title').value.trim();
        task.priority = document.getElementById('edit-priority').value;
        task.category = document.getElementById('edit-category').value;
        task.dueDate = document.getElementById('edit-date').value || null;
        task.notes = document.getElementById('edit-notes').value.trim();
        task.updatedAt = new Date().toISOString();
        this.saveTasks();
        this.closeModal();
        this.showToast('Tugas berhasil diperbarui!', 'success');
    }

    closeModal() {
        document.getElementById('edit-modal').classList.remove('active');
        this.editingId = null;
    }

    clearCompleted() {
        const count = this.tasks.filter(t => t.completed).length;
        if (count === 0) return;
        if (!confirm(`Hapus ${count} tugas yang sudah selesai?`)) return;
        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveTasks();
        this.showToast(`${count} tugas dihapus`, 'info');
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
                    <button class="task-checkbox" onclick="app.toggleTask('${task.id}')" aria-label="Toggle task">
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
                        <button class="btn-task" onclick="app.openEdit('${task.id}')" title="Edit">✏️</button>
                        <button class="btn-task btn-delete" onclick="app.deleteTask('${task.id}')" title="Hapus">🗑️</button>
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
        a.download = `taskflow_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Data berhasil di-export!', 'success');
    }

    importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error('Format tidak valid');
                if (!confirm(`Import ${data.length} tugas? Data saat ini akan digabungkan.`)) return;
                // Merge: add tasks that don't exist
                const existingIds = new Set(this.tasks.map(t => t.id));
                const newTasks = data.filter(t => !existingIds.has(t.id));
                this.tasks = [...newTasks, ...this.tasks];
                this.saveTasks();
                this.showToast(`${newTasks.length} tugas baru di-import!`, 'success');
            } catch {
                this.showToast('File JSON tidak valid!', 'error');
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

// Initialize
const app = new TaskflowApp();

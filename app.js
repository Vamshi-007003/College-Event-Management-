// ========== API CLIENT ==========
const API_BASE = '/api';

const API = {
    token: localStorage.getItem('jwt_token'),

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('jwt_token', token);
        } else {
            localStorage.removeItem('jwt_token');
        }
    },

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    },

    async request(method, endpoint, body = null) {
        const options = {
            method,
            headers: this.getHeaders()
        };
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(`${API_BASE}${endpoint}`, options);

        if (res.status === 401) {
            // Token expired or invalid
            this.setToken(null);
            localStorage.removeItem('user_data');
            window.location.href = '/index.html';
            throw new Error('Session expired');
        }

        return res;
    },

    async get(endpoint) {
        const res = await this.request('GET', endpoint);
        return res.json();
    },

    async post(endpoint, data) {
        const res = await this.request('POST', endpoint, data);
        return { ok: res.ok, status: res.status, data: await res.json() };
    },

    async put(endpoint, data) {
        const res = await this.request('PUT', endpoint, data);
        return { ok: res.ok, status: res.status, data: await res.json() };
    },

    async delete(endpoint) {
        const res = await this.request('DELETE', endpoint);
        return { ok: res.ok, status: res.status, data: await res.json() };
    }
};

// ========== AUTH UTILITIES ==========
const Auth = {
    async login(username, password) {
        const result = await API.post('/auth/login', { username, password });
        if (result.ok) {
            API.setToken(result.data.token);
            localStorage.setItem('user_data', JSON.stringify(result.data.user));
            return result.data.user;
        }
        throw new Error(result.data.error || 'Login failed');
    },

    async register(userData) {
        const result = await API.post('/auth/register', userData);
        if (result.ok) {
            API.setToken(result.data.token);
            localStorage.setItem('user_data', JSON.stringify(result.data.user));
            return result.data.user;
        }
        throw new Error(result.data.error || 'Registration failed');
    },

    logout() {
        API.setToken(null);
        localStorage.removeItem('user_data');
        window.location.href = '/index.html';
    },

    getCurrentUser() {
        const data = localStorage.getItem('user_data');
        const token = localStorage.getItem('jwt_token');
        if (!data || !token) return null;
        try {
            // Check token expiry
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) {
                this.logout();
                return null;
            }
            return JSON.parse(data);
        } catch {
            return null;
        }
    },

    requireAuth(role) {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = '/index.html';
            return null;
        }
        if (role && user.role !== role) {
            window.location.href = '/index.html';
            return null;
        }
        return user;
    }
};

// ========== TOAST NOTIFICATIONS ==========
function initToastContainer() {
    if (!document.querySelector('.toast-container')) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

function showToast(message, type = 'info', duration = 4000) {
    initToastContainer();
    const container = document.querySelector('.toast-container');

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.classList.add('exit'); setTimeout(() => this.parentElement.remove(), 300)">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('exit');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Backward compatibility
function showMessage(msg, isError = false) {
    showToast(msg, isError ? 'error' : 'success');
}

// ========== UTILITY FUNCTIONS ==========
function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

function formatCurrency(amount) {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
}

function timeAgo(dateString) {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== MODAL HELPERS ==========
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

// ========== TAB SWITCHING ==========
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.sidebar .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ========== QR CODE DOWNLOAD HELPER ==========
function downloadQR(base64Data, filename = 'ticket-qr.png') {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

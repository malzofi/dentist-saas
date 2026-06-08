// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('saas_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('saas_theme', newTheme);
    updateThemeIcon(newTheme);
};

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if(icon) {
        icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
    }
}

// Ensure theme is initialized immediately
initTheme();

// Global State
const state = {
    token: localStorage.getItem('saas_admin_token') || null,
    stats: { licenses: 0, approved: 0, pending: 0, patients: 0 },
    chartInstance: null
};

// API Base URL
const API_BASE = '/api/cloud/admin';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

// Show Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
    toast.innerHTML = `<i class="ph ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        if(toast.parentElement) toast.parentElement.removeChild(toast);
    }, 3500);
}

// Authentication
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const btn = loginForm.querySelector('button');
    
    try {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري التحقق...';
        btn.disabled = true;

        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();

        if (res.ok) {
            state.token = data.token;
            localStorage.setItem('saas_admin_token', data.token);
            showToast('تم تسجيل الدخول بنجاح!', 'success');
            initApp();
        } else {
            errorDiv.textContent = data.message || 'كلمة المرور غير صحيحة';
            showToast('فشل تسجيل الدخول', 'error');
        }
    } catch (err) {
        errorDiv.textContent = 'خطأ في الاتصال بالخادم';
    } finally {
        btn.innerHTML = '<span>تسجيل الدخول</span><i class="ph ph-arrow-left"></i>';
        btn.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('saas_admin_token');
    state.token = null;
    appScreen.classList.remove('active');
    loginScreen.classList.add('active');
    document.getElementById('password').value = '';
    showToast('تم تسجيل الخروج', 'info');
});

// App Initialization
function initApp() {
    if (!state.token) {
        appScreen.classList.remove('active');
        loginScreen.classList.add('active');
        return;
    }

    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    
    // Setup Navigation
    setupNavigation();
    
    // Load initial data
    refreshAllData();
}

// Navigation Logic (SPA)
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-pane');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));

            // Add active to clicked
            item.classList.add('active');
            const targetId = item.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Refresh specific tab data if needed
            if (targetId === 'dashboard-tab') initChart();
            if (targetId === 'licenses-tab') fetchLicenses();
            if (targetId === 'devices-tab') fetchDevices();
            if (targetId === 'updates-tab') fetchUpdates();
        });
    });
}

// Global Data Fetcher
async function apiCall(endpoint, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${state.token}`;
    options.headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    
    if (res.status === 401 || res.status === 403) {
        logoutBtn.click();
        throw new Error('Unauthorized');
    }
    
    return res;
}

// Refresh Data functions
async function refreshAllData() {
    await Promise.all([
        fetchLicenses(),
        fetchDevices(),
        fetchClinicsData(),
        fetchUpdates()
    ]);
    updateDashboardStats();
    setTimeout(initChart, 500); // Wait for DOM
}

function updateDashboardStats() {
    document.getElementById('stat-active-licenses').textContent = state.stats.licenses;
    document.getElementById('stat-approved-devices').textContent = state.stats.approved;
    document.getElementById('stat-pending-devices').textContent = state.stats.pending;
    document.getElementById('stat-total-patients').textContent = state.stats.patients;

    const navBadge = document.getElementById('nav-pending-count');
    if (state.stats.pending > 0) {
        navBadge.style.display = 'inline-block';
        navBadge.textContent = state.stats.pending;
    } else {
        navBadge.style.display = 'none';
    }
}

// Licenses API
async function fetchLicenses() {
    try {
        const tbody = document.querySelector('#licenses-table tbody');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="ph ph-spinner ph-spin text-primary"></i> جاري التحميل...</td></tr>';
        
        const res = await apiCall('/licenses');
        const data = await res.json();
        state.stats.licenses = data.length || 0;
        
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">لا توجد تراخيص حالياً</td></tr>';
            return;
        }

        data.forEach(lic => {
            const tr = document.createElement('tr');
            
            // Check status
            const now = new Date();
            const exp = new Date(lic.expiry_date);
            let statusBadge = '<span class="badge active">نشطة</span>';
            if (exp < now) statusBadge = '<span class="badge expired">منتهية</span>';
            else if (lic.months_valid === 1) statusBadge = '<span class="badge trial">تجريبية</span>';

            tr.innerHTML = `
                <td><strong>${lic.clinic_name}</strong></td>
                <td>
                    <div class="code-box">
                        <span>${lic.license_key.substring(0, 15)}...</span>
                        <button class="copy-btn" onclick="copyToClipboard('${lic.license_key}')" title="نسخ المفتاح الكامل">
                            <i class="ph ph-copy"></i>
                        </button>
                    </div>
                </td>
                <td>${lic.allowed_devices}</td>
                <td>${new Date(lic.created_at).toLocaleDateString('ar-SA')}</td>
                <td>${exp.toLocaleDateString('ar-SA')}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-icon text-danger" title="إبطال الرخصة" onclick="deleteLicense('${lic.id}', '${lic.clinic_name}')">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        updateDashboardStats();
    } catch (err) {
        console.error(err);
    }
}

// Devices API
window.deleteLicense = async function(id, clinicName) {
    console.log("Delete button clicked for ID:", id);
    if(!confirm(`هل أنت متأكد من حذف رخصة عيادة "${clinicName}" نهائياً؟ سيؤدي هذا لفصل جميع أجهزتهم.`)) return;
    
    try {
        const res = await apiCall(`/licenses/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('تم إبطال وحذف الرخصة بنجاح!', 'success');
            fetchLicenses();
        } else {
            const err = await res.json();
            console.error("Delete failed:", err);
            showToast('فشل في حذف الرخصة: ' + (err.error || ''), 'error');
        }
    } catch (err) {
        console.error("Network error on delete:", err);
        showToast('خطأ في الاتصال بالخادم', 'error');
    }
};

// Devices API
async function fetchDevices() {
    try {
        const res = await apiCall('/devices');
        const data = await res.json();
        
        const pendingTbody = document.querySelector('#pending-table tbody');
        const approvedTbody = document.querySelector('#approved-table tbody');
        
        pendingTbody.innerHTML = '';
        approvedTbody.innerHTML = '';
        
        let pendingCount = 0;
        let approvedCount = 0;

        data.forEach(dev => {
            const tr = document.createElement('tr');
            
            if (dev.status === 'pending' || dev.status === 'pending_approval') {
                pendingCount++;
                tr.innerHTML = `
                    <td><strong>${dev.clinic_name || 'غير معروف'}</strong></td>
                    <td class="code-font">${dev.device_fingerprint}</td>
                    <td>${new Date(dev.created_at).toLocaleString('ar-SA')}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-small btn-success btn-glow" onclick="approveDevice('${dev.id}', '${dev.clinic_name}')">
                                <i class="ph ph-check"></i> موافقة
                            </button>
                            <button class="btn btn-small btn-outline text-danger">
                                <i class="ph ph-x"></i> رفض
                            </button>
                        </div>
                    </td>
                `;
                pendingTbody.appendChild(tr);
            } else {
                approvedCount++;
                tr.innerHTML = `
                    <td><strong>${dev.clinic_name || 'غير معروف'}</strong></td>
                    <td class="code-font">${dev.device_fingerprint}</td>
                    <td>${new Date(dev.updated_at || dev.created_at).toLocaleString('ar-SA')}</td>
                    <td>
                        <button class="btn btn-small btn-primary btn-outline" onclick="viewDeviceBlob('${dev.id}', '${dev.clinic_name}')">
                            <i class="ph ph-eye"></i> عرض الرخصة
                        </button>
                    </td>
                `;
                approvedTbody.appendChild(tr);
            }
        });

        if (pendingCount === 0) pendingTbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">لا توجد أجهزة معلقة</td></tr>';
        if (approvedCount === 0) approvedTbody.innerHTML = '<tr><td colspan="3" class="text-center text-secondary">لا توجد أجهزة معتمدة</td></tr>';

        state.stats.pending = pendingCount;
        state.stats.approved = approvedCount;
        updateDashboardStats();

    } catch (err) {
        console.error(err);
    }
}

async function approveDevice(deviceId, clinicName) {
    if(!confirm(`هل أنت متأكد من الموافقة على جهاز العيادة: ${clinicName}؟`)) return;
    
    try {
        const res = await apiCall('/approve', {
            method: 'POST',
            body: JSON.stringify({ device_id: deviceId })
        });
        
        if (res.ok) {
            const data = await res.json();
            showToast(`تمت الموافقة على جهاز ${clinicName} بنجاح!`, 'success');
            
            // Show the permanent license to the admin
            if (data.license_blob) {
                openBlobModal(data.license_blob);
            }
            
            fetchDevices();
        } else {
            showToast('حدث خطأ أثناء الموافقة', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    }
}

async function viewDeviceBlob(deviceId, clinicName) {
    try {
        const res = await apiCall(`/devices/${deviceId}/license-blob`);
        if (res.ok) {
            const data = await res.json();
            if (data.license_blob) {
                openBlobModal(data.license_blob);
            } else {
                showToast('لم يتم العثور على الرخصة!', 'error');
            }
        } else {
            showToast('فشل في جلب الرخصة المشفرة', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    }
}

// Clinics Data API
async function fetchClinicsData() {
    try {
        const tbody = document.querySelector('#clinics-data-table tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="ph ph-spinner ph-spin text-primary"></i> جاري جلب الإحصائيات من Supabase...</td></tr>';
        
        // Using existing /devices endpoint to mock clinic list for now, 
        // ideally we would hit a specific Supabase analytics endpoint.
        const res = await apiCall('/devices');
        const data = await res.json();
        
        const approvedDevices = data.filter(d => d.status === 'approved');
        
        tbody.innerHTML = '';
        if (approvedDevices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">لم تقم أي عيادة بمزامنة بياناتها بعد</td></tr>';
            return;
        }

        let totalPatients = 0;

        approvedDevices.forEach(dev => {
            // Mocking random stats for visualization since we don't have a direct count endpoint yet
            // In a real scenario, the backend would aggregate count(*) from patients where clinic_id = dev.id
            const mockPatients = Math.floor(Math.random() * 500) + 50;
            const mockSessions = mockPatients * 3;
            totalPatients += mockPatients;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${dev.clinic_name}</strong></td>
                <td><span class="badge active">${mockPatients} مريض</span></td>
                <td>${mockSessions}</td>
                <td>محدث</td>
                <td>منذ ساعتين</td>
            `;
            tbody.appendChild(tr);
        });

        state.stats.patients = totalPatients;
        updateDashboardStats();

    } catch (err) {
        console.error(err);
    }
}

// Create License
document.getElementById('create-license-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const clinicName = document.getElementById('clinic-name').value;
    const allowedDevices = parseInt(document.getElementById('allowed-devices').value);
    const licenseType = document.getElementById('license-type') ? document.getElementById('license-type').value : 'pro';
    const monthsValid = document.getElementById('is-lifetime').checked ? 'lifetime' : document.getElementById('expiry-months').value;
    const btn = e.target.querySelector('button[type="submit"]');

    try {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري التوليد...';
        btn.disabled = true;

        const res = await apiCall('/licenses', {
            method: 'POST',
            body: JSON.stringify({ clinic_name: clinicName, allowed_devices: allowedDevices, expiry_months: monthsValid, license_type: licenseType })
        });
        
        if (res.ok) {
            const data = await res.json();
            showToast('تم إصدار الرخصة بنجاح!', 'success');
            closeLicenseModal();
            fetchLicenses();
            // Optional: Auto copy to clipboard
            copyToClipboard(data.licenseKey);
        } else {
            showToast('فشل في إصدار الرخصة', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
        btn.innerHTML = '<i class="ph ph-magic-wand"></i> توليد الرخصة';
        btn.disabled = false;
    }
});

document.getElementById('is-lifetime')?.addEventListener('change', (e) => {
    const input = document.getElementById('expiry-months');
    if (e.target.checked) {
        input.disabled = true;
        input.style.opacity = '0.5';
    } else {
        input.disabled = false;
        input.style.opacity = '1';
    }
});

const licenseModal = document.getElementById('license-modal');
function openLicenseModal() { 
    licenseModal.classList.add('active'); 
    document.getElementById('clinic-name').focus();
}
function closeLicenseModal() { 
    licenseModal.classList.remove('active'); 
    document.getElementById('create-license-form').reset();
    const input = document.getElementById('expiry-months');
    if (input) {
        input.disabled = false;
        input.style.opacity = '1';
    }
}

// Close modal on click outside
licenseModal.addEventListener('click', (e) => {
    if(e.target === licenseModal) closeLicenseModal();
});

// Blob Modal Logic
const blobModal = document.getElementById('blob-modal');
function openBlobModal(blob) {
    document.getElementById('blob-textarea').value = blob;
    blobModal.classList.add('active');
}
function closeBlobModal() {
    blobModal.classList.remove('active');
    document.getElementById('blob-textarea').value = '';
}
blobModal.addEventListener('click', (e) => {
    if (e.target === blobModal) closeBlobModal();
});
function copyBlobText() {
    const text = document.getElementById('blob-textarea').value;
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ الرخصة المشفرة بنجاح!', 'success');
    }).catch(err => {
        showToast('فشل في النسخ', 'error');
    });
}

// --- Updates Center Logic ---

async function fetchUpdates() {
    try {
        const tbody = document.querySelector('#updates-table tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="ph ph-spinner ph-spin text-primary"></i> جاري التحميل...</td></tr>';
        
        const res = await apiCall('/updates');
        const data = await res.json();
        
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">لا توجد أي تحديثات مصدرة بعد</td></tr>';
            return;
        }

        data.forEach(upd => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge active">v${upd.version}</span></td>
                <td>${new Date(upd.created_at).toLocaleString('ar-SA')}</td>
                <td>${upd.release_notes || '-'}</td>
                <td>${upd.is_mandatory ? '<span class="badge expired">نعم</span>' : '<span class="badge pending">لا</span>'}</td>
                <td>
                    <a href="${upd.download_url}" target="_blank" class="btn btn-icon btn-outline" title="تحميل الملف">
                        <i class="ph ph-download-simple"></i>
                    </a>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

document.getElementById('publish-update-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const version = document.getElementById('update-version').value;
    const is_mandatory = document.getElementById('update-mandatory').value === 'true';
    const download_url = document.getElementById('update-url').value;
    const release_notes = document.getElementById('update-notes').value;
    const btn = e.target.querySelector('button[type="submit"]');

    try {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري النشر...';
        btn.disabled = true;

        const res = await apiCall('/updates', {
            method: 'POST',
            body: JSON.stringify({ version, is_mandatory, download_url, release_notes })
        });
        
        if (res.ok) {
            showToast('تم نشر التحديث بنجاح! جميع العيادات ستبدأ بتحميله.', 'success');
            closeUpdateModal();
            fetchUpdates();
        } else {
            showToast('فشل في نشر التحديث', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
        btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> إرسال التحديث لجميع العيادات';
        btn.disabled = false;
    }
});

const updateModal = document.getElementById('update-modal');
function openUpdateModal() { 
    updateModal.classList.add('active'); 
    document.getElementById('update-version').focus();
}
function closeUpdateModal() { 
    updateModal.classList.remove('active'); 
    document.getElementById('publish-update-form').reset();
}

updateModal.addEventListener('click', (e) => {
    if(e.target === updateModal) closeUpdateModal();
});

// Utils
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ مفتاح الرخصة للحافظة!', 'success');
    }).catch(err => {
        console.error('Copy failed', err);
    });
}

// Chart.js Initialization
function initChart() {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;
    
    // Destroy previous instance if exists
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    // Gradient for line chart
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'التراخيص النشطة',
                data: [0, 0, 0, 0, 2, state.stats.licenses],
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#0f172a',
                    bodyColor: '#64748b',
                    borderColor: 'rgba(15, 23, 42, 0.08)',
                    borderWidth: 1,
                    titleFont: { family: 'Tajawal' },
                    bodyFont: { family: 'Tajawal' },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.03)' },
                    ticks: { color: '#64748b', font: { family: 'Tajawal' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.03)' },
                    ticks: { color: '#64748b', stepSize: 1 }
                }
            }
        }
    });
}

// Check auth on load
document.addEventListener('DOMContentLoaded', initApp);

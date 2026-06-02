// --- State ---
let authToken = localStorage.getItem('saas_admin_token') || null;

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const licenseModal = document.getElementById('license-modal');
const createLicenseForm = document.getElementById('create-license-form');

const pendingTableBody = document.querySelector('#pending-table tbody');
const licensesTableBody = document.querySelector('#licenses-table tbody');

const totalLicensesEl = document.getElementById('total-licenses');
const totalDevicesEl = document.getElementById('total-devices');
const pendingDevicesEl = document.getElementById('pending-devices');

// --- Initialization ---
function init() {
    if (authToken) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginScreen.classList.add('active');
    dashboardScreen.classList.remove('active');
}

function showDashboard() {
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    fetchDashboardData();
}

// --- Auth ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    try {
        const res = await fetch('/api/cloud/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('saas_admin_token', authToken);
            loginError.textContent = '';
            showDashboard();
        } else {
            loginError.textContent = data.error || 'خطأ في تسجيل الدخول';
        }
    } catch (err) {
        loginError.textContent = 'خطأ في الاتصال بالخادم';
    }
});

logoutBtn.addEventListener('click', () => {
    authToken = null;
    localStorage.removeItem('saas_admin_token');
    showLogin();
});

// --- API Calls ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(endpoint, options);
    
    if (res.status === 401 || res.status === 403) {
        logoutBtn.click();
        throw new Error('Unauthorized');
    }
    
    return res.json();
}

async function fetchDashboardData() {
    fetchLicenses();
    fetchDevices();
}

// --- Licenses ---
async function fetchLicenses() {
    try {
        const licenses = await apiCall('/api/cloud/admin/licenses');
        totalLicensesEl.textContent = licenses.length;
        
        licensesTableBody.innerHTML = '';
        licenses.forEach(l => {
            const isExpired = new Date() > new Date(l.expiry_date);
            const statusClass = isExpired ? 'expired' : 'active';
            const statusText = isExpired ? 'منتهية' : 'نشطة';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${l.clinic_name}</td>
                <td class="code-font">${l.license_key}</td>
                <td>${l.allowed_devices} أجهزة</td>
                <td>${new Date(l.expiry_date).toLocaleDateString('ar-EG')}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            `;
            licensesTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

function openLicenseModal() {
    licenseModal.classList.add('active');
}

function closeLicenseModal() {
    licenseModal.classList.remove('active');
    createLicenseForm.reset();
}

createLicenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clinic_name = document.getElementById('clinic-name').value;
    const allowed_devices = document.getElementById('allowed-devices').value;
    const expiry_months = document.getElementById('expiry-months').value;
    
    try {
        const res = await apiCall('/api/cloud/admin/licenses', 'POST', {
            clinic_name, allowed_devices, expiry_months
        });
        
        if (res.success) {
            closeLicenseModal();
            fetchLicenses();
            alert(`تم إنشاء الرخصة بنجاح!\nمفتاح الرخصة: ${res.license.license_key}`);
        } else {
            alert('حدث خطأ أثناء إنشاء الرخصة: ' + res.error);
        }
    } catch (err) {
        alert('خطأ في الاتصال');
    }
});

// --- Devices ---
async function fetchDevices() {
    try {
        const devices = await apiCall('/api/cloud/admin/devices');
        totalDevicesEl.textContent = devices.length;
        
        const pending = devices.filter(d => d.status === 'pending');
        pendingDevicesEl.textContent = pending.length;
        
        pendingTableBody.innerHTML = '';
        
        if (pending.length === 0) {
            pendingTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-secondary)">لا توجد طلبات جديدة بانتظار الموافقة</td></tr>`;
        }
        
        pending.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${d.clinic_name || 'غير معروف'}</td>
                <td class="code-font" style="font-size: 12px">${d.device_fingerprint.substring(0, 16)}...</td>
                <td>${new Date(d.created_at).toLocaleDateString('ar-EG')}</td>
                <td>
                    <button class="btn btn-small btn-success" onclick="approveDevice(${d.id})">✅ موافقة وإصدار</button>
                </td>
            `;
            pendingTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function approveDevice(deviceId) {
    if (!confirm('هل أنت متأكد من الموافقة على هذا الجهاز وإصدار الرخصة النهائية له؟')) return;
    
    try {
        const res = await apiCall('/api/cloud/admin/approve', 'POST', { device_id: deviceId });
        if (res.success) {
            alert('تمت الموافقة بنجاح! سيتم إرسال الرخصة لجهاز العيادة فوراً.');
            fetchDevices();
        } else {
            alert('حدث خطأ أثناء الموافقة');
        }
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

// Start
init();

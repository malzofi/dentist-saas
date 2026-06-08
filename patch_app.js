const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'public/app.js');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Replace fetchClinicsData completely
const oldFetchStart = 'async function fetchClinicsData() {';
const oldFetchEnd = '} catch (err) {\n        console.error(err);\n    }\n}';

// To safely replace, we can use regex or substring if exact matches are hard.
// Let's just append the new fetchClinicsData to the end. The last definition of the function wins in JS, but it's better to just rewrite it.
const new_logic = `
// --- NEW CRM & SUPPORT LOGIC ---

async function fetchClinicsData() {
    try {
        const tbody = document.querySelector('#clinics-data-table tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="ph ph-spinner ph-spin text-primary"></i> جاري التحميل...</td></tr>';
        
        const res = await apiCall('/clinics');
        const data = await res.json();
        
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">لا توجد عيادات مسجلة</td></tr>';
            return;
        }

        data.forEach(clinic => {
            const tr = document.createElement('tr');
            const statusBadge = clinic.status === 'active' 
                ? '<span class="badge active">نشط</span>' 
                : '<span class="badge expired">موقوف</span>';

            // Safely encode clinic data to string for the onclick handler
            const featuresJson = JSON.stringify(clinic.features || {}).replace(/"/g, '&quot;');

            tr.innerHTML = \`
                <td>#\${clinic.id}</td>
                <td><strong>\${clinic.name}</strong></td>
                <td>\${statusBadge}</td>
                <td>\${new Date(clinic.created_at).toLocaleDateString('ar-SA')}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-small btn-primary btn-outline" onclick="openFeaturesModal('\${clinic.id}', '\${featuresJson}')" title="تعديل الباقات">
                            <i class="ph ph-toggle-left"></i> الخصائص
                        </button>
                        <button class="btn btn-small btn-outline text-warning" onclick="openSupportModal('\${clinic.id}')" title="دعم فني عن بعد">
                            <i class="ph ph-headset"></i>
                        </button>
                    </div>
                </td>
            \`;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
    }
}

// Modals Logic
const featuresModal = document.getElementById('features-modal');
function openFeaturesModal(id, featuresStr) {
    document.getElementById('feature-clinic-id').value = id;
    try {
        const features = JSON.parse(featuresStr.replace(/&quot;/g, '\\"'));
        document.getElementById('feat-xray').checked = !!features.xray;
        document.getElementById('feat-accounting').checked = !!features.accounting;
        document.getElementById('feat-reports').checked = !!features.advanced_reports;
    } catch(e) {}
    featuresModal.classList.add('active');
}
function closeFeaturesModal() { featuresModal.classList.remove('active'); }
featuresModal.addEventListener('click', (e) => { if(e.target === featuresModal) closeFeaturesModal(); });

document.getElementById('features-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('feature-clinic-id').value;
    const features = {
        xray: document.getElementById('feat-xray').checked,
        accounting: document.getElementById('feat-accounting').checked,
        advanced_reports: document.getElementById('feat-reports').checked
    };
    
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الحفظ...';
    try {
        const res = await apiCall('/clinics/' + id + '/features', {
            method: 'PUT',
            body: JSON.stringify({ features })
        });
        if (res.ok) {
            showToast('تم تحديث الخصائص بنجاح وسيتزامن مع العيادة فوراً', 'success');
            closeFeaturesModal();
            fetchClinicsData();
        } else {
            showToast('حدث خطأ', 'error');
        }
    } catch(err) {
        showToast('خطأ في الاتصال', 'error');
    } finally {
        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> حفظ التغييرات';
    }
});

let currentSupportClinicId = null;
const supportModal = document.getElementById('support-modal');
function openSupportModal(id) {
    currentSupportClinicId = id;
    document.getElementById('support-console').style.display = 'none';
    supportModal.classList.add('active');
}
function closeSupportModal() { supportModal.classList.remove('active'); }
supportModal.addEventListener('click', (e) => { if(e.target === supportModal) closeSupportModal(); });

async function initiateRemoteSupport() {
    if (!currentSupportClinicId) return;
    try {
        const res = await apiCall('/clinics/' + currentSupportClinicId + '/support', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            showToast('تم إرسال الطلب. في انتظار موافقة العيادة...', 'info');
            document.getElementById('support-console').style.display = 'block';
            document.getElementById('remote-logs').value += "\\n[SYSTEM] Support token created: " + data.support_token + "\\n[SYSTEM] Waiting for clinic socket connection...\\n";
        } else {
            showToast('فشل في إنشاء الجلسة', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال', 'error');
    }
}

function sendRemoteCommand(cmd) {
    document.getElementById('remote-logs').value += "\\n[ADMIN] Sent command: " + cmd;
    // Real implementation will use Supabase Realtime here
    setTimeout(() => {
        document.getElementById('remote-logs').value += "\\n[CLINIC] Command '" + cmd + "' received and queued.";
    }, 1000);
}
`;

content += new_logic;

fs.writeFileSync(filepath, content, 'utf8');
console.log("app.js patched successfully!");

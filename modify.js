const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'controllers/cloudController.js');
let content = fs.readFileSync(filepath, 'utf8');

const old_create_license = `        const { data, error } = await supabase
            .from('licenses')
            .insert([{
                clinic_name,
                license_key,
                allowed_devices: parseInt(allowed_devices),
                expiry_date: expiry_date.toISOString()
            }])
            .select();`;

const new_create_license = `        // 1. Create or Find Clinic
        let clinic_id = null;
        const { data: clinicData, error: clinicError } = await supabase
            .from('clinics')
            .insert([{ name: clinic_name }])
            .select();
            
        if (!clinicError && clinicData && clinicData.length > 0) {
            clinic_id = clinicData[0].id;
        }

        // 2. Create License
        const { data, error } = await supabase
            .from('licenses')
            .insert([{
                clinic_id,
                clinic_name,
                license_key,
                license_type: type,
                allowed_devices: parseInt(allowed_devices),
                expiry_date: expiry_date.toISOString()
            }])
            .select();`;

content = content.replace(old_create_license, new_create_license);

const old_blob = `    const payload = {
        clinic_name: license.clinic_name,
        device_fingerprint: device_fingerprint,
        expiry_date: license.expiry_date,
        allowed_devices: license.allowed_devices
    };`;

const new_blob = `    const payload = {
        clinic_id: license.clinic_id,
        clinic_name: license.clinic_name,
        device_fingerprint: device_fingerprint,
        expiry_date: license.expiry_date,
        allowed_devices: license.allowed_devices,
        license_type: license.license_type || 'pro'
    };`;

content = content.replace(old_blob, new_blob);

const new_endpoints = `
// --- NEW CRM Endpoints ---

exports.getClinics = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('clinics')
            .select('*, licenses(*, devices(*))')
            .order('created_at', { ascending: false });
            
        if (error) return res.status(500).json({ error: 'DB_ERROR' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};

exports.createClinic = async (req, res) => {
    const { name } = req.body;
    try {
        const { data, error } = await supabase.from('clinics').insert([{ name }]).select();
        if (error) return res.status(500).json({ error: 'DB_ERROR' });
        res.json({ success: true, clinic: data[0] });
    } catch (err) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};

exports.updateClinicFeatures = async (req, res) => {
    const { id } = req.params;
    const { features } = req.body;
    try {
        const { data, error } = await supabase
            .from('clinics')
            .update({ features })
            .eq('id', id)
            .select();
        if (error) return res.status(500).json({ error: 'DB_ERROR' });
        res.json({ success: true, clinic: data[0] });
    } catch (err) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};

exports.requestRemoteSupport = async (req, res) => {
    const { id } = req.params;
    try {
        const support_token = 'SUP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data, error } = await supabase
            .from('clinics')
            .update({ support_token, support_session_active: true })
            .eq('id', id)
            .select();
            
        if (error) return res.status(500).json({ error: 'DB_ERROR' });
        
        res.json({ success: true, support_token });
    } catch (err) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};
`;

content += new_endpoints;

fs.writeFileSync(filepath, content, 'utf8');
console.log("cloudController.js patched successfully!");

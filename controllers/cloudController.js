const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://xtckevhaggxezvqcikph.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0Y2tldmhhZ2d4ZXp2cWNpa3BoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMyMjg5MywiZXhwIjoyMDk1ODk4ODkzfQ.hm4l-Ttnkg_ZC8GBLJDFydMz4oGVTy9lJb-SSCgmDzQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// تحميل المفتاح الخاص لتوقيع التراخيص
let PRIVATE_KEY = process.env.PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDGg0crq3EHC08l
Z2B/P38FsqZR2OEAhPytlJCjUsPJB8QnQUyR0cd7JpFolrlkd9/dozyEwvDWfg4S
CFYCcaGj7e83I6Rp+kyq4i+nef6GR+dKQ3jqN9zQPfsy1IvI+hp10TyAAJalhXPm
4MPZQyLrb9mps0QcvzYfYCG2D3DWVARjx30n0n/PXSLWVUZRKrvjSlxBhmTRpvsR
4wtSAcMqF1vGpGE0JfuwUxaDnRHa1msTsoFQZf2bUWHcXXeoK0seC2nCb5DwstDi
1prNnYcDUkeyH/b1XVy4wfyrqIszi0OlF5iszwGvcPwEgyyS6WPSi1HZHec4Zxng
Xy1oLttlAgMBAAECggEADrwjWK6Pg6Lsrh1+iEDNvFNJV6rGHBxYR3J54E740+T0
7nyrwujOn7RE7P2/x0vuQhzHVaEaWzLSTLcxhS8V57MLWNfXMND2BxAmJ+OyXMQd
EFeHnou6IvtFeFLWXmW8IucpUGSwH0X+N1K95Cmrf6IsMVW/tko2Kag10GD/MpVl
EIzsGjxaovcxs74mrF6x9dcj1XLnBGnfrUn2GcgSVLFXTHbEvgcGD0zIHaBOw7jh
rPKIqjv1l/JibmUKvWXXRXOuiWCQrELvyLBQlORTqd3BL2Hl1DFTjnMHzbC7EvHQ
3O6zgQPENF8FlucqWXESfPui9X/YzsU0/LWFy+5PsQKBgQD91S1ywevCMIcLL3K3
MCFOTiWfLd8uI5bbRnoIGLspkVHuhXBOsC5MUTmM6jklSSbY3N+oxXBH4FjupNHN
5c38diDPZc3kHokz2fb0fqMy9hd97RdXXDOdG7uEZweh2OP/p6bARLAHGazRZPns
Bokw4Qc/OqvIBYN1HLoRu/9TMQKBgQDINS7tT1Tue9YURQgaVb5amJ2qqpnIZDWL
djGgPGk8EneD+QdY+DPmu9jTdY56NVsarRRAz1/4KDsBac3ZkE4Jek5R11ON+58B
PV70F0dgqI6zagyLyfTBQI7f1O38ILJjbwZRTmmZRO9jFvStf7pYayF2/XZPtE/A
yGgyzKm2dQKBgFjdaSvj+EXj92NTGTZJA2AGu+UeiiP9EbNy2QY8oknLNoPq84aY
55yQUzWiSp9jHNaPfT344XZIdNoXmdwbuCHKuXHiklJq3l3o0SyHqVsODOtpNeK/
xNIcA2o3J9ThufCnIRnu8jGKK5ajY1vebelO3tqkD7/XLk6x3/KVfq4BAoGAS9yj
IHbcBtXTw7B4ponw7CFCNQYZ6W3XQDYUDdR2R7XzpYU6PIMoH3j0awPzbelD0TLe
JsStZ7nOyfVOc+8TMtIuVSKTXYyHro+TqEgd2slj8SXxBRMMdCHDQZtMZin5jmXm
be6ZYuNVFiX/prJsaM6HSrA2IXOAeNs3aHBWqnUCgYAEfhpVxFJR6uoWrmV07bBu
bTYFwUaPQ34ienfUftulfE9e2FqNCvXa3zGCEU14RexFLRh3mm0lVqomKn49gT55
sy6CO95YZdI929PWsY8bC4NkUHq4S16LK5oEE5ihG5huBFMhkq/z4+YkPw2d0NzG
LT3DxRfNkLPFxa5PQWAuew==
-----END PRIVATE KEY-----`;


exports.activateRequest = async (req, res) => {
    const { license_key, device_fingerprint } = req.body;

    if (!license_key || !device_fingerprint) {
        return res.status(400).json({ error: 'MISSING_DATA' });
    }

    try {
        // 1. Verify license exists
        const { data: licenseRows, error: licenseError } = await supabase
            .from('licenses')
            .select('*')
            .eq('license_key', license_key);

        const license = licenseRows && licenseRows.length > 0 ? licenseRows[0] : null;
        if (licenseError || !license) {
            return res.status(404).json({ error: 'INVALID_LICENSE' });
        }

        if (new Date() > new Date(license.expiry_date)) {
            return res.status(403).json({ error: 'LICENSE_EXPIRED' });
        }

        // 2. Check device count / pending status
        const { data: devices, error: devicesError } = await supabase
            .from('devices')
            .select('*')
            .eq('license_id', license.id);

        if (devicesError) {
             return res.status(500).json({ error: 'DB_ERROR' });
        }

        const existingDevice = devices.find(d => d.device_fingerprint === device_fingerprint);
        
        if (existingDevice) {
            if (existingDevice.status === 'active') {
                // إذا كان مفعلاً مسبقاً، نرسل له الـ Blob مباشرة
                const blob = generateLicenseBlob(license, device_fingerprint);
                return res.json({ status: 'active', blob });
            } else {
                return res.json({ status: 'pending', message: 'جهازك قيد المراجعة والموافقة من الإدارة.' });
            }
        }

        if (devices.length >= license.allowed_devices) {
            return res.status(403).json({ error: 'DEVICE_LIMIT_REACHED', message: 'وصلت العيادة للحد الأقصى للأجهزة.' });
        }

        // 3. Register new device as active directly (Auto-Approve)
        const { error: insertError } = await supabase
            .from('devices')
            .insert([{ license_id: license.id, device_fingerprint, status: 'active' }]);

        if (insertError) return res.status(500).json({ error: 'DB_ERROR' });
        
        const blob = generateLicenseBlob(license, device_fingerprint);
        return res.json({ status: 'active', blob, message: 'تم التفعيل بنجاح (موافقة تلقائية).' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};

exports.syncDevice = async (req, res) => {
    const { device_fingerprint } = req.body;
    
    try {
        const { data: rows, error } = await supabase
            .from('devices')
            .select('status')
            .eq('device_fingerprint', device_fingerprint);

        const row = rows && rows.length > 0 ? rows[0] : null;
        if (error || !row) return res.status(404).json({ status: 'unknown' });
        
        await supabase
            .from('devices')
            .update({ last_sync: new Date().toISOString() })
            .eq('device_fingerprint', device_fingerprint);
            
        res.json({ status: row.status });
    } catch (err) {
        res.status(500).json({ status: 'unknown' });
    }
};

exports.getDevices = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('devices')
            .select(`
                *,
                licenses ( clinic_name )
            `);
            
        if (error) return res.status(500).json({ error: 'DB_ERROR' });
        
        // Flatten the response
        const rows = data.map(d => ({
            ...d,
            clinic_name: d.licenses?.clinic_name
        }));
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};

exports.approveDevice = async (req, res) => {
    const { device_id } = req.body;
    
    try {
        const { error } = await supabase
            .from('devices')
            .update({ status: 'active' })
            .eq('id', device_id);

        if (error) return res.status(400).json({ error: 'FAILED' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};

// Helper function to create RSA-signed JWT
function generateLicenseBlob(license, device_fingerprint) {
    const payload = {
        clinic_name: license.clinic_name,
        device_fingerprint: device_fingerprint,
        expiry_date: license.expiry_date,
        allowed_devices: license.allowed_devices
    };

    // Sign with RS256 using Private Key
    return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
}

-- Supabase / PostgreSQL Schema for SaaS Master Server

-- 1. Create Clinics Table (Accounts)
CREATE TABLE IF NOT EXISTS clinics (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    features JSONB DEFAULT '{"xray": true, "accounting": true, "advanced_reports": false}'::jsonb,
    support_token TEXT,
    support_session_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL,
    clinic_name TEXT, -- Keeping this for backward compatibility or simple licenses
    license_key TEXT UNIQUE NOT NULL,
    license_type TEXT DEFAULT 'pro',
    allowed_devices INTEGER DEFAULT 1,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    device_fingerprint TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create App Updates Table
CREATE TABLE IF NOT EXISTS app_updates (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL,
    release_notes TEXT,
    download_url TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT false,
    target_clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE, -- NULL means global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Remote Support Logs Table (Optional but good for audit)
CREATE TABLE IF NOT EXISTS support_logs (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

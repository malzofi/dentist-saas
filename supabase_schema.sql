-- Supabase / PostgreSQL Schema for SaaS Master Server

-- 1. Create Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    clinic_name TEXT NOT NULL,
    license_key TEXT UNIQUE NOT NULL,
    allowed_devices INTEGER DEFAULT 1,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    device_fingerprint TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Insert a Dummy License for Testing
INSERT INTO licenses (clinic_name, license_key, allowed_devices, expiry_date) 
VALUES ('عيادة التجربة', 'TEST-KEY-123', 1, CURRENT_TIMESTAMP + INTERVAL '1 year')
ON CONFLICT (license_key) DO NOTHING;

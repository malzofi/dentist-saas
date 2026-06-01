const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xtckevhaggxezvqcikph:Mznxbcvv_12@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL (IPv4 Pooler)!');

    const sqlPath = path.join(__dirname, 'supabase_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('Schema executed successfully!');
    
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await client.end();
  }
}

setup();

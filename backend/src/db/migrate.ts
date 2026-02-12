import { pool } from './pool';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schema);
    console.log('✅ Database schema applied successfully');

    // Seed super admin if no admin exists
    const adminCheck = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.rows.length === 0) {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      const hash = await bcrypt.hash(defaultPassword, 10);
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
        ['Super Admin', 'admin@admin.com', hash]
      );
      console.log('👤 Super Admin created: admin@admin.com / ' + defaultPassword);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

const bcrypt = require('bcrypt');
const db = require('./src/config/db');

async function seed() {
  try {
    const passwordHash = await bcrypt.hash('Staff123!', 10);
    
    // Insert Staff User
    const staffQuery = `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email, role;
    `;
    const res = await db.query(staffQuery, ['staff@barangaylink.gov', passwordHash, 'Barangay Staff']);
    console.log('✅ Staff User Ready:', res.rows[0]);

    // Also insert an Administrator user for testing Admin privileges
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const adminQuery = `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email, role;
    `;
    const adminRes = await db.query(adminQuery, ['admin@barangaylink.gov', adminHash, 'Administrator']);
    console.log('✅ Administrator User Ready:', adminRes.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding users:', err.message);
    process.exit(1);
  }
}

seed();
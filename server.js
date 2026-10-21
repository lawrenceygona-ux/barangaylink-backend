require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` BarangayLink API Server Running`);
  console.log(` Local URL : http://localhost:${PORT}`);
  console.log(` Health URL: http://localhost:${PORT}/api/health`);
  console.log(` DB Schema : ${process.env.DB_SCHEMA || 'barangay'}`);
  console.log(`===============================================`);
});
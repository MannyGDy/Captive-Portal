const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying required files...\n');

const requiredFiles = [
  'frontend/index.html',
  'frontend/css/style.css',
  'frontend/js/app.js',
  'frontend/admin.html',
  'backend/server.js',
  'package.json'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('\n📋 Summary:');
if (allFilesExist) {
  console.log('✅ All required files exist');
  console.log('\n🚀 To start the server:');
  console.log('   npm install');
  console.log('   npm run dev');
  console.log('\n🌐 Then visit: http://localhost:3000');
} else {
  console.log('❌ Some files are missing. Please check the file structure.');
}

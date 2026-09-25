/**
 * ตัวอย่าง client code ใช้ Parse SDK (Node) กับระบบ security
 * รัน: node examples/demo-security.js
 */
require('dotenv').config();
const Parse = require('parse/node');

Parse.initialize(
  process.env.APP_ID,
  process.env.JAVASCRIPT_KEY,
  process.env.MASTER_KEY
);
Parse.serverURL = process.env.PUBLIC_SERVER_URL || 'http://localhost:1337/parse';
Parse.Cloud.useMasterKey();

async function main() {
  // 1) สร้าง role SecurityAnalyst (มี masterKey)
  const Role = new Parse.Role('SecurityAnalyst');
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  Role.setACL(acl);
  try {
    await Role.save();
    console.log('✔ สร้าง role SecurityAnalyst แล้ว');
  } catch (e) {
    console.log('» role มีอยู่แล้ว:', e.message.includes('already exists'));
  }

  // 2) สแกนพอร์ตของ localhost
  console.log('\n--- สแกนพอร์ต localhost ---');
  const scan = await Parse.Cloud.run('runPortScan', {
    host: '127.0.0.1',
    ports: [22, 25, 80, 443, 1337, 27017, 4040, 8080, 8443, 5432],
    timeoutMs: 1000,
  });
  console.log('scanId:', scan.id, '| severity:', scan.get('severity'));
  for (const r of scan.get('results')) {
    if (r.status === 'open') console.log(`  » พอร์ต ${r.port} เปิดอยู่`);
  }

  // 3) สร้าง alert
  const alert = await Parse.Cloud.run('createSecurityAlert', {
    severity: 'high',
    title: 'พบการพยายาม brute-force SSH บน server-X',
    details: { sourceIp: '203.0.113.10', attempts: 142, service: 'ssh' },
  });
  console.log('\n✔ สร้าง alert แล้ว:', alert.id);

  // 4) รายงานสรุป
  const report = await Parse.Cloud.run('getSecurityReport', {});
  console.log('\n--- รายงานสถานะความปลอดภัย ---');
  console.log('riskLevel:', report.summary.riskLevel);
  console.log('open critical:', report.summary.openCritical, '| bySeverity:', report.summary.bySeverity);

  // 5) ตัวอย่าง: quarantine ผู้ใช้ (ล็อกบัญชี)
  const user = new Parse.User();
  user.set('username', 'victim_' + Date.now());
  user.set('password', 'TestPass123!');
  const savedUser = await user.signUp();
  console.log('\n✔ สร้างผู้ใช้สาธิต:', savedUser.get('username'));

  const q = await Parse.Cloud.run('quarantineUser', {
    userId: savedUser.id,
    reason: 'ถูกตรวจพบจาก automated scan',
  });
  console.log('» กักกันผู้ใช้แล้ว, revoke sessions:', q.revokedSessions);

  // พิสูจน์ว่า login ไม่ผ่าน
  try {
    await Parse.User.logIn(savedUser.get('username'), 'TestPass123!');
    console.log('✘ ผิดพลาด: ไม่ควร login เข้าได้');
  } catch (e) {
    console.log('✔ ถูกต้อง: ผู้ใช้ที่ถูกกักกัน login ไม่ได้ ->', e.message);
  }

  console.log('\n--- DEMO เสร็จสิ้น ---');
}

main().catch((err) => {
  console.error('เกิดข้อผิดพลาด:', err.message);
  process.exit(1);
});
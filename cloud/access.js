const SECURITY_ROLE = 'SecurityAnalyst';

// ฟิลด์บน _User ที่ผู้ใช้ห้ามเขียนเอง ต้องใช้ masterKey เท่านั้น
const USER_PROTECTED_FIELDS = ['accountLocked', 'lockedAt', 'lockedReason'];

// เป้าหมายที่สแกนได้ตามค่าเริ่มต้น: loopback เท่านั้น
// ถ้าต้องการสแกนเครื่องอื่นให้เพิ่มลงใน SCAN_ALLOWED_HOSTS (คั่นด้วย ,)
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

function allowedScanHosts() {
  const extra = (process.env.SCAN_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...LOOPBACK_HOSTS, ...extra]);
}

// ตรวจว่า host ที่ขอสแกนอยู่ใน allowlist หรือไม่
// ป้องกันการใช้ cloud function นี้เป็น port scanner ยิงเครื่องอื่น
function isAllowedScanHost(host) {
  const value = String(host || '').trim().toLowerCase();
  if (!value) return false;
  if (allowedScanHosts().has(value)) return true;
  // อนุญาต private range เฉพาะเมื่อเปิดด้วย SCAN_ALLOW_PRIVATE=true
  if (process.env.SCAN_ALLOW_PRIVATE === 'true') {
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|fc|fd|::1$)/.test(value);
  }
  return false;
}

// ตรวจสอบว่า request มาจาก masterKey หรือ user ที่มี role SecurityAnalyst
async function assertSecurityAccess(req) {
  if (req.master) return;
  if (req.user) {
    const role = await new Parse.Query(Parse.Role)
      .equalTo('name', SECURITY_ROLE)
      .first({ useMasterKey: true });
    if (role) {
      const users = role.relation('users').query();
      users.equalTo('objectId', req.user.id);
      const member = await users.first({ useMasterKey: true });
      if (member) return;
    }
  }
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'ต้องใช้ masterKey หรือ role SecurityAnalyst เท่านั้น');
}

module.exports = {
  SECURITY_ROLE,
  assertSecurityAccess,
  isAllowedScanHost,
  USER_PROTECTED_FIELDS,
};
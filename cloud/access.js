const SECURITY_ROLE = 'SecurityAnalyst';

// ตรวจสอบว่า user คนนี้อยู่ใน role SecurityAnalyst หรือไม่
async function hasSecurityRole(user) {
  if (!user) return false;
  const role = await new Parse.Query(Parse.Role)
    .equalTo('name', SECURITY_ROLE)
    .first({ useMasterKey: true });
  if (!role) return false;
  const users = role.relation('users').query();
  users.equalTo('objectId', user.id);
  const member = await users.first({ useMasterKey: true });
  return !!member;
}

// ตรวจสอบว่า request มาจาก masterKey หรือ user ที่มี role SecurityAnalyst
async function assertSecurityAccess(req) {
  if (req.master) return;
  if (await hasSecurityRole(req.user)) return;
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'ต้องใช้ masterKey หรือ role SecurityAnalyst เท่านั้น');
}

module.exports = { SECURITY_ROLE, hasSecurityRole, assertSecurityAccess };

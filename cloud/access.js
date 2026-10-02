const SECURITY_ROLE = 'SecurityAnalyst';

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

module.exports = { SECURITY_ROLE, assertSecurityAccess };

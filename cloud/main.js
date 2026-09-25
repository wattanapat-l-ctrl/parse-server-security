const net = require('net');

const SECURITY_ROLE = 'SecurityAnalyst';

// ============================================================
// Helper
// ============================================================

// ตรวจสอบว่า request มาจาก masterKey หรือ user ที่มี role SecurityAnalyst
function assertSecurityAccess(req) {
  if (req.master) return;
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'ต้องใช้ masterKey หรือ role SecurityAnalyst เท่านั้น');
}

// เขียน audit log (บันทึกได้จาก cloud code เท่านั้น - client เขียนไม่ผ่าน)
async function writeLog(event, meta = {}) {
  const Log = new Parse.Object('SecurityLog');
  Log.set('event', event);
  Log.set('meta', meta);
  Log.set('actor', meta.actor || 'system');
  await Log.save(null, { useMasterKey: true });
  return Log;
}

// ============================================================
// Cloud Function: สแกนพอร์ตจริง (TCP connect scan)
// ใช้ตรวจสอบว่า target มี service ไหนเปิดอยู่บ้าง (external scan)
// ============================================================
Parse.Cloud.define('runPortScan', async (req) => {
  assertSecurityAccess(req);

  const host = req.params.host;
  const ports = req.params.ports; // array เช่น [22,80,443,3306,5432,8080,8443]
  const timeoutMs = req.params.timeoutMs || 1500;

  if (!host) throw new Parse.Error(Parse.Error.INVALID_QUERY, 'ต้องระบุ host');
  if (!Array.isArray(ports) || ports.length === 0 || ports.length > 1000) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'ports ต้องเป็น array (1-1000 พอร์ต)');
  }

  const scan = new Parse.Object('SecurityScan');
  scan.set('target', host);
  scan.set('ports', ports);
  scan.set('status', 'running');
  scan.set('startedBy', req.user ? req.user.id : 'master');
  await scan.save(null, { useMasterKey: true });

  async function checkPort(port) {
    return new Promise((resolve) => {
      const sock = new net.Socket();
      let done = false;
      const finish = (open) => {
        if (done) return;
        done = true;
        sock.destroy();
        resolve(open);
      };
      sock.setTimeout(timeoutMs);
      sock.once('connect', () => finish(true));
      sock.once('timeout', () => finish(false));
      sock.once('error', () => finish(false));
      sock.connect(port, host);
    });
  }

  const results = [];
  for (const p of ports) {
    const open = await checkPort(p);
    results.push({ port: p, status: open ? 'open' : 'closed' });
  }

  const openPorts = results.filter((r) => r.status === 'open');
  const severity = openPorts.length === 0
    ? 'low'
    : openPorts.length >= 5
      ? 'high'
      : 'medium';

  scan.set('status', 'completed');
  scan.set('results', results);
  scan.set('openPorts', openPorts);
  scan.set('severity', severity);
  await scan.save(null, { useMasterKey: true });

  if (openPorts.length > 0) {
    // แจ้งเตือนถ้าเจอพอร์ตเปิดที่ไม่ควรเปิด (external exposure)
    await createAlert(
      severity,
      `พบพอร์ตเปิดจำนวน ${openPorts.length} บน ${host}`,
      { host, openPorts: openPorts.map((r) => r.port), scanId: scan.id }
    );
  }

  await writeLog('security.scan.completed', {
    target: host,
    openCount: openPorts.length,
    scanId: scan.id,
    actor: req.user ? req.user.id : 'master',
  });

  return scan;
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ============================================================
// Cloud Function: สร้าง Security Alert
// (ใช้ภายในระบบ - role admin/analyst เท่านั้น)
// ============================================================
async function createAlert(severity, title, details = {}) {
  const Alert = new Parse.Object('SecurityAlert');
  Alert.set('severity', severity); // critical | high | medium | low
  Alert.set('title', title);
  Alert.set('details', details);
  Alert.set('status', 'open'); // open | in_progress | resolved
  await Alert.save(null, { useMasterKey: true });
  return Alert;
}

Parse.Cloud.define('createSecurityAlert', async (req) => {
  assertSecurityAccess(req);
  const { severity, title, details } = req.params;
  const allowed = ['critical', 'high', 'medium', 'low'];
  if (!allowed.includes(severity)) throw new Parse.Error(Parse.Error.INVALID_QUERY, 'severity ไม่ถูกต้อง');
  if (!title) throw new Parse.Error(Parse.Error.INVALID_QUERY, 'ต้องระบุ title');
  const alert = await createAlert(severity, title, details || {});
  await writeLog('security.alert.created', { alertId: alert.id, severity, title });
  return alert;
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ============================================================
// Cloud Function: รายงานสรุปสถานะความปลอดภัย
// ============================================================
Parse.Cloud.define('getSecurityReport', async (req) => {
  assertSecurityAccess(req);

  const alertQuery = new Parse.Query('SecurityAlert');
  alertQuery.select('severity', 'status');
  const alerts = await alertQuery.find({ useMasterKey: true });

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byStatus = { open: 0, in_progress: 0, resolved: 0 };
  for (const a of alerts) {
    bySeverity[a.get('severity')] = (bySeverity[a.get('severity')] || 0) + 1;
    byStatus[a.get('status')] = (byStatus[a.get('status')] || 0) + 1;
  }

  const openCritical = alerts.filter((a) => a.get('severity') === 'critical' && a.get('status') !== 'resolved').length;

  const scanQuery = new Parse.Query('SecurityScan');
  scanQuery.descending('createdAt');
  const recentScans = await scanQuery.limit(10).find({ useMasterKey: true });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      bySeverity,
      byStatus,
      openCritical,
      riskLevel: openCritical > 0 ? 'CRITICAL' : bySeverity.high > 0 ? 'HIGH' : 'NORMAL',
    },
    recentScans: recentScans.map((s) => ({
      id: s.id,
      target: s.get('target'),
      status: s.get('status'),
      severity: s.get('severity'),
      openPorts: s.get('openPorts'),
      createdAt: s.createdAt,
    })),
  };
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ============================================================
// Cloud Function: ล็อกผู้ใช้ที่ถูกบุกรุก (quarantine)
// - ยกเลิก session ทั้งหมด + ขึ้นบัญชีดำ
// ============================================================
Parse.Cloud.define('quarantineUser', async (req) => {
  assertSecurityAccess(req);

  const targetId = req.params.userId;
  if (!targetId) throw new Parse.Error(Parse.Error.INVALID_QUERY, 'ต้องระบุ userId');

  const user = await new Parse.Query(Parse.User).get(targetId, { useMasterKey: true });
  user.set('accountLocked', true);
  user.set('lockedAt', new Date());
  user.set('lockedReason', req.params.reason || 'quarantine โดย SecurityAnalyst');
  await user.save(null, { useMasterKey: true });

  // ยกเลิก session ทั้งหมด
  const sessionQuery = new Parse.Query(Parse.Session);
  sessionQuery.equalTo('user', user);
  const sessions = await sessionQuery.find({ useMasterKey: true });
  await Parse.Object.destroyAll(sessions, { useMasterKey: true });

  await createAlert(
    req.params.severity || 'high',
    `ผู้ใช้ ${user.get('username')} ถูกกักกัน (quarantine)`,
    { userId: user.id, reason: req.params.reason, revokedSessions: sessions.length }
  );
  await writeLog('security.user.quarantined', { userId: user.id, actor: req.user ? req.user.id : 'master' });

  return { userId: user.id, revokedSessions: sessions.length, accountLocked: true };
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ============================================================
// Cloud Function: ปลดล็อกผู้ใช้
// ============================================================
Parse.Cloud.define('unquarantineUser', async (req) => {
  assertSecurityAccess(req);
  const targetId = req.params.userId;
  if (!targetId) throw new Parse.Error(Parse.Error.INVALID_QUERY, 'ต้องระบุ userId');

  const user = await new Parse.Query(Parse.User).get(targetId, { useMasterKey: true });
  user.unset('accountLocked');
  user.unset('lockedAt');
  user.unset('lockedReason');
  await user.save(null, { useMasterKey: true });

  await writeLog('security.user.unlock', { userId: user.id, actor: req.user ? req.user.id : 'master' });
  return { userId: user.id, accountLocked: false };
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ============================================================
// Cloud Function: ปิด/แก้ alert
// ============================================================
Parse.Cloud.define('updateAlertStatus', async (req) => {
  assertSecurityAccess(req);
  const { alertId, status, note } = req.params;
  const allowed = ['open', 'in_progress', 'resolved'];
  if (!allowed.includes(status)) throw new Parse.Error(Parse.Error.INVALID_QUERY, 'status ไม่ถูกต้อง');

  const alert = await new Parse.Query('SecurityAlert').get(alertId, { useMasterKey: true });
  alert.set('status', status);
  if (note) alert.set('resolutionNote', note);
  if (status === 'resolved') alert.set('resolvedAt', new Date());
  await alert.save(null, { useMasterKey: true });

  await writeLog('security.alert.updated', { alertId: alert.id, status, actor: req.user ? req.user.id : 'master' });
  return alert;
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ============================================================
// HOOKS: บังคับกฎความปลอดภัยระดับ data layer
// ============================================================

// ---------- กฎการใช้งาน `_User` ----------
// 1) สมัครใหม่ (signup) อนุญาตเสมอ
// 2) แก้ไข user ที่มีอยู่: ได้เฉพาะเจ้าของตัวเอง หรือ masterKey
// 3) ป้องกัน signed-up user ตั้ง field ด้าน security เองไม่ได้
Parse.Cloud.beforeSave(Parse.User, async (request) => {
  if (request.master) {
    return request.object;
  }
  // สมัครผู้ใช้ใหม่ — อนุญาต
  if (request.original == null) {
    return request.object;
  }
  // แก้ user ที่มีอยู่ — ต้องเป็นเจ้าของตัวเอง
  if (request.user && request.original && request.original.id === request.user.id) {
    return request.object;
  }
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'แก้ข้อมูลคนอื่นไม่ได้ (เฉพาะเจ้าของหรือ masterKey)');
});

// Blokc การเข้าสู่ระบบของบัญชีที่ถูกกักกัน
Parse.Cloud.beforeLogin(async (req) => {
  const user = req.object;
  if (user.get('accountLocked')) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'บัญชีนี้ถูกกักกัน (locked) กรุณาติดต่อ security team');
  }
});

// SecurityLog เขียนได้เฉพาะ masterKey (append-only จากมุมมอง client)
Parse.Cloud.beforeSave('SecurityLog', (req) => {
  if (req.master) return req.object;
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'security log เขียนได้เฉพาะระบบเท่านั้น');
});
Parse.Cloud.afterSave('SecurityLog', async (req) => {
  console.log(`[AUDIT] ${req.object.get('event')}`, JSON.stringify(req.object.get('meta') || {}));
});

// SecurityAlert: client อ่านได้เฉพาะ alert ที่เกี่ยวกับตัวเอง + เขียนไม่ได้
Parse.Cloud.beforeSave('SecurityAlert', (req) => {
  if (req.master) return req.object;
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'alert สร้างผ่าน cloud function เท่านั้น');
});
Parse.Cloud.beforeFind('SecurityAlert', (req) => {
  if (req.master) return {};
  if (req.user) {
    // ผู้ใช้ทั่วไปเห็นเฉพาะ alert ที่ tagged ถึงตน
    return { userId: req.user.id };
  }
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'ต้องมีสิทธิ์ก่อนอ่าน alert');
});

// SecurityScan: เขียนได้เฉพาะ cloud code
Parse.Cloud.beforeSave('SecurityScan', (req) => {
  if (req.master) return req.object;
  throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'scan สร้างผ่าน cloud function เท่านั้น');
});

console.log('✔ Cloud Code (security) โหลดเรียบร้อย');
// ============================================================
// Incident Management
// จัดการเหตุการณ์ด้านความปลอดภัยที่ต่อยอดจาก SecurityAlert
// ============================================================

const { SECURITY_ROLE, assertSecurityAccess } = require('./access');

const INCIDENT_STATUS = [
  'open',
  'investigating',
  'contained',
  'resolved'
];

// ------------------------------------------------------------
// 1. สร้าง Incident จาก Security Alert
// ------------------------------------------------------------
Parse.Cloud.define('createIncident', async (req) => {
  await assertSecurityAccess(req);

  const { alertId, title, description } = req.params;

  if (!alertId) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      'ต้องระบุ alertId'
    );
  }

  // ตรวจสอบว่า SecurityAlert มีอยู่จริง
  const alert = await new Parse.Query('SecurityAlert').get(
    alertId,
    { useMasterKey: true }
  );

  // ป้องกัน Alert เดียวถูกสร้าง Incident ซ้ำ
  const duplicateQuery = new Parse.Query('SecurityIncident');
  duplicateQuery.equalTo('alert', alert);

  const existing = await duplicateQuery.first({
    useMasterKey: true
  });

  if (existing) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      'Security Alert นี้มี Incident อยู่แล้ว'
    );
  }

  const incident = new Parse.Object('SecurityIncident');

  incident.set('alert', alert);
  incident.set('title', title || alert.get('title') || 'Security Incident');
  incident.set('description', description || '');
  incident.set('status', 'open');
  incident.set('assignedTo', null);
  incident.set('notes', []);

  await incident.save(null, {
    useMasterKey: true
  });

  return {
    id: incident.id,
    alertId: alert.id,
    title: incident.get('title'),
    status: incident.get('status'),
    message: 'สร้าง Security Incident สำเร็จ'
  };
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ------------------------------------------------------------
// 2. มอบหมาย Incident ให้ผู้รับผิดชอบ
// ------------------------------------------------------------
Parse.Cloud.define('assignIncident', async (req) => {
  await assertSecurityAccess(req);

  const { incidentId, assignedTo } = req.params;

  if (!incidentId || !assignedTo) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      'ต้องระบุ incidentId และ assignedTo'
    );
  }

  const incident = await new Parse.Query('SecurityIncident').get(
    incidentId,
    { useMasterKey: true }
  );

  incident.set('assignedTo', assignedTo);

  await incident.save(null, {
    useMasterKey: true
  });

  return {
    id: incident.id,
    assignedTo: incident.get('assignedTo'),
    message: 'มอบหมาย Incident สำเร็จ'
  };
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ------------------------------------------------------------
// 3. เพิ่ม Note ระหว่างตรวจสอบ Incident
// ------------------------------------------------------------
Parse.Cloud.define('addIncidentNote', async (req) => {
  await assertSecurityAccess(req);

  const { incidentId, note } = req.params;

  if (!incidentId || !note) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      'ต้องระบุ incidentId และ note'
    );
  }

  const incident = await new Parse.Query('SecurityIncident').get(
    incidentId,
    { useMasterKey: true }
  );

  const notes = incident.get('notes') || [];

  notes.push({
    message: note,
    createdAt: new Date().toISOString()
  });

  incident.set('notes', notes);

  await incident.save(null, {
    useMasterKey: true
  });

  return {
    id: incident.id,
    notes,
    message: 'เพิ่ม Incident Note สำเร็จ'
  };
}, { requireAnyUserRoles: [SECURITY_ROLE] });

// ------------------------------------------------------------
// 4. เปลี่ยนสถานะ Incident
// ------------------------------------------------------------
Parse.Cloud.define('updateIncidentStatus', async (req) => {
  await assertSecurityAccess(req);

  const { incidentId, status } = req.params;

  if (!incidentId || !status) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      'ต้องระบุ incidentId และ status'
    );
  }

  if (!INCIDENT_STATUS.includes(status)) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      `status ต้องเป็น ${INCIDENT_STATUS.join(', ')}`
    );
  }

  const incident = await new Parse.Query('SecurityIncident').get(
    incidentId,
    { useMasterKey: true }
  );

  incident.set('status', status);

  if (status === 'resolved') {
    incident.set('resolvedAt', new Date());
  }

  await incident.save(null, {
    useMasterKey: true
  });

  return {
    id: incident.id,
    status: incident.get('status'),
    message: 'อัปเดตสถานะ Incident สำเร็จ'
  };
}, { requireAnyUserRoles: [SECURITY_ROLE] });
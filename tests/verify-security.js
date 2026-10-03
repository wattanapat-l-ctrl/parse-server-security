require('dotenv').config();

// ชุดทดสอบเสริม: Incident lifecycle, role SecurityAnalyst, ขอบเขตการอ่าน
// SecurityAlert, HTTP security headers, CORS และ account lockout
// รันหลังจาก tests/verify-all.js: docker compose exec app npm test

const BASE = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.SERVER_PORT || 1337}/parse`;
const PORT = process.env.SERVER_PORT || 1337;
const APP_ID = process.env.APP_ID;
const REST = process.env.REST_API_KEY;
const MASTER = process.env.MASTER_KEY;

const results = [];

function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
}

async function req(requestPath, { method = 'GET', body, session, key = 'rest' } = {}) {
  const headers = { 'X-Parse-Application-Id': APP_ID, 'Content-Type': 'application/json' };
  if (key === 'rest') headers['X-Parse-REST-API-Key'] = REST;
  else if (key === 'master') headers['X-Parse-Master-Key'] = MASTER;
  if (session) headers['X-Parse-Session-Token'] = session;
  const res = await fetch(`${BASE}${requestPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, ok: res.ok };
}

async function root(pathLike, { method = 'GET', headers = {} } = {}) {
  const res = await fetch(`http://localhost:${PORT}${pathLike}`, { method, headers });
  return { status: res.status, headers: res.headers, data: await res.text() };
}

async function signup(prefix) {
  const username = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const r = await req('/users', {
    method: 'POST',
    body: { username, password: 'SecurePass123!', email: `${username}@test.local` },
  });
  if (!r.ok) throw new Error(`signup ${username} ไม่สำเร็จ: ${r.status}`);
  // response ของ signup ไม่คืนค่า username กลับมา ต้องเก็บจากค่าที่สร้างเอง
  return { username, objectId: r.data.objectId };
}

async function login(username, password = 'SecurePass123!') {
  const r = await req('/login', { method: 'POST', body: { username, password } });
  return r.ok ? r.data.sessionToken : null;
}

async function main() {
  let r;

  // ---------- Incident lifecycle ----------
  console.log('--- Incident lifecycle ---');

  r = await req('/functions/createSecurityAlert', {
    method: 'POST', key: 'master', body: { severity: 'critical', title: 'incident test alert' },
  });
  const alertId = r.ok ? r.data.result.objectId : null;
  check('createSecurityAlert (masterKey)', r.ok && !!alertId, r.status + ` ${alertId || ''}`);

  r = await req('/functions/createIncident', {
    method: 'POST', key: 'master', body: { alertId, title: 'incident test' },
  });
  const incidentId = r.ok ? r.data.result.id : null;
  check('createIncident', r.ok && !!incidentId && r.data.result.status === 'open', r.status + ` ${incidentId || ''}`);

  r = await req('/functions/createIncident', { method: 'POST', key: 'master', body: { alertId } });
  check('createIncident ซ้ำจาก alert เดิมถูกปฏิเสธ', !r.ok && String(r.data.error).includes('Incident'), `${r.status} ${r.data.error}`);

  r = await req('/functions/createIncident', { method: 'POST', key: 'master', body: {} });
  check('createIncident ไม่ส่ง alertId ถูกปฏิเสธ', !r.ok, `${r.status} ${r.data.error}`);

  r = await req('/functions/updateIncidentStatus', {
    method: 'POST', key: 'master', body: { incidentId, status: 'investigating' },
  });
  check('updateIncidentStatus -> investigating', r.ok && r.data.result.status === 'investigating', r.data.result?.status || r.status);

  r = await req('/functions/updateIncidentStatus', {
    method: 'POST', key: 'master', body: { incidentId, status: 'invalid_status' },
  });
  check('updateIncidentStatus ผิดค่าถูกปฏิเสธ', !r.ok, `${r.status} ${r.data.error}`);

  r = await req('/functions/updateIncidentStatus', {
    method: 'POST', key: 'master', body: { incidentId, status: 'resolved' },
  });
  check('updateIncidentStatus -> resolved', r.ok && r.data.result.status === 'resolved', r.data.result?.status || r.status);

  r = await req(`/classes/SecurityIncident/${incidentId}`, { key: 'master' });
  check('SecurityIncident มี resolvedAt หลังปิดเรื่อง', r.ok && !!r.data.resolvedAt, `${r.status} resolvedAt=${r.data.resolvedAt}`);

  r = await req('/functions/addIncidentNote', {
    method: 'POST', key: 'master', body: { incidentId, note: 'ตรวจสอบแล้ว' },
  });
  check('addIncidentNote', r.ok && r.data.result.notes.length === 1, `notes=${r.data.result?.notes?.length}`);

  // ---------- role SecurityAnalyst ----------
  console.log('--- role SecurityAnalyst ---');

  const analyst = await signup('analyst');

  r = await req('/functions/assignIncident', {
    method: 'POST', key: 'master', body: { incidentId, assignedTo: analyst.objectId },
  });
  check('assignIncident', r.ok && r.data.result.assignedTo === analyst.objectId, r.data.result?.assignedTo || r.status);

  r = await req('/functions/assignSecurityAnalystRole', {
    method: 'POST', key: 'master', body: { userId: analyst.objectId },
  });
  check('assignSecurityAnalystRole (masterKey)', r.ok && r.data.result.role === 'SecurityAnalyst', `${r.status} ${JSON.stringify(r.data.result || r.data.error)}`);

  const analystSession = await login(analyst.username);
  check('login หลังได้ role', !!analystSession, analystSession ? 'ok' : 'ไม่สำเร็จ');

  r = await req('/functions/getSecurityReport', { method: 'POST', session: analystSession, body: {} });
  check('SecurityAnalyst เรียก getSecurityReport ได้', r.ok && !!r.data.result.summary.riskLevel, r.data.result?.summary?.riskLevel || `${r.status} ${r.data.error}`);

  r = await req('/functions/addIncidentNote', {
    method: 'POST', session: analystSession, body: { incidentId, note: 'note จาก analyst' },
  });
  check('SecurityAnalyst เพิ่ม note ได้', r.ok && r.data.result.notes.length === 2, `notes=${r.data.result?.notes?.length}`);

  r = await req('/functions/assignSecurityAnalystRole', {
    method: 'POST', session: analystSession, body: { userId: analyst.objectId },
  });
  check('assignSecurityAnalystRole ถูกปฏิเสธเมื่อไม่ได้ใช้ masterKey', !r.ok && String(r.data.error).includes('masterKey'), `${r.status} ${r.data.error}`);

  r = await req('/classes/SecurityIncident?limit=100', { session: analystSession });
  check('SecurityAnalyst อ่าน SecurityIncident ได้', r.ok && r.data.results.length > 0, `count=${r.data.results?.length}`);

  // ---------- ขอบเขตการอ่าน SecurityAlert ----------
  console.log('--- ขอบเขตการอ่าน SecurityAlert ---');

  const victim = await signup('victim');
  const victimSession = await login(victim.username);

  r = await req('/classes/SecurityAlert?limit=100', { session: victimSession });
  check('ผู้ใช้ที่ยังไม่มี alert ของตัวเองเห็น 0 รายการ', r.ok && r.data.results.length === 0, `${r.status} count=${r.data.results?.length}`);

  r = await req('/functions/createSecurityAlert', {
    method: 'POST', key: 'master',
    body: { severity: 'high', title: 'alert ของ victim', userId: victim.objectId },
  });
  check('createSecurityAlert ผูกกับ userId ได้', r.ok && r.data.result.userId === victim.objectId, `userId=${r.data.result?.userId}`);

  r = await req('/classes/SecurityAlert?limit=100', { session: victimSession });
  check('ผู้ใช้เห็นเฉพาะ alert ที่ tag ตัวเอง (1 รายการ)', r.ok && r.data.results.length === 1, `${r.status} count=${r.data.results?.length}`);

  r = await req(`/classes/SecurityAlert?where=${encodeURIComponent(JSON.stringify({ title: 'incident test alert' }))}`, { session: victimSession });
  check('alert ของคนอื่นมองไม่เห็นแม้กรองด้วย where', r.ok && r.data.results.length === 0, `${r.status} count=${r.data.results?.length}`);

  r = await req(`/classes/SecurityAlert?where=${encodeURIComponent(JSON.stringify({ severity: 'high' }))}`, { session: victimSession });
  check('เงื่อนไข where ของ client ยังทำงานควบคู่กับการจำกัดสิทธิ์', r.ok && r.data.results.length === 1, `${r.status} count=${r.data.results?.length}`);

  r = await req(`/classes/SecurityAlert?where=${encodeURIComponent(JSON.stringify({ severity: 'low' }))}`, { session: victimSession });
  check('where ที่ไม่ตรงกับ alert ของตัวเองได้ 0 รายการ', r.ok && r.data.results.length === 0, `${r.status} count=${r.data.results?.length}`);

  r = await req('/classes/SecurityAlert?limit=100', { session: analystSession });
  check('SecurityAnalyst เห็น SecurityAlert ทั้งหมด', r.ok && r.data.results.length > 1, `count=${r.data.results?.length}`);

  r = await req('/classes/SecurityAlert?limit=100', { key: 'master' });
  check('masterKey เห็น SecurityAlert ทั้งหมด', r.ok && r.data.results.length > 1, `count=${r.data.results?.length}`);

  r = await req('/classes/SecurityAlert?limit=100');
  check('ไม่มี session อ่าน SecurityAlert ไม่ได้', !r.ok, `${r.status} ${r.data.error || ''}`);

  // ---------- ผู้ใช้ทั่วไปกับ Incident ----------
  console.log('--- ผู้ใช้ทั่วไปกับ Incident ---');

  const plain = await signup('plain');
  const plainSession = await login(plain.username);

  r = await req('/functions/createIncident', { method: 'POST', session: plainSession, body: { alertId } });
  check('ผู้ใช้ทั่วไปสร้าง incident ไม่ได้', !r.ok, `${r.status} ${r.data.error || r.data.code}`);

  r = await req('/classes/SecurityIncident?limit=100', { session: plainSession });
  check('ผู้ใช้ทั่วไปอ่าน SecurityIncident ไม่ได้', !r.ok, `${r.status} ${r.data.error || r.data.code}`);

  r = await req(`/classes/SecurityIncident/${incidentId}`, { method: 'PUT', session: plainSession, body: { title: 'tamper' } });
  check('ผู้ใช้ทั่วไปแก้ SecurityIncident ไม่ได้', !r.ok, `${r.status} ${r.data.error || r.data.code}`);

  r = await req(`/users/${analyst.objectId}`, { session: plainSession });
  check('enforcePrivateUsers: อ่านข้อมูลผู้ใช้อื่นไม่ได้', !r.ok, `${r.status} ${r.data.code || r.data.error}`);

  // ---------- HTTP layer ----------
  console.log('--- HTTP layer ---');

  let g = await root('/health');
  check('helmet: /health มี security headers', !!g.headers.get('x-content-type-options') && !!g.headers.get('x-frame-options'), `xcto=${g.headers.get('x-content-type-options')} xfo=${g.headers.get('x-frame-options')}`);

  g = await root('/dashboard');
  check('dashboard ตอบกลับ 200', g.status === 200, String(g.status));

  check('CSP ของ dashboard อนุญาต inline script ที่ parse-dashboard ฝังไว้', (g.headers.get('content-security-policy') || '').includes("'unsafe-inline'"), (g.headers.get('content-security-policy') || '').slice(0, 80));

  g = await root('/health', { headers: { Origin: 'http://localhost:3000' } });
  check('CORS: origin ที่อนุญาตได้รับ Access-Control-Allow-Origin', g.headers.get('access-control-allow-origin') === 'http://localhost:3000', String(g.headers.get('access-control-allow-origin')));

  g = await root('/health', { headers: { Origin: 'http://evil.example' } });
  check('CORS: origin นอก allowlist ไม่ได้ Access-Control-Allow-Origin', !g.headers.get('access-control-allow-origin'), String(g.headers.get('access-control-allow-origin')));

  g = await root('/parse/health', { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } });
  check('OPTIONS preflight ตอบ 204', g.status === 204, String(g.status));

  g = await root('/parse', { headers: { 'X-Parse-Application-Id': APP_ID } });
  check('เรียก Parse API โดยไม่มี key ถูกปฏิเสธ', g.status === 403, String(g.status));

  // ---------- Account lockout ----------
  console.log('--- Account lockout ---');

  const lockme = await signup('lockme');
  let locked = false;
  let lastStatus = '';
  for (let i = 0; i < 8 && !locked; i++) {
    const bad = await req('/login', { method: 'POST', body: { username: lockme.username, password: 'WrongPass123!' } });
    lastStatus = `${bad.status} ${String(bad.data.error || '')}`;
    if (/locked|too many/i.test(lastStatus)) locked = true;
  }
  check('login ด้วยรหัสผิดเกินจำนวนที่กำหนดแล้วบัญชีถูกล็อก', locked, lastStatus);

  const stillLocked = await login(lockme.username);
  check('บัญชีที่ถูกล็อก login ด้วยรหัสผ่านถูกต้องก็ไม่ได้', !stillLocked, stillLocked ? 'login สำเร็จ (ไม่ถูกล็อก)' : 'ถูกล็อกตามที่ควรเป็น');

  const failed = results.filter((t) => !t.pass).length;
  console.log(`\n===== สรุป: ${results.length - failed}/${results.length} ผ่าน =====`);
  if (failed > 0) {
    console.log('ล้มเหลว:', results.filter((t) => !t.pass).map((t) => t.name).join(', '));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('SCRIPT ERROR:', e); process.exit(1); });

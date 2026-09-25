require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
const BASE = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.SERVER_PORT || 1337}/parse`;

const APP_ID = process.env.APP_ID;
const REST = process.env.REST_API_KEY;
const MASTER = process.env.MASTER_KEY;

const results = [];

function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function root(pathLike, options) {
  const url = `http://localhost:${pathLike}`;
  const res = await fetch(url, { method: 'GET' });
  return { status: res.status, data: await res.text() };
}

async function main() {
  const ts = Date.now();
  const unameA = `verifyA_${ts}`;
  const unameB = `verifyB_${ts}`;

  let r;

  r = await root(`${process.env.SERVER_PORT || 1337}/health`);
  check('GET /health', r.status === 200 && JSON.parse(r.data).status === 'ok', r.status);

  r = await req('/health');
  check('GET /parse/health', r.status === 200 && r.ok, r.status);

  r = await root(`${process.env.SERVER_PORT || 1337}/parse`);
  check('GET /parse โดยไม่ auth ถูกบล็อก', r.status === 401 || r.status === 403, `status ${r.status}`);

  r = await req('/users', { method: 'POST', body: { username: unameA, password: 'SecurePass123!', email: `${unameA}@test.local` } });
  const userA = r.ok ? r.data : null;
  check('signup ผู้ใช้ใหม่ A', r.status === 201 || (r.ok && r.data.sessionToken), r.status + ` ${userA?.objectId || ''}`);

  r = await req('/login', { method: 'POST', body: { username: unameA, password: 'SecurePass123!' } });
  const sessionA = r.ok ? r.data.sessionToken : null;
  check('login A', r.ok && !!r.data.sessionToken, r.status);

  r = await req('/users/me', { session: sessionA });
  check('GET /users/me (session A)', r.ok && r.data.username === unameA, r.status);

  r = await req('/functions/runPortScan', { method: 'POST', key: 'master',
    body: { host: '127.0.0.1', ports: [22, 80, 443, 1337, 27017, 9999], timeoutMs: 400 } });
  const scan = r.ok ? r.data.result : null;
  check('runPortScan (masterKey)', scan && scan.status === 'completed' && Array.isArray(scan.results), `open=${(scan?.openPorts || []).length}`);

  r = await req('/functions/runPortScan', { method: 'POST', session: sessionA,
    body: { host: '127.0.0.1', ports: [80], timeoutMs: 300 } });
  check('runPortScan ด้วย session ที่ไม่มี role ถูกบล็อก', !r.ok, `${r.status} ${r.data.code || ''}:${r.data.error || ''}`);

  r = await req('/functions/createSecurityAlert', { method: 'POST', key: 'master',
    body: { severity: 'medium', title: 'verify test alert', details: { source: 'verify-all' } } });
  const alertId = r.ok ? r.data.result.objectId : null;
  check('createSecurityAlert (masterKey)', r.ok && !!alertId, r.status + ` ${alertId || ''}`);

  r = await req('/functions/getSecurityReport', { method: 'POST', key: 'master', body: {} });
  check('getSecurityReport', r.ok && r.data.result.summary && r.data.result.summary.riskLevel, `${r.data.result?.summary?.riskLevel || r.status}`);

  r = await req('/functions/updateAlertStatus', { method: 'POST', key: 'master', body: { alertId, status: 'resolved', note: 'verification' } });
  check('updateAlertStatus -> resolved', r.ok && r.data.result.status === 'resolved', r.data.result?.status || r.status);

  r = await req('/classes/SecurityAlert?order=-createdAt&limit=5', { key: 'master' });
  check('query SecurityAlert (master)', r.ok && Array.isArray(r.data.results) && r.data.results.length > 0, `count=${r.data.results?.length}`);

  r = await req('/classes/SecurityScan?order=-createdAt&limit=5', { key: 'master' });
  check('query SecurityScan (master)', r.ok && Array.isArray(r.data.results) && r.data.results.length > 0, `count=${r.data.results?.length}`);

  r = await req('/users', { method: 'POST', body: { username: unameB, password: 'SecurePass123!' } });
  const userB = r.ok ? r.data : null;
  check('signup ผู้ใช้ B (เป้าหมาย quarantine)', r.ok && r.data.sessionToken, r.status);

  const sessionB = userB?.sessionToken;
  r = await req('/functions/quarantineUser', { method: 'POST', key: 'master',
    body: { userId: userB?.objectId, reason: 'verify test' } });
  check('quarantineUser B', r.ok && r.data.result.accountLocked === true, `${r.status} revoked=${r.data.result?.revokedSessions}`);

  r = await req('/users/me', { session: sessionB });
  check('session B ถูก revoke หลัง quarantine', !r.ok, `${r.status} ${r.data.code || ''}`);

  r = await req('/login', { method: 'POST', body: { username: unameB, password: 'SecurePass123!' } });
  check('login ของ B ที่ถูกกักกันถูกบล็อก', !r.ok && String(r.data.error || '').includes('กักกัน'), `${r.status} ${r.data.error || ''}`);

  r = await req('/functions/unquarantineUser', { method: 'POST', key: 'master', body: { userId: userB?.objectId } });
  check('unquarantineUser B', r.ok && r.data.result.accountLocked === false, `${r.status} ${r.data.result?.accountLocked}`);

  r = await req('/login', { method: 'POST', body: { username: unameB, password: 'SecurePass123!' } });
  check('login B หลังปลดล็อกสำเร็จ', r.ok && !!r.data.sessionToken, r.status);

  r = await req(`/users/${userB?.objectId}`, { method: 'PUT', session: sessionA,
    body: { securityFlags: { hacked: true } } });
  check('A แก้ profile ของ B ถูกบล็อก', !r.ok, `${r.status} ${r.data.code || ''}:${r.data.error || ''}`);

  r = await req(`/users/${userA?.objectId}`, { method: 'PUT', session: sessionA,
    body: { securityFlags: { verified: true } } });
  check('A แก้ profile ตัวเองได้', r.ok, `${r.status} ${r.data.error || ''}`);

  r = await req('/classes/SecurityAlert?limit=10', { session: sessionA });
  check('query SecurityAlert ด้วย session (ดูได้เฉพาะของตัวเอง)', r.ok && Array.isArray(r.data.results), r.status);

  r = await req('/classes/SecurityLog', { method: 'POST', body: { event: 'tamper', meta: {} } });
  check('client เขียน SecurityLog ตรง ๆ ถูกบล็อก', !r.ok, `${r.status} ${r.data.code || ''}`);

  r = await req('/classes/NewForbiddenClass', { method: 'POST', body: { foo: 'bar' } });
  check('client สร้าง class ใหม่ถูกบล็อก', !r.ok, `${r.status} ${r.data.code || ''}`);

  r = await req('/classes/SecurityAlert', { method: 'POST', body: { severity: 'critical', title: 'fake' } });
  check('client สร้าง SecurityAlert ตรง ๆ ถูกบล็อก', !r.ok, `${r.status} ${r.data.code || ''}`);

  r = await req('/classes/SecurityLog?order=-createdAt&limit=5', { key: 'master' });
  check('query SecurityLog (audit log) (master)', r.ok && Array.isArray(r.data.results) && r.data.results.length > 0, `count=${r.data.results?.length}`);

  r = await root(`${process.env.SERVER_PORT || 1337}/dashboard`);
  check('Dashboard เข้าได้', r.status === 200, r.status);

  const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const leftover = envText.split('\n').filter((l) => !l.trim().startsWith('#') && l.includes('change_me_'));
  check('.env ไม่มีค่า placeholder (change_me_)', leftover.length === 0, leftover.join(';') || 'clean');

  const ratePass = await testRateLimit();
  check('Rate limit ทำงาน (429 หลังเกิน limit)', ratePass, '');

  const failed = results.filter((t) => !t.pass).length;
  console.log(`\n===== สรุป: ${results.length - failed}/${results.length} ผ่าน =====`);
  if (failed > 0) {
    console.log('ล้มเหลว:', results.filter((t) => !t.pass).map((t) => t.name).join(', '));
  }
  process.exit(failed > 0 ? 1 : 0);
}

async function testRateLimit() {
  const PORT = 1338;
  const env = { ...process.env, SERVER_PORT: String(PORT), RATE_LIMIT_MAX: '10', LOG_LEVEL: 'error', DASHBOARD_PORT: '4041' };
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: 'ignore' });
  try {
    let up = false;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://localhost:${PORT}/parse/health`);
        if (res.ok) { up = true; break; }
      } catch { /* not yet */ }
      await sleep(300);
    }
    if (!up) return false;
    let got429 = false;
    const headers = { 'X-Parse-Application-Id': APP_ID, 'X-Parse-REST-API-Key': REST, 'Content-Type': 'application/json' };
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://localhost:${PORT}/parse/login`, {
          method: 'POST', headers,
          body: JSON.stringify({ username: `rl_${i}`, password: 'x' }),
        });
        if (res.status === 429) { got429 = true; break; }
      } catch { /* ignore */ }
    }
    return got429;
  } finally {
    child.kill();
  }
}

main().catch((e) => { console.error('SCRIPT ERROR:', e); process.exit(1); });
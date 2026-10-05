require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const ParseServer = require('parse-server').ParseServer;
const ParseDashboard = require('parse-dashboard');

const app = express();
app.set('trust proxy', 1);

// ---------- HTTP Security Headers ----------
// Parse Dashboard ฝัง <script>ตั้งค่า PARSE_DASHBOARD_PATH ไว้ในหน้าเว็บ ถ้า script-src
// บล็อก inline script ค่านี้จะเป็น undefined และ router จะตั้ง basename ผิดเป็น "/"
// ทำให้หลัง login แล้วเห็นหน้า 404 จึงต้องอนุญาต inline script เฉพาะ /dashboard
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // เปิดถ้าใช้ client เป็น cross-origin
};
const dashboardPath = (process.env.DASHBOARD_PATH || '/dashboard').replace(/\/+$/, '');
const apiHelmet = helmet(helmetOptions);
const dashboardHelmet = helmet({
  ...helmetOptions,
  contentSecurityPolicy: {
    directives: {
      ...helmetOptions.contentSecurityPolicy.directives,
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});
app.use((req, res, next) =>
  req.path === dashboardPath || req.path.startsWith(`${dashboardPath}/`)
    ? dashboardHelmet(req, res, next)
    : apiHelmet(req, res, next)
);

// ---------- CORS (อนุญาตเฉพาะ origin ที่ระบุ) ----------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Parse-Application-Id, X-Parse-REST-API-Key, X-Parse-Client-Key, X-Parse-Installation-Id, X-Parse-Session-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- ค่าคงที่ต้องมาจาก .env ----------
const requiredEnv = ['MASTER_KEY', 'APP_ID', 'JAVASCRIPT_KEY', 'REST_API_KEY', 'CLIENT_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[ERROR] Missing required env: ${key}`);
    process.exit(1);
  }
}

// เตือนถ้ายังใช้ค่า default หรือค่าที่ยังไม่ถูกเปลี่ยน
const WEAK_VALUES = ['change_me_', 'REPLACE_WITH', 'security_pass', 'security_user'];
for (const key of ['MASTER_KEY', 'JAVASCRIPT_KEY', 'REST_API_KEY', 'CLIENT_KEY', 'DOT_NET_KEY', 'DASHBOARD_PASSWORD', 'MONGO_PASSWORD']) {
  const value = process.env[key] || '';
  if (WEAK_VALUES.some((weak) => value.includes(weak))) {
    console.warn(`[WARN] ${key} ยังเป็นค่าตัวอย่าง! กรุณาเปลี่ยนใน .env ก่อน deploy จริง`);
  }
}
// เตือนเรื่องการยืนยันอีเมลและการสแกน
if (process.env.VERIFY_USER_EMAILS === 'true' && !(process.env.MAILGUN_DOMAIN && process.env.MAILGUN_API_KEY)) {
  console.warn('[WARN] VERIFY_USER_EMAILS=true แต่ยังไม่ได้ตั้ง MAILGUN_DOMAIN/MAILGUN_API_KEY — ผู้ใช้จะยืนยันอีเมลไม่ได้');
}
if (process.env.ALLOW_INSECURE_HTTP === 'true' && process.env.NODE_ENV === 'production') {
  console.warn('[WARN] ALLOW_INSECURE_HTTP=true ใน production — ควรปิดและใช้ HTTPS');
}

const mountPath = process.env.MOUNT_PATH || '/parse';
const publicServerURL = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.SERVER_PORT || 1337}${mountPath}`;

// ---------- Parse Server Config ----------
const serverConfig = {
  databaseURI: process.env.DATABASE_URI || 'mongodb://localhost:27017/securitydb',
  cloud: path.join(__dirname, 'cloud', 'main.js'),
  serverURL: publicServerURL,
  publicServerURL,

  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  javascriptKey: process.env.JAVASCRIPT_KEY,
  restAPIKey: process.env.REST_API_KEY,
  clientKey: process.env.CLIENT_KEY,
  dotNetKey: process.env.DOT_NET_KEY,

  // ---------- SECURITY ----------
  // ไม่อนุญาตให้ client สร้าง class ใหม่เอง (ป้องกัน class injection)
  allowClientClassCreation: false,
  // ผู้ใช้ทุกคนเป็น private - อ่านข้อมูลคนอื่นไม่ได้
  enforcePrivateUsers: true,
  // masterKey ใช้ได้จาก localhost และ Docker host ตาม MASTER_KEY_IPS
  masterKeyIps: (process.env.MASTER_KEY_IPS || '127.0.0.1,::1,172.20.0.1')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean),
  // จำกัดขนาดไฟล์ upload
  maxUploadSize: process.env.MAX_UPLOAD_SIZE || '10mb',
  // ฟิลด์ที่ client เอาไว้ read ต้องใช้ masterKey ถึงจะเห็นค่า
  protectedFields: {
    _User: {
      '*': ['email', 'securityFlags', 'accountLocked', 'lockedAt', 'lockedReason'],
    },
  },
  // เซสชันถูก revoke ทุกครั้งที่เปลี่ยน password
  revokeSessionOnPasswordReset: true,
  // ล็อกบัญชีอัตโนมัติเมื่อ login ผิดซ้ำ (กัน brute-force)
  accountLockout: {
    duration: Number(process.env.ACCOUNT_LOCKOUT_DURATION_MIN || 5), // 5 นาที
    threshold: Number(process.env.ACCOUNT_LOCKOUT_THRESHOLD || 5),   // ผิด 5 ครั้ง
    unlockOnPasswordReset: true,
  },
  // Rate limiting ในตัว Parse Server (กัน DoS / brute-force)
  // includeInternalRequests: true = นับรวม request จาก localhost ด้วย (เข้มขึ้น)
  rateLimit: [
    {
      requestPath: '/*',
      requestCount: Number(process.env.RATE_LIMIT_MAX || 500),
      requestTimeWindow: Number(process.env.RATE_LIMIT_WINDOW_MIN || 15) * 60 * 1000,
      includeInternalRequests: true,
    },
  ],

  // ยืนยันอีเมลก่อนใช้งานจริง — ต้องมี mail adapter ด้วย ไม่งั้นผู้ใช้สมัครแล้ว login ไม่ได้
  // ค่าเริ่มต้นเป็น false เพื่อให้รัน local/testing ได้ ให้ตั้ง VERIFY_USER_EMAILS=true ใน .env ตอน production
  verifyUserEmails: process.env.VERIFY_USER_EMAILS === 'true',
  // false = คืน error เป็น JSON เสมอ (ไม่ render HTML error page) เหมาะกับ API
  enableExpressErrorHandler: false,
  // true = Parse.Object ที่ส่งเข้า Cloud Function จะถูกแปลงเป็น instance จริง (ค่า default ของ Parse Server คือ false)
  encodeParseObjectInCloudFunction: true,
  enableInsecureAuthAdapters: false,

  // ---------- LOGGING ----------
  logLevel: process.env.LOG_LEVEL || 'info',
  verbose: process.env.LOG_VERBOSE === 'true',

  // ---------- MAIL (ตัวเลือก, ถ้าใช้ alert ทางอีเมล) ----------
  emailAdapter: process.env.MAILGUN_DOMAIN && process.env.MAILGUN_API_KEY
    ? {
        module: 'parse-server-simple-mailgun-adapter',
        options: {
          fromAddress: process.env.EMAIL_FROM_ADDRESS,
          domain: process.env.MAILGUN_DOMAIN,
          apiKey: process.env.MAILGUN_API_KEY,
        },
      }
    : undefined,

  // ---------- MOUNT PATH ----------
  mountPath,
};

async function main() {
  // ---------- Start Parse Server (v7 API: start() -> .app) ----------
  const api = new ParseServer(serverConfig);
  await api.start();
  app.use(mountPath, api.app);

  // ---------- Health Check ----------
  app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  // ---------- Parse Dashboard (ต้องการ auth) ----------
  const dashUsers = [
    { user: process.env.DASHBOARD_USER || 'admin', pass: process.env.DASHBOARD_PASSWORD },
  ];
  try {
    const dashboard = new ParseDashboard(
      {
        apps: [
          {
            serverURL: publicServerURL,
            appId: serverConfig.appId,
            masterKey: serverConfig.masterKey,
            appName: 'Security Console',
          },
        ],
        users: dashUsers,
        trustProxy: 1,
      },
      { allowInsecureHTTP: process.env.ALLOW_INSECURE_HTTP === 'true' }
    );
    app.use('/dashboard', dashboard);
  } catch (err) {
    console.error('[ERROR] Dashboard init failed:', err.message);
  }

  const port = Number(process.env.SERVER_PORT || 1337);
  const host = process.env.HOST || '0.0.0.0';

  const server = app.listen(port, host, () => {
    console.log(`✔ Parse Server เริ่มทำงานที่ ${publicServerURL}`);
    console.log(`✔ Parse Dashboard เริ่มทำงานที่ http://localhost:${port}/dashboard (user: ${dashUsers[0].user})`);
    console.log(`✔ Health check: http://localhost:${port}/health`);
  });

  // ---------- Graceful Shutdown ----------
  const shutdown = async () => {
    console.log('\nShutting down Parse Server...');
    try { if (typeof api.handleShutdown === 'function') await api.handleShutdown(); } catch (_) { /* ignore */ }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[ERROR] เซิร์ฟเวอร์เริ่มไม่สำเร็จ:', err.message || err);
  process.exit(1);
});
require('dotenv').config();

const BASE = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.SERVER_PORT || 1337}/parse`;
const APP_ID = process.env.APP_ID;
const MASTER = process.env.MASTER_KEY;

const headers = {
  'X-Parse-Application-Id': APP_ID,
  'X-Parse-Master-Key': MASTER,
  'Content-Type': 'application/json',
};

// authenticated user ใช้งานได้ทุก operation (frontend ใช้ session ของ user ที่ login)
const authenticatedOnly = {
  find: { requiresAuthentication: true },
  count: { requiresAuthentication: true },
  get: { requiresAuthentication: true },
  create: { requiresAuthentication: true },
  update: { requiresAuthentication: true },
  delete: { requiresAuthentication: true },
};

const schemas = [
  {
    className: 'Parcel',
    fields: {
      trackingNumber: { type: 'String' },
      recipientName: { type: 'String' },
      roomNumber: { type: 'String' },
      courier: { type: 'String' },
      receivedDate: { type: 'String' },
      status: { type: 'String' },
      notes: { type: 'String' },
    },
    classLevelPermissions: authenticatedOnly,
  },
];

async function ensureSchema(schema) {
  const check = await fetch(`${BASE}/schemas/${schema.className}`, { headers });
  if (check.ok) {
    console.log(`- ${schema.className}: มีอยู่แล้ว ข้าม`);
    return;
  }

  const res = await fetch(`${BASE}/schemas/${schema.className}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(schema),
  });
  const data = await res.json();

  if (!res.ok) {
    console.error(`✖ ${schema.className}: สร้างไม่สำเร็จ`, data);
    process.exitCode = 1;
    return;
  }
  console.log(`✔ ${schema.className}: สร้าง schema สำเร็จ`);
}

async function main() {
  for (const schema of schemas) {
    await ensureSchema(schema);
  }
}

main().catch((err) => {
  console.error('[ERROR]', err.message || err);
  process.exit(1);
});

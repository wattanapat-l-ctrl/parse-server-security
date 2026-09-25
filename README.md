# Parse Server สำหรับงาน Security

Parse Server พร้อมการตั้งค่าด้านความปลอดภัย (hardening) สำหรับใช้เป็น backend ของระบบ security operations เช่น เก็บ alert, ติดตามช่องโหว่ (vulnerability), สแกนพอร์ต, กักกันผู้ใช้ที่ถูกบุกรุก (quarantine), และ audit log

## คุณสมบัติ

### Security hardening (ตั้งค่าใน `server.js`)
- **Rate limiting** — 500 request / 15 นาที / IP (รวม request จาก localhost) กัน DoS / brute-force
- **Account lockout** — ล็อกบัญชีอัตโนมัติเมื่อ login ผิด 5 ครั้ง (5 นาที)
- **ปิด class creation** — client สร้าง class ใหม่ไม่ได้ (`allowClientClassCreation: false`)
- **Private users** — user ถูกสร้างแบบ private เสมอ (`enforcePrivateUsers: true`)
- **masterKey จำกัด IP** — ใช้ได้จาก `127.0.0.1` / `::1` เท่านั้น
- **Protected fields** — `email`, `securityFlags` อ่านเห็นเฉพาะ masterKey
- **HTTP security headers** — `helmet` (CSP, frame-ancestors, ฯลฯ)
- **CORS จำกัด origin** — อนุญาตเฉพาะที่กำหนดใน `ALLOWED_ORIGINS`
- **Revoke session** — ทุกครั้งที่เปลี่ยน password
- **No HTML error page** — error คืนเป็น JSON เสมอ
- **จำกัดขนาด upload** — 10 MB

### ระบบ security (Cloud Code ใน `cloud/main.js`)
| Cloud Function | คำอธิบาย |
|---|---|
| `runPortScan` | สแกนพอร์ตจริง (TCP connect) หา service ที่เปิดอยู่บน target |
| `createSecurityAlert` | สร้าง SecurityAlert (critical/high/medium/low) |
| `getSecurityReport` | รายงานสรุปสถานะความปลอดภัย + ความเสี่ยง |
| `quarantineUser` | ล็อกผู้ใช้ + ยกเลิก session ทั้งหมด |
| `unquarantineUser` | ปลดล็อกผู้ใช้ |
| `updateAlertStatus` | เปลี่ยน status ของ alert (open/in_progress/resolved) |

### Data safety (Hooks)
- `SecurityLog` / `SecurityAlert` / `SecurityScan` — client เขียนตรงไม่ได้ ต้องผ่าน cloud function / masterKey เท่านั้น
- `beforeLogin` — บล็อก login ของบัญชีที่ถูกกักกัน
- `beforeSave User` — แก้ข้อมูลคนอื่นไม่ได้
- `beforeFind SecurityAlert` — ผู้ใช้ทั่วไปเห็นแค่ alert ของตัวเอง

### Classes หลัก
- `_User` — ผู้ใช้ (มี field เพิ่ม: `accountLocked`, `lockedAt`, `lockedReason`, `securityFlags`)
- `SecurityAlert` — `severity`, `title`, `details`, `status`, `resolvedAt`, `resolutionNote`
- `SecurityScan` — `target`, `ports`, `status`, `results`, `openPorts`, `severity`, `startedBy`
- `SecurityLog` — `event`, `meta`, `actor` (append-only)

## ความต้องการ
- Node.js >= 18
- Docker (+ Docker Desktop) ใช้รัน MongoDB

## เริ่มใช้งาน

```bash
# 1. เริ่ม MongoDB (ครั้งแรกจะ pull image มาเอง)
docker compose up -d

# 2. ตั้งค่า secrets ใน .env (เปลี่ยนทุก key ที่เริ่มด้วย change_me_!)
npm install        # ถ้ายังไม่ได้ติดตั้ง dependencies

# 3. รัน Parse Server + Dashboard
npm start
```

เมื่อพร้อมใช้งาน:
- **Parse API:** http://localhost:1337/parse
- **Dashboard:** http://localhost:1337/dashboard (user: `admin` / password จาก `.env`)
- **Health:** http://localhost:1337/health

## ทดสอบระบบ

```bash
# ทดสอบครบทุกฟีเจอร์ + security blocks (29 checks)
npm test

# รัน demo ครบทุกฟีเจอร์ (สร้าง role, สแกนพอร์ต, สร้าง alert, quarantine ผู้ใช้)
node examples/demo-security.js
```

### ตัวอย่าง REST แบบย่อ
```
สแกนพอร์ต:
POST /parse/functions/runPortScan
  headers: X-Parse-Application-Id, X-Parse-REST-API-Key
  body: { host: "127.0.0.1", ports: [22, 80, 443, 1337, 27017] }
  (ต้อง masterKey หรือ role SecurityAnalyst)

สร้าง alert:
POST /parse/functions/createSecurityAlert
  body: { severity: "high", title: "..." , details: {...} }
```

## ตั้งค่าระบบจริง (production)
1. เปลี่ยนทุก secret ใน `.env` — ใช้ `openssl rand -base64 32` หรือ password generator
2. เปิด HTTPS (reverse proxy หรือ TLS) และตั้ง `PUBLIC_SERVER_URL` เป็น `https://...`
3. ตั้ง `ALLOWED_ORIGINS` ให้ตรงกับ domain ของ client
4. ถ้า deploy จริง ให้แก้ `masterKeyIps` ชี้เฉพาะ IP admin
5. `.env` อย่า commit ขึ้น git (มี `.gitignore` กันไว้แล้ว)

## โครงสร้างไฟล์
```
parse server/
├── server.js              # Parse Server + security config
├── cloud/main.js          # Cloud code ระบบ security + hooks
├── examples/demo-security.js  # ตัวอย่าง client code
├── tests/verify-all.js    # ชุดทดสอบครบทุกฟีเจอร์ (npm test)
├── docker-compose.yml     # MongoDB (มี auth)
├── .env / .env.example    # ค่าคงที่และ secrets
└── package.json
```

## การปิดเครื่อง
- `Ctrl+C` — graceful shutdown
- `docker compose down` — หยุด MongoDB
# Parse Server สำหรับงาน Security

ระบบ backend สำหรับเก็บ Security Alert, ผลสแกนพอร์ต, การกักกันผู้ใช้ และ Audit Log โดยใช้ Parse Server และ MongoDB ผ่าน Docker Compose

## เริ่มใช้งานแบบเร็วที่สุด

หลังดาวน์โหลดโปรเจกต์แล้ว ต้องใช้ Docker Desktop และทำตาม 4 ขั้นตอนนี้ (Git ใช้เฉพาะตอนดาวน์โหลดจาก GitHub)

### 1. เปิดโปรเจกต์

ถ้ายังไม่ได้ดาวน์โหลดโปรเจกต์ ให้เปิด PowerShell แล้วรัน:

```powershell
git clone https://github.com/wattanapat-l-ctrl/parse-server-security.git
cd parse-server-security
```

ถ้าดาวน์โหลดมาแล้ว ให้เปิดโฟลเดอร์ที่มีไฟล์ `docker-compose.yml` ใน VS Code แล้วเปิด Terminal ของโฟลเดอร์นั้น

### 2. สร้างไฟล์ตั้งค่า

คัดลอกไฟล์ตัวอย่างเป็นไฟล์จริง:

```powershell
Copy-Item .env.example .env
```

บน macOS หรือ Linux ใช้:

```bash
cp .env.example .env
```

เปิดไฟล์ `.env` แล้วเปลี่ยนค่าเหล่านี้เป็นของจริงก่อนใช้งาน:

- `APP_ID`
- `MASTER_KEY`
- `JAVASCRIPT_KEY`
- `REST_API_KEY`
- `CLIENT_KEY`
- `DASHBOARD_PASSWORD`

ค่า `MASTER_KEY`, `REST_API_KEY` และ `CLIENT_KEY` ไม่ควรใช้ค่า `REPLACE_WITH_...` หรือค่าตัวอย่างจาก GitHub เด็ดขัด ไฟล์ `.env` ถูกอยู่ใน `.gitignore` และต้องไม่ commit หรือส่งขึ้น GitHub

### 3. เริ่มระบบทั้งหมด

รันคำสั่งนี้ใน Terminal:

```powershell
docker compose up
```

ครั้งแรก Docker จะ build image ให้อัตโนมัติ จากนั้นจะเริ่ม MongoDB และ Parse Server เมื่อ MongoDB พร้อม Parse Server จะเริ่มทำงานอัตโนมัติ ไม่ต้องพิมพ์ `npm start`

เปิด Terminal นี้ค้างไว้ระหว่างใช้งาน หากต้องการรันแบบ background ให้ใช้:

```powershell
docker compose up -d
```

### 4. ตรวจสอบว่าใช้งานได้

รัน:

```powershell
docker compose ps
```

ทั้ง `mongodb` และ `app` ควรมีสถานะ `healthy` แล้วเปิด URL เหล่านี้ในเบราว์เซอร์:

- Health check: http://localhost:1337/health
- Parse API: http://localhost:1337/parse
- Dashboard: http://localhost:1337/dashboard

Dashboard ใช้ค่า `DASHBOARD_USER` และ `DASHBOARD_PASSWORD` จากไฟล์ `.env`

ทดสอบ health check จาก PowerShell:

```powershell
Invoke-RestMethod http://localhost:1337/health
```

ผลลัพธ์ที่ถูกต้องจะมี `status` เป็น `ok`

## คำสั่งที่ใช้บ่อย

| ต้องการทำอะไร | คำสั่ง |
|---|---|
| เริ่มระบบ | `docker compose up` |
| เริ่มแบบ background | `docker compose up -d` |
| ดูสถานะ container | `docker compose ps` |
| ดู log ของ Parse Server | `docker compose logs -f app` |
| ดู log ของ MongoDB | `docker compose logs -f mongodb` |
| หยุดระบบ | `docker compose down` |
| ลบ container และข้อมูล MongoDB | `docker compose down -v` |

คำสั่ง `docker compose down -v` จะลบข้อมูลในฐานข้อมูลด้วย ควรใช้เมื่อต้องการเริ่มฐานข้อมูลใหม่เท่านั้น

## ทดสอบระบบ

เมื่อระบบทำงานอยู่แล้ว รันชุดทดสอบทั้งหมดใน container:

```powershell
docker compose exec app npm test
```

ผลลัพธ์ที่ถูกต้องคือ:

```text
===== สรุป: 29/29 ผ่าน =====
```

รันตัวอย่างการใช้งานระบบ:

```powershell
docker compose exec app node examples/demo-security.js
```

ชุดทดสอบและตัวอย่างจะสร้างข้อมูลผู้ใช้, alert และ scan จำนวนมากในฐานข้อมูล ไม่ควรรันกับฐานข้อมูล production

## ใช้งานผ่าน VS Code REST Client

ติดตั้ง VS Code Extension ชื่อ **REST Client** จากนั้นเปิดไฟล์ `api.http`

ก่อนกด **Send Request** ให้แก้ค่าด้านบนของไฟล์:

```text
@appId = ค่า APP_ID จาก .env
@restKey = ค่า REST_API_KEY จาก .env
@masterKey = ค่า MASTER_KEY จาก .env
```

เริ่มจาก request นี้ก่อน:

```http
GET {{host}}/health
```

ถ้าเห็น `{"status":"ok"}` แสดงว่า VS Code เชื่อมต่อกับ server ได้แล้ว

ค่าใน `api.http` ถูกทำเป็น placeholder โดยเจตนา เพื่อไม่ให้ secret ติดไปกับ GitHub ห้าม commit ค่าจริงลงในไฟล์นี้

## ระบบทำอะไรได้บ้าง

### Cloud Functions

| ชื่อฟังก์ชัน | หน้าที่ |
|---|---|
| `runPortScan` | สแกนพอร์ตแบบ TCP connect |
| `createSecurityAlert` | สร้าง Security Alert |
| `getSecurityReport` | สร้างสรุปสถานะความปลอดภัย |
| `quarantineUser` | ล็อกผู้ใช้และยกเลิก session |
| `unquarantineUser` | ปลดล็อกผู้ใช้ |
| `updateAlertStatus` | เปลี่ยนสถานะของ Alert |

ฟังก์ชันส่วนใหญ่ต้องใช้ `masterKey` หรือ session ของผู้ใช้ที่มี role `SecurityAnalyst`

> สแกนพอร์ตควรใช้กับเครื่องหรือระบบที่คุณได้รับอนุญาตเท่านั้น

### ความปลอดภัยที่ตั้งค่าไว้

- จำกัดจำนวน request เพื่อลด brute-force และ DoS
- ล็อกบัญชีหลัง login ผิดตามจำนวนครั้งที่กำหนด
- ปิดการสร้าง Parse Class จาก client โดยตรง
- ป้องกันการแก้ไขข้อมูลผู้ใช้รายอื่น
- จำกัด `masterKey` ให้ใช้จาก localhost เป็นหลัก
- ปกป้องฟิลด์สำคัญด้วย `protectedFields`
- เพิ่ม HTTP security headers ด้วย Helmet
- จำกัด CORS ตาม `ALLOWED_ORIGINS`
- ยกเลิก session เมื่อเปลี่ยนรหัสผ่านหรือกักกันผู้ใช้
- ป้องกัน client เขียน Security Log, Alert และ Scan โดยตรง

## โครงสร้างระบบ

```text
Client หรือ VS Code
        |
        v
Parse Server :1337
        |
        v
MongoDB :27017
```

เมื่อใช้ Docker Compose ระบบจะมี 2 service หลัก:

- `app` เป็น Parse Server และ Dashboard
- `mongodb` เป็นฐานข้อมูล

## ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `server.js` | ตั้งค่า Express, Parse Server, Dashboard และ security |
| `cloud/main.js` | Cloud Functions และ Hooks ของระบบ Security |
| `docker-compose.yml` | เริ่ม MongoDB และ Parse Server พร้อมกัน |
| `Dockerfile` | สร้าง image ของ Parse Server |
| `.env.example` | ตัวอย่างค่าตั้งค่า |
| `.env` | ค่าจริงและ secret ของเครื่อง ห้าม commit |
| `api.http` | ตัวอย่าง REST requests สำหรับ VS Code |
| `tests/verify-all.js` | ชุดทดสอบระบบ 29 รายการ |
| `examples/demo-security.js` | ตัวอย่างการเรียกใช้ Cloud Functions |

## การทำงานแบบ Local (ไม่บังคับ)

โปรเจกต์ใช้ Docker เป็นวิธีหลัก แต่สามารถรัน Parse Server ด้วย Node.js ได้

ต้องการ Node.js 18 ขึ้นไป:

```powershell
npm install
```

หากต้องการให้ MongoDB ทำงานจาก Docker แต่ Parse Server รันบนเครื่อง:

```powershell
docker compose down
docker compose up -d mongodb
npm start
```

อย่าเริ่ม `npm start` พร้อมกับ container `app` เพราะทั้งคู่จะใช้ port `1337` ชนกัน

## การแก้ปัญหาที่พบบ่อย

### `RequestError` หรือ `TcpTestSucceeded: False`

แปลว่า VS Code ยังเชื่อมต่อ port `1337` ไม่ได้

1. ตรวจสอบว่า Docker ทำงานอยู่
2. รัน `docker compose ps`
3. รัน `docker compose logs --tail 100 app`
4. เปิด `http://localhost:1337/health`
5. ถ้า `app` ไม่ healthy ให้รัน `docker compose up -d` แล้วรอสักครู่

### Compose แจ้งว่าไม่พบ `.env`

รันคำสั่งนี้ก่อน:

```powershell
Copy-Item .env.example .env
```

จากนั้นกรอกค่าใน `.env` ให้ครบก่อนเริ่มระบบอีกครั้ง

### MongoDB authentication ไม่ผ่าน

ตรวจสอบว่า `MONGO_USERNAME`, `MONGO_PASSWORD` และ `MONGO_DB` ใน `.env` ตรงกับฐานข้อมูลที่เคยสร้างไว้

หากฐานข้อมูลเคยถูกสร้างด้วยรหัสผ่านเดิม การเปลี่ยนรหัสผ่านใน `.env` อาจไม่เปลี่ยนข้อมูลใน Docker volume หากต้องการเริ่มใหม่และลบข้อมูลได้ ให้ใช้:

```powershell
docker compose down -v
docker compose up
```

### Port 1337 ถูกใช้งาน

ตรวจสอบโปรแกรมที่ใช้ port นี้ก่อน หรือเปลี่ยน port ให้ตรงกันทั้งใน `.env` และ `docker-compose.yml`

## คำแนะนำสำหรับ Production

อย่าใช้ค่าตัวอย่างหรือ secret จาก GitHub ในระบบจริง

- สร้าง `masterKey` และ key อื่นแบบสุ่มและยาว
- เปลี่ยนรหัสผ่านของ MongoDB และ Dashboard
- เปิดใช้งานผ่าน HTTPS และตั้ง `PUBLIC_SERVER_URL` เป็น URL จริง
- จำกัด `ALLOWED_ORIGINS` เฉพาะเว็บไซต์ที่ใช้งานจริง
- จำกัด `masterKeyIps` ให้เหลือเฉพาะเครื่องที่ต้องใช้สิทธิ์ระดับสูง
- สำรองฐานข้อมูล MongoDB
- เก็บ `.env` ไว้ใน secret manager และไม่ commit ขึ้น Git
- หากเคยเผยแพร่ key หรือรหัสผ่านไปแล้ว ให้เปลี่ยนค่าเหล่านั้นทันที

## โครงสร้าง Branch

| Branch | ไฟล์ที่ตั้งใจให้มี | การใช้งาน |
|---|---|---|
| `main` | โปรเจกต์รวม MongoDB และ Parse Server | ใช้ติดตั้งและใช้งานจริง |
| `feat/app` | โค้ดแอป, package, tests และ Dockerfile | ใช้ดูเฉพาะส่วนแอป |
| `feat/db` | `.gitignore` และ MongoDB Compose | ใช้ดูเฉพาะส่วนฐานข้อมูล |

สำหรับการพัฒนา feature ใหม่ ให้เริ่มจาก `main` แล้วสร้าง branch ใหม่:

```powershell
git switch main
git switch -c feat/example
```

เมื่อพร้อมส่งงาน:

```powershell
git add .
git commit -m "Add example feature"
git push -u origin feat/example
```

## ปิดระบบ

หยุดแบบที่ยังเก็บข้อมูลไว้:

```powershell
docker compose down
```

หยุดและลบข้อมูลฐานข้อมูลทั้งหมด:

```powershell
docker compose down -v
```

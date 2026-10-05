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
- `DOT_NET_KEY`
- `MONGO_PASSWORD`
- `DASHBOARD_PASSWORD`

ไฟล์ `.env.example` มีตัวแปรอื่นที่ตั้งค่าได้ตามต้องการ เช่น `ALLOWED_ORIGINS`, `ACCOUNT_LOCKOUT_THRESHOLD`, `RATE_LIMIT_MAX`, `SCAN_ALLOWED_HOSTS`, `VERIFY_USER_EMAILS` และ `ALLOW_INSECURE_HTTP` ดูค่าเริ่มต้นและคำอธิบายได้ในไฟล์ตัวอย่าง

เซิร์ฟเวอร์จะพิมพ์คำเตือนตอนเริ่มทำงานถ้าพบว่าค่าใดยังเป็นค่าตัวอย่าง (`REPLACE_WITH`, `change_me_`, `security_pass`) หรือถ้าเปิด `ALLOW_INSECURE_HTTP=true` ในโหมด production

ค่า `MASTER_KEY`, `REST_API_KEY` และ `CLIENT_KEY` ไม่ควรใช้ค่า `REPLACE_WITH_...` หรือค่าตัวอย่างจาก GitHub เด็ดขัด ไฟล์ `.env` ถูกอยู่ใน `.gitignore` และต้องไม่ commit หรือส่งขึ้น GitHub

ค่า `MASTER_KEY_IPS` มีค่าเริ่มต้นสำหรับ localhost และ Docker host ของโปรเจกต์นี้ หาก Docker ใช้ network อื่น ให้ปรับค่านี้ใน `.env` ให้ตรงกับ gateway ที่ต้องการอนุญาต

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
===== สรุป: 52/52 ผ่าน =====
```

ชุดทดสอบครอบคลุม 5 ส่วน:

- การเข้าถึงพื้นฐาน health check, signup, login, session และ Dashboard
- การควบคุมสิทธิ์ ทั้งการปฏิเสธผู้ไม่มี role และการทำงานของ role `SecurityAnalyst`
- Cloud Functions ทั้ง port scan, alert, incident, quarantine และรายงานสรุป รวมถึงเคสที่ต้องถูกปฏิเสธ
- ช่องโหว่ที่เคยพบและปิดแล้ว เช่น การอ่าน SecurityLog/SecurityScan ด้วย REST key เปล่า ๆ และการแก้ฟิลด์ `accountLocked` เอง
- ความปลอดภัยของระบบ rate limit, allowlist ของ port scan และการไม่มีค่า placeholder ใน `.env`

รันตัวอย่างการใช้งานระบบ:

```powershell
docker compose exec app node examples/demo-security.js
```

ชุดทดสอบและตัวอย่างจะสร้างข้อมูลผู้ใช้, alert และ scan จำนวนมากในฐานข้อมูล ไม่ควรรันกับฐานข้อมูล production

## ใช้งานผ่าน VS Code REST Client

ติดตั้ง VS Code Extension ชื่อ **REST Client** จากนั้นคัดลอกไฟล์ตัวอย่างเป็นไฟล์ local:

```powershell
Copy-Item api.http.simple api.http
```

เปิด `api.http` ใน VS Code แล้วแก้เฉพาะค่าที่เป็น `REPLACE_WITH_...` ได้แก่ username, email และรหัสผ่าน ส่วน key ทั้งหมดดึงจาก `.env` ด้วย `{{$dotenv ...}}` จึงไม่ต้องกรอกเอง

จากนั้นกด **Send Request** ให้ request ไล่จากบนลงล่างตามลำดับ เพราะบาง request ใช้ผลลัพธ์จาก request ก่อนหน้า

ตรวจว่าเชื่อมต่อได้ก่อนใช้:

```http
GET http://localhost:1337/health
```

ถ้าเห็น `{"status":"ok"}` แสดงว่า VS Code เชื่อมต่อกับ server ได้แล้ว

ไฟล์ `api.http` ถูกเพิ่มใน `.gitignore` และไม่ควร commit ลง GitHub ส่วน `api.http.simple` เป็นไฟล์ template ที่ปลอดภัยสำหรับ repository และมีโครงสร้างเดียวกับ `api.http` ทุกหัวข้อ

### โครงสร้างของไฟล์

| หัวข้อ | รายการ | เนื้อหา |
|---|---|---|
| `1.1`–`1.5` | 10 | สมัคร ล็อกอิน แก้โปรไฟล์ เปลี่ยนรหัส ดู session และอ่านข้อมูลตัวเอง |
| `1.6` | 5 | กรณีที่ผู้ใช้ทั่วไปต้องถูกปฏิเสธ |
| `2.1`–`2.9` | 29 | role, port scan, alert, incident, quarantine, รายงาน, audit log, access control และปิด session |

request ที่มีคำว่า `[ต้อง fail]` เป็น security tests และควรได้รับการปฏิเสธตามที่ระบุ ไม่ใช่ข้อผิดพลาดของไฟล์ตัวอย่าง

ข้อควรรู้:

- ข้อ `1.3` เปลี่ยนรหัสผ่านแล้ว token เดิมจะถูก revoke ทันที ข้อ `1.4` เป็นต้นไปจึงใช้ token ใหม่จาก response
- `aggregate` รับเฉพาะ `GET` และต้อง URL-encode ค่า `pipeline` แล้ว
- ถ้ารันซ้ำต้องเปลี่ยน `username` ในข้อ `1.1` และ `2.5`
- สแกนพอร์ตได้เฉพาะ loopback เว้นแต่ตั้ง `SCAN_ALLOWED_HOSTS`

## ระบบทำอะไรได้บ้าง

### Cloud Functions

| ชื่อฟังก์ชัน | หน้าที่ |
|---|---|
| `runPortScan` | สแกนพอร์ตแบบ TCP connect |
| `assignSecurityAnalystRole` | เพิ่มผู้ใช้เข้า role `SecurityAnalyst` โดยใช้ `masterKey` เท่านั้น |
| `createSecurityAlert` | สร้าง Security Alert |
| `getSecurityReport` | สร้างสรุปสถานะความปลอดภัย |
| `quarantineUser` | ล็อกผู้ใช้และยกเลิก session |
| `unquarantineUser` | ปลดล็อกผู้ใช้ |
| `updateAlertStatus` | เปลี่ยนสถานะของ Alert |
| `createIncident` | สร้าง Incident จาก Alert (1 Alert มีได้ 1 Incident) |
| `assignIncident` | มอบหมาย Incident ให้ผู้รับผิดชอบ |
| `addIncidentNote` | เพิ่มบันทึกระหว่างตรวจสอบ Incident |
| `updateIncidentStatus` | เปลี่ยนสถานะ Incident (`open`, `investigating`, `contained`, `resolved`) |

ฟังก์ชันส่วนใหญ่ต้องใช้ `masterKey` หรือ session ของผู้ใช้ที่มี role `SecurityAnalyst`

> สแกนพอร์ตควรใช้กับเครื่องหรือระบบที่คุณได้รับอนุญาตเท่านั้น

### ความปลอดภัยที่ตั้งค่าไว้

- จำกัดจำนวน request เพื่อลด brute-force และ DoS
- ล็อกบัญชีหลัง login ผิดตามจำนวนครั้งที่กำหนด
- ปิดการสร้าง Parse Class จาก client โดยตรง
- ป้องกันการแก้ไขข้อมูลผู้ใช้รายอื่น
- จำกัด `masterKey` ให้ใช้จาก localhost หรือ IP ที่กำหนดไว้ใน `MASTER_KEY_IPS` เป็นหลัก
- ปกป้องฟิลด์สำคัญด้วย `protectedFields`
- เพิ่ม HTTP security headers ด้วย Helmet
- จำกัด CORS ตาม `ALLOWED_ORIGINS`
- ยกเลิก session เมื่อเปลี่ยนรหัสผ่านหรือกักกันผู้ใช้
- ป้องกัน client เขียน Security Log, Alert, Scan และ Incident โดยตรง
- อ่าน Security Log, Scan, Incident, Alert และรายงานสรุปได้เฉพาะ `masterKey` หรือ role `SecurityAnalyst` เท่านั้น
- ป้องกันผู้ใช้ตั้งหรือปลด `accountLocked` ด้วยตัวเอง รวมถึงซ่อนฟิลด์นี้จาก client ด้วย `protectedFields`
- จำกัดจุดที่สแกนพอร์ตได้ เป็น loopback เว้นแต่เพิ่มใน `SCAN_ALLOWED_HOSTS`
- จำกัดจำนวน note ต่อ incident และความยาวของแต่ละ note
- เตือนเมื่อ `.env` ยังมีค่าตัวอย่างอยู่ หรือเปิดค่าไม่ปลอดภัยใน production

> ค่า `SCAN_ALLOWED_HOSTS` เว้นว่างไว้ได้ ระบบจะอนุญาณเฉพาะ `localhost`, `127.0.0.1` และ `::1`
> ถ้าต้องสแกนเครื่องอื่นในเครือข่าย ให้เพิ่ม IP ลงใน `SCAN_ALLOWED_HOSTS` หรือตั้ง `SCAN_ALLOW_PRIVATE=true`

> ค่า `MASTER_KEY_IPS` ใน `.env` เว้นว่างไว้ได้ เพราะ `server.js` จะใช้ค่า default
> `127.0.0.1,::1,172.20.0.1` ให้อัตโนมัติ แต่ถ้าตั้งค่าเองต้องใส่เป็นรายการคั่นด้วย `,`

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
| `cloud/incidents.js` | Cloud Functions จัดการ Incident ต่อยอดจาก Security Alert |
| `cloud/access.js` | ตัวช่วยตรวจสิทธิ์ร่วมกัน (role `SecurityAnalyst`) |
| `docker-compose.yml` | เริ่ม MongoDB และ Parse Server พร้อมกัน |
| `Dockerfile` | สร้าง image ของ Parse Server |
| `.env.example` | ตัวอย่างค่าตั้งค่า |
| `.env` | ค่าจริงและ secret ของเครื่อง ห้าม commit |
| `api.http.simple` | ไฟล์ template REST requests 44 รายการ ที่ไม่มีค่า secret สำหรับคัดลอกไปใช้งาน |
| `api.http` | ไฟล์ local สำหรับ REST Client ชุดเดียวกับ template; ถูก ignore และห้าม commit |
| `tests/verify-all.js` | ชุดทดสอบระบบ 52 รายการ |
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

### `npm start` หรือ `npm test` ขึ้น `Cannot find module 'C:\Windows\...'`

เกิดเมื่อโฟลเดอร์โปรเจกต์อยู่บน network share เช่น `\\เซิร์ฟเวอร์\...` เพราะ `npm`
เรียกใช้ `CMD.EXE` ซึ่งไม่รองรับ UNC path แล้วเปลี่ยน working directory ไปที่ `C:\Windows`

แก้โดยเลือกวิธีใดวิธีหนึ่ง:

1. รันใน Docker ซึ่งเป็นวิธีหลักของโปรเจกต์ (แนะนำ)
   ```powershell
   docker compose exec app npm test
   ```
2. รัน `node` โดยตรงจาก PowerShell แทน `npm`
   ```powershell
   node server.js
   node tests\verify-all.js
   ```
3. ย้ายโปรเจกต์ไปไว้ในไดรฟ์ในเครื่อง เช่น `C:\projects\parse-server-security`

เมื่อรันนอก Docker การโหลด `parse-server` จาก network share ช้ามาก (มักนานกว่า 1 นาที)
หากชุดทดสอบรอ server ลูกไม่ทัน ให้เพิ่มเวลารอได้ด้วย `RATE_LIMIT_READY_TIMEOUT_MS`

## คำแนะนำสำหรับ Production

อย่าใช้ค่าตัวอย่างหรือ secret จาก GitHub ในระบบจริง

- สร้าง `masterKey` และ key อื่นแบบสุ่มและยาว
- เปลี่ยนรหัสผ่านของ MongoDB และ Dashboard
- เปิดใช้งานผ่าน HTTPS และตั้ง `PUBLIC_SERVER_URL` เป็น URL จริง
- จำกัด `ALLOWED_ORIGINS` เฉพาะเว็บไซต์ที่ใช้งานจริง
- จำกัด `masterKeyIps` ให้เหลือเฉพาะเครื่องที่ต้องใช้สิทธิ์ระดับสูง
- ตั้ง `VERIFY_USER_EMAILS=true` เมื่อตั้งค่า Mail adapter แล้ว เพื่อบังคับให้ยืนยันอีเมลก่อน login
- ตั้ง `ALLOW_INSECURE_HTTP=false` และเปิดผ่าน HTTPS เท่านั้น
- จำกัด `SCAN_ALLOWED_HOSTS` ให้เฉพาะเครื่องที่อนุญาตให้สแกนจริง
- สำรองฐานข้อมูล MongoDB
- เก็บ `.env` ไว้ใน secret manager และไม่ commit ขึ้น Git
- หากเคยเผยแพร่ key หรือรหัสผ่านไปแล้ว ให้เปลี่ยนค่าเหล่านั้นทันที

## โครงสร้าง Branch

| Branch | ไฟล์ที่ตั้งใจให้มี | การใช้งาน |
|---|---|---|
| `main` | โปรเจกต์รวม MongoDB และ Parse Server | ใช้ติดตั้งและใช้งานจริง |
| `feat/app` | โค้ดแอป, package, tests และ Dockerfile | ใช้ดูเฉพาะส่วนแอป |
| `feat/db` | `.gitignore` และ MongoDB Compose | ใช้ดูเฉพาะส่วนฐานข้อมูล |

โค้ด Incident Management ถูก merge เข้า `main` แล้ว ถ้ามี branch อื่นที่ยังไม่ได้รวม ให้ตรวจด้วย `git branch -a` ก่อนตัดสินใจว่าจะ merge หรือลบ

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

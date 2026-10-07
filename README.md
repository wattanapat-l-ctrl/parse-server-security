# Parse Server Security

ระบบ Backend สำหรับงานรักษาความปลอดภัยระบบ (Security) สร้างบน Parse Server และ MongoDB ทำงานผ่าน Docker Compose

## โปรแกรมนี้คืออะไร

Parse Server Security คือระบบที่ใช้เก็บและจัดการข้อมูลด้านความปลอดภัย เช่น Security Alert, ผลการสแกนพอร์ต, การกักกันผู้ใช้ที่น่าสงสัย และ Audit Log โดยมี API ให้เรียกใช้ผ่าน Cloud Functions และมีหน้า Dashboard สำหรับดูข้อมูล

## ฟีเจอร์หลัก

- **Security Alert** — สร้าง ดู และอัปเดตสถานะของแจ้งเตือนด้านความปลอดภัย
- **Port Scan** — สแกนพอร์ตแบบ TCP connect ผ่านฟังก์ชัน `runPortScan`
- **การกักกันผู้ใช้** — ล็อก (`quarantineUser`) และปลดล็อก (`unquarantineUser`) ผู้ใช้ที่ต้องสงสัย พร้อมยกเลิก session
- **Audit Log** — บันทึกประวัติการกระทำสำคัญในระบบ
- **บทบาท SecurityAnalyst** — กำหนดสิทธิ์ผ่าน role สำหรับนักวิเคราะห์ความปลอดภัย
- **สรุปรายงาน** — สร้างรายงานสถานะความปลอดภัยด้วย `getSecurityReport`

## เทคโนโลยีที่ใช้

- Node.js + Express
- Parse Server + Parse Dashboard
- MongoDB
- Docker / Docker Compose
- Frontend (Vite) ในโฟลเดอร์ `frontend`

## โครงสร้างโปรเจกต์

| ไฟล์/โฟลเดอร์ | หน้าที่ |
|---|---|
| `server.js` | ตั้งค่า Express, Parse Server, Dashboard และ security middleware |
| `cloud/main.js` | Cloud Functions และ Hooks ของระบบ Security |
| `cloud/incidents.js` | ฟังก์ชันจัดการเหตุการณ์ (Incident) |
| `frontend/` | เว็บ frontend (Vite) |
| `tests/verify-all.js` | ชุดทดสอบระบบ |
| `examples/demo-security.js` | ตัวอย่างการเรียกใช้ Cloud Functions |
| `docker-compose.yml` | รัน MongoDB และ Parse Server พร้อมกัน |

## เริ่มใช้งาน

ต้องมี Docker Desktop ติดตั้งไว้ก่อน จากนั้นรัน:

```powershell
Copy-Item .env.example .env   # แล้วแก้ค่าใน .env ให้ครบ
docker compose up -d
```

เปิดใช้งานได้ที่:

- API: http://localhost:1337/parse
- Dashboard: http://localhost:1337/dashboard
- Health check: http://localhost:1337/health

คำสั่งที่ใช้บ่อย:

```powershell
docker compose ps          # ดูสถานะ
docker compose logs -f app # ดู log
docker compose down        # หยุดระบบ
```

## หมายเหตุด้านความปลอดภัย

- ห้าม commit ไฟล์ `.env` หรือ key จริงขึ้น GitHub
- การสแกนพอร์ตควรใช้กับระบบที่ได้รับอนุญาตเท่านั้น
- สำหรับ production ควรเปลี่ยน secret ทั้งหมด, เปิด HTTPS และจำกัด `ALLOWED_ORIGINS`

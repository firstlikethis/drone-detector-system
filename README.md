# 🚀 วิธีรันระบบตรวจจับโดรน

ระบบตรวจจับโดรนประกอบด้วย 2 ส่วนหลักที่ต้องรันแยกกัน คือ Backend และ Frontend

## 1. รัน Backend (FastAPI + Simulator)

```bash
# คัดลอกไฟล์ environment
cp backend/.env.example backend/.env

# เข้าไปที่โฟลเดอร์ backend
cd backend

# ติดตั้ง dependencies ด้วย Poetry
poetry install

# รัน FastAPI server พร้อม Hot-reload
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

เมื่อรันสำเร็จจะเห็นข้อความประมาณนี้:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## 2. รัน Frontend (React)

เปิดอีก Terminal หนึ่ง:

```bash
# คัดลอกไฟล์ environment
cp frontend/.env.example frontend/.env

# เข้าไปที่โฟลเดอร์ frontend
cd frontend

# ติดตั้ง dependencies
pnpm install

# รัน Vite dev server
pnpm dev
```

เมื่อรันสำเร็จจะเห็นข้อความประมาณนี้:
```
  VITE v4.4.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://xxx.xxx.xxx.xxx:5173/
  ➜  press h to show help
```

## 3. เข้าใช้งานระบบ

เปิดเว็บบราวเซอร์ไปที่ http://localhost:5173/

## 4. ทดลองใช้งานฟีเจอร์ต่างๆ

- ดูตำแหน่งโดรนบนแผนที่
- ดูการแจ้งเตือน (Alerts)
- ดูรายการโดรนที่ตรวจจับได้
- ใช้ Control Panel เพื่อ:
  - ปรับจำนวนโดรน
  - เปลี่ยนตำแหน่งพื้นที่ชายแดน
  - เพิ่มโดรนทดสอบ
  - รีเซ็ตระบบ

## 5. ทดสอบระบบจำลอง

- คลิกที่โดรนบนแผนที่เพื่อดูรายละเอียด
- รอดูการแจ้งเตือนเมื่อโดรนเข้าพื้นที่หวงห้าม
- เปลี่ยนมุมมองหน้าจอโดยกดปุ่ม "Map Focus" หรือ "Data Focus"

## 6. ทดสอบ API โดยตรง

เข้าถึง Swagger UI ของ FastAPI ได้ที่ http://localhost:8000/docs
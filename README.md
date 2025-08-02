# 🛰️ ระบบตรวจจับโดรน (Drone Detection System)

ระบบตรวจจับโดรนแบบ Full Stack สำหรับการพัฒนาในสภาพแวดล้อมแบบ Local Development ที่ออกแบบให้รองรับการต่อยอดเพื่อใช้งานกับฮาร์ดแวร์จริงในอนาคต

## 📋 ภาพรวมระบบ

ระบบนี้ประกอบด้วย 4 ส่วนหลัก:

1. **Backend** - FastAPI, WebSocket, Real-time data streaming
2. **Frontend** - React, Leaflet maps, Real-time visualization
3. **Simulator** - จำลองข้อมูลโดรนสำหรับการพัฒนา
4. **Integration Layer** - เตรียมพร้อมเชื่อมต่อกับฮาร์ดแวร์จริง (SDR, RF Sensors)

## 🛠️ ติดตั้งและรัน

### Prerequisites

- Python 3.11+
- Node.js 18+
- Poetry (สำหรับ Python dependencies)
- npm/yarn/pnpm (สำหรับ JavaScript dependencies)

### Backend Setup

```bash
# ไปที่โฟลเดอร์ backend
cd backend

# ติดตั้ง dependencies ด้วย Poetry
poetry install

# สร้าง .env file (ดูตัวอย่างจาก .env.example)
cp .env.example .env

# รัน development server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# ไปที่โฟลเดอร์ frontend
cd frontend

# ติดตั้ง dependencies
npm install
# หรือ
yarn install
# หรือ
pnpm install

# สร้าง .env file สำหรับ API URL (ถ้าจำเป็น)
echo "VITE_API_URL=http://localhost:8000" > .env
echo "VITE_WS_URL=ws://localhost:8000/ws/drones" >> .env

# รัน development server
npm run dev
# หรือ
yarn dev
# หรือ
pnpm dev
```

## 🖥️ การใช้งานระบบ

เมื่อรันทั้ง Backend และ Frontend แล้ว:

1. เปิดเว็บบราวเซอร์ไปที่ `http://localhost:5173` (หรือพอร์ตที่ Vite กำหนด)
2. ระบบจะเชื่อมต่อกับ Backend โดยอัตโนมัติและเริ่มแสดงข้อมูลโดรนจำลอง
3. สามารถใช้ Control Panel เพื่อปรับแต่งการจำลองได้:
   - ปรับจำนวนโดรน
   - เปลี่ยนตำแหน่งพื้นที่ชายแดน
   - รีเซ็ตระบบ
   - เพิ่มโดรนทดสอบ

## 📐 โครงสร้างโปรเจกต์

### Backend Structure

```
backend/
├── app/
│   ├── api/           # API Routes & WebSocket handlers
│   ├── core/          # Core models and schemas
│   ├── services/      # Business logic
│   ├── simulator/     # Drone simulation
│   └── main.py        # Entry point
├── tests/             # Unit tests
└── pyproject.toml     # Dependencies
```

### Frontend Structure

```
frontend/
├── public/            # Static assets
├── src/
│   ├── api/           # API clients
│   ├── components/    # React components
│   ├── context/       # State management
│   ├── styles/        # CSS styles
│   └── App.jsx        # Main application
└── package.json       # Dependencies
```

## 🔄 Real-time Communication

ระบบใช้ WebSocket เพื่อส่งข้อมูลแบบ Real-time จาก Backend ไปยัง Frontend:

1. Backend สร้างและอัพเดตข้อมูลโดรนจำลอง
2. ข้อมูลถูกส่งผ่าน WebSocket ไปยัง Frontend
3. Frontend แสดงข้อมูลบนแผนที่และอัพเดตอินเตอร์เฟซทันที

## 🔍 การต่อยอดกับฮาร์ดแวร์จริง

ระบบถูกออกแบบให้รองรับการต่อยอดกับฮาร์ดแวร์จริงในอนาคต:

1. **SDR Integration**:
   - ติดตั้ง Dependencies: `poetry install -E hardware`
   - ดูตัวอย่างการใช้งาน pyrtlsdr ใน `/backend/app/integration/`

2. **Custom RF Sensors**:
   - เชื่อมต่อกับ Backend ผ่าน API
   - ดูตัวอย่างการรับข้อมูลใน `/backend/app/api/routes/system.py`

3. **Camera Integration**:
   - เพิ่มโมดูล Computer Vision
   - เชื่อมต่อกับระบบผ่าน API

## 🚀 คำแนะนำในการพัฒนาต่อ

1. **Authentication**:
   - เพิ่มระบบล็อกอินด้วย OAuth2 หรือ JWT
   - ดูตัวอย่างใน FastAPI documentation

2. **Persistent Storage**:
   - เพิ่มฐานข้อมูล (PostgreSQL, MongoDB)
   - บันทึกประวัติการตรวจจับและเหตุการณ์

3. **Hardware Integration**:
   - เพิ่มการรองรับอุปกรณ์ตรวจจับจริง
   - พัฒนา calibration tools

4. **Deployment**:
   - Containerize ด้วย Docker
   - ติดตั้งบน Edge devices

## 📝 License

[MIT License](LICENSE)
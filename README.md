# ระบบตรวจจับโดรนและการตอบโต้ (Drone Detection and Countermeasure System)

ระบบตรวจจับโดรนประกอบด้วย 2 ส่วนหลักที่ต้องรันแยกกัน คือ Backend และ Frontend

## รายการ Library ที่ต้องติดตั้ง

### Backend (Python)
- Python 3.11 หรือสูงกว่า
- Poetry สำหรับจัดการ dependencies
- รันคำสั่ง `poetry install` เพื่อติดตั้ง dependencies ทั้งหมด:
  - FastAPI - สำหรับ API และ WebSocket
  - Uvicorn - ASGI server
  - Pydantic - ใช้ validate ข้อมูล
  - WebSockets - สำหรับการสื่อสารแบบ real-time
  - python-dotenv - สำหรับจัดการ environment variables
  - faker - สำหรับสร้างข้อมูลจำลอง

### Frontend (JavaScript)
- Node.js v18 หรือสูงกว่า
- PNPM, NPM หรือ Yarn
- รันคำสั่ง `pnpm install` เพื่อติดตั้ง dependencies ทั้งหมด:
  - React 18 - UI framework
  - Leaflet.js และ React-Leaflet - สำหรับแผนที่และการแสดงผล
  - Tailwind CSS - CSS framework
  - Vite - Build tool

## 🔧 Stack ที่ใช้ในระบบ

### Backend
- **Python** + **FastAPI** - สร้าง API และ WebSocket endpoints
- **Uvicorn** - ASGI server สำหรับรัน FastAPI
- **Pydantic** - data validation และ serialization
- **Asyncio** - สำหรับจัดการ concurrent operations
- **WebSockets** - สำหรับการส่งข้อมูล real-time
- **Poetry** - จัดการ dependencies และ virtual environments

### Frontend
- **React 18** - JavaScript UI library
- **Vite** - Build tool และ dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet.js** - สำหรับแผนที่แบบ interactive
- **WebSocket API** - รับข้อมูล real-time จาก backend
- **Custom Hooks และ Context API** - สำหรับ state management

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

## ความสามารถของระบบ

ระบบตรวจจับโดรนและการตอบโต้นี้สามารถทำงานได้ดังนี้:

1. **การตรวจจับและติดตามโดรน**:
   - แสดงตำแหน่งโดรนบนแผนที่แบบ real-time
   - ติดตามการเคลื่อนที่ของโดรนด้วยเส้นทางการเดินทาง (drone trails)
   - จำแนกประเภทโดรน (commercial, military, DIY, unknown)
   - ประเมินระดับภัยคุกคาม (threat level) ของโดรน

2. **การแจ้งเตือนและการแสดงผล**:
   - สร้างการแจ้งเตือนเมื่อตรวจพบโดรนในพื้นที่หวงห้าม
   - แสดงข้อมูลโดรนแบบละเอียด (ความเร็ว, ความแรงสัญญาณ, ความสูง, ฯลฯ)
   - แสดงผลแบบ radar view เพื่อการตรวจจับและติดตามโดรนแบบใหม่
   - กรองและเรียงลำดับโดรนตามเกณฑ์ต่างๆ

3. **การตอบโต้โดรน**:
   - **การรบกวนสัญญาณ (RF Jamming)**:
     - รบกวนความถี่ควบคุมโดรน (2.4GHz, 5.8GHz)
     - รบกวนสัญญาณ GPS เพื่อป้องกันการนำทาง
     - ปรับระดับกำลังส่งและระยะเวลารบกวน
   
   - **การยึดอำนาจควบคุม (Drone Takeover)**:
     - ส่งคำสั่งบังคับให้โดรนลงจอด (forced landing)
     - สั่งให้โดรนกลับจุดเริ่มต้น (return to home)
     - ตรวจสอบช่องโหว่ที่สามารถใช้ในการยึดอำนาจควบคุม
   
   - **การตอบโต้ทางกายภาพ (Physical Countermeasures)**:
     - จำลองการใช้ปืนยิงตาข่าย (net gun)
     - ควบคุมโดรนจับกุม (capture drone)
     - ส่งโดรนสกัดกั้น (interceptor)

4. **การจำลองสถานการณ์**:
   - ปรับจำนวนโดรนในการจำลอง
   - กำหนดพื้นที่ชายแดนและพื้นที่หวงห้าม
   - ปรับความเร็วในการอัปเดตการจำลอง
   - เพิ่มโดรนทดสอบแบบสุ่ม

5. **การวิเคราะห์และการรายงาน**:
   - แสดงสถิติเกี่ยวกับโดรนที่ตรวจพบ
   - แสดงสถานะของมาตรการตอบโต้ที่ใช้งานอยู่
   - บันทึกและแสดงประวัติการแจ้งเตือน

## อุปกรณ์ Hardware ที่สามารถใช้ร่วมกับระบบ

ระบบได้รับการออกแบบให้รองรับการเชื่อมต่อกับอุปกรณ์ hardware ต่อไปนี้:

### 1. อุปกรณ์ตรวจจับสัญญาณ
- **RTL-SDR (Software-Defined Radio)** - อุปกรณ์รับสัญญาณวิทยุราคาประหยัด สามารถตรวจจับความถี่ที่โดรนใช้สื่อสาร (2.4GHz, 5.8GHz)
- **ADS-B Receivers** - รับสัญญาณการระบุตัวตนและตำแหน่งจากอากาศยาน
- **SpectrumHawk, Skywatch** - เครื่องมือตรวจจับ RF เฉพาะทาง
- **Directional Antennas** - เสาอากาศทิศทางสำหรับหาทิศทางของสัญญาณ
- **Airspy, HackRF** - SDR คุณภาพสูงสำหรับการวิเคราะห์สเปกตรัม

### 2. อุปกรณ์ตอบโต้
- **RF Jammers** - อุปกรณ์รบกวนสัญญาณวิทยุ
  - Directional Jammers (รบกวนเฉพาะทิศทาง)
  - Broadband Jammers (รบกวนหลายความถี่พร้อมกัน)
  - GPS Jammers (รบกวนสัญญาณ GPS)

- **อุปกรณ์ตอบโต้ทางกายภาพ**
  - Net Guns (ปืนยิงตาข่าย)
  - Capture Drones (โดรนที่ออกแบบมาเพื่อจับโดรนอื่น)
  - Net Launchers (เครื่องยิงตาข่ายติดตั้งกับพื้น)

### 3. อุปกรณ์ตรวจจับอื่นๆ
- **กล้อง IR และ Electro-Optical** - สำหรับการตรวจจับด้วยภาพ
- **Micro-Doppler Radar** - ตรวจจับการหมุนของใบพัดโดรน
- **Acoustic Array Microphones** - ตรวจจับโดรนจากเสียง

## 4. ทดลองใช้งานฟีเจอร์ต่างๆ

- ดูตำแหน่งโดรนบนแผนที่
- ดูการแจ้งเตือน (Alerts)
- ดูรายการโดรนที่ตรวจจับได้
- ใช้ Control Panel เพื่อ:
  - ปรับจำนวนโดรน
  - เปลี่ยนตำแหน่งพื้นที่ชายแดน
  - เพิ่มโดรนทดสอบ
  - รีเซ็ตระบบ
- ทดลองใช้ระบบตอบโต้:
  - รบกวนสัญญาณ (RF Jamming)
  - ยึดอำนาจควบคุม (Takeover)
  - ใช้มาตรการตอบโต้ทางกายภาพ (Physical Countermeasures)
- ดูการแสดงผลแบบ Radar
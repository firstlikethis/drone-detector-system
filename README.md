# 🚀 ระบบตรวจจับโดรนและการตอบโต้ (Drone Detection and Countermeasure System)

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

---

# 📡 เทคโนโลยีการตรวจจับโดรน (Drone Detection Technologies)

ระบบตรวจจับโดรนสามารถใช้เทคโนโลยีหลายรูปแบบเพื่อค้นหาและระบุตำแหน่งโดรนที่ไม่ได้รับอนุญาต:

## 1. การตรวจจับด้วยความถี่วิทยุ (RF Detection)

RF Detection เป็นเทคโนโลยีหลักที่ใช้ในการตรวจจับโดรน โดยการวิเคราะห์สัญญาณวิทยุที่โดรนใช้สื่อสารกับรีโมตคอนโทรล:

- **ความถี่ที่ตรวจจับได้**:
  - 2.4 GHz - ความถี่มาตรฐานสำหรับการควบคุมโดรนทั่วไป
  - 5.8 GHz - ใช้สำหรับการส่งวิดีโอ FPV (First Person View)
  - 433/915 MHz - ใช้สำหรับการควบคุมระยะไกล (telemetry)
  - 1.2 GHz - ใช้สำหรับการส่งวิดีโอคุณภาพสูง
  - GNSS/GPS (1.1-1.6 GHz) - สัญญาณที่โดรนใช้ระบุตำแหน่ง

- **อุปกรณ์ที่ใช้**:
  - RTL-SDR (Software-Defined Radio) - อุปกรณ์ราคาประหยัดสำหรับการตรวจจับความถี่
  - SpectrumHawk, Skywatch - เครื่องมือตรวจจับ RF เฉพาะทาง
  - Directional Antennas - เสาอากาศทิศทางสำหรับหาทิศทางของสัญญาณ
  - Airspy, HackRF - SDR คุณภาพสูงสำหรับการวิเคราะห์สเปกตรัม

- **เทคนิคที่ใช้**:
  - Protocol Analysis - วิเคราะห์โปรโตคอลการสื่อสารของโดรน
  - Signal Fingerprinting - ระบุประเภทโดรนจากลายนิ้วมือของสัญญาณ
  - Direction Finding - ระบุทิศทางของสัญญาณโดยใช้หลายเสาอากาศ
  - Triangulation - หาพิกัดแน่นอนโดยใช้สถานีรับหลายแห่ง

## 2. ระบบเรดาร์ (Radar)

- **Micro-Doppler Radar** - สามารถตรวจจับการหมุนของใบพัดโดรน
- **Millimeter-Wave Radar** - ให้ความละเอียดสูงสำหรับวัตถุขนาดเล็ก
- **Phased Array Radar** - สามารถสแกนพื้นที่กว้างได้อย่างรวดเร็ว
- **FMCW Radar** - เรดาร์คลื่นต่อเนื่องความถี่เปลี่ยนแปลง เหมาะสำหรับระบุระยะทางที่แม่นยำ

## 3. การตรวจจับด้วยภาพ (Optical Detection)

- **กล้อง IR (Infrared)** - ตรวจจับความร้อนจากมอเตอร์และแบตเตอรี่โดรน
- **กล้อง Electro-Optical** - กล้องความละเอียดสูงสำหรับการตรวจจับในระยะไกล
- **Computer Vision และ AI** - ใช้อัลกอริทึม Machine Learning เพื่อระบุโดรนจากภาพวิดีโอ
- **ระบบติดตามอัตโนมัติ** - PTZ (Pan-Tilt-Zoom) cameras สำหรับติดตามโดรนอัตโนมัติ

## 4. การตรวจจับด้วยเสียง (Acoustic Detection)

- **Acoustic Array Microphones** - ชุดไมโครโฟนที่สามารถระบุทิศทางของเสียง
- **Sound Signature Analysis** - วิเคราะห์ลายเซ็นเสียงเพื่อแยกแยะโดรนจากเสียงรบกวนอื่นๆ
- **Neural Network Classification** - ใช้ deep learning เพื่อจำแนกประเภทโดรนจากเสียง

## 5. ADS-B และการรับสัญญาณการระบุตัวตน

- **ADS-B Receivers** - รับสัญญาณจากโดรนที่ส่งข้อมูลการระบุตัวตนและตำแหน่ง
- **Remote ID** - มาตรฐานใหม่ที่กำหนดให้โดรนส่งข้อมูลระบุตัวตนและตำแหน่งเพื่อการติดตาม

## 6. ระบบผสมผสาน (Multi-Sensor Fusion)

- **Sensor Fusion** - ผสมผสานข้อมูลจากหลายเซ็นเซอร์เพื่อความแม่นยำสูงสุด
- **Distributed Sensor Networks** - เครือข่ายเซ็นเซอร์ที่กระจายอยู่ทั่วพื้นที่
- **CUAS Management Systems** - ระบบจัดการข้อมูลจากหลายแหล่งแบบบูรณาการ

---

# 🛡️ เทคโนโลยีการตอบโต้โดรน (Drone Countermeasure Technologies)

เมื่อตรวจพบโดรนที่ไม่ได้รับอนุญาต สามารถใช้เทคโนโลยีต่อไปนี้ในการตอบโต้:

## 1. การรบกวนสัญญาณ (RF Jamming)

### วิธีการทำงาน
RF Jamming ใช้การส่งสัญญาณรบกวนที่มีกำลังส่งสูงบนความถี่เดียวกับที่โดรนใช้สื่อสาร ทำให้:
- ตัดการเชื่อมต่อระหว่างโดรนกับรีโมตคอนโทรล
- รบกวนสัญญาณ GPS/GNSS ที่โดรนใช้นำทาง
- บังคับให้โดรนเข้าสู่โหมดฉุกเฉิน (เช่น return-to-home, hovering, หรือลงจอด)

### ความถี่ที่ใช้ในการ Jamming
- 2.4 GHz - ตัดการควบคุม
- 5.8 GHz - ตัดการส่งวิดีโอ
- 1.5 GHz - รบกวน GPS
- 433/915 MHz - ตัดสัญญาณ telemetry

### ประเภทของ Jammers
- **Directional Jammers**: ส่งสัญญาณรบกวนเฉพาะทิศทาง ลดผลกระทบต่อระบบอื่น
- **Broadband Jammers**: รบกวนหลายความถี่พร้อมกัน
- **Selective Jammers**: รบกวนเฉพาะโปรโตคอลหรือความถี่ที่เลือก
- **Portable/Handheld Jammers**: อุปกรณ์พกพา
- **Fixed Installation**: ติดตั้งถาวรเพื่อปกป้องพื้นที่เฉพาะ

## 2. การยึดอำนาจควบคุม (Drone Takeover)

- **Protocol Exploitation**: ใช้ช่องโหว่ในโปรโตคอลการสื่อสารเพื่อยึดอำนาจควบคุม
- **MAVLink Hijacking**: แทรกแซงคำสั่ง MAVLink ที่ใช้ในโดรนหลายประเภท
- **Forced Landing Commands**: ส่งคำสั่งบังคับให้โดรนลงจอด
- **GPS Spoofing**: ปลอมแปลงสัญญาณ GPS เพื่อควบคุมเส้นทางบิน

## 3. การดักจับทางกายภาพ (Physical Capture)

- **Drone Nets**: ตาข่ายที่ยิงไปที่โดรนเพื่อดักจับ
- **Net Guns**: ปืนยิงตาข่ายสำหรับจับโดรนในระยะใกล้
- **Capture Drones**: โดรนที่ออกแบบมาเพื่อจับโดรนอื่น
- **Trained Birds of Prey**: นกล่าเหยื่อที่ฝึกมาให้จับโดรน (ใช้ในบางประเทศ)

## 4. การใช้พลังงานสูง (Directed Energy)

- **High-Power Microwave (HPM)**: คลื่นไมโครเวฟพลังงานสูงที่ทำลายวงจรอิเล็กทรอนิกส์
- **Laser Systems**: ระบบเลเซอร์ที่ทำให้โดรนเสียหายหรือชงักงัน
- **Electromagnetic Pulse (EMP)**: สร้างพัลส์แม่เหล็กไฟฟ้าที่ทำลายวงจร (ใช้ในทางทหาร)

## 5. การกำบังและการอำพราง (Shielding & Camouflage)

- **RF Shielding**: ป้องกันพื้นที่จากการถูกค้นพบด้วยสัญญาณวิทยุ
- **Anti-drone Netting**: ตาข่ายป้องกันโดรนบินเข้าพื้นที่
- **Infrared Countermeasures**: ป้องกันการตรวจจับด้วยกล้อง IR
- **Visual Camouflage**: อำพรางพื้นที่จากการตรวจจับด้วยภาพ

---

# 🔧 การต่อยอดระบบตรวจจับโดรน

## การเชื่อมต่อกับ Hardware จริง

### 1. RTL-SDR Integration
```python
# ตัวอย่างโค้ดเชื่อมต่อกับ RTL-SDR
from rtlsdr import RtlSdr

def setup_rtlsdr(device_index=0, sample_rate=2.4e6, center_freq=1090e6):
    sdr = RtlSdr(device_index)
    sdr.sample_rate = sample_rate  # Hz
    sdr.center_freq = center_freq  # Hz (1090 MHz for ADS-B)
    sdr.gain = 'auto'
    return sdr

def scan_frequencies(sdr, frequencies, samples=1024*1024):
    signal_strengths = {}
    for freq in frequencies:
        sdr.center_freq = freq
        samples = sdr.read_samples(samples)
        power = calculate_signal_power(samples)
        signal_strengths[freq] = power
    return signal_strengths
```

### 2. ระบบเรดาร์ Micro-Doppler
```python
# ตัวอย่างการประมวลผลสัญญาณเรดาร์เพื่อหาลายนิ้วมือใบพัดโดรน
def process_radar_signal(signal_data):
    # FFT สำหรับวิเคราะห์ความถี่
    fft_data = np.fft.fft(signal_data)
    # วิเคราะห์ micro-doppler signature
    # สำหรับตรวจจับการหมุนของใบพัดโดรน
    signatures = extract_doppler_features(fft_data)
    # เปรียบเทียบกับฐานข้อมูลโดรน
    drone_type = match_drone_signature(signatures)
    return drone_type
```

### 3. การวิเคราะห์สัญญาณวิทยุ
```python
# ตัวอย่างการวิเคราะห์สัญญาณวิทยุเพื่อตรวจจับโปรโตคอลควบคุมโดรน
def analyze_rf_protocol(signal):
    # Demodulate สัญญาณ
    demodulated = demodulate_signal(signal)
    # ตรวจสอบรูปแบบสัญญาณควบคุมยี่ห้อต่างๆ
    if matches_dji_protocol(demodulated):
        return "DJI"
    elif matches_futaba_protocol(demodulated):
        return "Futaba/SBUS"
    elif matches_spektrum_protocol(demodulated):
        return "Spektrum DSM2/DSMX"
    # ฯลฯ
    return "Unknown"
```

## ระบบตอบโต้โดรน (Countermeasure Modules)

### 1. RF Jammer Implementation
```python
# ตัวอย่างโมดูลควบคุมเครื่องรบกวนสัญญาณ
class DroneJammer:
    def __init__(self, jammer_device):
        self.jammer = jammer_device
        self.active = False
        self.current_frequency = None
        self.power_level = 0
    
    def activate_jamming(self, frequency, power_level=50, duration=None):
        """
        เปิดใช้งานการรบกวนสัญญาณ
        :param frequency: ความถี่ที่ต้องการรบกวน (Hz)
        :param power_level: ระดับพลังงาน (%)
        :param duration: ระยะเวลาการรบกวน (วินาที) หรือ None สำหรับรบกวนต่อเนื่อง
        """
        self.jammer.set_frequency(frequency)
        self.jammer.set_power(power_level)
        self.jammer.enable()
        self.active = True
        self.current_frequency = frequency
        self.power_level = power_level
        
        if duration:
            # ตั้งเวลาปิดการรบกวน
            threading.Timer(duration, self.deactivate_jamming).start()
    
    def deactivate_jamming(self):
        """ปิดการรบกวนสัญญาณ"""
        self.jammer.disable()
        self.active = False
    
    def jam_drone_control(self, drone_type):
        """รบกวนสัญญาณควบคุมโดรนตามประเภท"""
        if drone_type == "DJI":
            # รบกวนความถี่ที่ DJI ใช้
            self.activate_jamming(2.4e9, 60)  # 2.4 GHz
        elif drone_type == "Parrot":
            # รบกวนความถี่ที่ Parrot ใช้
            self.activate_jamming(2.4e9, 60)  # 2.4 GHz
        # ฯลฯ
    
    def jam_gps(self):
        """รบกวนสัญญาณ GPS"""
        self.activate_jamming(1.57542e9, 70)  # L1 GPS frequency
```

### 2. ระบบตอบโต้แบบอัตโนมัติ
```python
# ตัวอย่างระบบตอบโต้อัตโนมัติเมื่อตรวจพบโดรน
class AutoCountermeasure:
    def __init__(self, detection_system, jammer, notification_system):
        self.detection = detection_system
        self.jammer = jammer
        self.notification = notification_system
        self.active = False
        self.threat_levels = {
            "none": 0,
            "low": 1,
            "medium": 2,
            "high": 3,
            "critical": 4
        }
        self.min_threat_for_action = "medium"  # ระดับภัยคุกคามขั้นต่ำที่จะตอบโต้
    
    def start_monitoring(self):
        """เริ่มการเฝ้าระวัง"""
        self.active = True
        while self.active:
            # ตรวจสอบโดรนที่พบ
            detected_drones = self.detection.get_active_drones()
            for drone in detected_drones:
                # ตรวจสอบระดับภัยคุกคาม
                if self.threat_levels[drone.threat_level] >= self.threat_levels[self.min_threat_for_action]:
                    # ดำเนินการตอบโต้
                    self.counter_drone(drone)
            time.sleep(1)
    
    def counter_drone(self, drone):
        """ตอบโต้โดรนที่พบ"""
        # แจ้งเตือนเจ้าหน้าที่
        self.notification.send_alert(f"Countering threat: {drone.id}, Type: {drone.type}")
        
        # เลือกวิธีตอบโต้ตามระดับภัยคุกคาม
        if drone.threat_level == "critical":
            # ใช้การรบกวนแบบเต็มรูปแบบ
            self.jammer.jam_drone_control(drone.type)
            self.jammer.jam_gps()
        elif drone.threat_level == "high":
            # รบกวนเฉพาะการควบคุม
            self.jammer.jam_drone_control(drone.type)
        elif drone.threat_level == "medium":
            # รบกวนเป็นช่วงๆ เพื่อให้โดรนแสดงพฤติกรรมผิดปกติ
            self.jammer.activate_jamming(2.4e9, 50, 5)  # รบกวน 5 วินาที
```

### 3. API Endpoints สำหรับควบคุมระบบตอบโต้
```python
# ตัวอย่าง FastAPI endpoints สำหรับควบคุมระบบตอบโต้โดรน
from fastapi import APIRouter, HTTPException, status, Body

router = APIRouter()

@router.post("/countermeasures/jam", response_model=Dict[str, Any])
async def activate_jamming(
    drone_id: str,
    frequency: float = Body(None, description="ความถี่ที่ต้องการรบกวน (Hz)"),
    duration: int = Body(30, description="ระยะเวลาการรบกวน (วินาที)"),
    power_level: int = Body(50, ge=1, le=100, description="ระดับพลังงานการรบกวน (%)")
):
    """
    เปิดใช้งานการรบกวนสัญญาณสำหรับโดรนที่ระบุ
    """
    # ตรวจสอบว่ามีโดรนตาม ID ที่ระบุหรือไม่
    if drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {drone_id} not found"
        )
    
    drone = drone_simulator.drones[drone_id]
    
    # ในระบบจริงจะเชื่อมต่อกับ jammer hardware
    # countermeasure_system.activate_jamming(drone, frequency, duration, power_level)
    
    # จำลองการรบกวนสัญญาณโดยลดความแรงของสัญญาณโดรน
    drone.signal_strength -= min(drone.signal_strength, power_level / 2)
    
    return {
        "status": "success",
        "message": f"Jamming activated for drone {drone_id}",
        "details": {
            "frequency": frequency or "auto",
            "duration": duration,
            "power_level": power_level,
            "drone_affected": drone.to_dict()
        }
    }

@router.post("/countermeasures/force_land", response_model=Dict[str, Any])
async def force_drone_landing(drone_id: str):
    """
    ส่งคำสั่งบังคับให้โดรนลงจอด (ต้องการการเชื่อมต่อกับ hardware จริง)
    """
    # ตรวจสอบว่ามีโดรนตาม ID ที่ระบุหรือไม่
    if drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {drone_id} not found"
        )
    
    drone = drone_simulator.drones[drone_id]
    
    # ในระบบจริงจะส่งคำสั่งบังคับลงจอด
    # countermeasure_system.force_landing(drone)
    
    # จำลองการบังคับลงจอดโดยลบโดรนออกจากระบบ
    del drone_simulator.drones[drone_id]
    
    # สร้าง alert เพื่อแจ้งว่าโดรนถูกบังคับลงจอด
    alert = Alert(
        drone_id=drone_id,
        alert_type=AlertType.UNAUTHORIZED_FLIGHT,
        location=drone.location,
        description=f"Drone {drone_id} was forced to land",
        threat_level=drone.threat_level
    )
    drone_simulator.alerts.append(alert)
    
    return {
        "status": "success",
        "message": f"Force landing command sent to drone {drone_id}",
        "details": {
            "drone": drone.to_dict(),
            "timestamp": datetime.now().isoformat()
        }
    }
```

---

# 📋 แผนการพัฒนาต่อยอด

## Phase 1: เพิ่มความสามารถในการตรวจจับจริง
- เชื่อมต่อกับ RTL-SDR เพื่อรับสัญญาณวิทยุจริง
- เพิ่มการวิเคราะห์สัญญาณ RF เพื่อตรวจจับโดรน
- เพิ่มการรองรับ ADS-B เพื่อติดตามอากาศยาน
- สร้างฐานข้อมูลลายนิ้วมือสัญญาณของโดรนยี่ห้อต่างๆ

## Phase 2: เพิ่มระบบตอบโต้
- เพิ่ม API endpoints สำหรับควบคุมอุปกรณ์ตอบโต้
- พัฒนาโมดูลควบคุม RF Jammer
- เพิ่มการรองรับอุปกรณ์ยิงตาข่าย
- สร้างระบบตัดสินใจอัตโนมัติสำหรับการตอบโต้

## Phase 3: ระบบเครือข่ายและการขยายขอบเขต
- พัฒนาระบบเครือข่ายเซ็นเซอร์แบบกระจาย
- เพิ่มความสามารถในการหาตำแหน่งแบบสามเหลี่ยม
- เพิ่มการรองรับกล้องและระบบตรวจจับด้วยภาพ
- พัฒนา API สำหรับการบูรณาการกับระบบอื่น

## Phase 4: UI และการวิเคราะห์ขั้นสูง
- เพิ่มการแสดงผล 3D ของพื้นที่ตรวจจับ
- พัฒนาการวิเคราะห์พฤติกรรมโดรนด้วย AI
- เพิ่มการรายงานและการแจ้งเตือนขั้นสูง
- สร้างแดชบอร์ดสำหรับการวิเคราะห์เชิงลึก
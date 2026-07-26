# REAL2FREE v1

เว็บหนังและซีรีส์แบบ responsive สร้างด้วย Next.js + TypeScript พร้อมหน้าเว็บไซต์ โหมดมืด/สว่าง ระบบหลังบ้าน คลังหนัง และ Movie2FreeHD Extractor ที่เชื่อมกับ Supabase

## ส่วนที่พร้อมใช้งาน

### หน้าเว็บไซต์

- หน้า desktop มี sidebar, top navigation, hero และตัวกรองด้านขวา
- หน้า mobile มีเมนูด้านบน หมวดหมู่แบบเลื่อน และ bottom navigation
- โหมดมืด / โหมดสว่าง พร้อมจำค่าที่ผู้ใช้เลือก
- ใช้ Prompt สำหรับภาษาไทย และ Bebas Neue สำหรับหัวเรื่อง
- Hero carousel, ค้นหา, กรองประเภท ปี และคุณภาพ
- การ์ดหนัง responsive, badge คุณภาพ, อันดับยอดนิยม และ modal รายละเอียด

### ระบบหลังบ้าน

- เข้าสู่ระบบด้วย Supabase Auth
- ตรวจสิทธิ์จาก `public.profiles` เฉพาะ role `admin` หรือ `owner`
- รองรับวันหมดอายุและการเพิกถอนสิทธิ์ Admin
- Dashboard แสดงจำนวนหนัง, Player, งาน Extractor และสถานะระบบ
- แสดงประวัติงาน Movie2FreeHD ล่าสุด
- ป้องกันหน้าและ API ด้วย Admin Guard + JWT + Row Level Security

เส้นทางสำคัญ:

```text
/admin                                  ระบบหลังบ้าน
/admin/login                            เข้าสู่ระบบผู้ดูแล
/admin/content                          คลังหนังและ Player
/admin/extractors/movie2freehd          Movie2FreeHD Extractor
```

### คลังหนังหลังบ้าน

- อ่านข้อมูลจริงจาก `content_titles` และ `players`
- ค้นหาชื่อไทย ชื่ออังกฤษ ชื่อเดิม และ IMDb ID
- กรองตามแหล่งข้อมูลและสถานะ
- แบ่งหน้าครั้งละ 36 รายการ รองรับฐานข้อมูลขนาดใหญ่
- แสดงจำนวน Player พร้อมใช้ต่อเรื่อง
- เปิด Modal ดูเรื่องย่อ Metadata และ Player ทั้งหมด
- ทดสอบลิงก์ Player ในแท็บใหม่แบบไม่ส่ง referrer
- เปลี่ยนสถานะหนังเป็น แสดงผล / ซ่อน / มีปัญหา / ฉบับร่าง
- เปลี่ยนสถานะ Player เป็น พร้อมใช้ / ยังไม่ตรวจ / เสีย / หมดอายุ
- Responsive 6 การ์ดบนจอใหญ่ และ 3 การ์ดบนมือถือ

### Movie2FreeHD Extractor

Workflow:

```text
URL ต้นทาง
→ ตรวจจำนวนหน้า
→ ดึงรายการแบบแบ่ง Batch
→ แสดงการ์ดปก
→ เปิดหน้ารายละเอียด
→ เรียก DooPlay AJAX
→ Resolve MeePlayer
→ ตรวจ HLS แบบ No-Referer ก่อน
→ Referer fallback เมื่อจำเป็น
→ จับคู่ TMDB
→ ตรวจใน Modal
→ บันทึก Content + Player + Job history ลง Supabase
```

ความสามารถหลัก:

- รองรับ URL รายการ หมวดหมู่ และหน้าหนังเดี่ยว
- เลือกช่วงหน้าได้สูงสุดตาม pagination ของต้นทาง
- แบ่ง Discover ครั้งละ 6 หน้า และ Extract ครั้งละ 3 เรื่อง
- จำกัด concurrency เพื่อลด timeout และภาระ Vercel
- หยุดงานได้ โดยรายการที่เสร็จแล้วยังคงอยู่
- จำสถานะงานใน browser เพื่อกลับมาทำต่อได้
- แสดง 7 การ์ดต่อแถวบนจอใหญ่ และ 3 การ์ดต่อแถวบนมือถือ
- ค้นหา กรอง เลือกทั้งหมด ไม่เลือกทั้งหมด และตัดรายการไม่มีลิงก์
- แสดง Player หลายภาษา/หลาย Server
- เล่น HLS ใน Modal ด้วย HLS.js และ Native HLS บน Safari/iOS
- ทดสอบ No-Referer ก่อน fallback
- จับคู่กับ `tmdb_catalog` และให้เลือกผลลัพธ์เอง
- บันทึกเรื่องใหม่โดยไม่ผูก TMDB ได้
- ป้องกันข้อมูลซ้ำด้วย unique `(source, source_url)`
- อัปเดต Player เดิมหรือเพิ่ม Player ใหม่โดยดู URL และ hash
- เก็บ source snapshot, match snapshot และผล validation ไว้ใน metadata

## Supabase

โปรเจกต์เชื่อมกับ Supabase ref:

```text
xzlfrpamifzpexfajdlg
```

ตารางหลักที่ใช้:

```text
profiles
content_titles
players
extractor_jobs
extractor_job_items
tmdb_catalog
admin_movie_links
```

Migration ที่ติดตั้งเพิ่ม:

- เพิ่ม source `movie2freehd` ใน constraint ที่เกี่ยวข้อง
- เพิ่ม index สำหรับ Content, Player และ Job ของ Movie2FreeHD
- เพิ่ม Admin-only RLS policies
- เพิ่ม RPC สำหรับสร้าง/ปิดงาน, TMDB match, บันทึกข้อมูล และ Dashboard stats

ฟังก์ชันหลัก:

```text
real2free_is_admin
real2free_admin_stats
real2free_create_movie2freehd_job
real2free_update_extractor_job
real2free_match_tmdb
real2free_save_movie2freehd
```

## Environment variables

คัดลอก `.env.example` เป็น `.env.local`:

```bash
cp .env.example .env.local
```

กำหนดค่า:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xzlfrpamifzpexfajdlg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

ใช้เฉพาะ Publishable Key ฝั่ง browser ห้ามนำ `service_role` หรือ Secret Key ใส่ใน source code

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

เปิด:

```text
http://localhost:3000
http://localhost:3000/admin/login
```

## Production build

```bash
npm run build
npm start
```

## โครงสร้างสำคัญ

```text
app/
  admin/
    admin.css
    content.css
    layout.tsx
    login/page.tsx
    page.tsx
    content/page.tsx
    extractors/movie2freehd/page.tsx
  api/admin/
    stats/route.ts
    content/route.ts
    movie2freehd/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  admin/
    AdminGuard.tsx
    AdminDashboard.tsx
    AdminContentManager.tsx
    Movie2FreeHDExtractor.tsx
  MovieHome.tsx
lib/
  admin-auth.ts
  catalog.ts
  supabase/
    browser.ts
    config.ts
    request.ts
```

## Auto Deploy

Vercel Git Auto Deploy ถูกปิดไว้ใน `vercel.json` การ push ขึ้น GitHub จะไม่สร้าง deployment อัตโนมัติ ต้องสั่ง deploy เองเมื่อตรวจงานเรียบร้อย

## หมายเหตุ

- หน้าเว็บไซต์เดิมยังใช้ demo catalog เพื่อแยกการพัฒนา UI ออกจากข้อมูลจริง
- ข้อมูลที่บันทึกจาก Extractor จะอยู่ใน `content_titles` และ `players`
- การดึงข้อมูลควรใช้กับต้นทางที่คุณมีสิทธิ์เข้าถึงและใช้งานเท่านั้น
- โปรเจกต์ไม่ใช้ชื่อ โลโก้ หรือฟอนต์ proprietary ของแพลตฟอร์มอื่น

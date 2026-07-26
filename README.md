# REAL2FREE v1

เว็บหน้ารวมหนังและซีรีส์แบบ responsive สร้างด้วย Next.js + TypeScript โดยออกแบบจากแนวทาง streaming dashboard สำหรับจอคอมพิวเตอร์ แท็บเล็ต และมือถือ

## ฟีเจอร์ที่มีแล้ว

- หน้าแรกแบบ desktop มี sidebar, top navigation, hero และแผงตัวกรองด้านขวา
- หน้า mobile มีเมนูด้านบน, horizontal category tabs และ bottom navigation
- โหมดมืด / โหมดสว่าง พร้อมจำค่าที่ผู้ใช้เลือก
- ฟอนต์หัวเรื่องทรง condensed ให้บรรยากาศแบบ streaming platform โดยใช้ Bebas Neue ซึ่งเป็นทางเลือกแบบเปิด
- hero carousel เปลี่ยนอัตโนมัติและเลือกสไลด์ได้
- ค้นหาจากชื่อไทย ชื่ออังกฤษ และประเภท
- กรองตามประเภท ปี และคุณภาพ
- การ์ดหนัง responsive, อันดับยอดนิยม, badge คุณภาพ และรายการโปรด
- modal รายละเอียดหนัง
- รองรับ reduced motion และ keyboard focus

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## Production build

```bash
npm run build
npm start
```

## โครงสร้างสำคัญ

```text
app/
  globals.css       ระบบสี responsive layout และองค์ประกอบทั้งหมด
  layout.tsx        metadata และฟอนต์
  page.tsx          หน้าแรก
components/
  MovieHome.tsx     UI และ interaction ของหน้าแรก
lib/
  catalog.ts        type และข้อมูลตัวอย่าง
```

## การเชื่อมข้อมูลจริง

ข้อมูลใน `lib/catalog.ts` เป็น demo data เพื่อให้ตรวจหน้าตาและ flow ได้ก่อน ขั้นต่อไปควรเปลี่ยนเป็น service layer สำหรับ Supabase หรือ API ของ REAL2FREE โดยคง `MovieItem` และ `HeroSlide` เป็น interface กลาง เพื่อลดการแก้ UI ภายหลัง

ฟิลด์ขั้นต่ำที่หน้าเว็บใช้:

```ts
{
  id: string;
  title: string;
  thaiTitle: string;
  year: number;
  rating: number;
  quality: "4K" | "Full HD" | "HD";
  genres: string[];
  posterUrl?: string;
  backdropUrl?: string;
}
```

## หมายเหตุด้านดีไซน์

โปรเจกต์ไม่ได้คัดลอกชื่อแบรนด์ โลโก้ ภาพโปสเตอร์ หรือฟอนต์ proprietary จากแพลตฟอร์มอื่น ตัวอย่างภาพถูกสร้างด้วย CSS gradient เพื่อใช้ตรวจ layout ก่อนเชื่อมภาพจริงจากฐานข้อมูล

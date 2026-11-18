#!/usr/bin/env python3
"""
สร้างไอคอนแอปทุกขนาดจากไฟล์โลโก้ต้นฉบับ (รูปสี่เหลี่ยมจัตุรัส)
    python3 savings-app/tools/build_icons.py [path/to/logo.jpg]
ค่าเริ่มต้นใช้ savings-app/assets/logo-source.jpg
ผลลัพธ์: pwa/icons/*.png, assets/logo-128.png และอัปเดตโลโก้ในหน้าเข้าสู่ระบบ/แถบหัวของ apps-script/App.html
จากนั้นรัน tools/build_demo.py เพื่ออัปเดตไฟล์ทดลองใช้
"""
import base64
import os
import re
import sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(APP, 'assets', 'logo-source.jpg')
ICONS = os.path.join(APP, 'pwa', 'icons')
BG = (10, 63, 51)        # --brand-ink ใช้เติมพื้นหลังไอคอนที่ห้ามโปร่งใส
RADIUS = 0.21            # มุมโค้งของกรอบโลโก้ (สัดส่วนของความกว้าง)

src = Image.open(SRC).convert('RGB')
N = min(src.size)
src = src.crop(((src.width - N) // 2, (src.height - N) // 2, (src.width + N) // 2, (src.height + N) // 2))

# ตัดมุมสีขาวรอบกรอบโลโก้ให้โปร่งใส (วาดมาสก์ใหญ่ 4 เท่าแล้วย่อ เพื่อขอบเนียน)
big = N * 4
m = Image.new('L', (big, big), 0)
ImageDraw.Draw(m).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * RADIUS), fill=255)
logo = src.copy()
logo.putalpha(m.resize((N, N), Image.LANCZOS))


def small_png(img, path):
    """ลดเหลือ 256 สีเพื่อให้ไฟล์เล็ก โหลดเร็วบนมือถือ"""
    img.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)


def save(img, name, size):
    small_png(img.resize((size, size), Image.LANCZOS), os.path.join(ICONS, name))


def flat(img):
    """วางบนพื้นสีเขียวเข้ม (สำหรับไอคอนที่ระบบจะตัดมุมเอง)"""
    out = Image.new('RGB', img.size, BG)
    out.paste(img, (0, 0), img)
    return out


def padded(img, scale):
    """ย่อโลโก้ไว้กลางพื้นสีเขียว (maskable: Android ตัดเป็นวงกลม/หยดน้ำ ต้องเว้นขอบ)"""
    out = Image.new('RGB', img.size, BG)
    s = int(img.width * scale)
    o = (img.width - s) // 2
    small = img.resize((s, s), Image.LANCZOS)
    out.paste(small, (o, o), small)
    return out


for size in (32, 96, 192, 512):
    save(logo, 'icon-%d.png' % size, size)
save(flat(logo), 'apple-touch-icon.png', 180)
mask = padded(logo, 0.80)
save(mask, 'maskable-192.png', 192)
save(mask, 'maskable-512.png', 512)
small_png(logo.resize((128, 128), Image.LANCZOS), os.path.join(APP, 'assets', 'logo-128.png'))

# ฝังโลโก้ลงใน App.html (Apps Script เสิร์ฟไฟล์รูปเองไม่ได้ จึงฝังเป็น data URI)
APP_HTML = os.path.join(APP, 'apps-script', 'App.html')
b64 = base64.b64encode(open(os.path.join(APP, 'assets', 'logo-128.png'), 'rb').read()).decode()
html = open(APP_HTML, encoding='utf-8').read()
html, n = re.subn(r"const LOGO = 'data:image/png;base64,[A-Za-z0-9+/=]*';", lambda m: "const LOGO = 'data:image/png;base64," + b64 + "';", html)
if n != 1:
    sys.exit('ไม่พบบรรทัด const LOGO ใน App.html')
open(APP_HTML, 'w', encoding='utf-8').write(html)
print('สร้างไอคอนเรียบร้อย ->', ICONS)

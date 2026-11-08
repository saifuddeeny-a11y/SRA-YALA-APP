#!/usr/bin/env python3
"""
สร้างไฟล์ตัวอย่าง preview/preview.html ใหม่จากซอร์สใน apps-script/
(ใช้ส่วนจำลอง Google Apps Script และส่วนเริ่มต้นจาก preview.html เดิม แล้วแทนโค้ด .gs และ HTML ด้วยไฟล์ล่าสุด)

    python3 srayala-website/tools/build_preview.py

จากนั้นคัดลอกไปที่ sra-app/demo/preview.html ให้อัตโนมัติ
"""
import json
import os
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
SRC = os.path.join(SITE, 'apps-script')
OUT = os.path.join(SITE, 'preview', 'preview.html')
APP_DEMO = os.path.join(os.path.dirname(SITE), 'sra-app', 'demo', 'preview.html')

GS_FILES = ['Code.gs', 'Api.gs', 'Seed.gs', 'Member.gs', 'GroupSavings.gs']
HTML_FILES = ['Index', 'Admin', 'Theme', 'Member', 'FormKit']


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def main():
    shell = read(OUT)
    parts = shell.split('\n;\n')
    # parts: [mock, <.gs ...>, runner, TPL + boot]
    mock, runner, tail = parts[0], parts[-2], parts[-1]
    gs = [read(os.path.join(SRC, n)).strip('\n') for n in GS_FILES]
    for code in gs:
        if '\n;\n' in code:
            raise SystemExit('ไฟล์ .gs มีบรรทัดที่เป็น ";" เดี่ยว ๆ ซึ่งใช้เป็นตัวคั่นในไฟล์ตัวอย่าง')
    tpl = {n: read(os.path.join(SRC, n + '.html')) for n in HTML_FILES}
    tpl_json = json.dumps(tpl, ensure_ascii=False).replace('</script', '<\\/script')
    m = re.search(r'  var TPL = \{.*?\};\n', tail, re.S)
    if not m:
        raise SystemExit('ไม่พบ TPL ในไฟล์ตัวอย่าง')
    tail = tail[:m.start()] + '  var TPL = ' + tpl_json + ';\n' + tail[m.end():]
    html = '\n;\n'.join([mock] + gs + [runner, tail])
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    if os.path.isdir(os.path.dirname(APP_DEMO)):
        shutil.copyfile(OUT, APP_DEMO)
    print('สร้างแล้ว:', OUT, '(%d KB)' % (len(html.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()

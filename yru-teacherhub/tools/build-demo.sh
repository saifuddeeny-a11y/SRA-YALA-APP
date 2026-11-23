#!/usr/bin/env bash
# สร้างไฟล์ทดลองใช้งาน (demo) ใหม่จาก Index.html + Code.gs + ตัวจำลองบริการ Google (demo-mock.js)
# ใช้: bash tools/build-demo.sh   (รันจากโฟลเดอร์ yru-teacherhub)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="ทดลองใช้งาน_demo.html"
S=$(grep -n '^  <script>$' Index.html | head -1 | cut -d: -f1)
{
  head -n $((S-1)) Index.html | sed 's|^  <div class="shell">|  <div style="background:#fff3dc;color:#6b3d00;text-align:center;padding:6px;font-size:13px">โหมดทดลอง: ข้อมูลเก็บในเบราว์เซอร์ชั่วคราว รีเฟรชแล้วหาย · รหัสอาจารย์ Yru@2570</div><div class="shell">|'
  printf '  <script>'
  cat tools/demo-mock.js
  :
  cat Code.gs
  printf '\nautoInit_();</script><script>\n'
  tail -n +$((S+1)) Index.html
} > "$OUT"
echo "built $OUT"

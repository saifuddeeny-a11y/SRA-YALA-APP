#!/usr/bin/env python3
"""
สร้างไฟล์ทดลองใช้ demo/index.html จากซอร์สใน apps-script/
- ใช้ตัวจำลอง Google Apps Script (Sheets/Cache/Properties) จาก srayala-website/preview/preview.html
- ข้อมูลเก็บในเบราว์เซอร์ของผู้ทดลองเท่านั้น (localStorage) และมีข้อมูลตัวอย่างให้ลองใช้ทันที
- แชตบอตในโหมดทดลองตอบจากคลังคำตอบ (ไม่เรียก AI)

    python3 savings-app/tools/build_demo.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
REPO = os.path.dirname(APP)
SRC = os.path.join(APP, 'apps-script')
OUT = os.path.join(APP, 'demo', 'index.html')
MOCK_FROM = os.path.join(REPO, 'srayala-website', 'preview', 'preview.html')
GS_FILES = ['Code.gs', 'Api.gs', 'Chat.gs']


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


BOOT = r"""
(function(){
  var isApp = /[?&]app=1/.test(location.search);
  window.__QUIET = true;
  if (!PropertiesService.getScriptProperties().getProperty('SETUP_DONE')) setup();
  // ---------- ข้อมูลตัวอย่าง (เฉพาะโหมดทดลอง) ----------
  if (!readTable_('Groups').length) {
    var now = nowIso_(), seed = 7;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var ym = function (back, day) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + day).slice(-2); };
    var G = [['🪢', 'กลุ่มอาชีพเชือกกล้วย', 'ต.กายูบอเกาะ อ.รามัน จ.ยะลา', 100, 60000], ['🌽', 'กลุ่มข้าวโพดหวาน', 'ต.บาลอ อ.รามัน จ.ยะลา', 200, 80000], ['🥬', 'กลุ่มอาชีพผักยกแคร่', 'ต.ท่าสาป อ.เมือง จ.ยะลา', 100, 40000]];
    var groups = G.map(function (g, i) { return insertRow_('Groups', { id: newId_(), icon: g[0], name: g[1], location: g[2], monthlyShare: String(g[3]), savingsGoal: String(g[4]), active: 'TRUE', order: String(i + 1), createdAt: now, updatedAt: now }); });
    var names = ['อามีนะห์ ใจดี', 'อับดุลเลาะ สะมะแอ', 'ซูไฮลา ดอเลาะ', 'มะยูโซะ เจ๊ะเลาะ', 'ฟาตีมะห์ มะลี', 'อิสมาแอ ยูโซะ', 'นูรีซัน บือราเฮง', 'สุไลมาน หะยีดาโอะ', 'รอฮานี แวนิ', 'มูฮัมหมัด สาและ', 'ไซนับ อาแว', 'ฮาซัน เปาะจิ'];
    var members = names.map(function (n, i) {
      var g = groups[i % 3], salt = Utilities.getUuid(), inc = 6000 + Math.round(rnd() * 8) * 1000;
      return insertRow_('Members', { id: newId_(), memberNo: 'M' + ('00' + (i + 1)).slice(-3), name: n, phone: '08' + String(10000000 + i * 1234567).substr(0, 8), groupId: g.id, joinDate: ym(14, 1),
        occupation: ['ทำเชือกกล้วย', 'ปลูกข้าวโพด', 'ปลูกผัก'][i % 3], income: String(inc), expense: String(Math.round(inc * 0.7)), savingsGoal: String([20000, 30000, 15000][i % 3]), note: 'ข้อมูลตัวอย่าง',
        pinHash: hashPassword_('1234', salt), salt: salt, active: 'TRUE', lastLogin: '', createdAt: now, updatedAt: now });
    });
    members.forEach(function (m, i) {
      var share = Number(G[i % 3][3]);
      for (var b = 11; b >= 0; b--) {
        if (rnd() < 0.88) insertRow_('Savings', { id: newId_(), memberId: m.id, groupId: m.groupId, date: ym(b, 3 + (i % 5)), type: 'deposit', amount: String(share + Math.round(rnd() * 3) * 100), note: 'เงินออมประจำเดือน', recordedBy: 'demo', createdAt: now, updatedAt: now });
      }
      if (i % 4 === 1) insertRow_('Savings', { id: newId_(), memberId: m.id, groupId: m.groupId, date: ym(3, 18), type: 'withdraw', amount: '300', note: 'ค่าเทอมบุตร', recordedBy: 'demo', createdAt: now, updatedAt: now });
    });
    groups.forEach(function (g, gi) {
      for (var b = 11; b >= 0; b--) {
        insertRow_('Ledger', { id: newId_(), groupId: g.id, date: ym(b, 12), type: 'income', category: 'sales', amount: String(1500 + Math.round(rnd() * 25) * 100), note: 'ขายผลผลิต', recordedBy: 'demo', createdAt: now, updatedAt: now });
        if (b % 2 === gi % 2) insertRow_('Ledger', { id: newId_(), groupId: g.id, date: ym(b, 20), type: 'expense', category: 'material', amount: String(800 + Math.round(rnd() * 12) * 100), note: 'ซื้อวัตถุดิบ', recordedBy: 'demo', createdAt: now, updatedAt: now });
      }
      insertRow_('Ledger', { id: newId_(), groupId: g.id, date: ym(6, 25), type: 'income', category: 'support', amount: '5000', note: 'เงินสนับสนุนจากโครงการ', recordedBy: 'demo', createdAt: now, updatedAt: now });
    });
    var debt = function (m, creditor, kind, principal, rate, monthly, payMonths) {
      var d = insertRow_('Debts', { id: newId_(), memberId: m.id, groupId: m.groupId, creditor: creditor, kind: kind, principal: String(principal), rate: String(rate), monthlyPayment: String(monthly), startDate: ym(8, 1), status: 'active', note: '', createdBy: 'demo', createdAt: now, updatedAt: now });
      for (var k = payMonths; k >= 1; k--) insertRow_('DebtPayments', { id: newId_(), debtId: d.id, memberId: m.id, groupId: m.groupId, date: ym(k, 28), amount: String(monthly), note: '', recordedBy: 'demo', createdAt: now });
    };
    debt(members[0], 'ธ.ก.ส.', 'bank', 50000, 7, 1500, 6);
    debt(members[0], 'นายทุนในหมู่บ้าน', 'informal', 8000, 240, 1600, 2);
    debt(members[0], 'กองทุนหมู่บ้าน', 'coop', 10000, 6, 500, 5);
    debt(members[1], 'บัตรกดเงินสด', 'card', 25000, 25, 1500, 4);
    debt(members[4], 'ไฟแนนซ์รถจักรยานยนต์', 'leasing', 30000, 15, 1800, 7);
    debt(members[7], 'ญาติ', 'family', 5000, 0, 500, 3);
    insertRow_('Counsel', { id: newId_(), memberId: members[0].id, groupId: members[0].groupId, date: ym(1, 10), topic: 'วางแผนปิดหนี้นอกระบบ', advice: '1) ปิดหนี้นอกระบบก่อน เพราะดอกเบี้ยสูงมาก\n2) ขอกู้กองทุนกลุ่มมาปิดหนี้นอกระบบ แล้วผ่อนคืนกลุ่มเดือนละ 1,000 บาท\n3) จดรายจ่ายทุกวัน ลดค่าโทรศัพท์และขนม', nextDate: ym(-1, 10), counselor: 'เจ้าหน้าที่กลุ่ม', createdAt: now });
    var salt2 = Utilities.getUuid();
    insertRow_('Users', { id: newId_(), username: 'officer1', name: 'เหรัญญิกกลุ่มเชือกกล้วย', role: 'officer', groupId: groups[0].id, passwordHash: hashPassword_('demo12345', salt2), salt: salt2, active: 'TRUE', lastLogin: '', createdAt: now });
    setSetting_('phone', '073-000-000');
  }
  var TPL = __TPL__;
  var cfg = publicConfig_();
  cfg.baseUrl = location.href.split('#')[0].split('?')[0];
  var html = TPL.App.replace('<?!= cfg ?>', safeJson_(cfg));
  var bar = isApp ? '' : '<div id="demobar" style="position:fixed;left:10px;top:10px;z-index:98;background:#1d2a25;color:#fff;font:12.5px/1.5 Sarabun,sans-serif;border-radius:10px;padding:7px 11px;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:calc(100% - 20px)">' +
    '<b>โหมดทดลอง</b> · ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น · สมาชิก <b>M001</b> / PIN <b>1234</b> · เจ้าหน้าที่ <b>officer1</b> / <b>demo12345</b> · ผู้ดูแล <b>admin</b> / <b>ChangeMe@2569</b> ' +
    '<a href="#" onclick="__MOCK_RESET();sessionStorage.clear();location.reload();return false" style="color:#f3cf74">รีเซ็ตข้อมูล</a> <a href="#" onclick="this.parentNode.remove();return false" style="color:#fff;opacity:.7">✕</a></div>';
  html = html.replace('</body>', bar + '</body>');
  document.open(); document.write(html); document.close();
})();
"""


def main():
    parts = read(MOCK_FROM).split('\n;\n')
    mock = parts[0].replace("'sra_preview_store_v3'", "'sra_savings_demo_v1'")
    mock = mock.replace('<title>SRA YALA — ตัวอย่างเว็บไซต์ + ระบบสมาชิก</title>', '<title>SRA Savings — ทดลองใช้</title>')
    runner = parts[-2]
    if 'sra_savings_demo_v1' not in mock or 'withSuccessHandler' not in runner:
        raise SystemExit('ไม่พบตัวจำลองในไฟล์ preview.html')
    gs = [read(os.path.join(SRC, n)).strip('\n') for n in GS_FILES]
    tpl = json.dumps({'App': read(os.path.join(SRC, 'App.html'))}, ensure_ascii=False).replace('</script', '<\\/script')
    boot = BOOT.replace('__TPL__', tpl)
    html = '\n;\n'.join([mock] + gs + [runner, boot]) + '\n</script></head><body></body></html>\n'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    pwa_demo = os.path.join(APP, 'pwa', 'demo', 'index.html')
    os.makedirs(os.path.dirname(pwa_demo), exist_ok=True)
    with open(pwa_demo, 'w', encoding='utf-8') as f:
        f.write(html)
    print('สร้างแล้ว:', OUT, 'และ', pwa_demo, '(%d KB)' % (len(html.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()

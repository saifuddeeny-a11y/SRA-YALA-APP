/**
 * ============================================================
 *  นำเข้าข้อมูลจากไฟล์ Excel / CSV หรือจากลิงก์ Google Sheet
 * ------------------------------------------------------------
 *  รองรับตาราง "ติดตามการออมรายเดือน" (ชื่อ-นามสกุล | ตำบล | อำเภอ | จังหวัด | กลุ่ม | ม.ค. … ธ.ค.)
 *  หน้าแอปแปลงไฟล์เป็นตาราง แล้วส่งมาที่ importData()
 *
 *  นำเข้าซ้ำได้ (อัปเดตข้อมูล): แต่ละช่อง "สมาชิก × เดือน × บัญชี" มีรหัสอ้างอิง (ref)
 *    - ช่องที่มีเงิน → เพิ่ม หรือแก้ยอดให้ตรงกับไฟล์
 *    - ช่องว่าง/0 ที่เคยนำเข้า → ลบรายการเดิมออก
 *    - รายการที่บันทึกในแอปเอง (ไม่มี ref) ไม่ถูกแตะต้อง
 * ============================================================
 */

/** อ่านทุกแท็บของ Google Sheet จากลิงก์ (บัญชีที่ติดตั้งแอปต้องมีสิทธิ์ดูชีตนั้น) */
function importReadSheet(token, url) {
  requireSession_(token, ['admin', 'officer']);
  url = String(url || '').trim();
  var m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(url) || /^([a-zA-Z0-9_-]{30,})$/.exec(url);
  if (!m) throw new Error('ลิงก์ Google Sheet ไม่ถูกต้อง (ต้องเป็นลิงก์ docs.google.com/spreadsheets/d/...)');
  var ss;
  try { ss = SpreadsheetApp.openById(m[1]); } catch (err) {
    throw new Error('เปิดชีตไม่ได้ — ให้แชร์ชีตเป็น “ทุกคนที่มีลิงก์ดูได้” หรือแชร์ให้บัญชีที่ติดตั้งแอป แล้วลองใหม่');
  }
  try {
    return {
      title: ss.getName(),
      sheets: ss.getSheets().map(function (sh) {
        var r = Math.min(sh.getLastRow(), 3000), c = Math.min(sh.getLastColumn(), 60);
        return { name: sh.getName(), rows: r && c ? sh.getRange(1, 1, r, c).getDisplayValues() : [] };
      })
    };
  } catch (err) {
    throw new Error('อ่านข้อมูลจากลิงก์ไม่ได้ — ดาวน์โหลดชีตเป็นไฟล์ Excel (ไฟล์ › ดาวน์โหลด › .xlsx) แล้วใช้ “อัปโหลดไฟล์” แทน');
  }
}

function normName_(s) { return String(s || '').replace(/[\s​ ]+/g, '').toLowerCase(); }

/**
 * นำเข้า / อัปเดตข้อมูล
 * p = { tables: [{ account: 'savings'|'hajj', year: 2025, rows: [{ name, group, tambon, amphoe, province, months: [12 ค่า: ตัวเลข | null] }] }],
 *       defaultPin: '' (ตั้ง PIN ให้สมาชิกใหม่ ถ้าใส่), dryRun: true = ตรวจสอบอย่างเดียว }
 */
function importData(token, p) {
  var s = requireSession_(token, ['admin', 'officer']);
  p = p || {};
  if (!Array.isArray(p.tables) || !p.tables.length) throw new Error('ไม่พบตารางข้อมูลที่จะนำเข้า');
  if (p.defaultPin && !/^\S{4,32}$/.test(String(p.defaultPin))) throw new Error('PIN เริ่มต้นต้องมีอย่างน้อย 4 ตัว (ไม่มีช่องว่าง)');
  ensureSchema_();
  var res = withLock_(function () { return applyImport_(s, p, !!p.dryRun); });
  if (!p.dryRun) return { summary: res, data: getAll(token) };
  return { summary: res };
}

function applyImport_(s, p, dry) {
  var now = nowIso_(), who = 'import:' + (s.username || s.name);
  var sum = { groupsNew: [], membersNew: 0, membersMatched: 0, inserted: 0, updated: 0, deleted: 0, unchanged: 0, amount: { savings: 0, hajj: 0 }, skipped: [] };

  // ---------- กลุ่ม ----------
  var groups = readTable_('Groups'), gIdx = {};
  groups.forEach(function (g) { gIdx[normName_(g.name)] = g; });
  var newGroups = [];
  var groupFor = function (row) {
    var key = normName_(row.group);
    if (!key) return null;
    if (gIdx[key]) return gIdx[key];
    if (s.role !== 'admin') return null;
    var loc = [row.tambon ? 'ต.' + row.tambon : '', row.amphoe ? 'อ.' + row.amphoe : '', row.province ? 'จ.' + row.province : ''].filter(String).join(' ');
    var g = fill_('Groups', { id: newId_(), name: text_(row.group, 120), icon: '🧺', location: loc, description: 'สร้างจากการนำเข้าข้อมูล', active: 'TRUE',
      order: String(groups.length + newGroups.length + 1), createdAt: now, updatedAt: now });
    gIdx[key] = g; newGroups.push(g); sum.groupsNew.push(g.name);
    return g;
  };

  // ---------- สมาชิก ----------
  var members = readTable_('Members'), byNameGroup = {}, byName = {};
  members.forEach(function (m) {
    byNameGroup[normName_(m.name) + '|' + m.groupId] = m;
    var k = normName_(m.name);
    byName[k] = byName[k] ? 'DUP' : m;
  });
  var maxNo = 0, prefix = 'M', width = 3;
  members.forEach(function (m) { var x = /^([A-Za-zก-๙]*)(\d+)$/.exec(String(m.memberNo)); if (x && Number(x[2]) >= maxNo) { maxNo = Number(x[2]); prefix = x[1] || 'M'; width = Math.max(3, x[2].length); } });
  var newMembers = [], seenMember = {};
  var memberFor = function (row, g) {
    var k = normName_(row.name);
    var m = byNameGroup[k + '|' + g.id] || (byName[k] && byName[k] !== 'DUP' ? byName[k] : null);
    if (m) { if (!seenMember[m.id]) { seenMember[m.id] = 1; sum.membersMatched++; } return m; }
    maxNo++;
    var no = String(maxNo); while (no.length < width) no = '0' + no;
    var rec = { id: newId_(), memberNo: prefix + no, name: text_(row.name, 150), phone: '', groupId: g.id, joinDate: '', occupation: '', income: '', expense: '', savingsGoal: '',
      note: 'นำเข้าจากไฟล์', pinHash: '', salt: '', active: 'TRUE', lastLogin: '', createdAt: now, updatedAt: now };
    if (p.defaultPin) { rec.salt = Utilities.getUuid(); rec.pinHash = hashPassword_(String(p.defaultPin), rec.salt); }
    rec = fill_('Members', rec);
    byNameGroup[k + '|' + g.id] = rec; byName[k] = rec; seenMember[rec.id] = 1;
    newMembers.push(rec); sum.membersNew++;
    return rec;
  };

  // ---------- ยอดรายเดือนที่ต้องการ ----------
  var desired = {}, covered = {};
  p.tables.forEach(function (t, ti) {
    var account = ACCOUNTS[t.account] ? t.account : 'savings';
    var year = Number(t.year);
    if (!(year >= 2000 && year <= 2100)) throw new Error('ตารางที่ ' + (ti + 1) + ': ปีไม่ถูกต้อง');
    (t.rows || []).slice(0, 5000).forEach(function (row) {
      var g = groupFor(row);
      if (!g) { if (row.name) sum.skipped.push(text_(row.name, 60) + (row.group ? ' (ไม่มีสิทธิ์/ไม่พบกลุ่ม ' + text_(row.group, 40) + ')' : ' (ไม่ทราบกลุ่ม)')); return; }
      if (s.role === 'officer' && g.id !== s.groupId) { if (row.name) sum.skipped.push(text_(row.name, 60) + ' (อยู่นอกกลุ่มของคุณ)'); return; }
      if (!normName_(row.name)) return; // แถวว่าง (ยังไม่มีชื่อสมาชิก) — สร้างแค่กลุ่ม
      var m = memberFor(row, g);
      var months = Array.isArray(row.months) ? row.months : [];
      for (var k = 0; k < 12; k++) {
        var mm = ('0' + (k + 1)).slice(-2), ref = 'imp:' + account + ':' + m.id + ':' + year + '-' + mm;
        covered[ref] = 1;
        var v = months[k] === null || months[k] === undefined || months[k] === '' ? 0 : num_(months[k]);
        if (isNaN(v)) v = 0;
        if (v) {
          var d = desired[ref] || { memberId: m.id, groupId: g.id, account: account, date: year + '-' + mm + '-01', amount: 0, label: THAI_MONTHS_[k] + ' ' + (year + 543) };
          d.amount = Math.round((d.amount + v) * 100) / 100; // ชื่อซ้ำในตารางเดียวกัน → รวมยอด
          desired[ref] = d;
        }
      }
    });
  });

  // ---------- เทียบกับรายการเดิม ----------
  var sh = sheet_('Savings'), head = headers_(sh), last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2, 1, last - 1, head.length).getValues() : [];
  var ci = {}; head.forEach(function (h, i) { ci[h] = i; });
  var updates = [], deletes = [], existing = {};
  values.forEach(function (row, i) {
    var ref = String(row[ci.ref] || '');
    if (!ref || !covered[ref]) return;
    existing[ref] = 1;
    var d = desired[ref];
    if (!d) { deletes.push(i + 2); return; }
    var amt = d.amount < 0 ? -d.amount : d.amount, type = d.amount < 0 ? 'withdraw' : 'deposit';
    if (num_(row[ci.amount]) === amt && String(row[ci.type]) === type && String(row[ci.memberId]) === d.memberId) { sum.unchanged++; return; }
    var r2 = row.slice();
    r2[ci.amount] = String(amt); r2[ci.type] = type; r2[ci.memberId] = d.memberId; r2[ci.groupId] = d.groupId; r2[ci.updatedAt] = now;
    updates.push({ idx: i + 2, row: r2.map(function (v) { return v === null || v === undefined ? '' : String(v); }) });
  });
  var inserts = [];
  Object.keys(desired).forEach(function (ref) {
    var d = desired[ref];
    sum.amount[d.account] = Math.round((sum.amount[d.account] + d.amount) * 100) / 100;
    if (existing[ref]) return;
    inserts.push({ id: newId_(), memberId: d.memberId, groupId: d.groupId, account: d.account, date: d.date, type: d.amount < 0 ? 'withdraw' : 'deposit',
      amount: String(Math.abs(d.amount)), note: 'นำเข้า ' + d.label, recordedBy: who, createdAt: now, updatedAt: now, ref: ref });
  });
  sum.inserted = inserts.length; sum.updated = updates.length; sum.deleted = deletes.length;
  sum.skipped = sum.skipped.slice(0, 50);
  if (dry) return sum;

  // ---------- บันทึก ----------
  appendRows_('Groups', newGroups);
  appendRows_('Members', newMembers);
  updates.forEach(function (u) { sh.getRange(u.idx, 1, 1, head.length).setNumberFormat('@').setValues([u.row]); });
  deletes.sort(function (a, b) { return b - a; }).forEach(function (idx) { sh.deleteRow(idx); });
  appendRows_('Savings', inserts);
  _tableCache = {};
  logImport_(s, sum);
  return sum;
}

var THAI_MONTHS_ = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function logImport_(s, sum) {
  try {
    setSetting_('lastImport', nowIso_() + ' · ' + (s.username || s.name) + ' · เพิ่ม ' + sum.inserted + ' แก้ ' + sum.updated + ' ลบ ' + sum.deleted + ' รายการ · สมาชิกใหม่ ' + sum.membersNew + ' คน');
  } catch (err) { }
}

/**
 * ============================================================
 *  ระบบสมาชิก — กองทุนออมทรัพย์และบัญชีฮัจย์-อุมเราะห์
 *  + แบบฟอร์มออนไลน์ที่บันทึกลง Google Sheet
 * ------------------------------------------------------------
 *  หน้าเข้าสู่ระบบสมาชิกแยกจากหน้าเว็บ:  URL เว็บ?mode=member
 *  ใช้ฐานข้อมูล (Google Sheet) เดียวกับเว็บไซต์และหลังบ้าน
 *    - Members       ข้อมูลสมาชิก + รหัสผ่าน (hash)
 *    - Transactions  รายการฝาก/ถอน แยก 3 บัญชี
 *    - Forms         แบบฟอร์มที่สร้างจากหลังบ้าน
 *    - FormResponses คำตอบแบบฟอร์ม
 *  (เงินออมกลุ่มอาชีพอยู่ในไฟล์ GroupSavings.gs)
 * ============================================================
 */

/** อายุการเข้าสู่ระบบของสมาชิก (วินาที) สูงสุด 21600 = 6 ชั่วโมง */
var MEMBER_SESSION_TTL = 21600;

/** ขนาดไฟล์สลิปสูงสุด */
var MAX_SLIP_BYTES = 5 * 1024 * 1024;

/** บัญชีของสมาชิก (ชื่อแสดงผลเปลี่ยนได้ที่ ตั้งค่าเว็บไซต์ › ระบบสมาชิก) */
var ACCOUNTS = ['savings', 'hajj', 'umrah'];
var ACCOUNT_LABELS = { savings: 'เงินออมทรัพย์', hajj: 'บัญชีฮัจย์', umrah: 'บัญชีอุมเราะห์' };
var TX_TYPES = { deposit: 'ฝาก', withdraw: 'ถอน' };
var TX_STATUS = ['approved', 'pending', 'rejected'];

var FORM_FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'tel', 'email', 'select', 'radio', 'checkbox', 'section'];

/* ------------------------------------------------------------
 *  ค่าตั้งต้นที่หน้าสมาชิกต้องใช้ (ไม่มีข้อมูลลับ)
 * ------------------------------------------------------------ */
function memberPublicConfig_(settings) {
  settings = settings || getSettings_();
  return {
    siteName: settings.siteName || 'SRA YALA',
    fundName: settings.fundName || 'กองทุนออมทรัพย์และบัญชีฮัจย์-อุมเราะห์',
    organization: settings.organization || '',
    logoUrl: settings.logoUrl || '',
    themeColor: settings.themeColor || '',
    accentColor: settings.accentColor || '',
    phone: settings.phone || '',
    email: settings.email || '',
    notice: settings.memberNotice || '',
    allowDepositNotice: settings.memberDepositNotice !== 'FALSE',
    accounts: accountLabels_(settings)
  };
}

function accountLabels_(settings) {
  settings = settings || getSettings_();
  return {
    savings: settings.acc_savings || ACCOUNT_LABELS.savings,
    hajj: settings.acc_hajj || ACCOUNT_LABELS.hajj,
    umrah: settings.acc_umrah || ACCOUNT_LABELS.umrah
  };
}

/* ------------------------------------------------------------
 *  SESSION ของสมาชิก (แยกจากผู้ดูแล)
 * ------------------------------------------------------------ */
function requireMember_(token) {
  if (!token || !/^[a-zA-Z0-9-]{20,100}$/.test(String(token))) throw new Error('MEMBER_AUTH: กรุณาเข้าสู่ระบบสมาชิก');
  var cache = CacheService.getScriptCache();
  var raw = cache.get('msess_' + token);
  if (!raw) throw new Error('MEMBER_AUTH: หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่');
  var sess = JSON.parse(raw);
  var m = getRow_('Members', sess.id);
  if (!m || !isTrue_(m.active)) {
    cache.remove('msess_' + token);
    throw new Error('MEMBER_AUTH: บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่');
  }
  cache.put('msess_' + token, raw, MEMBER_SESSION_TTL); // ต่ออายุ
  return m;
}

function publicMember_(m) {
  return {
    id: m.id, memberNo: m.memberNo, name: m.name, phone: m.phone, groupId: m.groupId, address: m.address,
    joinDate: m.joinDate, savingsGoal: m.savingsGoal, hajjGoal: m.hajjGoal, umrahGoal: m.umrahGoal,
    mustChangePw: isTrue_(m.mustChangePw), lastLogin: m.lastLogin
  };
}

function stripMember_(m) {
  var c = {};
  Object.keys(m).forEach(function (k) { if (k !== 'passwordHash' && k !== 'salt') c[k] = m[k]; });
  c.hasPassword = !!m.passwordHash;
  return c;
}

function findMemberByNo_(memberNo) {
  var key = String(memberNo || '').trim().toLowerCase();
  if (!key) return null;
  return readTable_('Members').filter(function (m) { return String(m.memberNo).trim().toLowerCase() === key; })[0] || null;
}

/* ------------------------------------------------------------
 *  MEMBER API — เรียกจากหน้า Member.html
 * ------------------------------------------------------------ */

function memberLogin(memberNo, password) {
  memberNo = String(memberNo || '').trim();
  password = String(password || '');
  if (!memberNo || !password) throw new Error('กรุณากรอกรหัสสมาชิกและรหัสผ่าน');

  var cache = CacheService.getScriptCache();
  var failKey = 'mfail_' + memberNo.toLowerCase().replace(/[^a-z0-9ก-๙_-]/g, '');
  var fails = Number(cache.get(failKey) || 0);
  if (fails >= 5) throw new Error('กรอกรหัสผ่านผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่');
  var allFails = Number(cache.get('mfail_all') || 0);
  if (allFails >= 60) throw new Error('มีการเข้าสู่ระบบผิดจำนวนมาก กรุณาลองใหม่ภายหลัง');

  var m = findMemberByNo_(memberNo);
  if (!m || !m.passwordHash || hashPassword_(password, m.salt) !== m.passwordHash) {
    cache.put(failKey, String(fails + 1), 900);
    cache.put('mfail_all', String(allFails + 1), 600);
    throw new Error('รหัสสมาชิกหรือรหัสผ่านไม่ถูกต้อง');
  }
  if (!isTrue_(m.active)) throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่กองทุน');

  cache.remove(failKey);
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  cache.put('msess_' + token, JSON.stringify({ id: m.id, memberNo: m.memberNo, name: m.name }), MEMBER_SESSION_TTL);
  updateRow_('Members', { id: m.id, lastLogin: nowIso_() });
  return { token: token, member: publicMember_(m) };
}

function memberLogout(token) {
  try { CacheService.getScriptCache().remove('msess_' + token); } catch (err) { }
  return true;
}

/** ข้อมูลทั้งหมดของสมาชิกที่เข้าสู่ระบบ */
function memberGetData(token) {
  var m = requireMember_(token);
  var txs = readTable_('Transactions').filter(function (t) { return t.memberId === m.id; })
    .sort(function (a, b) {
      var d = String(b.date || '').localeCompare(String(a.date || ''));
      return d !== 0 ? d : String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    })
    .map(function (t) {
      return { id: t.id, date: t.date, account: t.account, type: t.type, amount: t.amount, note: t.note, status: t.status || 'approved', hasSlip: !!t.slipFileId, createdAt: t.createdAt };
    });
  var group = m.groupId ? getRow_('Groups', m.groupId) : null;
  var responses = readTable_('FormResponses').filter(function (r) { return r.memberId === m.id; })
    .map(function (r) { return { id: r.id, formId: r.formId, status: r.status, createdAt: r.createdAt }; })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return {
    member: publicMember_(m),
    groupName: group ? group.name : '',
    group: memberGroupData_(m),
    balances: computeBalances_(txs),
    transactions: txs,
    forms: publicForms_().filter(function (f) { return f.status !== 'closed'; }),
    responses: responses,
    config: memberPublicConfig_()
  };
}

function memberChangePassword(token, oldPassword, newPassword) {
  var m = requireMember_(token);
  if (hashPassword_(String(oldPassword || ''), m.salt) !== m.passwordHash) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  validateMemberPassword_(newPassword);
  if (String(oldPassword) === String(newPassword)) throw new Error('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม');
  var salt = Utilities.getUuid();
  updateRow_('Members', { id: m.id, salt: salt, passwordHash: hashPassword_(String(newPassword), salt), mustChangePw: 'FALSE', updatedAt: nowIso_() });
  return true;
}

function validateMemberPassword_(pw) {
  pw = String(pw || '');
  if (pw.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  if (pw.length > 64) throw new Error('รหัสผ่านยาวเกินไป');
}

/**
 * สมาชิกแจ้งการฝากเงิน (พร้อมแนบสลิปได้) → สถานะ “รอตรวจสอบ”
 * เจ้าหน้าที่อนุมัติที่หลังบ้าน แล้วยอดจึงเข้าบัญชี
 * payload = { account, amount, date, note, slip: { name, mimeType, data(base64) } }
 */
function memberNotifyDeposit(token, payload) {
  var m = requireMember_(token);
  var settings = getSettings_();
  if (settings.memberDepositNotice === 'FALSE') throw new Error('ปิดการแจ้งฝากเงินออนไลน์ชั่วคราว กรุณาติดต่อเจ้าหน้าที่');
  payload = payload || {};
  var account = String(payload.account || '');
  if (ACCOUNTS.indexOf(account) === -1) throw new Error('กรุณาเลือกบัญชี');
  var amount = parseAmount_(payload.amount);
  if (!(amount > 0)) throw new Error('กรุณากรอกจำนวนเงินให้ถูกต้อง');
  if (amount > 1000000) throw new Error('จำนวนเงินต่อครั้งสูงเกินกำหนด กรุณาติดต่อเจ้าหน้าที่');
  var date = normDate_(payload.date) || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');

  var pending = readTable_('Transactions').filter(function (t) { return t.memberId === m.id && t.status === 'pending'; }).length;
  if (pending >= 20) throw new Error('มีรายการรอตรวจสอบจำนวนมาก กรุณารอเจ้าหน้าที่ตรวจสอบก่อน');

  var slip = saveSlip_(payload.slip, String(m.memberNo).replace(/[^a-zA-Z0-9_-]/g, ''), date);

  var now = nowIso_();
  var rec = {
    id: newId_(), memberId: m.id, date: date, account: account, type: 'deposit', amount: String(amount),
    note: String(payload.note || '').trim().substr(0, 300), slipFileId: slip.slipFileId, slipUrl: slip.slipUrl,
    status: 'pending', recordedBy: 'member:' + m.memberNo, createdAt: now, updatedAt: now
  };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { insertRow_('Transactions', rec); } finally { lock.releaseLock(); }

  if (settings.notifyEmail) {
    try {
      MailApp.sendEmail({
        to: settings.notifyEmail,
        subject: '[' + (settings.siteName || 'SRA YALA') + '] สมาชิกแจ้งฝากเงิน: ' + m.name,
        body: 'รหัสสมาชิก: ' + m.memberNo + '\nชื่อ: ' + m.name + '\nบัญชี: ' + accountLabels_(settings)[account] +
          '\nจำนวน: ' + amount.toLocaleString() + ' บาท\nวันที่: ' + date + '\nหมายเหตุ: ' + rec.note +
          '\n\nตรวจสอบและอนุมัติได้ที่หลังบ้าน › บันทึกเงินออม'
      });
    } catch (err) { }
  }
  return { ok: true, id: rec.id };
}

/**
 * บันทึกสลิปลงโฟลเดอร์ Slips (ไม่แชร์สาธารณะ เพราะเป็นข้อมูลส่วนบุคคล — เปิดได้เฉพาะเจ้าของ Drive / ผู้ดูแล)
 * slip = { name, mimeType, data(base64) } หรือ null → คืน { slipFileId, slipUrl }
 */
function saveSlip_(slip, label, date) {
  if (!slip || !slip.data) return { slipFileId: '', slipUrl: '' };
  var mime = String(slip.mimeType || '');
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mime) && mime !== 'application/pdf') throw new Error('สลิปต้องเป็นไฟล์ภาพหรือ PDF');
  var bytes = Utilities.base64Decode(slip.data);
  if (bytes.length > MAX_SLIP_BYTES) throw new Error('ไฟล์สลิปใหญ่เกิน 5 MB');
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_SLIPS') || props.getProperty('ROOT_FOLDER_ID');
  var name = 'slip-' + label + '-' + date + '-' + new Date().getTime() + (mime === 'application/pdf' ? '.pdf' : '.jpg');
  var file = DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes, mime, name));
  return { slipFileId: file.getId(), slipUrl: driveViewUrl_(file.getId()) };
}

/* ------------------------------------------------------------
 *  คำนวณยอดเงิน
 * ------------------------------------------------------------ */
function parseAmount_(v) {
  var n = Number(String(v == null ? '' : v).replace(/[, ]/g, ''));
  if (isNaN(n)) return NaN;
  return Math.round(n * 100) / 100;
}

function normDate_(v) {
  var s = String(v || '').substr(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

/** ยอดคงเหลือแต่ละบัญชี (นับเฉพาะรายการที่อนุมัติแล้ว) */
function computeBalances_(txs) {
  var out = {};
  ACCOUNTS.forEach(function (a) { out[a] = { deposit: 0, withdraw: 0, balance: 0, pending: 0, count: 0 }; });
  (txs || []).forEach(function (t) {
    var b = out[t.account]; if (!b) return;
    var amt = parseAmount_(t.amount); if (isNaN(amt)) return;
    var st = t.status || 'approved';
    if (st === 'pending') { if (t.type === 'deposit') b.pending += amt; return; }
    if (st !== 'approved') return;
    b.count++;
    if (t.type === 'withdraw') b.withdraw += amt; else b.deposit += amt;
  });
  ACCOUNTS.forEach(function (a) {
    var b = out[a];
    b.balance = Math.round((b.deposit - b.withdraw) * 100) / 100;
    b.deposit = Math.round(b.deposit * 100) / 100; b.withdraw = Math.round(b.withdraw * 100) / 100; b.pending = Math.round(b.pending * 100) / 100;
  });
  return out;
}

/* ------------------------------------------------------------
 *  แบบฟอร์มออนไลน์ — สาธารณะ / สมาชิก
 * ------------------------------------------------------------ */

/** แบบฟอร์มที่เผยแพร่ (ใช้ทั้งหน้าเว็บและหน้าสมาชิก) */
function publicForms_() {
  return readTable_('Forms').filter(function (f) { return f.published === '' || isTrue_(f.published); }).sort(byOrder_).map(function (f) {
    var fields = [];
    try { fields = JSON.parse(f.fields || '[]'); } catch (err) { fields = []; }
    return { id: f.id, title: f.title, description: f.description, icon: f.icon, audience: f.audience || 'public', status: f.status || 'open', successMessage: f.successMessage, fields: fields };
  });
}

/**
 * ส่งคำตอบแบบฟอร์ม
 * data = { fieldKey: value | [values] }, memberToken = ใส่เมื่อเป็นแบบฟอร์มสำหรับสมาชิก
 */
function submitForm(formId, data, memberToken) {
  data = data || {};
  if (data.__hp) return { ok: true }; // honeypot กันบอท
  var row = getRow_('Forms', formId);
  if (!row || !(row.published === '' || isTrue_(row.published))) throw new Error('ไม่พบแบบฟอร์มนี้');
  if (row.status === 'closed') throw new Error('แบบฟอร์มนี้ปิดรับข้อมูลแล้ว');

  var member = null;
  if (row.audience === 'member') member = requireMember_(memberToken);
  else if (memberToken) { try { member = requireMember_(memberToken); } catch (err) { member = null; } }

  var cache = CacheService.getScriptCache();
  var count = Number(cache.get('form_rate') || 0);
  if (count > 80) throw new Error('มีการส่งข้อมูลจำนวนมาก กรุณาลองใหม่ภายหลัง');
  cache.put('form_rate', String(count + 1), 600);

  var fields = [];
  try { fields = JSON.parse(row.fields || '[]'); } catch (err) { fields = []; }
  var clean = {}, missing = [];
  fields.forEach(function (f) {
    if (!f || !f.k || f.t === 'section') return;
    var v = data[f.k];
    var opts = Array.isArray(f.opts) ? f.opts.map(String) : [];
    if (f.t === 'checkbox') {
      var arr = (Array.isArray(v) ? v : (v ? [v] : [])).map(String).filter(function (x) { return opts.length === 0 || opts.indexOf(x) !== -1; });
      if (f.req && !arr.length) missing.push(f.l);
      clean[f.k] = arr.join(', ');
      return;
    }
    v = String(v == null ? '' : v).trim().substr(0, f.t === 'textarea' ? 3000 : 300);
    if (f.req && !v) { missing.push(f.l); return; }
    if (!v) { clean[f.k] = ''; return; }
    if (f.t === 'number') {
      var n = parseAmount_(v);
      if (isNaN(n)) throw new Error('“' + f.l + '” ต้องเป็นตัวเลข');
      v = String(n);
    } else if (f.t === 'date') {
      if (!normDate_(v)) throw new Error('“' + f.l + '” วันที่ไม่ถูกต้อง');
    } else if (f.t === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error('“' + f.l + '” อีเมลไม่ถูกต้อง');
    } else if (f.t === 'tel') {
      if (!/^[0-9+\-\s()]{6,20}$/.test(v)) throw new Error('“' + f.l + '” เบอร์โทรไม่ถูกต้อง');
    } else if ((f.t === 'select' || f.t === 'radio') && opts.length && opts.indexOf(v) === -1) {
      throw new Error('“' + f.l + '” ตัวเลือกไม่ถูกต้อง');
    }
    clean[f.k] = v;
  });
  if (missing.length) throw new Error('กรุณากรอก: ' + missing.join(', '));

  var rec = {
    id: newId_(), formId: row.id, memberId: member ? member.id : '', memberName: member ? (member.memberNo + ' ' + member.name) : '',
    data: JSON.stringify(clean), status: 'new', createdAt: nowIso_()
  };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { insertRow_('FormResponses', rec); } finally { lock.releaseLock(); }

  var to = getSettings_().notifyEmail;
  if (to) {
    try {
      var body = fields.filter(function (f) { return f.t !== 'section'; }).map(function (f) { return f.l + ': ' + (clean[f.k] || '-'); }).join('\n');
      MailApp.sendEmail({ to: to, subject: '[SRA YALA] คำตอบใหม่: ' + row.title, body: (rec.memberName ? 'สมาชิก: ' + rec.memberName + '\n\n' : '') + body });
    } catch (err) { }
  }
  return { ok: true, message: row.successMessage || 'บันทึกข้อมูลเรียบร้อย ขอบคุณค่ะ' };
}

/* ------------------------------------------------------------
 *  ADMIN API — สมาชิก & เงินออม
 * ------------------------------------------------------------ */

function adminSaveMember(token, m) {
  var user = requireAuth_(token);
  m = m || {};
  var memberNo = String(m.memberNo || '').trim();
  var name = String(m.name || '').trim();
  if (!memberNo) throw new Error('กรุณากรอกรหัสสมาชิก');
  if (!/^[A-Za-z0-9ก-๙._\/-]{1,30}$/.test(memberNo)) throw new Error('รหัสสมาชิกใช้ได้เฉพาะตัวอักษร ตัวเลข และ . _ - / (ไม่เกิน 30 ตัว)');
  if (!name) throw new Error('กรุณากรอกชื่อ-นามสกุล');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var dup = findMemberByNo_(memberNo);
    if (dup && dup.id !== m.id) throw new Error('รหัสสมาชิก ' + memberNo + ' มีอยู่แล้ว');
    var now = nowIso_();
    var rec = {
      memberNo: memberNo, name: name.substr(0, 150),
      phone: String(m.phone || '').trim().substr(0, 40), groupId: String(m.groupId || ''),
      address: String(m.address || '').trim().substr(0, 500), joinDate: normDate_(m.joinDate),
      savingsGoal: goal_(m.savingsGoal), hajjGoal: goal_(m.hajjGoal), umrahGoal: goal_(m.umrahGoal),
      note: String(m.note || '').trim().substr(0, 500),
      active: m.active === undefined ? 'TRUE' : (isTrue_(m.active) ? 'TRUE' : 'FALSE'), updatedAt: now
    };
    var isNew = !m.id || !getRow_('Members', m.id);
    if (isNew) {
      if (!m.password) throw new Error('กรุณาตั้งรหัสผ่านเริ่มต้นให้สมาชิก');
      rec.id = newId_(); rec.createdAt = now; rec.lastLogin = '';
    } else {
      rec.id = m.id;
    }
    if (m.password) {
      validateMemberPassword_(m.password);
      rec.salt = Utilities.getUuid();
      rec.passwordHash = hashPassword_(String(m.password), rec.salt);
      rec.mustChangePw = m.mustChangePw === undefined ? 'TRUE' : (isTrue_(m.mustChangePw) ? 'TRUE' : 'FALSE');
    }
    var saved = isNew ? insertRow_('Members', fill_('Members', rec)) : updateRow_('Members', rec);
    logAction_(user, (isNew ? 'create' : 'update') + ' member' + (m.password && !isNew ? ' (reset password)' : ''), memberNo + ' ' + name);
    return stripMember_(fill_('Members', saved));
  } finally {
    lock.releaseLock();
  }
}

function goal_(v) {
  if (v === '' || v == null) return '';
  var n = parseAmount_(v);
  return isNaN(n) || n < 0 ? '' : String(n);
}

/** ลบสมาชิก (เฉพาะ admin) — ถ้ามีรายการเงินต้องยืนยันลบรายการด้วย */
function adminDeleteMember(token, id, alsoTransactions) {
  var user = requireAuth_(token, true);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var m = getRow_('Members', id);
    if (!m) return false;
    var txs = readTable_('Transactions').filter(function (t) { return t.memberId === id; });
    if (txs.length && !alsoTransactions) throw new Error('สมาชิกนี้มีรายการเงิน ' + txs.length + ' รายการ — แนะนำให้ “ระงับการใช้งาน” แทนการลบ');
    txs.forEach(function (t) { deleteRow_('Transactions', t.id); });
    deleteRow_('Members', id);
    logAction_(user, 'delete member', m.memberNo + ' ' + m.name + (txs.length ? ' (+' + txs.length + ' รายการเงิน)' : ''));
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * นำเข้าสมาชิกหลายคน
 * list = [{ memberNo, name, phone, groupId, joinDate }], defaultPassword = รหัสผ่านเริ่มต้น (สมาชิกต้องเปลี่ยนเมื่อเข้าครั้งแรก)
 */
function adminImportMembers(token, list, defaultPassword) {
  var user = requireAuth_(token);
  validateMemberPassword_(defaultPassword);
  list = Array.isArray(list) ? list.slice(0, 1000) : [];
  var existing = {};
  readTable_('Members').forEach(function (m) { existing[String(m.memberNo).trim().toLowerCase()] = true; });
  var added = [], skipped = [];
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var now = nowIso_();
    list.forEach(function (r) {
      var no = String(r.memberNo || '').trim(), name = String(r.name || '').trim();
      if (!no || !name || existing[no.toLowerCase()] || !/^[A-Za-z0-9ก-๙._\/-]{1,30}$/.test(no)) { skipped.push(no || name || '(ว่าง)'); return; }
      var salt = Utilities.getUuid();
      var rec = fill_('Members', {
        id: newId_(), memberNo: no, name: name.substr(0, 150), phone: String(r.phone || '').trim().substr(0, 40), groupId: String(r.groupId || ''),
        address: '', joinDate: normDate_(r.joinDate), savingsGoal: '', hajjGoal: '', umrahGoal: '', note: '',
        passwordHash: hashPassword_(String(defaultPassword), salt), salt: salt, mustChangePw: 'TRUE', active: 'TRUE', lastLogin: '', createdAt: now, updatedAt: now
      });
      insertRow_('Members', rec);
      existing[no.toLowerCase()] = true;
      added.push(stripMember_(rec));
    });
  } finally {
    lock.releaseLock();
  }
  logAction_(user, 'import members', added.length + ' คน');
  return { added: added, skipped: skipped };
}

/** เพิ่ม/แก้ไขรายการฝาก-ถอน (เจ้าหน้าที่บันทึก = อนุมัติทันที) */
function adminSaveTransaction(token, t) {
  var user = requireAuth_(token);
  t = t || {};
  var m = getRow_('Members', t.memberId);
  if (!m) throw new Error('ไม่พบสมาชิก');
  if (ACCOUNTS.indexOf(t.account) === -1) throw new Error('กรุณาเลือกบัญชี');
  if (!TX_TYPES[t.type]) throw new Error('กรุณาเลือกประเภท ฝาก/ถอน');
  var amount = parseAmount_(t.amount);
  if (!(amount > 0)) throw new Error('จำนวนเงินต้องมากกว่า 0');
  var date = normDate_(t.date);
  if (!date) throw new Error('กรุณาระบุวันที่');
  var status = TX_STATUS.indexOf(t.status) !== -1 ? t.status : 'approved';

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var all = readTable_('Transactions');
    var old = t.id ? all.filter(function (x) { return x.id === t.id; })[0] : null;
    if (t.type === 'withdraw' && status === 'approved') {
      var others = all.filter(function (x) { return x.memberId === m.id && x.id !== t.id; });
      var bal = computeBalances_(others)[t.account].balance;
      if (amount > bal + 0.001) throw new Error('ยอดถอนเกินยอดคงเหลือ (คงเหลือ ' + bal.toLocaleString() + ' บาท)');
    }
    var now = nowIso_();
    var rec = {
      memberId: m.id, date: date, account: t.account, type: t.type, amount: String(amount),
      note: String(t.note || '').trim().substr(0, 300), status: status, updatedAt: now
    };
    var saved;
    if (old) {
      rec.id = old.id;
      saved = updateRow_('Transactions', rec);
    } else {
      rec.id = newId_(); rec.slipFileId = ''; rec.slipUrl = ''; rec.recordedBy = user.username; rec.createdAt = now;
      saved = insertRow_('Transactions', fill_('Transactions', rec));
    }
    logAction_(user, (old ? 'update' : 'create') + ' transaction', m.memberNo + ' ' + TX_TYPES[t.type] + ' ' + amount + ' (' + t.account + ')');
    return fill_('Transactions', saved);
  } finally {
    lock.releaseLock();
  }
}

/** อนุมัติ / ไม่อนุมัติ รายการที่สมาชิกแจ้ง */
function adminSetTransactionStatus(token, id, status) {
  var user = requireAuth_(token);
  if (TX_STATUS.indexOf(status) === -1) throw new Error('สถานะไม่ถูกต้อง');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var t = getRow_('Transactions', id);
    if (!t) throw new Error('ไม่พบรายการ');
    if (status === 'approved' && t.type === 'withdraw') {
      var others = readTable_('Transactions').filter(function (x) { return x.memberId === t.memberId && x.id !== t.id; });
      var bal = computeBalances_(others)[t.account].balance;
      if (parseAmount_(t.amount) > bal + 0.001) throw new Error('ยอดถอนเกินยอดคงเหลือ');
    }
    var saved = updateRow_('Transactions', { id: id, status: status, updatedAt: nowIso_() });
    logAction_(user, 'transaction ' + status, id);
    return fill_('Transactions', saved);
  } finally {
    lock.releaseLock();
  }
}

function adminDeleteTransaction(token, id) {
  var user = requireAuth_(token);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var t = getRow_('Transactions', id);
    if (!t) return false;
    deleteRow_('Transactions', id);
    logAction_(user, 'delete transaction', t.memberId + ' ' + t.type + ' ' + t.amount);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------
 *  แบบฟอร์มเริ่มต้น (ใส่เมื่อชีต Forms ยังว่าง)
 * ------------------------------------------------------------ */
function seedForms_() {
  if (readTable_('Forms').length) return;
  var groupNames = readTable_('Groups').sort(byOrder_).map(function (g) { return g.name; });
  if (!groupNames.length) groupNames = ['กลุ่มอาชีพเชือกกล้วย', 'กลุ่มข้าวโพดหวาน', 'กลุ่มอาชีพผักยกแคร่'];
  var now = nowIso_();
  var forms = [
    {
      title: 'ใบสมัครสมาชิกกองทุนออมทรัพย์และบัญชีฮัจย์-อุมเราะห์', icon: '📝', audience: 'public',
      description: 'กรอกข้อมูลเพื่อสมัครเป็นสมาชิกกองทุน เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันและแจ้งรหัสสมาชิกสำหรับเข้าสู่ระบบ',
      successMessage: 'ส่งใบสมัครเรียบร้อย เจ้าหน้าที่จะติดต่อกลับเพื่อแจ้งรหัสสมาชิก',
      fields: [
        { k: 'name', l: 'ชื่อ-นามสกุล', t: 'text', req: true },
        { k: 'phone', l: 'เบอร์โทรศัพท์', t: 'tel', req: true },
        { k: 'group', l: 'กลุ่มอาชีพ', t: 'select', opts: groupNames.concat(['อื่น ๆ']) },
        { k: 'address', l: 'ที่อยู่', t: 'textarea' },
        { k: 'accounts', l: 'บัญชีที่ต้องการเปิด', t: 'checkbox', req: true, opts: ['เงินออมทรัพย์', 'บัญชีฮัจย์', 'บัญชีอุมเราะห์'] },
        { k: 'monthly', l: 'จำนวนเงินที่ตั้งใจออมต่อเดือน (บาท)', t: 'number' },
        { k: 'note', l: 'ข้อมูลเพิ่มเติม', t: 'textarea' }
      ]
    },
    {
      title: 'แบบสำรวจหนี้สินครัวเรือน', icon: '📋', audience: 'public',
      description: 'ข้อมูลรายรับ รายจ่าย และหนี้สินของครัวเรือน เพื่อใช้วางแผนแก้ปัญหาหนี้และส่งเสริมการออม ข้อมูลใช้ภายในโครงการเท่านั้น',
      successMessage: 'บันทึกแบบสำรวจเรียบร้อย ขอบคุณที่ให้ข้อมูล',
      fields: [
        { k: 's1', l: 'ข้อมูลทั่วไป', t: 'section' },
        { k: 'name', l: 'ชื่อ-นามสกุล ผู้ให้ข้อมูล', t: 'text', req: true },
        { k: 'phone', l: 'เบอร์โทรศัพท์', t: 'tel' },
        { k: 'village', l: 'หมู่บ้าน / ตำบล', t: 'text', req: true },
        { k: 'household', l: 'จำนวนสมาชิกในครัวเรือน (คน)', t: 'number' },
        { k: 'occupation', l: 'อาชีพหลัก', t: 'text' },
        { k: 's2', l: 'รายรับ-รายจ่าย', t: 'section' },
        { k: 'income', l: 'รายได้เฉลี่ยต่อเดือน (บาท)', t: 'number', req: true },
        { k: 'expense', l: 'รายจ่ายเฉลี่ยต่อเดือน (บาท)', t: 'number', req: true },
        { k: 's3', l: 'หนี้สิน', t: 'section' },
        { k: 'sources', l: 'แหล่งหนี้ (เลือกได้หลายข้อ)', t: 'checkbox', opts: ['ธนาคาร / ธ.ก.ส.', 'กองทุนหมู่บ้าน', 'สหกรณ์', 'กลุ่มออมทรัพย์', 'หนี้นอกระบบ', 'ญาติ / เพื่อน', 'ไม่มีหนี้', 'อื่น ๆ'] },
        { k: 'debt', l: 'หนี้สินคงค้างรวม (บาท)', t: 'number' },
        { k: 'repay', l: 'ชำระหนี้ต่อเดือน (บาท)', t: 'number' },
        { k: 'problem', l: 'ปัญหา / ความต้องการความช่วยเหลือ', t: 'textarea' }
      ]
    },
    {
      title: 'บันทึกรายรับ-รายจ่ายครัวเรือน', icon: '📒', audience: 'member',
      description: 'สำหรับสมาชิกกองทุน บันทึกรายรับ-รายจ่ายประจำวันเพื่อดูภาพรวมการเงินของครัวเรือน',
      successMessage: 'บันทึกรายการเรียบร้อย',
      fields: [
        { k: 'date', l: 'วันที่', t: 'date', req: true },
        { k: 'kind', l: 'ประเภท', t: 'radio', req: true, opts: ['รายรับ', 'รายจ่าย'] },
        { k: 'category', l: 'หมวด', t: 'select', req: true, opts: ['อาชีพหลัก', 'อาชีพเสริม', 'อาหาร', 'การศึกษา', 'ค่าน้ำ-ค่าไฟ-โทรศัพท์', 'ชำระหนี้', 'เงินออม', 'ศาสนกิจ / ซะกาต', 'อื่น ๆ'] },
        { k: 'amount', l: 'จำนวนเงิน (บาท)', t: 'number', req: true },
        { k: 'note', l: 'รายละเอียด', t: 'text' }
      ]
    }
  ];
  forms.forEach(function (f, i) {
    insertRow_('Forms', {
      id: newId_(), title: f.title, description: f.description, icon: f.icon, audience: f.audience, fields: JSON.stringify(f.fields),
      status: 'open', successMessage: f.successMessage, order: String(i + 1), published: 'TRUE', createdAt: now, updatedAt: now
    });
  });
}

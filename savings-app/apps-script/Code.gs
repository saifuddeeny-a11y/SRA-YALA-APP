/**
 * ============================================================
 *  SRA Savings — แอประบบออมทรัพย์กลุ่มอาชีพ + คลินิกแก้หนี้
 *  Google Apps Script Web App (ฐานข้อมูล = Google Sheet)
 * ------------------------------------------------------------
 *  ไฟล์นี้: การตั้งค่า, โครงสร้างตาราง, doGet, setup,
 *           ตัวช่วยฐานข้อมูล, การเข้าสู่ระบบ, เครื่องมือทั่วไป
 *  ไฟล์อื่น: Api.gs (ข้อมูล/บันทึก/แดชบอร์ด), Chat.gs (แชตบอตการเงิน)
 * ============================================================
 */

/** ผู้ดูแลเริ่มต้น (สร้างตอนรัน setup ครั้งแรกเท่านั้น) — เปลี่ยนรหัสก่อนรัน setup และเปลี่ยนอีกครั้งหลังเข้าสู่ระบบ */
var INITIAL_ADMIN_USERNAME = 'admin';
var INITIAL_ADMIN_PASSWORD = 'ChangeMe@2569';

/** ชื่อแอป (แก้ได้ภายหลังในหน้า ตั้งค่า) */
var APP_NAME = 'SRA Savings';

/** อายุการเข้าสู่ระบบ (วินาที) สูงสุด 21600 = 6 ชั่วโมง */
var SESSION_TTL = 21600;

/**
 * โครงสร้างตาราง (ชีต) — คอลัมน์แรกคือคีย์หลักเสมอ
 * ทุกค่าเก็บเป็นข้อความ เพื่อกัน Google Sheets แปลงเบอร์โทร/วันที่เอง
 */
var SCHEMA = {
  Settings:     ['key', 'value'],
  Users:        ['id', 'username', 'name', 'role', 'groupId', 'passwordHash', 'salt', 'active', 'lastLogin', 'createdAt'],
  Groups:       ['id', 'name', 'icon', 'location', 'description', 'monthlyShare', 'savingsGoal', 'active', 'order', 'createdAt', 'updatedAt'],
  Members:      ['id', 'memberNo', 'name', 'phone', 'groupId', 'joinDate', 'occupation', 'income', 'expense', 'savingsGoal', 'note', 'pinHash', 'salt', 'active', 'lastLogin', 'createdAt', 'updatedAt'],
  Savings:      ['id', 'memberId', 'groupId', 'date', 'type', 'amount', 'note', 'recordedBy', 'createdAt', 'updatedAt', 'account', 'ref'],
  Ledger:       ['id', 'groupId', 'date', 'type', 'category', 'amount', 'note', 'recordedBy', 'createdAt', 'updatedAt'],
  Debts:        ['id', 'memberId', 'groupId', 'creditor', 'kind', 'principal', 'rate', 'monthlyPayment', 'startDate', 'status', 'note', 'createdBy', 'createdAt', 'updatedAt'],
  DebtPayments: ['id', 'debtId', 'memberId', 'groupId', 'date', 'amount', 'note', 'recordedBy', 'createdAt'],
  Counsel:      ['id', 'memberId', 'groupId', 'date', 'topic', 'advice', 'nextDate', 'counselor', 'createdAt'],
  FAQ:          ['id', 'keywords', 'question', 'answer', 'order', 'active'],
  ChatLog:      ['id', 'time', 'who', 'role', 'question', 'source']
};

/** เวอร์ชันโครงสร้างตาราง — เพิ่มเลขเมื่อเพิ่มคอลัมน์ ระบบจะเติมคอลัมน์ที่ขาดให้เองตอนเปิดแอป */
var SCHEMA_VERSION = '2';

/** บัญชีเงินออมของสมาชิก (ชื่อแสดงผลเปลี่ยนได้ที่ ตั้งค่า) */
var ACCOUNTS = { savings: 'เงินออมรายเดือน', hajj: 'บัญชีอัลฮัจย์-อุมเราะห์' };

/** หมวดรายรับ-รายจ่ายของกลุ่ม */
var LEDGER_CATS = {
  income: { sales: 'รายได้จากการขายผลผลิต', share: 'ค่าหุ้น / เงินสัจจะ', support: 'เงินสนับสนุน / บริจาค', fee: 'ค่าธรรมเนียม / ค่าสมัคร', other: 'รายรับอื่น ๆ' },
  expense: { material: 'ค่าวัตถุดิบ / ต้นทุนการผลิต', wage: 'ค่าแรง', transport: 'ค่าขนส่ง / เดินทาง', welfare: 'สวัสดิการสมาชิก', dividend: 'ปันผลคืนสมาชิก', other: 'รายจ่ายอื่น ๆ' }
};

/** ประเภทหนี้ในคลินิกแก้หนี้ */
var DEBT_KINDS = {
  bank: 'ธนาคาร / ธ.ก.ส.', coop: 'สหกรณ์ / กองทุนหมู่บ้าน', card: 'บัตรเครดิต / สินเชื่อบุคคล', leasing: 'เช่าซื้อ / ไฟแนนซ์',
  student: 'กยศ.', informal: 'หนี้นอกระบบ', family: 'ญาติ / เพื่อน', other: 'อื่น ๆ'
};

/* ============================================================
 *  WEB APP ENTRY
 * ============================================================ */

function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SETUP_DONE')) {
    try {
      var lock = LockService.getScriptLock();
      lock.waitLock(60000);
      try { if (!props.getProperty('SETUP_DONE')) setup(); } finally { lock.releaseLock(); }
    } catch (err) {
      return HtmlService.createHtmlOutput('<div style="font-family:sans-serif;padding:30px;max-width:640px;margin:auto;line-height:1.7"><h2>ยังติดตั้งระบบไม่สำเร็จ</h2>' +
        '<p>เปิดโปรแกรมแก้ไข Apps Script เลือกฟังก์ชัน <b>setup</b> แล้วกด <b>▶ เรียกใช้</b> และอนุญาตสิทธิ์ให้ครบ จากนั้นรีเฟรชหน้านี้</p><p style="color:#8a2c20">' +
        String((err && err.message) || err).replace(/[<>&]/g, '') + '</p></div>').setTitle(APP_NAME).addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
  }
  try { ensureSchema_(); } catch (err) { }
  var tpl = HtmlService.createTemplateFromFile('App');
  tpl.cfg = safeJson_(publicConfig_());
  return tpl.evaluate()
    .setTitle(publicConfig_().appName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** ค่าตั้งต้นที่หน้าแอปใช้ก่อนเข้าสู่ระบบ (ไม่มีข้อมูลลับ) */
function publicConfig_() {
  var s = getSettings_();
  var base = '';
  try { base = ScriptApp.getService().getUrl(); } catch (err) { }
  return {
    appName: s.appName || APP_NAME,
    org: s.org || 'โครงการส่งเสริมการออมกลุ่มอาชีพ',
    botName: s.botName || 'น้องออม',
    phone: s.phone || '',
    themeColor: s.themeColor || '',
    accounts: accountLabels_(s),
    baseUrl: base
  };
}

function accountLabels_(s) {
  s = s || getSettings_();
  return { savings: s.acc_savings || ACCOUNTS.savings, hajj: s.acc_hajj || ACCOUNTS.hajj };
}

/** บัญชีของรายการเงินออม (รายการเก่าที่ไม่มีค่า = เงินออมรายเดือน) */
function accountOf_(t) { return ACCOUNTS[t.account] ? t.account : 'savings'; }

/** เติมคอลัมน์ใหม่ให้ฐานข้อมูลเดิมเมื่ออัปเดตโค้ด (ทำครั้งเดียวต่อเวอร์ชัน) */
function ensureSchema_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('SCHEMA_VER') === SCHEMA_VERSION) return;
  var ss = db_();
  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(ss, name); });
  _tableCache = {};
  props.setProperty('SCHEMA_VER', SCHEMA_VERSION);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function safeJson_(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029');
}

/* ============================================================
 *  SETUP — รันครั้งเดียวจากโปรแกรมแก้ไข (รันซ้ำได้ ไม่ลบข้อมูล)
 * ============================================================ */

function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = null, id = props.getProperty('DB_ID');
  if (id) ss = SpreadsheetApp.openById(id);
  if (!ss) { try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (err) { ss = null; } }
  if (!ss) ss = SpreadsheetApp.create(APP_NAME + ' — ฐานข้อมูล');
  props.setProperty('DB_ID', ss.getId());

  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(ss, name); });
  ['Sheet1', 'ชีต1', 'แผ่นงาน1'].forEach(function (n) {
    var def = ss.getSheetByName(n);
    if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  });

  if (readTable_('Users').length === 0) {
    var salt = Utilities.getUuid();
    insertRow_('Users', { id: newId_(), username: INITIAL_ADMIN_USERNAME, name: 'ผู้ดูแลระบบ', role: 'admin', groupId: '',
      passwordHash: hashPassword_(INITIAL_ADMIN_PASSWORD, salt), salt: salt, active: 'TRUE', lastLogin: '', createdAt: nowIso_() });
  }
  if (readTable_('Settings').length === 0) {
    [['appName', APP_NAME], ['org', 'โครงการส่งเสริมการออมกลุ่มอาชีพ'], ['botName', 'น้องออม'], ['aiEnabled', 'TRUE'], ['aiModel', 'gpt-4o-mini'], ['chatDailyLimit', '30']]
      .forEach(function (kv) { setSetting_(kv[0], kv[1]); });
  }
  seedFaq_();
  props.setProperty('SCHEMA_VER', SCHEMA_VERSION);
  props.setProperty('SETUP_DONE', nowIso_());
  Logger.log('ติดตั้งเสร็จ ฐานข้อมูล: ' + ss.getUrl());
  Logger.log('ผู้ดูแลเริ่มต้น: ' + INITIAL_ADMIN_USERNAME + ' (รหัสผ่านตามที่ตั้งใน Code.gs — เปลี่ยนทันทีหลังเข้าสู่ระบบ)');
  return ss.getUrl();
}

/** ลืมรหัสผ่านผู้ดูแล: รันฟังก์ชันนี้จากโปรแกรมแก้ไข → รหัสกลับเป็น INITIAL_ADMIN_PASSWORD */
function resetAdminPassword() {
  var u = readTable_('Users').filter(function (x) { return x.username === INITIAL_ADMIN_USERNAME; })[0];
  var salt = Utilities.getUuid();
  if (u) updateRow_('Users', { id: u.id, salt: salt, passwordHash: hashPassword_(INITIAL_ADMIN_PASSWORD, salt), active: 'TRUE', role: 'admin' });
  else insertRow_('Users', { id: newId_(), username: INITIAL_ADMIN_USERNAME, name: 'ผู้ดูแลระบบ', role: 'admin', groupId: '',
    passwordHash: hashPassword_(INITIAL_ADMIN_PASSWORD, salt), salt: salt, active: 'TRUE', lastLogin: '', createdAt: nowIso_() });
  Logger.log('รีเซ็ตรหัสผ่านผู้ใช้ ' + INITIAL_ADMIN_USERNAME + ' แล้ว');
}

function ensureSheet_(ss, name) {
  var headers = SCHEMA[name];
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = sh.getLastColumn();
  if (sh.getLastRow() === 0 || lastCol === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var existing = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var missing = headers.filter(function (h) { return existing.indexOf(h) === -1; });
    if (missing.length) sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
  var width = Math.max(headers.length, sh.getLastColumn());
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#e3efe9');
  sh.getRange(1, 1, sh.getMaxRows(), width).setNumberFormat('@');
  return sh;
}

/* ============================================================
 *  DATABASE HELPERS
 * ============================================================ */

var _ss = null;
function db_() {
  if (_ss) return _ss;
  var id = PropertiesService.getScriptProperties().getProperty('DB_ID');
  if (!id) throw new Error('ยังไม่ได้ติดตั้งระบบ (รัน setup ก่อน)');
  _ss = SpreadsheetApp.openById(id);
  return _ss;
}

function sheet_(name) {
  if (!SCHEMA[name]) throw new Error('ไม่รู้จักตาราง: ' + name);
  return db_().getSheetByName(name) || ensureSheet_(db_(), name);
}

function headers_(sh) {
  var c = sh.getLastColumn();
  return c ? sh.getRange(1, 1, 1, c).getValues()[0].map(String) : [];
}

var _tableCache = {};
function readTable_(name) {
  if (_tableCache[name]) return _tableCache[name].map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; return o; });
  var values = sheet_(name).getDataRange().getValues();
  var out = [];
  if (values.length >= 2) {
    var head = values[0].map(String);
    for (var r = 1; r < values.length; r++) {
      if (values[r].join('') === '') continue;
      var o = {};
      for (var c = 0; c < head.length; c++) {
        if (!head[c]) continue;
        var v = values[r][c];
        if (v instanceof Date) v = v.toISOString();
        o[head[c]] = v === null || v === undefined ? '' : String(v);
      }
      out.push(o);
    }
  }
  _tableCache[name] = out;
  return readTable_(name);
}

function rowIndex_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function toRow_(head, obj) {
  return head.map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

function insertRow_(name, obj) {
  var sh = sheet_(name), head = headers_(sh), target = sh.getLastRow() + 1;
  if (target > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 500);
  sh.getRange(target, 1, 1, head.length).setNumberFormat('@').setValues([toRow_(head, obj)]);
  delete _tableCache[name];
  return fill_(name, obj);
}

/** เพิ่มหลายแถวในครั้งเดียว (เร็วกว่าเพิ่มทีละแถวมาก) */
function appendRows_(name, objs) {
  if (!objs || !objs.length) return;
  var sh = sheet_(name), head = headers_(sh), start = sh.getLastRow() + 1;
  var need = start + objs.length - 1 - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need + 200);
  sh.getRange(start, 1, objs.length, head.length).setNumberFormat('@').setValues(objs.map(function (o) { return toRow_(head, o); }));
  delete _tableCache[name];
}

function updateRow_(name, obj) {
  var sh = sheet_(name), head = headers_(sh), idx = rowIndex_(sh, obj[head[0]]);
  if (idx === -1) return insertRow_(name, obj);
  var cur = sh.getRange(idx, 1, 1, head.length).getValues()[0], merged = {};
  head.forEach(function (h, i) { merged[h] = cur[i]; });
  Object.keys(obj).forEach(function (k) { if (head.indexOf(k) !== -1) merged[k] = obj[k]; });
  sh.getRange(idx, 1, 1, head.length).setNumberFormat('@').setValues([toRow_(head, merged)]);
  delete _tableCache[name];
  var out = {};
  head.forEach(function (h) { out[h] = merged[h] === undefined || merged[h] === null ? '' : String(merged[h]); });
  return fill_(name, out);
}

function deleteRow_(name, id) {
  var sh = sheet_(name), idx = rowIndex_(sh, id);
  if (idx === -1) return false;
  sh.deleteRow(idx);
  delete _tableCache[name];
  return true;
}

function getRow_(name, id) {
  var rows = readTable_(name), k = SCHEMA[name][0];
  for (var i = 0; i < rows.length; i++) if (String(rows[i][k]) === String(id)) return rows[i];
  return null;
}

function fill_(name, obj) {
  var o = {};
  SCHEMA[name].forEach(function (f) { o[f] = obj[f] === undefined || obj[f] === null ? '' : String(obj[f]); });
  return o;
}

function getSettings_() {
  var out = {};
  readTable_('Settings').forEach(function (r) { out[r.key] = r.value; });
  return out;
}

function setSetting_(key, value) { updateRow_('Settings', { key: key, value: value == null ? '' : String(value) }); }

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ============================================================
 *  AUTH — เจ้าหน้าที่ (ชื่อผู้ใช้/รหัสผ่าน) และสมาชิก (รหัสสมาชิก/PIN)
 *  role: admin = ผู้ดูแลทุกกลุ่ม, officer = เจ้าหน้าที่/เหรัญญิกประจำกลุ่ม, member = สมาชิก
 * ============================================================ */

function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '::' + password, Utilities.Charset.UTF_8);
  return raw.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function checkLockout_(key) {
  var cache = CacheService.getScriptCache();
  if (Number(cache.get('fail_' + key) || 0) >= 5) throw new Error('กรอกรหัสผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่');
  if (Number(cache.get('fail_all') || 0) >= 80) throw new Error('มีการเข้าสู่ระบบผิดจำนวนมาก กรุณาลองใหม่ภายหลัง');
}

function recordFail_(key) {
  var cache = CacheService.getScriptCache();
  cache.put('fail_' + key, String(Number(cache.get('fail_' + key) || 0) + 1), 900);
  cache.put('fail_all', String(Number(cache.get('fail_all') || 0) + 1), 600);
}

function newSession_(sess) {
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('s_' + token, JSON.stringify(sess), SESSION_TTL);
  return token;
}

/** เข้าสู่ระบบเจ้าหน้าที่ */
function staffLogin(username, password) {
  username = String(username || '').trim().toLowerCase();
  password = String(password || '');
  if (!username || !password) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  var key = 'u_' + username.replace(/[^a-z0-9._-]/g, '');
  checkLockout_(key);
  var u = readTable_('Users').filter(function (x) { return String(x.username).toLowerCase() === username; })[0];
  if (!u || hashPassword_(password, u.salt) !== u.passwordHash) { recordFail_(key); throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); }
  if (!isTrue_(u.active)) throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
  CacheService.getScriptCache().remove('fail_' + key);
  updateRow_('Users', { id: u.id, lastLogin: nowIso_() });
  var sess = { kind: 'staff', id: u.id, role: u.role === 'admin' ? 'admin' : 'officer', groupId: u.role === 'admin' ? '' : u.groupId, name: u.name, username: u.username };
  return { token: newSession_(sess), user: sess };
}

/** เข้าสู่ระบบสมาชิก (รหัสสมาชิก + PIN) */
function memberLogin(memberNo, pin) {
  memberNo = String(memberNo || '').trim();
  pin = String(pin || '');
  if (!memberNo || !pin) throw new Error('กรุณากรอกรหัสสมาชิกและ PIN');
  var key = 'm_' + memberNo.toLowerCase().replace(/[^a-z0-9ก-๙_-]/g, '');
  checkLockout_(key);
  var m = readTable_('Members').filter(function (x) { return String(x.memberNo).trim().toLowerCase() === memberNo.toLowerCase(); })[0];
  if (!m || !m.pinHash || hashPassword_(pin, m.salt) !== m.pinHash) { recordFail_(key); throw new Error('รหัสสมาชิกหรือ PIN ไม่ถูกต้อง'); }
  if (!isTrue_(m.active)) throw new Error('บัญชีนี้ถูกระงับ กรุณาติดต่อเจ้าหน้าที่กลุ่ม');
  CacheService.getScriptCache().remove('fail_' + key);
  updateRow_('Members', { id: m.id, lastLogin: nowIso_() });
  var sess = { kind: 'member', id: m.id, role: 'member', groupId: m.groupId, name: m.name, memberNo: m.memberNo };
  return { token: newSession_(sess), user: sess };
}

function logout(token) {
  try { CacheService.getScriptCache().remove('s_' + token); } catch (err) { }
  return true;
}

/** ตรวจ token → ข้อมูลผู้ใช้ (โยน error ถ้าไม่ผ่าน) */
function requireSession_(token, roles) {
  if (!token || !/^[a-zA-Z0-9-]{20,100}$/.test(String(token))) throw new Error('AUTH: กรุณาเข้าสู่ระบบ');
  var cache = CacheService.getScriptCache();
  var raw = cache.get('s_' + token);
  if (!raw) throw new Error('AUTH: หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่');
  var s = JSON.parse(raw);
  var rec = s.kind === 'member' ? getRow_('Members', s.id) : getRow_('Users', s.id);
  if (!rec || !isTrue_(rec.active)) { cache.remove('s_' + token); throw new Error('AUTH: บัญชีนี้ถูกระงับการใช้งาน'); }
  if (s.kind === 'member') s.groupId = rec.groupId;
  else if (s.role === 'officer') s.groupId = rec.groupId;
  cache.put('s_' + token, JSON.stringify(s), SESSION_TTL);
  if (roles && roles.indexOf(s.role) === -1) throw new Error('ไม่มีสิทธิ์ทำรายการนี้');
  return s;
}

/* ============================================================
 *  UTILITIES
 * ============================================================ */

function newId_() { return Utilities.getUuid().replace(/-/g, '').substr(0, 12); }
function nowIso_() { return new Date().toISOString(); }
function todayIso_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'); }
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE' || v === '1' || v === 1; }

function num_(v) {
  var n = Number(String(v == null ? '' : v).replace(/[, ]/g, ''));
  return isNaN(n) ? NaN : Math.round(n * 100) / 100;
}

function money_(v) { return (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('en-US'); }

function normDate_(v) {
  var s = String(v || '').substr(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function text_(v, max) { return String(v == null ? '' : v).trim().substr(0, max || 300); }

/**
 * ============================================================
 *  เว็บไซต์ห้อง Micro Teaching — ตัวเชื่อมฐานข้อมูล Google Sheet
 * ------------------------------------------------------------
 *  สคริปต์นี้ไม่มีหน้าเว็บ ทำหน้าที่อ่าน/เขียน Google Sheet ให้เว็บไซต์ (website/index.html)
 *  เว็บไซต์ส่งคำขอมาที่ doPost แล้วได้ผลลัพธ์กลับเป็น JSON
 *
 *  ไฟล์นี้ : การตั้งค่า โครงสร้างตาราง doPost/doGet setup ตัวช่วยฐานข้อมูล
 *           การเข้าสู่ระบบเจ้าหน้าที่ และเครื่องมือทั่วไป
 *  Api.gs  : ฟังก์ชันหน้าเว็บสาธารณะ (จองห้อง ตารางห้อง ตรวจสถานะ คำร้อง ประเมิน)
 *  Admin.gs: ฟังก์ชันระบบหลังบ้าน (อนุมัติ เช็กอิน อุปกรณ์ เนื้อหา ผู้ใช้ รายงาน)
 *  Seed.gs : ข้อมูลเริ่มต้น (เนื้อหาหน้าเว็บ ห้อง อุปกรณ์ เอกสาร)
 * ============================================================
 */

/**
 * Google Sheet ที่ใช้เป็นฐานข้อมูล
 * https://docs.google.com/spreadsheets/d/1tRRr3d_jFhzs5ndiHIjJxHqPfECoblhbqXWtCPBh8js/edit
 * ระบบสร้างแท็บ Bookings, Rooms, ... ในชีตนี้ให้เองตอนรัน setup
 */
var SHEET_ID = '1tRRr3d_jFhzs5ndiHIjJxHqPfECoblhbqXWtCPBh8js';

/** ผู้ดูแลเริ่มต้น (สร้างตอนรัน setup ครั้งแรกเท่านั้น) — เปลี่ยนรหัสก่อนรัน setup และเปลี่ยนอีกครั้งหลังเข้าสู่ระบบ */
var INITIAL_ADMIN_USERNAME = 'admin';
var INITIAL_ADMIN_PASSWORD = 'ChangeMe@2569';

/** ชื่อระบบ (แก้ได้ภายหลังในหน้า ตั้งค่า) */
var APP_NAME = 'ห้อง Micro Teaching';

/** อายุการเข้าสู่ระบบ (วินาที) สูงสุด 21600 = 6 ชั่วโมง */
var SESSION_TTL = 21600;

/**
 * โครงสร้างตาราง (ชีต) — คอลัมน์แรกคือคีย์หลักเสมอ
 * ทุกค่าเก็บเป็นข้อความ เพื่อกัน Google Sheets แปลงเบอร์โทร/วันที่/เวลาเอง
 */
var SCHEMA = {
  Settings:    ['key', 'value'],
  Users:       ['id', 'username', 'name', 'role', 'email', 'phone', 'passwordHash', 'salt', 'active', 'lastLogin', 'createdAt'],
  Rooms:       ['id', 'code', 'name', 'building', 'floor', 'capacity', 'kind', 'description', 'features', 'image', 'color', 'bookable', 'active', 'order', 'createdAt', 'updatedAt'],
  Equipment:   ['id', 'code', 'name', 'category', 'roomId', 'qty', 'status', 'serial', 'acquired', 'lendable', 'note', 'updatedAt'],
  Bookings:    ['id', 'code', 'roomId', 'date', 'start', 'end', 'title', 'purpose', 'userType', 'name', 'studentId', 'faculty', 'major', 'phone', 'email',
                'course', 'advisor', 'participants', 'equipment', 'record', 'support', 'note', 'status', 'staffNote', 'videoUrl', 'series', 'source',
                'checkinAt', 'checkoutAt', 'condition', 'decidedBy', 'decidedAt', 'cancelReason', 'createdAt', 'updatedAt'],
  Requests:    ['id', 'code', 'type', 'name', 'userType', 'studentId', 'faculty', 'phone', 'email', 'subject', 'detail', 'refCode', 'needDate', 'link',
                'status', 'response', 'handledBy', 'createdAt', 'updatedAt'],
  Feedback:    ['id', 'bookingId', 'bookingCode', 'roomId', 'userType', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'comment', 'createdAt'],
  Evaluations: ['id', 'bookingId', 'bookingCode', 'evaluator', 'role', 'skill', 'scores', 'avg', 'strengths', 'improve', 'createdAt'],
  Closures:    ['id', 'date', 'endDate', 'roomId', 'start', 'end', 'reason', 'createdAt'],
  Pages:       ['key', 'title', 'icon', 'body', 'order', 'inMenu', 'updatedAt'],
  News:        ['id', 'title', 'body', 'date', 'pinned', 'active', 'createdAt'],
  Docs:        ['id', 'title', 'category', 'url', 'description', 'order', 'active'],
  Log:         ['id', 'time', 'who', 'action', 'target', 'detail']
};

/** เวอร์ชันโครงสร้างตาราง — เพิ่มเลขเมื่อเพิ่มคอลัมน์ ระบบจะเติมคอลัมน์ที่ขาดให้เองเมื่อมีการเรียกใช้ครั้งแรก */
var SCHEMA_VERSION = '1';

/** สถานะการจอง */
var BOOKING_STATUS = {
  pending:   'รออนุมัติ',
  approved:  'อนุมัติแล้ว',
  checkedin: 'กำลังใช้ห้อง',
  completed: 'ใช้งานเสร็จสิ้น',
  rejected:  'ไม่อนุมัติ',
  cancelled: 'ยกเลิก',
  noshow:    'ไม่มาใช้ห้อง'
};
/** สถานะที่ถือว่า "ครองเวลา" ห้อง (ใช้ตรวจเวลาซ้อน) */
var ACTIVE_STATUS = ['pending', 'approved', 'checkedin', 'completed'];

/** วัตถุประสงค์การใช้ห้อง */
var PURPOSES = {
  practice:  'ฝึกทักษะการสอนแบบจุลภาค (Micro Teaching)',
  course:    'จัดการเรียนการสอนตามรายวิชา',
  exam:      'สอบ / ประเมินทักษะการสอน',
  record:    'บันทึกวิดีโอการสอน / ผลิตสื่อ',
  practicum: 'เตรียมฝึกประสบการณ์วิชาชีพครู',
  training:  'อบรม / สัมมนา / Workshop',
  research:  'วิจัยในชั้นเรียน / เก็บข้อมูลวิจัย',
  other:     'อื่น ๆ'
};

/** ประเภทผู้ขอใช้ */
var USER_TYPES = { student: 'นักศึกษา', lecturer: 'อาจารย์', staff: 'บุคลากร', external: 'บุคคลภายนอก / หน่วยงานภายนอก' };

/** ประเภทคำร้อง (หน้า แบบฟอร์ม/คำร้อง) */
var REQUEST_TYPES = {
  overtime: 'ขอใช้ห้องนอกเวลาราชการ / วันหยุด',
  borrow:   'ขอยืมอุปกรณ์ออกนอกห้อง',
  video:    'ขอสำเนาไฟล์วิดีโอการสอน',
  support:  'ขอเจ้าหน้าที่ช่วยถ่ายทำ / ตัดต่อ',
  repair:   'แจ้งอุปกรณ์ชำรุด / ปัญหาการใช้งาน',
  training: 'ขออบรมการใช้งานห้องและอุปกรณ์',
  other:    'คำร้องอื่น ๆ / ข้อเสนอแนะ'
};
var REQUEST_STATUS = { new: 'รับเรื่องแล้ว', progress: 'กำลังดำเนินการ', done: 'ดำเนินการเสร็จ', rejected: 'ไม่สามารถดำเนินการได้' };

/** สถานะอุปกรณ์ */
var EQUIP_STATUS = { ready: 'พร้อมใช้', inuse: 'ถูกยืม / ใช้งานอยู่', repair: 'ส่งซ่อม', broken: 'ชำรุด', retired: 'จำหน่ายแล้ว' };

/** ข้อคำถามความพึงพอใจ (คะแนน 1–5) */
var FEEDBACK_ITEMS = [
  'ความสะดวกของขั้นตอนการจองห้อง',
  'ความพร้อมและความสะอาดของห้อง',
  'ความพร้อมของอุปกรณ์ (จอ/กล้อง/เสียง)',
  'การให้บริการของเจ้าหน้าที่',
  'คุณภาพไฟล์วิดีโอ / การบันทึกการสอน',
  'ความพึงพอใจโดยรวม'
];

/**
 * ทักษะการสอน 10 ทักษะ สำหรับแบบประเมินการสอนแบบจุลภาค
 * (อ้างอิงกลุ่มทักษะของ Allen & Ryan, Stanford 1969 และที่ใช้ในหลักสูตรครุศาสตร์ไทย)
 * แต่ละทักษะมีพฤติกรรมบ่งชี้ 4 ข้อ ให้คะแนน 1–5
 */
var SKILLS = [
  { key: 'induction', name: 'ทักษะการนำเข้าสู่บทเรียน', items: ['เร้าความสนใจได้ตรงเนื้อหา', 'เชื่อมโยงความรู้เดิมกับความรู้ใหม่', 'บอกจุดประสงค์การเรียนรู้ชัดเจน', 'ใช้เวลาเหมาะสม (2–5 นาที)'] },
  { key: 'explain', name: 'ทักษะการอธิบายและการยกตัวอย่าง', items: ['ลำดับเนื้อหาเป็นขั้นตอน', 'ใช้ภาษาชัดเจน ถูกต้อง', 'ยกตัวอย่างที่ใกล้ตัวผู้เรียน', 'ตรวจสอบความเข้าใจระหว่างอธิบาย'] },
  { key: 'question', name: 'ทักษะการใช้คำถาม', items: ['ใช้คำถามหลายระดับ (จำ–วิเคราะห์–สร้างสรรค์)', 'ให้เวลาคิด (wait time) เพียงพอ', 'กระจายคำถามทั่วถึง', 'ใช้คำถามขยาย/ต่อยอดคำตอบ'] },
  { key: 'reinforce', name: 'ทักษะการเสริมกำลังใจ', items: ['ชมเชยด้วยวาจาอย่างเฉพาะเจาะจง', 'ใช้ท่าทาง/สีหน้าเชิงบวก', 'เสริมแรงทันทีและเหมาะสม', 'ไม่ใช้การเสริมแรงซ้ำซากจนเฝือ'] },
  { key: 'variation', name: 'ทักษะการเร้าความสนใจ (เปลี่ยนสิ่งเร้า)', items: ['เคลื่อนไหวในชั้นเรียนอย่างเป็นธรรมชาติ', 'เปลี่ยนระดับ/จังหวะเสียง', 'เปลี่ยนรูปแบบปฏิสัมพันธ์ (ครู–นักเรียน–กลุ่ม)', 'ใช้ประสาทสัมผัสหลายช่องทาง'] },
  { key: 'media', name: 'ทักษะการใช้สื่อและเทคโนโลยี', items: ['สื่อสอดคล้องกับจุดประสงค์', 'ใช้จออินเทอร์แอกทีฟ/เครื่องฉายได้คล่อง', 'สื่อชัดเจน มองเห็นทั่วห้อง', 'ใช้สื่อในจังหวะที่เหมาะสม'] },
  { key: 'board', name: 'ทักษะการใช้กระดาน / การนำเสนอ', items: ['เขียน/จัดวางเป็นระเบียบ อ่านง่าย', 'ไม่ยืนบังกระดาน', 'เน้นคำสำคัญด้วยสี/สัญลักษณ์', 'ลายมือ/ตัวอักษรขนาดเหมาะสม'] },
  { key: 'manage', name: 'ทักษะการจัดการชั้นเรียน', items: ['สร้างบรรยากาศเชิงบวก', 'ดูแลผู้เรียนได้ทั่วถึง', 'จัดการพฤติกรรมไม่พึงประสงค์อย่างเหมาะสม', 'บริหารเวลาตามแผน'] },
  { key: 'activity', name: 'ทักษะการจัดกิจกรรมการเรียนรู้เชิงรุก', items: ['ผู้เรียนมีส่วนร่วมลงมือทำ', 'คำสั่ง/ขั้นตอนกิจกรรมชัดเจน', 'ส่งเสริมการคิดและการทำงานร่วมกัน', 'ประเมินระหว่างเรียน (formative)'] },
  { key: 'closure', name: 'ทักษะการสรุปบทเรียน', items: ['สรุปประเด็นสำคัญครบถ้วน', 'ให้ผู้เรียนมีส่วนร่วมในการสรุป', 'เชื่อมโยงสู่การนำไปใช้/บทเรียนต่อไป', 'ใช้เวลาเหมาะสม'] }
];

/* ============================================================
 *  API — จุดเชื่อมต่อของเว็บไซต์
 * ============================================================ */

/**
 * ฟังก์ชันที่เว็บไซต์เรียกได้ (นอกเหนือจากนี้เรียกไม่ได้)
 * ฟังก์ชันหลังบ้านทุกตัวตรวจ token ของเจ้าหน้าที่อีกชั้นหนึ่ง
 */
function apiFunctions_() {
  return {
    getPublicData: getPublicData, getSchedule: getSchedule, submitBooking: submitBooking, checkBooking: checkBooking, cancelBooking: cancelBooking,
    submitFeedback: submitFeedback, getEvalTarget: getEvalTarget, submitEvaluation: submitEvaluation, submitRequest: submitRequest,
    checkRequest: checkRequest, getDisplay: getDisplay,
    staffLogin: staffLogin, logout: logout, getAdminData: getAdminData, saveBooking: saveBooking, setBookingStatus: setBookingStatus,
    approveMany: approveMany, deleteBooking: deleteBooking, updateRequest: updateRequest, saveItem: saveItem, deleteItem: deleteItem,
    saveUser: saveUser, deleteUser: deleteUser, changePassword: changePassword, saveSettings: saveSettings, testEmail: testEmail
  };
}

/** ติดตั้งอัตโนมัติถ้ายังไม่ได้รัน setup */
function ensureReady_() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SETUP_DONE')) {
    var lock = LockService.getScriptLock();
    lock.waitLock(60000);
    try { if (!props.getProperty('SETUP_DONE')) setup(); } finally { lock.releaseLock(); }
  }
  try { ensureSchema_(); } catch (err) { }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** เว็บไซต์ส่งคำขอมาที่นี่: body = {"fn": "ชื่อฟังก์ชัน", "args": [...]} */
function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fns = apiFunctions_();
    if (!req.fn || !Object.prototype.hasOwnProperty.call(fns, req.fn)) throw new Error('ไม่รู้จักคำสั่ง');
    ensureReady_();
    var args = Array.isArray(req.args) ? req.args.slice(0, 5) : [];
    return json_({ ok: true, data: fns[req.fn].apply(null, args) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/** เปิดลิงก์ /exec ในเบราว์เซอร์เพื่อทดสอบการเชื่อมต่อ (ไม่มีหน้าเว็บ) */
function doGet() {
  try {
    ensureReady_();
    var s = getSettings_();
    return json_({ ok: true, message: 'เชื่อมต่อฐานข้อมูลสำเร็จ — นำลิงก์นี้ไปใส่ API_URL ในไฟล์ website/config.js', name: s.appName || APP_NAME, sheet: db_().getUrl(), site: s.siteUrl || '' });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err), help: 'เปิดโปรแกรมแก้ไข Apps Script เลือกฟังก์ชัน setup แล้วกด ▶ เรียกใช้ และอนุญาตสิทธิ์' });
  }
}

/** ค่าที่ใช้สร้างลิงก์ในอีเมล */
function publicConfig_() {
  var s = getSettings_();
  return { appName: s.appName || APP_NAME, org: s.org || '', baseUrl: String(s.siteUrl || '').split('#')[0].split('?')[0] };
}

/** กฎการจอง (ค่าเริ่มต้น + ค่าจากหน้า ตั้งค่า) */
function rules_(s) {
  s = s || getSettings_();
  var n = function (k, d) { var v = Number(s[k]); return isNaN(v) || s[k] === '' || s[k] == null ? d : v; };
  return {
    openTime: /^\d{2}:\d{2}$/.test(s.openTime || '') ? s.openTime : '08:30',
    closeTime: /^\d{2}:\d{2}$/.test(s.closeTime || '') ? s.closeTime : '16:30',
    openDays: String(s.openDays || '1,2,3,4,5').split(',').map(function (x) { return Number(x); }).filter(function (x) { return x >= 0 && x <= 6; }),
    slotMinutes: n('slotMinutes', 30),
    minLeadHours: n('minLeadHours', 24),
    maxAdvanceDays: n('maxAdvanceDays', 60),
    maxHours: n('maxHours', 3),
    maxActivePerPerson: n('maxActivePerPerson', 3),
    bufferMinutes: n('bufferMinutes', 0),
    autoApprove: isTrue_(s.autoApprove),
    requireAdvisor: s.requireAdvisor === undefined || s.requireAdvisor === '' ? true : isTrue_(s.requireAdvisor),
    showNames: isTrue_(s.showNames)
  };
}

/** เติมคอลัมน์ใหม่ให้ฐานข้อมูลเดิมเมื่ออัปเดตโค้ด (ทำครั้งเดียวต่อเวอร์ชัน) */
function ensureSchema_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('SCHEMA_VER') === SCHEMA_VERSION) return;
  var ss = db_();
  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(ss, name); });
  _tableCache = {};
  props.setProperty('SCHEMA_VER', SCHEMA_VERSION);
}

function safeJson_(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029');
}

/* ============================================================
 *  SETUP — รันครั้งเดียวจากโปรแกรมแก้ไข (รันซ้ำได้ ไม่ลบข้อมูล)
 * ============================================================ */

function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = null, id = SHEET_ID || props.getProperty('DB_ID');
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
    insertRow_('Users', { id: newId_(), username: INITIAL_ADMIN_USERNAME, name: 'ผู้ดูแลระบบ', role: 'admin', email: '', phone: '',
      passwordHash: hashPassword_(INITIAL_ADMIN_PASSWORD, salt), salt: salt, active: 'TRUE', lastLogin: '', createdAt: nowIso_() });
  }
  seedSettings_();
  seedPages_();
  seedRooms_();
  seedDocs_();
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
  else insertRow_('Users', { id: newId_(), username: INITIAL_ADMIN_USERNAME, name: 'ผู้ดูแลระบบ', role: 'admin', email: '', phone: '',
    passwordHash: hashPassword_(INITIAL_ADMIN_PASSWORD, salt), salt: salt, active: 'TRUE', lastLogin: '', createdAt: nowIso_() });
  Logger.log('รีเซ็ตรหัสผ่านผู้ใช้ ' + INITIAL_ADMIN_USERNAME + ' แล้ว');
}

/**
 * (ไม่บังคับ) ตั้งเวลาให้ระบบส่งอีเมลเตือนผู้จองล่วงหน้า 1 วัน ทุกวันเวลาประมาณ 16:00
 * รันฟังก์ชันนี้ครั้งเดียวจากโปรแกรมแก้ไข
 */
function installDailyReminder() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sendDailyReminders') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendDailyReminders').timeBased().everyDays(1).atHour(16).create();
  Logger.log('ตั้งเวลาเตือนรายวันแล้ว');
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
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#fbe3ee');
  sh.getRange(1, 1, sh.getMaxRows(), width).setNumberFormat('@');
  return sh;
}

/* ============================================================
 *  DATABASE HELPERS
 * ============================================================ */

var _ss = null;
function db_() {
  if (_ss) return _ss;
  var id = SHEET_ID || PropertiesService.getScriptProperties().getProperty('DB_ID');
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

function log_(who, action, target, detail) {
  try { insertRow_('Log', { id: newId_(), time: nowIso_(), who: who || '-', action: action, target: target || '', detail: text_(detail, 300) }); } catch (err) { }
}

/* ============================================================
 *  AUTH — เจ้าหน้าที่ (ชื่อผู้ใช้/รหัสผ่าน)
 *  role: admin = ผู้ดูแลระบบ (ทุกเมนู), staff = เจ้าหน้าที่ประจำห้อง (อนุมัติ เช็กอิน อุปกรณ์ คำร้อง)
 *  ผู้ใช้ทั่วไป (นักศึกษา/อาจารย์) ไม่ต้องเข้าสู่ระบบ — ใช้ "รหัสการจอง + เบอร์โทรหรืออีเมล" ติดตามรายการ
 * ============================================================ */

function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '::' + password, Utilities.Charset.UTF_8);
  return raw.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function checkLockout_(key) {
  var cache = CacheService.getScriptCache();
  if (Number(cache.get('fail_' + key) || 0) >= 5) throw new Error('กรอกข้อมูลผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่');
  if (Number(cache.get('fail_all') || 0) >= 80) throw new Error('มีการกรอกผิดจำนวนมาก กรุณาลองใหม่ภายหลัง');
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
  var sess = { id: u.id, role: u.role === 'admin' ? 'admin' : 'staff', name: u.name, username: u.username };
  log_(u.username, 'login', '', '');
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
  var rec = getRow_('Users', s.id);
  if (!rec || !isTrue_(rec.active)) { cache.remove('s_' + token); throw new Error('AUTH: บัญชีนี้ถูกระงับการใช้งาน'); }
  s.role = rec.role === 'admin' ? 'admin' : 'staff';
  s.name = rec.name;
  cache.put('s_' + token, JSON.stringify(s), SESSION_TTL);
  if (roles && roles.indexOf(s.role) === -1) throw new Error('ไม่มีสิทธิ์ทำรายการนี้ (เฉพาะผู้ดูแลระบบ)');
  return s;
}

/* ============================================================
 *  UTILITIES
 * ============================================================ */

function newId_() { return Utilities.getUuid().replace(/-/g, '').substr(0, 12); }
function nowIso_() { return new Date().toISOString(); }
function todayIso_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'); }
function nowLocal_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'); }
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE' || v === '1' || v === 1; }

function num_(v) {
  var n = Number(String(v == null ? '' : v).replace(/[, ]/g, ''));
  return isNaN(n) ? NaN : Math.round(n * 100) / 100;
}

function normDate_(v) {
  var s = String(v || '').substr(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var d = new Date(s + 'T00:00:00Z');
  return isNaN(d.getTime()) || d.toISOString().substr(0, 10) !== s ? '' : s;
}

function normTime_(v) {
  var m = String(v || '').trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return '';
  var h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return '';
  return ('0' + h).slice(-2) + ':' + ('0' + mi).slice(-2);
}

function minutes_(t) { var p = String(t).split(':'); return Number(p[0]) * 60 + Number(p[1]); }
function hhmm_(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }

/** วันในสัปดาห์ของวันที่ YYYY-MM-DD (0 = อาทิตย์) */
function dow_(date) { return new Date(date + 'T00:00:00Z').getUTCDay(); }

function addDays_(date, n) {
  var d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().substr(0, 10);
}

function daysBetween_(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }

function text_(v, max) { return String(v == null ? '' : v).trim().substr(0, max || 300); }

function phoneDigits_(v) { return String(v || '').replace(/\D/g, ''); }

function validEmail_(v) { return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(v || '')); }

function safeUrl_(v) {
  var s = text_(v, 500);
  return /^https:\/\/[^\s<>"']+$/i.test(s) ? s : '';
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

var THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
var THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/** 2026-11-12 → วันพฤหัสบดีที่ 12 พฤศจิกายน 2569 */
function thaiDate_(date) {
  if (!normDate_(date)) return String(date || '');
  var p = date.split('-');
  return 'วัน' + THAI_DAYS[dow_(date)] + 'ที่ ' + Number(p[2]) + ' ' + THAI_MONTHS[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
}

/** สร้างรหัสอ้างอิงที่เดายาก เช่น MT6911-K7Q2 */
function newCode_(prefix, table) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var ym = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM').split('-');
  var head = prefix + String(Number(ym[0]) + 543).substr(2) + ym[1] + '-';
  var used = {};
  readTable_(table).forEach(function (r) { used[r.code] = 1; });
  for (var tries = 0; tries < 50; tries++) {
    var c = head;
    for (var i = 0; i < 4; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    if (!used[c]) return c;
  }
  return head + newId_().toUpperCase();
}

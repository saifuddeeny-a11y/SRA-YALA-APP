/**
 * YRU Teacher Hub — แฟ้มสะสมผลงานประเมิน + ห้องเรียนออนไลน์ (Google Apps Script)
 * อาจารย์ซัยฟุดดีน แยนา · คณะครุศาสตร์ มหาวิทยาลัยราชภัฏยะลา
 *
 * ติดตั้ง 3 ขั้นตอน
 * 1) เปิด Google Sheets > ส่วนขยาย > Apps Script
 * 2) วางโค้ดไฟล์นี้ทับ Code.gs และสร้างไฟล์ HTML ชื่อ Index แล้ววางโค้ด Index.html > บันทึก
 * 3) ทำให้ใช้งานได้ > การทำให้ใช้งานได้รายการใหม่ > เว็บแอป
 *    ดำเนินการในฐานะ: ฉัน | ผู้มีสิทธิ์เข้าถึง: ทุกคน > ทำให้ใช้งานได้ > อนุญาตสิทธิ์
 * เปิด URL เว็บแอป ระบบสร้างชีตและโฟลเดอร์ให้อัตโนมัติ · รหัสอาจารย์เริ่มต้น Yru@2570
 * (แก้โค้ดครั้งต่อไป: จัดการการทำให้ใช้งานได้ > แก้ไข > เวอร์ชันใหม่)
 */

var SHEETS = {
  SETTINGS: 'Settings', PERIODS: 'Periods', INDICATORS: 'Indicators',
  WORKS: 'Works', EVIDENCE: 'Evidence', SCORES: 'Scores', AILOG: 'AI_Log', LOG: 'Log'
};

var HEADERS = {
  Settings: ['key', 'value', 'description'],
  Periods: ['id', 'label', 'start', 'end'],
  Indicators: ['code', 'section', 'sectionName', 'name', 'unit', 'mode', 'w_adm', 'w_tch', 'w_res', 'w_svc', 'levels', 'evidenceHint', 'page'],
  Works: ['id', 'period', 'code', 'title', 'workDate', 'detail', 'claimLevel', 'items', 'value', 'share', 'role', 'carry', 'status', 'createdAt', 'updatedAt', 'by'],
  Evidence: ['id', 'workId', 'type', 'title', 'docNo', 'docDate', 'url', 'fileId', 'fileName', 'mime', 'size', 'createdAt', 'by'],
  Scores: ['period', 'code', 'finalLevel', 'note', 'by', 'at'],
  AI_Log: ['period', 'code', 'at', 'provider', 'result'],
  Log: ['at', 'user', 'action', 'detail'],
  Courses: ['id', 'code', 'title', 'description', 'term', 'enrollCode', 'color', 'status', 'createdAt'],
  Lessons: ['id', 'courseId', 'order', 'title', 'content', 'videoUrl', 'files', 'published', 'createdAt'],
  Items: ['id', 'courseId', 'lessonId', 'order', 'type', 'title', 'instructions', 'maxScore', 'dueDate', 'quiz', 'published', 'createdAt'],
  Students: ['id', 'studentId', 'name', 'email', 'program', 'salt', 'passHash', 'status', 'createdAt', 'lastLogin'],
  Enrollments: ['id', 'courseId', 'sid', 'createdAt'],
  Submissions: ['id', 'itemId', 'courseId', 'sid', 'text', 'files', 'answers', 'autoScore', 'score', 'feedback', 'status', 'submittedAt', 'gradedAt', 'qScores', 'editCount'],
  Progress: ['sid', 'lessonId', 'courseId', 'at']
};

var DEFAULT_SETTINGS = [
  ['SYSTEM_NAME', 'แฟ้มสะสมผลงานประเมินผลการปฏิบัติราชการ ตำแหน่งวิชาการ', 'ชื่อระบบ'],
  ['OWNER_NAME', 'อาจารย์ซัยฟุดดีน แยนา', 'ชื่อผู้รับการประเมิน'],
  ['POSITION', '', 'ตำแหน่ง'],
  ['FACULTY', 'คณะครุศาสตร์ มหาวิทยาลัยราชภัฏยะลา', 'สังกัด/คณะ'],
  ['EVALUATOR', '', 'ผู้บังคับบัญชา/ผู้ประเมิน'],
  ['PREFERRED_GROUP', 'tch', 'กลุ่มที่เลือกรับการประเมิน adm|tch|res|svc'],
  ['ACTIVE_PERIOD', '2570-1', 'รอบการประเมินปัจจุบัน (id ในชีต Periods)'],
  ['ADMIN_EMAILS', '', 'อีเมลผู้ดูแล คั่นด้วยจุลภาค'],
  ['FILE_SHARING', 'domain', 'สิทธิ์ไฟล์หลักฐาน: domain | anyone | private'],
  ['DRIVE_FOLDER_ID', '', 'โฟลเดอร์เก็บหลักฐาน (สร้างอัตโนมัติ)'],
  ['AI_PROVIDER', 'none', 'none | anthropic | gemini'],
  ['AI_MODEL', '', 'ชื่อโมเดล AI ที่บัญชีของคุณใช้ได้']
];

var DEFAULT_PERIODS = [
  ['2569-2', 'ปีงบ 2569 ครั้งที่ 2 (1 เม.ย. 2569 – 30 ก.ย. 2569)', '2026-04-01', '2026-09-30'],
  ['2570-1', 'ปีงบ 2570 ครั้งที่ 1 (1 ต.ค. 2569 – 31 มี.ค. 2570)', '2026-10-01', '2027-03-31'],
  ['2570-2', 'ปีงบ 2570 ครั้งที่ 2 (1 เม.ย. 2570 – 30 ก.ย. 2570)', '2027-04-01', '2027-09-30']
];

/* ============================ Web entry ============================ */

function doGet() {
  autoInit_();
  var t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('ห้องเรียนออนไลน์ ' + (getSetting_('OWNER_NAME') || ''))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function onOpen() {
  SpreadsheetApp.getUi().createMenu('ระบบประเมิน')
    .addItem('ติดตั้ง/ตรวจโครงสร้างชีต', 'setup')
    .addItem('รีเซ็ตรหัสอาจารย์เป็น Yru@2570', 'setAdminPin')
    .addItem('อัปเดตเกณฑ์ลงชีต Indicators', 'seedIndicators_')
    .addItem('แสดงลิงก์เว็บแอป', 'showWebAppUrl_')
    .addToUi();
}

function showWebAppUrl_() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? ('URL เว็บแอป:\n' + url) : 'ยังไม่ได้ Deploy เป็นเว็บแอป');
}

/* ============================ Setup ============================ */

function autoInit_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('INIT_V3') === '1') return;
  try { setup(); p.setProperty('INIT_V3', '1'); } catch (e) { log_('autoInit error', String(e)); }
}

function setup() {
  var ss = ss_();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = sheet_(name);
    var h = HEADERS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });
  var st = sheet_(SHEETS.SETTINGS);
  var cur = settingsMap_();
  DEFAULT_SETTINGS.forEach(function (row) {
    if (!(row[0] in cur)) st.appendRow(rowCells_(HEADERS.Settings, row));
    else if (!cur[row[0]] && row[1]) setSetting_(row[0], row[1]);   // เติมค่าเริ่มต้นเมื่อช่องยังว่าง
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PIN')) props.setProperty('ADMIN_PIN', DEFAULT_PIN);
  var ps = sheet_(SHEETS.PERIODS);
  if (ps.getLastRow() < 2) ps.getRange(2, 1, DEFAULT_PERIODS.length, 4).setValues(DEFAULT_PERIODS.map(function (r) { return rowCells_(HEADERS.Periods, r); }));
  seedIndicators_();
  ensureRootFolder_();
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  log_('setup', 'ติดตั้งโครงสร้างระบบ');
  return 'ติดตั้งเรียบร้อย';
}

var DEFAULT_PIN = 'Yru@2570';   // รหัสผู้ดูแลเริ่มต้น (เปลี่ยนได้ในหน้า ตั้งค่าระบบ)

/** บังคับตั้งรหัสผู้ดูแลเป็นค่าด้านล่าง (ใช้กรณีลืมรหัส) */
function setAdminPin() {
  var PIN = DEFAULT_PIN;
  PropertiesService.getScriptProperties().setProperty('ADMIN_PIN', String(PIN));
  return 'ตั้ง PIN แล้ว';
}

function seedIndicators_() {
  var sh = sheet_(SHEETS.INDICATORS);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.Indicators.length).clearContent();
  var rows = INDICATORS.map(function (ind) {
    var s = sectionOf_(ind.sec);
    return [ind.code, ind.sec, s.name, ind.name, ind.unit || 'Milestone', ind.mode,
      indicatorWeight_(ind, 'adm'), indicatorWeight_(ind, 'tch'), indicatorWeight_(ind, 'res'), indicatorWeight_(ind, 'svc'),
      levelText_(ind),
      ind.ev || '', ind.page];
  });
  sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(2, 11, rows.length, 2).setWrap(true);
}

function levelText_(ind) {
  if (ind.opts) return ind.opts.map(function (o) { return 'ระดับ ' + o.lv + ': ' + o.t; }).join('\n');
  if (ind.items) {
    var head = ind.items.map(function (t, i) { return 'ข้อ ' + (i + 1) + ': ' + t + (ind.itemPts ? ' (' + ind.itemPts[i] + ' คะแนน)' : ''); });
    if (ind.mode !== 'add') head = head.concat(ind.lv.map(function (t, i) { return 'ระดับ ' + (i + 1) + ': ' + t; }));
    return head.join('\n');
  }
  return ind.lv.map(function (t, i) { return 'ระดับ ' + (i + 1) + ': ' + t + (ind.pts ? ' (' + ind.pts[i] + ' คะแนน)' : ''); }).join('\n');
}

function ensureRootFolder_() {
  var id = getSetting_('DRIVE_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('หลักฐานประเมินผลการปฏิบัติราชการ (มรย.)');
  setSetting_('DRIVE_FOLDER_ID', f.getId());
  return f;
}

function subFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* ============================ Auth ============================ */

function currentEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

function isAdmin_(pin) {
  var tk = verifyToken_(pin);
  if (tk && tk.role === 'teacher') return true;
  var email = currentEmail_().toLowerCase();
  var owner = '';
  try { owner = Session.getEffectiveUser().getEmail().toLowerCase(); } catch (e) {}
  var list = String(getSetting_('ADMIN_EMAILS') || '').toLowerCase().split(/[,\s]+/).filter(String);
  if (email && (list.indexOf(email) >= 0 || email === owner)) return true;
  var saved = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || DEFAULT_PIN;
  return !!(pin && saved && String(pin) === saved);
}

/** อาจารย์เข้าสู่ระบบด้วยรหัส → token อายุ 12 ชม. */
function teacherLogin(password) {
  var saved = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || DEFAULT_PIN;
  if (String(password) !== saved && !isAdmin_(null)) throw new Error('รหัสไม่ถูกต้อง');
  return makeToken_('teacher', 'T', 12);
}

function requireAdmin_(pin) {
  if (!isAdmin_(pin)) throw new Error('ไม่มีสิทธิ์ผู้ดูแล กรุณาเข้าสู่ระบบด้วยอีเมลผู้ดูแลหรือ PIN');
}

function checkPin(pin) { return isAdmin_(pin); }

/* ============================ Read API ============================ */

function getBootstrap() {
  try { fixData_(); } catch (e) { log_('fixData error', String(e)); }
  var s = settingsMap_();
  var props = PropertiesService.getScriptProperties();
  return {
    settings: {
      SYSTEM_NAME: s.SYSTEM_NAME, OWNER_NAME: s.OWNER_NAME, POSITION: s.POSITION, FACULTY: s.FACULTY,
      EVALUATOR: s.EVALUATOR, PREFERRED_GROUP: s.PREFERRED_GROUP || 'tch', ACTIVE_PERIOD: s.ACTIVE_PERIOD,
      ADMIN_EMAILS: isAdmin_(null) ? s.ADMIN_EMAILS : '', FILE_SHARING: s.FILE_SHARING, AI_PROVIDER: s.AI_PROVIDER, AI_MODEL: s.AI_MODEL
    },
    periods: readTable_(SHEETS.PERIODS).map(function (p) { return { id: String(p.id), label: p.label, start: fmtDate_(p.start), end: fmtDate_(p.end) }; }),
    groups: GROUPS, sections: SECTIONS, evidenceTypes: EVIDENCE_TYPES, roles: ROLES,
    indicators: INDICATORS.map(function (ind) {
      var o = JSON.parse(JSON.stringify(ind));
      o.wg = { adm: indicatorWeight_(ind, 'adm'), tch: indicatorWeight_(ind, 'tch'), res: indicatorWeight_(ind, 'res'), svc: indicatorWeight_(ind, 'svc') };
      return withDetail_(o);
    }),
    groupDefs: GROUP_DEFS, faculties: FACULTIES,
    assumptions: SCORING_ASSUMPTIONS,
    user: currentEmail_(),
    isAdmin: isAdmin_(null),
    aiReady: !!props.getProperty('AI_API_KEY') && s.AI_PROVIDER && s.AI_PROVIDER !== 'none',
    url: ScriptApp.getService().getUrl(),
    hasPin: !!props.getProperty('ADMIN_PIN'),
    hasViewCode: !!props.getProperty('PF_VIEW_CODE')
  };
}

/* ---- ซ่อมข้อมูลเดิมที่ Google Sheets แปลงอัตโนมัติ (ทำครั้งเดียว) ----
 * รอบประเมิน "2570-1" ที่กลายเป็นวันที่ 1 ม.ค. 2570 → "2570-1"
 * ภาคเรียน "2/2569" ที่กลายเป็นวันที่ 1 ก.พ. 2569 → "2/2569"
 * รหัสวิชา/รหัสนักศึกษา/รหัสตัวชี้วัดที่กลายเป็นตัวเลข → ข้อความ */
var MON_ = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function ymd_(d) {
  var tz = (ss_().getSpreadsheetTimeZone && ss_().getSpreadsheetTimeZone()) || 'Asia/Bangkok';
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd').split('-').map(Number);
}
function periodKey_(v) {
  if (v instanceof Date) { var p = ymd_(v); return p[0] + '-' + p[1]; }
  var s = String(v == null ? '' : v).trim(), m = s.match(/^[A-Za-z]{3} ([A-Za-z]{3}) \d{1,2} (\d{4})/);
  if (m && MON_.indexOf(m[1]) >= 0) return m[2] + '-' + (MON_.indexOf(m[1]) + 1);
  return s;
}
function termKey_(v) { if (v instanceof Date) { var p = ymd_(v); return p[1] + '/' + p[0]; } return v; }
function txt_(v) { return typeof v === 'number' ? String(v) : v; }
function fixColumn_(name, col, fn) {
  var sh = ss_().getSheetByName(name); if (!sh || sh.getLastRow() < 2) return 0;
  var v = sh.getDataRange().getValues(), c = v[0].indexOf(col); if (c < 0) return 0;
  var n = 0, out = v.slice(1).map(function (r) { var x = r[c], y = (x === '' || x == null) ? x : fn(x); if (y !== x) n++; return [cell_(col, y)]; });
  if (n) sh.getRange(2, c + 1, out.length, 1).setValues(out);
  return n;
}
function fixData_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('DATA_FIX_V1') === '1') return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return; }
  try {
    if (props.getProperty('DATA_FIX_V1') === '1') return;
    var n = 0, carry = function (x) { return String(x).split(',').map(function (t) { return periodKey_(t); }).filter(Boolean).join(','); };
    n += fixColumn_(SHEETS.PERIODS, 'id', periodKey_);
    n += fixColumn_(SHEETS.WORKS, 'period', periodKey_) + fixColumn_(SHEETS.WORKS, 'carry', carry) + fixColumn_(SHEETS.WORKS, 'code', txt_);
    n += fixColumn_(SHEETS.SCORES, 'period', periodKey_) + fixColumn_(SHEETS.SCORES, 'code', txt_);
    n += fixColumn_(SHEETS.AILOG, 'period', periodKey_) + fixColumn_(SHEETS.AILOG, 'code', txt_);
    n += fixColumn_(SHEETS_LMS.COURSES, 'term', termKey_) + fixColumn_(SHEETS_LMS.COURSES, 'code', txt_) + fixColumn_(SHEETS_LMS.COURSES, 'enrollCode', txt_);
    n += fixColumn_(SHEETS_LMS.STUDENTS, 'studentId', txt_) + fixColumn_(SHEETS_LMS.STUDENTS, 'program', txt_);
    dirty_();
    var ap = getSetting_('ACTIVE_PERIOD'), apk = periodKey_(ap);
    if (ap && apk !== ap) { setSetting_('ACTIVE_PERIOD', apk); n++; }
    props.setProperty('DATA_FIX_V1', '1');
    if (n) log_('ซ่อมข้อมูล', 'แก้ข้อมูลที่ Google Sheets แปลงอัตโนมัติ ' + n + ' ช่อง');
  } finally { lock.releaseLock(); dirty_(); }
}

/** ข้อมูลทั้งหมดของรอบ + ผลวิเคราะห์ */
/** ผู้มีสิทธิ์ดูแฟ้มประเมิน: อาจารย์ หรือ ผู้ประเมินที่ใช้รหัสเข้าถึง (ดูอย่างเดียว) */
function canViewPf_(cred) {
  if (isAdmin_(cred)) return true;
  var t = verifyToken_(cred);
  return !!(t && t.role === 'viewer');
}
function requirePfView_(cred) {
  if (!canViewPf_(cred)) throw new Error('แฟ้มผลงานประเมินเปิดเฉพาะอาจารย์และผู้ประเมินที่มีรหัสเข้าถึง');
}
function pfData(cred, period) { requirePfView_(cred); return getPeriodData_(period); }
/** ผู้ประเมิน/กรรมการ เข้าดูแฟ้มด้วยรหัสเข้าถึง (ตั้งในหน้า ตั้งค่า) */
function viewerLogin(code) {
  var saved = PropertiesService.getScriptProperties().getProperty('PF_VIEW_CODE');
  if (!saved) throw new Error('ยังไม่เปิดให้ผู้ประเมินเข้าดู (อาจารย์ต้องตั้งรหัสเข้าถึงก่อน)');
  if (String(code || '') !== saved) throw new Error('รหัสเข้าถึงไม่ถูกต้อง');
  return makeToken_('viewer', 'V', 8);
}

function getPeriodData_(period) {
  var works = worksForPeriod_(period);
  var ids = {};
  works.forEach(function (w) { ids[w.id] = true; });
  var evidence = readTable_(SHEETS.EVIDENCE).filter(function (e) { return ids[e.workId]; }).map(cleanRow_);
  var scores = readTable_(SHEETS.SCORES).filter(function (s) { return String(s.period) === String(period); }).map(function (s) { var o = cleanRow_(s); o.code = String(s.code); o.period = String(s.period); return o; });
  var ai = readTable_(SHEETS.AILOG).filter(function (a) { return String(a.period) === String(period); });
  var aiLatest = {};
  ai.forEach(function (a) { aiLatest[a.code] = { at: fmtDateTime_(a.at), provider: a.provider, result: safeJson_(a.result, null) }; });
  var analysis = analyzePeriod_(period, works, evidence, scores);
  return { period: period, works: works, evidence: evidence, scores: scores, ai: aiLatest, analysis: analysis };
}

function worksForPeriod_(period) {
  return readTable_(SHEETS.WORKS).filter(function (w) {
    if (String(w.period) === String(period)) return true;
    return String(w.carry || '').split(',').map(function (x) { return x.trim(); }).indexOf(String(period)) >= 0;
  }).map(function (w) {
    var o = cleanRow_(w);
    o.code = String(w.code); o.period = String(w.period);
    o.items = safeJson_(w.items, []);
    o.claimLevel = Number(w.claimLevel) || 0;
    o.value = w.value === '' ? '' : Number(w.value);
    o.share = w.share === '' ? 100 : Number(w.share);
    o.carried = String(w.period) !== String(period);
    return o;
  });
}

/* ============================ Write API ============================ */

function saveWork(pin, w) {
  requireAdmin_(pin);
  if (!w || !w.code || !indicatorOf_(w.code)) throw new Error('ไม่พบตัวชี้วัด');
  if (!w.title) throw new Error('กรุณาระบุชื่อผลงาน/กิจกรรม');
  var now = new Date();
  var row = {
    id: w.id || uid_('W'), period: w.period, code: w.code, title: w.title, workDate: w.workDate || '',
    detail: w.detail || '', claimLevel: Number(w.claimLevel) || '', items: JSON.stringify(w.items || []),
    value: w.value === '' || w.value == null ? '' : Number(w.value), share: w.share === '' || w.share == null ? 100 : Number(w.share),
    role: w.role || '', carry: Array.isArray(w.carry) ? w.carry.join(',') : (w.carry || ''), status: w.status || 'ready',
    updatedAt: now, by: currentEmail_() || 'PIN'
  };
  if (w.id) { upsert_(SHEETS.WORKS, 'id', row); }
  else { row.createdAt = now; appendObj_(SHEETS.WORKS, row); }
  log_(w.id ? 'แก้ไขผลงาน' : 'เพิ่มผลงาน', row.code + ' ' + row.title);
  return row.id;
}

function deleteWork(pin, id) {
  requireAdmin_(pin);
  readTable_(SHEETS.EVIDENCE).filter(function (e) { return e.workId === id; }).forEach(function (e) { deleteEvidence(pin, e.id); });
  deleteWhere_(SHEETS.WORKS, 'id', id);
  log_('ลบผลงาน', id);
  return true;
}

/** meta: {workId,type,title,docNo,docDate,fileName,mime}  b64: base64 ไม่มี prefix */
function uploadEvidence(pin, meta, b64) {
  requireAdmin_(pin);
  var work = findRow_(SHEETS.WORKS, 'id', meta.workId);
  if (!work) throw new Error('ไม่พบผลงาน');
  var bytes = Utilities.base64Decode(b64);
  var blob = Utilities.newBlob(bytes, meta.mime || 'application/octet-stream', meta.fileName || 'evidence');
  var root = ensureRootFolder_();
  var folder = subFolder_(subFolder_(root, String(work.period)), String(work.code));
  var file = folder.createFile(blob);
  applySharing_(file);
  var row = {
    id: uid_('E'), workId: meta.workId, type: meta.type || 'อื่นๆ', title: meta.title || meta.fileName,
    docNo: meta.docNo || '', docDate: meta.docDate || '', url: file.getUrl(), fileId: file.getId(),
    fileName: file.getName(), mime: blob.getContentType(), size: bytes.length, createdAt: new Date(), by: currentEmail_() || 'PIN'
  };
  appendObj_(SHEETS.EVIDENCE, row);
  log_('แนบไฟล์', work.code + ' ' + row.fileName);
  return cleanRow_(row);
}

function addLinkEvidence(pin, meta) {
  requireAdmin_(pin);
  if (!/^https?:\/\//i.test(meta.url || '')) throw new Error('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
  var row = {
    id: uid_('E'), workId: meta.workId, type: meta.type || 'ลิงก์ข่าว/กิจกรรม', title: meta.title || meta.url,
    docNo: meta.docNo || '', docDate: meta.docDate || '', url: meta.url, fileId: '', fileName: '', mime: 'link', size: 0,
    createdAt: new Date(), by: currentEmail_() || 'PIN'
  };
  appendObj_(SHEETS.EVIDENCE, row);
  return cleanRow_(row);
}

function updateEvidence(pin, id, meta) {
  requireAdmin_(pin);
  var e = findRow_(SHEETS.EVIDENCE, 'id', id);
  if (!e) throw new Error('ไม่พบหลักฐาน');
  var row = { id: id, type: meta.type || e.type, title: meta.title || e.title, docNo: meta.docNo || '', docDate: meta.docDate || '' };
  if (!e.fileId && meta.url) {
    if (!/^https?:\/\//i.test(meta.url)) throw new Error('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
    row.url = meta.url;
  }
  upsert_(SHEETS.EVIDENCE, 'id', row);
  log_('แก้ไขหลักฐาน', id);
  return true;
}

function deleteEvidence(pin, id) {
  requireAdmin_(pin);
  var e = findRow_(SHEETS.EVIDENCE, 'id', id);
  if (e && e.fileId) { try { DriveApp.getFileById(e.fileId).setTrashed(true); } catch (x) {} }
  deleteWhere_(SHEETS.EVIDENCE, 'id', id);
  return true;
}

function setFinalLevel(pin, period, code, level, note) {
  requireAdmin_(pin); dirty_();
  var sh = sheet_(SHEETS.SCORES), data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(period) && String(data[i][1]) === String(code)) {
      if (level === '' || level == null) { sh.deleteRow(i + 1); return true; }
      sh.getRange(i + 1, 3, 1, 4).setValues([[Number(level), note || '', currentEmail_() || 'PIN', new Date()]]);
      return true;
    }
  }
  if (level !== '' && level != null) sh.appendRow([cell_('period', String(period)), cell_('code', String(code)), Number(level), note || '', currentEmail_() || 'PIN', new Date()]);
  log_('ยืนยันระดับ', period + ' ' + code + ' = ' + level);
  return true;
}

function saveSettings(pin, obj) {
  requireAdmin_(pin);
  var allowed = ['SYSTEM_NAME', 'OWNER_NAME', 'POSITION', 'FACULTY', 'EVALUATOR', 'PREFERRED_GROUP', 'ACTIVE_PERIOD', 'ADMIN_EMAILS', 'FILE_SHARING', 'AI_PROVIDER', 'AI_MODEL'];
  allowed.forEach(function (k) { if (obj[k] !== undefined) setSetting_(k, obj[k]); });
  if (obj.AI_API_KEY) PropertiesService.getScriptProperties().setProperty('AI_API_KEY', obj.AI_API_KEY);
  if (obj.NEW_PIN) PropertiesService.getScriptProperties().setProperty('ADMIN_PIN', String(obj.NEW_PIN));
  if (obj.PF_VIEW_CODE) {
    if (String(obj.PF_VIEW_CODE).length < 6) throw new Error('รหัสผู้ประเมินอย่างน้อย 6 ตัวอักษร');
    PropertiesService.getScriptProperties().setProperty('PF_VIEW_CODE', String(obj.PF_VIEW_CODE));
  }
  if (obj.PF_VIEW_OFF) PropertiesService.getScriptProperties().deleteProperty('PF_VIEW_CODE');
  log_('บันทึกการตั้งค่า', Object.keys(obj).join(','));
  return true;
}

function addPeriod(pin, p) {
  requireAdmin_(pin);
  if (!p.id || !p.label) throw new Error('กรุณาระบุรหัสและชื่อรอบ');
  if (findRow_(SHEETS.PERIODS, 'id', p.id)) throw new Error('มีรหัสรอบนี้แล้ว');
  dirty_(); sheet_(SHEETS.PERIODS).appendRow(rowCells_(HEADERS.Periods, [String(p.id).trim(), p.label, p.start || '', p.end || '']));
  return true;
}

function updatePeriod(pin, p) {
  requireAdmin_(pin);
  if (!findRow_(SHEETS.PERIODS, 'id', p.id)) throw new Error('ไม่พบรอบ');
  upsert_(SHEETS.PERIODS, 'id', { id: p.id, label: p.label, start: p.start || '', end: p.end || '' });
  return true;
}

function deletePeriod(pin, id) {
  requireAdmin_(pin);
  var used = readTable_(SHEETS.WORKS).some(function (w) { return String(w.period) === String(id); });
  if (used) throw new Error('รอบนี้มีผลงานบันทึกอยู่ ลบไม่ได้ (ย้ายหรือลบผลงานก่อน)');
  if (String(getSetting_('ACTIVE_PERIOD')) === String(id)) throw new Error('รอบนี้เป็นรอบปัจจุบัน ลบไม่ได้');
  deleteWhere_(SHEETS.PERIODS, 'id', id);
  return true;
}

/** คัดลอกผลงาน (ไม่รวมไฟล์) ไปยังรอบอื่น เช่น ใช้เป็นต้นแบบรอบถัดไป */
function copyWork(pin, id, toPeriod) {
  requireAdmin_(pin);
  var w = findRow_(SHEETS.WORKS, 'id', id);
  if (!w) throw new Error('ไม่พบผลงาน');
  var o = {}; Object.keys(w).forEach(function (k) { o[k] = w[k]; });
  o.id = uid_('W'); o.period = toPeriod; o.carry = ''; o.createdAt = new Date(); o.updatedAt = new Date(); o.by = currentEmail_() || 'PIN';
  appendObj_(SHEETS.WORKS, o);
  return o.id;
}

function applySharing_(file) {
  var mode = getSetting_('FILE_SHARING') || 'domain';
  try {
    if (mode === 'anyone') file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    else if (mode === 'domain') file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) { /* บัญชีส่วนตัวตั้ง DOMAIN ไม่ได้ — คงสิทธิ์เดิม */ }
}

/* ============================ Sheet helpers ============================ */

/** สเปรดชีตที่ใช้เก็บข้อมูล: ใช้ไฟล์ที่ผูกสคริปต์ไว้ ถ้าไม่มี (สคริปต์แบบแยก) ใช้ ID ที่บันทึกไว้ */
var SPREADSHEET_ID_DEFAULT = '1obInGhDG5v5vimt9ygXQIsdh2pTB6nhlmeQcZSkn22U';
var _ss = null;
function ss_() {
  if (_ss) return _ss;
  var props = PropertiesService.getScriptProperties();
  try { _ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { _ss = null; }
  if (_ss) {
    if (props.getProperty('SPREADSHEET_ID') !== _ss.getId()) props.setProperty('SPREADSHEET_ID', _ss.getId());
    return _ss;
  }
  var id = props.getProperty('SPREADSHEET_ID') || SPREADSHEET_ID_DEFAULT;
  try { _ss = SpreadsheetApp.openById(id); } catch (e) {
    throw new Error('เปิดสเปรดชีตไม่ได้ (ID: ' + id + ') — ให้สร้างสคริปต์จากเมนู ส่วนขยาย > Apps Script ของสเปรดชีต หรือตรวจสิทธิ์เข้าถึงไฟล์');
  }
  return _ss;
}

/** คืนชีตตามชื่อ ถ้ายังไม่มีจะสร้างพร้อมหัวตาราง (และข้อมูลเริ่มต้นของ Settings/Periods) */
var _hdrChecked = {};
function sheet_(name) {
  var ss = ss_(), sh = ss.getSheetByName(name);
  if (sh && HEADERS[name] && !_hdrChecked[name]) {
    _hdrChecked[name] = true;
    var props = PropertiesService.getScriptProperties(), hk = 'HDR_' + name, hv = String(HEADERS[name].length);
    if (props.getProperty(hk) !== hv) { ensureHeaders_(sh, HEADERS[name]); props.setProperty(hk, hv); }
  }
  if (sh || !HEADERS[name]) return sh;
  sh = ss.insertSheet(name);
  var h = HEADERS[name];
  sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (name === SHEETS.SETTINGS) sh.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS.map(function (r) { return rowCells_(h, r); }));
  if (name === SHEETS.PERIODS) sh.getRange(2, 1, DEFAULT_PERIODS.length, 4).setValues(DEFAULT_PERIODS.map(function (r) { return rowCells_(h, r); }));
  return sh;
}

/** เพิ่มคอลัมน์ใหม่ (ที่เพิ่มในเวอร์ชันหลัง) ต่อท้ายหัวตารางของชีตเดิม — ข้อมูลเดิมไม่หาย */
function ensureHeaders_(sh, h) {
  var w = sh.getLastColumn();
  var cur = w ? sh.getRange(1, 1, 1, w).getValues()[0] : [];
  var miss = h.filter(function (k) { return cur.indexOf(k) < 0; });
  if (!miss.length) return;
  sh.getRange(1, cur.length + 1, 1, miss.length).setValues([miss]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
}

var _tbl = {};
function dirty_() { _tbl = {}; }
function readTable_(name) {
  if (_tbl[name]) return _tbl[name].map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; return o; });
  var sh = sheet_(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getValues(), h = v[0];
  _tbl[name] = v.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o;
  });
  return readTable_(name);
}

/* ---- ป้องกัน Google Sheets แปลงข้อความเป็นวันที่/ตัวเลข/สูตรเอง ----
 * เช่น ภาคเรียน "2/2569" กลายเป็นวันที่, รอบ "2570-1" กลายเป็นวันที่, รหัสวิชา "2.10" กลายเป็น 2.1,
 * คำตอบที่ขึ้นต้นด้วย "-" หรือ "=" กลายเป็นสูตร (#ERROR) → ใส่ ' นำหน้า (Sheets เก็บเป็นข้อความ ไม่แสดง ') */
var DATE_COLS_ = { dueDate: 1, workDate: 1, docDate: 1, start: 1, end: 1 };
function cell_(k, v) {
  if (typeof v !== 'string' || !v || DATE_COLS_[k]) return v;
  if (/^[=+\-@']/.test(v) || (/\d/.test(v) && /^[\s\d.,\/:\-+%$()eE]+$/.test(v))) return "'" + v;
  return v;
}
function rowCells_(h, row) { return row.map(function (v, j) { return cell_(h[j], v); }); }

function appendObj_(name, obj) {
  dirty_();
  var h = HEADERS[name];
  sheet_(name).appendRow(h.map(function (k) { return cell_(k, obj[k] === undefined ? '' : obj[k]); }));
}

function upsert_(name, key, obj) {
  dirty_();
  var sh = sheet_(name), v = sh.getDataRange().getValues(), h = v[0], ki = h.indexOf(key);
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][ki]) === String(obj[key])) {
      var row = h.map(function (k, j) { return cell_(k, obj[k] === undefined ? v[i][j] : obj[k]); });
      sh.getRange(i + 1, 1, 1, h.length).setValues([row]);
      return;
    }
  }
  appendObj_(name, obj);
}

function findRow_(name, key, val) {
  var rows = readTable_(name);
  for (var i = 0; i < rows.length; i++) if (String(rows[i][key]) === String(val)) return rows[i];
  return null;
}

function deleteWhere_(name, key, val) {
  dirty_();
  var sh = sheet_(name), v = sh.getDataRange().getValues(), ki = v[0].indexOf(key);
  for (var i = v.length - 1; i >= 1; i--) if (String(v[i][ki]) === String(val)) sh.deleteRow(i + 1);
}

function settingsMap_() {
  var m = {}; readTable_(SHEETS.SETTINGS).forEach(function (r) { m[r.key] = String(r.value); }); return m;
}
function getSetting_(k) { return settingsMap_()[k]; }
function setSetting_(k, v) {
  dirty_();
  var sh = sheet_(SHEETS.SETTINGS), d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) if (d[i][0] === k) { sh.getRange(i + 1, 2).setValue(cell_('value', v)); return; }
  sh.appendRow([k, cell_('value', v), '']);
}

function cleanRow_(r) {
  var o = {};
  Object.keys(r).forEach(function (k) { o[k] = r[k] instanceof Date ? fmtDate_(r[k]) : r[k]; });
  return o;
}
function fmtDate_(d) {
  if (!d) return '';
  if (!(d instanceof Date)) return String(d);
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd');
}
function fmtDateTime_(d) {
  if (!(d instanceof Date)) return String(d || '');
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
}
function safeJson_(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }
function uid_(p) { return p + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function log_(action, detail) {
  try { sheet_(SHEETS.LOG).appendRow([new Date(), currentEmail_() || 'PIN/anonymous', action, cell_('detail', String(detail == null ? '' : detail))]); } catch (e) {}
}


/* =====================================================================
 * Lms.gs — ห้องเรียนออนไลน์: รายวิชา บทเรียน งาน/แบบทดสอบ/กิจกรรม
 *          นักศึกษาลงทะเบียน ส่งงาน คะแนน รายงานรายบุคคล และ AI ช่วยสอน
 * ===================================================================== */

var GRADE_SCALE = [[80, 'A'], [75, 'B+'], [70, 'B'], [65, 'C+'], [60, 'C'], [55, 'D+'], [50, 'D'], [0, 'F']];
var ITEM_TYPES = { assignment: 'ใบงาน/งานส่ง', quiz: 'แบบทดสอบ', activity: 'กิจกรรม/การมีส่วนร่วม' };

/* ---------------------------- Token ---------------------------- */
function secret_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('TOKEN_SECRET', s); }
  return s;
}
function b64_(s) { return Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, ''); }
function sign_(payload) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, secret_())).replace(/=+$/, ''); }
function makeToken_(role, id, hours) {
  var payload = role + '|' + id + '|' + (Date.now() + hours * 3600000);
  return b64_(payload) + '.' + sign_(payload);
}
function verifyToken_(t) {
  if (!t || String(t).indexOf('.') < 0) return null;
  try {
    var parts = String(t).split('.');
    var pad = parts[0] + '==='.slice((parts[0].length + 3) % 4);
    var payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(pad)).getDataAsString('UTF-8');
    if (sign_(payload) !== parts[1]) return null;
    var f = payload.split('|');
    if (Number(f[2]) < Date.now()) return null;
    return { role: f[0], id: f[1] };
  } catch (e) { return null; }
}
function hash_(salt, pass) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pass, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function requireStudent_(token) {
  var t = verifyToken_(token);
  if (!t || t.role !== 'student') throw new Error('กรุณาเข้าสู่ระบบนักศึกษาใหม่อีกครั้ง');
  var st = findRow_(SHEETS_LMS.STUDENTS, 'id', t.id);
  if (!st || st.status === 'disabled') throw new Error('บัญชีนักศึกษาถูกระงับหรือไม่พบ');
  return st;
}
var SHEETS_LMS = { COURSES: 'Courses', LESSONS: 'Lessons', ITEMS: 'Items', STUDENTS: 'Students', ENR: 'Enrollments', SUBS: 'Submissions', PROG: 'Progress' };

/* ---------------------------- Student auth ---------------------------- */
function studentRegister(f) {
  f = f || {};
  var sidTxt = String(f.studentId || '').trim(), name = String(f.name || '').trim();
  if (!/^[0-9A-Za-z\-]{5,20}$/.test(sidTxt)) throw new Error('รหัสนักศึกษาไม่ถูกต้อง (ตัวเลข/ตัวอักษร 5–20 ตัว)');
  if (name.length < 3) throw new Error('กรุณากรอกชื่อ-สกุล');
  if (String(f.password || '').length < 6) throw new Error('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (findRow_(SHEETS_LMS.STUDENTS, 'studentId', sidTxt)) throw new Error('รหัสนักศึกษานี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ');
    var salt = Utilities.getUuid().slice(0, 12);
    var row = { id: uid_('S'), studentId: sidTxt, name: name, email: f.email || '', program: f.program || '', salt: salt, passHash: hash_(salt, f.password), status: 'active', createdAt: new Date(), lastLogin: new Date() };
    appendObj_(SHEETS_LMS.STUDENTS, row);
    if (f.enrollCode) { try { joinCourse_(row.id, f.enrollCode); } catch (e) {} }
    return { token: makeToken_('student', row.id, 24), name: name };
  } finally { lock.releaseLock(); }
}
function studentLogin(studentId, password) {
  var st = findRow_(SHEETS_LMS.STUDENTS, 'studentId', String(studentId || '').trim());
  if (!st || hash_(st.salt, password) !== st.passHash) throw new Error('รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง');
  if (st.status === 'disabled') throw new Error('บัญชีถูกระงับ กรุณาติดต่ออาจารย์');
  try { upsert_(SHEETS_LMS.STUDENTS, 'id', { id: st.id, lastLogin: new Date() }); } catch (e) {}
  return { token: makeToken_('student', st.id, 24), name: st.name };
}
function studentChangePassword(token, oldPass, newPass) {
  var st = requireStudent_(token);
  if (hash_(st.salt, oldPass) !== st.passHash) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  if (String(newPass || '').length < 6) throw new Error('รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร');
  upsert_(SHEETS_LMS.STUDENTS, 'id', { id: st.id, passHash: hash_(st.salt, newPass) });
  return true;
}
function joinCourse_(sid, code) {
  var c = readTable_(SHEETS_LMS.COURSES).filter(function (x) { return String(x.enrollCode).toUpperCase() === String(code).trim().toUpperCase() && x.status !== 'closed'; })[0];
  if (!c) throw new Error('ไม่พบรายวิชาจากรหัสเข้าเรียนนี้ หรือรายวิชาปิดรับแล้ว');
  var has = readTable_(SHEETS_LMS.ENR).some(function (e) { return e.courseId === c.id && e.sid === sid; });
  if (!has) appendObj_(SHEETS_LMS.ENR, { id: uid_('N'), courseId: c.id, sid: sid, createdAt: new Date() });
  return c;
}

/* ---------------------------- Student API ---------------------------- */
function stuData(token) {
  var st = requireStudent_(token);
  var myCourses = readTable_(SHEETS_LMS.ENR).filter(function (e) { return e.sid === st.id; }).map(function (e) { return e.courseId; });
  var courses = readTable_(SHEETS_LMS.COURSES).filter(function (c) { return myCourses.indexOf(c.id) >= 0; }).map(cleanRow_);
  var cids = courses.map(function (c) { return c.id; });
  var lessons = readTable_(SHEETS_LMS.LESSONS).filter(function (l) { return cids.indexOf(l.courseId) >= 0 && isTrue_(l.published); }).map(lessonOut_);
  var items = readTable_(SHEETS_LMS.ITEMS).filter(function (i) { return cids.indexOf(i.courseId) >= 0 && isTrue_(i.published); }).map(function (i) { return itemOut_(i, false); });
  var subs = readTable_(SHEETS_LMS.SUBS).filter(function (s) { return s.sid === st.id; }).map(subOut_);
  var prog = readTable_(SHEETS_LMS.PROG).filter(function (p) { return p.sid === st.id; }).map(function (p) { return p.lessonId; });
  return { me: { id: st.id, studentId: st.studentId, name: st.name, email: st.email, program: st.program }, courses: courses, lessons: lessons, items: items, subs: subs, progress: prog, gradeScale: GRADE_SCALE };
}
function stuJoin(token, code) { var st = requireStudent_(token); var c = joinCourse_(st.id, code); return c.title; }
function stuMarkLesson(token, lessonId) {
  var st = requireStudent_(token);
  var l = findRow_(SHEETS_LMS.LESSONS, 'id', lessonId);
  if (!l) return false;
  var has = readTable_(SHEETS_LMS.PROG).some(function (p) { return p.sid === st.id && p.lessonId === lessonId; });
  if (!has) appendObj_(SHEETS_LMS.PROG, { sid: st.id, lessonId: lessonId, courseId: l.courseId, at: new Date() });
  return true;
}
function stuUpload(token, itemId, meta, b64) {
  var st = requireStudent_(token);
  var it = findRow_(SHEETS_LMS.ITEMS, 'id', itemId);
  if (!it) throw new Error('ไม่พบงาน');
  var bytes = Utilities.base64Decode(b64);
  if (bytes.length > 15 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 15MB');
  var folder = subFolder_(subFolder_(subFolder_(ensureRootFolder_(), '_ห้องเรียน'), 'งานนักศึกษา'), it.courseId);
  var f = folder.createFile(Utilities.newBlob(bytes, meta.mime || 'application/octet-stream', st.studentId + '_' + (meta.name || 'file')));
  lmsShare_(f);
  return { name: meta.name, url: f.getUrl(), fileId: f.getId() };
}
function stuSubmit(token, itemId, payload) {
  var st = requireStudent_(token);
  var it = findRow_(SHEETS_LMS.ITEMS, 'id', itemId);
  if (!it || !isTrue_(it.published)) throw new Error('ไม่พบงานหรือยังไม่เปิดให้ส่ง');
  var enrolled = readTable_(SHEETS_LMS.ENR).some(function (e) { return e.sid === st.id && e.courseId === it.courseId; });
  if (!enrolled) throw new Error('ยังไม่ได้ลงทะเบียนรายวิชานี้');
  var old = readTable_(SHEETS_LMS.SUBS).filter(function (s) { return s.itemId === itemId && s.sid === st.id; })[0];
  if (old && old.status === 'graded') throw new Error('งานนี้ตรวจแล้ว ไม่สามารถส่งซ้ำได้ (ติดต่ออาจารย์)');
  if (old && it.type === 'quiz') throw new Error('ทำแบบทดสอบนี้แล้ว');
  if (it.type === 'activity') throw new Error('กิจกรรมนี้อาจารย์ให้คะแนนในชั้นเรียน ไม่ต้องส่งงาน');
  payload = payload || {};
  var files = (payload.files || []).filter(function (f) { return f && f.url; }).map(function (f) { return { name: String(f.name || 'file'), url: String(f.url), fileId: String(f.fileId || '') }; });
  var row = { id: old ? old.id : uid_('U'), itemId: itemId, courseId: it.courseId, sid: st.id, text: String(payload.text || '').slice(0, 20000),
    files: JSON.stringify(files), answers: '', autoScore: '', score: '', feedback: old ? old.feedback || '' : '', status: 'submitted', submittedAt: new Date(), gradedAt: '',
    qScores: '', editCount: old ? (Number(old.editCount) || 0) + 1 : 0 };
  var result = null;
  if (it.type === 'assignment') {
    var nq = safeJson_(it.quiz, []).length;
    var ansT = (payload.answers || []).slice(0, nq).map(function (a) { return String(a == null ? '' : a).slice(0, 10000); });
    while (ansT.length < nq) ansT.push('');
    row.answers = nq ? JSON.stringify(ansT) : '';
    if (!row.text.trim() && !files.length && !ansT.some(function (a) { return a.trim(); })) throw new Error('กรุณาตอบคำถาม พิมพ์คำตอบ หรือแนบไฟล์อย่างน้อย 1 อย่าง');
    // ไฟล์เดิมที่นักศึกษาเอาออกตอนแก้ไข → ย้ายไปถังขยะ
    var keep = files.map(function (f) { return f.fileId; });
    if (old) safeJson_(old.files, []).forEach(function (f) { if (f.fileId && keep.indexOf(f.fileId) < 0) { try { DriveApp.getFileById(f.fileId).setTrashed(true); } catch (e) {} } });
  }
  if (it.type === 'quiz') {
    var qs = safeJson_(it.quiz, []), ans = payload.answers || [], got = 0, full = 0;
    var detail = qs.map(function (q, k) { var p = Number(q.points) || 1; full += p; var ok = Number(ans[k]) === Number(q.answer); if (ok) got += p; return ok; });
    var max = Number(it.maxScore) || full;
    var score = full ? Math.round(got / full * max * 100) / 100 : 0;
    row.answers = JSON.stringify(ans); row.autoScore = score; row.score = score; row.status = 'graded'; row.gradedAt = new Date();
    row.feedback = 'ตรวจอัตโนมัติ: ตอบถูก ' + detail.filter(Boolean).length + '/' + qs.length + ' ข้อ';
    result = { score: score, max: max, correct: detail };
  }
  upsert_(SHEETS_LMS.SUBS, 'id', row);
  return result || { submitted: true, edited: !!old };
}
/** นักศึกษาลบงานที่ส่ง (ได้เฉพาะงานที่อาจารย์ยังไม่ตรวจ) — ไฟล์แนบย้ายไปถังขยะ */
function stuDeleteSubmission(token, itemId) {
  var st = requireStudent_(token);
  var it = findRow_(SHEETS_LMS.ITEMS, 'id', itemId);
  if (!it) throw new Error('ไม่พบงาน');
  if (it.type !== 'assignment') throw new Error('ลบได้เฉพาะใบงาน/งานส่ง');
  var old = readTable_(SHEETS_LMS.SUBS).filter(function (s) { return s.itemId === itemId && s.sid === st.id; })[0];
  if (!old) throw new Error('ยังไม่มีงานที่ส่ง');
  if (old.status === 'graded') throw new Error('งานนี้ตรวจแล้ว ลบไม่ได้ (ติดต่ออาจารย์)');
  safeJson_(old.files, []).forEach(function (f) { if (f.fileId) { try { DriveApp.getFileById(f.fileId).setTrashed(true); } catch (e) {} } });
  deleteWhere_(SHEETS_LMS.SUBS, 'id', old.id);
  return true;
}
function stuReportHtml(token, courseId) { var st = requireStudent_(token); return studentReportHtml_(courseId, st.id, false); }
function stuReportPdf(token, courseId) {
  var st = requireStudent_(token);
  var blob = Utilities.newBlob(studentReportHtml_(courseId, st.id, true), 'text/html').getAs('application/pdf').setName('รายงานคะแนน_' + st.studentId + '_' + stamp_() + '.pdf');
  return saveExportLms_(blob, true);
}

/* ---------------------------- Teacher API ---------------------------- */
function lmsTeacherData(cred) {
  requireAdmin_(cred);
  var students = readTable_(SHEETS_LMS.STUDENTS).map(function (s) { return { id: s.id, studentId: String(s.studentId), name: s.name, email: s.email, program: String(s.program || ''), status: s.status, createdAt: fmtDate_(s.createdAt), lastLogin: s.lastLogin instanceof Date ? fmtDateTime_(s.lastLogin) : String(s.lastLogin || '') }; });
  return {
    courses: readTable_(SHEETS_LMS.COURSES).map(cleanRow_),
    lessons: readTable_(SHEETS_LMS.LESSONS).map(lessonOut_),
    items: readTable_(SHEETS_LMS.ITEMS).map(function (i) { return itemOut_(i, true); }),
    students: students,
    enrollments: readTable_(SHEETS_LMS.ENR).map(cleanRow_),
    subs: readTable_(SHEETS_LMS.SUBS).map(subOut_),
    progress: readTable_(SHEETS_LMS.PROG).map(function (p) { return { sid: p.sid, lessonId: p.lessonId, courseId: p.courseId }; }),
    gradeScale: GRADE_SCALE
  };
}
function saveCourse(cred, c) {
  requireAdmin_(cred);
  if (!c.title) throw new Error('กรุณาระบุชื่อรายวิชา');
  var code = String(c.enrollCode || '').trim().toUpperCase() || randCode_();
  var dup = readTable_(SHEETS_LMS.COURSES).some(function (x) { return String(x.enrollCode).toUpperCase() === code && x.id !== c.id; });
  if (dup) throw new Error('รหัสเข้าเรียนนี้ถูกใช้แล้ว');
  var row = { id: c.id || uid_('C'), code: c.code || '', title: c.title, description: c.description || '', term: c.term || '', enrollCode: code, color: c.color || '#2563eb', status: c.status || 'open' };
  if (!c.id) row.createdAt = new Date();
  upsert_(SHEETS_LMS.COURSES, 'id', row);
  return row.id;
}
function deleteCourse(cred, id) {
  requireAdmin_(cred);
  [SHEETS_LMS.LESSONS, SHEETS_LMS.ITEMS, SHEETS_LMS.ENR, SHEETS_LMS.SUBS, SHEETS_LMS.PROG].forEach(function (n) { deleteWhere_(n, 'courseId', id); });
  deleteWhere_(SHEETS_LMS.COURSES, 'id', id);
  return true;
}
function saveLesson(cred, l) {
  requireAdmin_(cred);
  if (!l.title || !l.courseId) throw new Error('กรุณาระบุชื่อบทเรียน');
  var row = { id: l.id || uid_('L'), courseId: l.courseId, order: Number(l.order) || nextOrder_(SHEETS_LMS.LESSONS, l.courseId), title: l.title, content: l.content || '',
    videoUrl: l.videoUrl || '', published: l.published ? 'TRUE' : 'FALSE' };
  if (!l.id) { row.files = '[]'; row.createdAt = new Date(); }
  upsert_(SHEETS_LMS.LESSONS, 'id', row);
  return row.id;
}
function deleteLesson(cred, id) {
  requireAdmin_(cred);
  deleteWhere_(SHEETS_LMS.LESSONS, 'id', id);
  readTable_(SHEETS_LMS.ITEMS).filter(function (i) { return i.lessonId === id; }).forEach(function (i) { upsert_(SHEETS_LMS.ITEMS, 'id', { id: i.id, lessonId: '' }); });
  deleteWhere_(SHEETS_LMS.PROG, 'lessonId', id);
  return true;
}
function uploadLessonFile(cred, lessonId, meta, b64) {
  requireAdmin_(cred);
  var l = findRow_(SHEETS_LMS.LESSONS, 'id', lessonId);
  if (!l) throw new Error('ไม่พบบทเรียน');
  var folder = subFolder_(subFolder_(subFolder_(ensureRootFolder_(), '_ห้องเรียน'), 'สื่อการสอน'), l.courseId);
  var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), meta.mime || 'application/octet-stream', meta.name || 'file'));
  lmsShare_(f);
  var files = safeJson_(l.files, []);
  files.push({ name: meta.title || meta.name, url: f.getUrl(), fileId: f.getId(), mime: meta.mime || '' });
  upsert_(SHEETS_LMS.LESSONS, 'id', { id: lessonId, files: JSON.stringify(files) });
  return files;
}
function addLessonLink(cred, lessonId, name, url) {
  requireAdmin_(cred);
  if (!/^https?:\/\//i.test(url || '')) throw new Error('ลิงก์ต้องขึ้นต้นด้วย http(s)://');
  var l = findRow_(SHEETS_LMS.LESSONS, 'id', lessonId), files = safeJson_(l.files, []);
  files.push({ name: name || url, url: url, fileId: '', mime: 'link' });
  upsert_(SHEETS_LMS.LESSONS, 'id', { id: lessonId, files: JSON.stringify(files) });
  return files;
}
function removeLessonFile(cred, lessonId, idx) {
  requireAdmin_(cred);
  var l = findRow_(SHEETS_LMS.LESSONS, 'id', lessonId), files = safeJson_(l.files, []);
  var f = files.splice(Number(idx), 1)[0];
  if (f && f.fileId) { try { DriveApp.getFileById(f.fileId).setTrashed(true); } catch (e) {} }
  upsert_(SHEETS_LMS.LESSONS, 'id', { id: lessonId, files: JSON.stringify(files) });
  return files;
}
function saveItem(cred, it) {
  requireAdmin_(cred);
  if (!it.title || !it.courseId) throw new Error('กรุณาระบุชื่องาน');
  if (!ITEM_TYPES[it.type]) throw new Error('ประเภทงานไม่ถูกต้อง');
  var quiz = it.type === 'quiz' ? (it.quiz || []).filter(function (q) { return q.q && q.choices && q.choices.length >= 2; }) : [];
  if (it.type === 'quiz' && !quiz.length) throw new Error('แบบทดสอบต้องมีอย่างน้อย 1 ข้อ (มีตัวเลือก ≥ 2)');
  // ใบงาน: คำถามให้นักศึกษาพิมพ์ตอบ (เก็บในคอลัมน์ quiz เดียวกัน รูปแบบ [{q, points}])
  if (it.type === 'assignment') quiz = (it.questions || []).filter(function (q) { return q && String(q.q || '').trim(); }).map(function (q) { return { q: String(q.q).trim(), points: Math.max(0, Number(q.points) || 0) }; });
  var row = { id: it.id || uid_('I'), courseId: it.courseId, lessonId: it.lessonId || '', order: Number(it.order) || nextOrder_(SHEETS_LMS.ITEMS, it.courseId), type: it.type, title: it.title,
    instructions: it.instructions || '', maxScore: Number(it.maxScore) || 10, dueDate: it.dueDate || '', quiz: JSON.stringify(quiz), published: it.published ? 'TRUE' : 'FALSE' };
  if (!it.id) row.createdAt = new Date();
  upsert_(SHEETS_LMS.ITEMS, 'id', row);
  return row.id;
}
function deleteItem(cred, id) { requireAdmin_(cred); deleteWhere_(SHEETS_LMS.ITEMS, 'id', id); deleteWhere_(SHEETS_LMS.SUBS, 'itemId', id); return true; }

/** ให้/แก้คะแนน: subId ว่าง = สร้างรายการใหม่ (เช่น กิจกรรมในชั้นเรียน) */
function gradeSubmission(cred, g) {
  requireAdmin_(cred);
  var it = findRow_(SHEETS_LMS.ITEMS, 'id', g.itemId);
  if (!it) throw new Error('ไม่พบงาน');
  var sc = g.score === '' || g.score == null ? '' : Number(g.score);
  if (sc !== '' && (isNaN(sc) || sc < 0 || sc > Number(it.maxScore))) throw new Error('คะแนนต้องอยู่ระหว่าง 0–' + it.maxScore);
  var old = readTable_(SHEETS_LMS.SUBS).filter(function (s) { return s.itemId === g.itemId && s.sid === g.sid; })[0];
  var row = { id: old ? old.id : uid_('U'), itemId: g.itemId, courseId: it.courseId, sid: g.sid, score: sc, feedback: g.feedback || '', status: sc === '' ? (old ? old.status : 'submitted') : 'graded', gradedAt: new Date() };
  if (g.qScores && it.type === 'assignment') {
    var qs = safeJson_(it.quiz, []);
    var qv = qs.map(function (q, k) {
      var x = g.qScores[k]; if (x === '' || x == null) return '';
      x = Number(x); if (isNaN(x) || x < 0) throw new Error('คะแนนข้อ ' + (k + 1) + ' ไม่ถูกต้อง');
      if (Number(q.points) > 0 && x > Number(q.points)) throw new Error('คะแนนข้อ ' + (k + 1) + ' เกินคะแนนเต็มของข้อ (' + q.points + ')');
      return x;
    });
    row.qScores = JSON.stringify(qv);
  }
  if (!old) { row.text = ''; row.files = '[]'; row.answers = ''; row.autoScore = ''; row.submittedAt = ''; row.editCount = 0; }
  upsert_(SHEETS_LMS.SUBS, 'id', row);
  return true;
}
/** อาจารย์ส่งงานคืนให้นักศึกษาแก้ไข (เก็บคำตอบเดิมไว้ นักศึกษาแก้แล้วส่งใหม่ได้) */
function returnSubmission(cred, subId, feedback) {
  requireAdmin_(cred);
  var sb = findRow_(SHEETS_LMS.SUBS, 'id', subId);
  if (!sb) throw new Error('ไม่พบงานที่ส่ง');
  if (!String(feedback || '').trim()) throw new Error('กรุณาเขียนความเห็นบอกนักศึกษาว่าต้องแก้ไขอะไร');
  upsert_(SHEETS_LMS.SUBS, 'id', { id: subId, status: 'returned', score: '', feedback: String(feedback).slice(0, 5000), gradedAt: new Date() });
  return true;
}
function resetSubmission(cred, subId) { requireAdmin_(cred); deleteWhere_(SHEETS_LMS.SUBS, 'id', subId); return true; }
function enrollStudentByTeacher(cred, courseId, studentRowId) {
  requireAdmin_(cred);
  var has = readTable_(SHEETS_LMS.ENR).some(function (e) { return e.courseId === courseId && e.sid === studentRowId; });
  if (!has) appendObj_(SHEETS_LMS.ENR, { id: uid_('N'), courseId: courseId, sid: studentRowId, createdAt: new Date() });
  return true;
}
function removeEnrollment(cred, courseId, sid) {
  requireAdmin_(cred);
  readTable_(SHEETS_LMS.ENR).filter(function (e) { return e.courseId === courseId && e.sid === sid; }).forEach(function (e) { deleteWhere_(SHEETS_LMS.ENR, 'id', e.id); });
  return true;
}
/* ---- รายชื่อนักศึกษา: นำเข้า/แก้ไข/ลบ ---- */
function defaultStudentPass_(studentId) { return String(studentId).slice(-6); }
/** นำเข้ารายชื่อ rows [{studentId,name,program,email}] เข้ารายวิชา
 *  - มีบัญชีแล้ว (รหัสตรง) → เพิ่มเข้ารายวิชา (ไม่แตะรหัสผ่านเดิม)
 *  - ยังไม่มีบัญชี → สร้างบัญชี รหัสผ่านเริ่มต้น = 6 หลักท้ายของรหัสนักศึกษา */
function importStudents(cred, courseId, rows, opts) {
  requireAdmin_(cred);
  opts = opts || {};
  if (!findRow_(SHEETS_LMS.COURSES, 'id', courseId)) throw new Error('ไม่พบรายวิชา');
  rows = (rows || []).slice(0, 1000);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var byId = {}; readTable_(SHEETS_LMS.STUDENTS).forEach(function (s) { byId[String(s.studentId).trim()] = s; });
    var enrolled = {}; readTable_(SHEETS_LMS.ENR).forEach(function (e) { if (e.courseId === courseId) enrolled[e.sid] = true; });
    var res = { created: 0, enrolled: 0, already: 0, updated: 0, skipped: [] }, seen = {}, now = new Date();
    var stSh = sheet_(SHEETS_LMS.STUDENTS), enSh = sheet_(SHEETS_LMS.ENR), hS = HEADERS.Students, hE = HEADERS.Enrollments;
    rows.forEach(function (r) {
      var sid = String(r.studentId == null ? '' : r.studentId).replace(/\s+/g, ''), name = String(r.name || '').replace(/\s+/g, ' ').trim();
      if (!/^[0-9A-Za-z\-]{5,20}$/.test(sid)) { res.skipped.push((sid || '(ไม่มีรหัส)') + ' ' + name); return; }
      if (seen[sid]) return; seen[sid] = 1;
      var st = byId[sid];
      if (!st) {
        if (name.length < 2) { res.skipped.push(sid + ' (ไม่มีชื่อ)'); return; }
        var salt = Utilities.getUuid().slice(0, 12);
        st = { id: uid_('S'), studentId: sid, name: name, email: String(r.email || ''), program: String(r.program || opts.program || ''), salt: salt,
          passHash: hash_(salt, defaultStudentPass_(sid)), status: 'active', createdAt: now, lastLogin: '' };
        stSh.appendRow(hS.map(function (k) { return cell_(k, st[k] === undefined ? '' : st[k]); }));
        byId[sid] = st; res.created++;
      } else if (opts.updateNames && name.length >= 2 && name !== st.name) {
        upsert_(SHEETS_LMS.STUDENTS, 'id', { id: st.id, name: name }); res.updated++;
      }
      if (enrolled[st.id]) { res.already++; return; }
      var e = { id: uid_('N'), courseId: courseId, sid: st.id, createdAt: now };
      enSh.appendRow(hE.map(function (k) { return cell_(k, e[k]); }));
      enrolled[st.id] = true; res.enrolled++;
    });
    dirty_();
    log_('นำเข้ารายชื่อนักศึกษา', courseId + ' สร้าง ' + res.created + ' เพิ่มเข้าวิชา ' + res.enrolled);
    return res;
  } finally { lock.releaseLock(); }
}
function updateStudent(cred, sid, f) {
  requireAdmin_(cred);
  f = f || {};
  var st = findRow_(SHEETS_LMS.STUDENTS, 'id', sid); if (!st) throw new Error('ไม่พบนักศึกษา');
  var sidTxt = String(f.studentId || '').replace(/\s+/g, ''), name = String(f.name || '').replace(/\s+/g, ' ').trim();
  if (!/^[0-9A-Za-z\-]{5,20}$/.test(sidTxt)) throw new Error('รหัสนักศึกษาไม่ถูกต้อง');
  if (name.length < 2) throw new Error('กรุณากรอกชื่อ-สกุล');
  var dup = readTable_(SHEETS_LMS.STUDENTS).some(function (x) { return x.id !== sid && String(x.studentId).trim() === sidTxt; });
  if (dup) throw new Error('รหัสนักศึกษานี้มีในระบบแล้ว');
  upsert_(SHEETS_LMS.STUDENTS, 'id', { id: sid, studentId: sidTxt, name: name, program: String(f.program || ''), email: String(f.email || '') });
  return true;
}
/** ลบบัญชีนักศึกษาออกจากระบบ พร้อมการลงทะเบียน งานที่ส่ง และประวัติการเรียน (เช่น บัญชีทดสอบ/ลงทะเบียนซ้ำ) */
function deleteStudent(cred, sid) {
  requireAdmin_(cred);
  var st = findRow_(SHEETS_LMS.STUDENTS, 'id', sid); if (!st) throw new Error('ไม่พบนักศึกษา');
  readTable_(SHEETS_LMS.SUBS).filter(function (s) { return s.sid === sid; }).forEach(function (s) {
    safeJson_(s.files, []).forEach(function (f) { if (f.fileId) { try { DriveApp.getFileById(f.fileId).setTrashed(true); } catch (e) {} } });
  });
  [SHEETS_LMS.SUBS, SHEETS_LMS.ENR, SHEETS_LMS.PROG].forEach(function (n) { deleteWhere_(n, 'sid', sid); });
  deleteWhere_(SHEETS_LMS.STUDENTS, 'id', sid);
  log_('ลบนักศึกษา', st.studentId + ' ' + st.name);
  return true;
}
function setStudentStatus(cred, sid, status) { requireAdmin_(cred); upsert_(SHEETS_LMS.STUDENTS, 'id', { id: sid, status: status }); return true; }
function resetStudentPassword(cred, sid, pass) {
  requireAdmin_(cred);
  if (String(pass || '').length < 6) throw new Error('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
  var st = findRow_(SHEETS_LMS.STUDENTS, 'id', sid);
  upsert_(SHEETS_LMS.STUDENTS, 'id', { id: sid, passHash: hash_(st.salt, pass) });
  return true;
}
function teacherStudentReport(cred, courseId, sid) { requireAdmin_(cred); return studentReportHtml_(courseId, sid, false); }
function exportStudentReportPdf(cred, courseId, sid) {
  requireAdmin_(cred);
  var st = findRow_(SHEETS_LMS.STUDENTS, 'id', sid);
  var blob = Utilities.newBlob(studentReportHtml_(courseId, sid, true), 'text/html').getAs('application/pdf').setName('รายงานรายบุคคล_' + st.studentId + '_' + stamp_() + '.pdf');
  return saveExportLms_(blob, false);
}
function exportGradebook(cred, courseId) {
  requireAdmin_(cred);
  var g = gradebook_(courseId);
  var ss = SpreadsheetApp.create('สมุดคะแนน_' + g.course.title + '_' + stamp_());
  var sh = ss.getSheets()[0]; sh.setName('สมุดคะแนน');
  var head = ['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-สกุล'].concat(g.items.map(function (i) { return i.title + ' (' + i.maxScore + ')'; })).concat(['รวม (' + g.max + ')', 'ร้อยละ', 'เกรด', 'บทเรียนที่เรียน']);
  var rows = [head].concat(g.rows.map(function (r, k) {
    return [k + 1, r.studentId, r.name].concat(r.scores.map(function (x) { return x === '' ? '' : x; })).concat([r.total, r.pct, r.grade, r.lessonsDone + '/' + g.lessonCount]);
  }));
  sh.getRange(1, 1, rows.length, head.length).setValues(rows).setFontFamily('Sarabun');
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff').setWrap(true);
  sh.setFrozenRows(1); sh.setFrozenColumns(3);
  var sh2 = ss.insertSheet('หมายเหตุ');
  sh2.getRange(1, 1, 4, 1).setValues([['เกณฑ์เกรด (ค่าเริ่มต้นของระบบ): ' + GRADE_SCALE.map(function (x) { return x[1] + '≥' + x[0]; }).join(', ')],
    ['ช่องว่าง = ยังไม่มีคะแนน (ยังไม่ส่ง/ยังไม่ตรวจ) และนับเป็น 0 ในคะแนนรวม'], ['แบบทดสอบตรวจอัตโนมัติตามเฉลยที่อาจารย์กำหนด'], ['จัดทำ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')]]);
  SpreadsheetApp.flush();
  var resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (e) {}
  if (resp.getResponseCode() !== 200) throw new Error('ส่งออก Excel ไม่สำเร็จ');
  return saveExportLms_(resp.getBlob().setName('สมุดคะแนน_' + (g.course.code || g.course.title) + '_' + stamp_() + '.xlsx'), false);
}
/** บันทึกรายวิชาเป็นผลงานในแฟ้มประเมิน (เช่น ตัวชี้วัด 2.1 / 2.2) */
function linkCourseToPortfolio(cred, courseId, code) {
  requireAdmin_(cred);
  var c = findRow_(SHEETS_LMS.COURSES, 'id', courseId);
  var ls = readTable_(SHEETS_LMS.LESSONS).filter(function (l) { return l.courseId === courseId; });
  var its = readTable_(SHEETS_LMS.ITEMS).filter(function (i) { return i.courseId === courseId; });
  var enr = readTable_(SHEETS_LMS.ENR).filter(function (e) { return e.courseId === courseId; }).length;
  var videos = ls.filter(function (l) { return l.videoUrl; }).length;
  var period = getSetting_('ACTIVE_PERIOD');
  var wid = saveWork(cred, { period: period, code: code, title: 'ห้องเรียนออนไลน์: ' + (c.code ? c.code + ' ' : '') + c.title,
    detail: 'บทเรียน ' + ls.length + ' บท (มีวิดีโอ ' + videos + ' บท) · งาน/แบบทดสอบ/กิจกรรม ' + its.length + ' รายการ · นักศึกษาลงทะเบียน ' + enr + ' คน', items: [], carry: [] });
  addLinkEvidence(cred, { workId: wid, type: 'ลิงก์ระบบ (LMS/ทะเบียน/NRIIS/TCI)', title: 'ห้องเรียนออนไลน์ ' + c.title, url: ScriptApp.getService().getUrl() || 'https://script.google.com' });
  return wid;
}

/* ---------------------------- Reports ---------------------------- */
function gradebook_(courseId) {
  var c = findRow_(SHEETS_LMS.COURSES, 'id', courseId);
  if (!c) throw new Error('ไม่พบรายวิชา');
  var items = readTable_(SHEETS_LMS.ITEMS).filter(function (i) { return i.courseId === courseId; }).sort(function (a, b) { return a.order - b.order; });
  var lessons = readTable_(SHEETS_LMS.LESSONS).filter(function (l) { return l.courseId === courseId; });
  var sids = readTable_(SHEETS_LMS.ENR).filter(function (e) { return e.courseId === courseId; }).map(function (e) { return e.sid; });
  var students = readTable_(SHEETS_LMS.STUDENTS).filter(function (s) { return sids.indexOf(s.id) >= 0; }).sort(function (a, b) { return String(a.studentId).localeCompare(String(b.studentId)); });
  var subs = readTable_(SHEETS_LMS.SUBS).filter(function (s) { return s.courseId === courseId; });
  var prog = readTable_(SHEETS_LMS.PROG).filter(function (p) { return p.courseId === courseId; });
  var max = items.reduce(function (a, i) { return a + (Number(i.maxScore) || 0); }, 0);
  var rows = students.map(function (s) {
    var total = 0;
    var scores = items.map(function (i) { var sub = subs.filter(function (x) { return x.itemId === i.id && x.sid === s.id; })[0]; var v = sub && sub.score !== '' ? Number(sub.score) : ''; if (v !== '') total += v; return v; });
    var pct = max ? Math.round(total / max * 1000) / 10 : 0;
    return { sid: s.id, studentId: s.studentId, name: s.name, scores: scores, total: Math.round(total * 100) / 100, pct: pct, grade: grade_(pct), lessonsDone: prog.filter(function (p) { return p.sid === s.id; }).length };
  });
  return { course: cleanRow_(c), items: items, rows: rows, max: max, lessonCount: lessons.length };
}
function grade_(pct) { for (var i = 0; i < GRADE_SCALE.length; i++) if (pct >= GRADE_SCALE[i][0]) return GRADE_SCALE[i][1]; return 'F'; }

function studentReportHtml_(courseId, sid, standalone) {
  var c = findRow_(SHEETS_LMS.COURSES, 'id', courseId), st = findRow_(SHEETS_LMS.STUDENTS, 'id', sid);
  if (!c || !st) throw new Error('ไม่พบข้อมูล');
  var enrolled = readTable_(SHEETS_LMS.ENR).some(function (e) { return e.courseId === courseId && e.sid === sid; });
  if (!enrolled) throw new Error('นักศึกษายังไม่ได้ลงทะเบียนรายวิชานี้');
  var items = readTable_(SHEETS_LMS.ITEMS).filter(function (i) { return i.courseId === courseId && isTrue_(i.published); }).sort(function (a, b) { return a.order - b.order; });
  var lessons = readTable_(SHEETS_LMS.LESSONS).filter(function (l) { return l.courseId === courseId && isTrue_(l.published); });
  var subs = readTable_(SHEETS_LMS.SUBS).filter(function (s) { return s.courseId === courseId && s.sid === sid; });
  var done = readTable_(SHEETS_LMS.PROG).filter(function (p) { return p.courseId === courseId && p.sid === sid; }).map(function (p) { return p.lessonId; });
  var total = 0, max = 0, h = [];
  if (standalone) h.push('<html><head><meta charset="utf-8"><style>' + reportCss_() + '</style></head><body>');
  h.push('<div class="rpt"><h1>รายงานผลการเรียนรายบุคคล</h1><p class="sub">' + esc_(c.code ? c.code + ' ' : '') + esc_(c.title) + (c.term ? ' · ' + esc_(c.term) : '') + ' · ผู้สอน ' + esc_(getSetting_('OWNER_NAME') || '') + '</p>');
  h.push('<table><tr><th>รหัสนักศึกษา</th><td>' + esc_(st.studentId) + '</td><th>ชื่อ-สกุล</th><td>' + esc_(st.name) + '</td></tr><tr><th>สาขา/ชั้นปี</th><td>' + esc_(st.program || '—') + '</td><th>บทเรียนที่เรียนแล้ว</th><td>' + lessons.filter(function (l) { return done.indexOf(l.id) >= 0; }).length + '/' + lessons.length + '</td></tr></table>');
  h.push('<h2>คะแนนรายงาน/กิจกรรม</h2><table><tr><th>รายการ</th><th>ประเภท</th><th class="n">คะแนนเต็ม</th><th class="n">ได้</th><th>สถานะ</th><th>ความเห็นอาจารย์</th><th>ผลงานที่ส่ง</th></tr>');
  items.forEach(function (i) {
    var s = subs.filter(function (x) { return x.itemId === i.id; })[0], m = Number(i.maxScore) || 0; max += m;
    var v = s && s.score !== '' ? Number(s.score) : null; if (v != null) total += v;
    var stt = !s ? (i.dueDate && new Date(i.dueDate) < new Date() ? '<span class="bad">ไม่ได้ส่ง/เลยกำหนด</span>' : 'ยังไม่ส่ง') : s.status === 'graded' ? 'ตรวจแล้ว' : s.status === 'returned' ? 'ส่งคืนให้แก้ไข' : 'ส่งแล้ว รอตรวจ';
    var nq = i.type === 'assignment' ? safeJson_(i.quiz, []).length : 0, ans = s ? safeJson_(s.answers, []) : [];
    var files = s ? safeJson_(s.files, []) : [];
    h.push('<tr><td>' + esc_(i.title) + (i.dueDate ? '<div class="d">กำหนดส่ง ' + esc_(fmtDate_(i.dueDate)) + '</div>' : '') + '</td><td>' + ITEM_TYPES[i.type] + '</td><td class="n">' + m + '</td><td class="n"><b>' + (v == null ? '–' : fx_(v)) + '</b></td><td>' + stt +
      (s && s.submittedAt ? '<div class="d">' + esc_(fmtDateTime_(s.submittedAt instanceof Date ? s.submittedAt : new Date(s.submittedAt))) + '</div>' : '') + '</td><td>' + esc_(s ? s.feedback : '') + '</td><td>' +
      files.map(function (f) { return '<a href="' + esc_(f.url) + '">' + esc_(f.name) + '</a>'; }).join('<br>') + (s && nq ? '<div class="d">ตอบคำถาม ' + ans.filter(function (a) { return String(a || '').trim(); }).length + '/' + nq + ' ข้อ</div>' : '') + (s && s.text ? '<div class="d">' + esc_(String(s.text).slice(0, 200)) + '</div>' : '') + '</td></tr>');
  });
  var pct = max ? Math.round(total / max * 1000) / 10 : 0;
  h.push('<tr class="hl"><td colspan="2"><b>รวม</b></td><td class="n">' + max + '</td><td class="n"><b>' + fx_(total) + '</b></td><td colspan="3">ร้อยละ ' + pct + ' · เกรด (ประมาณการ) <b>' + grade_(pct) + '</b></td></tr></table>');
  h.push('<div class="note"><b>หมายเหตุ</b><ul><li>(1) รายการที่ยังไม่มีคะแนนแสดงเป็น “–” และนับเป็น 0 ในคะแนนรวม</li><li>(2) เกรดเป็นการประมาณการตามเกณฑ์ค่าเริ่มต้นของระบบ (' + GRADE_SCALE.map(function (x) { return x[1] + '≥' + x[0]; }).join(', ') + ') ผลการเรียนจริงขึ้นกับการตัดสินของอาจารย์ผู้สอน</li></ul></div>');
  h.push('<p class="foot">พิมพ์เมื่อ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + '</p></div>');
  if (standalone) h.push('</body></html>');
  return h.join('');
}

/* ---------------------------- AI ช่วยสอน ---------------------------- */
/** kind: lesson | quiz | worksheet | activity | feedback | rubric ; input: {topic, level, n, extra, subId} */
function aiTeach(cred, kind, input) {
  requireAdmin_(cred);
  var s = settingsMap_(), key = PropertiesService.getScriptProperties().getProperty('AI_API_KEY');
  if (!key || !s.AI_PROVIDER || s.AI_PROVIDER === 'none' || !s.AI_MODEL) throw new Error('ยังไม่ได้ตั้งค่า AI — ไปที่ ตั้งค่า > AI ใส่ผู้ให้บริการ ชื่อโมเดล และ API key');
  input = input || {};
  var ctx = 'คุณเป็นผู้ช่วยอาจารย์มหาวิทยาลัยราชภัฏยะลา (บริบทพหุวัฒนธรรม ไทย-มลายู ชายแดนใต้) ตอบเป็นภาษาไทย ใช้ภาษาวิชาการที่อ่านง่าย';
  var topic = 'หัวข้อ: ' + (input.topic || '') + '\nระดับผู้เรียน: ' + (input.level || 'ปริญญาตรี') + (input.extra ? '\nข้อกำหนดเพิ่มเติม: ' + input.extra : '');
  var prompt;
  if (kind === 'lesson') prompt = ctx + '\nเขียนเนื้อหาบทเรียนรูปแบบ Markdown (ใช้ # หัวข้อ, ## หัวข้อย่อย, - รายการ, **ตัวหนา**) ประกอบด้วย วัตถุประสงค์การเรียนรู้ (CLO) เนื้อหาหลัก ตัวอย่าง กิจกรรมสั้น และสรุป\n' + topic;
  else if (kind === 'quiz') prompt = ctx + '\nสร้างแบบทดสอบปรนัย ' + (Number(input.n) || 5) + ' ข้อ ตัวเลือก 4 ตัว ตอบเป็น JSON array เท่านั้น รูปแบบ [{"q":"คำถาม","choices":["ก","ข","ค","ง"],"answer":0,"points":1}] (answer คือเลขลำดับตัวเลือกที่ถูก เริ่มที่ 0)\n' + topic;
  else if (kind === 'worksheet') prompt = ctx + '\nออกแบบใบงานรูปแบบ Markdown: ชื่อใบงาน จุดประสงค์ คำชี้แจง ภาระงาน/คำถาม 3–5 ข้อ เกณฑ์การให้คะแนน (rubric) และคะแนนเต็ม\n' + topic;
  else if (kind === 'activity') prompt = ctx + '\nออกแบบกิจกรรมการเรียนรู้เชิงรุก (Active Learning) 1–2 กิจกรรม รูปแบบ Markdown: ชื่อ ขั้นตอน เวลา สื่อ การวัดผล\n' + topic;
  else if (kind === 'rubric') prompt = ctx + '\nสร้างเกณฑ์การให้คะแนน (rubric) แบบตาราง Markdown 4 ระดับ สำหรับงานนี้\n' + topic;
  else if (kind === 'feedback') {
    var sub = findRow_(SHEETS_LMS.SUBS, 'id', input.subId), it = sub ? findRow_(SHEETS_LMS.ITEMS, 'id', sub.itemId) : null;
    if (!sub || !it) throw new Error('ไม่พบงานที่ส่ง');
    prompt = ctx + '\nช่วยร่างข้อเสนอแนะ (feedback) เชิงสร้างสรรค์สำหรับงานนักศึกษา และเสนอคะแนน (เต็ม ' + it.maxScore + ') ตอบเป็น JSON เท่านั้น {"score":number,"feedback":"ข้อความ 2-4 ประโยค"}' +
      '\nคำสั่งงาน: ' + it.instructions +
      (it.type === 'assignment' && safeJson_(it.quiz, []).length ? '\nคำถามและคำตอบของนักศึกษา:\n' + safeJson_(it.quiz, []).map(function (q, k) { var a = safeJson_(sub.answers, [])[k]; return 'ข้อ ' + (k + 1) + (q.points ? ' (' + q.points + ' คะแนน)' : '') + ': ' + q.q + '\nคำตอบ: ' + String(a || '(ไม่ได้ตอบ)').slice(0, 2000); }).join('\n') : '') +
      '\nข้อความที่นักศึกษาส่ง: ' + String(sub.text || '(ไม่มีข้อความ ส่งเป็นไฟล์ — ประเมินจากชื่อไฟล์ไม่ได้ ให้ตอบว่าต้องตรวจไฟล์เอง)').slice(0, 6000) +
      '\nไฟล์: ' + safeJson_(sub.files, []).map(function (f) { return f.name; }).join(', ');
  } else throw new Error('ไม่รู้จักคำสั่ง AI');
  var text = s.AI_PROVIDER === 'gemini' ? callGemini_(key, s.AI_MODEL, prompt) : callAnthropic_(key, s.AI_MODEL, prompt);
  if (kind === 'quiz') { var m = text.match(/\[[\s\S]*\]/); var arr = m ? safeJson_(m[0], null) : null; if (!arr) throw new Error('AI ตอบรูปแบบไม่ถูกต้อง ลองใหม่อีกครั้ง'); return arr; }
  if (kind === 'feedback') { var m2 = text.match(/\{[\s\S]*\}/); return m2 ? safeJson_(m2[0], { feedback: text }) : { feedback: text }; }
  return text;
}

/* ---------------------------- helpers ---------------------------- */
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function randCode_() { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += c.charAt(Math.floor(Math.random() * c.length)); return s; }
function nextOrder_(sheet, courseId) { return readTable_(sheet).filter(function (r) { return r.courseId === courseId; }).reduce(function (a, r) { return Math.max(a, Number(r.order) || 0); }, 0) + 1; }
function lessonOut_(l) { var o = cleanRow_(l); o.files = safeJson_(l.files, []); o.published = isTrue_(l.published); o.order = Number(l.order) || 0; return o; }
function itemOut_(i, withAnswer) {
  var o = cleanRow_(i); o.published = isTrue_(i.published); o.maxScore = Number(i.maxScore) || 0; o.order = Number(i.order) || 0;
  var q = safeJson_(i.quiz, []);
  o.quiz = withAnswer ? q : q.map(function (x) { return { q: x.q, choices: x.choices, points: x.points }; });
  return o;
}
function subOut_(s) { var o = cleanRow_(s); o.files = safeJson_(s.files, []); o.answers = safeJson_(s.answers, []); o.qScores = safeJson_(s.qScores, []); o.editCount = Number(s.editCount) || 0; o.submittedAt = s.submittedAt instanceof Date ? fmtDateTime_(s.submittedAt) : s.submittedAt; o.gradedAt = s.gradedAt instanceof Date ? fmtDateTime_(s.gradedAt) : s.gradedAt; return o; }
function lmsShare_(f) { try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { applySharing_(f); } }
function saveExportLms_(blob, forStudent) {
  var folder = subFolder_(subFolder_(ensureRootFolder_(), '_ห้องเรียน'), '_exports');
  var f = folder.createFile(blob);
  if (forStudent) lmsShare_(f); else applySharing_(f);
  return { url: f.getUrl(), download: 'https://drive.google.com/uc?export=download&id=' + f.getId(), name: f.getName() };
}


/**
 * Rubric.gs — เกณฑ์การประเมินผลการปฏิบัติราชการ ตำแหน่งวิชาการ
 * ที่มา: ประกาศมหาวิทยาลัยราชภัฏยะลา เรื่อง ปรับเกณฑ์การประเมินผลการปฏิบัติราชการ ตำแหน่งวิชาการ
 *        ประกาศ ณ วันที่ 31 ตุลาคม 2568 (เลขหน้าในฟิลด์ page อ้างอิงหน้าของประกาศ)
 *
 * mode:
 *   level   = เลือกระดับขั้นที่บรรลุ (ต้องมีหลักฐานอย่างน้อย 1 รายการ)
 *   mean    = ค่าเฉลี่ยความพึงพอใจ (คำนวณอัตโนมัติ)
 *   budget31/budget41 = งบประมาณ (คำนวณอัตโนมัติจากยอดเงิน x สัดส่วน)
 *   count   = นับจำนวนองค์ประกอบ/ข้อที่ดำเนินการได้
 *   cum     = องค์ประกอบสะสมตามลำดับ ("ดำเนินการได้ n องค์ประกอบ รวมถึง...")
 *   add     = คะแนนบวกสะสมตามรายการ (ตัวชี้วัด 4.7)
 *   comp    = สมรรถนะ (Milestone 5 ระดับ ต้องมีกรณีตัวอย่างพฤติกรรม)
 */

var GROUPS = [
  { key: 'adm', name: 'กลุ่มบริหาร' },
  { key: 'tch', name: 'กลุ่มการเรียนการสอน' },
  { key: 'res', name: 'กลุ่มวิจัย' },
  { key: 'svc', name: 'กลุ่มบริการวิชาการรับใช้สังคม' }
];

// น้ำหนักรายด้านของแต่ละกลุ่ม (หน้า 2–3, 49–51)
var SECTIONS = [
  { sec: 1, name: 'ภาระงานบริหาร',                 part: 'ผลสัมฤทธิ์ของงาน', w: { adm: 60, tch: 0,  res: 0,  svc: 0 },  primary: 'adm' },
  { sec: 2, name: 'ภาระงานด้านการเรียนการสอน',      part: 'ผลสัมฤทธิ์ของงาน', w: { adm: 2,  tch: 60, res: 3,  svc: 3 },  primary: 'tch' },
  { sec: 3, name: 'ภาระงานวิจัย',                   part: 'ผลสัมฤทธิ์ของงาน', w: { adm: 2,  tch: 3,  res: 60, svc: 3 },  primary: 'res' },
  { sec: 4, name: 'ภาระงานบริการวิชาการรับใช้สังคม', part: 'ผลสัมฤทธิ์ของงาน', w: { adm: 2,  tch: 3,  res: 3,  svc: 60 }, primary: 'svc' },
  { sec: 5, name: 'งานทำนุบำรุงศิลปะและวัฒนธรรม',  part: 'ผลสัมฤทธิ์ของงาน', w: { adm: 2,  tch: 2,  res: 2,  svc: 2 },  primary: null },
  { sec: 6, name: 'งานอื่นๆ ที่ได้รับมอบหมาย',      part: 'ผลสัมฤทธิ์ของงาน', w: { adm: 2,  tch: 2,  res: 2,  svc: 2 },  primary: null },
  { sec: 7, name: 'สมรรถนะหลัก',                    part: 'พฤติกรรมการปฏิบัติราชการ', w: { adm: 10, tch: 15, res: 15, svc: 15 }, primary: null },
  { sec: 8, name: 'สมรรถนะตามลักษณะงานที่ปฏิบัติ',  part: 'พฤติกรรมการปฏิบัติราชการ', w: { adm: 10, tch: 15, res: 15, svc: 15 }, primary: null },
  { sec: 9, name: 'สมรรถนะทางการบริหาร',            part: 'พฤติกรรมการปฏิบัติราชการ', w: { adm: 10, tch: 0,  res: 0,  svc: 0 },  primary: null }
];

var EVIDENCE_TYPES = [
  'คำสั่งแต่งตั้ง', 'หนังสือราชการ/บันทึกข้อความ', 'หนังสือเชิญ', 'หนังสือตอบรับ/รับรอง',
  'ประกาศ/สัญญาทุน', 'รายงานผลการดำเนินงาน', 'ต้นฉบับผลงาน/เอกสาร', 'ภาพกิจกรรม',
  'ลิงก์ข่าว/กิจกรรม', 'ลิงก์ระบบ (LMS/ทะเบียน/NRIIS/TCI)', 'เกียรติบัตร/รางวัล', 'อื่นๆ'
];

var ROLES = ['หัวหน้าโครงการ', 'ผู้อำนวยการแผนงาน', 'ผู้ร่วมวิจัย/ผู้ร่วมโครงการ', 'คณะทำงานหลัก', 'ผู้ปฏิบัติตามคำสั่ง', 'อื่นๆ'];

var INDICATORS = [
  // ---------------- 1. กลุ่มบริหาร (60) ----------------
  { code: '1.1', sec: 1, page: 4, w: 10, mode: 'count', countMap: [0,1,1,2,2,3,3,4,4,5,5],
    name: 'ความสามารถในการบริหารและการจัดการที่ดีตามหลักธรรมาภิบาล',
    unit: 'จำนวนข้อ (10 องค์ประกอบ)',
    items: ['หลักประสิทธิผล (Effectiveness)', 'หลักประสิทธิภาพ (Efficiency)', 'หลักการตอบสนอง (Responsiveness)',
            'หลักภาระรับผิดชอบ (Accountability)', 'หลักความโปร่งใส (Transparency)', 'หลักการมีส่วนร่วม (Participation)',
            'หลักการกระจายอำนาจ (Decentralization)', 'หลักนิติธรรม (Rule of Law)', 'หลักความเสมอภาค (Equity)',
            'หลักมุ่งเน้นฉันทามติ (Consensus Oriented)'],
    lv: ['ได้ 1–2 องค์ประกอบ', 'ได้ 3–4 องค์ประกอบ', 'ได้ 5–6 องค์ประกอบ', 'ได้ 7–8 องค์ประกอบ', 'ได้ 9–10 องค์ประกอบ'],
    ev: 'แผนยุทธศาสตร์/แผนปฏิบัติราชการ, รายงานผลตามคำรับรอง, ข้อมูลความพึงพอใจ, รายงานการประชุมที่แสดงการมีส่วนร่วม, เอกสารมอบอำนาจ, คู่มือการปฏิบัติงาน' },
  { code: '1.2', sec: 1, page: 6, w: 30, mode: 'cum',
    name: 'ผลสัมฤทธิ์ในการนำนโยบายและยุทธศาสตร์ของมหาวิทยาลัย/ส่วนราชการ/ส่วนงานภายใน ไปขับเคลื่อนตามคำรับรอง',
    unit: 'Milestone (5 องค์ประกอบสะสม)',
    items: ['ความสอดคล้องของนโยบายกับยุทธศาสตร์และคำรับรอง', 'การถ่ายทอดนโยบายสู่การปฏิบัติ', 'ผลลัพธ์ที่เกิดขึ้นจากการดำเนินงานตามนโยบาย',
            'จำนวนโครงการที่บรรลุตามเป้าหมาย', 'การรายงานผล การประเมินผล และการนำไปปรับปรุง'],
    lv: ['ได้ 1 องค์ประกอบ – ความสอดคล้องของนโยบาย', 'ได้ 2 องค์ประกอบ – รวมถึงการถ่ายทอดนโยบาย', 'ได้ 3 องค์ประกอบ – รวมถึงผลลัพธ์',
         'ได้ 4 องค์ประกอบ – รวมถึงโครงการบรรลุเป้าหมาย', 'ได้ครบ 5 องค์ประกอบ – รวมถึงการรายงาน ประเมินผล และปรับปรุง'],
    ev: 'เอกสารนโยบาย, แผนยุทธศาสตร์/แผนปฏิบัติราชการ, คำรับรอง, แผนถ่ายทอด KPIs, รายงานการประชุมชี้แจง, รายงานผลโครงการ, แผนปรับปรุง',
    note: 'ตำแหน่งอธิการบดีให้มีน้ำหนัก 40 คะแนน (หน้า 4, 6)' },
  { code: '1.3', sec: 1, page: 7, w: 10, mode: 'cum',
    name: 'ผลสัมฤทธิ์ในการขับเคลื่อนภารกิจประจำของมหาวิทยาลัย/ส่วนราชการ/ส่วนงานภายในที่กำกับดูแลตามคำรับรอง',
    unit: 'Milestone (5 องค์ประกอบสะสม)',
    items: ['การกำหนดภารกิจประจำและเป้าหมายที่ชัดเจน', 'การจัดสรรทรัพยากรและการบริหารจัดการ', 'การดำเนินงานตามแผนและกระบวนการ',
            'ผลสัมฤทธิ์ตามตัวชี้วัดที่กำหนด', 'การพัฒนาและปรับปรุงการปฏิบัติงาน'],
    lv: ['ได้ 1 องค์ประกอบ', 'ได้ 2 องค์ประกอบ', 'ได้ 3 องค์ประกอบ', 'ได้ 4 องค์ประกอบ', 'ได้ครบ 5 องค์ประกอบ'],
    ev: 'เอกสารกำหนดภารกิจ, คำรับรอง, แผนการใช้งบประมาณ, รายงานความก้าวหน้า, รายงานผลตัวชี้วัด, แผนพัฒนา/รายงานการปรับปรุง' },
  { code: '1.4', sec: 1, page: 8, w: 10, mode: 'cum',
    name: 'ผลสัมฤทธิ์ด้านงานเร่งด่วน หรือภารกิจที่มหาวิทยาลัย/ส่วนราชการ/ส่วนงานภายในมอบหมาย',
    unit: 'จำนวนข้อ (5 องค์ประกอบสะสม)',
    items: ['ความเข้าใจและการตอบสนองต่อภารกิจที่ได้รับมอบหมาย', 'การวางแผนและจัดลำดับความสำคัญ', 'การประสานงานและการสื่อสาร',
            'ผลสำเร็จของงานตามระยะเวลาที่กำหนด', 'การติดตาม ประเมินผล และการรายงาน'],
    lv: ['ได้ 1 องค์ประกอบ', 'ได้ 2 องค์ประกอบ', 'ได้ 3 องค์ประกอบ', 'ได้ 4 องค์ประกอบ', 'ได้ครบ 5 องค์ประกอบ'],
    ev: 'หนังสือมอบหมายงาน, แผนดำเนินงานเร่งด่วน, รายงานการประชุม, เอกสารส่งมอบงาน, รายงานสรุปผลเสนอผู้บริหาร' },

  // ---------------- 2. กลุ่มการเรียนการสอน (60) ----------------
  { code: '2.1', sec: 2, page: 9, w: 5, mode: 'level', pts: [1,2,3,4,5],
    name: 'การวางแผนการจัดการเรียนรู้', unit: 'ระดับ',
    lv: ['อยู่ระหว่างจัดทำ OBE.3/OBE.4 ในระบบ eservice.yru.ac.th/tqf',
         'จัดทำ OBE.3/OBE.4 ในระบบอย่างครบถ้วน',
         'สร้างรายวิชาและโครงสร้างรายวิชาใน YRU e-Learning สอดคล้อง OBE.3/4 ทุกรายวิชา',
         'อยู่ระหว่างกำหนดกิจกรรม เอกสาร สื่อ และการวัดประเมินผลใน YRU e-Learning ทุกรายวิชา',
         'กำหนดกิจกรรม เอกสาร สื่อ และการวัดประเมินผลใน YRU e-Learning ทุกรายวิชาอย่างสมบูรณ์'],
    ev: 'OBE.3/OBE.4 จากระบบ TQF, ลิงก์/ภาพหน้าจอรายวิชาใน YRU e-Learning, รายการรายวิชาที่สอน' },
  { code: '2.2', sec: 2, page: 10, w: 15, mode: 'level', pts: [3,7,9,13,15],
    name: 'การพัฒนาเนื้อหาบทเรียน/หลักสูตรระยะสั้น เพื่อเข้าสู่ระบบคลังหน่วยกิต', unit: 'ระดับ',
    lv: ['จัดทำคลิปการจัดการเรียนรู้ได้ครึ่งหนึ่งตามโครงสร้างรายวิชา/หลักสูตรระยะสั้น',
         'จัดทำคลิปได้ครบถ้วนตามโครงสร้างรายวิชา/หลักสูตรระยะสั้น',
         'นำคลิปรายวิชา/หลักสูตรระยะสั้นเข้าสู่ระบบ YRU E-learning',
         'จัดการเรียนการสอนของรายวิชา/หลักสูตรระยะสั้น on site หรือ E-learning',
         'นำรายวิชา/หลักสูตรระยะสั้นที่ผ่านสภาวิชาการ เสนอต่อคณะกรรมการคลังหน่วยกิตของมหาวิทยาลัย'],
    ev: 'รายการคลิป/ลิงก์วิดีโอ, ลิงก์รายวิชาใน E-learning, หลักฐานการสอน, มติสภาวิชาการ, หนังสือนำเสนอคณะกรรมการคลังหน่วยกิต (สมอ.08 กรณีหลักสูตรระยะสั้น)',
    note: 'จำนวนคลิปย่อยกำหนดเองได้ตาม OBE.3/4; ใช้ Canva/Camtasia ได้; หลักสูตรระยะสั้นที่ไม่มีใน OBE ให้จัดทำ สมอ.08 (หน้า 10)' },
  { code: '2.3', sec: 2, page: 10, w: 10, mode: 'level', pts: [2,4,6,8,10],
    name: 'การจัดการเรียนการสอนตามกรอบ PSF (Professional Standards Framework)', unit: 'ระดับ',
    lv: ['มีโครงสร้างเอกสารขอรับการประเมินสมรรถนะอาจารย์ตามกรอบ PSF',
         'เขียนเอกสารขอรับการประเมินได้ครึ่งหนึ่ง',
         'เขียนเอกสารขอรับการประเมินได้ครบถ้วนสมบูรณ์',
         'ส่งเอกสารในระบบเพื่อขอรับการประเมิน',
         'ผ่านการประเมินสมรรถนะอาจารย์ตามกรอบ PSF ระดับใดระดับหนึ่ง'],
    ev: 'โครงร่าง/ร่างเอกสาร PSF, หลักฐานการส่งในระบบ, ผลการประเมิน Thailand PSF (ควอท)',
    note: 'ใช้ผลประเมินระดับเดิมได้ 2 ปี; ครบกำหนดต้องส่งระดับที่สูงขึ้น เว้นแต่ได้ระดับสูงสุดแล้ว (หน้า 11)' },
  { code: '2.4', sec: 2, page: 11, w: 10, mode: 'level', pts: [2,4,6,8,10],
    name: 'การทำวิจัยเพื่อพัฒนาการเรียนรู้', unit: 'ระดับ',
    lv: ['มีข้อเสนอโครงการวิจัยในชั้นเรียน', 'ผ่านการพิจารณาเห็นชอบจากคณะหรือแหล่งทุน (ถ้ามี)', 'อยู่ระหว่างการดำเนินการวิจัย',
         'วิจัยเสร็จสิ้นและมีรายงานการวิจัยในชั้นเรียน', 'เผยแพร่งานวิจัยในชั้นเรียนในรูปแบบใดรูปแบบหนึ่ง'],
    ev: 'ข้อเสนอโครงการ, หนังสืออนุมัติ, เครื่องมือ/ข้อมูล, รายงานวิจัย 5 บท, บทความ/หนังสือนำส่งเล่มวิจัย',
    note: 'เผยแพร่ได้หลายรูปแบบ เช่น บทความวิจัย หรือส่งเล่มวิจัย 5 บทไปยังหน่วยงานที่เกี่ยวข้อง (หน้า 11)' },
  { code: '2.5', sec: 2, page: 11, w: 5, mode: 'mean', pts: [1,2,3,4,5],
    name: 'ผลการประเมินความพึงพอใจการเรียนการสอนจากผู้เรียน', unit: 'ค่าเฉลี่ย (คำนวณอัตโนมัติ)',
    lv: ['ค่าเฉลี่ย 1.00–2.00', 'ค่าเฉลี่ย 2.01–3.00', 'ค่าเฉลี่ย 3.01–3.50', 'ค่าเฉลี่ย 3.51–4.00', 'ค่าเฉลี่ย 4.01–5.00'],
    ev: 'รายงานผลประเมินการสอนจาก register.yru.ac.th/registrar รายวิชาละ 1 รายการ (ใส่ค่าเฉลี่ยในช่องตัวเลข)',
    note: 'ใช้ค่าเฉลี่ยของทุกรายวิชา; ผลผิดปกติที่ไม่ใช่เหตุจากผู้สอนให้แนบคำชี้แจง; ข้อร้องเรียนของผู้เรียนใช้ประกอบการพิจารณา (หน้า 12)' },
  { code: '2.6', sec: 2, page: 12, w: 10, mode: 'level', pts: [2,4,6,8,10],
    name: 'การทำตำรา/หนังสือ/เอกสารประกอบการสอนที่เป็นไปตามเกณฑ์ กพอ.', unit: 'ระดับ',
    lv: ['มีโครงสร้างเนื้อหาของตำรา/หนังสือ/เอกสารประกอบการสอน', 'เขียนได้ครึ่งหนึ่ง', 'เขียนได้ครบถ้วนสมบูรณ์',
         'ส่งตำรา/หนังสือให้ผู้ทรงคุณวุฒิ (Peer Review 3 ท่าน) หรือเอกสารประกอบการสอนเสนอคณะตรวจสอบคุณภาพ',
         'ตำรา/หนังสือผ่านการตรวจจากผู้ทรงคุณวุฒิภายนอก หรือเอกสารประกอบการสอนเผยแพร่ห้องสมุด/ใช้สอน'],
    ev: 'สารบัญ/โครงร่าง, ต้นฉบับ, หนังสือส่งผู้ทรงคุณวุฒิ, ผลการตรวจคุณภาพ, หลักฐานนำส่งห้องสมุด/ใช้สอน',
    note: 'เอกสารประกอบการสอนใช้ได้ 2 รอบ (1 ปี); ตำรา/หนังสือใช้ได้ 6 รอบ (3 ปี) (หน้า 12)' },
  { code: '2.7', sec: 2, page: 12, w: 5, mode: 'level', pts: [1,2,4,5],
    name: 'การสนับสนุนการเรียนการสอนเป็นภาษาอังกฤษ', unit: 'ระดับ (4 ระดับ)',
    lv: ['สื่อภาษาอังกฤษบางส่วนของเนื้อหาในรายวิชาและนำมาใช้สอน', 'สื่อภาษาอังกฤษครึ่งหนึ่งของเนื้อหาในรายวิชาและนำมาใช้สอน',
         'สื่อภาษาอังกฤษครบทั้งรายวิชา 1 วิชา และนำมาใช้สอน', 'สื่อภาษาอังกฤษครบทั้งรายวิชามากกว่า 1 วิชา หรือสอนเป็นภาษาอังกฤษต่อเนื่องตามโครงสร้างรายวิชา'],
    ev: 'สไลด์/เอกสาร/ใบงานภาษาอังกฤษ, ภาพหรือลิงก์การใช้สอนจริง',
    note: 'กลุ่มการเรียนการสอนต้องมีงานวิจัยและบริการวิชาการอย่างน้อย 1 เรื่อง (หน้า 13)' },

  // ---------------- 3. กลุ่มวิจัย (60) ----------------
  { code: '3.1', sec: 3, page: 13, w: 30, mode: 'budget31',
    name: 'งบสนับสนุนทุนวิจัยจากแหล่งทุนภายนอก', unit: 'ระดับ (คำนวณจากงบประมาณ)',
    lv: ['ได้รับทุนวิจัยจากแหล่งทุนภายนอก (ข้อ 1)', 'ข้อ 1 + เป็นผู้อำนวยการแผนงาน/หัวหน้าโครงการ/ผู้ร่วมวิจัย งบต่ำกว่า 400,000 บาท',
         'ข้อ 1 + งบ 400,000–999,999 บาท', 'ข้อ 1 + งบ 1,000,000–2,999,999 บาท', 'ข้อ 1 + งบ 3,000,000 บาทขึ้นไป'],
    ev: 'ประกาศจากแหล่งทุน, สัญญารับทุน, หลักฐานจากระบบ NRIIS',
    note: 'ผู้ร่วมวิจัยคิดตามสัดส่วนการมีส่วนร่วม รวมหลายโครงการได้; หัวหน้าคิดจากงบรวมของโครงการ; ผู้ได้ทุนภายนอกต้องประเมินในกลุ่มวิจัย (หน้า 14)' },
  { code: '3.2', sec: 3, page: 14, w: 15, mode: 'level',
    name: 'การเผยแพร่หรือคุ้มครองผลงานทรัพย์สินทางปัญญา', unit: 'ระดับ',
    lv: ['ข้อ 1', 'ข้อ 2', 'ข้อ 3', 'ข้อ 4', 'ข้อ 5'],
    opts: [
      { lv: 1, t: '[บทความ] อยู่ระหว่างการตรวจสอบของบรรณาธิการ' },
      { lv: 2, t: '[บทความ] อยู่ระหว่างการประเมินของผู้ทรงคุณวุฒิ' },
      { lv: 3, t: '[บทความ] ได้รับการตอบรับตีพิมพ์' },
      { lv: 4, t: '[บทความ] เผยแพร่ในวารสารระดับชาติ' },
      { lv: 5, t: '[บทความ] เผยแพร่ในวารสารระดับนานาชาติ' },
      { lv: 1, t: '[ทรัพย์สินทางปัญญา] รายงานข้อค้นพบใหม่ตาม พรบ. Triup Act' },
      { lv: 2, t: '[ทรัพย์สินทางปัญญา] ได้สิทธิ์ความเป็นเจ้าของตาม พรบ. Triup Act' },
      { lv: 3, t: '[ทรัพย์สินทางปัญญา] ยื่นจดอนุสิทธิบัตร/สิทธิบัตรออกแบบ' },
      { lv: 4, t: '[ทรัพย์สินทางปัญญา] ยื่นสิทธิบัตรการประดิษฐ์' },
      { lv: 5, t: '[ทรัพย์สินทางปัญญา] อนุญาตให้ใช้สิทธิ์ในทรัพย์สินทางปัญญา' }
    ],
    ev: 'หลักฐานจาก ThaiJO/Scopus, หนังสือตอบรับ, บทความที่เผยแพร่, หลักฐานการยื่นระบบ Triup Act, เลขที่คำขอ, สัญญาอนุญาตใช้สิทธิ' },
  { code: '3.3', sec: 3, page: 15, w: 15, mode: 'level',
    name: 'การนำผลงานวิจัยไปใช้ประโยชน์', unit: 'ระดับ',
    lv: ['มีกลุ่มเป้าหมายได้รับประโยชน์จากงานวิจัย', 'จัดนิทรรศการส่งเสริมการใช้ประโยชน์ระดับมหาวิทยาลัยขึ้นไปที่มีหน่วยงานภายนอกร่วม',
         'มีการเปลี่ยนแปลงชัดเจนเป็นรูปธรรมระดับผลลัพธ์ (Outcome)', 'ได้รับรางวัลระดับประเทศ หรือมีการต่อยอด/ขยายผลงานวิจัย',
         'ได้รับรางวัลระดับนานาชาติ หรือใช้ประโยชน์เชิงนโยบาย'],
    ev: 'ภาพถ่าย, หนังสือรับรองการใช้ประโยชน์, หนังสือตอบรับ/เชิญ, หลักฐาน Outcome เชิงประจักษ์, MoU/MoA, เอกสารรางวัล' },

  // ---------------- 4. กลุ่มบริการวิชาการรับใช้สังคม (60) ----------------
  { code: '4.1', sec: 4, page: 16, w: 5, mode: 'budget41',
    name: 'งบประมาณที่ได้รับในโครงการ', unit: 'ระดับ (คำนวณจากงบประมาณ)',
    lv: ['ต่ำกว่า 100,000 บาท', '100,001–250,000 บาท', '250,001–500,000 บาท', '500,001–1,000,000 บาท', 'มากกว่า 1,000,000 บาท'],
    ev: 'หนังสืออนุมัติโครงการ/จัดสรรงบประมาณ, คำสั่งแต่งตั้งผู้รับผิดชอบ',
    note: 'ผู้รับผิดชอบหลายคนให้คิดตามสัดส่วน รวมหลายโครงการได้ (หน้า 16)' },
  { code: '4.2', sec: 4, page: 16, w: 5, mode: 'level',
    name: 'บทบาทความรับผิดชอบในโครงการ', unit: 'ระดับ',
    lv: ['ปฏิบัติงานตามคำสั่งการปฏิบัติงาน', 'คณะทำงานหลักในรายชื่อผู้รับผิดชอบโครงการ', 'ปฏิบัติงานหลัก/ไม่ตรงตามเลขที่ตำแหน่ง',
         'ปฏิบัติงานหลัก/ตรงตามเลขที่ตำแหน่ง', 'หัวหน้าโครงการหรือกิจกรรมย่อย'],
    ev: 'คำสั่งแต่งตั้ง, เอกสารโครงการที่ระบุรายชื่อผู้รับผิดชอบ' },
  { code: '4.3', sec: 4, page: 16, w: 15, mode: 'level', pts: [3,6,9,12,15],
    name: 'กระบวนการทำงานตาม TRL (Technology Readiness Level)', unit: 'ระดับ TRL',
    lv: ['TRL 1 – การจัดการความรู้ทางวิชาการ นวัตกรรม (รวบรวมองค์ความรู้/บริหารจัดการความรู้และทรัพย์สินทางปัญญา)',
         'TRL 2–3 – การสร้างกลไกการเชื่อมโยง Demand–Supply และประสานหน่วยงานขับเคลื่อน',
         'TRL 4–5 – สร้างความเชื่อมั่นในผลงาน: พัฒนา/ปรับปรุงให้ตอบผู้ใช้ และผลักดันการรับรองมาตรฐาน',
         'TRL 6–8 – ถ่ายทอด/ขยายผลเชิงพื้นที่สู่การใช้จริง และผลิตสื่อเผยแพร่',
         'TRL 9 – สร้างความเข้มแข็งให้ชุมชน (เพิ่มทักษะผู้รับการถ่ายทอด วิสาหกิจชุมชน ผู้ประกอบการ)'],
    ev: 'รายงานโครงการ, ฐานข้อมูลองค์ความรู้, ต้นแบบ/ผล Pilot, หลักฐานการใช้จริงในพื้นที่, สื่อเผยแพร่',
    note: 'ดูตัวอย่างการประยุกต์ใช้รายคณะ หน้า 17–21' },
  { code: '4.4', sec: 4, page: 22, w: 5, mode: 'level',
    name: 'กระบวนการทำงานตาม SRL', unit: 'ระดับ SRL',
    lv: ['SRL 1–2 Awareness – การรับรู้/ยอมรับในระดับชุมชน', 'SRL 3–4 Experimentation – ทดลองใช้ในกลุ่มเล็ก เก็บ feedback',
         'SRL 5–6 Application – ประยุกต์ใช้จริงในพื้นที่ เริ่มสร้างเครือข่าย', 'SRL 7–8 Expansion – ขยายผล สร้างมาตรฐาน/การรับรอง',
         'SRL 9 Sustainability – ฝังรากและยั่งยืนในชุมชน พึ่งพาตนเอง'],
    ev: 'รายงานกิจกรรมเผยแพร่, ผลทดลองใช้/feedback, หลักฐานผู้ใช้จริง, เครือข่าย/มาตรฐาน, หลักฐานความยั่งยืน',
    note: 'ประเมิน 2 รอบ: รอบแรกพิจารณาการวางระบบ รอบสองพิจารณาผลลัพธ์จริง (หน้า 22)' },
  { code: '4.5', sec: 4, page: 24, w: 10, mode: 'level',
    name: 'ต้นแบบที่ใช้ประโยชน์ได้', unit: 'ระดับ',
    lv: ['นำเสนอแนวคิดต้นแบบ/อยู่ระหว่างพัฒนา ยังไม่มีหลักฐานการใช้ในพื้นที่',
         'ต้นแบบเสร็จแต่อยู่ระหว่างส่งมอบ/ประชาสัมพันธ์ หรือใช้จริงแต่หลักฐานผลกระทบยังไม่เพียงพอ',
         'ต้นแบบสมบูรณ์ ได้ใช้/ทดลองใช้จริง มีหลักฐานผลกระทบเชิงบวกระยะสั้น',
         'ต้นแบบใช้จริงในพื้นที่เป้าหมาย มีหลักฐานผลกระทบเชิงบวกยั่งยืนเป็นรูปธรรม แต่ยังไม่ขยายผล',
         'ต้นแบบใช้จริงและขยายผล/ต่อยอดไปพื้นที่อื่นอย่างน้อย 1 แห่ง พร้อมหลักฐานผลกระทบยั่งยืน'],
    ev: 'เอกสาร/ภาพต้นแบบ, หนังสือส่งมอบ, หลักฐานการใช้จริง, ข้อมูลผลกระทบ, หลักฐานการขยายผล' },
  { code: '4.6', sec: 4, page: 24, w: 10, mode: 'level',
    name: 'ผลงานวิชาการรับใช้สังคม ต้องมี Peer Review และมีการเผยแพร่', unit: 'ระดับ',
    lv: ['จัดทำเล่มแต่ขาดความเป็นระบบ ไม่ผ่าน Peer Review ไม่เผยแพร่',
         'เล่มครบเบื้องต้น ส่งผู้ทรงคุณวุฒิน้อยกว่า 2 ท่าน เผยแพร่วงจำกัด',
         'เล่มเป็นระบบ ผ่าน Peer Review ≥2 ท่าน เผยแพร่ช่องทางทางการของมหาวิทยาลัย/คณะ',
         'คุณภาพสูง ผ่าน Peer Review ≥3 ท่าน ปรับแก้ครบ เผยแพร่สาธารณะ มีหลักฐานใช้ประโยชน์จริง',
         'มาตรฐานต้นแบบ ผ่าน Peer Review หลายสาขา (≥3) เผยแพร่วงกว้าง ใช้ประโยชน์เชิงนโยบาย/ขยายผล'],
    ev: 'เล่มรับใช้สังคม, หนังสือ/ผลการประเมินจากผู้ทรงคุณวุฒิ, ลิงก์เผยแพร่ (เว็บไซต์/E-book), หลักฐานการใช้ประโยชน์',
    note: 'ต้องเป็นไปตามประกาศ ก.พ.อ. เรื่องหลักเกณฑ์การแต่งตั้ง ผศ./รศ./ศ. พ.ศ. 2564 (หน้า 24)' },
  { code: '4.7', sec: 4, page: 25, w: 10, mode: 'add',
    name: 'เกณฑ์การพิจารณาผลงานวิชาการรับใช้สังคมในการขอกำหนดตำแหน่งทางวิชาการ', unit: 'คะแนนสะสม (เต็ม 10)',
    items: ['เป็นหัวหน้าโครงการบริการวิชาการรับใช้สังคม', 'ผลงานตรงกับเลขตำแหน่งที่ใช้ขอผลงานทางวิชาการรับใช้สังคม',
            'เป็นคณะทำงานไม่เกิน 3 โครงการ', 'ตีพิมพ์ผลงานวิชาการรับใช้สังคมในวารสารที่ ก.พ.อ. รับรอง (ไม่เกิน 2 รอบการประเมิน)'],
    itemPts: [5, 1, 1, 3],
    lv: ['', '', '', '', ''],
    ev: 'คำสั่งแต่งตั้งหัวหน้าโครงการ, เอกสารเลขตำแหน่ง, คำสั่งคณะทำงาน, บทความที่ตีพิมพ์' },

  // ---------------- 5. ทำนุบำรุงศิลปะและวัฒนธรรม (2) ----------------
  { code: '5.1', sec: 5, page: 26, mode: 'count', countMap: [0,1,2,3,4,5,5],
    name: 'ความสำเร็จการดำเนินงานและขับเคลื่อนตัวบ่งชี้ด้านการทำนุบำรุงศิลปะและวัฒนธรรม', unit: 'จำนวนข้อ (6 ข้อ)',
    items: ['ร่วมกิจกรรมทำนุบำรุงฯ ของคณะหรือมหาวิทยาลัย ไม่น้อยกว่า 2 ครั้งต่อรอบ',
            'มีส่วนรับผิดชอบจัดกิจกรรม โดยมีคำสั่งระดับภาควิชาหรือกอง/ศูนย์ขึ้นไป 1 ครั้งต่อรอบ',
            'รับผิดชอบโครงการด้านทำนุบำรุงฯ ในระดับหลักสูตรหรือระดับงานขึ้นไป', 'เป็นหัวหน้าโครงการ',
            'บูรณาการทำนุบำรุงฯ กับการเรียนการสอนและ/หรือกิจกรรมนักศึกษา',
            'เผยแพร่ต่อสาธารณชน หรือได้รับการยกย่องระดับมหาวิทยาลัยขึ้นไป'],
    lv: ['ดำเนินการ 1 ข้อ', 'ดำเนินการ 2 ข้อ', 'ดำเนินการ 3 ข้อ', 'ดำเนินการ 4 ข้อ', 'ดำเนินการ 5 หรือ 6 ข้อ'],
    ev: 'คำสั่ง, กำหนดการ, ภาพกิจกรรม, รายงานโครงการ, มคอ./แผนการสอนที่บูรณาการ, ลิงก์ข่าวเผยแพร่' },

  // ---------------- 6. งานอื่นๆ ที่ได้รับมอบหมาย (2) ----------------
  { code: '6.1', sec: 6, page: 27, mode: 'level',
    name: 'การมีส่วนร่วมในการดำเนินงานของมหาวิทยาลัย', unit: 'ระดับ (ตามข้อตกลง)',
    lv: ['ระดับ 1 ตามข้อตกลงกับผู้ประเมิน', 'ระดับ 2 ตามข้อตกลง', 'ระดับ 3 ตามข้อตกลง', 'ระดับ 4 ตามข้อตกลง', 'ระดับ 5 ตามข้อตกลง'],
    ev: 'คำสั่งแต่งตั้ง, บันทึกมอบหมาย, รายงานผล, หลักฐานความสำเร็จ',
    note: 'ประกาศ (หน้า 27) ยังไม่ได้กำหนดคำอธิบายและเกณฑ์รายระดับ ต้องตกลงกับผู้ประเมิน' },

  // ---------------- 7. สมรรถนะหลัก ----------------
  { code: '7.1', sec: 7, page: 28, mode: 'comp', name: 'การมุ่งผลสัมฤทธิ์',
    lv: ['พยายามปฏิบัติหน้าที่ราชการให้ดี', 'ทำงานได้ผลงานตามเป้าหมายที่วางไว้', 'ปรับปรุงวิธีการเพื่อให้ได้ผลงานที่มีประสิทธิภาพยิ่งขึ้น',
         'กำหนดเป้าหมายที่ท้าทายและพัฒนางานให้โดดเด่น', 'กล้าตัดสินใจแม้มีความเสี่ยง เพื่อบรรลุเป้าหมายของหน่วยงาน'] },
  { code: '7.2', sec: 7, page: 29, mode: 'comp', name: 'การสั่งสมความเชี่ยวชาญในงานอาชีพ',
    lv: ['สนใจติดตามความรู้ใหม่ในสาขาอาชีพ', 'มีความรู้ในวิชาการและเทคโนโลยีใหม่ในสาขา', 'นำความรู้/เทคโนโลยีใหม่มาปรับใช้กับการปฏิบัติราชการ',
         'พัฒนาตนเองให้มีความเชี่ยวชาญทั้งเชิงลึกและกว้าง (สหวิทยาการ)', 'สนับสนุนให้คนในองค์กรพัฒนาความเชี่ยวชาญ'] },
  { code: '7.3', sec: 7, page: 31, mode: 'comp', name: 'การทำงานเป็นทีม',
    lv: ['ทำหน้าที่ของตนในทีมให้สำเร็จ', 'ให้ความร่วมมือในการทำงานกับเพื่อนร่วมงาน', 'ประสานความร่วมมือของสมาชิกในทีม',
         'สนับสนุนช่วยเหลือเพื่อนในทีมเพื่อให้งานสำเร็จ', 'นำทีมให้ปฏิบัติภารกิจได้ผลสำเร็จ'] },
  { code: '7.4', sec: 7, page: 32, mode: 'comp', name: 'การบริการที่ดี',
    lv: ['ให้บริการตามที่ผู้รับบริการต้องการด้วยความเต็มใจ', 'ช่วยแก้ปัญหาให้แก่ผู้รับบริการ', 'ให้บริการที่เกินความคาดหวัง',
         'เข้าใจและให้บริการตรงความต้องการที่แท้จริง', 'ให้บริการที่เป็นประโยชน์อย่างแท้จริงในระยะยาว'] },
  { code: '7.5', sec: 7, page: 33, mode: 'comp', name: 'การยึดมั่นในความถูกต้องชอบธรรมและจริยธรรม',
    lv: ['มีความสุจริต', 'มีสัจจะ เชื่อถือได้', 'ยึดมั่นในหลักการ', 'ยืนหยัดเพื่อความถูกต้อง', 'อุทิศตนเพื่อความยุติธรรม'] },

  // ---------------- 8. สมรรถนะตามลักษณะงาน ----------------
  { code: '8.1', sec: 8, page: 34, mode: 'comp', name: 'การมองภาพองค์รวม',
    lv: ['ใช้กฎพื้นฐานทั่วไป', 'ประยุกต์ใช้ประสบการณ์', 'ประยุกต์ทฤษฎีหรือแนวคิดซับซ้อน', 'อธิบายข้อมูลซับซ้อนให้เข้าใจง่าย', 'คิดริเริ่มสร้างสรรค์องค์ความรู้ใหม่'] },
  { code: '8.2', sec: 8, page: 35, mode: 'comp', name: 'ความเข้าใจข้อแตกต่างทางวัฒนธรรม',
    lv: ['เห็นคุณค่าวัฒนธรรมไทยและสนใจวัฒนธรรมอื่น', 'เข้าใจและปรับตัวให้สอดคล้องกับวัฒนธรรมใหม่', 'เข้าใจวัฒนธรรมต่างๆ อย่างลึกซึ้ง',
         'สร้างการยอมรับในความแตกต่างทางวัฒนธรรม', 'ปรับท่าทีและวิธีทำงานให้สอดคล้องกับบริบทวัฒนธรรม'] },
  { code: '8.3', sec: 8, page: 36, mode: 'comp', name: 'การดำเนินการเชิงรุก',
    lv: ['เห็นปัญหา/โอกาสระยะสั้นและลงมือดำเนินการ', 'จัดการปัญหาเฉพาะหน้าหรือเหตุวิกฤติ', 'เตรียมการล่วงหน้าระยะสั้น',
         'เตรียมการล่วงหน้าระยะปานกลาง', 'เตรียมการล่วงหน้าระยะยาว'] },
  { code: '8.4', sec: 8, page: 38, mode: 'comp', name: 'ความผูกพันที่มีต่อมหาวิทยาลัยราชภัฏยะลา',
    lv: ['ปฏิบัติตนเป็นส่วนหนึ่งของมหาวิทยาลัย', 'แสดงความภักดีต่อมหาวิทยาลัย', 'มีส่วนร่วมผลักดันพันธกิจของมหาวิทยาลัย',
         'ยึดถือประโยชน์ของมหาวิทยาลัยเป็นที่ตั้ง', 'เสียสละเพื่อประโยชน์ของมหาวิทยาลัย'] },
  { code: '8.5', sec: 8, page: 39, mode: 'comp', name: 'การสร้างสัมพันธภาพ',
    lv: ['สร้าง/รักษาการติดต่อกับผู้เกี่ยวข้องกับงาน', 'สร้าง/รักษาความสัมพันธ์ที่ดีอย่างใกล้ชิด', 'สร้าง/รักษาการติดต่อสัมพันธ์ทางสังคม',
         'สร้าง/รักษาความสัมพันธ์ฉันมิตร', 'รักษาความสัมพันธ์ฉันมิตรในระยะยาว'] },

  // ---------------- 9. สมรรถนะทางการบริหาร (กลุ่มบริหารเท่านั้น) ----------------
  { code: '9.1', sec: 9, page: 40, mode: 'comp', wAdm: 2.5, name: 'สภาวะผู้นำ',
    lv: ['ดำเนินการประชุมได้ดีและแจ้งข่าวสารสม่ำเสมอ', 'เป็นผู้นำกลุ่มและใช้อำนาจอย่างยุติธรรม', 'ให้การดูแลและช่วยเหลือทีมงาน',
         'ประพฤติตนให้สมกับเป็นผู้นำ', 'นำทีมไปสู่พันธกิจระยะยาวขององค์กร'] },
  { code: '9.2', sec: 9, page: 41, mode: 'comp', wAdm: 1.5, name: 'วิสัยทัศน์',
    lv: ['รู้และเข้าใจวิสัยทัศน์ขององค์กร', 'ช่วยให้ผู้อื่นรู้และเข้าใจวิสัยทัศน์', 'สร้างแรงจูงใจให้ผู้อื่นปฏิบัติตามวิสัยทัศน์',
         'กำหนดนโยบายให้สอดคล้องกับวิสัยทัศน์ของสถาบัน', 'กำหนดวิสัยทัศน์ของสถาบันให้สอดคล้องกับวิสัยทัศน์ระดับประเทศ'] },
  { code: '9.3', sec: 9, page: 42, mode: 'comp', wAdm: 1.5, name: 'การวางกลยุทธ์ภาครัฐ',
    lv: ['รู้และเข้าใจนโยบายและภารกิจภาครัฐ', 'นำประสบการณ์มาประยุกต์ใช้ในการกำหนดกลยุทธ์', 'นำทฤษฎี/แนวคิดซับซ้อนมาใช้กำหนดกลยุทธ์',
         'กำหนดกลยุทธ์ที่สอดคล้องกับสถานการณ์', 'บูรณาการองค์ความรู้ใหม่มาใช้กำหนดกลยุทธ์ภาครัฐ'] },
  { code: '9.4', sec: 9, page: 44, mode: 'comp', wAdm: 1.5, name: 'ศักยภาพเพื่อนำการปรับเปลี่ยน',
    lv: ['เห็นความจำเป็นของการปรับเปลี่ยน', 'ทำให้ผู้อื่นเข้าใจการปรับเปลี่ยน', 'กระตุ้นและสร้างแรงจูงใจให้เห็นความสำคัญของการปรับเปลี่ยน',
         'วางแผนที่ดีเพื่อการปรับเปลี่ยนองค์กร', 'ผลักดันให้เกิดการปรับเปลี่ยนอย่างมีประสิทธิภาพ'] },
  { code: '9.5', sec: 9, page: 45, mode: 'comp', wAdm: 1.5, name: 'การควบคุมตนเอง',
    lv: ['ไม่แสดงพฤติกรรมที่ไม่เหมาะสม', 'ควบคุมอารมณ์ในแต่ละสถานการณ์ได้ดี', 'ใช้ถ้อยทีวาจาหรือปฏิบัติงานอย่างสงบแม้ถูกยั่วยุ',
         'จัดการความเครียดได้อย่างมีประสิทธิภาพ', 'เอาชนะอารมณ์ด้วยความเข้าใจ'] },
  { code: '9.6', sec: 9, page: 46, mode: 'comp', wAdm: 1.5, name: 'การสอนงานและการมอบหมายงาน',
    lv: ['สอนงานหรือให้คำแนะนำเกี่ยวกับวิธีปฏิบัติงาน', 'ตั้งใจพัฒนาผู้ใต้บังคับบัญชาให้มีศักยภาพ', 'วางแผนเพื่อให้โอกาสผู้ใต้บังคับบัญชาแสดงความสามารถ',
         'ช่วยแก้ไขปัญหาที่เป็นอุปสรรคต่อการพัฒนาศักยภาพ', 'ทำให้สถาบันมีระบบการสอนงานและมอบหมายหน้าที่'] }
];

/** น้ำหนักคะแนนของตัวชี้วัดในแต่ละกลุ่ม (0 = ไม่ใช้ในกลุ่มนั้นโดยตรง) */
function indicatorWeight_(ind, g) {
  var s = sectionOf_(ind.sec);
  if (ind.sec <= 4) return s.primary === g ? ind.w : 0;
  if (ind.sec === 5 || ind.sec === 6) return 2;
  if (ind.sec === 7 || ind.sec === 8) return g === 'adm' ? 2 : 3;
  if (ind.sec === 9) return g === 'adm' ? ind.wAdm : 0;
  return 0;
}

function sectionOf_(sec) {
  for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].sec === sec) return SECTIONS[i];
  return null;
}

function indicatorOf_(code) {
  for (var i = 0; i < INDICATORS.length; i++) if (INDICATORS[i].code === code) return INDICATORS[i];
  return null;
}

/** ข้อสมมติ/การตีความที่ระบบใช้ — แสดงในหมายเหตุของรายงานทุกครั้ง */
var SCORING_ASSUMPTIONS = [
  'ตัวชี้วัดที่ประกาศไม่ได้ระบุคะแนนรายระดับ ระบบคิดคะแนน = น้ำหนัก × (ระดับที่ได้ ÷ ระดับสูงสุด) ซึ่งเป็นการตีความของระบบ',
  'ด้านรอง (เช่น ด้านวิจัย 3 คะแนนในกลุ่มการเรียนการสอน) ประกาศไม่ได้กำหนดเกณฑ์ย่อย ระบบใช้ระดับสูงสุดที่ได้ในด้านนั้นเป็นค่าเริ่มต้น ผู้ประเมินปรับได้',
  'ตัวชี้วัด 4.5 ต้นแบบที่ใช้ประโยชน์ได้ (10 คะแนน) มีรายละเอียดในหน้า 24 แต่ไม่ปรากฏในตารางน้ำหนักหน้า 2–3 และ 50–51 ระบบนับรวมเพื่อให้ครบ 60 คะแนน',
  'ตัวชี้วัด 4.4 ตารางน้ำหนักเรียก Societal Readiness Level แต่หน้า 22 เรียก Self-Regulated Learning ระบบใช้ระดับ SRL 1–9 ตามหน้า 22–23',
  'ตัวชี้วัด 6.1 ประกาศยังไม่ได้กำหนดคำอธิบายรายระดับ (หน้า 27) ระดับที่บันทึกต้องตกลงกับผู้ประเมิน',
  'ตัวชี้วัด 4.1 ประกาศไม่ได้ระบุกรณีงบ 100,000 บาทพอดี ระบบจัดไว้ในระดับ 1',
  'ระดับที่ระบบแนะนำนับเฉพาะผลงานที่มีหลักฐานแนบอย่างน้อย 1 รายการ คะแนนสุดท้ายเป็นอำนาจของผู้ประเมิน'
];


/**
 * Criteria.gs — รายละเอียดเกณฑ์ฉบับเต็มตามประกาศ (คำอธิบาย องค์ประกอบ แนวทาง เอกสารหลักฐาน
 * พฤติกรรมบ่งชี้รายระดับ และตัวอย่างรายคณะ) สำหรับแสดงบนหน้าเว็บและในรายงาน
 * comps: [องค์ประกอบ, แนวทางการประเมิน, เอกสารหลักฐาน]
 * bullets: พฤติกรรมบ่งชี้ของแต่ละระดับ (สมรรถนะ)
 */

var FACULTIES = ['คณะวิทยาการจัดการ', 'คณะครุศาสตร์', 'คณะมนุษยศาสตร์และสังคมศาสตร์', 'คณะวิทยาศาสตร์เทคโนโลยีและการเกษตร และ Social Lab แม่ลาน', 'คณะสาธารณสุขศาสตร์และสหเวชศาสตร์'];

var CRITERIA_DETAIL = {
  '1.1': {
    desc: 'ความสำเร็จในการบรรลุเป้าหมายในหน่วยงานและการจัดการตามหลักธรรมาภิบาล 10 องค์ประกอบ',
    comps: [
      ['หลักประสิทธิผล (Effectiveness)', 'มีวิสัยทัศน์เชิงยุทธศาสตร์และการปฏิบัติหน้าที่ให้บรรลุวัตถุประสงค์และเป้าหมาย มีผลการปฏิบัติงานที่ดี มีการวางเป้าหมายที่ชัดเจน', 'แผนยุทธศาสตร์ แผนปฏิบัติราชการ; เอกสารวิสัยทัศน์ พันธกิจ เป้าหมาย; รายงานผลตามแผนและคำรับรอง; ระบบ/แผนติดตามประเมินผล'],
      ['หลักประสิทธิภาพ (Efficiency)', 'ออกแบบกระบวนการโดยใช้เทคนิคและเครื่องมือบริหารที่เหมาะสม ใช้ทรัพยากรให้เกิดประโยชน์สูงสุด', 'เอกสารขั้นตอนการปฏิบัติงาน; หลักฐานการกำกับ/ใช้ทรัพยากรอย่างคุ้มค่า; ข้อมูลความพึงพอใจของผู้รับบริการ'],
      ['หลักการตอบสนอง (Responsiveness)', 'ให้บริการอย่างมีคุณภาพภายในเวลาที่กำหนด สร้างความเชื่อมั่น ตอบสนองความคาดหวังของผู้รับบริการ', 'เอกสารมาตรฐานการให้บริการ; ข้อมูลเวลาในการให้บริการ; ผลสำรวจความพึงพอใจ'],
      ['หลักภาระรับผิดชอบ (Accountability)', 'แสดงความรับผิดชอบในการปฏิบัติหน้าที่และผลงานต่อเป้าหมายที่กำหนด', 'รายงานการบรรลุเป้าหมาย; เอกสารการแก้ไขปัญหา; รายงานการประเมินตนเอง'],
      ['หลักความโปร่งใส (Transparency)', 'ปฏิบัติงานอย่างเปิดเผย ตรงไปตรงมา เปิดเผยข้อมูลข่าวสารให้ประชาชนทราบ', 'การประกาศขั้นตอนการดำเนินงาน; เว็บไซต์/สื่อเผยแพร่ข้อมูล; ช่องทางสื่อสารกับผู้มีส่วนได้เสีย'],
      ['หลักการมีส่วนร่วม (Participation)', 'เปิดให้ผู้รับบริการมีส่วนร่วมรับรู้ แสดงทัศนะ ร่วมแก้ปัญหา ร่วมตัดสินใจ', 'รายงานการประชุมที่แสดงการมีส่วนร่วม; ภาพกิจกรรม; เอกสารการรับฟังความคิดเห็น'],
      ['หลักการกระจายอำนาจ (Decentralization)', 'กระจายอำนาจ มอบอำนาจและความรับผิดชอบในการตัดสินใจเป็นลายลักษณ์อักษร', 'เอกสารการมอบอำนาจ; โครงสร้างการบริหาร; คู่มือการปฏิบัติงาน'],
      ['หลักนิติธรรม (Rule of Law)', 'ใช้อำนาจของกฎหมาย กฎระเบียบ ข้อบังคับอย่างเคร่งครัดและยุติธรรม', 'กฎระเบียบที่เกี่ยวข้อง; เอกสารแสดงการไม่มีเรื่องร้องเรียน; รายงานผลการปฏิบัติตามกฎหมาย'],
      ['หลักความเสมอภาค (Equity)', 'ให้บริการเท่าเทียม ไม่แบ่งแยกเพศ ถิ่นกำเนิด เชื้อชาติ ภาษา ศาสนา', 'นโยบายและการปฏิบัติที่แสดงความเสมอภาค; ข้อมูลการให้บริการที่ไม่เลือกปฏิบัติ; รายงานการส่งเสริมความเท่าเทียม'],
      ['หลักมุ่งเน้นฉันทามติ (Consensus Oriented)', 'หาข้อตกลงในกลุ่มผู้มีส่วนได้ส่วนเสีย โดยไม่มีข้อคัดค้านที่ยุติไม่ได้ในประเด็นสำคัญ', 'รายงานการประชุมที่แสดงการตกลงร่วมกัน; เอกสารการหารือระหว่างผู้มีส่วนได้เสีย']
    ]
  },
  '1.2': {
    desc: 'ระดับความสำเร็จของการนำนโยบายยุทธศาสตร์ มหาวิทยาลัย/ส่วนราชการ หรือส่วนงานภายใน ของการขับเคลื่อนยุทธศาสตร์ตามคำรับรอง',
    comps: [
      ['ความสอดคล้องของนโยบายกับยุทธศาสตร์และคำรับรอง', 'วิเคราะห์ความเชื่อมโยงระหว่างนโยบายมหาวิทยาลัยกับยุทธศาสตร์และคำรับรองที่ทำข้อตกลงกับหัวหน้าส่วนราชการ', 'เอกสารนโยบายมหาวิทยาลัย; แผนยุทธศาสตร์/แผนปฏิบัติราชการ; คำรับรองการปฏิบัติราชการ; เอกสารวิเคราะห์ความสอดคล้อง'],
      ['การถ่ายทอดนโยบายสู่การปฏิบัติ', 'ประเมินกระบวนการสื่อสารและถ่ายทอดนโยบายยุทธศาสตร์และ KPIs สู่ระดับปฏิบัติการในทุกระดับ', 'แผนการถ่ายทอดนโยบายและ KPIs; รายงานการประชุมชี้แจง; เอกสารการสื่อสารภายในองค์กร; แผนปฏิบัติงานระดับหน่วยงาน โครงการ และกิจกรรม'],
      ['ผลลัพธ์ที่เกิดขึ้นจากการดำเนินงานตามนโยบาย', 'ติดตามและประเมินผลที่เกิดขึ้นจากการนำนโยบายไปปฏิบัติ', 'รายงานผลการดำเนินงาน; ข้อมูลสถิติที่เกี่ยวข้อง; ผลการสำรวจความพึงพอใจ; รายงานการประเมินผลกระทบ'],
      ['จำนวนโครงการที่บรรลุตามเป้าหมาย', 'นับจำนวนและคิดอัตราการบรรลุเป้าหมายของโครงการที่เกี่ยวข้องกับนโยบาย', 'รายงานสรุปผลดำเนินงานโครงการ; ข้อมูลการบรรลุเป้าหมาย; เอกสารการติดตามประเมินผล'],
      ['การรายงานผล การประเมินผลและการนำไปปรับปรุง', 'ประเมินระบบการรายงาน การประเมินผล และการนำผลไปใช้ในการปรับปรุง', 'รายงานผลตาม KPIs; เอกสารการประเมินผล; แผนการปรับปรุงพัฒนา; รายงานการนำเสนอต่อผู้บริหาร']
    ]
  },
  '1.3': {
    desc: 'ระดับความสำเร็จของการขับเคลื่อนภารกิจประจำมหาวิทยาลัย ส่วนราชการ หรือส่วนงานภายในที่กำกับดูแลตามคำรับรอง โดยพิจารณาจากตัวชี้วัดความสำเร็จ',
    comps: [
      ['การกำหนดภารกิจประจำและเป้าหมายที่ชัดเจน', 'ประเมินความชัดเจนและความสอดคล้องของภารกิจประจำกับพันธกิจของมหาวิทยาลัย', 'เอกสารแสดงกำหนดภารกิจประจำ; คำรับรองการปฏิบัติราชการ; แผนปฏิบัติงานประจำปี'],
      ['การจัดสรรทรัพยากรและการบริหารจัดการ', 'ประเมินการจัดสรรทรัพยากรและการบริหารจัดการที่มีประสิทธิภาพ', 'แผนการใช้งบประมาณ; รายงานการใช้ทรัพยากร; เอกสารแสดงการจัดสรรบุคลากร'],
      ['การดำเนินงานตามแผนและกระบวนการ', 'ติดตามการดำเนินงานตามแผนและกระบวนการที่กำหนด', 'รายงานความก้าวหน้า; เอกสารแสดงการติดตามงาน; รายงานการประชุมติดตามงาน'],
      ['ผลสัมฤทธิ์ตามตัวชี้วัดที่กำหนด', 'ประเมินผลสัมฤทธิ์ตามตัวชี้วัดและเป้าหมายที่กำหนดในคำรับรอง', 'รายงานผลตัวชี้วัด; ข้อมูลสถิติการปฏิบัติงาน; เอกสารแสดงเปรียบเทียบเป้าหมาย/ผลสำเร็จ'],
      ['การพัฒนาและปรับปรุงการปฏิบัติงาน', 'ประเมินการพัฒนาและปรับปรุงการปฏิบัติงานอย่างต่อเนื่อง', 'แผนพัฒนาการปฏิบัติงาน; รายงานการปรับปรุงงาน; เอกสารแสดงนวัตกรรมการทำงาน']
    ]
  },
  '1.4': {
    desc: 'ระดับความสำเร็จของงานเร่งด่วน หรือภารกิจที่มหาวิทยาลัย ส่วนราชการ หรือส่วนงานภายในมอบหมาย พิจารณาจากตัวชี้วัดความสำเร็จ',
    comps: [
      ['ความเข้าใจและการตอบสนองต่อภารกิจที่ได้รับมอบหมาย', 'ประเมินความเข้าใจในภารกิจและการตอบสนองอย่างรวดเร็ว', 'หนังสือมอบหมายงาน; เอกสารแผนการดำเนินงาน; รายงานการรับทราบภารกิจ'],
      ['การวางแผนและจัดลำดับความสำคัญ', 'ประเมินการวางแผนและการจัดลำดับความสำคัญของงาน', 'แผนการดำเนินงานเร่งด่วน; ตารางเวลาการปฏิบัติงาน; เอกสารการจัดสรรทรัพยากร'],
      ['การประสานงานและการสื่อสาร', 'ประเมินการประสานงานและการสื่อสารที่มีประสิทธิภาพ', 'รายงานการประชุม; เอกสารการประสานงาน; หลักฐานการสื่อสารกับผู้เกี่ยวข้อง'],
      ['ผลสำเร็จของงานตามระยะเวลาที่กำหนด', 'ประเมินผลสำเร็จและความตรงต่อเวลาในการส่งมอบงาน', 'รายงานผลการดำเนินงาน; เอกสารส่งมอบงาน; ข้อมูลเปรียบเทียบเวลาที่กำหนด'],
      ['การติดตาม ประเมินผล และการรายงาน', 'ประเมินระบบการติดตาม ประเมินผล และการรายงานผลงาน', 'รายงานการติดตามงาน; เอกสารการประเมินผล; รายงานสรุปผลงานเสนอผู้บริหาร']
    ]
  },
  '2.1': { desc: 'การจัดทำ OBE.3/OBE.4 ตามคำอธิบายรายวิชาในระบบสารสนเทศ OBE.3/OBE.4 (https://eservice.yru.ac.th/tqf) ของมหาวิทยาลัย และนำมาสร้างรายวิชาและกำหนดโครงสร้างบทเรียนในระบบ YRU e-Learning ให้สอดคล้องกับ OBE.3/OBE.4 ที่ได้รับการอนุมัติจากหลักสูตร/คณะแล้ว' },
  '2.2': { desc: 'การพัฒนาเนื้อหาสื่อมัลติมีเดียและดิจิทัลที่สอดคล้องกับกิจกรรมในบทเรียนตามแผนการจัดการเรียนรู้ที่กำหนดโครงสร้างรายวิชา OBE.3/OBE.4 หรือหลักสูตรระยะสั้น โดยมีเนื้อหาหลากหลายรูปแบบ ได้แก่ เอกสาร (Text) วิดีทัศน์ (Video) สื่อมัลติมีเดีย (Multimedia) เน้นการพัฒนาเนื้อหาให้มีคุณภาพ โดยผู้สอนมีส่วนร่วมในการวางแผนและออกแบบ' },
  '2.3': { desc: 'การดำเนินการสอนตามกรอบมาตรฐานวิชาชีพอาจารย์ (Thailand PSF) ตามคู่มือการขอรับการประเมินสมรรถนะอาจารย์ พ.ศ. 2566 ผ่านกิจกรรมและสื่อต่างๆ ในระบบ YRU e-Learning ระบบคลังหน่วยกิต หรือออนไซต์ เน้นผู้เรียนเป็นศูนย์กลาง (Learner Center) และการเรียนรู้เชิงรุก (Active Learning) และอาจารย์ผ่านเกณฑ์การประเมิน Thailand PSF โดยสมาคมเครือข่ายการพัฒนาวิชาชีพอาจารย์และองค์กรระดับอุดมศึกษาแห่งประเทศไทย (ควอท)' },
  '2.4': { desc: 'การจัดทำวิจัยเพื่อพัฒนานวัตกรรมการจัดการเรียนรู้ เพื่อให้ผู้เรียนบรรลุผลลัพธ์การเรียนรู้ (Learning outcome) ตามรายวิชา/หลักสูตร หรือเพื่อพัฒนาการจัดเรียนรู้ให้มีประสิทธิภาพและประสิทธิผลยิ่งขึ้น' },
  '2.5': { desc: 'ผลการประเมินการสอนโดยนักศึกษาในรายวิชาที่สอนในภาคเรียนของรอบประเมิน โดยใช้ผลประเมินจากแบบประเมินออนไลน์ในระบบสารสนเทศบริการการศึกษา (https://register.yru.ac.th/registrar) ของกองบริการการศึกษา' },
  '2.6': { desc: 'การจัดทำตำรา/หนังสือ/เอกสารประกอบการสอนที่มีกระบวนการเป็นไปตามเกณฑ์ กพอ. มีองค์ประกอบครบถ้วน และผ่านการพิจารณาจากผู้ทรงคุณวุฒิรวมถึงเผยแพร่ตามเกณฑ์ กพอ.' },
  '2.7': { desc: 'การจัดทำสื่อการเรียนการสอน เช่น PowerPoint หรือสื่ออื่นๆ เป็นภาษาอังกฤษเพื่อใช้ในการจัดการเรียนการสอนในรายวิชา เอกสารประกอบการสอน ใบงาน หรืออื่นๆ ที่แสดงถึงการเสริมสร้างทักษะด้านภาษาอังกฤษให้แก่นักศึกษา' },
  '3.1': { desc: 'งบประมาณที่ได้รับการสนับสนุนเพื่อดำเนินการวิจัยจากแหล่งทุนภายนอกมหาวิทยาลัย (นิยามกลุ่มวิจัย: ผู้อำนวยการแผนงานวิจัย หัวหน้าโครงการวิจัย หรือผู้ร่วมวิจัยที่ได้รับงบประมาณจากแหล่งทุนภายนอก)' },
  '3.2': { desc: 'การเผยแพร่ผลงานวิจัยผ่านการตีพิมพ์ในวารสารระดับชาติหรือนานาชาติ หรือการขอรับการคุ้มครองผลงานทรัพย์สินทางปัญญาประเภทต่างๆ' },
  '3.3': { desc: 'การสร้างผลกระทบเชิงบวกจากงานวิจัยในด้านต่างๆ เช่น ผลกระทบด้านเศรษฐกิจ สังคม และสิ่งแวดล้อม' },
  '4.1': { desc: 'งบประมาณที่ได้รับการจัดสรรในการดำเนินงานโครงการ (นิยามกลุ่มบริการวิชาการ: ผู้ได้รับทุนและเป็นหัวหน้าโครงการหรือผู้ร่วมโครงการพัฒนาท้องถิ่น)' },
  '4.2': { desc: 'หัวหน้าโครงการหรือผู้ที่มีส่วนร่วมในกิจกรรมย่อย' },
  '4.3': { desc: 'ประเมินระดับความพร้อมของเทคโนโลยีหรือผลงานนวัตกรรมที่พัฒนาขึ้นในแต่ละขั้นตอนของกระบวนการทำงาน โดยวัดความก้าวหน้าจากแนวคิดพื้นฐานไปจนถึงการใช้งานเชิงปฏิบัติจริง เพื่อให้มั่นใจว่าผลงานมีเสถียรภาพและลดความเสี่ยงทางเทคนิคก่อนการถ่ายทอดสู่การใช้งานจริง (น้ำหนักรายระดับ 3/6/9/12/15)',
    examples: {
      'คณะวิทยาการจัดการ': ['รวบรวมองค์ความรู้บัญชี SME การตลาดสินค้า OTOP พื้นฐาน ERP/MIS การท่องเที่ยวเชิงวัฒนธรรม (P1.1 BCG, P1.2 Creative Economy)', 'โมเดล e-Accounting ร้านค้า, AI Marketing OTOP, ERP SME, Dashboard ธุรกิจ, e-Booking ท่องเที่ยวชายแดนใต้', 'Pilot ระบบบัญชีดิจิทัล SME, AI Marketing OTOP, ERP มาตรฐาน, e-Booking/MIS ทดลองในพื้นที่ (P1.1, P2.1)', 'Demo ERP/AI Marketing ใน SME, e-Booking ท่องเที่ยว, Dashboard ใช้จริงในองค์กร (P1.2, P2.1)', 'e-Accounting ใช้จริงใน SME, AI Marketing กับ OTOP, ERP/MIS ในธุรกิจ, e-Booking ในโรงแรม (P1.2)'],
      'คณะครุศาสตร์': ['Mother-Tongue Based Learning (ไทย–มลายู), จิตวิทยาการเรียนรู้, Active/Blended Learning (P4.1, P4.2)', 'แผนการสอนสองภาษา, โมเดล Active Learning, Prototype CAI/LMS สำหรับโรงเรียนชายแดน (P4.1, P4.2)', 'Pilot LMS/Virtual Lab ในโรงเรียนสาธิต/ตชด., หลักสูตรท้องถิ่น (P2.2 Well-Being, P4.1)', 'Demo Virtual Lab, LMS ใช้จริงในเครือข่ายโรงเรียนชายแดน, Demo การสอนสองภาษา (P4.1, P4.2)', 'รร.สาธิต/ตชด./ท้องถิ่นใช้นวัตกรรมการเรียนการสอนจริง (P4.1, P4.2)'],
      'คณะมนุษยศาสตร์และสังคมศาสตร์': ['รวบรวมองค์ความรู้ภาษา–วัฒนธรรมมลายู ภูมิปัญญาท้องถิ่น งานวิจัยชุมชน (P2.1 Art & Culture)', 'โมเดลการสอนสองภาษา, โมเดลการมีส่วนร่วมชุมชน, ฐานข้อมูลชุมชน (P2.1, P1.2)', 'Pilot โครงการอนุรักษ์วัฒนธรรม, ทดลองฐานข้อมูลท้องถิ่น, เครือข่ายศิลปวัฒนธรรม (P2.1, P1.2)', 'Demo หลักสูตรสองภาษา, เผยแพร่วัฒนธรรม/Soft Power, ระบบข้อมูลในองค์กรท้องถิ่น (P2.1, P4.2)', 'Creative Economy เชิงวัฒนธรรม, Soft Power และหลักสูตรสองภาษาใช้จริง (P1.2, P2.1)'],
      'คณะวิทยาศาสตร์เทคโนโลยีและการเกษตร และ Social Lab แม่ลาน': ['ศึกษาหลักการเกษตรอินทรีย์ Smart Farm ผึ้งชันโรง ไก่เบตง ปลา (P3.1)', 'โมเดล Smart Greenhouse, IoT น้ำหยด, ทดลองสูตรอาหารสัตว์, พลังงานทดแทนในฟาร์ม (P3.1, P3.2)', 'Lab test Sensor ดิน/น้ำ, Pilot ฟาร์มผึ้ง/ไก่เบตง/ปลาในแม่ลาน (P3.1, P3.2)', 'Demo Smart Farm, Demo แปรรูปอาหาร, GAP/Organic Farming (P1.1, P3.1)', 'ผลิตภัณฑ์ผึ้ง/ไก่เบตง/ปลาแปรรูปขายจริง, Smart Farm ใช้จริงในชุมชน (P1.1, P3.1)'],
      'คณะสาธารณสุขศาสตร์และสหเวชศาสตร์': ['รวบรวมองค์ความรู้โรคไม่ติดต่อ (P2.2), สมุนไพรและแพทย์แผนไทย (P1.1), โภชนาการพื้นบ้าน (P1.2)', 'โมเดลฟื้นฟูสุขภาพผู้สูงอายุ, โปรแกรมส่งเสริมอาหารปลอดภัย, Prototype โปรแกรมสุขภาพดิจิทัล', 'Pilot โปรแกรมสุขภาพในศูนย์ผู้สูงอายุ, ทดสอบผลิตภัณฑ์สมุนไพร, มาตรฐานการดูแลสุขภาพชุมชน', 'Demo โปรแกรมกายภาพผู้สูงอายุ, Demo นวดแผนไทย, โครงการสุขภาพเชิงพื้นที่', 'ศูนย์ดูแลผู้สูงอายุ/ศูนย์นวดแผนไทยให้บริการจริง, เครือข่าย Well-Being ชายแดนใต้']
    } },
  '4.4': { desc: 'ภาระงานบริการวิชาการต้องครอบคลุมการจัดทำและรวบรวมองค์ความรู้ วิจัยและนวัตกรรม โดยเชื่อมโยงกับระดับความพร้อม (TRL) เพื่อให้สามารถถ่ายทอด ขยายผล และสร้างความเชื่อมั่นในผลงานได้จริง พร้อมเสริมสร้างความเข้มแข็งแก่ชุมชนอย่างยั่งยืน ประเมิน 2 รอบ: รอบแรกการวางระบบ รอบสองผลลัพธ์ที่เกิดขึ้นจริง',
    examples: {
      'คณะวิทยาการจัดการ': ['เผยแพร่ความรู้บัญชี/การตลาด SME, เวิร์กช็อป OTOP', 'ทดลองตลาด OTOP/BCG, ERP ร้านค้า', 'SME ใช้ ERP/AI Marketing จริง, e-Booking ใช้ในพื้นที่', 'ขยายผล Creative Economy, ERP/Marketing ใช้แพร่หลาย', 'SME/OTOP พึ่งพาตนเอง ระบบธุรกิจยั่งยืนในพื้นที่'],
      'คณะครุศาสตร์': ['เผยแพร่ Mother-Tongue/Active Learning', 'ทดลองการสอนสองภาษาในโรงเรียน', 'โรงเรียนใช้ LMS/CAI จริง', 'ขยายผลเครือข่ายโรงเรียนใช้ LMS/นวัตกรรม', 'โรงเรียนท้องถิ่นใช้นวัตกรรมการสอนอย่างยั่งยืน'],
      'คณะมนุษยศาสตร์และสังคมศาสตร์': ['เผยแพร่วัฒนธรรม/ภาษา', 'ทดลองฐานข้อมูลวัฒนธรรม', 'องค์กร/โรงเรียนใช้ฐานข้อมูลจริง', 'ขยายเครือข่ายศิลปวัฒนธรรม, Soft Power', 'เศรษฐกิจวัฒนธรรมยั่งยืน, Soft Power ฝังราก'],
      'คณะวิทยาศาสตร์เทคโนโลยีและการเกษตร และ Social Lab แม่ลาน': ['เผยแพร่ความรู้เกษตร Smart Farm', 'ทดลอง Smart Greenhouse/IoT น้ำหยด', 'เกษตรกรใช้ Smart Farm จริง', 'ขยายผล GAP/Organic, เครือข่าย Smart Farm', 'Social Lab แม่ลานยั่งยืน เกษตรพึ่งพาตนเอง'],
      'คณะสาธารณสุขศาสตร์และสหเวชศาสตร์': ['เผยแพร่สมุนไพร/โภชนาการ', 'ทดลองโปรแกรมสุขภาพ', 'ชุมชนใช้โปรแกรมสุขภาพจริง', 'ขยายผลศูนย์สุขภาพ/ศูนย์นวด', 'ศูนย์สุขภาพ/ศูนย์นวดยั่งยืนในชุมชน']
    } },
  '4.5': { desc: 'ผลงานที่เป็นรูปธรรม (นวัตกรรม รูปแบบ หรือชุดความรู้) ที่ได้รับการพัฒนาโดยใช้ความรู้และความเชี่ยวชาญทางวิชาการ และได้รับการยืนยันว่าสามารถนำไปใช้แก้ปัญหาของสังคมหรือชุมชนได้อย่างแท้จริง ก่อให้เกิดการเปลี่ยนแปลงในทางที่ดีขึ้น และมีศักยภาพในการขยายผลหรือต่อยอดเพื่อสร้างความยั่งยืน' },
  '4.6': { desc: 'เล่มรับใช้สังคม คือรายงานหรือคู่มือวิชาการที่สรุปผลจากโครงการบริการวิชาการสู่ชุมชนอย่างเป็นระบบและครบถ้วน ต้องผ่านกระบวนการ Peer Review โดยผู้ทรงคุณวุฒิอย่างน้อย 2–3 ท่าน และมีการเผยแพร่ออกสู่สาธารณชนผ่านช่องทางที่ชัดเจน เช่น เว็บไซต์สถาบันหรือตีพิมพ์' },
  '4.7': { desc: '(1) หัวหน้าโครงการต้องมีบทบาทวางแผน ออกแบบ และบริหารโครงการให้เกิดผลลัพธ์ที่ชัดเจน (2) ผลงานต้องตรงกับเลขตำแหน่งที่ใช้ขอกำหนดตำแหน่ง (3) การเป็นคณะทำงานนับได้ไม่เกิน 3 โครงการ (4) การตีพิมพ์ในวารสารที่ ก.พ.อ. รับรองนับสะสมได้ไม่เกิน 2 รอบการประเมิน' },
  '5.1': { desc: 'บุคลากรต้องดำเนินงานทำนุบำรุงศิลปะและวัฒนธรรม ได้แก่ การศึกษา อนุรักษ์ ฟื้นฟู สืบสาน และเผยแพร่วัฒนธรรมท้องถิ่นตามจุดเน้นของมหาวิทยาลัยอย่างมีประสิทธิภาพและประสิทธิผล มีการบูรณาการกับการเรียนการสอนและกิจกรรมนักศึกษา',
    source: ['คณะจัดเก็บข้อมูลในระดับคณะ', 'ศูนย์ศิลปวัฒนธรรมและหรือกองพัฒนานักศึกษาจัดเก็บข้อมูลระดับมหาวิทยาลัย'] },
  '6.1': { desc: 'ประกาศยังไม่ได้ระบุคำอธิบาย เกณฑ์รายระดับ และแหล่งข้อมูล (หน้า 27) — ให้กำหนดร่วมกับผู้ประเมินตามความก้าวหน้าของขั้นตอนการดำเนินงาน' },

  '7.1': { desc: 'ความมุ่งมั่นจะปฏิบัติหน้าที่ราชการให้ดีหรือให้เกินมาตรฐานที่มีอยู่ รวมถึงการสร้างสรรค์พัฒนาผลงานหรือกระบวนการปฏิบัติงานตามเป้าหมายที่ยากและท้าทาย',
    bullets: [['พยายามทำงานในหน้าที่ให้ถูกต้อง', 'พยายามปฏิบัติงานให้แล้วเสร็จตามกำหนดเวลา', 'มานะอดทน ขยันหมั่นเพียร', 'แสดงออกว่าต้องการทำงานให้ได้ดีขึ้น', 'แสดงความเห็นในเชิงปรับปรุงพัฒนา'],
      ['กำหนดมาตรฐานหรือเป้าหมายในการทำงานให้ได้ผลงานที่ดี', 'ติดตามและประเมินผลงานของตนเทียบกับเกณฑ์มาตรฐาน', 'ทำงานได้ตามเป้าหมายที่ผู้บังคับบัญชาหรือหน่วยงานกำหนด', 'มีความละเอียดรอบคอบ ตรวจตราความถูกต้อง'],
      ['ปรับปรุงวิธีการให้ทำงานได้ดีขึ้น เร็วขึ้น มีคุณภาพดีขึ้น หรือเสนอ/ทดลองวิธีการทำงานแบบใหม่'],
      ['กำหนดเป้าหมายที่ท้าทาย พัฒนาระบบ ขั้นตอน วิธีการทำงานให้ได้ผลงานโดดเด่นหรือแตกต่างไม่เคยมีผู้ใดทำได้มาก่อน'],
      ['ตัดสินใจโดยคำนวณผลได้ผลเสียอย่างชัดเจน บริหารจัดการและทุ่มเทเวลา ทรัพยากร เพื่อประโยชน์สูงสุดต่อภารกิจของหน่วยงาน']] },
  '7.2': { desc: 'ความสนใจใฝ่รู้ สั่งสม ความรู้ความสามารถของตนในการปฏิบัติหน้าที่ราชการ ด้วยการศึกษา ค้นคว้า และพัฒนาตนเองอย่างต่อเนื่อง จนสามารถประยุกต์ใช้ความรู้เชิงวิชาการและเทคโนโลยีต่างๆ เข้ากับการปฏิบัติราชการให้เกิดผลสัมฤทธิ์',
    bullets: [['ศึกษาความรู้ สนใจเทคโนโลยีและองค์ความรู้ใหม่ในสาขาอาชีพ', 'พัฒนาความรู้ความสามารถของตนให้ดียิ่งขึ้น', 'ติดตามเทคโนโลยีและความรู้ใหม่ๆ อยู่เสมอ'],
      ['รอบรู้ในเทคโนโลยีหรือองค์ความรู้ใหม่ในสาขาอาชีพที่มีผลกระทบต่อการปฏิบัติราชการ', 'รับรู้ถึงแนวโน้มวิทยะบริการที่ทันสมัยและเกี่ยวข้องกับงาน'],
      ['นำวิชาการ ความรู้ หรือเทคโนโลยีใหม่ๆ มาประยุกต์ใช้ในการปฏิบัติหน้าที่', 'แก้ไขปัญหาที่เกิดจากการนำเทคโนโลยี ความรู้ หรือวิทยาการใหม่มาใช้'],
      ['มีความเชี่ยวชาญในเรื่องที่มีลักษณะเป็นสหวิทยาการและนำไปปรับใช้อย่างกว้างขวาง', 'นำความรู้เชิงบูรณาการไปใช้สร้างวิสัยทัศน์เพื่อการปฏิบัติงานในอนาคต'],
      ['สนับสนุนบรรยากาศแห่งการพัฒนาความเชี่ยวชาญในองค์กรด้วยการจัดสรรทรัพยากร เครื่องมือ อุปกรณ์', 'บริหารจัดการให้สถาบันนำเทคโนโลยี ความรู้ หรือวิทยาการใหม่มาใช้อย่างต่อเนื่อง']] },
  '7.3': { desc: 'ความตั้งใจที่จะทำงานร่วมกับผู้อื่น เป็นส่วนหนึ่งของทีม หน่วยงาน หรือสถาบันอุดมศึกษา โดยผู้ปฏิบัติมีฐานะเป็นสมาชิก ไม่จำเป็นต้องมีฐานะหัวหน้าทีม รวมทั้งความสามารถในการสร้างและรักษาสัมพันธภาพกับสมาชิกในทีม',
    bullets: [['สนับสนุนการตัดสินใจของทีมและทำงานในส่วนที่ได้รับมอบหมาย', 'รายงานความคืบหน้าการดำเนินงานของตนในทีม', 'ให้ข้อมูลที่เป็นประโยชน์ต่อการทำงานของทีม'],
      ['สร้างสัมพันธ์ เข้ากับผู้อื่นในกลุ่มได้ดี ให้ความร่วมมือกับผู้อื่นในทีม', 'กล่าวถึงเพื่อนร่วมงานในเชิงสร้างสรรค์และแสดงความเชื่อมั่นในศักยภาพของเพื่อนร่วมทีม'],
      ['รับฟังความเห็นของสมาชิกในทีมและเต็มใจเรียนรู้จากผู้อื่น', 'ตัดสินใจหรือวางแผนงานร่วมกันจากความคิดเห็นของเพื่อนร่วมทีม', 'ประสานและส่งเสริมสัมพันธภาพอันดีในทีม'],
      ['ยกย่องและให้กำลังใจเพื่อนร่วมทีมอย่างจริงใจ', 'ให้ความช่วยเหลือเกื้อกูลแก่เพื่อนร่วมทีมแม้ไม่มีการร้องขอ', 'รักษามิตรภาพอันดีกับเพื่อนร่วมทีม'],
      ['เสริมสร้างความสามัคคีในทีมโดยไม่คำนึงถึงความชอบหรือไม่ชอบส่วนตน', 'คลี่คลายหรือแก้ไขข้อขัดแย้งในทีม สร้างขวัญกำลังใจเพื่อปฏิบัติภารกิจให้บรรลุผล']] },
  '7.4': { desc: 'ความตั้งใจและความพยายามในการบริการแก่ผู้มีส่วนได้หรือส่วนเสียที่มาติดต่อ',
    bullets: [['ให้การบริการที่เป็นมิตร สุภาพ', 'ให้ข้อมูลข่าวสารที่ถูกต้อง ชัดเจน', 'แจ้งความคืบหน้าในการดำเนินเรื่อง', 'ประสานงานภายในและหน่วยงานอื่นเพื่อให้บริการต่อเนื่องและรวดเร็ว'],
      ['รับเป็นธุระ ช่วยแก้ปัญหาอย่างรวดเร็ว ไม่บ่ายเบี่ยง ไม่แก้ตัวหรือปัดภาระ', 'ดูแลให้ผู้รับบริการพึงพอใจและนำข้อขัดข้องไปพัฒนาการบริการ'],
      ['ให้เวลาแก่ผู้รับบริการเป็นพิเศษเพื่อช่วยแก้ปัญหา', 'ให้ข้อมูลที่เป็นประโยชน์แม้ผู้รับบริการไม่ได้ถามถึง หรือนำเสนอวิธีการให้บริการที่ได้ประโยชน์สูงสุด'],
      ['เข้าใจความต้องการที่แท้จริงของผู้รับบริการ และให้คำแนะนำที่เป็นประโยชน์'],
      ['คิดถึงผลประโยชน์ระยะยาวของผู้รับบริการ พร้อมเปลี่ยนวิธีหรือขั้นตอนเพื่อประโยชน์สูงสุด', 'เป็นที่ปรึกษาที่ผู้รับบริการไว้วางใจ ให้ความเห็นที่แตกต่างเพื่อประโยชน์อย่างแท้จริง']] },
  '7.5': { desc: 'การดำรงตนและประพฤติปฏิบัติอย่างถูกต้องเหมาะสมทั้งตามกฎหมาย คุณธรรม จรรยาบรรณแห่งวิชาชีพ และจรรยาข้าราชการ เพื่อรักษาศักดิ์ศรีแห่งความเป็นข้าราชการ',
    bullets: [['ปฏิบัติหน้าที่ด้วยความสุจริต ไม่เลือกปฏิบัติ ถูกต้องตามกฎหมายและวินัยข้าราชการ', 'แสดงความคิดเห็นตามหลักวิชาชีพอย่างสุจริต'],
      ['รักษาคำพูด มีสัจจะ และเชื่อถือได้', 'แสดงให้ปรากฏถึงความมีจิตสำนึกในความเป็นข้าราชการ'],
      ['ยึดมั่นในหลักการ จรรยาบรรณแห่งวิชาชีพ และจรรยาข้าราชการ ไม่เบี่ยงเบนด้วยอคติหรือผลประโยชน์ กล้ารับผิดและรับผิดชอบ', 'เสียสละความสุขส่วนตนเพื่อประโยชน์ของทางราชการ'],
      ['ยืนหยัดเพื่อความถูกต้องโดยมุ่งพิทักษ์ผลประโยชน์ของทางราชการแม้ตกอยู่ในสถานการณ์ยากลำบาก', 'กล้าตัดสินใจปฏิบัติหน้าที่ด้วยความถูกต้องแม้ก่อความไม่พอใจให้ผู้เสียผลประโยชน์'],
      ['ยืนหยัดพิทักษ์ผลประโยชน์และชื่อเสียงของประเทศชาติแม้ในสถานการณ์ที่อาจเสี่ยงต่อความมั่นคงในตำแหน่งหน้าที่หรือภัยต่อชีวิต']] },
  '8.1': { desc: 'การคิดในเชิงสังเคราะห์ มองภาพองค์รวม โดยการจับประเด็นสรุปรูปแบบ เชื่อมโยงหรือประยุกต์แนวทางจากสถานการณ์ ข้อมูลหรือทัศนะต่างๆ จนได้เป็นกรอบความคิดหรือแนวคิดใหม่',
    bullets: [['ใช้กฎพื้นฐาน หลักเกณฑ์ หรือสามัญสำนึกในการระบุประเด็นปัญหาหรือแก้ไขปัญหา'],
      ['ระบุความเชื่อมโยงของข้อมูล แนวโน้ม และความไม่ครบถ้วนของข้อมูลได้', 'ประยุกต์ใช้ประสบการณ์ในการระบุหรือแก้ไขปัญหา'],
      ['ประยุกต์ใช้ทฤษฎี แนวคิดที่ซับซ้อน หรือแนวโน้มในอดีตในการระบุหรือแก้ปัญหาตามสถานการณ์'],
      ['อธิบายความคิดหรือสถานการณ์ที่ซับซ้อนให้เข้าใจง่าย', 'สังเคราะห์ข้อมูล สรุปแนวคิด ทฤษฎี องค์ความรู้ที่ซับซ้อนให้เข้าใจง่ายและเป็นประโยชน์ต่องาน'],
      ['ริเริ่ม สร้างสรรค์ ประดิษฐ์ คิดค้น นำเสนอรูปแบบ วิธีการหรือองค์ความรู้ใหม่ที่ไม่เคยปรากฏมาก่อน']] },
  '8.2': { desc: 'การรับรู้ถึงข้อแตกต่างทางวัฒนธรรมและสามารถประยุกต์ความเข้าใจเพื่อสร้างสัมพันธภาพระหว่างกันได้',
    bullets: [['ภาคภูมิใจในวัฒนธรรมของไทยขณะที่เห็นคุณค่าและสนใจเรียนรู้วัฒนธรรมของผู้อื่น', 'ยอมรับความต่างทางวัฒนธรรม ไม่ดูถูกวัฒนธรรมอื่น', 'ปรับเปลี่ยนพฤติกรรมให้สอดคล้องกับบริบททางวัฒนธรรม'],
      ['เข้าใจมารยาท กาลเทศะ ขนบธรรมเนียมของวัฒนธรรมที่แตกต่างและปรับตัวให้สอดคล้อง', 'สื่อสารด้วยวิธีการ เนื้อหา และถ้อยคำที่เหมาะสมกับวัฒนธรรมของผู้อื่น'],
      ['เข้าใจบริบทและนัยสำคัญของวัฒนธรรมต่างๆ', 'เข้าใจรากฐานทางวัฒนธรรมที่ทำให้เข้าใจวิธีคิดของผู้อื่น', 'ไม่ตัดสินผู้อื่นจากความแตกต่างทางวัฒนธรรม'],
      ['สร้างการยอมรับในหมู่ผู้คนต่างวัฒนธรรมเพื่อสัมพันธไมตรีที่ดี', 'ริเริ่มและสนับสนุนการทำงานร่วมกันเพื่อสร้างสัมพันธภาพระหว่างวัฒนธรรมที่ต่างกัน'],
      ['หาทางระงับข้อพิพาทระหว่างวัฒนธรรมโดยประสานและประนีประนอมด้วยความเข้าใจอย่างลึกซึ้ง', 'ปรับกลยุทธ์ ท่าที ให้สอดคล้องกับวัฒนธรรมที่แตกต่างเพื่อประสานประโยชน์']] },
  '8.3': { desc: 'การเล็งเห็นปัญหาหรือโอกาสพร้อมทั้งจัดการเชิงรุกกับปัญหานั้นโดยอาจไม่มีใครร้องขอ และอย่างไม่ย่อท้อ หรือใช้โอกาสนั้นให้เกิดประโยชน์ต่องาน ตลอดจนการคิดริเริ่มสร้างสรรค์สิ่งใหม่ๆ',
    bullets: [['เล็งเห็นปัญหา อุปสรรค และหาวิธีแก้ไขโดยไม่รอช้า', 'เล็งเห็นโอกาสและไม่รีรอที่จะนำมาใช้ประโยชน์ในงาน'],
      ['ลงมือทันทีเมื่อเกิดปัญหาเฉพาะหน้าหรือวิกฤติโดยอาจไม่มีใครร้องขอ', 'แก้ไขปัญหาอย่างเร่งด่วนขณะที่คนส่วนใหญ่รอให้ปัญหาคลี่คลายเอง'],
      ['คาดการณ์และเตรียมการล่วงหน้าเพื่อสร้างโอกาสหรือหลีกเลี่ยงปัญหาในระยะสั้น', 'ทดลองใช้วิธีการที่แปลกใหม่ในการแก้ไขปัญหาหรือสร้างสรรค์สิ่งใหม่'],
      ['คาดการณ์และเตรียมการล่วงหน้าในระยะปานกลาง', 'คิดนอกกรอบเพื่อหาวิธีการแปลกใหม่ในการแก้ปัญหาที่คาดว่าจะเกิดในอนาคต'],
      ['คาดการณ์และเตรียมการล่วงหน้าในระยะยาว', 'สร้างบรรยากาศการคิดริเริ่มในหน่วยงานและกระตุ้นให้เพื่อนร่วมงานเสนอความคิดใหม่']] },
  '8.4': { desc: 'จิตสำนึกหรือความตั้งใจที่จะแสดงออกซึ่งพฤติกรรมที่สอดคล้องกับความต้องการและเป้าหมายของมหาวิทยาลัยราชภัฏยะลา ยึดถือประโยชน์ของมหาวิทยาลัยเป็นที่ตั้งก่อนประโยชน์ส่วนตัว',
    bullets: [['เคารพและยึดถือปฏิบัติตามแบบแผนและธรรมเนียมปฏิบัติของมหาวิทยาลัย'],
      ['แสดงความพึงพอใจและความภาคภูมิใจที่เป็นส่วนหนึ่งของมหาวิทยาลัย', 'มีส่วนสร้างภาพลักษณ์และชื่อเสียงให้แก่มหาวิทยาลัย'],
      ['มีส่วนร่วมสนับสนุนพันธกิจของมหาวิทยาลัยจนบรรลุเป้าหมาย', 'จัดลำดับความเร่งด่วนหรือความสำคัญของงานเพื่อให้พันธกิจบรรลุเป้าหมาย'],
      ['ยึดถือประโยชน์ของมหาวิทยาลัยหรือหน่วยงานก่อนประโยชน์ส่วนบุคคล', 'ยืนหยัดในการตัดสินใจที่เป็นประโยชน์ต่อมหาวิทยาลัยแม้มีผู้ต่อต้าน'],
      ['เสียสละประโยชน์ระยะสั้นของหน่วยงานเพื่อประโยชน์ระยะยาวของมหาวิทยาลัยโดยรวม', 'เสียสละหรือโน้มน้าวผู้อื่นให้เสียสละประโยชน์ส่วนตนเพื่อมหาวิทยาลัย']],
    source: ['กำหนดให้ผู้กำกับตัวชี้วัดและอาจารย์ที่เป็นผู้รับผิดชอบในการจัดเก็บข้อมูล', 'รวบรวมข้อมูลทุก 3 เดือน ส่งผู้กำกับตัวชี้วัดรวบรวมเพื่อส่งต่อสำนักงานคณะ ซึ่งจะสรุปผลทุก 3 เดือน'] },
  '8.5': { desc: 'สร้างหรือรักษาสัมพันธภาพฉันมิตรเพื่อความสัมพันธ์ที่ดีระหว่างผู้เกี่ยวข้องกับงาน',
    bullets: [['สร้างหรือรักษาการติดต่อกับผู้ที่เกี่ยวข้องกับงานเพื่อประโยชน์ในงาน'],
      ['สร้างหรือรักษาความสัมพันธ์ที่ดีกับผู้เกี่ยวข้องกับงานอย่างใกล้ชิด เสริมสร้างมิตรภาพกับเพื่อนร่วมงาน ผู้รับบริการ หรือผู้อื่น'],
      ['ริเริ่มกิจกรรมเพื่อให้มีการติดต่อสัมพันธ์ทางสังคมกับผู้เกี่ยวข้องในวงกว้างเพื่อประโยชน์ในงาน'],
      ['สร้างหรือรักษามิตรภาพโดยมีความสัมพันธ์ในทางส่วนตัวมากขึ้น'],
      ['รักษาความสัมพันธ์ฉันมิตรไว้อย่างต่อเนื่อง แม้ไม่ได้ติดต่อสัมพันธ์ในงานกันแล้ว']] },
  '9.1': { desc: 'สร้างความสามารถหรือความตั้งใจที่จะรับบทบาทการเป็นผู้นำของกลุ่ม กำหนดทิศทาง เป้าหมาย วิธีการทำงาน ให้ทีมปฏิบัติได้อย่างราบรื่น เต็มประสิทธิภาพและบรรลุวัตถุประสงค์ของสถาบันอุดมศึกษา',
    bullets: [['ดำเนินการประชุมให้เป็นไปตามระเบียบวาระ วัตถุประสงค์ และเวลา มอบหมายให้แก่บุคคลในกลุ่มได้', 'แจ้งข่าวสารให้ผู้ได้รับผลกระทบจากการตัดสินใจรับทราบอยู่เสมอ', 'อธิบายเหตุผลในการตัดสินใจให้ผู้เกี่ยวข้องทราบ'],
      ['ส่งเสริมและปฏิบัติเพื่อให้บรรลุเป้าหมายอย่างมีประสิทธิภาพ', 'กำหนดเป้าหมาย ทิศทางที่ชัดเจน จัดกลุ่มงานหรือเลือกคนให้เหมาะสมกับงาน', 'รับฟังความเห็นของผู้อื่น', 'สร้างขวัญและกำลังใจในการปฏิบัติงาน', 'ปฏิบัติต่อสมาชิกในทีมด้วยความยุติธรรม'],
      ['เป็นที่ปรึกษาและช่วยเหลือทีมงาน', 'ปกป้องทีมงานและชื่อเสียงของสถาบัน', 'จัดหาบุคลากร ทรัพยากร หรือข้อมูลสำคัญในทีมงาน'],
      ['กำหนดธรรมเนียมปฏิบัติประจำกลุ่มและประพฤติตนอยู่ในกรอบนั้น', 'ประพฤติปฏิบัติตนเป็นแบบอย่างที่ดี ยึดหลักธรรมาภิบาลในการปกครองผู้ใต้บังคับบัญชา'],
      ['รวมใจและสร้างแรงบันดาลใจให้ทีมงานเกิดความมั่นใจในภารกิจ', 'ล่วงเล็งเห็นการเปลี่ยนแปลงในอนาคต มีวิสัยทัศน์กลยุทธ์เพื่อรับมือการเปลี่ยนแปลง']] },
  '9.2': { desc: 'ความสามารถในการกำหนดทิศทางภารกิจที่ชัดเจน และสามารถในการสร้างความร่วมแรงร่วมใจเพื่อให้ภารกิจบรรลุวัตถุประสงค์',
    bullets: [['รู้ เข้าใจ และอธิบายให้ผู้อื่นเข้าใจได้ว่างานที่ทำอยู่เกี่ยวข้องหรือตอบสนองต่อวิสัยทัศน์ของสถาบันอย่างไร'],
      ['อธิบายให้ผู้อื่นรู้และเข้าใจวิสัยทัศน์องค์กรและเป้าหมายการทำงานของหน่วยงาน', 'แลกเปลี่ยนข้อมูลและรับฟังความคิดเห็นของผู้อื่นเพื่อประกอบการกำหนดวิสัยทัศน์'],
      ['โน้มน้าวให้สมาชิกเกิดความเต็มใจที่จะปฏิบัติหน้าที่เพื่อตอบสนองต่อวิสัยทัศน์', 'ให้คำปรึกษาแนะนำแก่สมาชิกถึงแนวทางการทำงานโดยยึดวิสัยทัศน์และเป้าหมาย'],
      ['ริเริ่มกำหนดนโยบายใหม่ๆ เพื่อตอบสนองต่อการนำวิสัยทัศน์ไปสู่ความสำเร็จ'],
      ['กำหนดวิสัยทัศน์ เป้าหมาย และทิศทางของสถาบันเพื่อบรรลุวิสัยทัศน์ระดับประเทศ', 'คาดการณ์ผลกระทบจากการเปลี่ยนแปลงทั้งภายในและภายนอก']] },
  '9.3': { desc: 'ความเข้าใจวิสัยทัศน์นโยบายภาครัฐและสามารถนำมาประยุกต์ใช้ในการกำหนดกลยุทธ์ของสถาบันอุดมศึกษาได้',
    bullets: [['เข้าใจนโยบาย ภารกิจ และกลยุทธ์ของภาครัฐและสถาบันว่าเชื่อมโยงกับภารกิจของหน่วยงานที่รับผิดชอบ', 'วิเคราะห์ปัญหาหรืออุปสรรคหรือโอกาสของหน่วยงานได้'],
      ['ประยุกต์ใช้ประสบการณ์ในการกำหนดกลยุทธ์ของหน่วยงานให้สอดคล้องกับกลยุทธ์ภาครัฐ', 'ใช้ความรู้ความเข้าใจในระบบราชการปรับกลยุทธ์ให้เหมาะสมกับสถานการณ์'],
      ['ประยุกต์ใช้ทฤษฎีหรือแนวคิดซับซ้อนในการคิดและพัฒนาเป้าหมายหรือกลยุทธ์', 'ประยุกต์แนวทางที่ประสบความสำเร็จหรือผลการวิจัยมากำหนดแผนงานเชิงกลยุทธ์'],
      ['ประเมินและสังเคราะห์สถานการณ์ เศรษฐกิจ สังคม การเมือง ในประเทศหรือของโลกเพื่อกำหนดกลยุทธ์', 'คาดการณ์สถานการณ์ในอนาคตและกำหนดกลยุทธ์ให้สอดคล้อง'],
      ['ริเริ่ม สร้างสรรค์ และบูรณาการองค์ความรู้ใหม่ในการกำหนดกลยุทธ์ภาครัฐ', 'ปรับเปลี่ยนทิศทางกลยุทธ์ของประเทศอย่างต่อเนื่อง']] },
  '9.4': { desc: 'ความสามารถในการกระตุ้น หรือผลักดันหน่วยงานไปสู่ความปรับเปลี่ยนที่เป็นประโยชน์ รวมถึงการสื่อสารให้ผู้อื่นรับรู้ เข้าใจ และดำเนินการให้ผู้อื่นรับรู้ได้จริง',
    bullets: [['เห็นความจำเป็นของการปรับเปลี่ยนและปรับพฤติกรรมหรือแผนการทำงานให้สอดคล้อง', 'เข้าใจและยอมรับความจำเป็นของการปรับเปลี่ยน และเรียนรู้เพื่อรับการเปลี่ยนแปลง'],
      ['ช่วยเหลือให้ผู้อื่นเข้าใจถึงความจำเป็นและประโยชน์ของการเปลี่ยนแปลง', 'สนับสนุนความพยายามในการปรับเปลี่ยนองค์กร เสนอแนะวิธีการและมีส่วนร่วม'],
      ['กระตุ้นและสร้างแรงจูงใจให้ผู้อื่นเห็นความสำคัญของการปรับเปลี่ยน', 'เปรียบเทียบสิ่งที่ปฏิบัติอยู่ในปัจจุบันกับสิ่งที่จะเปลี่ยนแปลงไป', 'สร้างความเข้าใจแก่ผู้ที่ยังไม่ยอมรับการเปลี่ยนแปลง'],
      ['วางแผนอย่างเป็นระบบและชี้ให้เห็นประโยชน์ของการปรับเปลี่ยน', 'เตรียมแผนและติดตามการบริหารอย่างสม่ำเสมอ'],
      ['ผลักดันให้การปรับเปลี่ยนดำเนินไปอย่างราบรื่นและประสบความสำเร็จ', 'สร้างขวัญกำลังใจและความเชื่อมั่นในการขับเคลื่อนการปรับเปลี่ยน']] },
  '9.5': { desc: 'ความสามารถในการควบคุมอารมณ์และพฤติกรรมในสถานการณ์ที่อาจถูกยั่วยุ หรือเผชิญหน้ากับความไม่เป็นมิตร หรือต้องทำงานภายใต้ภาวะกดดัน รวมถึงความอดทนอดกลั้นเมื่ออยู่ในสถานการณ์ที่ก่อความเครียดอย่างต่อเนื่อง',
    bullets: [['ไม่แสดงพฤติกรรมที่ไม่เหมาะสมหรือไม่สุภาพทุกสถานการณ์'],
      ['รู้เท่าทันอารมณ์ของตนเองและควบคุมได้อย่างเหมาะสม อาจหลีกเลี่ยงสถานการณ์เสี่ยง เปลี่ยนหัวข้อสนทนา หรือหยุดพักชั่วคราว'],
      ['รู้สึกถึงอารมณ์รุนแรงแต่ไม่แสดงออกแม้ถูกยั่วยุ ยังทำงานได้อย่างสงบ', 'เลือกวิธีการแสดงออกที่เหมาะสมเพื่อไม่ให้เกิดผลเชิงลบทั้งต่อตนเองและผู้อื่น'],
      ['กำจัดความเครียดหรือผลจากภาวะกดดันทางอารมณ์ได้อย่างมีประสิทธิภาพ', 'ประยุกต์ใช้วิธีเฉพาะตนหรือวางแผนล่วงหน้ารับกับความเครียด', 'บริหารจัดการอารมณ์ได้อย่างมีประสิทธิภาพเพื่อลดความเครียด'],
      ['ระงับอารมณ์รุนแรงด้วยการทำความเข้าใจและแก้ไขที่ต้นเหตุของปัญหา', 'ในสถานการณ์ตึงเครียดยังควบคุมอารมณ์ตนเองและทำให้ผู้อื่นมีอารมณ์สงบลง']] },
  '9.6': { desc: 'การตั้งใจที่จะส่งเสริมการเรียนรู้และพัฒนาผู้อื่นในระยะยาวจนถึงระดับที่เชื่อมั่นว่าจะสามารถมอบหมายหน้าที่ความรับผิดชอบให้ผู้นั้นมีอิสระที่จะตัดสินใจในการปฏิบัติหน้าที่ราชการของตนได้',
    bullets: [['สอนงานด้วยการให้คำแนะนำอย่างละเอียด สาธิตวิธีการปฏิบัติงาน', 'ชี้แนะแหล่งข้อมูลหรือทรัพยากรเพื่อใช้ในการพัฒนาการปฏิบัติงาน'],
      ['ให้คำปรึกษาชี้แนะแนวทางในการพัฒนาหรือส่งเสริมข้อดีและปรับปรุงข้อด้อย', 'ให้โอกาสผู้ใต้บังคับบัญชาแสดงศักยภาพเพื่อสร้างความมั่นใจ'],
      ['วางแผนพัฒนาผู้ใต้บังคับบัญชาทั้งระยะสั้นและระยะยาว', 'มอบหมายงานที่เหมาะสม ให้โอกาสฝึกอบรมหรือพัฒนาสม่ำเสมอ', 'มอบหมายหน้าที่ความรับผิดชอบในระดับการตัดสินใจบางเรื่อง'],
      ['ปรับเปลี่ยนทัศนคติเดิมที่เป็นปัจจัยขัดขวางการพัฒนาศักยภาพของผู้ใต้บังคับบัญชา', 'เข้าใจสาเหตุแห่งพฤติกรรมของแต่ละบุคคลเพื่อนำมาเป็นปัจจัยในการพัฒนา'],
      ['สร้างและสนับสนุนให้มีการสอนงานและการมอบหมายหน้าที่อย่างเป็นระบบในสถาบัน', 'สร้างและสนับสนุนวัฒนธรรมแห่งการเรียนรู้อย่างต่อเนื่องในสถาบัน']] }
};

/** นิยามกลุ่มผู้รับการประเมิน (หน้า 4, 9, 13, 16) */
var GROUP_DEFS = {
  adm: 'อธิการบดี รองอธิการบดี ผู้ช่วยอธิการบดี คณบดี ผู้อำนวยการสำนัก/สถาบันหรือหัวหน้าหน่วยงานที่เทียบเท่าคณะ รองหัวหน้าส่วนราชการเทียบเท่าคณะ หรือหัวหน้าหน่วยงานที่เทียบเท่ากอง (อธิการบดีใช้น้ำหนักข้อ 1.2 จำนวน 40 คะแนน)',
  tch: 'ข้าราชการพลเรือนในสถาบันอุดมศึกษาและพนักงานมหาวิทยาลัย ตำแหน่งวิชาการ (ต้องมีงานวิจัยและบริการวิชาการตามพันธกิจอย่างน้อย 1 เรื่อง)',
  res: 'ผู้อำนวยการแผนงานวิจัย หัวหน้าโครงการวิจัย หรือผู้ร่วมวิจัยที่ได้รับงบประมาณสนับสนุนการวิจัยจากแหล่งทุนภายนอกมหาวิทยาลัย (ผู้ได้รับทุนภายนอกต้องประเมินในกลุ่มนี้)',
  svc: 'ผู้ได้รับทุนและเป็นหัวหน้าโครงการหรือผู้ร่วมโครงการพัฒนาท้องถิ่น'
};

/** รวมรายละเอียดเข้ากับตัวชี้วัด (เรียกจาก getBootstrap) */
function withDetail_(o) {
  var d = CRITERIA_DETAIL[o.code];
  if (d) Object.keys(d).forEach(function (k) { o[k] = d[k]; });
  return o;
}


/**
 * Scoring.gs — เครื่องวิเคราะห์ผลงานและแนะนำระดับคะแนนตามเกณฑ์ประกาศ
 * หลักการ: (1) นับเฉพาะผลงานที่มีหลักฐานแนบ  (2) แนะนำระดับตามกติกาของแต่ละตัวชี้วัด
 *          (3) ระดับที่ผู้ประเมินยืนยัน (ชีต Scores) มีผลเหนือระดับที่ระบบแนะนำ
 *          (4) ผล AI (ถ้าเปิดใช้) เป็นข้อเสนอแนะเท่านั้น ไม่ถูกนำไปคิดคะแนนอัตโนมัติ
 */

var MIN_CASE_TEXT = 80; // ความยาวขั้นต่ำของคำบรรยายกรณีพฤติกรรม (สมรรถนะ)

function analyzePeriod_(period, works, evidence, scores) {
  var evByWork = {};
  evidence.forEach(function (e) { (evByWork[e.workId] = evByWork[e.workId] || []).push(e); });
  var finalMap = {};
  scores.forEach(function (s) { finalMap[s.code] = { level: Number(s.finalLevel), note: s.note, by: s.by, at: s.at }; });

  var res = {};
  INDICATORS.forEach(function (ind) {
    var ws = works.filter(function (w) { return w.code === ind.code; });
    res[ind.code] = analyzeIndicator_(ind, ws, evByWork, finalMap[ind.code]);
  });

  var groups = {};
  GROUPS.forEach(function (g) { groups[g.key] = groupScore_(g.key, res, finalMap); });
  return { indicators: res, groups: groups, generatedAt: new Date().toISOString() };
}

function maxLevelOf_(ind) { return ind.mode === 'add' ? 5 : ind.lv.length; }

function analyzeIndicator_(ind, ws, evByWork, final) {
  var r = {
    code: ind.code, autoLevel: 0, finalLevel: final ? final.level : null, finalNote: final ? final.note : '',
    maxLevel: maxLevelOf_(ind), value: null, addPts: null,
    workCount: ws.length, evidenceCount: 0, eligibleCount: 0,
    reasons: [], gaps: [], warnings: [], status: 'none', points: {}
  };
  var eligible = [];
  ws.forEach(function (w) {
    var ev = evByWork[w.id] || [];
    r.evidenceCount += ev.length;
    var ok = ev.length > 0;
    if (ind.mode === 'comp') ok = ok || String(w.detail || '').length >= MIN_CASE_TEXT;
    if (ok) eligible.push(w);
    else r.warnings.push('“' + w.title + '” ยังไม่มีหลักฐาน' + (ind.mode === 'comp' ? 'หรือคำบรรยายกรณีพฤติกรรมไม่เพียงพอ' : '') + ' — ยังไม่นับคะแนน');
    if (ind.mode === 'comp' && ok && String(w.detail || '').length < MIN_CASE_TEXT)
      r.warnings.push('“' + w.title + '” ควรเขียนกรณีตัวอย่างแบบ สถานการณ์–การกระทำ–ผลลัพธ์ ให้ชัดเจน');
  });
  r.eligibleCount = eligible.length;

  var lv = 0, union = [];
  eligible.forEach(function (w) { (w.items || []).forEach(function (i) { if (union.indexOf(Number(i)) < 0) union.push(Number(i)); }); });
  union.sort(function (a, b) { return a - b; });

  switch (ind.mode) {
    case 'level':
    case 'comp':
      eligible.forEach(function (w) { if (w.claimLevel > lv) lv = Math.min(w.claimLevel, r.maxLevel); });
      if (lv) r.reasons.push('ระดับสูงสุดที่มีหลักฐานรองรับ: ระดับ ' + lv + ' — ' + levelLabel_(ind, lv));
      break;
    case 'mean':
      var vals = eligible.map(function (w) { return Number(w.value); }).filter(function (v) { return v > 0 && v <= 5; });
      if (vals.length) {
        var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
        r.value = Math.round(avg * 100) / 100;
        lv = r.value > 4 ? 5 : r.value > 3.5 ? 4 : r.value > 3 ? 3 : r.value > 2 ? 2 : r.value >= 1 ? 1 : 0;
        r.reasons.push('ค่าเฉลี่ยจาก ' + vals.length + ' รายวิชา = ' + r.value.toFixed(2) + ' → ระดับ ' + lv);
      }
      if (eligible.length && !vals.length) r.warnings.push('ยังไม่ได้กรอกค่าเฉลี่ยความพึงพอใจ (1.00–5.00) ในผลงาน');
      break;
    case 'budget41':
      var sum41 = sumShare_(eligible);
      if (eligible.length) {
        r.value = sum41;
        lv = sum41 > 1000000 ? 5 : sum41 > 500000 ? 4 : sum41 > 250000 ? 3 : sum41 > 100000 ? 2 : sum41 > 0 ? 1 : 0;
        r.reasons.push('งบประมาณตามสัดส่วนรวม ' + money_(sum41) + ' บาท → ระดับ ' + lv);
        if (!sum41) r.warnings.push('ยังไม่ได้กรอกงบประมาณโครงการ');
      }
      break;
    case 'budget31':
      if (eligible.length) {
        var sum31 = sumShare_(eligible);
        var roleOk = eligible.some(function (w) { return /หัวหน้า|ผู้อำนวยการ|ผู้ร่วม/.test(w.role || ''); });
        r.value = sum31;
        lv = 1;
        if (roleOk && sum31 > 0) lv = sum31 >= 3000000 ? 5 : sum31 >= 1000000 ? 4 : sum31 >= 400000 ? 3 : 2;
        r.reasons.push('ได้รับทุนภายนอก (ข้อ 1)' + (roleOk ? '' : ' — ยังไม่ระบุบทบาทหัวหน้า/ผู้อำนวยการ/ผู้ร่วมวิจัย'));
        if (roleOk) r.reasons.push('งบประมาณตามบทบาท/สัดส่วนรวม ' + money_(sum31) + ' บาท → ระดับ ' + lv);
      }
      break;
    case 'count':
      if (union.length) {
        lv = ind.countMap[Math.min(union.length, ind.countMap.length - 1)];
        r.reasons.push('ดำเนินการได้ ' + union.length + ' ข้อ: ' + union.map(function (i) { return 'ข้อ ' + (i + 1); }).join(', ') + ' → ระดับ ' + lv);
      }
      break;
    case 'cum':
      while (union.indexOf(lv) >= 0) lv++;
      if (union.length) r.reasons.push('องค์ประกอบที่มีหลักฐาน: ' + union.map(function (i) { return i + 1; }).join(', ') + ' → นับต่อเนื่องได้ ' + lv + ' องค์ประกอบ');
      if (union.length > lv) r.warnings.push('มีองค์ประกอบลำดับถัดไปแล้ว แต่ยังขาดองค์ประกอบที่ ' + (lv + 1) + ' ซึ่งเกณฑ์กำหนดให้นับสะสมตามลำดับ');
      break;
    case 'add':
      var pts = 0;
      union.forEach(function (i) { pts += ind.itemPts[i] || 0; });
      pts = Math.min(pts, ind.w);
      r.addPts = pts;
      lv = Math.round(pts / ind.w * 5 * 10) / 10;
      if (union.length) r.reasons.push('รายการที่มีหลักฐาน: ' + union.map(function (i) { return ind.items[i] + ' (' + ind.itemPts[i] + ')'; }).join('; ') + ' = ' + pts + ' คะแนน');
      break;
  }
  r.autoLevel = lv;
  var level = r.finalLevel != null && !isNaN(r.finalLevel) ? r.finalLevel : lv;
  r.level = level;

  // ช่องว่างสู่ระดับถัดไป
  if (!ws.length) r.gaps.push('ยังไม่มีผลงานในตัวชี้วัดนี้ — หลักฐานที่ควรเตรียม: ' + (ind.ev || 'กรณีตัวอย่างพฤติกรรมพร้อมหลักฐานประกอบ'));
  else if (ind.mode === 'add') {
    ind.items.forEach(function (t, i) { if (union.indexOf(i) < 0) r.gaps.push('เพิ่มได้อีก ' + ind.itemPts[i] + ' คะแนน: ' + t); });
  } else if (ind.mode === 'count' || ind.mode === 'cum') {
    var missing = ind.items.map(function (t, i) { return i; }).filter(function (i) { return union.indexOf(i) < 0; });
    if (ind.mode === 'cum' && lv < 5) r.gaps.push('ระดับถัดไปต้องมีหลักฐานองค์ประกอบที่ ' + (lv + 1) + ': ' + ind.items[lv]);
    if (ind.mode === 'count' && lv < 5 && missing.length) r.gaps.push('ข้อที่ยังไม่มีหลักฐาน: ' + missing.map(function (i) { return (i + 1) + ') ' + ind.items[i]; }).join(' | '));
  } else if (lv < r.maxLevel && ind.mode !== 'mean' && ind.mode.indexOf('budget') !== 0) {
    r.gaps.push('ระดับถัดไป (' + (lv + 1) + '): ' + levelLabel_(ind, lv + 1));
  } else if (ind.mode === 'mean' && lv < 5 && r.value != null) {
    r.gaps.push('ต้องได้ค่าเฉลี่ยมากกว่า ' + [0, 2, 3, 3.5, 4][lv] + ' เพื่อขึ้นระดับ ' + (lv + 1));
  }
  if (ind.note) r.warnings.push('ข้อกำหนดเพิ่มเติม: ' + ind.note);

  r.status = !ws.length ? 'none' : !eligible.length ? 'noevidence' : level >= r.maxLevel ? 'full' : 'partial';
  var useAdd = ind.mode === 'add' && (r.finalLevel == null || isNaN(r.finalLevel));
  GROUPS.forEach(function (g) { r.points[g.key] = pointsFor_(ind, level, g.key, useAdd ? r.addPts : null); });
  return r;
}

function pointsFor_(ind, level, g, addPts) {
  var w = indicatorWeight_(ind, g);
  if (!w || !level) return 0;
  if (ind.mode === 'add') return addPts != null ? Math.min(addPts, w) : round2_(w * level / 5);
  var s = sectionOf_(ind.sec);
  var L = Math.min(Math.floor(level), maxLevelOf_(ind));
  if (ind.pts && s.primary === g && L >= 1) return ind.pts[L - 1];
  return round2_(w * Math.min(level, maxLevelOf_(ind)) / maxLevelOf_(ind));
}

function groupScore_(g, res, finalMap) {
  var out = { total: 0, sections: [] };
  SECTIONS.forEach(function (s) {
    var W = s.w[g];
    if (!W) return;
    var inds = INDICATORS.filter(function (i) { return i.sec === s.sec; });
    var row = { sec: s.sec, name: s.name, weight: W, score: 0, basis: 'indicator', level5: null };
    if (s.primary && s.primary !== g) {
      // ด้านรอง: ใช้ระดับสูงสุดในด้าน (ปรับเป็นสเกล 5) หรือระดับที่ผู้ประเมินยืนยันในรหัส S{sec}
      var ov = finalMap['S' + s.sec];
      var best = 0;
      inds.forEach(function (i) { var r = res[i.code]; if (r && r.level) best = Math.max(best, r.level / r.maxLevel * 5); });
      row.level5 = ov ? ov.level : round2_(best);
      row.basis = ov ? 'evaluator' : 'assumed-max';
      row.score = round2_(W * row.level5 / 5);
    } else {
      inds.forEach(function (i) { row.score += res[i.code].points[g] || 0; });
      row.score = round2_(row.score);
    }
    out.total += row.score;
    out.sections.push(row);
  });
  out.total = round2_(out.total);
  return out;
}

function levelLabel_(ind, lv) {
  if (ind.opts) return ind.opts.filter(function (o) { return o.lv === lv; }).map(function (o) { return o.t; }).join(' หรือ ');
  return ind.lv[lv - 1] || '';
}
function sumShare_(ws) {
  return ws.reduce(function (a, w) {
    var v = Number(w.value) || 0, s = w.share === '' || w.share == null ? 100 : Number(w.share);
    return a + v * s / 100;
  }, 0);
}
function money_(n) { return Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }); }
function round2_(n) { return Math.round(n * 100) / 100; }

/* ============================ AI (ไม่บังคับ) ============================ */

function aiAnalyze(pin, period, code) {
  requireAdmin_(pin);
  var s = settingsMap_();
  var key = PropertiesService.getScriptProperties().getProperty('AI_API_KEY');
  if (!key || !s.AI_PROVIDER || s.AI_PROVIDER === 'none') throw new Error('ยังไม่ได้ตั้งค่า AI (ผู้ให้บริการ/API key) ในหน้าตั้งค่า');
  if (!s.AI_MODEL) throw new Error('กรุณาระบุชื่อโมเดล AI ในหน้าตั้งค่า');
  var ind = indicatorOf_(code);
  var data = getPeriodData_(period);
  var ws = data.works.filter(function (w) { return w.code === code; });
  var ev = data.evidence;
  var payload = {
    indicator: { code: ind.code, name: ind.name, unit: ind.unit, levels: levelText_(ind), evidenceHint: ind.ev || '', note: ind.note || '' },
    ruleEngine: data.analysis.indicators[code],
    works: ws.map(function (w) {
      return { title: w.title, date: w.workDate, detail: w.detail, claimLevel: w.claimLevel, items: w.items, value: w.value, share: w.share, role: w.role,
        evidence: ev.filter(function (e) { return e.workId === w.id; }).map(function (e) { return { type: e.type, title: e.title, docNo: e.docNo, docDate: e.docDate, isFile: !!e.fileId }; }) };
    })
  };
  var prompt = [
    'คุณเป็นผู้ช่วยกรรมการประเมินผลการปฏิบัติราชการ ตำแหน่งวิชาการ มหาวิทยาลัยราชภัฏยะลา',
    'วิเคราะห์ผลงานและหลักฐาน (ชื่อเอกสาร ประเภท วันที่ — คุณไม่เห็นเนื้อหาไฟล์) เทียบกับเกณฑ์ระดับของตัวชี้วัด',
    'กติกา: ห้ามให้ระดับเกินกว่าที่หลักฐานรองรับ; ถ้าข้อมูลไม่พอให้ระบุว่าไม่พอ; แยกสิ่งที่ยืนยันได้จากหลักฐานออกจากสิ่งที่อนุมาน',
    'ตอบเป็น JSON เท่านั้น รูปแบบ: {"suggestedLevel":number,"confidence":"สูง|กลาง|ต่ำ","reasons":[string],"missingEvidence":[string],"nextSteps":[string],"inferred":[string]}',
    'ข้อมูล:', JSON.stringify(payload)
  ].join('\n');

  var text = s.AI_PROVIDER === 'gemini' ? callGemini_(key, s.AI_MODEL, prompt) : callAnthropic_(key, s.AI_MODEL, prompt);
  var m = text.match(/\{[\s\S]*\}/);
  var result = m ? safeJson_(m[0], { raw: text }) : { raw: text };
  dirty_(); sheet_(SHEETS.AILOG).appendRow([cell_('period', String(period)), cell_('code', String(code)), new Date(), s.AI_PROVIDER + ':' + s.AI_MODEL, JSON.stringify(result)]);
  return result;
}

function callAnthropic_(key, model, prompt) {
  var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: model, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
  });
  var j = safeJson_(resp.getContentText(), {});
  if (resp.getResponseCode() !== 200) throw new Error('AI error: ' + (j.error && j.error.message || resp.getResponseCode()));
  return (j.content || []).map(function (c) { return c.text || ''; }).join('');
}

function callGemini_(key, model, prompt) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
  var resp = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } })
  });
  var j = safeJson_(resp.getContentText(), {});
  if (resp.getResponseCode() !== 200) throw new Error('AI error: ' + (j.error && j.error.message || resp.getResponseCode()));
  return (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(function (p) { return p.text || ''; }).join('');
}


/**
 * Report.gs — รายงานผลการดำเนินงาน (HTML/PDF), CSV และ ZIP หลักฐาน
 */

/**
 * opts = { sections: [2,3,...], parts: { summary, criteria, analysis, works } }
 * หมายเหตุ (ข้อมูลที่ไม่มี / สิ่งที่อนุมาน) แสดงทุกครั้งเสมอ
 */
function normOpts_(g, opts) {
  opts = opts || {};
  var secs = (opts.sections && opts.sections.length ? opts.sections : SECTIONS.map(function (x) { return x.sec; }))
    .map(Number).filter(function (n) { var x = sectionOf_(n); return x && x.w[g] > 0; });
  var p = opts.parts || {};
  var def = function (v) { return v === undefined ? true : !!v; };
  return { sections: secs, parts: { summary: def(p.summary), criteria: def(p.criteria), analysis: def(p.analysis), works: def(p.works) } };
}

function getReportHtml(cred, period, group, opts) {
  requirePfView_(cred);
  group = group || getSetting_('PREFERRED_GROUP') || 'tch';
  return buildReportHtml_(period, group, false, normOpts_(group, opts));
}

function exportReportPdf(cred, period, group, opts) { return exportReport(cred, period, group, opts, 'pdf'); }

/** format: pdf | docx | xlsx */
function exportReport(cred, period, group, opts, format) {
  requirePfView_(cred);
  var o = normOpts_(group, opts);
  var base = reportFileBase_(period, group, o);
  if (format === 'xlsx') return saveExport_(buildXlsx_(period, group, o, base));
  var html = buildReportHtml_(period, group, true, o);
  if (format === 'docx') return saveExport_(htmlToDocx_(html, base));
  var blob = Utilities.newBlob(html, 'text/html', 'report.html').getAs('application/pdf');
  blob.setName(base + '.pdf');
  return saveExport_(blob);
}

function reportFileBase_(period, g, o) {
  var all = o.sections.length === SECTIONS.filter(function (x) { return x.w[g] > 0; }).length;
  return 'รายงานผลการปฏิบัติราชการ_' + period + '_' + g + '_' + (all ? 'ทุกด้าน' : 'ด้าน' + o.sections.join('-')) + '_' + stamp_();
}

/** แปลง HTML → Google Docs (Drive API) → ส่งออก .docx ; ถ้าไม่สำเร็จ ส่ง .doc (HTML ที่ Word เปิดได้) */
function htmlToDocx_(html, base) {
  var token = ScriptApp.getOAuthToken();
  try {
    var b = 'yruBoundary' + Date.now();
    var meta = JSON.stringify({ name: base, mimeType: 'application/vnd.google-apps.document' });
    var body = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + b +
      '\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n' + html + '\r\n--' + b + '--';
    var up = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'post', contentType: 'multipart/related; boundary=' + b, payload: Utilities.newBlob(body).getBytes(),
      headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    if (up.getResponseCode() !== 200) throw new Error(up.getContentText());
    var id = JSON.parse(up.getContentText()).id;
    var ex = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' +
      encodeURIComponent('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
    if (ex.getResponseCode() !== 200) throw new Error(ex.getContentText());
    return ex.getBlob().setName(base + '.docx');
  } catch (err) {
    log_('docx fallback', String(err).slice(0, 200));
    return Utilities.newBlob('﻿' + html, 'application/msword', base + '.doc');
  }
}

/** สร้าง Google Sheets ชั่วคราว → ส่งออก .xlsx */
function buildXlsx_(period, g, o, base) {
  var d = getPeriodData_(period), A = d.analysis, gs = A.groups[g], s = settingsMap_();
  var ss = SpreadsheetApp.create(base);
  var put = function (sh, rows, widths) {
    var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    rows = rows.map(function (r) { while (r.length < w) r.push(''); return r; });
    sh.getRange(1, 1, rows.length, w).setValues(rows).setWrap(true).setVerticalAlignment('top').setFontFamily('Sarabun');
    sh.getRange(1, 1, 1, w).setFontWeight('bold').setBackground('#3b3fb6').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    (widths || []).forEach(function (px, i) { sh.setColumnWidth(i + 1, px); });
  };
  var inSec = function (i) { return o.sections.indexOf(i.sec) >= 0; };

  var sh1 = ss.getSheets()[0]; sh1.setName('สรุปตามด้าน');
  var r1 = [['ด้าน', 'ชื่อด้าน', 'น้ำหนัก', 'คะแนนที่ได้', 'ร้อยละ', 'ที่มา']];
  gs.sections.forEach(function (r) {
    if (o.sections.indexOf(r.sec) < 0) return;
    r1.push([r.sec, r.name, r.weight, r.score, r.weight ? Math.round(r.score / r.weight * 1000) / 10 : 0,
      r.basis === 'assumed-max' ? 'ด้านรอง: ใช้ระดับสูงสุดในด้าน (อนุมาน)' : r.basis === 'evaluator' ? 'ผู้ประเมินยืนยัน' : 'รวมจากตัวชี้วัด']);
  });
  r1.push(['', 'ผู้รับการประเมิน: ' + (s.OWNER_NAME || '—') + ' | ' + (s.FACULTY || '—'), '', '', '', 'กลุ่ม: ' + GROUPS.filter(function (x) { return x.key === g; })[0].name + ' | รอบ ' + period]);
  put(sh1, r1, [50, 280, 70, 90, 70, 300]);

  var sh2 = ss.insertSheet('ตัวชี้วัด');
  var r2 = [['รหัส', 'ตัวชี้วัด', 'น้ำหนัก', 'ระดับ', 'ระดับสูงสุด', 'คะแนน', 'สถานะ', 'ที่มาของระดับ', 'เกณฑ์ระดับที่ได้', 'เหตุผล', 'สิ่งที่ต้องทำเพิ่ม']];
  var ST = { full: 'ครบระดับสูงสุด', partial: 'ยังไม่ถึงระดับสูงสุด', noevidence: 'ขาดหลักฐาน', none: 'ยังไม่มีข้อมูล' };
  INDICATORS.filter(inSec).forEach(function (ind) {
    var a = A.indicators[ind.code];
    r2.push([ind.code, ind.name, indicatorWeight_(ind, g) || '(ด้านรอง)', a.level, a.maxLevel, a.points[g], ST[a.status],
      a.finalLevel != null ? 'ผู้ประเมินยืนยัน' : 'ระบบแนะนำ', a.level && ind.mode !== 'add' ? levelLabel_(ind, Math.floor(a.level)) : '', a.reasons.join('\n'), a.gaps.join('\n')]);
  });
  put(sh2, r2, [50, 300, 70, 55, 70, 60, 120, 100, 260, 260, 260]);

  var sh3 = ss.insertSheet('ผลงานและหลักฐาน');
  var r3 = [['รหัส', 'ผลงาน/กิจกรรม', 'วันที่', 'รายละเอียด', 'ระดับ/ค่าที่อ้าง', 'ประเภทหลักฐาน', 'ชื่อหลักฐาน', 'เลขที่', 'ลงวันที่', 'ลิงก์']];
  d.works.filter(function (w) { return inSec(indicatorOf_(w.code)); }).sort(function (x, y) { return x.code.localeCompare(y.code); }).forEach(function (w) {
    var ev = d.evidence.filter(function (e) { return e.workId === w.id; });
    var claim = w.claimLevel || (w.value !== '' ? w.value : '') || (w.items && w.items.length ? 'ข้อ ' + w.items.map(function (x) { return Number(x) + 1; }).join(',') : '');
    if (!ev.length) r3.push([w.code, w.title, w.workDate, w.detail, claim, '(ไม่มีหลักฐาน)', '', '', '', '']);
    ev.forEach(function (e, k) { r3.push([w.code, k ? '' : w.title, k ? '' : w.workDate, k ? '' : w.detail, k ? '' : claim, e.type, e.title, e.docNo, e.docDate, e.url]); });
  });
  put(sh3, r3, [50, 240, 90, 260, 90, 150, 220, 90, 90, 260]);

  var sh4 = ss.insertSheet('เกณฑ์');
  var r4 = [['รหัส', 'ตัวชี้วัด', 'คำอธิบาย', 'ระดับ/รายการ', 'เกณฑ์']];
  INDICATORS.filter(inSec).forEach(function (ind) {
    var dt = CRITERIA_DETAIL[ind.code] || {};
    levelText_(ind).split('\n').forEach(function (line, k) {
      var m = line.match(/^(ระดับ \d+|ข้อ \d+): (.*)$/);
      r4.push([k ? '' : ind.code, k ? '' : ind.name, k ? '' : (dt.desc || ''), m ? m[1] : '', m ? m[2] : line]);
    });
  });
  put(sh4, r4, [50, 260, 320, 80, 420]);

  var sh5 = ss.insertSheet('หมายเหตุ');
  var r5 = [['ประเภท', 'รายละเอียด']];
  INDICATORS.filter(inSec).forEach(function (i) { var st = A.indicators[i.code].status; if (st === 'none') r5.push(['(1) ข้อมูลที่ไม่มี', i.code + ' ยังไม่มีผลงานบันทึก']); if (st === 'noevidence') r5.push(['(1) ข้อมูลที่ไม่มี', i.code + ' มีผลงานแต่ไม่มีหลักฐาน (ไม่นับคะแนน)']); });
  r5.push(['(1) ข้อมูลที่ไม่มี', 'ระบบตรวจการมีอยู่ ประเภท และชื่อหลักฐาน ไม่ได้อ่านเนื้อหาไฟล์']);
  SCORING_ASSUMPTIONS.forEach(function (x) { r5.push(['(2) สิ่งที่อนุมาน/ตีความ', x]); });
  r5.push(['(2) สิ่งที่อนุมาน/ตีความ', 'คะแนนเป็นคะแนนประมวลผลเพื่อเตรียมรับการประเมิน ไม่ใช่ผลการประเมินอย่างเป็นทางการ']);
  put(sh5, r5, [180, 700]);
  SpreadsheetApp.flush();

  var id = ss.getId();
  var resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
  if (resp.getResponseCode() !== 200) throw new Error('ส่งออก Excel ไม่สำเร็จ: ' + resp.getResponseCode());
  return resp.getBlob().setName(base + '.xlsx');
}

function exportCsv(cred, period) {
  requirePfView_(cred);
  var d = getPeriodData_(period);
  var rows = [['ด้าน', 'ตัวชี้วัด', 'ชื่อตัวชี้วัด', 'ผลงาน', 'วันที่', 'ระดับที่อ้าง', 'ค่าตัวเลข', 'สัดส่วน%', 'บทบาท', 'จำนวนหลักฐาน', 'ระดับแนะนำ(ตัวชี้วัด)', 'ระดับยืนยัน', 'หลักฐาน (ประเภท|ชื่อ|ลิงก์)']];
  INDICATORS.forEach(function (ind) {
    var a = d.analysis.indicators[ind.code];
    var ws = d.works.filter(function (w) { return w.code === ind.code; });
    if (!ws.length) rows.push([ind.sec, ind.code, ind.name, '(ไม่มีข้อมูล)', '', '', '', '', '', 0, a.autoLevel, a.finalLevel == null ? '' : a.finalLevel, '']);
    ws.forEach(function (w) {
      var ev = d.evidence.filter(function (e) { return e.workId === w.id; });
      rows.push([ind.sec, ind.code, ind.name, w.title, w.workDate, w.claimLevel || '', w.value, w.share, w.role, ev.length, a.autoLevel,
        a.finalLevel == null ? '' : a.finalLevel, ev.map(function (e) { return e.type + '|' + e.title + '|' + e.url; }).join(' ; ')]);
    });
  });
  var csv = '﻿' + rows.map(function (r) { return r.map(csvCell_).join(','); }).join('\r\n');
  return saveExport_(Utilities.newBlob(csv, 'text/csv', 'ข้อมูลผลงาน_' + period + '_' + stamp_() + '.csv'));
}

/** code = รหัสตัวชี้วัด, อาร์เรย์รหัส หรือ 'ALL' */
function exportZip(cred, period, code) {
  requirePfView_(cred);
  var list = Array.isArray(code) ? code : null;
  var d = getPeriodData_(period);
  var works = {};
  d.works.forEach(function (w) { works[w.id] = w; });
  var blobs = [], total = 0, links = [];
  d.evidence.forEach(function (e) {
    var w = works[e.workId];
    if (!w || (list ? list.indexOf(w.code) < 0 : (code !== 'ALL' && w.code !== code))) return;
    if (e.fileId) {
      try {
        var b = DriveApp.getFileById(e.fileId).getBlob();
        total += b.getBytes().length;
        if (total > 45 * 1024 * 1024) throw new Error('ไฟล์รวมเกิน 45MB กรุณาดาวน์โหลดทีละตัวชี้วัด');
        b.setName(w.code + '/' + safeName_(w.title).slice(0, 40) + '/' + safeName_(e.fileName));
        blobs.push(b);
      } catch (x) { if (/45MB/.test(x.message)) throw x; links.push('ไฟล์เปิดไม่ได้: ' + e.title); }
    } else links.push(w.code + ' | ' + w.title + ' | ' + e.type + ' | ' + e.title + ' | ' + e.url);
  });
  if (links.length) blobs.push(Utilities.newBlob(links.join('\r\n'), 'text/plain', 'ลิงก์หลักฐาน.txt'));
  if (!blobs.length) throw new Error('ไม่มีหลักฐานให้ดาวน์โหลด');
  var zip = Utilities.zip(blobs, 'หลักฐาน_' + period + '_' + (code === 'ALL' ? 'ทั้งหมด' : list ? 'ด้านที่เลือก' : code) + '_' + stamp_() + '.zip');
  return saveExport_(zip);
}

function saveExport_(blob) {
  var folder = subFolder_(ensureRootFolder_(), '_exports');
  var f = folder.createFile(blob);
  applySharing_(f);
  return { url: f.getUrl(), download: 'https://drive.google.com/uc?export=download&id=' + f.getId(), name: f.getName() };
}

function buildReportHtml_(period, g, standalone, o) {
  o = o || normOpts_(g, null);
  var d = getPeriodData_(period);
  var s = settingsMap_();
  var pr = readTable_(SHEETS.PERIODS).filter(function (p) { return String(p.id) === String(period); })[0] || { label: period };
  var gname = GROUPS.filter(function (x) { return x.key === g; })[0].name;
  var gs = d.analysis.groups[g];
  var P = o.parts, secs = o.sections;
  var evByWork = {};
  d.evidence.forEach(function (e) { (evByWork[e.workId] = evByWork[e.workId] || []).push(e); });
  var single = secs.length === 1 ? sectionOf_(secs[0]) : null;
  var no = 0, H = function (t) { no++; return '<h2>' + no + '. ' + t + '</h2>'; };

  var h = [];
  if (standalone) h.push('<html><head><meta charset="utf-8"><style>' + reportCss_() + '</style></head><body>');
  h.push('<div class="rpt">');
  h.push('<h1>รายงานผลการปฏิบัติราชการ ตำแหน่งวิชาการ' + (single ? '<br>ด้านที่ ' + single.sec + ' ' + esc_(single.name) : '') + '</h1>');
  h.push('<p class="sub">มหาวิทยาลัยราชภัฏยะลา · ' + esc_(pr.label) + (single ? '' : ' · ด้านที่รายงาน: ' + secs.join(', ')) + '</p>');
  h.push('<table class="meta"><tr><th>ผู้รับการประเมิน</th><td>' + esc_(s.OWNER_NAME || '—') + '</td><th>ตำแหน่ง</th><td>' + esc_(s.POSITION || '—') + '</td></tr>' +
    '<tr><th>สังกัด</th><td>' + esc_(s.FACULTY || '—') + '</td><th>ผู้ประเมิน</th><td>' + esc_(s.EVALUATOR || '—') + '</td></tr>' +
    '<tr><th>กลุ่มการประเมิน</th><td colspan="3">' + esc_(gname) + ' — ' + esc_(GROUP_DEFS[g]) + '</td></tr></table>');

  if (P.summary) {
    if (!single) {
      h.push(H('สรุปคะแนนเปรียบเทียบ 4 กลุ่ม (คะแนนที่ระบบประมวลผล)') + '<table><tr><th>กลุ่ม</th><th class="n">ผลสัมฤทธิ์ (70)</th><th class="n">พฤติกรรม (30)</th><th class="n">รวม (100)</th></tr>');
      GROUPS.forEach(function (x) {
        var t = d.analysis.groups[x.key], a = 0, b = 0;
        t.sections.forEach(function (r) { if (r.sec <= 6) a += r.score; else b += r.score; });
        h.push('<tr' + (x.key === g ? ' class="hl"' : '') + '><td>' + x.name + '</td><td class="n">' + fx_(a) + '</td><td class="n">' + fx_(b) + '</td><td class="n"><b>' + fx_(t.total) + '</b></td></tr>');
      });
      h.push('</table>');
    }
    h.push(H('คะแนนรายด้าน — ' + esc_(gname)) + '<table><tr><th>ด้าน</th><th class="n">น้ำหนัก</th><th class="n">คะแนน</th><th class="n">ร้อยละ</th><th>ที่มา</th></tr>');
    var sw = 0, ss2 = 0;
    gs.sections.forEach(function (r) {
      if (secs.indexOf(r.sec) < 0) return;
      sw += r.weight; ss2 += r.score;
      var basis = r.basis === 'assumed-max' ? 'ด้านรอง: ใช้ระดับสูงสุดในด้าน (' + fx_(r.level5) + '/5) *อนุมาน' : r.basis === 'evaluator' ? 'ผู้ประเมินยืนยัน' : 'รวมจากตัวชี้วัด';
      h.push('<tr><td>' + r.sec + '. ' + esc_(r.name) + '</td><td class="n">' + r.weight + '</td><td class="n">' + fx_(r.score) + '</td><td class="n">' + fx_(r.weight ? r.score / r.weight * 100 : 0) + '</td><td>' + basis + '</td></tr>');
    });
    h.push('<tr class="hl"><td><b>รวม' + (secs.length < gs.sections.length ? 'ด้านที่เลือก' : '') + '</b></td><td class="n">' + fx_(sw) + '</td><td class="n"><b>' + fx_(ss2) + '</b></td><td class="n">' + fx_(sw ? ss2 / sw * 100 : 0) + '</td><td>' + (secs.length < gs.sections.length ? 'คะแนนรวมทั้งกลุ่ม ' + fx_(gs.total) + '/100' : '') + '</td></tr></table>');
  }

  h.push(H('ผลการดำเนินงานรายตัวชี้วัด'));
  var absent = [];
  SECTIONS.forEach(function (sec) {
    if (secs.indexOf(sec.sec) < 0) return;
    var row = gs.sections.filter(function (r) { return r.sec === sec.sec; })[0];
    h.push('<h3>ด้านที่ ' + sec.sec + ' ' + esc_(sec.name) + ' — ' + fx_(row ? row.score : 0) + '/' + sec.w[g] + ' คะแนน</h3>');
    INDICATORS.filter(function (i) { return i.sec === sec.sec; }).forEach(function (ind) {
      var a = d.analysis.indicators[ind.code], dt = CRITERIA_DETAIL[ind.code] || {};
      var ws = d.works.filter(function (w) { return w.code === ind.code; });
      if (!ws.length) absent.push(ind.code + ' ' + ind.name);
      var lvTxt = a.level ? ('ระดับ ' + fx_(a.level) + '/' + a.maxLevel + (a.finalLevel != null ? ' (ผู้ประเมินยืนยัน)' : ' (ระบบแนะนำ)')) : 'ยังไม่มีระดับ';
      var wt = indicatorWeight_(ind, g);
      h.push('<div class="ind"><table class="ihd"><tr><td><b>' + ind.code + ' ' + esc_(ind.name) + '</b></td><td class="n" style="width:34%">' + lvTxt + (wt ? ' · ' + fx_(a.points[g]) + '/' + wt + ' คะแนน' : '') + '</td></tr></table>');
      if (P.criteria) {
        if (dt.desc) h.push('<p class="d"><b>คำอธิบาย:</b> ' + esc_(dt.desc) + '</p>');
        h.push(criteriaTableHtml_(ind, a));
      } else if (a.level && ind.mode !== 'add') h.push('<p class="d"><b>เกณฑ์ระดับที่ได้:</b> ' + esc_(levelLabel_(ind, Math.floor(a.level))) + '</p>');
      if (P.analysis && a.reasons.length) h.push('<p class="ok"><b>ผลการวิเคราะห์:</b> ' + a.reasons.map(esc_).join('<br>') + '</p>');
      if (P.works) {
        if (ws.length) {
          h.push('<table class="w"><tr><th style="width:38%">ผลงาน/กิจกรรม</th><th style="width:12%">วันที่</th><th>หลักฐาน</th></tr>');
          ws.forEach(function (w) {
            var ev = evByWork[w.id] || [];
            h.push('<tr><td>' + esc_(w.title) + (w.carried ? ' <i>(ยกมาจากรอบ ' + esc_(w.period) + ')</i>' : '') + (w.detail ? '<div class="d">' + esc_(String(w.detail).slice(0, 600)) + '</div>' : '') + '</td><td>' + esc_(w.workDate || '') + '</td><td>' +
              (ev.length ? ev.map(function (e) { return '• ' + esc_(e.type) + ': <a href="' + esc_(e.url) + '">' + esc_(e.title) + '</a>' + (e.docNo ? ' (เลขที่ ' + esc_(e.docNo) + ')' : '') + (e.docDate ? ' ลว. ' + esc_(e.docDate) : ''); }).join('<br>') : '<span class="bad">ไม่มีหลักฐาน</span>') + '</td></tr>');
          });
          h.push('</table>');
        } else h.push('<p class="bad">ยังไม่มีผลงานบันทึกในตัวชี้วัดนี้</p>');
      }
      if (P.analysis && a.gaps.length) h.push('<p class="gap"><b>สิ่งที่ต้องดำเนินการเพิ่ม:</b> ' + a.gaps.map(esc_).join(' / ') + '</p>');
      if (a.finalNote) h.push('<p class="d"><b>บันทึกผู้ประเมิน:</b> ' + esc_(a.finalNote) + '</p>');
      h.push('</div>');
    });
  });

  // หมายเหตุ (Faithfulness) — แสดงทุกครั้ง
  h.push('<h2>หมายเหตุ</h2><div class="note"><p><b>(1) ข้อมูลที่ไม่มี/ไม่ทราบจากแหล่งข้อมูล</b></p><ul>');
  if (absent.length) h.push('<li>ตัวชี้วัดที่ยังไม่มีผลงานบันทึกในระบบ (' + absent.length + ' รายการ): ' + absent.map(esc_).join('; ') + '</li>');
  var noEv = INDICATORS.filter(function (i) { return secs.indexOf(i.sec) >= 0 && d.analysis.indicators[i.code].status === 'noevidence'; }).map(function (i) { return i.code; });
  if (noEv.length) h.push('<li>ตัวชี้วัดที่มีผลงานแต่ไม่มีหลักฐานแนบ (ไม่นับคะแนน): ' + noEv.join(', ') + '</li>');
  ['OWNER_NAME', 'POSITION', 'FACULTY', 'EVALUATOR'].forEach(function (k) { if (!s[k]) h.push('<li>ยังไม่ได้ระบุ' + { OWNER_NAME: 'ชื่อผู้รับการประเมิน', POSITION: 'ตำแหน่ง', FACULTY: 'สังกัด', EVALUATOR: 'ผู้ประเมิน' }[k] + '</li>'); });
  if (secs.indexOf(6) >= 0) h.push('<li>ประกาศไม่ได้กำหนดคำอธิบายและเกณฑ์รายระดับของข้อ 6 (หน้า 27)</li>');
  h.push('<li>ระบบตรวจเฉพาะการมีอยู่ ประเภท และชื่อของหลักฐาน ไม่ได้ตรวจเนื้อหาภายในไฟล์</li></ul>');
  h.push('<p><b>(2) สิ่งที่ระบบอนุมาน/ตีความ</b></p><ul>' + SCORING_ASSUMPTIONS.map(function (x) { return '<li>' + esc_(x) + '</li>'; }).join('') +
    '<li>คะแนนในรายงานนี้เป็นคะแนนประมวลผลเพื่อเตรียมรับการประเมิน ไม่ใช่ผลการประเมินอย่างเป็นทางการ</li></ul></div>');
  h.push('<p class="foot">จัดทำโดยระบบ เมื่อ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + ' · อ้างอิงประกาศมหาวิทยาลัยราชภัฏยะลา ลงวันที่ 31 ตุลาคม 2568</p></div>');
  if (standalone) h.push('</body></html>');
  return h.join('');
}

/** ตารางเกณฑ์รายระดับ/องค์ประกอบ ไฮไลต์ระดับที่ได้ */
function criteriaTableHtml_(ind, a) {
  var dt = CRITERIA_DETAIL[ind.code] || {}, cur = Math.floor(a.level || 0), h = [];
  if (dt.comps) {
    h.push('<table class="c"><tr><th style="width:28%">องค์ประกอบ</th><th>แนวทางการประเมิน</th><th style="width:32%">เอกสารหลักฐาน</th></tr>');
    dt.comps.forEach(function (c, k) { h.push('<tr><td>' + (k + 1) + '. ' + esc_(c[0]) + '</td><td>' + esc_(c[1]) + '</td><td>' + esc_(c[2]) + '</td></tr>'); });
    h.push('</table>');
  }
  if (ind.mode === 'add') {
    h.push('<table class="c"><tr><th>ข้อ</th><th>เกณฑ์</th><th class="n">คะแนน</th></tr>');
    ind.items.forEach(function (t, k) { h.push('<tr><td>' + (k + 1) + '</td><td>' + esc_(t) + '</td><td class="n">' + ind.itemPts[k] + '</td></tr>'); });
    return h.join('') + '</table>';
  }
  if (ind.items && !dt.comps) {
    h.push('<table class="c"><tr><th style="width:12%">ข้อ</th><th>รายการที่ใช้นับ</th></tr>');
    ind.items.forEach(function (t, k) { h.push('<tr><td>' + (k + 1) + '</td><td>' + esc_(t) + '</td></tr>'); });
    h.push('</table>');
  }
  h.push('<table class="c"><tr><th style="width:12%">ระดับ</th><th>เกณฑ์การให้คะแนน</th></tr>');
  ind.lv.forEach(function (t, k) {
    var txt = ind.opts ? ind.opts.filter(function (o) { return o.lv === k + 1; }).map(function (o) { return esc_(o.t); }).join('<br>') : esc_(t);
    var bl = dt.bullets && dt.bullets[k] ? '<br>' + dt.bullets[k].map(function (b) { return '– ' + esc_(b); }).join('<br>') : '';
    h.push('<tr' + (cur === k + 1 ? ' class="hl"' : '') + '><td>' + (k + 1) + (ind.pts ? ' (' + ind.pts[k] + ' คะแนน)' : '') + (cur === k + 1 ? ' ✔' : '') + '</td><td>' + txt + bl + '</td></tr>');
  });
  return h.join('') + '</table>';
}

function reportCss_() {
  return 'body{font-family:"Sarabun","TH Sarabun New",Tahoma,sans-serif;font-size:12px;color:#1b2430}' +
    '.rpt h1{font-size:18px;margin:0}.rpt .sub{color:#555;margin:2px 0 10px}.rpt h2{font-size:14px;border-bottom:2px solid #1f3a5f;padding-bottom:3px;margin-top:18px}' +
    '.rpt h3{font-size:13px;color:#1f3a5f;margin:14px 0 6px}.rpt table{border-collapse:collapse;width:100%;margin:6px 0}' +
    '.rpt th,.rpt td{border:1px solid #c9d1db;padding:4px 6px;vertical-align:top;text-align:left}.rpt th{background:#eef2f7}' +
    '.rpt .n{text-align:right}.rpt .hl td{background:#fff7e0}.rpt .ind{border:1px solid #dde3ea;border-radius:6px;padding:6px 8px;margin:6px 0;page-break-inside:avoid}' +
    '.rpt table.ihd td{border:0;padding:0 0 4px;color:#1f3a5f}.rpt table.c{font-size:11px}' +
    '.rpt .ok{color:#1d6b3a;margin:4px 0}.rpt .gap{color:#9a5b00;margin:4px 0}.rpt .bad{color:#b42318}.rpt .d{color:#555;font-size:11px;margin-top:2px}' +
    '.rpt .note{background:#f6f8fb;border:1px solid #dde3ea;padding:6px 10px;border-radius:6px}.rpt .foot{color:#777;font-size:10px;margin-top:14px}';
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
function fx_(n) { return (Math.round((Number(n) || 0) * 100) / 100).toString(); }
function csvCell_(v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function safeName_(s) { return String(s || 'file').replace(/[\\/:*?"<>|]/g, '_'); }
function stamp_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmm'); }



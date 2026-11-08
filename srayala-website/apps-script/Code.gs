/**
 * ============================================================
 *  SRA YALA Website — Google Apps Script Web App
 *  ส่งเสริมพฤติกรรมการออมสู่เป้าหมายแห่งศรัทธา
 *  มหาวิทยาลัยราชภัฏยะลา
 * ------------------------------------------------------------
 *  ไฟล์นี้: การตั้งค่า, โครงสร้างฐานข้อมูล, doGet, setup,
 *           ตัวช่วยฐานข้อมูล (Google Sheets), การยืนยันตัวตน, แคช
 * ============================================================
 */

/** รหัสผ่านเริ่มต้นของผู้ดูแล (ใช้ครั้งแรกตอนรัน setup เท่านั้น) — เปลี่ยนก่อนรัน setup ได้ */
var INITIAL_ADMIN_USERNAME = 'admin';
var INITIAL_ADMIN_PASSWORD = 'SraYala@2569';

/**
 * Google Sheet ที่ใช้เป็นฐานข้อมูลของเว็บไซต์ ("เว็บไซต์แก้จนใหม่")
 * https://docs.google.com/spreadsheets/d/1ErALIfMAEDylurDx6a4QRyDurIJ0jrpqzfF2SC68Ojo/edit
 * ถ้าต้องการเปลี่ยนไปใช้ชีตอื่น ให้แก้ ID ด้านล่าง แล้วรัน setup ใหม่ (หรือเว้นว่างเพื่อให้ระบบสร้างชีตใหม่)
 */
var DB_SPREADSHEET_ID = '1ErALIfMAEDylurDx6a4QRyDurIJ0jrpqzfF2SC68Ojo';

/** ชื่อไฟล์/โฟลเดอร์ที่ระบบจะสร้างใน Google Drive */
var APP_NAME = 'SRA YALA Website';

/** ขนาดไฟล์สูงสุดต่อการอัปโหลดหนึ่งครั้ง (ไบต์) */
var MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** อายุ session ผู้ดูแล (วินาที) สูงสุด 21600 = 6 ชั่วโมง */
var SESSION_TTL = 21600;

/** อายุแคชข้อมูลหน้าเว็บสาธารณะ (วินาที) */
var PUBLIC_CACHE_TTL = 600;

/**
 * โครงสร้างตาราง (ชีต) ทั้งหมด — คอลัมน์แรกคือคีย์หลักเสมอ
 */
var SCHEMA = {
  Settings:   ['key', 'value'],
  Pages:      ['id', 'title', 'subtitle', 'content', 'imageUrl', 'updatedAt'],
  Groups:     ['id', 'name', 'shortName', 'location', 'members', 'memberProfile', 'summary', 'strengths', 'limitations', 'products', 'income', 'channels', 'detail', 'coverUrl', 'icon', 'order', 'published', 'updatedAt'],
  News:       ['id', 'title', 'subtitle', 'category', 'date', 'coverUrl', 'images', 'content', 'linkUrl', 'linkLabel', 'featured', 'published', 'order', 'createdAt', 'updatedAt'],
  Gallery:    ['id', 'section', 'url', 'fileId', 'caption', 'order', 'published', 'createdAt'],
  Documents:  ['id', 'kind', 'title', 'category', 'page', 'description', 'icon', 'url', 'fileId', 'fileName', 'mimeType', 'size', 'coverUrl', 'downloads', 'published', 'order', 'createdAt', 'updatedAt'],
  Reports:    ['id', 'title', 'fiscalYear', 'phase', 'activityDate', 'groupId', 'location', 'objective', 'target', 'result', 'participants', 'budget', 'spent', 'progress', 'status', 'content', 'coverUrl', 'images', 'fileId', 'fileName', 'fileUrl', 'mimeType', 'size', 'published', 'order', 'createdAt', 'updatedAt'],
  KPIs:       ['id', 'fiscalYear', 'name', 'unit', 'target', 'result', 'note', 'order', 'published'],
  Albums:     ['id', 'title', 'description', 'date', 'coverUrl', 'order', 'published', 'createdAt'],
  Links:      ['id', 'section', 'label', 'url', 'description', 'icon', 'style', 'order', 'published'],
  Indicators: ['id', 'section', 'label', 'value', 'unit', 'note', 'order', 'published'],
  Steps:      ['id', 'title', 'description', 'imageUrl', 'order', 'published'],
  Media:      ['id', 'fileId', 'name', 'mimeType', 'size', 'url', 'viewUrl', 'downloadUrl', 'folder', 'uploadedBy', 'createdAt'],
  Messages:   ['id', 'name', 'email', 'phone', 'subject', 'message', 'status', 'createdAt'],
  Users:      ['id', 'username', 'name', 'role', 'passwordHash', 'salt', 'active', 'lastLogin', 'createdAt'],
  Logs:       ['id', 'time', 'user', 'action', 'detail'],
  /* ---------- ระบบสมาชิกกองทุนออมทรัพย์และบัญชีฮัจย์-อุมเราะห์ ---------- */
  Members:      ['id', 'memberNo', 'name', 'phone', 'groupId', 'address', 'joinDate', 'savingsGoal', 'hajjGoal', 'umrahGoal', 'note', 'passwordHash', 'salt', 'mustChangePw', 'active', 'lastLogin', 'createdAt', 'updatedAt'],
  Transactions: ['id', 'memberId', 'date', 'account', 'type', 'amount', 'note', 'slipFileId', 'slipUrl', 'status', 'recordedBy', 'createdAt', 'updatedAt'],
  /* ---------- แบบฟอร์มออนไลน์ (บันทึกลง Google Sheet) ---------- */
  Forms:        ['id', 'title', 'description', 'icon', 'audience', 'fields', 'status', 'successMessage', 'order', 'published', 'createdAt', 'updatedAt'],
  FormResponses:['id', 'formId', 'memberId', 'memberName', 'data', 'status', 'createdAt']
};

/** ตารางที่หลังบ้านแก้ไขได้ผ่าน API กลาง (adminSave/adminDelete) */
var EDITABLE_TABLES = ['Pages', 'Groups', 'News', 'Gallery', 'Documents', 'Reports', 'KPIs', 'Albums', 'Links', 'Indicators', 'Steps', 'Messages', 'Forms', 'FormResponses'];

/** ตารางที่เฉพาะ role = admin จัดการได้ */
var ADMIN_ONLY_TABLES = ['Users', 'Logs'];

/* ============================================================
 *  WEB APP ENTRY
 * ============================================================ */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var props = PropertiesService.getScriptProperties();
  var baseUrl = '';
  try { baseUrl = ScriptApp.getService().getUrl(); } catch (err) { baseUrl = ''; }
  // เปิดจากแอปมือถือ (PWA) — แอปจะส่ง ?app=1 มาเสมอ
  APP_MODE_ = params.app === '1';
  APP_INFO_ = { base: baseUrl, mode: params.mode || 'site' };

  // ติดตั้งอัตโนมัติเมื่อเปิดเว็บครั้งแรก (ถ้ายังไม่เคยรัน setup)
  if (!props.getProperty('SETUP_DONE')) {
    try {
      var lock = LockService.getScriptLock();
      lock.waitLock(60000);
      try {
        if (!props.getProperty('SETUP_DONE')) setup();
      } finally {
        lock.releaseLock();
      }
    } catch (err) {
      return setupErrorPage_(err);
    }
  }

  var settings = getSettings_();
  var siteName = settings.siteName || 'SRA YALA';
  var tpl;

  if (params.mode === 'member') {
    tpl = HtmlService.createTemplateFromFile('Member');
    tpl.baseUrl = baseUrl;
    tpl.siteName = siteName;
    tpl.memberConfig = safeJson_(memberPublicConfig_(settings));
    return finalize_(tpl.evaluate(), 'เข้าสู่ระบบสมาชิก — ' + (settings.fundName || 'กองทุนออมทรัพย์และบัญชีฮัจย์-อุมเราะห์'), settings);
  }

  if (params.mode === 'admin') {
    tpl = HtmlService.createTemplateFromFile('Admin');
    tpl.baseUrl = baseUrl;
    tpl.siteName = siteName;
    return finalize_(tpl.evaluate(), siteName + ' — ระบบจัดการเว็บไซต์', settings);
  }

  tpl = HtmlService.createTemplateFromFile('Index');
  var data = getPublicData_();
  data.baseUrl = baseUrl;
  data.initialRoute = { page: params.page || 'home', id: params.id || '' };
  tpl.bootstrap = safeJson_(data);
  return finalize_(tpl.evaluate(), siteName + (settings.tagline ? ' — ' + settings.tagline : ''), settings);
}

/** true เมื่อหน้าเว็บถูกเปิดจากแอปมือถือ (PWA) */
var APP_MODE_ = false;
var APP_INFO_ = { base: '', mode: 'site' };

/**
 * สคริปต์เชื่อมกับแอปมือถือ: เมื่ออยู่ในแอป ลิงก์ที่จะสลับหน้า (หน้าเว็บ / ระบบสมาชิก / หลังบ้าน)
 * จะถูกส่งให้แอปเปิดแทน เพื่อไม่ให้หลุดออกจากแอปไปเปิดในเบราว์เซอร์
 */
function appBridgeHtml_(base, mode) {
  return '<script>(function(){var B=' + JSON.stringify(String(base || '')) + ',M=' + JSON.stringify(String(mode || 'site')) + ';' +
    'function post(o){try{window.top.postMessage(o,"*");}catch(e){}}' +
    'document.addEventListener("click",function(e){if(e.defaultPrevented)return;var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;' +
    'var h=a.getAttribute("href")||"",t=(a.getAttribute("target")||"").toLowerCase();if(t==="_blank"||!B||h.indexOf(B)!==0)return;' +
    'e.preventDefault();post({sra:"nav",url:h});});' +
    'post({sra:"page",mode:M,title:document.title});})();<\/script>';
}

function finalize_(output, title, settings) {
  if (APP_MODE_) { try { output.append(appBridgeHtml_(APP_INFO_.base, APP_INFO_.mode)); } catch (err) { } }
  output.setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  if (settings && settings.faviconUrl) {
    try { output.setFaviconUrl(settings.faviconUrl); } catch (err) { /* ต้องเป็น .png สาธารณะ */ }
  }
  return output;
}

/** หน้าแจ้งปัญหาการติดตั้ง พร้อมสาเหตุจริงและวิธีแก้ */
function setupErrorPage_(err) {
  var msg = String((err && err.message) || err);
  var hint = 'กรุณาเปิดโปรแกรมแก้ไข Apps Script เลือกฟังก์ชัน <b>setup</b> แล้วกด <b>▶ เรียกใช้ (Run)</b> และกดอนุญาตสิทธิ์ให้ครบ จากนั้นรีเฟรชหน้านี้';
  if (/permission|สิทธิ์|access|not have/i.test(msg)) {
    hint = 'บัญชีที่ใช้ Deploy ไม่มีสิทธิ์แก้ไข Google Sheet ฐานข้อมูล หรือยังไม่ได้อนุญาตสิทธิ์ของสคริปต์ — ' +
      'ให้เจ้าของ Sheet เป็นผู้ Deploy หรือแชร์ Sheet ให้บัญชีนี้แก้ไขได้ แล้วรันฟังก์ชัน <b>setup</b> ในโปรแกรมแก้ไขหนึ่งครั้ง';
  }
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Sarabun,sans-serif;padding:40px 20px;max-width:680px;margin:auto;line-height:1.7">' +
    '<h2>ยังติดตั้งระบบไม่สำเร็จ</h2><p>' + hint + '</p>' +
    '<p style="background:#fbeee9;border-radius:10px;padding:12px 16px;color:#8a2c20;font-size:14px"><b>ข้อความจากระบบ:</b> ' +
    msg.replace(/[<>&]/g, '') + '</p></div>').setTitle('SRA YALA — ติดตั้งระบบ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** ใช้ใน HTML template: <?!= include('Theme') ?> */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function safeJson_(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(new RegExp('\\u2028', 'g'), '\\u2028')
    .replace(new RegExp('\\u2029', 'g'), '\\u2029');
}

/* ============================================================
 *  SETUP — รันครั้งเดียวจากโปรแกรมแก้ไข Apps Script
 * ============================================================ */

/**
 * สร้าง Google Sheet ฐานข้อมูล + โฟลเดอร์ Drive + ใส่ข้อมูลเริ่มต้นจากเว็บเดิม
 * รันซ้ำได้อย่างปลอดภัย: จะไม่สร้างซ้ำถ้ามีอยู่แล้ว
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss;
  var dbId = props.getProperty('DB_ID') || DB_SPREADSHEET_ID;
  if (!dbId) {
    // สคริปต์ที่ผูกกับชีต (ส่วนขยาย › Apps Script) ใช้ชีตนั้นเลย
    try { var active = SpreadsheetApp.getActiveSpreadsheet(); if (active) dbId = active.getId(); } catch (err) { }
  }
  if (dbId) {
    ss = SpreadsheetApp.openById(dbId);
  } else {
    ss = SpreadsheetApp.create(APP_NAME + ' — Database');
  }
  props.setProperty('DB_ID', ss.getId());

  // โฟลเดอร์เก็บไฟล์
  var rootId = props.getProperty('ROOT_FOLDER_ID');
  var root;
  if (rootId) {
    root = DriveApp.getFolderById(rootId);
  } else {
    root = DriveApp.createFolder(APP_NAME + ' — Uploads');
    props.setProperty('ROOT_FOLDER_ID', root.getId());
  }
  ['Images', 'Documents', 'Files', 'Slips'].forEach(function (name) {
    var key = 'FOLDER_' + name.toUpperCase();
    if (!props.getProperty(key)) {
      props.setProperty(key, root.createFolder(name).getId());
    }
  });

  // สร้างชีตตาม SCHEMA
  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(ss, name); });
  ['Sheet1', 'ชีต1', 'แผ่นงาน1'].forEach(function (n) {
    var def = ss.getSheetByName(n);
    // ลบชีตว่างเริ่มต้นเท่านั้น (ไม่ลบถ้ามีข้อมูล)
    if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  });

  // ข้อมูลเริ่มต้น (ใส่เฉพาะตารางที่ยังว่าง)
  seedData_(ss);
  seedForms_();

  // ผู้ดูแลเริ่มต้น
  if (readTable_('Users').length === 0) {
    var salt = Utilities.getUuid();
    insertRow_('Users', {
      id: newId_(), username: INITIAL_ADMIN_USERNAME, name: 'ผู้ดูแลระบบ', role: 'admin',
      passwordHash: hashPassword_(INITIAL_ADMIN_PASSWORD, salt), salt: salt,
      active: 'TRUE', lastLogin: '', createdAt: nowIso_()
    });
  }

  clearPublicCache_();
  props.setProperty('SETUP_DONE', nowIso_());
  Logger.log('ติดตั้งเสร็จ');
  Logger.log('ฐานข้อมูล: ' + ss.getUrl());
  Logger.log('โฟลเดอร์ไฟล์: ' + root.getUrl());
  Logger.log('ผู้ใช้เริ่มต้น: ' + INITIAL_ADMIN_USERNAME + ' / ' + INITIAL_ADMIN_PASSWORD + ' (กรุณาเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ)');
  return { dbUrl: ss.getUrl(), folderUrl: root.getUrl() };
}

/** รีเซ็ตรหัสผ่านผู้ใช้ admin กลับเป็นค่าเริ่มต้น (ใช้กรณีลืมรหัสผ่าน — รันจากโปรแกรมแก้ไข) */
function resetAdminPassword() {
  var users = readTable_('Users');
  var u = users.filter(function (x) { return x.username === INITIAL_ADMIN_USERNAME; })[0];
  var salt = Utilities.getUuid();
  if (u) {
    u.salt = salt; u.passwordHash = hashPassword_(INITIAL_ADMIN_PASSWORD, salt); u.active = 'TRUE';
    updateRow_('Users', u);
  } else {
    insertRow_('Users', {
      id: newId_(), username: INITIAL_ADMIN_USERNAME, name: 'ผู้ดูแลระบบ', role: 'admin',
      passwordHash: hashPassword_(INITIAL_ADMIN_PASSWORD, salt), salt: salt, active: 'TRUE', lastLogin: '', createdAt: nowIso_()
    });
  }
  Logger.log('รีเซ็ตรหัสผ่านแล้ว: ' + INITIAL_ADMIN_USERNAME + ' / ' + INITIAL_ADMIN_PASSWORD);
}

function ensureSheet_(ss, name) {
  var headers = SCHEMA[name];
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  var lastCol = sh.getLastColumn();
  if (sh.getLastRow() === 0 || lastCol === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // เติมคอลัมน์ที่ขาด (รองรับการอัปเกรดเวอร์ชัน)
    var existing = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var missing = headers.filter(function (h) { return existing.indexOf(h) === -1; });
    if (missing.length) {
      sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, Math.max(headers.length, sh.getLastColumn())).setFontWeight('bold').setBackground('#e8f1ee');
  // เก็บทุกค่าเป็นข้อความ เพื่อกัน Sheets แปลงเบอร์โทร/วันที่เอง
  sh.getRange(1, 1, sh.getMaxRows(), Math.max(headers.length, sh.getLastColumn())).setNumberFormat('@');
  return sh;
}

/* ============================================================
 *  DATABASE HELPERS (Google Sheets)
 * ============================================================ */

var _ssCache = null;
function db_() {
  if (_ssCache) return _ssCache;
  var id = PropertiesService.getScriptProperties().getProperty('DB_ID') || DB_SPREADSHEET_ID;
  if (!id) throw new Error('ยังไม่ได้ติดตั้งระบบ (รัน setup ก่อน)');
  _ssCache = SpreadsheetApp.openById(id);
  return _ssCache;
}

function sheet_(name) {
  if (!SCHEMA[name]) throw new Error('ไม่รู้จักตาราง: ' + name);
  var sh = db_().getSheetByName(name);
  if (!sh) sh = ensureSheet_(db_(), name);
  return sh;
}

function headers_(sh) {
  var lastCol = sh.getLastColumn();
  if (lastCol === 0) return [];
  return sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

/** อ่านตารางทั้งหมดเป็น array ของ object */
function readTable_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0].map(String);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.join('') === '') continue;
    var o = {};
    for (var c = 0; c < head.length; c++) {
      if (!head[c]) continue;
      var v = row[c];
      if (v instanceof Date) v = v.toISOString();
      o[head[c]] = v === null || v === undefined ? '' : String(v);
    }
    out.push(o);
  }
  return out;
}

function findRowIndex_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function rowFromObj_(head, obj) {
  return head.map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

function insertRow_(name, obj) {
  var sh = sheet_(name);
  var head = headers_(sh);
  var row = rowFromObj_(head, obj);
  var target = sh.getLastRow() + 1;
  if (target > sh.getMaxRows()) {
    sh.insertRowsAfter(sh.getMaxRows(), 500); // ขยายชีตเมื่อแถวเต็ม
  }
  sh.getRange(target, 1, 1, head.length).setNumberFormat('@').setValues([row]);
  return obj;
}

function updateRow_(name, obj) {
  var sh = sheet_(name);
  var head = headers_(sh);
  var idx = findRowIndex_(sh, obj[head[0]]);
  if (idx === -1) return insertRow_(name, obj);
  var current = sh.getRange(idx, 1, 1, head.length).getValues()[0];
  var merged = {};
  head.forEach(function (h, i) { merged[h] = current[i]; });
  Object.keys(obj).forEach(function (k) { if (head.indexOf(k) !== -1) merged[k] = obj[k]; });
  sh.getRange(idx, 1, 1, head.length).setNumberFormat('@').setValues([rowFromObj_(head, merged)]);
  var out = {};
  head.forEach(function (h) { out[h] = merged[h] === undefined || merged[h] === null ? '' : String(merged[h]); });
  return out;
}

function deleteRow_(name, id) {
  var sh = sheet_(name);
  var idx = findRowIndex_(sh, id);
  if (idx === -1) return false;
  sh.deleteRow(idx);
  return true;
}

function getRow_(name, id) {
  var rows = readTable_(name);
  for (var i = 0; i < rows.length; i++) if (String(rows[i][SCHEMA[name][0]]) === String(id)) return rows[i];
  return null;
}

function getSettings_() {
  var out = {};
  readTable_('Settings').forEach(function (r) { out[r.key] = r.value; });
  return out;
}

function setSetting_(key, value) {
  updateRow_('Settings', { key: key, value: value == null ? '' : String(value) });
}

/* ============================================================
 *  AUTH
 * ============================================================ */

function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '::' + password, Utilities.Charset.UTF_8);
  return raw.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

/** ตรวจ token และคืนข้อมูลผู้ใช้ — โยน error ถ้าไม่ผ่าน */
function requireAuth_(token, needAdmin) {
  if (!token) throw new Error('AUTH: กรุณาเข้าสู่ระบบ');
  var cache = CacheService.getScriptCache();
  var raw = cache.get('sess_' + token);
  if (!raw) throw new Error('AUTH: หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่');
  var user = JSON.parse(raw);
  cache.put('sess_' + token, raw, SESSION_TTL); // ต่ออายุ
  if (needAdmin && user.role !== 'admin') throw new Error('ต้องเป็นผู้ดูแลระบบ (admin) เท่านั้น');
  return user;
}

function logAction_(user, action, detail) {
  try {
    insertRow_('Logs', { id: newId_(), time: nowIso_(), user: user ? user.username : '-', action: action, detail: String(detail || '').substr(0, 300) });
    var sh = sheet_('Logs');
    if (sh.getLastRow() > 3000) sh.deleteRows(2, 1000); // เก็บประวัติล่าสุดไม่เกิน ~3,000 รายการ
  } catch (err) { /* ไม่ให้ log ทำให้ระบบล้ม */ }
}

/* ============================================================
 *  CACHE (แบ่งเป็นชิ้น เพราะ CacheService จำกัด 100KB/คีย์)
 * ============================================================ */

function cachePutBig_(key, str, ttl) {
  var cache = CacheService.getScriptCache();
  var size = 90000;
  var n = Math.ceil(str.length / size);
  var map = {};
  for (var i = 0; i < n; i++) map[key + '_' + i] = str.substr(i * size, size);
  map[key + '_n'] = String(n);
  try { cache.putAll(map, ttl); } catch (err) { /* ข้อมูลใหญ่เกิน — ข้ามแคช */ }
}

function cacheGetBig_(key) {
  var cache = CacheService.getScriptCache();
  var n = cache.get(key + '_n');
  if (!n) return null;
  var keys = [];
  for (var i = 0; i < Number(n); i++) keys.push(key + '_' + i);
  var got = cache.getAll(keys);
  var out = '';
  for (var j = 0; j < keys.length; j++) {
    if (got[keys[j]] === undefined || got[keys[j]] === null) return null;
    out += got[keys[j]];
  }
  return out;
}

function clearPublicCache_() {
  // เปลี่ยนเวอร์ชันแคช แทนการลบทุกชิ้น
  PropertiesService.getScriptProperties().setProperty('CACHE_VER', String(new Date().getTime()));
}

function publicCacheKey_() {
  return 'pub_' + (PropertiesService.getScriptProperties().getProperty('CACHE_VER') || '0');
}

/* ============================================================
 *  UTILITIES
 * ============================================================ */

function newId_() {
  return Utilities.getUuid().replace(/-/g, '').substr(0, 12);
}

function nowIso_() {
  return new Date().toISOString();
}

function isTrue_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE' || v === '1' || v === 1;
}

function byOrder_(a, b) {
  var oa = Number(a.order || 0), ob = Number(b.order || 0);
  if (oa !== ob) return oa - ob;
  return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
}

/** URL สำหรับแสดงรูปจาก Google Drive (ไฟล์ต้องแชร์แบบ "ทุกคนที่มีลิงก์") */
function driveImageUrl_(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1920';
}

function driveViewUrl_(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/view';
}

function driveDownloadUrl_(fileId) {
  return 'https://drive.google.com/uc?export=download&id=' + fileId;
}

/** ลบแท็กอันตรายออกจาก HTML ที่บันทึกจากหลังบ้าน */
function sanitizeHtml_(html) {
  if (!html) return '';
  return String(html)
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

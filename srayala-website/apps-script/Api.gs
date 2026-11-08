/**
 * ============================================================
 *  API — ฟังก์ชันที่หน้าเว็บเรียกผ่าน google.script.run
 *  (ฟังก์ชันที่ลงท้ายด้วย _ จะเรียกจากหน้าเว็บไม่ได้)
 * ============================================================
 */

/* ------------------------------------------------------------
 *  PUBLIC API — หน้าเว็บสาธารณะ
 * ------------------------------------------------------------ */

/** รวมข้อมูลทั้งหมดที่หน้าเว็บสาธารณะต้องใช้ (มีแคช) */
function getPublicData_() {
  var key = publicCacheKey_();
  var cached = cacheGetBig_(key);
  if (cached) {
    var c = JSON.parse(cached);
    c.stats = publicStats_();
    return c;
  }

  var settings = getSettings_();
  delete settings.notifyEmail;

  var pages = {};
  readTable_('Pages').forEach(function (p) { pages[p.id] = p; });

  var pub = function (r) { return r.published === '' || isTrue_(r.published); };

  var groups = readTable_('Groups').filter(pub).sort(byOrder_);

  var news = readTable_('News').filter(pub).map(function (n) {
    try { n.images = n.images ? JSON.parse(n.images) : []; } catch (err) { n.images = []; }
    return n;
  }).sort(function (a, b) {
    var da = String(a.date || a.createdAt || '').substr(0, 10), dbb = String(b.date || b.createdAt || '').substr(0, 10);
    if (da !== dbb) return dbb.localeCompare(da); // วันที่ใหม่สุดก่อน
    var ca = String(a.createdAt || ''), cb = String(b.createdAt || '');
    if (ca !== cb) return cb.localeCompare(ca);
    return Number(a.order || 0) - Number(b.order || 0);
  });

  var gallery = groupBy_(readTable_('Gallery').filter(pub).sort(byOrder_), 'section');
  var documents = readTable_('Documents').filter(pub).sort(byOrder_).map(function (d) { if (!d.kind) d.kind = 'document'; return d; });
  var parseImgs = function (r) { try { r.images = r.images ? JSON.parse(r.images) : []; } catch (err) { r.images = []; } return r; };
  var reports = readTable_('Reports').filter(pub).map(parseImgs).sort(function (a, b) {
    var ya = String(a.fiscalYear || ''), yb = String(b.fiscalYear || '');
    if (ya !== yb) return yb.localeCompare(ya);
    var da = String(a.activityDate || ''), dbb = String(b.activityDate || '');
    if (da !== dbb) return dbb.localeCompare(da);
    return byOrder_(a, b);
  });
  var kpis = readTable_('KPIs').filter(pub).sort(byOrder_);
  var albums = readTable_('Albums').filter(pub).sort(function (a, b) {
    var da = String(a.date || a.createdAt || ''), dbb = String(b.date || b.createdAt || '');
    if (da !== dbb) return dbb.localeCompare(da);
    return byOrder_(a, b);
  });
  var links = groupBy_(readTable_('Links').filter(pub).sort(byOrder_), 'section');
  var indicators = groupBy_(readTable_('Indicators').filter(pub).sort(byOrder_), 'section');
  var steps = readTable_('Steps').filter(pub).sort(byOrder_);

  var data = {
    settings: settings, pages: pages, groups: groups, news: news, gallery: gallery,
    documents: documents, reports: reports, kpis: kpis, albums: albums, links: links, indicators: indicators, steps: steps,
    forms: publicForms_(), accounts: accountLabels_(settings),
    generatedAt: nowIso_()
  };
  cachePutBig_(key, JSON.stringify(data), PUBLIC_CACHE_TTL);
  data.stats = publicStats_();
  return data;
}

/** เรียกจากหน้าเว็บเพื่อโหลดข้อมูลล่าสุด */
function getPublicData() {
  return getPublicData_();
}

function publicStats_() {
  var p = PropertiesService.getScriptProperties();
  return { visits: Number(p.getProperty('VISITS') || 0) };
}

function groupBy_(rows, field) {
  var out = {};
  rows.forEach(function (r) {
    var k = r[field] || 'other';
    (out[k] = out[k] || []).push(r);
  });
  return out;
}

/** นับผู้เข้าชม (เรียกครั้งเดียวต่อการเปิดเว็บ) */
function logVisit() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return publicStats_();
  try {
    var p = PropertiesService.getScriptProperties();
    var n = Number(p.getProperty('VISITS') || 0) + 1;
    p.setProperty('VISITS', String(n));
    var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    var dk = 'VISITS_' + today;
    p.setProperty(dk, String(Number(p.getProperty(dk) || 0) + 1));
    return { visits: n };
  } finally {
    lock.releaseLock();
  }
}

/** นับจำนวนดาวน์โหลดเอกสาร */
function logDownload(id) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return false;
  try {
    var d = getRow_('Documents', id);
    if (!d) return false;
    updateRow_('Documents', { id: id, downloads: String(Number(d.downloads || 0) + 1) });
    return true;
  } finally {
    lock.releaseLock();
  }
}

/** รับข้อความจากแบบฟอร์มติดต่อ */
function submitMessage(payload) {
  payload = payload || {};
  if (payload.website) return { ok: true }; // honeypot กันบอท
  var name = String(payload.name || '').trim().substr(0, 120);
  var message = String(payload.message || '').trim().substr(0, 4000);
  if (!name || !message) throw new Error('กรุณากรอกชื่อและข้อความ');

  var cache = CacheService.getScriptCache();
  var count = Number(cache.get('msg_rate') || 0);
  if (count > 30) throw new Error('มีการส่งข้อความจำนวนมาก กรุณาลองใหม่ภายหลัง');
  cache.put('msg_rate', String(count + 1), 600);

  var rec = {
    id: newId_(), name: name,
    email: String(payload.email || '').trim().substr(0, 160),
    phone: String(payload.phone || '').trim().substr(0, 40),
    subject: String(payload.subject || '').trim().substr(0, 200),
    message: message, status: 'new', createdAt: nowIso_()
  };
  insertRow_('Messages', rec);

  var to = getSettings_().notifyEmail;
  if (to) {
    try {
      MailApp.sendEmail({
        to: to,
        subject: '[SRA YALA] ข้อความใหม่จากเว็บไซต์: ' + (rec.subject || rec.name),
        body: 'ชื่อ: ' + rec.name + '\nอีเมล: ' + rec.email + '\nโทร: ' + rec.phone + '\nเรื่อง: ' + rec.subject + '\n\n' + rec.message
      });
    } catch (err) { /* ส่งอีเมลไม่สำเร็จ ไม่กระทบการบันทึก */ }
  }
  return { ok: true };
}

/* ------------------------------------------------------------
 *  AUTH API
 * ------------------------------------------------------------ */

function login(username, password) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('login_fail') || 0);
  if (fails >= 10) throw new Error('เข้าสู่ระบบผิดหลายครั้ง กรุณารอ 10 นาทีแล้วลองใหม่');

  username = String(username || '').trim().toLowerCase();
  var user = readTable_('Users').filter(function (u) {
    return String(u.username).toLowerCase() === username && isTrue_(u.active);
  })[0];

  if (!user || hashPassword_(String(password || ''), user.salt) !== user.passwordHash) {
    cache.put('login_fail', String(fails + 1), 600);
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  var sess = { id: user.id, username: user.username, name: user.name, role: user.role };
  cache.put('sess_' + token, JSON.stringify(sess), SESSION_TTL);
  updateRow_('Users', { id: user.id, lastLogin: nowIso_() });
  logAction_(sess, 'login', '');
  return { token: token, user: sess };
}

function logout(token) {
  try { CacheService.getScriptCache().remove('sess_' + token); } catch (err) { }
  return true;
}

function me(token) {
  return requireAuth_(token);
}

function changePassword(token, oldPassword, newPassword) {
  var sess = requireAuth_(token);
  var user = getRow_('Users', sess.id);
  if (!user || hashPassword_(String(oldPassword || ''), user.salt) !== user.passwordHash) {
    throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  }
  validatePassword_(newPassword);
  var salt = Utilities.getUuid();
  updateRow_('Users', { id: user.id, salt: salt, passwordHash: hashPassword_(String(newPassword), salt) });
  logAction_(sess, 'change-password', '');
  return true;
}

function validatePassword_(pw) {
  pw = String(pw || '');
  if (pw.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
}

/* ------------------------------------------------------------
 *  ADMIN API — ข้อมูล
 * ------------------------------------------------------------ */

/** โหลดข้อมูลทั้งหมดสำหรับหลังบ้าน */
function adminGetAll(token) {
  var user = requireAuth_(token);
  var out = { user: user, settings: getSettings_(), tables: {} };
  EDITABLE_TABLES.concat(['Media']).forEach(function (t) {
    out.tables[t] = readTable_(t);
  });
  out.tables.Members = readTable_('Members').map(stripMember_);
  out.tables.Transactions = readTable_('Transactions');
  out.accounts = accountLabels_(out.settings);
  if (user.role === 'admin') {
    out.tables.Users = readTable_('Users').map(stripSecret_);
    out.tables.Logs = readTable_('Logs').slice(-200).reverse();
  }
  var p = PropertiesService.getScriptProperties();
  var daily = [];
  for (var i = 13; i >= 0; i--) {
    var d = new Date(new Date().getTime() - i * 86400000);
    var k = Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
    daily.push({ date: k, count: Number(p.getProperty('VISITS_' + k) || 0) });
  }
  out.stats = { visits: Number(p.getProperty('VISITS') || 0), daily: daily };
  try {
    out.links = {
      db: db_().getUrl(),
      folder: DriveApp.getFolderById(p.getProperty('ROOT_FOLDER_ID')).getUrl()
    };
  } catch (err) { out.links = {}; }
  return out;
}

function stripSecret_(u) {
  var c = {};
  Object.keys(u).forEach(function (k) { if (k !== 'passwordHash' && k !== 'salt') c[k] = u[k]; });
  return c;
}

var HTML_FIELDS = { Pages: ['content'], Groups: ['detail'], News: ['content'], Steps: ['description'], Reports: ['content'] };

/** เพิ่ม/แก้ไขข้อมูลในตาราง */
function adminSave(token, table, record) {
  var user = requireAuth_(token);
  if (EDITABLE_TABLES.indexOf(table) === -1) throw new Error('ไม่อนุญาตให้แก้ไขตาราง ' + table);
  record = record || {};
  var pk = SCHEMA[table][0];
  var clean = {};
  SCHEMA[table].forEach(function (f) {
    if (record[f] !== undefined) clean[f] = record[f];
  });
  (HTML_FIELDS[table] || []).forEach(function (f) {
    if (clean[f] !== undefined) clean[f] = sanitizeHtml_(clean[f]);
  });
  if (clean.images !== undefined && typeof clean.images !== 'string') clean.images = JSON.stringify(clean.images);
  if (clean.fields !== undefined && typeof clean.fields !== 'string') clean.fields = JSON.stringify(clean.fields);
  if (clean.data !== undefined && typeof clean.data !== 'string') clean.data = JSON.stringify(clean.data);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var isNew = !clean[pk] || !getRow_(table, clean[pk]);
    if (!clean[pk]) clean[pk] = table === 'Pages' ? newId_() : newId_();
    var now = nowIso_();
    if (SCHEMA[table].indexOf('updatedAt') !== -1) clean.updatedAt = now;
    if (isNew && SCHEMA[table].indexOf('createdAt') !== -1 && !clean.createdAt) clean.createdAt = now;
    if (isNew && SCHEMA[table].indexOf('published') !== -1 && clean.published === undefined) clean.published = 'TRUE';
    if (isNew && SCHEMA[table].indexOf('order') !== -1 && (clean.order === undefined || clean.order === '')) {
      clean.order = String(readTable_(table).length + 1);
    }
    var saved = isNew ? insertRow_(table, fill_(table, clean)) : updateRow_(table, clean);
    clearPublicCache_();
    logAction_(user, (isNew ? 'create ' : 'update ') + table, clean.title || clean.name || clean.label || clean[pk]);
    return fill_(table, saved);
  } finally {
    lock.releaseLock();
  }
}

function fill_(table, obj) {
  var o = {};
  SCHEMA[table].forEach(function (f) { o[f] = obj[f] === undefined || obj[f] === null ? '' : obj[f]; });
  return o;
}

/** ลบข้อมูล — ถ้า trashFile = true จะย้ายไฟล์ใน Drive ที่ผูกอยู่ไปถังขยะด้วย */
function adminDelete(token, table, id, trashFile) {
  var user = requireAuth_(token, table === 'Users');
  if (EDITABLE_TABLES.indexOf(table) === -1 && table !== 'Media') throw new Error('ไม่อนุญาตให้ลบจากตาราง ' + table);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var row = getRow_(table, id);
    if (!row) return false;
    if (trashFile && row.fileId) {
      try { DriveApp.getFileById(row.fileId).setTrashed(true); } catch (err) { }
      if (table !== 'Media') {
        readTable_('Media').filter(function (m) { return m.fileId === row.fileId; })
          .forEach(function (m) { deleteRow_('Media', m.id); });
      }
    }
    if (table === 'Albums') {
      // ลบภาพทั้งหมดในอัลบั้มด้วย
      readTable_('Gallery').filter(function (g) { return g.section === 'album:' + id; }).forEach(function (g) {
        if (trashFile && g.fileId) { try { DriveApp.getFileById(g.fileId).setTrashed(true); } catch (err) { } }
        deleteRow_('Gallery', g.id);
      });
    }
    deleteRow_(table, id);
    clearPublicCache_();
    logAction_(user, 'delete ' + table, row.title || row.name || row.label || id);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/** จัดลำดับใหม่ตาม array ของ id */
function adminReorder(token, table, ids) {
  var user = requireAuth_(token);
  if (EDITABLE_TABLES.indexOf(table) === -1) throw new Error('ไม่อนุญาต');
  var sh = sheet_(table);
  var head = headers_(sh);
  var orderCol = head.indexOf('order');
  if (orderCol === -1) throw new Error('ตารางนี้ไม่มีลำดับ');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last = sh.getLastRow();
    if (last < 2) return true;
    var idVals = sh.getRange(2, 1, last - 1, 1).getValues();
    var orders = sh.getRange(2, orderCol + 1, last - 1, 1).getValues();
    var pos = {};
    ids.forEach(function (id, i) { pos[String(id)] = i + 1; });
    for (var i = 0; i < idVals.length; i++) {
      var k = String(idVals[i][0]);
      if (pos[k] !== undefined) orders[i][0] = String(pos[k]);
    }
    sh.getRange(2, orderCol + 1, last - 1, 1).setNumberFormat('@').setValues(orders);
    clearPublicCache_();
    logAction_(user, 'reorder ' + table, ids.length + ' รายการ');
    return true;
  } finally {
    lock.releaseLock();
  }
}

/** บันทึกการตั้งค่าเว็บไซต์ */
function saveSettings(token, obj) {
  var user = requireAuth_(token);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    Object.keys(obj || {}).forEach(function (k) {
      if (!/^[A-Za-z0-9_]+$/.test(k)) return;
      setSetting_(k, obj[k]);
    });
    clearPublicCache_();
    logAction_(user, 'update Settings', Object.keys(obj || {}).join(', '));
    return getSettings_();
  } finally {
    lock.releaseLock();
  }
}

/** ล้างแคชหน้าเว็บ (กรณีแก้ข้อมูลใน Google Sheets โดยตรง) */
function adminClearCache(token) {
  requireAuth_(token);
  clearPublicCache_();
  return true;
}

/* ------------------------------------------------------------
 *  ADMIN API — อัปโหลดไฟล์
 * ------------------------------------------------------------ */

/**
 * อัปโหลดไฟล์ไป Google Drive
 * payload = { name, mimeType, data (base64 ไม่มี prefix), folder: 'Images'|'Documents'|'Files' }
 */
function uploadFile(token, payload) {
  var user = requireAuth_(token);
  if (!payload || !payload.data) throw new Error('ไม่พบข้อมูลไฟล์');
  var bytes = Utilities.base64Decode(payload.data);
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน ' + Math.round(MAX_UPLOAD_BYTES / 1048576) + ' MB');
  }
  var mime = payload.mimeType || 'application/octet-stream';
  var name = String(payload.name || ('file-' + new Date().getTime())).replace(/[\\\/:*?"<>|]/g, '_');
  var folderName = payload.folder || (mime.indexOf('image/') === 0 ? 'Images' : 'Documents');
  var folderId = PropertiesService.getScriptProperties().getProperty('FOLDER_' + folderName.toUpperCase())
    || PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  var folder = DriveApp.getFolderById(folderId);

  var blob = Utilities.newBlob(bytes, mime, name);
  var file = folder.createFile(blob);
  var sharing = shareFile_(file);

  var id = file.getId();
  var rec = {
    id: newId_(), fileId: id, name: name, mimeType: mime, size: String(bytes.length),
    url: mime.indexOf('image/') === 0 ? driveImageUrl_(id) : driveViewUrl_(id),
    viewUrl: driveViewUrl_(id), downloadUrl: driveDownloadUrl_(id),
    folder: folderName, uploadedBy: user.username, createdAt: nowIso_()
  };
  insertRow_('Media', rec);
  logAction_(user, 'upload', name);
  rec.sharing = sharing;
  return rec;
}

/** ตั้งค่าแชร์ไฟล์ให้ทุกคนดูได้ (ถ้าโดเมนไม่อนุญาต จะลดเป็นเฉพาะในโดเมน) */
function shareFile_(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'anyone';
  } catch (err) {
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
      return 'domain';
    } catch (err2) {
      return 'private';
    }
  }
}

/** นำเข้ารูป/ไฟล์จาก URL ภายนอกมาเก็บใน Drive */
function importFromUrl(token, url, name) {
  var user = requireAuth_(token);
  return importUrl_(user, url, name);
}

function importUrl_(user, url, name) {
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() >= 300) throw new Error('ดาวน์โหลดไม่สำเร็จ (' + res.getResponseCode() + ')');
  var blob = res.getBlob();
  var mime = blob.getContentType() || 'image/jpeg';
  var ext = mime.indexOf('png') !== -1 ? '.png' : mime.indexOf('gif') !== -1 ? '.gif' : mime.indexOf('webp') !== -1 ? '.webp' : mime.indexOf('pdf') !== -1 ? '.pdf' : '.jpg';
  blob.setName((name || ('import-' + new Date().getTime())) + ext);
  var folderKey = mime.indexOf('image/') === 0 ? 'FOLDER_IMAGES' : 'FOLDER_FILES';
  var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(folderKey));
  var file = folder.createFile(blob);
  shareFile_(file);
  var id = file.getId();
  var rec = {
    id: newId_(), fileId: id, name: blob.getName(), mimeType: mime, size: String(blob.getBytes().length),
    url: mime.indexOf('image/') === 0 ? driveImageUrl_(id) : driveViewUrl_(id),
    viewUrl: driveViewUrl_(id), downloadUrl: driveDownloadUrl_(id),
    folder: mime.indexOf('image/') === 0 ? 'Images' : 'Files', uploadedBy: user ? user.username : 'system', createdAt: nowIso_()
  };
  insertRow_('Media', rec);
  return rec;
}

/**
 * ย้ายรูปภาพทั้งหมดที่ยังอ้างอิงจาก Google Sites เดิม มาเก็บใน Google Drive ของระบบ
 * (ทำครั้งละไม่เกิน 25 รูปเพื่อไม่ให้เกินเวลา 6 นาทีของ Apps Script — กดซ้ำจนครบ)
 */
function migrateExternalImages(token) {
  var user = requireAuth_(token);
  var isExternal = function (u) { return u && /googleusercontent\.com\/sitesv\//.test(String(u)); };
  var done = 0, failed = 0, limit = 25, memo = {};
  var importOne = function (u, label) {
    if (memo[u]) return memo[u];
    var rec = importUrl_(user, u, label);
    memo[u] = rec.url;
    return rec.url;
  };
  var step = function (table, fields) {
    readTable_(table).forEach(function (row) {
      fields.forEach(function (f) {
        if (done + failed >= limit) return;
        if (f === 'images') {
          var arr = []; try { arr = JSON.parse(row.images || '[]'); } catch (err) { arr = []; }
          var changed = false;
          arr = arr.map(function (u) {
            if (done + failed < limit && isExternal(u)) {
              try { var nu = importOne(u, (row.title || table) + '-img'); done++; changed = true; return nu; } catch (err) { failed++; }
            }
            return u;
          });
          if (changed) { var upd = { images: JSON.stringify(arr) }; upd[SCHEMA[table][0]] = row[SCHEMA[table][0]]; updateRow_(table, upd); }
        } else if (isExternal(row[f])) {
          try {
            var nu2 = importOne(row[f], row.title || row.name || row.caption || table);
            var upd2 = {}; upd2[SCHEMA[table][0]] = row[SCHEMA[table][0]]; upd2[f] = nu2;
            updateRow_(table, upd2); done++;
          } catch (err) { failed++; }
        }
      });
    });
  };
  step('Settings', ['value']);
  step('Gallery', ['url']);
  step('News', ['coverUrl', 'images']);
  step('Groups', ['coverUrl']);
  step('Pages', ['imageUrl']);
  step('Documents', ['coverUrl']);
  step('Steps', ['imageUrl']);
  step('Reports', ['coverUrl', 'images']);
  step('Albums', ['coverUrl']);

  var remaining = 0;
  ['Gallery', 'News', 'Groups', 'Pages', 'Documents', 'Steps', 'Settings', 'Reports', 'Albums'].forEach(function (t) {
    readTable_(t).forEach(function (row) {
      Object.keys(row).forEach(function (k) {
        var v = row[k];
        if (isExternal(v)) remaining++;
        else if (k === 'images' && /sitesv/.test(v)) { try { JSON.parse(v).forEach(function (u) { if (isExternal(u)) remaining++; }); } catch (err) { } }
      });
    });
  });
  clearPublicCache_();
  logAction_(user, 'migrate-images', 'สำเร็จ ' + done + ' / ล้มเหลว ' + failed);
  return { done: done, failed: failed, remaining: remaining };
}

/* ------------------------------------------------------------
 *  ADMIN API — ผู้ใช้ (เฉพาะ admin)
 * ------------------------------------------------------------ */

function saveUser(token, u) {
  var sess = requireAuth_(token, true);
  u = u || {};
  var username = String(u.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - (3–40 ตัว)');
  var all = readTable_('Users');
  var dup = all.filter(function (x) { return x.username.toLowerCase() === username && x.id !== u.id; })[0];
  if (dup) throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  var rec = { username: username, name: String(u.name || username), role: u.role === 'admin' ? 'admin' : 'editor', active: isTrue_(u.active) ? 'TRUE' : 'FALSE' };
  if (u.id) {
    if (u.id === sess.id && rec.role !== 'admin') throw new Error('ไม่สามารถลดสิทธิ์ของตนเองได้');
    rec.id = u.id;
  } else {
    rec.id = newId_(); rec.createdAt = nowIso_();
    if (!u.password) throw new Error('กรุณาตั้งรหัสผ่าน');
  }
  if (u.password) {
    validatePassword_(u.password);
    rec.salt = Utilities.getUuid();
    rec.passwordHash = hashPassword_(String(u.password), rec.salt);
  }
  var saved = u.id ? updateRow_('Users', rec) : insertRow_('Users', fill_('Users', rec));
  logAction_(sess, (u.id ? 'update' : 'create') + ' user', username);
  return stripSecret_(saved);
}

function deleteUser(token, id) {
  var sess = requireAuth_(token, true);
  if (id === sess.id) throw new Error('ไม่สามารถลบบัญชีของตนเองได้');
  var u = getRow_('Users', id);
  deleteRow_('Users', id);
  logAction_(sess, 'delete user', u ? u.username : id);
  return true;
}

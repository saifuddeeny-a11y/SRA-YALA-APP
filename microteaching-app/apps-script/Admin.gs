/**
 * ============================================================
 *  ระบบหลังบ้าน — ทุกฟังก์ชันต้องมี token ของเจ้าหน้าที่
 *    admin = ผู้ดูแลระบบ: ทุกเมนู รวมถึงผู้ใช้ ตั้งค่า เนื้อหาหน้าเว็บ ห้อง
 *    staff = เจ้าหน้าที่ประจำห้อง: อนุมัติ/เช็กอิน การจอง คำร้อง อุปกรณ์ วันปิด ข่าว
 * ============================================================
 */

function stripUser_(u) {
  var c = {};
  Object.keys(u).forEach(function (k) { if (k !== 'passwordHash' && k !== 'salt') c[k] = u[k]; });
  return c;
}

/** ข้อมูลทั้งหมดที่หน้าหลังบ้านใช้ */
function getAdminData(token) {
  var s = requireSession_(token);
  var since = addDays_(todayIso_(), -730);
  var pub = getPublicData();
  return {
    me: s,
    settings: getSettings_(),
    rules: pub.rules,
    rooms: readTable_('Rooms').sort(byOrder_),
    equipment: readTable_('Equipment'),
    bookings: readTable_('Bookings').filter(function (b) { return b.date >= since; }),
    requests: readTable_('Requests'),
    feedback: readTable_('Feedback'),
    evaluations: readTable_('Evaluations'),
    closures: readTable_('Closures'),
    pages: readTable_('Pages').sort(byOrder_),
    news: readTable_('News'),
    docs: readTable_('Docs').sort(byOrder_),
    users: s.role === 'admin' ? readTable_('Users').map(stripUser_) : [],
    log: s.role === 'admin' ? readTable_('Log').slice(-400).reverse() : [],
    today: todayIso_(), now: nowLocal_()
  };
}

/* ------------------------------------------------------------
 *  การจอง
 * ------------------------------------------------------------ */

/**
 * เจ้าหน้าที่เพิ่ม/แก้ไขการจอง
 * repeat = { until: 'YYYY-MM-DD', every: 1 } → จองซ้ำทุกสัปดาห์ (ตารางเรียนทั้งภาคเรียน) เฉพาะการเพิ่มใหม่
 */
function saveBooking(token, f, repeat) {
  var s = requireSession_(token);
  f = f || {};
  var b = cleanBooking_(f, true);
  var status = BOOKING_STATUS[f.status] ? f.status : 'approved';
  return withLock_(function () {
    var now = nowIso_();
    if (f.id) {
      var cur = getRow_('Bookings', f.id);
      if (!cur) throw new Error('ไม่พบรายการ');
      if (ACTIVE_STATUS.indexOf(status) !== -1) {
        var p = slotProblem_(b.roomId, b.date, b.start, b.end, cur.id, 0);
        if (p) throw new Error('บันทึกไม่ได้: ' + p);
      }
      b.id = cur.id; b.status = status; b.staffNote = text_(f.staffNote, 600); b.videoUrl = safeUrl_(f.videoUrl); b.updatedAt = now;
      var out = updateRow_('Bookings', b);
      log_(s.username, 'booking.edit', out.code, out.date + ' ' + out.start + '-' + out.end);
      if (cur.status !== out.status) notifyStatus_(out);
      return { saved: [out], skipped: [] };
    }
    var dates = [b.date];
    if (repeat && normDate_(repeat.until) && repeat.until > b.date) {
      var step = Math.max(1, Math.min(4, Math.round(Number(repeat.every) || 1))) * 7;
      for (var d = addDays_(b.date, step); d <= repeat.until && dates.length < 60; d = addDays_(d, step)) dates.push(d);
    }
    var series = dates.length > 1 ? newId_() : '';
    var saved = [], skipped = [], rows = [];
    dates.forEach(function (d) {
      var p = slotProblem_(b.roomId, d, b.start, b.end, '', 0);
      if (p) { skipped.push({ date: d, reason: p }); return; }
      var row = Object.assign({}, b, { id: newId_(), date: d, status: status, source: 'staff', series: series, staffNote: text_(f.staffNote, 600),
        decidedBy: s.username, decidedAt: now, createdAt: now, updatedAt: now });
      row.code = newCode_('MT', 'Bookings');
      insertRow_('Bookings', row);
      saved.push(fill_('Bookings', row));
    });
    log_(s.username, 'booking.create', saved.map(function (x) { return x.code; }).join(' '), saved.length + ' รายการ ข้าม ' + skipped.length);
    if (saved[0] && saved[0].email) notifyNewBooking_(saved[0]);
    return { saved: saved, skipped: skipped };
  });
}

/**
 * เปลี่ยนสถานะการจอง
 * action: approve | reject | cancel | checkin | checkout | noshow | reopen | note
 * p: { staffNote, condition, videoUrl, reason }
 */
function setBookingStatus(token, id, action, p) {
  var s = requireSession_(token);
  p = p || {};
  var out = withLock_(function () {
    var b = getRow_('Bookings', id);
    if (!b) throw new Error('ไม่พบรายการ');
    var now = nowIso_(), u = { id: b.id, updatedAt: now };
    if (p.staffNote !== undefined) u.staffNote = text_(p.staffNote, 600);
    if (p.videoUrl !== undefined) {
      u.videoUrl = safeUrl_(p.videoUrl);
      if (String(p.videoUrl).trim() && !u.videoUrl) throw new Error('ลิงก์วิดีโอต้องขึ้นต้นด้วย https://');
    }
    switch (action) {
      case 'approve':
        if (['pending', 'rejected', 'cancelled', 'noshow'].indexOf(b.status) === -1) throw new Error('อนุมัติได้เฉพาะรายการที่รออนุมัติ');
        var pr = slotProblem_(b.roomId, b.date, b.start, b.end, b.id, 0);
        if (pr) throw new Error('อนุมัติไม่ได้: ' + pr);
        u.status = 'approved'; u.decidedBy = s.username; u.decidedAt = now; break;
      case 'reject':
        if (!text_(p.staffNote || p.reason, 600)) throw new Error('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
        u.status = 'rejected'; u.decidedBy = s.username; u.decidedAt = now; u.staffNote = text_(p.staffNote || p.reason, 600); break;
      case 'cancel':
        u.status = 'cancelled'; u.cancelReason = 'เจ้าหน้าที่ยกเลิก: ' + text_(p.reason, 200); break;
      case 'checkin':
        if (['approved', 'pending'].indexOf(b.status) === -1) throw new Error('เช็กอินได้เฉพาะรายการที่อนุมัติแล้ว');
        u.status = 'checkedin'; u.checkinAt = now; if (b.status === 'pending') { u.decidedBy = s.username; u.decidedAt = now; } break;
      case 'checkout':
        if (['checkedin', 'approved'].indexOf(b.status) === -1) throw new Error('รายการนี้ยังไม่ได้เช็กอิน');
        u.status = 'completed'; u.checkoutAt = now; if (!b.checkinAt) u.checkinAt = now;
        u.condition = text_(p.condition, 300) || 'ปกติ'; break;
      case 'noshow':
        u.status = 'noshow'; break;
      case 'reopen':
        u.status = 'pending'; break;
      case 'note':
        break;
      default:
        throw new Error('คำสั่งไม่ถูกต้อง');
    }
    return updateRow_('Bookings', u);
  });
  log_(s.username, 'booking.' + action, out.code, out.staffNote || out.condition || '');
  if (['approve', 'reject', 'cancel', 'checkout'].indexOf(action) !== -1) notifyStatus_(out);
  if (action === 'note' && p.videoUrl && out.email) sendMail_(out.email, 'ไฟล์วิดีโอการสอนพร้อมแล้ว (' + out.code + ')', mailFrame_('ไฟล์วิดีโอการสอนของท่านพร้อมแล้ว', bookingMailBody_(out)));
  return out;
}

/** อนุมัติหลายรายการพร้อมกัน */
function approveMany(token, ids) {
  requireSession_(token);
  var ok = [], fail = [];
  (ids || []).slice(0, 100).forEach(function (id) {
    try { ok.push(setBookingStatus(token, id, 'approve', {})); } catch (err) { fail.push({ id: id, error: String(err.message || err) }); }
  });
  return { ok: ok, fail: fail };
}

function deleteBooking(token, id) {
  var s = requireSession_(token, ['admin']);
  var b = getRow_('Bookings', id);
  withLock_(function () { deleteRow_('Bookings', id); });
  log_(s.username, 'booking.delete', b ? b.code : id, b ? b.name : '');
  return true;
}

/* ------------------------------------------------------------
 *  คำร้อง
 * ------------------------------------------------------------ */

function updateRequest(token, id, p) {
  var s = requireSession_(token);
  p = p || {};
  var q = getRow_('Requests', id);
  if (!q) throw new Error('ไม่พบคำร้อง');
  var status = REQUEST_STATUS[p.status] ? p.status : q.status;
  var out = updateRow_('Requests', { id: q.id, status: status, response: text_(p.response, 1500), handledBy: s.name, updatedAt: nowIso_() });
  log_(s.username, 'request.' + status, out.code, out.response);
  if (out.email && (status !== q.status || out.response !== q.response)) {
    sendMail_(out.email, 'อัปเดตคำร้อง ' + out.code + ': ' + REQUEST_STATUS[status], mailFrame_('สถานะคำร้อง: ' + REQUEST_STATUS[status],
      '<p>เรื่อง: <b>' + esc_(out.subject) + '</b></p>' + (out.response ? '<p style="background:#f4f8ff;padding:10px 12px;border-radius:8px">' + esc_(out.response).replace(/\n/g, '<br>') + '</p>' : '')));
  }
  return out;
}

/* ------------------------------------------------------------
 *  ห้อง อุปกรณ์ วันปิด เนื้อหาหน้าเว็บ ข่าว เอกสาร (บันทึก/ลบ แบบรวม)
 * ------------------------------------------------------------ */

var ITEM_RULES = {
  Rooms:     { roles: ['admin'], clean: function (o) {
    return { code: text_(o.code, 20), name: text_(o.name, 100), building: text_(o.building, 100), floor: text_(o.floor, 20), capacity: String(Math.max(0, Math.round(Number(o.capacity) || 0))),
      kind: text_(o.kind, 60), description: text_(o.description, 1500), features: text_(o.features, 1500), image: safeUrl_(o.image), color: /^#[0-9a-fA-F]{6}$/.test(o.color || '') ? o.color : '#c2185b',
      bookable: isTrue_(o.bookable) ? 'TRUE' : 'FALSE', active: isTrue_(o.active) ? 'TRUE' : 'FALSE', order: String(Number(o.order) || 0) };
  }, need: 'name' },
  Equipment: { roles: ['admin', 'staff'], clean: function (o) {
    return { code: text_(o.code, 30), name: text_(o.name, 120), category: text_(o.category, 60), roomId: text_(o.roomId, 20), qty: String(Math.max(0, Math.round(Number(o.qty) || 1))),
      status: EQUIP_STATUS[o.status] ? o.status : 'ready', serial: text_(o.serial, 80), acquired: text_(o.acquired, 30), lendable: isTrue_(o.lendable) ? 'TRUE' : 'FALSE', note: text_(o.note, 500), updatedAt: nowIso_() };
  }, need: 'name' },
  Closures:  { roles: ['admin', 'staff'], clean: function (o) {
    var d = normDate_(o.date), e = normDate_(o.endDate);
    if (!d) throw new Error('กรุณาเลือกวันที่');
    var st = normTime_(o.start), en = normTime_(o.end);
    if ((st || en) && !(st && en && en > st)) throw new Error('ช่วงเวลาปิดไม่ถูกต้อง (เว้นว่างทั้งสองช่อง = ปิดทั้งวัน)');
    return { date: d, endDate: e && e > d ? e : '', roomId: text_(o.roomId, 20), start: st, end: en, reason: text_(o.reason, 150) };
  }, need: 'date' },
  Pages:     { roles: ['admin'], key: 'key', clean: function (o) {
    return { title: text_(o.title, 100), icon: text_(o.icon, 8), body: text_(o.body, 30000), order: String(Number(o.order) || 0), inMenu: isTrue_(o.inMenu) ? 'TRUE' : 'FALSE', updatedAt: nowIso_() };
  }, need: 'title' },
  News:      { roles: ['admin', 'staff'], clean: function (o) {
    return { title: text_(o.title, 150), body: text_(o.body, 3000), date: normDate_(o.date) || todayIso_(), pinned: isTrue_(o.pinned) ? 'TRUE' : 'FALSE', active: isTrue_(o.active) ? 'TRUE' : 'FALSE' };
  }, need: 'title' },
  Docs:      { roles: ['admin'], clean: function (o) {
    var url = safeUrl_(o.url);
    if (String(o.url || '').trim() && !url) throw new Error('ลิงก์เอกสารต้องขึ้นต้นด้วย https://');
    return { title: text_(o.title, 150), category: text_(o.category, 60), url: url, description: text_(o.description, 500), order: String(Number(o.order) || 0), active: isTrue_(o.active) ? 'TRUE' : 'FALSE' };
  }, need: 'title' },
  Feedback:    { roles: ['admin'], deleteOnly: true },
  Evaluations: { roles: ['admin'], deleteOnly: true },
  Requests:    { roles: ['admin'], deleteOnly: true }
};

function saveItem(token, table, o) {
  var rule = ITEM_RULES[table];
  if (!rule || rule.deleteOnly) throw new Error('ไม่รู้จักตาราง');
  var s = requireSession_(token, rule.roles);
  o = o || {};
  var data = rule.clean(o);
  if (!data[rule.need]) throw new Error('กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
  var out = withLock_(function () {
    if (rule.key === 'key') {
      var key = text_(o.key, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!key) throw new Error('กรุณากำหนดรหัสหน้า (ภาษาอังกฤษ เช่น services)');
      data.key = key;
      return updateRow_(table, data);
    }
    if (o.id && getRow_(table, o.id)) { data.id = o.id; return updateRow_(table, data); }
    data.id = newId_();
    if (SCHEMA[table].indexOf('createdAt') !== -1) data.createdAt = nowIso_();
    return insertRow_(table, data);
  });
  log_(s.username, table.toLowerCase() + '.save', out.key || out.id, out.name || out.title || out.reason || '');
  return out;
}

function deleteItem(token, table, id) {
  var rule = ITEM_RULES[table];
  if (!rule) throw new Error('ไม่รู้จักตาราง');
  var s = requireSession_(token, rule.roles);
  if (table === 'Rooms' && readTable_('Bookings').some(function (b) { return b.roomId === id; })) throw new Error('ห้องนี้มีประวัติการจองแล้ว ลบไม่ได้ — ให้ปิดการใช้งาน (ไม่ติ๊ก “เปิดใช้งาน”) แทน');
  withLock_(function () { deleteRow_(table, id); });
  log_(s.username, table.toLowerCase() + '.delete', id, '');
  return true;
}

/* ------------------------------------------------------------
 *  ผู้ใช้งาน (admin) และรหัสผ่าน
 * ------------------------------------------------------------ */

function saveUser(token, o) {
  var s = requireSession_(token, ['admin']);
  o = o || {};
  var username = text_(o.username, 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ/ตัวเลข 3–40 ตัว');
  var name = text_(o.name, 100);
  if (!name) throw new Error('กรุณากรอกชื่อ-นามสกุล');
  var dup = readTable_('Users').filter(function (u) { return u.username === username && u.id !== o.id; })[0];
  if (dup) throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  var data = { username: username, name: name, role: o.role === 'admin' ? 'admin' : 'staff', email: validEmail_(o.email) ? text_(o.email, 120) : '', phone: text_(o.phone, 20),
    active: isTrue_(o.active) ? 'TRUE' : 'FALSE' };
  if (o.id === s.id && (data.role !== 'admin' || data.active !== 'TRUE')) throw new Error('ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตนเองได้');
  var pw = String(o.password || '');
  if (pw && pw.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  if (pw) { data.salt = Utilities.getUuid(); data.passwordHash = hashPassword_(pw, data.salt); }
  var out = withLock_(function () {
    if (o.id && getRow_('Users', o.id)) { data.id = o.id; return updateRow_('Users', data); }
    if (!pw) throw new Error('กรุณาตั้งรหัสผ่านเริ่มต้น');
    data.id = newId_(); data.createdAt = nowIso_(); data.lastLogin = '';
    return insertRow_('Users', data);
  });
  log_(s.username, 'user.save', out.username, out.role);
  return stripUser_(out);
}

function deleteUser(token, id) {
  var s = requireSession_(token, ['admin']);
  if (id === s.id) throw new Error('ไม่สามารถลบบัญชีของตนเองได้');
  var u = getRow_('Users', id);
  deleteRow_('Users', id);
  log_(s.username, 'user.delete', u ? u.username : id, '');
  return true;
}

function changePassword(token, oldPw, newPw) {
  var s = requireSession_(token);
  var u = getRow_('Users', s.id);
  if (hashPassword_(String(oldPw || ''), u.salt) !== u.passwordHash) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  newPw = String(newPw || '');
  if (newPw.length < 8) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
  var salt = Utilities.getUuid();
  updateRow_('Users', { id: u.id, salt: salt, passwordHash: hashPassword_(newPw, salt) });
  log_(s.username, 'user.password', s.username, '');
  return true;
}

/* ------------------------------------------------------------
 *  ตั้งค่า (admin)
 * ------------------------------------------------------------ */

var SETTING_KEYS = ['appName', 'org', 'building', 'address', 'phone', 'email', 'line', 'facebook', 'mapUrl', 'hoursText', 'heroTitle', 'heroText', 'welcome', 'announce', 'staffText',
  'openTime', 'closeTime', 'openDays', 'slotMinutes', 'minLeadHours', 'maxAdvanceDays', 'maxHours', 'maxActivePerPerson', 'bufferMinutes', 'autoApprove', 'requireAdvisor', 'showNames',
  'mailEnabled', 'notifyEmails'];

function saveSettings(token, o) {
  var s = requireSession_(token, ['admin']);
  o = o || {};
  SETTING_KEYS.forEach(function (k) {
    if (o[k] === undefined) return;
    var v = text_(o[k], 3000);
    if ((k === 'openTime' || k === 'closeTime') && !normTime_(v)) throw new Error('รูปแบบเวลาไม่ถูกต้อง (เช่น 08:30)');
    if (k === 'openTime' || k === 'closeTime') v = normTime_(v);
    if (k === 'mapUrl' || k === 'facebook') v = safeUrl_(v);
    setSetting_(k, v);
  });
  var r = rules_();
  if (minutes_(r.closeTime) <= minutes_(r.openTime)) throw new Error('เวลาปิดต้องหลังเวลาเปิด');
  log_(s.username, 'settings.save', '', Object.keys(o).join(','));
  return getSettings_();
}

function testEmail(token) {
  var s = requireSession_(token, ['admin']);
  var u = getRow_('Users', s.id);
  var to = u.email || String(getSettings_().notifyEmails || '').split(/[,\s;]+/).filter(validEmail_)[0];
  if (!to) throw new Error('กรุณาใส่อีเมลของคุณที่หน้า ผู้ใช้งาน หรืออีเมลผู้รับแจ้งเตือนก่อน');
  if (!sendMail_(to, 'ทดสอบการส่งอีเมล', mailFrame_('ทดสอบการส่งอีเมล', '<p>ระบบส่งอีเมลได้ปกติ</p>'))) throw new Error('ส่งไม่สำเร็จ (ตรวจว่าเปิดการแจ้งเตือนทางอีเมลแล้ว และอนุญาตสิทธิ์ส่งอีเมล)');
  return to;
}

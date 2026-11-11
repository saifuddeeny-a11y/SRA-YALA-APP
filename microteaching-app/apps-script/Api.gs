/**
 * ============================================================
 *  API สาธารณะ — ฟังก์ชันที่หน้าเว็บเรียกผ่าน google.script.run
 *  (ฟังก์ชันที่ลงท้ายด้วย _ เรียกจากหน้าเว็บไม่ได้)
 *  ผู้ใช้ทั่วไปไม่ต้องเข้าสู่ระบบ: จองห้อง → ได้ "รหัสการจอง"
 *  ใช้รหัส + เบอร์โทร/อีเมลที่กรอกไว้ เพื่อดูสถานะ ยกเลิก ประเมินความพึงพอใจ
 * ============================================================
 */

/* ------------------------------------------------------------
 *  ข้อมูลหน้าเว็บ
 * ------------------------------------------------------------ */

function getPublicData() {
  var s = getSettings_();
  var today = todayIso_();
  var rooms = readTable_('Rooms').filter(function (r) { return isTrue_(r.active); }).sort(byOrder_).map(publicRoom_);
  var equipment = readTable_('Equipment').filter(function (e) { return e.status !== 'retired'; }).map(function (e) {
    return { id: e.id, name: e.name, category: e.category, roomId: e.roomId, qty: e.qty, status: e.status, lendable: e.lendable };
  });
  return {
    site: {
      appName: s.appName || APP_NAME, org: s.org || '', building: s.building || '', address: s.address || '', phone: s.phone || '', email: s.email || '',
      line: s.line || '', facebook: s.facebook || '', mapUrl: s.mapUrl || '', hoursText: s.hoursText || '', heroTitle: s.heroTitle || '', heroText: s.heroText || '',
      welcome: s.welcome || '', announce: s.announce || '', staffText: s.staffText || ''
    },
    rules: rules_(s),
    rooms: rooms,
    equipment: equipment,
    pages: readTable_('Pages').sort(byOrder_).map(function (p) { return { key: p.key, title: p.title, icon: p.icon, body: p.body, inMenu: p.inMenu, order: p.order }; }),
    news: readTable_('News').filter(function (n) { return isTrue_(n.active); }).sort(function (a, b) {
      return (isTrue_(b.pinned) - isTrue_(a.pinned)) || String(b.date).localeCompare(String(a.date));
    }).slice(0, 20),
    docs: readTable_('Docs').filter(function (d) { return isTrue_(d.active); }).sort(byOrder_),
    closures: readTable_('Closures').filter(function (c) { return (c.endDate || c.date) >= today; }).sort(function (a, b) { return a.date.localeCompare(b.date); }),
    purposes: PURPOSES, userTypes: USER_TYPES, requestTypes: REQUEST_TYPES, requestStatus: REQUEST_STATUS, bookingStatus: BOOKING_STATUS,
    equipStatus: EQUIP_STATUS, feedbackItems: FEEDBACK_ITEMS, skills: SKILLS,
    today: today, now: nowLocal_()
  };
}

function publicRoom_(r) {
  return { id: r.id, code: r.code, name: r.name, building: r.building, floor: r.floor, capacity: r.capacity, kind: r.kind, description: r.description,
    features: r.features, image: r.image, color: r.color, bookable: r.bookable, order: r.order };
}

function byOrder_(a, b) {
  var d = (Number(a.order) || 0) - (Number(b.order) || 0);
  return d || String(a.createdAt || a.title || '').localeCompare(String(b.createdAt || b.title || ''));
}

/** ตารางการใช้ห้องในช่วงวันที่ (สูงสุด 62 วัน) — ไม่เปิดเผยเบอร์โทร/อีเมล */
function getSchedule(from, to) {
  from = normDate_(from); to = normDate_(to);
  if (!from || !to || to < from) throw new Error('ช่วงวันที่ไม่ถูกต้อง');
  if (daysBetween_(from, to) > 62) to = addDays_(from, 62);
  var r = rules_();
  var rooms = {};
  readTable_('Rooms').forEach(function (x) { rooms[x.id] = x; });
  var items = readTable_('Bookings').filter(function (b) {
    return b.date >= from && b.date <= to && ACTIVE_STATUS.indexOf(b.status) !== -1;
  }).map(function (b) {
    return { roomId: b.roomId, date: b.date, start: b.start, end: b.end, status: b.status, purpose: b.purpose, userType: b.userType,
      label: b.title || PURPOSES[b.purpose] || 'จองแล้ว', who: r.showNames ? b.name : '', course: b.course };
  }).sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
  var closures = readTable_('Closures').filter(function (c) { return c.date <= to && (c.endDate || c.date) >= from; });
  return { from: from, to: to, items: items, closures: closures };
}

/* ------------------------------------------------------------
 *  ตรวจเวลาซ้อน / วันปิด
 * ------------------------------------------------------------ */

/** คืนข้อความเหตุผลถ้าช่วงเวลานี้ใช้ไม่ได้ ('' = ว่าง) */
function slotProblem_(roomId, date, start, end, excludeId, bufferMin) {
  var s = minutes_(start), e = minutes_(end), buf = bufferMin || 0;
  var closures = readTable_('Closures');
  for (var i = 0; i < closures.length; i++) {
    var c = closures[i];
    if (date < c.date || date > (c.endDate || c.date)) continue;
    if (c.roomId && c.roomId !== roomId) continue;
    if (c.start && c.end && !(e <= minutes_(c.start) || s >= minutes_(c.end))) return 'ห้องปิด ' + c.start + '–' + c.end + ' น. (' + c.reason + ')';
    if (!c.start || !c.end) return 'ห้องปิดให้บริการวันนี้ (' + (c.reason || 'วันหยุด') + ')';
  }
  var rows = readTable_('Bookings');
  for (var j = 0; j < rows.length; j++) {
    var b = rows[j];
    if (b.id === excludeId || b.roomId !== roomId || b.date !== date || ACTIVE_STATUS.indexOf(b.status) === -1) continue;
    if (s < minutes_(b.end) + buf && e + buf > minutes_(b.start)) return 'เวลาซ้อนกับการจอง ' + b.start + '–' + b.end + ' น.';
  }
  return '';
}

/** ตรวจความถูกต้องของข้อมูลการจอง (ใช้ทั้งหน้าบ้านและหลังบ้าน) → คืนอ็อบเจกต์ที่พร้อมบันทึก */
function cleanBooking_(f, isStaff) {
  f = f || {};
  var r = rules_();
  var room = getRow_('Rooms', f.roomId);
  if (!room || !isTrue_(room.active)) throw new Error('กรุณาเลือกห้อง');
  if (!isStaff && !isTrue_(room.bookable)) throw new Error('ห้องนี้ไม่เปิดให้จองออนไลน์ กรุณาติดต่อเจ้าหน้าที่');
  var date = normDate_(f.date), start = normTime_(f.start), end = normTime_(f.end);
  if (!date) throw new Error('กรุณาเลือกวันที่');
  if (!start || !end || minutes_(end) <= minutes_(start)) throw new Error('กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุดให้ถูกต้อง');
  var b = {
    roomId: room.id, date: date, start: start, end: end,
    title: text_(f.title, 150), purpose: PURPOSES[f.purpose] ? f.purpose : 'other',
    userType: USER_TYPES[f.userType] ? f.userType : 'student',
    name: text_(f.name, 100), studentId: text_(f.studentId, 20).replace(/[^0-9A-Za-z-]/g, ''),
    faculty: text_(f.faculty, 100), major: text_(f.major, 100),
    phone: text_(f.phone, 20), email: text_(f.email, 120).toLowerCase(),
    course: text_(f.course, 150), advisor: text_(f.advisor, 100),
    participants: String(Math.max(1, Math.min(500, Math.round(Number(f.participants) || 1)))),
    equipment: (Array.isArray(f.equipment) ? f.equipment : String(f.equipment || '').split(','))
      .map(function (x) { return text_(x, 60).replace(/,/g, ' '); }).filter(String).slice(0, 15).join(', '),
    record: isTrue_(f.record) ? 'TRUE' : 'FALSE', support: isTrue_(f.support) ? 'TRUE' : 'FALSE',
    note: text_(f.note, 600)
  };
  if (!b.title) throw new Error('กรุณากรอกหัวข้อ / เรื่องที่สอน');
  if (!b.name) throw new Error('กรุณากรอกชื่อ-นามสกุลผู้จอง');
  if (!isStaff) {
    if (phoneDigits_(b.phone).length < 9 || phoneDigits_(b.phone).length > 10) throw new Error('กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก');
    if (b.email && !validEmail_(b.email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    if (b.userType === 'student' && !b.studentId) throw new Error('กรุณากรอกรหัสนักศึกษา');
    if (b.userType === 'student' && r.requireAdvisor && !b.advisor) throw new Error('กรุณากรอกชื่ออาจารย์ผู้สอน / อาจารย์ที่ปรึกษารายวิชา');
    if (!isTrue_(f.consent)) throw new Error('กรุณายอมรับระเบียบการใช้ห้องและนโยบายข้อมูลส่วนบุคคล');
    var cap = Number(room.capacity) || 0;
    if (cap && Number(b.participants) > cap) throw new Error('จำนวนผู้เข้าใช้เกินความจุห้อง (' + cap + ' คน)');
    // กฎเวลา
    if (r.openDays.indexOf(dow_(date)) === -1) throw new Error('วัน' + THAI_DAYS[dow_(date)] + 'ไม่เปิดให้จองออนไลน์ หากจำเป็นกรุณายื่นคำร้องขอใช้นอกเวลา');
    if (minutes_(start) < minutes_(r.openTime) || minutes_(end) > minutes_(r.closeTime)) throw new Error('เวลาให้บริการ ' + r.openTime + '–' + r.closeTime + ' น. (นอกเวลากรุณายื่นคำร้อง)');
    if ((minutes_(end) - minutes_(start)) > r.maxHours * 60) throw new Error('จองได้ไม่เกินครั้งละ ' + r.maxHours + ' ชั่วโมง');
    var now = nowLocal_();
    var hoursAhead = (new Date(date + 'T' + start + ':00Z') - new Date(now.replace(' ', 'T') + ':00Z')) / 3600000;
    if (hoursAhead < r.minLeadHours) throw new Error(r.minLeadHours > 0 ? 'ต้องจองล่วงหน้าอย่างน้อย ' + r.minLeadHours + ' ชั่วโมง' : 'ไม่สามารถจองเวลาที่ผ่านมาแล้ว');
    if (daysBetween_(todayIso_(), date) > r.maxAdvanceDays) throw new Error('จองล่วงหน้าได้ไม่เกิน ' + r.maxAdvanceDays + ' วัน');
  }
  return b;
}

/* ------------------------------------------------------------
 *  จองห้อง (หน้าบ้าน)
 * ------------------------------------------------------------ */

function submitBooking(f) {
  f = f || {};
  if (f.website) throw new Error('ไม่สามารถส่งข้อมูลได้'); // honeypot กันบอต
  var cache = CacheService.getScriptCache();
  var burst = Number(cache.get('book_burst') || 0);
  if (burst > 40) throw new Error('มีการจองจำนวนมากในขณะนี้ กรุณาลองใหม่อีกครั้งใน 10 นาที');
  var b = cleanBooking_(f, false);
  var r = rules_();
  var saved = withLock_(function () {
    var today = todayIso_(), digits = phoneDigits_(b.phone);
    var mine = readTable_('Bookings').filter(function (x) {
      return phoneDigits_(x.phone) === digits && x.date >= today && (x.status === 'pending' || x.status === 'approved');
    });
    if (r.maxActivePerPerson > 0 && mine.length >= r.maxActivePerPerson) throw new Error('คุณมีรายการจองที่ยังไม่ถึงกำหนด ' + mine.length + ' รายการ (จองได้สูงสุด ' + r.maxActivePerPerson + ' รายการ)');
    var problem = slotProblem_(b.roomId, b.date, b.start, b.end, '', r.bufferMinutes);
    if (problem) throw new Error('ช่วงเวลานี้ไม่ว่าง: ' + problem + ' กรุณาเลือกเวลาอื่น');
    var now = nowIso_();
    b.id = newId_();
    b.code = newCode_('MT', 'Bookings');
    b.status = r.autoApprove ? 'approved' : 'pending';
    b.source = 'online';
    b.createdAt = now; b.updatedAt = now;
    if (r.autoApprove) { b.decidedBy = 'auto'; b.decidedAt = now; }
    return insertRow_('Bookings', b);
  });
  cache.put('book_burst', String(burst + 1), 600);
  log_('public', 'booking.create', saved.code, saved.name + ' · ' + saved.date + ' ' + saved.start + '-' + saved.end);
  notifyNewBooking_(saved);
  return { code: saved.code, status: saved.status, statusLabel: BOOKING_STATUS[saved.status], date: saved.date, start: saved.start, end: saved.end,
    roomName: (getRow_('Rooms', saved.roomId) || {}).name || '', hasEmail: !!saved.email };
}

/** หา booking จากรหัส + ตรวจเบอร์โทร/อีเมล */
function findMine_(table, code, contact) {
  code = String(code || '').trim().toUpperCase().replace(/\s/g, '');
  contact = String(contact || '').trim().toLowerCase();
  if (!code || !contact) throw new Error('กรุณากรอกรหัสอ้างอิง และเบอร์โทรศัพท์หรืออีเมลที่ใช้ตอนส่งข้อมูล');
  var key = 'c_' + code.replace(/[^A-Z0-9]/g, '');
  checkLockout_(key);
  var row = readTable_(table).filter(function (x) { return String(x.code).toUpperCase() === code; })[0];
  var ok = row && ((contact.indexOf('@') !== -1 && row.email && row.email.toLowerCase() === contact) ||
    (phoneDigits_(contact).length >= 9 && phoneDigits_(contact) === phoneDigits_(row.phone)));
  if (!ok) { recordFail_(key); throw new Error('ไม่พบรายการ หรือเบอร์โทร/อีเมลไม่ตรงกับที่บันทึกไว้'); }
  return row;
}

function bookingView_(b) {
  var room = getRow_('Rooms', b.roomId) || {};
  var now = nowLocal_();
  var startAt = b.date + ' ' + b.start, endAt = b.date + ' ' + b.end;
  var fb = readTable_('Feedback').filter(function (x) { return x.bookingId === b.id; })[0];
  var evs = readTable_('Evaluations').filter(function (x) { return x.bookingId === b.id; });
  return {
    code: b.code, roomId: b.roomId, roomName: room.name || '', building: room.building || '', date: b.date, dateText: thaiDate_(b.date), start: b.start, end: b.end,
    title: b.title, purpose: b.purpose, purposeLabel: PURPOSES[b.purpose] || '', userType: b.userType, name: b.name, course: b.course, advisor: b.advisor,
    participants: b.participants, equipment: b.equipment, record: b.record, support: b.support, note: b.note,
    status: b.status, statusLabel: BOOKING_STATUS[b.status] || b.status, staffNote: b.staffNote, videoUrl: b.videoUrl, cancelReason: b.cancelReason,
    checkinAt: b.checkinAt, checkoutAt: b.checkoutAt, createdAt: b.createdAt, decidedAt: b.decidedAt,
    canCancel: (b.status === 'pending' || b.status === 'approved') && startAt > now,
    canFeedback: !fb && (b.status === 'completed' || b.status === 'checkedin' || (b.status === 'approved' && endAt <= now)),
    feedbackDone: !!fb,
    evaluations: evalSummary_(evs)
  };
}

/** สรุปผลประเมินทักษะการสอนของการจองหนึ่งรายการ */
function evalSummary_(evs) {
  var bySkill = {};
  evs.forEach(function (e) {
    var sc = {};
    try { sc = JSON.parse(e.scores || '{}'); } catch (err) { sc = {}; }
    Object.keys(sc).forEach(function (k) {
      var arr = sc[k] || [], v = arr.filter(function (x) { return Number(x) > 0; });
      if (!v.length) return;
      var avg = v.reduce(function (s, x) { return s + Number(x); }, 0) / v.length;
      bySkill[k] = bySkill[k] || { sum: 0, n: 0 };
      bySkill[k].sum += avg; bySkill[k].n++;
    });
  });
  var skills = SKILLS.filter(function (s) { return bySkill[s.key]; }).map(function (s) {
    return { key: s.key, name: s.name, avg: Math.round(bySkill[s.key].sum / bySkill[s.key].n * 100) / 100, n: bySkill[s.key].n };
  });
  var roles = { self: 0, peer: 0, lecturer: 0 };
  evs.forEach(function (e) { roles[e.role] = (roles[e.role] || 0) + 1; });
  return {
    count: evs.length, roles: roles, skills: skills,
    comments: evs.filter(function (e) { return e.strengths || e.improve; }).slice(-30).map(function (e) {
      return { role: e.role, evaluator: e.role === 'lecturer' ? e.evaluator : '', strengths: e.strengths, improve: e.improve, createdAt: e.createdAt };
    })
  };
}

function checkBooking(code, contact) {
  var b = findMine_('Bookings', code, contact);
  return bookingView_(b);
}

function cancelBooking(code, contact, reason) {
  var res = withLock_(function () {
    var b = findMine_('Bookings', code, contact);
    if (b.status !== 'pending' && b.status !== 'approved') throw new Error('รายการนี้ยกเลิกไม่ได้ (สถานะ: ' + (BOOKING_STATUS[b.status] || b.status) + ')');
    if ((b.date + ' ' + b.start) <= nowLocal_()) throw new Error('เลยเวลาเริ่มใช้ห้องแล้ว กรุณาติดต่อเจ้าหน้าที่');
    return updateRow_('Bookings', { id: b.id, status: 'cancelled', cancelReason: 'ผู้จองยกเลิก: ' + text_(reason, 200), updatedAt: nowIso_() });
  });
  log_('public', 'booking.cancel', res.code, res.cancelReason);
  notifyStaff_('ยกเลิกการจอง ' + res.code, '<p>ผู้จองยกเลิกรายการ <b>' + esc_(res.code) + '</b> ' + esc_(thaiDate_(res.date)) + ' ' + res.start + '–' + res.end + ' น.</p><p>' + esc_(res.cancelReason) + '</p>');
  return bookingView_(res);
}

/* ------------------------------------------------------------
 *  แบบประเมินความพึงพอใจ (หลังใช้ห้อง)
 * ------------------------------------------------------------ */

function submitFeedback(code, contact, answers, comment) {
  var b = findMine_('Bookings', code, contact);
  var v = bookingView_(b);
  if (v.feedbackDone) throw new Error('รายการนี้ส่งแบบประเมินแล้ว ขอบคุณค่ะ');
  if (!v.canFeedback) throw new Error('ประเมินได้หลังใช้ห้องแล้วเท่านั้น');
  answers = Array.isArray(answers) ? answers : [];
  var q = {};
  for (var i = 0; i < FEEDBACK_ITEMS.length; i++) {
    var n = Math.round(Number(answers[i]));
    if (!(n >= 1 && n <= 5)) throw new Error('กรุณาให้คะแนนให้ครบทุกข้อ');
    q['q' + (i + 1)] = String(n);
  }
  insertRow_('Feedback', Object.assign({ id: newId_(), bookingId: b.id, bookingCode: b.code, roomId: b.roomId, userType: b.userType, comment: text_(comment, 600), createdAt: nowIso_() }, q));
  return bookingView_(getRow_('Bookings', b.id));
}

/* ------------------------------------------------------------
 *  แบบประเมินทักษะการสอน (ตนเอง / เพื่อน / อาจารย์) — ใช้รหัสการจองที่ผู้สอนแชร์ให้
 * ------------------------------------------------------------ */

function getEvalTarget(code) {
  code = String(code || '').trim().toUpperCase();
  var key = 'e_' + code.replace(/[^A-Z0-9]/g, '');
  checkLockout_(key);
  var b = readTable_('Bookings').filter(function (x) { return String(x.code).toUpperCase() === code; })[0];
  if (!b || ['approved', 'checkedin', 'completed'].indexOf(b.status) === -1) { recordFail_(key); throw new Error('ไม่พบรหัสการจองนี้ หรือรายการยังไม่ได้รับอนุมัติ'); }
  var room = getRow_('Rooms', b.roomId) || {};
  return { code: b.code, title: b.title, teacher: b.name, course: b.course, date: b.date, dateText: thaiDate_(b.date), start: b.start, end: b.end, roomName: room.name || '' };
}

function submitEvaluation(code, f) {
  f = f || {};
  var t = getEvalTarget(code);
  var b = readTable_('Bookings').filter(function (x) { return x.code === t.code; })[0];
  var role = ['self', 'peer', 'lecturer'].indexOf(f.role) !== -1 ? f.role : 'peer';
  var evaluator = text_(f.evaluator, 100);
  if (role !== 'self' && !evaluator) throw new Error('กรุณากรอกชื่อผู้ประเมิน');
  var src = f.scores || {}, scores = {}, all = [];
  SKILLS.forEach(function (s) {
    var arr = Array.isArray(src[s.key]) ? src[s.key] : [];
    var clean = s.items.map(function (_, i) { var n = Math.round(Number(arr[i])); return n >= 1 && n <= 5 ? n : 0; });
    if (clean.some(function (x) { return x > 0; })) { scores[s.key] = clean; all = all.concat(clean.filter(function (x) { return x > 0; })); }
  });
  if (!all.length) throw new Error('กรุณาให้คะแนนอย่างน้อย 1 ทักษะ');
  var cache = CacheService.getScriptCache(), ck = 'ev_' + b.id, cnt = Number(cache.get(ck) || 0);
  if (cnt > 80) throw new Error('มีการส่งแบบประเมินรายการนี้จำนวนมาก กรุณาลองใหม่ภายหลัง');
  cache.put(ck, String(cnt + 1), 21600);
  var avg = Math.round(all.reduce(function (s, x) { return s + x; }, 0) / all.length * 100) / 100;
  insertRow_('Evaluations', { id: newId_(), bookingId: b.id, bookingCode: b.code, evaluator: role === 'self' ? b.name : evaluator, role: role,
    skill: Object.keys(scores).join(','), scores: JSON.stringify(scores), avg: String(avg), strengths: text_(f.strengths, 600), improve: text_(f.improve, 600), createdAt: nowIso_() });
  return { ok: true, avg: avg };
}

/* ------------------------------------------------------------
 *  แบบฟอร์ม / คำร้อง
 * ------------------------------------------------------------ */

function submitRequest(f) {
  f = f || {};
  if (f.website) throw new Error('ไม่สามารถส่งข้อมูลได้');
  var cache = CacheService.getScriptCache(), burst = Number(cache.get('req_burst') || 0);
  if (burst > 40) throw new Error('มีคำร้องจำนวนมากในขณะนี้ กรุณาลองใหม่ภายหลัง');
  var q = {
    type: REQUEST_TYPES[f.type] ? f.type : 'other', name: text_(f.name, 100), userType: USER_TYPES[f.userType] ? f.userType : 'student',
    studentId: text_(f.studentId, 20), faculty: text_(f.faculty, 100), phone: text_(f.phone, 20), email: text_(f.email, 120).toLowerCase(),
    subject: text_(f.subject, 150), detail: text_(f.detail, 2000), refCode: text_(f.refCode, 30).toUpperCase(), needDate: normDate_(f.needDate), link: safeUrl_(f.link)
  };
  if (!q.name) throw new Error('กรุณากรอกชื่อ-นามสกุล');
  if (phoneDigits_(q.phone).length < 9) throw new Error('กรุณากรอกเบอร์โทรศัพท์');
  if (q.email && !validEmail_(q.email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
  if (!q.subject || !q.detail) throw new Error('กรุณากรอกเรื่องและรายละเอียดคำร้อง');
  var saved = withLock_(function () {
    var now = nowIso_();
    q.id = newId_(); q.code = newCode_('RQ', 'Requests'); q.status = 'new'; q.createdAt = now; q.updatedAt = now;
    return insertRow_('Requests', q);
  });
  cache.put('req_burst', String(burst + 1), 600);
  log_('public', 'request.create', saved.code, REQUEST_TYPES[saved.type] + ' · ' + saved.subject);
  notifyStaff_('คำร้องใหม่ ' + saved.code + ' — ' + REQUEST_TYPES[saved.type],
    '<p><b>' + esc_(saved.subject) + '</b></p><p>' + esc_(saved.detail).replace(/\n/g, '<br>') + '</p><p>ผู้ยื่น: ' + esc_(saved.name) + ' · ' + esc_(saved.phone) + '</p>');
  if (saved.email) sendMail_(saved.email, 'รับคำร้อง ' + saved.code + ' แล้ว', mailFrame_('ได้รับคำร้องของท่านแล้ว',
    '<p>รหัสคำร้อง <b style="font-size:18px">' + saved.code + '</b></p><p>เรื่อง: ' + esc_(saved.subject) + '</p><p>ติดตามผลได้ที่เมนู “ตรวจสอบสถานะ” โดยใช้รหัสคำร้องและเบอร์โทร/อีเมลนี้</p>'));
  return { code: saved.code, typeLabel: REQUEST_TYPES[saved.type] };
}

function checkRequest(code, contact) {
  var q = findMine_('Requests', code, contact);
  return { code: q.code, type: q.type, typeLabel: REQUEST_TYPES[q.type], subject: q.subject, detail: q.detail, status: q.status, statusLabel: REQUEST_STATUS[q.status] || q.status,
    response: q.response, createdAt: q.createdAt, updatedAt: q.updatedAt, refCode: q.refCode, needDate: q.needDate };
}

/* ------------------------------------------------------------
 *  ป้ายหน้าห้อง (เปิดบนแท็บเล็ต/ทีวีหน้าห้อง: ?view=display&room=ID)
 * ------------------------------------------------------------ */

function getDisplay(roomId) {
  var room = getRow_('Rooms', roomId);
  if (!room || !isTrue_(room.active)) throw new Error('ไม่พบห้อง');
  var today = todayIso_(), r = rules_();
  var items = readTable_('Bookings').filter(function (b) {
    return b.roomId === room.id && b.date === today && ['approved', 'checkedin', 'completed'].indexOf(b.status) !== -1;
  }).sort(function (a, b) { return a.start.localeCompare(b.start); }).map(function (b) {
    return { start: b.start, end: b.end, label: b.title || PURPOSES[b.purpose], course: b.course, who: r.showNames ? b.name : USER_TYPES[b.userType], status: b.status };
  });
  var closed = slotProblem_(room.id, today, '00:00', '23:59', '__none__', 0);
  return { room: publicRoom_(room), today: today, todayText: thaiDate_(today), now: nowLocal_(), items: items, closed: /ปิด/.test(closed) ? closed : '' };
}

/* ------------------------------------------------------------
 *  อีเมลแจ้งเตือน (ปิดได้ที่ ตั้งค่า › การแจ้งเตือน)
 * ------------------------------------------------------------ */

function mailEnabled_() { var s = getSettings_(); return s.mailEnabled === undefined || s.mailEnabled === '' ? true : isTrue_(s.mailEnabled); }

function sendMail_(to, subject, html) {
  if (!to || !mailEnabled_()) return false;
  try {
    var s = getSettings_();
    MailApp.sendEmail({ to: to, subject: '[' + (s.appName || APP_NAME) + '] ' + subject, htmlBody: html, name: s.appName || APP_NAME, replyTo: validEmail_(s.email) ? s.email : undefined });
    return true;
  } catch (err) { Logger.log('ส่งอีเมลไม่สำเร็จ: ' + err); return false; }
}

function notifyStaff_(subject, html) {
  var s = getSettings_();
  var to = String(s.notifyEmails || '').split(/[,\s;]+/).filter(validEmail_).join(',');
  var base = publicConfig_().baseUrl;
  if (to) sendMail_(to, subject, mailFrame_(subject, html + (base ? '<p><a href="' + esc_(base) + '#admin">เปิดระบบหลังบ้าน</a></p>' : '')));
}

function mailFrame_(title, body) {
  var s = getSettings_();
  return '<div style="font-family:Tahoma,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">' +
    '<div style="background:#1f1f2b;color:#fff;padding:14px 18px;font-size:17px"><b>' + esc_(s.appName || APP_NAME) + '</b><br><span style="font-size:12px;opacity:.8">' + esc_(s.org || '') + '</span></div>' +
    '<div style="padding:18px;line-height:1.7;color:#222"><h3 style="color:#c2185b;margin-top:0">' + esc_(title) + '</h3>' + body + '</div>' +
    '<div style="background:#faf5f8;padding:10px 18px;font-size:12px;color:#777">โทร ' + esc_(s.phone || '-') + ' · ' + esc_(s.email || '') + '</div></div>';
}

function bookingMailBody_(b) {
  var room = getRow_('Rooms', b.roomId) || {};
  var base = publicConfig_().baseUrl;
  return '<table style="border-collapse:collapse;font-size:14px">' +
    [['รหัสการจอง', '<b style="font-size:18px">' + b.code + '</b>'], ['สถานะ', '<b>' + (BOOKING_STATUS[b.status] || b.status) + '</b>'], ['ห้อง', esc_(room.name)],
      ['วันที่', esc_(thaiDate_(b.date))], ['เวลา', b.start + '–' + b.end + ' น.'], ['หัวข้อ', esc_(b.title)], ['ผู้จอง', esc_(b.name)]]
      .map(function (r) { return '<tr><td style="padding:4px 12px 4px 0;color:#777">' + r[0] + '</td><td style="padding:4px 0">' + r[1] + '</td></tr>'; }).join('') + '</table>' +
    (b.staffNote ? '<p style="background:#fff6e0;padding:8px 12px;border-radius:8px">หมายเหตุจากเจ้าหน้าที่: ' + esc_(b.staffNote) + '</p>' : '') +
    (b.videoUrl ? '<p>ไฟล์วิดีโอการสอน: <a href="' + esc_(b.videoUrl) + '">' + esc_(b.videoUrl) + '</a></p>' : '') +
    (base ? '<p><a href="' + esc_(base) + '?view=status&code=' + encodeURIComponent(b.code) + '" style="background:#c2185b;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none">ตรวจสอบ / ยกเลิกการจอง</a></p>' : '<p>ตรวจสอบหรือยกเลิกได้ที่เมนู “ตรวจสอบสถานะ” บนเว็บไซต์</p>');
}

function notifyNewBooking_(b) {
  if (b.email) sendMail_(b.email, (b.status === 'approved' ? 'ยืนยันการจองห้อง ' : 'รับคำขอจองห้อง ') + b.code,
    mailFrame_(b.status === 'approved' ? 'การจองของท่านได้รับการยืนยันแล้ว' : 'ระบบได้รับคำขอจองห้องแล้ว (รอเจ้าหน้าที่อนุมัติ)', bookingMailBody_(b)));
  notifyStaff_('คำขอจองห้องใหม่ ' + b.code, bookingMailBody_(b) + '<p>ผู้จอง: ' + esc_(b.name) + ' (' + esc_(USER_TYPES[b.userType]) + ') · ' + esc_(b.phone) + '</p>');
}

function notifyStatus_(b) {
  if (!b.email) return;
  var t = { approved: 'การจองได้รับการอนุมัติแล้ว', rejected: 'การจองไม่ได้รับการอนุมัติ', cancelled: 'การจองถูกยกเลิก', completed: 'ขอบคุณที่ใช้บริการ — เชิญประเมินความพึงพอใจ' }[b.status];
  if (!t) return;
  sendMail_(b.email, t + ' (' + b.code + ')', mailFrame_(t, bookingMailBody_(b)));
}

/** ส่งอีเมลเตือนผู้จองที่ใช้ห้องพรุ่งนี้ (ตั้งเวลาด้วย installDailyReminder) */
function sendDailyReminders() {
  var tomorrow = addDays_(todayIso_(), 1), n = 0;
  readTable_('Bookings').forEach(function (b) {
    if (b.date === tomorrow && b.status === 'approved' && b.email) {
      if (sendMail_(b.email, 'เตือน: พรุ่งนี้มีการใช้ห้อง ' + b.start + ' น. (' + b.code + ')', mailFrame_('เตือนการใช้ห้องพรุ่งนี้',
        bookingMailBody_(b) + '<p>กรุณามาถึงก่อนเวลา 10 นาที แสดงรหัสการจองกับเจ้าหน้าที่ และเตรียมแฟลชไดรฟ์/บัญชี Google Drive สำหรับรับไฟล์วิดีโอ</p>'))) n++;
    }
  });
  Logger.log('ส่งอีเมลเตือน ' + n + ' รายการ');
  return n;
}

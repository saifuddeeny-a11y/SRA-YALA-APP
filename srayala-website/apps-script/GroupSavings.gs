/**
 * ============================================================
 *  ระบบออมทรัพย์กลุ่มอาชีพ (กองทุนกลางของแต่ละกลุ่ม)
 * ------------------------------------------------------------
 *  แยกจากบัญชีรายบุคคลของสมาชิก (Transactions) — ใช้ฐานข้อมูลเดียวกัน
 *    - GroupTransactions  รายรับ-รายจ่ายของกองทุนกลุ่ม
 *                         (เงินสัจจะสมาชิก รายได้จากการขาย เงินสนับสนุน ค่าวัตถุดิบ ฯลฯ)
 *    - Groups             เพิ่มคอลัมน์ savingsGoal, monthlyShare, treasurerId, savingsPublic
 *
 *  ผู้ใช้งาน
 *    - สมาชิก     : ดูยอดกองทุนกลุ่มของตน, ดูเงินสัจจะที่ตนส่ง, แจ้งส่งเงินสัจจะพร้อมสลิป
 *    - เหรัญญิกกลุ่ม : (สมาชิกที่ตั้งไว้ใน treasurerId) แจ้งรายรับ-รายจ่ายของกลุ่ม และดูการส่งเงินสัจจะของทุกคน
 *    - เจ้าหน้าที่  : บันทึก / อนุมัติ / แก้ไข / ลบรายการ และตั้งค่ากองทุนกลุ่มที่หลังบ้าน
 * ============================================================
 */

/** หมวดรายการเงินของกลุ่ม แยกตามประเภท ฝาก(รายรับ) / ถอน(รายจ่าย) */
var GTX_CATS = {
  deposit: {
    share: 'เงินสัจจะสมาชิก',
    income: 'รายได้จากการขายผลผลิต',
    support: 'เงินสนับสนุน / บริจาค',
    repay: 'รับคืนเงินยืม',
    other: 'รายรับอื่น ๆ'
  },
  withdraw: {
    expense: 'ค่าวัตถุดิบ / ต้นทุนการผลิต',
    lend: 'ให้สมาชิกยืม',
    welfare: 'สวัสดิการสมาชิก',
    dividend: 'ปันผลคืนสมาชิก',
    other: 'รายจ่ายอื่น ๆ'
  }
};

function gtxCatValid_(type, cat) {
  return !!(GTX_CATS[type] && GTX_CATS[type][cat]);
}

/** ยอดกองทุนกลุ่ม (นับเฉพาะรายการที่อนุมัติแล้ว) */
function computeGroupBalance_(txs) {
  var out = { deposit: 0, withdraw: 0, balance: 0, pending: 0, pendingCount: 0, count: 0, cats: { deposit: {}, withdraw: {} } };
  (txs || []).forEach(function (t) {
    var amt = parseAmount_(t.amount); if (isNaN(amt)) return;
    var st = t.status || 'approved';
    var type = t.type === 'withdraw' ? 'withdraw' : 'deposit';
    if (st === 'pending') { out.pendingCount++; if (type === 'deposit') out.pending += amt; return; }
    if (st !== 'approved') return;
    out.count++;
    out[type] += amt;
    out.cats[type][t.category || 'other'] = (out.cats[type][t.category || 'other'] || 0) + amt;
  });
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  out.deposit = r2(out.deposit); out.withdraw = r2(out.withdraw); out.pending = r2(out.pending);
  out.balance = r2(out.deposit - out.withdraw);
  ['deposit', 'withdraw'].forEach(function (k) { Object.keys(out.cats[k]).forEach(function (c) { out.cats[k][c] = r2(out.cats[k][c]); }); });
  return out;
}

/** เงินสัจจะที่สมาชิกแต่ละคนส่ง { memberId: { total, months: { 'yyyy-MM': n } } } */
function shareByMember_(txs) {
  var out = {};
  (txs || []).forEach(function (t) {
    if ((t.status || 'approved') !== 'approved' || t.type === 'withdraw' || t.category !== 'share' || !t.memberId) return;
    var amt = parseAmount_(t.amount); if (isNaN(amt)) return;
    var o = out[t.memberId] = out[t.memberId] || { total: 0, months: {} };
    var ym = String(t.date || '').substr(0, 7);
    o.total = Math.round((o.total + amt) * 100) / 100;
    if (ym) o.months[ym] = Math.round(((o.months[ym] || 0) + amt) * 100) / 100;
  });
  return out;
}

function sortByDateDesc_(list) {
  return list.sort(function (a, b) {
    var d = String(b.date || '').localeCompare(String(a.date || ''));
    return d !== 0 ? d : String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

/** สร้างคอลัมน์ใหม่ของ Groups ถ้ายังไม่มี (กรณีอัปเดตโค้ดแล้วยังไม่ได้รัน setup ซ้ำ) */
function ensureGroupSavingsColumns_() {
  var sh = db_().getSheetByName('Groups');
  if (!sh) return;
  var head = headers_(sh);
  if (['savingsGoal', 'monthlyShare', 'treasurerId', 'savingsPublic'].some(function (c) { return head.indexOf(c) === -1; })) ensureSheet_(db_(), 'Groups');
}

/* ------------------------------------------------------------
 *  ข้อมูลสาธารณะ (หน้าเว็บ › กลุ่มอาชีพ) — เฉพาะกลุ่มที่เปิด “แสดงยอดเงินออมบนหน้าเว็บ”
 * ------------------------------------------------------------ */
function publicGroupSavings_(groups) {
  var shown = (groups || []).filter(function (g) { return isTrue_(g.savingsPublic); });
  if (!shown.length) return {};
  var txs = readTable_('GroupTransactions'), members = readTable_('Members');
  var out = {};
  shown.forEach(function (g) {
    var b = computeGroupBalance_(txs.filter(function (t) { return t.groupId === g.id; }));
    out[g.id] = {
      balance: b.balance, deposit: b.deposit, withdraw: b.withdraw,
      goal: parseAmount_(g.savingsGoal) || 0, monthlyShare: parseAmount_(g.monthlyShare) || 0,
      savers: members.filter(function (m) { return m.groupId === g.id && isTrue_(m.active); }).length
    };
  });
  return out;
}

/* ------------------------------------------------------------
 *  ข้อมูลกลุ่มสำหรับหน้าสมาชิก (เรียกจาก memberGetData)
 * ------------------------------------------------------------ */
function memberGroupData_(m) {
  if (!m.groupId) return null;
  var g = getRow_('Groups', m.groupId);
  if (!g) return null;
  var isTreasurer = !!g.treasurerId && g.treasurerId === m.id;
  var all = readTable_('GroupTransactions').filter(function (t) { return t.groupId === g.id; });
  var members = readTable_('Members').filter(function (x) { return x.groupId === g.id; });
  var names = {};
  members.forEach(function (x) { names[x.id] = x.name; });
  var share = shareByMember_(all);

  // สมาชิกทั่วไปเห็นรายการที่อนุมัติแล้ว + รายการที่ตนแจ้งเอง / เหรัญญิกเห็นทั้งหมด
  var visible = all.filter(function (t) {
    return isTreasurer || (t.status || 'approved') === 'approved' || t.memberId === m.id || t.recordedBy === 'member:' + m.memberNo;
  });
  var txs = sortByDateDesc_(visible).slice(0, 200).map(function (t) {
    var mine = t.memberId === m.id;
    return {
      id: t.id, date: t.date, type: t.type === 'withdraw' ? 'withdraw' : 'deposit', category: t.category, amount: t.amount,
      note: t.note, status: t.status || 'approved', hasSlip: !!t.slipFileId, mine: mine,
      memberName: t.memberId && (isTreasurer || mine) ? (names[t.memberId] || '') : ''
    };
  });
  var myPending = all.filter(function (t) { return t.status === 'pending' && t.memberId === m.id && t.category === 'share'; })
    .reduce(function (s, t) { return s + (parseAmount_(t.amount) || 0); }, 0);

  var out = {
    group: {
      id: g.id, name: g.name, shortName: g.shortName, icon: g.icon, location: g.location,
      savingsGoal: parseAmount_(g.savingsGoal) || 0, monthlyShare: parseAmount_(g.monthlyShare) || 0,
      treasurerName: g.treasurerId ? (names[g.treasurerId] || '') : ''
    },
    isTreasurer: isTreasurer,
    balance: computeGroupBalance_(all),
    memberCount: members.filter(function (x) { return isTrue_(x.active); }).length,
    mine: { total: (share[m.id] || {}).total || 0, months: (share[m.id] || {}).months || {}, pending: Math.round(myPending * 100) / 100 },
    transactions: txs,
    cats: GTX_CATS
  };
  if (isTreasurer) {
    out.members = members.filter(function (x) { return isTrue_(x.active); })
      .sort(function (a, b) { return String(a.memberNo).localeCompare(String(b.memberNo)); })
      .map(function (x) { return { id: x.id, memberNo: x.memberNo, name: x.name, total: (share[x.id] || {}).total || 0, months: (share[x.id] || {}).months || {} }; });
  }
  return out;
}

/**
 * สมาชิกแจ้งรายการเงินของกลุ่ม → สถานะ “รอตรวจสอบ” (เจ้าหน้าที่อนุมัติที่หลังบ้าน)
 *  - สมาชิกทั่วไป : แจ้งส่งเงินสัจจะของตนเองเท่านั้น
 *  - เหรัญญิกกลุ่ม : แจ้งรายรับ/รายจ่ายได้ทุกหมวด และระบุสมาชิกผู้ส่งเงินสัจจะได้
 * payload = { type, category, memberId, amount, date, note, slip: { name, mimeType, data } }
 */
function memberNotifyGroupTransaction(token, payload) {
  var m = requireMember_(token);
  var settings = getSettings_();
  if (settings.memberDepositNotice === 'FALSE') throw new Error('ปิดการแจ้งเงินออนไลน์ชั่วคราว กรุณาติดต่อเจ้าหน้าที่');
  if (!m.groupId) throw new Error('บัญชีของคุณยังไม่ได้อยู่ในกลุ่มอาชีพ กรุณาติดต่อเจ้าหน้าที่');
  var g = getRow_('Groups', m.groupId);
  if (!g) throw new Error('ไม่พบกลุ่มอาชีพของคุณ');
  var isTreasurer = !!g.treasurerId && g.treasurerId === m.id;
  payload = payload || {};

  var type = 'deposit', category = 'share', memberId = m.id;
  if (isTreasurer) {
    type = payload.type === 'withdraw' ? 'withdraw' : 'deposit';
    category = String(payload.category || (type === 'deposit' ? 'share' : ''));
    if (!gtxCatValid_(type, category)) throw new Error('กรุณาเลือกหมวดรายการ');
    memberId = '';
    if (payload.memberId) {
      var who = getRow_('Members', payload.memberId);
      if (!who || who.groupId !== g.id) throw new Error('สมาชิกที่เลือกไม่ได้อยู่ในกลุ่มนี้');
      memberId = who.id;
    } else if (category === 'share') {
      memberId = m.id;
    }
  }
  var amount = parseAmount_(payload.amount);
  if (!(amount > 0)) throw new Error('กรุณากรอกจำนวนเงินให้ถูกต้อง');
  if (amount > 1000000) throw new Error('จำนวนเงินต่อครั้งสูงเกินกำหนด กรุณาติดต่อเจ้าหน้าที่');
  var date = normDate_(payload.date) || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');

  var pending = readTable_('GroupTransactions').filter(function (t) { return t.status === 'pending' && t.recordedBy === 'member:' + m.memberNo; }).length;
  if (pending >= 30) throw new Error('มีรายการรอตรวจสอบจำนวนมาก กรุณารอเจ้าหน้าที่ตรวจสอบก่อน');

  var slip = saveSlip_(payload.slip, 'group-' + String(m.memberNo).replace(/[^a-zA-Z0-9_-]/g, ''), date);
  var now = nowIso_();
  var rec = {
    id: newId_(), groupId: g.id, date: date, type: type, category: category, amount: String(amount), memberId: memberId,
    note: String(payload.note || '').trim().substr(0, 300), slipFileId: slip.slipFileId, slipUrl: slip.slipUrl,
    status: 'pending', recordedBy: 'member:' + m.memberNo, createdAt: now, updatedAt: now
  };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { insertRow_('GroupTransactions', rec); } finally { lock.releaseLock(); }

  if (settings.notifyEmail) {
    try {
      MailApp.sendEmail({
        to: settings.notifyEmail,
        subject: '[' + (settings.siteName || 'SRA YALA') + '] แจ้งเงินกองทุนกลุ่ม: ' + g.name,
        body: 'กลุ่ม: ' + g.name + '\nผู้แจ้ง: ' + m.memberNo + ' ' + m.name + (isTreasurer ? ' (เหรัญญิก)' : '') +
          '\nรายการ: ' + (type === 'withdraw' ? 'รายจ่าย' : 'รายรับ') + ' · ' + GTX_CATS[type][category] +
          '\nจำนวน: ' + amount.toLocaleString() + ' บาท\nวันที่: ' + date + '\nหมายเหตุ: ' + rec.note +
          '\n\nตรวจสอบและอนุมัติได้ที่หลังบ้าน › เงินออมกลุ่มอาชีพ'
      });
    } catch (err) { }
  }
  return { ok: true, id: rec.id };
}

/* ------------------------------------------------------------
 *  ADMIN API — เงินออมกลุ่มอาชีพ
 * ------------------------------------------------------------ */

/** ตั้งค่ากองทุนของกลุ่ม: เป้าหมาย, เงินสัจจะต่อเดือน, เหรัญญิก, แสดงยอดบนหน้าเว็บ */
function adminSaveGroupSavings(token, groupId, s) {
  var user = requireAuth_(token);
  s = s || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    ensureGroupSavingsColumns_();
    var g = getRow_('Groups', groupId);
    if (!g) throw new Error('ไม่พบกลุ่มอาชีพ');
    var treasurerId = String(s.treasurerId || '');
    if (treasurerId) {
      var t = getRow_('Members', treasurerId);
      if (!t || t.groupId !== g.id) throw new Error('เหรัญญิกต้องเป็นสมาชิกของกลุ่มนี้');
    }
    var saved = updateRow_('Groups', {
      id: g.id, savingsGoal: goal_(s.savingsGoal), monthlyShare: goal_(s.monthlyShare),
      treasurerId: treasurerId, savingsPublic: isTrue_(s.savingsPublic) ? 'TRUE' : 'FALSE', updatedAt: nowIso_()
    });
    clearPublicCache_();
    logAction_(user, 'update group savings', g.name);
    return fill_('Groups', saved);
  } finally {
    lock.releaseLock();
  }
}

function validateGroupTx_(all, t, status, amount) {
  if (t.type === 'withdraw' && status === 'approved') {
    var others = all.filter(function (x) { return x.groupId === t.groupId && x.id !== t.id; });
    var bal = computeGroupBalance_(others).balance;
    if (amount > bal + 0.001) throw new Error('ยอดรายจ่ายเกินยอดคงเหลือของกองทุนกลุ่ม (คงเหลือ ' + bal.toLocaleString() + ' บาท)');
  }
}

/** เพิ่ม/แก้ไขรายการเงินของกลุ่ม (เจ้าหน้าที่บันทึก = อนุมัติทันที ถ้าไม่ระบุสถานะ) */
function adminSaveGroupTransaction(token, t) {
  var user = requireAuth_(token);
  t = t || {};
  var g = getRow_('Groups', t.groupId);
  if (!g) throw new Error('กรุณาเลือกกลุ่มอาชีพ');
  var type = t.type === 'withdraw' ? 'withdraw' : t.type === 'deposit' ? 'deposit' : '';
  if (!type) throw new Error('กรุณาเลือกประเภท รายรับ/รายจ่าย');
  if (!gtxCatValid_(type, t.category)) throw new Error('กรุณาเลือกหมวดรายการ');
  var amount = parseAmount_(t.amount);
  if (!(amount > 0)) throw new Error('จำนวนเงินต้องมากกว่า 0');
  var date = normDate_(t.date);
  if (!date) throw new Error('กรุณาระบุวันที่');
  var memberId = String(t.memberId || '');
  if (memberId) {
    var who = getRow_('Members', memberId);
    if (!who) throw new Error('ไม่พบสมาชิกที่เลือก');
  }
  if (t.category === 'share' && type === 'deposit' && !memberId) throw new Error('เงินสัจจะต้องระบุสมาชิกผู้ส่ง');
  var status = TX_STATUS.indexOf(t.status) !== -1 ? t.status : 'approved';

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var all = readTable_('GroupTransactions');
    var old = t.id ? all.filter(function (x) { return x.id === t.id; })[0] : null;
    validateGroupTx_(all, { id: old ? old.id : '', groupId: g.id, type: type }, status, amount);
    var now = nowIso_();
    var rec = {
      groupId: g.id, date: date, type: type, category: t.category, amount: String(amount), memberId: memberId,
      note: String(t.note || '').trim().substr(0, 300), status: status, updatedAt: now
    };
    var saved;
    if (old) {
      rec.id = old.id;
      saved = updateRow_('GroupTransactions', rec);
    } else {
      rec.id = newId_(); rec.slipFileId = ''; rec.slipUrl = ''; rec.recordedBy = user.username; rec.createdAt = now;
      saved = insertRow_('GroupTransactions', fill_('GroupTransactions', rec));
    }
    clearPublicCache_();
    logAction_(user, (old ? 'update' : 'create') + ' group transaction', g.name + ' ' + (type === 'withdraw' ? 'รายจ่าย' : 'รายรับ') + ' ' + amount + ' (' + t.category + ')');
    return fill_('GroupTransactions', saved);
  } finally {
    lock.releaseLock();
  }
}

/** อนุมัติ / ไม่อนุมัติ รายการที่สมาชิกหรือเหรัญญิกแจ้ง */
function adminSetGroupTransactionStatus(token, id, status) {
  var user = requireAuth_(token);
  if (TX_STATUS.indexOf(status) === -1) throw new Error('สถานะไม่ถูกต้อง');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var all = readTable_('GroupTransactions');
    var t = all.filter(function (x) { return x.id === id; })[0];
    if (!t) throw new Error('ไม่พบรายการ');
    validateGroupTx_(all, t, status, parseAmount_(t.amount));
    var saved = updateRow_('GroupTransactions', { id: id, status: status, updatedAt: nowIso_() });
    clearPublicCache_();
    logAction_(user, 'group transaction ' + status, id);
    return fill_('GroupTransactions', saved);
  } finally {
    lock.releaseLock();
  }
}

function adminDeleteGroupTransaction(token, id) {
  var user = requireAuth_(token);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var t = getRow_('GroupTransactions', id);
    if (!t) return false;
    deleteRow_('GroupTransactions', id);
    clearPublicCache_();
    logAction_(user, 'delete group transaction', t.groupId + ' ' + t.type + ' ' + t.amount);
    return true;
  } finally {
    lock.releaseLock();
  }
}

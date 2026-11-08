/**
 * ============================================================
 *  API — ฟังก์ชันที่หน้าแอปเรียกผ่าน google.script.run
 *  (ฟังก์ชันที่ลงท้ายด้วย _ เรียกจากหน้าเว็บไม่ได้)
 *  ทุกคำสั่งตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์:
 *    admin   = ทุกกลุ่ม
 *    officer = เฉพาะกลุ่มของตน
 *    member  = เฉพาะข้อมูลของตนเอง (ดูยอด, คลินิกแก้หนี้, แชตบอต)
 * ============================================================
 */

/* ------------------------------------------------------------
 *  สิทธิ์
 * ------------------------------------------------------------ */
function canGroup_(s, groupId) { return s.role === 'admin' || (s.role === 'officer' && !!s.groupId && s.groupId === groupId); }

function memberFor_(s, memberId) {
  var m = getRow_('Members', memberId);
  if (!m) throw new Error('ไม่พบสมาชิก');
  if (s.role === 'member' ? m.id !== s.id : !canGroup_(s, m.groupId)) throw new Error('ไม่มีสิทธิ์จัดการข้อมูลสมาชิกนี้');
  return m;
}

function stripMember_(m) {
  var c = {};
  Object.keys(m).forEach(function (k) { if (k !== 'pinHash' && k !== 'salt') c[k] = m[k]; });
  c.hasPin = !!m.pinHash;
  return c;
}

function stripUser_(u) {
  var c = {};
  Object.keys(u).forEach(function (k) { if (k !== 'passwordHash' && k !== 'salt') c[k] = u[k]; });
  return c;
}

function byOrder_(a, b) {
  var d = (Number(a.order) || 0) - (Number(b.order) || 0);
  return d || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
}

/* ------------------------------------------------------------
 *  การคำนวณ
 * ------------------------------------------------------------ */
function savingsBalance_(rows, memberId, excludeId) {
  return rows.reduce(function (s, t) {
    if (t.memberId !== memberId || t.id === excludeId) return s;
    var a = num_(t.amount) || 0;
    return s + (t.type === 'withdraw' ? -a : a);
  }, 0);
}

/** ยอดหนี้คงเหลือของแต่ละรายการ { debtId: { paid, outstanding } } */
function debtStatus_(debts, payments) {
  var paid = {};
  payments.forEach(function (p) { paid[p.debtId] = (paid[p.debtId] || 0) + (num_(p.amount) || 0); });
  var out = {};
  debts.forEach(function (d) {
    var pr = num_(d.principal) || 0, pd = Math.round((paid[d.id] || 0) * 100) / 100;
    out[d.id] = { paid: pd, outstanding: Math.max(0, Math.round((pr - pd) * 100) / 100) };
  });
  return out;
}

function lastMonths_(n) {
  var out = [], d = new Date();
  d.setDate(1);
  for (var i = n - 1; i >= 0; i--) {
    var x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2));
  }
  return out;
}

/**
 * แดชบอร์ดภาพรวมกลุ่มอาชีพ (ตัวเลขรวม ไม่มีข้อมูลรายบุคคล)
 * groupIds = null → ทุกกลุ่ม
 */
function dashboard_(groupIds) {
  var groups = readTable_('Groups').sort(byOrder_).filter(function (g) { return !groupIds || groupIds.indexOf(g.id) !== -1; });
  var members = readTable_('Members'), savings = readTable_('Savings'), ledger = readTable_('Ledger');
  var debts = readTable_('Debts'), payments = readTable_('DebtPayments');
  var months = lastMonths_(12), ym = months[months.length - 1];
  var memberGroup = {};
  members.forEach(function (m) { memberGroup[m.id] = m.groupId; });
  var ds = debtStatus_(debts, payments);
  var blank = function () { var o = {}; ['dep', 'wd', 'inc', 'exp'].forEach(function (k) { o[k] = months.map(function () { return 0; }); }); return o; };
  var byGroup = {}, all = blank(), stat = {};
  groups.forEach(function (g) {
    byGroup[g.id] = blank();
    stat[g.id] = { id: g.id, name: g.name, icon: g.icon, active: isTrue_(g.active) || g.active === '', monthlyShare: num_(g.monthlyShare) || 0, goal: num_(g.savingsGoal) || 0,
      members: 0, savings: 0, depMonth: 0, wdMonth: 0, income: 0, expense: 0, fund: 0, debt: 0, debtors: 0, counsel: 0 };
  });
  members.forEach(function (m) { if (stat[m.groupId] && isTrue_(m.active)) stat[m.groupId].members++; });
  var put = function (gid, key, date, amt) {
    var i = months.indexOf(String(date).substr(0, 7));
    if (i === -1) return;
    all[key][i] += amt;
    if (byGroup[gid]) byGroup[gid][key][i] += amt;
  };
  savings.forEach(function (t) {
    var gid = memberGroup[t.memberId], st = stat[gid], a = num_(t.amount) || 0, w = t.type === 'withdraw';
    if (!st) return;
    st.savings += w ? -a : a;
    if (String(t.date).substr(0, 7) === ym) { if (w) st.wdMonth += a; else st.depMonth += a; }
    put(gid, w ? 'wd' : 'dep', t.date, a);
  });
  ledger.forEach(function (t) {
    var st = stat[t.groupId], a = num_(t.amount) || 0, e = t.type === 'expense';
    if (!st) return;
    if (e) st.expense += a; else st.income += a;
    put(t.groupId, e ? 'exp' : 'inc', t.date, a);
  });
  var debtors = {};
  debts.forEach(function (d) {
    var gid = memberGroup[d.memberId], st = stat[gid];
    if (!st || d.status === 'closed') return;
    var o = (ds[d.id] || {}).outstanding || 0;
    if (!o) return;
    st.debt += o;
    if (!debtors[d.memberId]) { debtors[d.memberId] = 1; st.debtors++; }
  });
  readTable_('Counsel').forEach(function (c) { var st = stat[memberGroup[c.memberId]]; if (st) st.counsel++; });
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var list = groups.map(function (g) {
    var s = stat[g.id];
    s.fund = r2(s.income - s.expense);
    ['savings', 'depMonth', 'wdMonth', 'income', 'expense', 'debt'].forEach(function (k) { s[k] = r2(s[k]); });
    return s;
  });
  var tot = { groups: list.length, members: 0, savings: 0, depMonth: 0, wdMonth: 0, fund: 0, income: 0, expense: 0, debt: 0, debtors: 0 };
  list.forEach(function (s) { Object.keys(tot).forEach(function (k) { if (k !== 'groups') tot[k] = r2(tot[k] + s[k]); }); });
  return { months: months, groups: list, totals: tot, trend: all, trendByGroup: byGroup };
}

/* ------------------------------------------------------------
 *  โหลดข้อมูลทั้งหมดตามสิทธิ์
 * ------------------------------------------------------------ */
function getAll(token) {
  var s = requireSession_(token);
  var out = { user: s, config: publicConfig_(), cats: LEDGER_CATS, debtKinds: DEBT_KINDS, today: todayIso_() };
  var groups = readTable_('Groups').sort(byOrder_);
  var members = readTable_('Members');
  var inGroup = function (gid) { return s.role === 'admin' || gid === s.groupId; };
  var memberIds = {};
  members.forEach(function (m) { if (s.role === 'member' ? m.id === s.id : inGroup(m.groupId)) memberIds[m.id] = true; });
  var mine = function (r) { return !!memberIds[r.memberId]; };

  out.groups = s.role === 'member' ? groups.filter(function (g) { return g.id === s.groupId; }) : groups;
  out.members = members.filter(function (m) { return memberIds[m.id]; }).map(stripMember_);
  out.savings = readTable_('Savings').filter(mine);
  out.debts = readTable_('Debts').filter(mine);
  out.payments = readTable_('DebtPayments').filter(mine);
  out.counsel = readTable_('Counsel').filter(mine);
  out.ledger = s.role === 'member' ? [] : readTable_('Ledger').filter(function (t) { return inGroup(t.groupId); });
  out.faq = readTable_('FAQ').sort(byOrder_);
  out.dashboard = dashboard_(s.role === 'admin' ? null : (s.role === 'officer' && !s.groupId ? [] : (s.role === 'member' ? [s.groupId] : null)));
  if (s.role === 'admin') {
    out.users = readTable_('Users').map(stripUser_);
    var st = getSettings_();
    out.settings = st;
    out.aiKeySet = !!PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    out.chatLog = readTable_('ChatLog').slice(-200).reverse();
    try { out.dbUrl = db_().getUrl(); } catch (err) { out.dbUrl = ''; }
  }
  return out;
}

/* ------------------------------------------------------------
 *  บันทึก / ลบ (ตัวกลาง)
 * ------------------------------------------------------------ */
function saveRecord(token, table, rec) {
  var s = requireSession_(token);
  rec = rec || {};
  var fn = SAVE_[table];
  if (!fn) throw new Error('ไม่อนุญาตให้บันทึกตาราง ' + table);
  withLock_(function () { fn(s, rec); });
  return getAll(token);
}

function deleteRecord(token, table, id) {
  var s = requireSession_(token);
  var fn = DELETE_[table];
  if (!fn) throw new Error('ไม่อนุญาตให้ลบจากตาราง ' + table);
  withLock_(function () {
    var row = getRow_(table, id);
    if (!row) return;
    fn(s, row);
    deleteRow_(table, id);
  });
  return getAll(token);
}

function stamp_(s) { return s.role === 'member' ? 'member:' + s.memberNo : s.username; }

var SAVE_ = {
  Groups: function (s, r) {
    if (s.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
    var name = text_(r.name, 120);
    if (!name) throw new Error('กรุณากรอกชื่อกลุ่ม');
    var now = nowIso_(), old = r.id ? getRow_('Groups', r.id) : null;
    var rec = { name: name, icon: text_(r.icon, 8), location: text_(r.location, 200), description: text_(r.description, 1000),
      monthlyShare: amountOrBlank_(r.monthlyShare), savingsGoal: amountOrBlank_(r.savingsGoal), active: isTrue_(r.active) || r.active === undefined ? 'TRUE' : 'FALSE', updatedAt: now };
    if (old) { rec.id = old.id; updateRow_('Groups', rec); }
    else { rec.id = newId_(); rec.order = String(readTable_('Groups').length + 1); rec.createdAt = now; insertRow_('Groups', rec); }
  },

  Members: function (s, r) {
    if (s.role === 'member') throw new Error('ไม่มีสิทธิ์');
    var memberNo = text_(r.memberNo, 30), name = text_(r.name, 150);
    if (!memberNo || !/^[A-Za-z0-9ก-๙._\/-]{1,30}$/.test(memberNo)) throw new Error('รหัสสมาชิกใช้ได้เฉพาะตัวอักษร ตัวเลข และ . _ - / (ไม่เกิน 30 ตัว)');
    if (!name) throw new Error('กรุณากรอกชื่อ-นามสกุล');
    var groupId = s.role === 'officer' ? s.groupId : String(r.groupId || '');
    if (!groupId || !getRow_('Groups', groupId)) throw new Error('กรุณาเลือกกลุ่มอาชีพ');
    var old = r.id ? getRow_('Members', r.id) : null;
    if (old && !canGroup_(s, old.groupId)) throw new Error('ไม่มีสิทธิ์แก้ไขสมาชิกนี้');
    var dup = readTable_('Members').filter(function (m) { return String(m.memberNo).toLowerCase() === memberNo.toLowerCase() && (!old || m.id !== old.id); })[0];
    if (dup) throw new Error('รหัสสมาชิก ' + memberNo + ' มีอยู่แล้ว');
    var now = nowIso_();
    var rec = { memberNo: memberNo, name: name, phone: text_(r.phone, 40), groupId: groupId, joinDate: normDate_(r.joinDate), occupation: text_(r.occupation, 120),
      income: amountOrBlank_(r.income), expense: amountOrBlank_(r.expense), savingsGoal: amountOrBlank_(r.savingsGoal), note: text_(r.note, 500),
      active: r.active === undefined || isTrue_(r.active) ? 'TRUE' : 'FALSE', updatedAt: now };
    if (r.pin) {
      if (!/^\S{4,32}$/.test(String(r.pin))) throw new Error('PIN ต้องมีอย่างน้อย 4 ตัว (ไม่มีช่องว่าง)');
      rec.salt = Utilities.getUuid(); rec.pinHash = hashPassword_(String(r.pin), rec.salt);
    }
    if (old) { rec.id = old.id; updateRow_('Members', rec); }
    else {
      if (!r.pin) throw new Error('กรุณาตั้ง PIN เริ่มต้นให้สมาชิก');
      rec.id = newId_(); rec.createdAt = now; rec.lastLogin = ''; insertRow_('Members', rec);
    }
  },

  Savings: function (s, r) {
    if (s.role === 'member') throw new Error('สมาชิกแจ้งฝาก/ถอนกับเจ้าหน้าที่กลุ่ม');
    var m = memberFor_(s, r.memberId);
    var type = r.type === 'withdraw' ? 'withdraw' : r.type === 'deposit' ? 'deposit' : '';
    if (!type) throw new Error('กรุณาเลือก ฝาก หรือ ถอน');
    var amount = num_(r.amount);
    if (!(amount > 0)) throw new Error('จำนวนเงินต้องมากกว่า 0');
    var date = normDate_(r.date);
    if (!date) throw new Error('กรุณาระบุวันที่');
    var old = r.id ? getRow_('Savings', r.id) : null;
    if (old) memberFor_(s, old.memberId);
    if (type === 'withdraw') {
      var bal = savingsBalance_(readTable_('Savings'), m.id, old ? old.id : '');
      if (amount > bal + 0.001) throw new Error('ยอดถอนเกินเงินออมคงเหลือ (คงเหลือ ' + money_(bal) + ' บาท)');
    }
    var now = nowIso_();
    var rec = { memberId: m.id, groupId: m.groupId, date: date, type: type, amount: String(amount), note: text_(r.note), updatedAt: now };
    if (old) { rec.id = old.id; updateRow_('Savings', rec); }
    else { rec.id = newId_(); rec.recordedBy = stamp_(s); rec.createdAt = now; insertRow_('Savings', rec); }
  },

  Ledger: function (s, r) {
    if (s.role === 'member') throw new Error('ไม่มีสิทธิ์');
    var groupId = s.role === 'officer' ? s.groupId : String(r.groupId || '');
    if (!groupId || !getRow_('Groups', groupId)) throw new Error('กรุณาเลือกกลุ่มอาชีพ');
    var type = r.type === 'expense' ? 'expense' : r.type === 'income' ? 'income' : '';
    if (!type) throw new Error('กรุณาเลือก รายรับ หรือ รายจ่าย');
    if (!LEDGER_CATS[type][r.category]) throw new Error('กรุณาเลือกหมวด');
    var amount = num_(r.amount);
    if (!(amount > 0)) throw new Error('จำนวนเงินต้องมากกว่า 0');
    var date = normDate_(r.date);
    if (!date) throw new Error('กรุณาระบุวันที่');
    var old = r.id ? getRow_('Ledger', r.id) : null;
    if (old && !canGroup_(s, old.groupId)) throw new Error('ไม่มีสิทธิ์แก้ไขรายการนี้');
    var now = nowIso_();
    var rec = { groupId: groupId, date: date, type: type, category: r.category, amount: String(amount), note: text_(r.note), updatedAt: now };
    if (old) { rec.id = old.id; updateRow_('Ledger', rec); }
    else { rec.id = newId_(); rec.recordedBy = stamp_(s); rec.createdAt = now; insertRow_('Ledger', rec); }
  },

  Debts: function (s, r) {
    var old = r.id ? getRow_('Debts', r.id) : null;
    var m = memberFor_(s, old ? old.memberId : (s.role === 'member' ? s.id : r.memberId));
    var creditor = text_(r.creditor, 120);
    if (!creditor) throw new Error('กรุณาระบุเจ้าหนี้ / แหล่งเงินกู้');
    var principal = num_(r.principal);
    if (!(principal > 0)) throw new Error('กรุณาระบุยอดหนี้');
    var rate = r.rate === '' || r.rate == null ? '' : num_(r.rate);
    if (rate !== '' && (isNaN(rate) || rate < 0 || rate > 1000)) throw new Error('อัตราดอกเบี้ยไม่ถูกต้อง');
    var now = nowIso_();
    var rec = { memberId: m.id, groupId: m.groupId, creditor: creditor, kind: DEBT_KINDS[r.kind] ? r.kind : 'other', principal: String(principal),
      rate: rate === '' ? '' : String(rate), monthlyPayment: amountOrBlank_(r.monthlyPayment), startDate: normDate_(r.startDate),
      status: r.status === 'closed' ? 'closed' : 'active', note: text_(r.note, 500), updatedAt: now };
    if (old) { rec.id = old.id; updateRow_('Debts', rec); }
    else { rec.id = newId_(); rec.createdBy = stamp_(s); rec.createdAt = now; insertRow_('Debts', rec); }
  },

  DebtPayments: function (s, r) {
    var d = getRow_('Debts', r.debtId);
    if (!d) throw new Error('ไม่พบรายการหนี้');
    var m = memberFor_(s, d.memberId);
    var amount = num_(r.amount);
    if (!(amount > 0)) throw new Error('จำนวนเงินต้องมากกว่า 0');
    var date = normDate_(r.date);
    if (!date) throw new Error('กรุณาระบุวันที่');
    var pays = readTable_('DebtPayments').filter(function (p) { return p.debtId === d.id; });
    var outstanding = debtStatus_([d], pays)[d.id].outstanding;
    if (amount > outstanding + 0.001) throw new Error('ยอดชำระเกินหนี้คงเหลือ (คงเหลือ ' + money_(outstanding) + ' บาท)');
    insertRow_('DebtPayments', { id: newId_(), debtId: d.id, memberId: m.id, groupId: m.groupId, date: date, amount: String(amount), note: text_(r.note), recordedBy: stamp_(s), createdAt: nowIso_() });
    if (amount >= outstanding - 0.001) updateRow_('Debts', { id: d.id, status: 'closed', updatedAt: nowIso_() });
  },

  Counsel: function (s, r) {
    if (s.role === 'member') throw new Error('ไม่มีสิทธิ์');
    var m = memberFor_(s, r.memberId);
    var topic = text_(r.topic, 200), advice = text_(r.advice, 3000);
    if (!topic && !advice) throw new Error('กรุณากรอกหัวข้อหรือคำแนะนำ');
    var rec = { memberId: m.id, groupId: m.groupId, date: normDate_(r.date) || todayIso_(), topic: topic, advice: advice, nextDate: normDate_(r.nextDate), counselor: text_(r.counselor || s.name, 120) };
    var old = r.id ? getRow_('Counsel', r.id) : null;
    if (old) { memberFor_(s, old.memberId); rec.id = old.id; updateRow_('Counsel', rec); }
    else { rec.id = newId_(); rec.createdAt = nowIso_(); insertRow_('Counsel', rec); }
  },

  FAQ: function (s, r) {
    if (s.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
    var q = text_(r.question, 300), a = text_(r.answer, 3000);
    if (!q || !a) throw new Error('กรุณากรอกคำถามและคำตอบ');
    var rec = { question: q, answer: a, keywords: text_(r.keywords, 500), active: r.active === undefined || isTrue_(r.active) ? 'TRUE' : 'FALSE' };
    if (r.id && getRow_('FAQ', r.id)) { rec.id = r.id; updateRow_('FAQ', rec); }
    else { rec.id = newId_(); rec.order = String(readTable_('FAQ').length + 1); insertRow_('FAQ', rec); }
  },

  Users: function (s, r) {
    if (s.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
    var username = text_(r.username, 40).toLowerCase(), name = text_(r.name, 120);
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('ชื่อผู้ใช้ใช้ a-z 0-9 . _ - อย่างน้อย 3 ตัว');
    if (!name) throw new Error('กรุณากรอกชื่อ');
    var role = r.role === 'admin' ? 'admin' : 'officer';
    var groupId = role === 'officer' ? String(r.groupId || '') : '';
    if (role === 'officer' && !getRow_('Groups', groupId)) throw new Error('เจ้าหน้าที่กลุ่มต้องเลือกกลุ่มอาชีพ');
    var old = r.id ? getRow_('Users', r.id) : null;
    var dup = readTable_('Users').filter(function (u) { return u.username === username && (!old || u.id !== old.id); })[0];
    if (dup) throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
    if (old && old.id === s.id && (role !== 'admin' || r.active === 'FALSE')) throw new Error('ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตนเองได้');
    var rec = { username: username, name: name, role: role, groupId: groupId, active: r.active === undefined || isTrue_(r.active) ? 'TRUE' : 'FALSE' };
    if (r.password) {
      validatePassword_(r.password);
      rec.salt = Utilities.getUuid(); rec.passwordHash = hashPassword_(String(r.password), rec.salt);
    }
    if (old) { rec.id = old.id; updateRow_('Users', rec); }
    else {
      if (!r.password) throw new Error('กรุณาตั้งรหัสผ่านเริ่มต้น');
      rec.id = newId_(); rec.lastLogin = ''; rec.createdAt = nowIso_(); insertRow_('Users', rec);
    }
  }
};

var DELETE_ = {
  Groups: function (s, row) {
    if (s.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
    if (readTable_('Members').some(function (m) { return m.groupId === row.id; })) throw new Error('กลุ่มนี้ยังมีสมาชิก — ย้ายหรือลบสมาชิกก่อน หรือปิดใช้งานกลุ่มแทน');
    if (readTable_('Ledger').some(function (t) { return t.groupId === row.id; })) throw new Error('กลุ่มนี้มีรายการรายรับ-รายจ่าย — ปิดใช้งานกลุ่มแทนการลบ');
  },
  Members: function (s, row) {
    if (s.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบลบสมาชิกได้ (เจ้าหน้าที่กลุ่มใช้ “ระงับ” แทน)');
    var n = readTable_('Savings').filter(function (t) { return t.memberId === row.id; }).length + readTable_('Debts').filter(function (t) { return t.memberId === row.id; }).length;
    if (n) throw new Error('สมาชิกนี้มีรายการเงินหรือหนี้ ' + n + ' รายการ — แนะนำให้ “ระงับ” แทนการลบ');
  },
  Savings: function (s, row) { if (s.role === 'member') throw new Error('ไม่มีสิทธิ์'); memberFor_(s, row.memberId); },
  Ledger: function (s, row) { if (!canGroup_(s, row.groupId)) throw new Error('ไม่มีสิทธิ์'); },
  Debts: function (s, row) {
    memberFor_(s, row.memberId);
    readTable_('DebtPayments').filter(function (p) { return p.debtId === row.id; }).forEach(function (p) { deleteRow_('DebtPayments', p.id); });
  },
  DebtPayments: function (s, row) {
    memberFor_(s, row.memberId);
    var d = getRow_('Debts', row.debtId);
    if (d && d.status === 'closed') updateRow_('Debts', { id: d.id, status: 'active', updatedAt: nowIso_() });
  },
  Counsel: function (s, row) { if (s.role === 'member') throw new Error('ไม่มีสิทธิ์'); memberFor_(s, row.memberId); },
  FAQ: function (s) { if (s.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น'); },
  Users: function (s, row) {
    if (s.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
    if (row.id === s.id) throw new Error('ไม่สามารถลบบัญชีของตนเองได้');
  }
};

function amountOrBlank_(v) {
  if (v === '' || v == null) return '';
  var n = num_(v);
  return isNaN(n) || n < 0 ? '' : String(n);
}

function validatePassword_(pw) {
  pw = String(pw || '');
  if (pw.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  if (pw.length > 64) throw new Error('รหัสผ่านยาวเกินไป');
}

/* ------------------------------------------------------------
 *  บัญชีของฉัน / ตั้งค่า
 * ------------------------------------------------------------ */

/** เปลี่ยนรหัสผ่าน (เจ้าหน้าที่) หรือ PIN (สมาชิก) */
function changeSecret(token, oldValue, newValue) {
  var s = requireSession_(token);
  if (s.kind === 'member') {
    var m = getRow_('Members', s.id);
    if (hashPassword_(String(oldValue || ''), m.salt) !== m.pinHash) throw new Error('PIN เดิมไม่ถูกต้อง');
    if (!/^\S{4,32}$/.test(String(newValue || ''))) throw new Error('PIN ใหม่ต้องมีอย่างน้อย 4 ตัว (ไม่มีช่องว่าง)');
    var salt = Utilities.getUuid();
    updateRow_('Members', { id: m.id, salt: salt, pinHash: hashPassword_(String(newValue), salt), updatedAt: nowIso_() });
  } else {
    var u = getRow_('Users', s.id);
    if (hashPassword_(String(oldValue || ''), u.salt) !== u.passwordHash) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
    validatePassword_(newValue);
    var salt2 = Utilities.getUuid();
    updateRow_('Users', { id: u.id, salt: salt2, passwordHash: hashPassword_(String(newValue), salt2) });
  }
  return true;
}

/**
 * บันทึกการตั้งค่า (admin)
 * openaiKey: เก็บใน Script Properties (ไม่อยู่ในชีต และไม่ส่งกลับมาที่หน้าเว็บ) — ส่ง '-' เพื่อลบคีย์
 */
function saveSettings(token, obj) {
  requireSession_(token, ['admin']);
  obj = obj || {};
  var allowed = ['appName', 'org', 'phone', 'botName', 'aiEnabled', 'aiModel', 'chatDailyLimit', 'botExtra', 'themeColor'];
  withLock_(function () {
    allowed.forEach(function (k) { if (obj[k] !== undefined) setSetting_(k, text_(obj[k], k === 'botExtra' ? 3000 : 200)); });
    if (obj.openaiKey) {
      var props = PropertiesService.getScriptProperties();
      if (obj.openaiKey === '-') props.deleteProperty('OPENAI_API_KEY');
      else props.setProperty('OPENAI_API_KEY', String(obj.openaiKey).trim());
    }
  });
  return getAll(token);
}

/** สมาชิกแก้ข้อมูลครัวเรือนของตนเอง (รายได้ รายจ่าย อาชีพ เป้าหมายเงินออม) */
function saveMyProfile(token, p) {
  var s = requireSession_(token, ['member']);
  p = p || {};
  withLock_(function () {
    updateRow_('Members', { id: s.id, income: amountOrBlank_(p.income), expense: amountOrBlank_(p.expense), occupation: text_(p.occupation, 120), savingsGoal: amountOrBlank_(p.savingsGoal), updatedAt: nowIso_() });
  });
  return getAll(token);
}

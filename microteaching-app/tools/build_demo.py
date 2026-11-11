#!/usr/bin/env python3
"""
สร้างไฟล์ทดลองใช้ demo/index.html จากซอร์สใน apps-script/
- หน้าเว็บ = website/index.html · ฐานข้อมูลจำลองด้วยตัวจำลอง Google Apps Script/Sheets จาก srayala-website/preview/preview.html
- รันโค้ดเซิร์ฟเวอร์จริง (Code.gs, Seed.gs, Api.gs, Admin.gs) ในเบราว์เซอร์ ข้อมูลเก็บใน localStorage ของผู้ทดลอง
- มีข้อมูลตัวอย่าง (การจองย้อนหลัง/ล่วงหน้า ผลประเมิน คำร้อง) ให้ลองใช้ทันที

    python3 microteaching-app/tools/build_demo.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
REPO = os.path.dirname(APP)
SRC = os.path.join(APP, 'apps-script')
OUT = os.path.join(APP, 'demo', 'index.html')
MOCK_FROM = os.path.join(REPO, 'srayala-website', 'preview', 'preview.html')
GS_FILES = ['Code.gs', 'Seed.gs', 'Api.gs', 'Admin.gs']


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


BOOT = r"""
(function(){
  var q = {}; location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
  var isApp = q.app === '1';
  window.__QUIET = true;
  if (!PropertiesService.getScriptProperties().getProperty('SETUP_DONE')) setup();
  // ---------- ข้อมูลตัวอย่าง (เฉพาะโหมดทดลอง) ----------
  if (!readTable_('Bookings').length) {
    var now = nowIso_(), today = todayIso_(), seed = 11;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
    [['building', 'อาคารคณะครุศาสตร์ ชั้น 3 (ตัวอย่าง)'], ['phone', '073-000-000 (ตัวอย่าง)'], ['email', 'mt-room@example.com'], ['line', '@microteaching (ตัวอย่าง)'],
     ['staffText', 'อาจารย์ผู้ดูแลห้อง: ผศ.ดร.ตัวอย่าง ใจดี\nเจ้าหน้าที่ประจำห้อง: นายตัวอย่าง รักงาน (โทร 073-000-000 ต่อ 1234)'],
     ['announce', 'ช่วงสอบปลายภาค ขอให้จองล่วงหน้าอย่างน้อย 3 วัน เนื่องจากมีผู้ใช้ห้องจำนวนมาก (ข้อความตัวอย่าง)']].forEach(function (kv) { setSetting_(kv[0], kv[1]); });
    var rooms = readTable_('Rooms'), R = {};
    rooms.forEach(function (r) { R[r.code] = r; });
    var bookRooms = [R['MT-01'], R['MT-02'], R['MT-03']];
    // วันปิดห้อง
    var nextOpen = function (d) { for (var i = 0; i < 10 && [1, 2, 3, 4, 5].indexOf(dow_(d)) === -1; i++) d = addDays_(d, 1); return d; };
    var cl1 = nextOpen(addDays_(today, 9)), cl2 = nextOpen(addDays_(today, 4));
    appendRows_('Closures', [
      { id: newId_(), date: cl1, endDate: '', roomId: '', start: '', end: '', reason: 'ปิดปรับปรุงระบบไฟฟ้าอาคาร (ตัวอย่าง)', createdAt: now },
      { id: newId_(), date: cl2, endDate: '', roomId: R['MT-03'].id, start: '13:00', end: '16:30', reason: 'ซ่อมบำรุงเครื่องปรับอากาศ (ตัวอย่าง)', createdAt: now }
    ]);
    var closedAt = function (roomId, d, s, e) { return (d === cl1) || (d === cl2 && roomId === R['MT-03'].id && e > 780 && s < 990); };
    var people = [['อามีนะห์ สาและ', '64112233', 'การศึกษาปฐมวัย ปี 3'], ['อับดุลเลาะ ดอเลาะ', '64115566', 'คณิตศาสตร์ ปี 4'], ['ซูไฮลา มะลี', '65110021', 'ภาษาอังกฤษ ปี 3'],
      ['มูฮัมหมัด หะยีดาโอะ', '65110345', 'วิทยาศาสตร์ทั่วไป ปี 3'], ['นูรีซัน บือราเฮง', '64117788', 'ภาษาไทย ปี 4'], ['ฟาตีมะห์ เจ๊ะเลาะ', '66110102', 'สังคมศึกษา ปี 2'],
      ['ฮาซัน แวนิ', '64119901', 'พลศึกษา ปี 4'], ['รอฮานี อาแว', '65112244', 'การประถมศึกษา ปี 3'], ['ไซนับ ยูโซะ', '66113355', 'คอมพิวเตอร์ศึกษา ปี 2'],
      ['อิสมาแอ เปาะจิ', '64114466', 'อิสลามศึกษา ปี 4'], ['สุนิสา แก้วมณี', '65116677', 'ภาษาอังกฤษ ปี 3'], ['ธนพล ศรีสุข', '64118899', 'คณิตศาสตร์ ปี 4']];
    var lecturers = ['ผศ.ดร.สุไลมาน วาเด็ง', 'อ.ดร.นิตยา ทองดี', 'อ.รุสนี มะแซ', 'ผศ.กมล ศรีวงศ์'];
    var courses = ['1061201 วิธีวิทยาการจัดการเรียนรู้', '1063301 การจัดการเรียนรู้เฉพาะสาขา', '1064402 การเตรียมฝึกประสบการณ์วิชาชีพครู', '1062203 นวัตกรรมและเทคโนโลยีการศึกษา', '1061105 จิตวิทยาการศึกษา'];
    var topics = ['ฝึกทักษะการนำเข้าสู่บทเรียน เรื่อง ', 'ฝึกทักษะการใช้คำถาม เรื่อง ', 'ฝึกทักษะการอธิบาย เรื่อง ', 'ฝึกทักษะการเสริมกำลังใจ เรื่อง ', 'ฝึกทักษะการสรุปบทเรียน เรื่อง ', 'สอบสาธิตการสอน เรื่อง ', 'ฝึกการใช้สื่อเทคโนโลยี เรื่อง '];
    var subjects = ['ระบบสุริยะ', 'เศษส่วน', 'Present Simple Tense', 'การอ่านจับใจความ', 'วัฏจักรของน้ำ', 'ภูมิศาสตร์ภาคใต้', 'สมการเชิงเส้น', 'การออกกำลังกายเพื่อสุขภาพ', 'อัลกอริทึมเบื้องต้น', 'มารยาทในศาสนาอิสลาม'];
    var starts = [510, 540, 600, 630, 780, 810, 870, 900];
    var used = {}, rows = [], codes = {};
    var free = function (rid, d, s, e) { var k = rid + d; return !(used[k] || []).some(function (x) { return s < x[1] && e > x[0]; }); };
    var take = function (rid, d, s, e) { var k = rid + d; (used[k] = used[k] || []).push([s, e]); };
    var mkCode = function (d) { var c, y = String(Number(d.substr(0, 4)) + 543).substr(2) + d.substr(5, 2); do { c = 'MT' + y + '-'; for (var i = 0; i < 4; i++) c += 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(Math.floor(rnd() * 32)); } while (codes[c]); codes[c] = 1; return c; };
    var add = function (o) {
      var s = minutes_(o.start), e = minutes_(o.end);
      if (!free(o.roomId, o.date, s, e) || closedAt(o.roomId, o.date, s, e)) return null;
      take(o.roomId, o.date, s, e);
      o.id = newId_(); o.code = o.code || mkCode(o.date); o.createdAt = o.createdAt || new Date(new Date(o.date + 'T09:00:00+07:00').getTime() - (3 + Math.floor(rnd() * 8)) * 86400000).toISOString(); o.updatedAt = now;
      rows.push(o); return o;
    };
    // ตารางเรียนรายสัปดาห์ (อาจารย์จองทั้งภาคเรียน)
    var series = newId_();
    for (var w = -10; w <= 3; w++) {
      var tue = addDays_(today, ((2 - dow_(today)) + 7) % 7 + w * 7);
      var st = tue < today ? 'completed' : 'approved';
      add({ roomId: R['MT-02'].id, date: tue, start: '13:00', end: '16:00', title: 'คาบปฏิบัติ Micro Teaching กลุ่มเรียน 01', purpose: 'course', userType: 'lecturer', name: lecturers[1], studentId: '', faculty: 'คณะครุศาสตร์', major: '',
        phone: '0890000001', email: '', course: courses[0], advisor: lecturers[1], participants: '35', equipment: 'จออินเทอร์แอกทีฟ 75 นิ้ว, กล้องบันทึกภาพ (PTZ) ติดเพดาน', record: 'TRUE', support: 'TRUE', note: '', status: st,
        staffNote: '', videoUrl: st === 'completed' ? 'https://drive.google.com/drive/folders/EXAMPLE-COURSE' : '', series: series, source: 'staff', checkinAt: st === 'completed' ? tue + 'T05:55:00.000Z' : '', checkoutAt: st === 'completed' ? tue + 'T09:02:00.000Z' : '',
        condition: st === 'completed' ? 'ปกติ เรียบร้อย' : '', decidedBy: 'staff1', decidedAt: now, cancelReason: '' });
    }
    for (var off = -80; off <= 21; off++) {
      var d = addDays_(today, off);
      if ([1, 2, 3, 4, 5].indexOf(dow_(d)) === -1) continue;
      var n = Math.floor(rnd() * (off > 14 ? 3 : 8));
      for (var k = 0; k < n; k++) {
        var p = pick(people), rm = pick(bookRooms), s0 = pick(starts), dur = pick([60, 60, 90, 120, 120, 180]);
        var e0 = Math.min(s0 + dur, 990), status;
        var past = d < today, isToday = d === today, r = rnd();
        if (past) status = r < 0.8 ? 'completed' : r < 0.86 ? 'noshow' : r < 0.95 ? 'cancelled' : 'rejected';
        else if (isToday) status = r < 0.4 ? 'checkedin' : r < 0.85 ? 'approved' : 'pending';
        else status = r < 0.55 ? 'approved' : r < 0.93 ? 'pending' : 'cancelled';
        var rec = rnd() < 0.7, purpose = pick(['practice', 'practice', 'practice', 'exam', 'record', 'practicum', 'research']);
        var o = add({ roomId: rm.id, date: d, start: hhmm_(s0), end: hhmm_(e0), title: pick(topics) + pick(subjects), purpose: purpose, userType: 'student', name: p[0], studentId: p[1], faculty: 'คณะครุศาสตร์', major: p[2],
          phone: '', email: '', course: pick(courses), advisor: pick(lecturers), participants: String(5 + Math.floor(rnd() * 20)),
          equipment: rm.code === 'MT-01' ? 'จออินเทอร์แอกทีฟ 75 นิ้ว, ไมโครโฟนไร้สาย (คู่)' : 'โปรเจกเตอร์ + จอรับภาพ', record: rec ? 'TRUE' : 'FALSE', support: rnd() < 0.3 ? 'TRUE' : 'FALSE', note: '', status: status,
          staffNote: status === 'rejected' ? 'ช่วงเวลานี้ใช้สอบปฏิบัติของหลักสูตร กรุณาเลือกวันอื่น' : '', videoUrl: status === 'completed' && rec && off < -3 ? 'https://drive.google.com/file/d/EXAMPLE-' + k + off + '/view' : '',
          series: '', source: 'online', checkinAt: status === 'completed' || status === 'checkedin' ? new Date(d + 'T' + hhmm_(s0) + ':00+07:00').toISOString() : '',
          checkoutAt: status === 'completed' ? new Date(d + 'T' + hhmm_(e0) + ':00+07:00').toISOString() : '', condition: status === 'completed' ? (rnd() < 0.9 ? 'ปกติ เรียบร้อย' : 'ห้องไม่เรียบร้อย (แจ้งเตือนผู้ใช้)') : '',
          decidedBy: status === 'pending' ? '' : 'staff1', decidedAt: status === 'pending' ? '' : now, cancelReason: status === 'cancelled' ? 'ผู้จองยกเลิก: เปลี่ยนวันสอบ' : '' });
        if (o) o.phone = '08' + String(10000000 + Math.floor(rnd() * 89999999)).substr(0, 8);
      }
    }
    // รายการตัวอย่างสำหรับทดลอง "ตรวจสอบสถานะ"
    var demoDay = addDays_(today, -2); for (var t = 0; t < 7 && [1, 2, 3, 4, 5].indexOf(dow_(demoDay)) === -1; t++) demoDay = addDays_(demoDay, -1);
    var demo = add({ code: 'MT-DEMO1', roomId: R['MT-01'].id, date: demoDay, start: '08:30', end: '09:30', title: 'ฝึกทักษะการใช้คำถาม เรื่อง ระบบสุริยะ', purpose: 'practice', userType: 'student', name: 'อามีนะห์ สาและ', studentId: '64112233',
      faculty: 'คณะครุศาสตร์', major: 'วิทยาศาสตร์ทั่วไป ปี 3', phone: '0812345678', email: '', course: courses[0], advisor: lecturers[0], participants: '8', equipment: 'จออินเทอร์แอกทีฟ 75 นิ้ว, ไมโครโฟนหนีบปกเสื้อไร้สาย',
      record: 'TRUE', support: 'FALSE', note: '', status: 'completed', staffNote: 'ไฟล์วิดีโอพร้อมแล้ว ดาวน์โหลดเก็บไว้ภายในภาคเรียนนี้', videoUrl: 'https://drive.google.com/file/d/EXAMPLE-DEMO/view', series: '', source: 'online',
      checkinAt: new Date(demoDay + 'T08:25:00+07:00').toISOString(), checkoutAt: new Date(demoDay + 'T09:31:00+07:00').toISOString(), condition: 'ปกติ เรียบร้อย', decidedBy: 'staff1', decidedAt: now, cancelReason: '' });
    var future = addDays_(today, 3); for (var t2 = 0; t2 < 7 && [1, 2, 3, 4, 5].indexOf(dow_(future)) === -1; t2++) future = addDays_(future, 1);
    add({ code: 'MT-DEMO2', roomId: R['MT-03'].id, date: future, start: '09:00', end: '10:30', title: 'สอบสาธิตการสอน เรื่อง วัฏจักรของน้ำ', purpose: 'exam', userType: 'student', name: 'อามีนะห์ สาและ', studentId: '64112233',
      faculty: 'คณะครุศาสตร์', major: 'วิทยาศาสตร์ทั่วไป ปี 3', phone: '0812345678', email: '', course: courses[2], advisor: lecturers[0], participants: '12', equipment: '', record: 'TRUE', support: 'TRUE', note: 'ขอจัดโต๊ะเป็นกลุ่ม 3 กลุ่ม',
      status: 'pending', staffNote: '', videoUrl: '', series: '', source: 'online', checkinAt: '', checkoutAt: '', condition: '', decidedBy: '', decidedAt: '', cancelReason: '' });
    appendRows_('Bookings', rows);
    // ผลประเมินความพึงพอใจ + ประเมินทักษะการสอน
    var fbs = [], evs = [];
    var cm = ['ห้องสะอาด อุปกรณ์พร้อม เจ้าหน้าที่ใจดีมาก', 'อยากให้มีไมค์หนีบปกเสื้อเพิ่ม', 'ไฟล์วิดีโอชัดมาก ใช้ทำรายงานสะท้อนผลได้ดี', 'ขั้นตอนจองง่าย สะดวก', 'แอร์เย็นเกินไปเล็กน้อย', ''];
    var st1 = ['นำเข้าสู่บทเรียนน่าสนใจ ใช้ภาพประกอบดี', 'ใช้คำถามหลายระดับ ให้เวลาคิดเหมาะสม', 'น้ำเสียงชัดเจน มั่นใจ', 'ใช้จออินเทอร์แอกทีฟคล่อง'];
    var im1 = ['ควรกระจายคำถามให้ทั่วถึงมากขึ้น', 'ยืนบังกระดานบ่อย', 'สรุปบทเรียนเร็วเกินไป', 'ควรเสริมแรงให้หลากหลายกว่านี้'];
    var mkScores = function (keys, base) { var o = {}; keys.forEach(function (k) { o[k] = [0, 0, 0, 0].map(function () { return Math.max(1, Math.min(5, Math.round(base + rnd() * 2 - 0.6))); }); }); return o; };
    rows.forEach(function (b) {
      if (b.status !== 'completed' || b.userType !== 'student') return;
      if (b.code === 'MT-DEMO1' || rnd() < 0.6) {
        if (b.code !== 'MT-DEMO1') fbs.push({ id: newId_(), bookingId: b.id, bookingCode: b.code, roomId: b.roomId, userType: b.userType, q1: String(4 + Math.round(rnd())), q2: String(3 + Math.round(rnd() * 2)), q3: String(3 + Math.round(rnd() * 2)),
          q4: String(4 + Math.round(rnd())), q5: String(3 + Math.round(rnd() * 2)), q6: String(4 + Math.round(rnd())), comment: pick(cm), createdAt: b.checkoutAt });
      }
      if (b.code === 'MT-DEMO1' || rnd() < 0.4) {
        var keys = b.code === 'MT-DEMO1' ? ['question', 'induction'] : [pick(SKILLS).key];
        var n2 = b.code === 'MT-DEMO1' ? 5 : 1 + Math.floor(rnd() * 4);
        for (var j = 0; j < n2; j++) {
          var role = j === 0 ? 'self' : j === n2 - 1 ? 'lecturer' : 'peer', sc = mkScores(keys, 3 + rnd()), all = [];
          Object.keys(sc).forEach(function (k) { all = all.concat(sc[k]); });
          evs.push({ id: newId_(), bookingId: b.id, bookingCode: b.code, evaluator: role === 'self' ? b.name : role === 'lecturer' ? b.advisor : pick(people)[0], role: role, skill: keys.join(','), scores: JSON.stringify(sc),
            avg: String(Math.round(all.reduce(function (s, x) { return s + x; }, 0) / all.length * 100) / 100), strengths: pick(st1), improve: pick(im1), createdAt: b.checkoutAt });
        }
      }
    });
    appendRows_('Feedback', fbs);
    appendRows_('Evaluations', evs);
    var rq = function (type, name, subject, detail, status, response, back) {
      return { id: newId_(), code: 'RQ' + String(Number(today.substr(0, 4)) + 543).substr(2) + today.substr(5, 2) + '-' + newId_().substr(0, 4).toUpperCase(), type: type, name: name, userType: 'student', studentId: '', faculty: 'คณะครุศาสตร์',
        phone: '0812345678', email: '', subject: subject, detail: detail, refCode: '', needDate: addDays_(today, 5), link: '', status: status, response: response, handledBy: response ? 'เจ้าหน้าที่ห้อง' : '',
        createdAt: new Date(Date.now() - back * 86400000).toISOString(), updatedAt: now };
    };
    appendRows_('Requests', [
      rq('overtime', 'อับดุลเลาะ ดอเลาะ', 'ขอใช้ห้องวันเสาร์เพื่อซ้อมสอบสาธิต', 'ขอใช้ห้องทดลองสอน 1 วันเสาร์ 09:00–12:00 กลุ่มละ 6 คน ซ้อมก่อนสอบปลายภาค', 'new', '', 0),
      rq('video', 'ซูไฮลา มะลี', 'ขอสำเนาไฟล์วิดีโอการสอนเดือนที่แล้ว', 'ขอไฟล์วิดีโอการสอนวันที่สอบกลางภาค เพื่อใช้ทำแฟ้มสะสมผลงาน', 'progress', 'กำลังค้นหาไฟล์จากเครื่องบันทึก จะส่งลิงก์ภายใน 2 วันทำการ', 2),
      rq('repair', 'ฮาซัน แวนิ', 'ไมโครโฟนไร้สายห้อง 1 เสียงขาดหาย', 'ไมค์ตัวที่ 2 เสียงขาดเป็นช่วง ๆ ระหว่างสอน', 'done', 'เปลี่ยนแบตเตอรี่และจูนคลื่นใหม่แล้ว ใช้งานได้ปกติ', 6),
      rq('borrow', 'ไซนับ ยูโซะ', 'ขอยืมกล้องวิดีโอพร้อมขาตั้ง', 'ยืมไปบันทึกการสอนที่โรงเรียนเครือข่าย 1 วัน', 'new', '', 1),
      rq('training', 'อ.รุสนี มะแซ', 'ขออบรมการใช้จออินเทอร์แอกทีฟให้นักศึกษา', 'นักศึกษา 35 คน รายวิชานวัตกรรมฯ ขอเวลา 2 ชั่วโมง', 'done', 'จัดอบรมให้วันพฤหัสบดี 13:00–15:00 น. ณ ห้องทดลองสอน 1 เรียบร้อยแล้ว', 12)
    ]);
    appendRows_('News', [
      { id: newId_(), title: 'เปิดระบบจองห้องทดลองสอนออนไลน์', body: 'นักศึกษาและอาจารย์สามารถดูตารางว่างและจองห้องได้ตลอด 24 ชั่วโมง ไม่ต้องกรอกแบบฟอร์มกระดาษ', date: addDays_(today, -20), pinned: 'TRUE', active: 'TRUE', createdAt: now },
      { id: newId_(), title: 'บริการบันทึกวิดีโอการสอนส่งทาง Google Drive', body: 'ติ๊ก “ต้องการบันทึกวิดีโอ” ตอนจอง แล้วรับลิงก์ไฟล์ในหน้าตรวจสอบสถานะภายใน 1–3 วันทำการ', date: addDays_(today, -12), pinned: 'FALSE', active: 'TRUE', createdAt: now },
      { id: newId_(), title: 'อบรมการใช้จออินเทอร์แอกทีฟสำหรับนักศึกษาครู', body: 'รับสมัครผ่านเมนู แบบฟอร์ม/คำร้อง › ขออบรมการใช้งานห้องและอุปกรณ์', date: addDays_(today, -5), pinned: 'FALSE', active: 'TRUE', createdAt: now }
    ]);
    var eq = readTable_('Equipment').filter(function (e) { return e.code === 'EQ-009'; })[0];
    if (eq) updateRow_('Equipment', { id: eq.id, status: 'repair', note: 'ส่งซ่อม: ลำโพงมีเสียงจี่ (ตัวอย่าง)' });
    var salt = Utilities.getUuid();
    insertRow_('Users', { id: newId_(), username: 'staff1', name: 'เจ้าหน้าที่ห้องทดลองสอน', role: 'staff', email: '', phone: '', passwordHash: hashPassword_('demo12345', salt), salt: salt, active: 'TRUE', lastLogin: '', createdAt: now });
  }
  var TPL = __TPL__;
  var html = TPL.App.replace('<script src="config.js"><\/script>', '<script>window.MT_CONFIG = { API_URL: "" };<\/script>');
  var bar = isApp || q.view === 'display' ? '' : '<div id="demobar" style="position:fixed;left:10px;bottom:10px;z-index:98;background:#1f1f26;color:#fff;font:12.5px/1.55 Sarabun,sans-serif;border-radius:10px;padding:7px 11px;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:calc(100% - 20px)">' +
    '<b>เว็บไซต์ทดลอง</b> · ข้อมูลตัวอย่างอยู่ในเบราว์เซอร์นี้เท่านั้น (ของจริงเก็บใน Google Sheet) · ตรวจสถานะ <b>MT-DEMO1</b> / <b>0812345678</b> · หลังบ้าน <a href="#admin" style="color:#ffb3c9">เจ้าหน้าที่</a> <b>staff1</b> / <b>demo12345</b> · ผู้ดูแล <b>admin</b> / <b>ChangeMe@2569</b> ' +
    '<a href="#" onclick="__MOCK_RESET();sessionStorage.clear();location.reload();return false" style="color:#f3cf74">รีเซ็ตข้อมูล</a> <a href="#" onclick="this.parentNode.remove();return false" style="color:#fff;opacity:.7">✕</a></div>';
  html = html.replace('</body>', bar + '</body>');
  document.open(); document.write(html); document.close();
})();
"""


def main():
    parts = read(MOCK_FROM).split('\n;\n')
    mock = parts[0].replace("'sra_preview_store_v3'", "'mt_room_demo_v1'")
    mock = mock.replace('<title>SRA YALA — ตัวอย่างเว็บไซต์ + ระบบสมาชิก</title>', '<title>ห้อง Micro Teaching — ทดลองใช้</title>')
    runner = parts[-2]
    if 'mt_room_demo_v1' not in mock or 'withSuccessHandler' not in runner:
        raise SystemExit('ไม่พบตัวจำลองในไฟล์ preview.html')
    gs = [read(os.path.join(SRC, n)).strip('\n') for n in GS_FILES]
    tpl = json.dumps({'App': read(os.path.join(APP, 'website', 'index.html'))}, ensure_ascii=False).replace('</script', '<\\/script')
    boot = BOOT.replace('__TPL__', tpl)
    html = '\n;\n'.join([mock] + gs + [runner, boot]) + '\n</script></head><body></body></html>\n'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    print('สร้างแล้ว:', OUT, '(%d KB)' % (len(html.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()

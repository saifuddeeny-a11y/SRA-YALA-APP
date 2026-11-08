/**
 * ============================================================
 *  SEED — ข้อมูลเริ่มต้นที่ย้ายมาจากเว็บไซต์เดิม
 *  https://sites.google.com/yru.ac.th/srayala
 *  (ใส่เฉพาะตอนที่ตารางยังว่าง — แก้ไขต่อได้ที่หลังบ้าน)
 * ============================================================
 */

var OLD_IMG = 'https://lh3.googleusercontent.com/sitesv/';

var SEED_IMAGES = {
  logo: OLD_IMG + 'AG8ngQWAQF96mlo-wcuApsbZBSn3gvdNT-M5KQUbl23n0Uw0d1-mxnsEjtRUgey8fcKe8sHWGUWwP96ypXR3W-DJF6hac4qdChJhhqPbLtRZIM-ldfZsL6gwF-kjg_7I2xryykLUHJtf7bvGKjX4SKQ4yqp0rYCvzTCCZ45Mr1BJNEPNRYxBrFeNo5aLvwk8izk=w400',
  activity: [
    'AG8ngQUtYvy0tWTbuc55hO2k6SV30MKoFL9lPU9x1ERAwsrrW8mmfNblGmw9LyEs0I6jxjbduzPSkIKCeD8yOu17Swwa-IfsAwahvPmT3sLjhlQyqiItm3yCd3_2DX-6vHwm0MNkXBf49QxpBTYW2_TR2cCx6aaRsiXLqz4_xHJR-RimAa-0a1jpXf9d46l3BHbo6aRzXMv1vLQRGu7WivHkDJIa8ipFzTpurHfDLCkIeN8=w1280',
    'AG8ngQUB-zMJMjxTNUoW6pFEBqhRJ00MutcGLar-eF4XAYEcOjjIbPRRIA6MB4eEGOpouKmCYZJcKVhTsyIxSL4m3S7qOBBte1vp5Qh5A-_yjEAB27PS67vWS10NxjbNhnTY6eXu5r_MTg-Snej08udLSi151D67KIeL7cQmo3r4uMV-L8oNafR-dA1IsP551Fq9gvhgDoMLzETkn9tHAE494JW8AaUw_9nUvyQ7_39s5gE=w1280',
    'AG8ngQV8iowcDbCooCH0e5fbCcHJtPx7k925fsH79Ov0Vxq1YbHYsDH4TiTTWwXM99vBdF3r9sRIj4Hl8OJfLy9FhHNuaWxvBEtTY-mZ3TtNaMCt1nEgpVw7RNDpQhzNADaTsIU2gt49LHKcQZ_J0BkFuD__VCSklQmPDuV27qouyjYuP6A_oDJCEtzBMSTQhkNCzy-rXB7kKCgvefEWxXN4N70zeYhEGcypLcbotoxuq0M=w1280',
    'AG8ngQVxY-L63cuJXjxma-GlN_4oyLfcAZD_wqZKy8uoqanCAt9t00c_3eIYYtcLEvryhkb0Gg_PzgOOXvDburuYzmsMGjk-Ey5LJAmpr3DHCGiSvw937rS883kjQ5p0ERdVsoo7KuT0G-HAZTC4igdN_1AMFgBJscXRACzlgzmm1REgBSbE7Y8ThNsHaS7vlAsqz_aW7p9iGU9UWT5_9MFiPrcVGDnuooEtTupT_zvCO1o=w1280'
  ],
  congrats: [
    'AG8ngQU9JARddvrnzx5cYqL2HP-vLekTav2dhEhmK3SsfgOYnWsYzFDg1xmkmCiXZnqUUxhXsG0ENGeb6JLE44ykg8yjb_Sq1Q8lvg2Ql0rm_PJqfeeh8H9WTdDIyZY97_Hm2xpQIhWchrQ2oi2IFYgLw--e1hxdvNg47y4rJFX3r4_x5z8Dd6F5a2fzQKPB8lneoaX1Xhf7Ee44I5-5l2vAf602ls4r-xleXdHuu3XhqHA=w1280',
    'AG8ngQVfiDeriQgcBXxV8zeP3CL3oXspxbyr2NWXNsNt0n-COPkqVuSrRdzF1OT6GErcmemHdXKkaTmzA2nBUa7cDPL_MhHuZhkm_dTw5sWBtjO4NH-NTcQWd0uG0BX-ib7FtueI9pPISLFCsB6Cv77Vv5sMpy8lJGYmGKStxgzOslK_ial95WDiGMQUGCoDswoEuZi-wjDqpeemzAvHr__vKNhZDxItEqBrYoqZzZGTPR8=w1280',
    'AG8ngQWpB8uPRgm5wc8oAyXF60xhY7yqweGfwJSb6tCtDTnkTt8uHqPWu7EmOhGwKWEswZk0DQ-V7JLmmU6m2KoUWee0QpfGeHW0czu_CagbGip48Pf4SiYPmsAg0GKaef8uPDf6tMukkRpDRlXYmCzPw0K0IWYTAH66kMmdJOcvcz8XoHmK24_qyIU5KQ10WKyFn5w4rFJDe2-Irnx4azUtwybaJlfKU1ATzuHBGtKWC6Y=w1280',
    'AG8ngQXeZR3eWgOo1nCSVu6elnM6vrT7F7rAyGbr6vWnIzSJ7JIUg4tc5ccg7Am2FwmGLvMYETesBV8fk82FHaNm28iMtlNl4tPzX3H-3kAUSQPGuysVhxjFYKBMbUashg_trfFBwONBQ5hAkBid1Um8XEyVYc7vHvOGYkXfbAZ8wiX1xlYnQmf1kLLpnGl3y5FdGJSSZD2OCLnKVMuckxH_q5AN6d6bvy4n5j1_4-V7=w1280'
  ],
  learning: [
    'AG8ngQVh0nZbjLnuK--kApaL7UWVF8gkruaQoFT8OvV_Ws88V7pzMXANGZFO0xBUoWJfoMOxcroLFE8wy9lzZu4YK1jD2BRiJt5eoij3GjeFgZN8mB91Ah3QIQS4PtRonJ3C9Rw2OPCdEFmW43Q_qma6AqKdN9DGnrKTHBCiZ6-AOe6sdUPRTJ29uZaalgxRIt1tWxZuwPwyyTemXZE_8OyYcOSy2CmUdEcsu1DbkbPEpcg=w1280',
    'AG8ngQXPy3geHba_D2JMZ0db6GktgjkIQYDX9KsX1fN2_vaenjHipA99Y6JafZf_ONgHnos8q-RReRmMd3x4KLwScJa6wHC9HpLv9jyzht90N9aflFAdFWWwo1QKEHO2MlsuKGFOUJ5YveHePF4-6NhEwKp5X4zq291RlSZyPRWnc5bt2CWHNDtSQ6iRp2aAEdB7BLDP1jBOpaqTSnDC1-JkdGGlQwyv8lvhpQS81oY_xVg=w1280'
  ],
  award: 'AG8ngQXjBrU0LLV_VDYwzXX5GEXfQ-pR62xhsCO5vomAjRPoXsh75ErIIAwDimsWYI0RZYgdgo11ssIFKJUPOIsnVcVOXyv9-LDXIPxZLEeGcZY4c3RhyVfMgshPptZTLkhOypuA8VeqQbL1ppjfppAqIq5Og7eAynGnRe4lQ8XEw7Pju5NklQ6gpkLeMUrrbPKK6x_dIPnxJSqLGzafTwYAfPSOOpWFW1xm1ZYkaLxFekQ=w1280',
  bank: 'AG8ngQUJr4Drcw4C4KkWmLFWn0rwPzkNEF1Erwd_0wseo0CiaIhGkqHy9LCDTgbf2cP8zDXbgEzTGnEI2htd1zVkGbKP3KUC2ncKf8bjSnVDTCLfgu_Q3-5KAhEPP3cnDVYji5xIvAFknX2AX2xczHWCw4K7n2BuJqnu8cCMTsPK-m4E9647A6EWS_8nqHR0A2UVrWXIxHmfQ5woy_l2F5xe5HbE3L-g8pv-qnk6fFDUjBc=w1280',
  coop: 'AG8ngQUnsn0IP4t5GE8M3oYkN6Y4C_bZvE_ldRzIp4zFbVH_B4RSyEEM0HnoIR3u8yhHRfyMlBEkP0d5TylWOfQy_9pMxAQB13R0UHvYBWdY3NHjK8k5eij4Qm47x4wJXZyWHmOvQZgsZIgUvlgixgG49tHASIeRtQ1zifZOVqNqgADd6VWmnEsOLX2sj8B_uMh3_sELsQX3I4egl5TU098SuCLB2O7ADl3aOmFlUX5XU3U=w1280',
  fund: 'AG8ngQU52sSH-N4rpwMkaZIo1PL4tfZqNZFxItgxoiameAi8onxNVzaBBYwUXdoE0HWrZbQ56SaNaUDTdf9L7vodMNaaXB658gc_iKhAamj4IIZYQ9EAqQvxZBEKIc7JhakeTy8pWFCswrIHYXBNjUxsJRx9vLPz_3ezY0QtOZMryXGjB37X2SFBYwS9Npb41X-TxTh44yBjMQnLZik1acJUFej_4WjWNeic2UeG7HCW=w1280',
  model: [
    'AG8ngQXEyZp52hrjbcuXCgZqiDV-qboTA_siVXsgDHZXuQZUaBoZh2ZTLFyjuW7QQ8rGCMYfLi1CqZu1Dpd3qHgb285kIcpnsLce-h8VqtKSo8hvSSR0A4cElOWzBcw0Tv4f-J2llukq25bYjkjpMSSuGSTF-Ss0pi9zX1aiD8DR5ykjhnRBZw0Y852w-gTyzMQ=w1280',
    'AG8ngQU52fFbbdrb4hBJtpF4oQb6FQ8QHnAmiO4CdZddyzQASjtxS6zodLvtcmvq-S8YQWB5dWE4zIuZBMG-_uk35Oem5H8TGuQmMOOhXYN5ZmkXJxRbhFeNfM-br5h_peiHPrJSEhM-MiZcrwhy4juxjn1fetKHKQ72Unx29p6WRlQaIgqyBVbOtRr6GUr4=w1280'
  ],
  research: [
    'AG8ngQWgFFpGI05UALYazhztMjc53qAPYplZL3LX449AsGoqD2RHzFXP28LK50_deyUKKPyPgL3etoE0l6BHceFRVpa9hqbuDPgPv1rbe8EbYq8D9FJ9PJECebXeCpu6AnQCnFkGttLfS63mYQqXhJTGlyyeq6wZzRrW6ryJt1Im3hpMHoCJ5ZteDaWOgYjStTRZLIkRAKLIPJQnEuXTEkkHKJAsFeB0bdVK448U7xJ-=w1280',
    'AG8ngQVhKDDpzTFNxiR2lCeSX_X4q8E0G4MIkUsMjlG1izJvKMPhRMi5pVvqWcTVK3sZ_M8HNrIswJqesi2fVpJaOxyjaZQKexICr5eblmlyFtF9MN-PRHoEWt-Ebw68Mb1ix3lkouU6r3oKqbu9WZX1IS8ympztFRVo9rZ0xo0BT6WuSkGNHZmLaSuRjvi6vgwg4gQr03px-NpJ2aqt1A8xnXJstEOLUn_wRUR_GLOkXtk=w1280',
    'AG8ngQUsCbaL9nL6hWZF6QxeshzhI5ZT3B40qJvRPq4QqiDtssKmtJnbFZNfOXzamYJ8nb3LDMnDMGimGstKq0SVZSTFnVVRio-Ac7towfvieIJJmKMUzVK9oXcTcZz-nokgZ1G95F0RrC27UshVgomGGJt1JrrJlP-6TszonVfcLJoY0fK95dk2GbZ60vTq=w1280',
    'AG8ngQUOv24AKpf_DPV-3F9q0gXfN82pxIbWG8wkm0RfPRUh18MPmWHhjUrOZtiWRLr_i81_1o1nDisXqwnnLTYO_Jdj-wPy4MwH8lIesJuRW8fydFiJcMIW41dNIGhKDUONSM_WBcnAYB1Lf0vo17kXHHlYySNRKPYvnAVZgMZGGdnXWbH7M8FR-uGA82YUOTnYKAxPiJKGA8EK4agGiuZzeUXVsIuJXTDQai35pvRyDcE=w1280',
    'AG8ngQXFbGtv1a5iEnJd7xx0PfNzI3k6FKnGw2JZMcSjd-8Fmr8mdUo5wQ-OlNCWh8tpBxo4M61ft8lHQaPtaPtMa638eP5wountVOqgbgZcQj8ZA2h6DLI5m3UIh97UnA7piXU5XPshWakWSToBXDZ-Fd4Vi3MPioej02JeNb21E_OuZ4-XuiukDkxzhdk2Cds6UbjtAPtDdWdib68ZaRituEIOsrHeQhyt2oQs2DeldHw=w1280',
    'AG8ngQX97rvl9LOv0M2hj1t9KRnwK-bj-AfaI5HF1zYMHSR6TfIuHSv3dThModdvfxGOGK22PBV8GMWfXER0CcJB5PDW5Irj4XcHegm5xUl_NUtXoFGLiqUhieFFVYYdCV-HtYlkoKadmosKTfDcdkfMMv4_J-tGBHxTP6ZUZLtkiewqAfeSN2z3olnUf56X-NYgNf3lmO9dKcs81v0flP8r9OicDttcpAe3nuc6mznwdjQ=w1280',
    'AG8ngQVyvHrWRaAXLqhpcmG8BO4S5JpVg17WGH-CJUYsLYkacFh3XTUbpoVT2lh8hqlbLGWUyPimr5thSmk1GPVYqbKiTHokMqnDE_uuxJAD6UaaSTQlXDIJXbte3telNeZ1GQGmqH8oCC7Ok_1QdvhdQs5oTouo2SfnOzXBf3cRzkqb0bRH6tK7iRk_UhBB4Y_X6uYUGpkNbZmSn1rxTuQihDb-J-EnzmHPG8AQWZfD=w1280',
    'AG8ngQVyxVGEOXkOudZA_kvXEBqF_opP_XQgaMnEqgrGtCWC9w-ynn9Glosu-UpidM9ySfQJAOzPQVTlFlWJreP_uC5ml-bkvVuFJWrXhWwieYn1t4gvieWvPJj2uprPtwWpAYPWbdDfuM3iDTZGxyo8lhv5b3_GhMHRmYwlXiAyVlrzkoXtVaOBc_EllZwISm7reQh04NAbxhs7OPwI-kPGBK44M4kUeAQfqVFIP1wRFeA=w1280',
    'AG8ngQVSqKblQyu7FNvGf079EtnFFe4DhxLckfDJIR0iS5eYNzBOU8XvSjEBpkuj8Lv1zkMTertaGM__cH8kyEU2cycmLEZ12S7oGsbo7H_RLb-6rwPumh1Ni1wExwK7OPXW00H2vGLypvq-8MkDKPzvL5oQTU3qNV_UCuvJkDyeURqmKnnUI_HqjQEGIy93yONXikGv3gtTg0FIw5k5NKzZ6o7s2JYQgatjjApYvjU2=w1280'
  ]
};

function img_(path) { return OLD_IMG + path; }

function seedData_(ss) {
  var now = nowIso_();
  var isEmpty = function (name) { return readTable_(name).length === 0; };

  /* ---------- Settings ---------- */
  var defaults = {
    siteName: 'SRA YALA',
    tagline: 'ส่งเสริมพฤติกรรมการออมสู่เป้าหมายแห่งศรัทธา',
    welcome: 'ยินดีต้อนรับเข้าสู่เว็บไซต์ SRA YALA',
    organization: 'มหาวิทยาลัยราชภัฏยะลา',
    heroText: 'โครงการวิจัยเพื่อยกระดับการบริหารจัดการการเงินครัวเรือนของกลุ่มอาชีพในจังหวัดยะลา เชื่อมโยงชุมชน สถาบันการเงิน และภาคีเครือข่ายท้องถิ่น',
    logoUrl: SEED_IMAGES.logo,
    heroImageUrl: img_(SEED_IMAGES.activity[0]),
    faviconUrl: '',
    email: 'saifuddeen.y@yru.ac.th',
    phone: '086-4833570',
    address: 'มหาวิทยาลัยราชภัฏยะลา 133 ถนนเทศบาล 3 ตำบลสะเตง อำเภอเมือง จังหวัดยะลา 95000',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61568724059330',
    chatUrl: 'https://www.facebook.com/profile.php?id=61568724059330',
    footerText: '© SRA YALA · มหาวิทยาลัยราชภัฏยะลา',
    themeColor: '#0f5e4b',
    accentColor: '#c79a2b',
    notifyEmail: '',
    showVisitCounter: 'TRUE',
    menu_home: 'หน้าแรก', menu_model: 'โมเดล', menu_research: 'พื้นที่วิจัย', menu_dashboard: 'แสดง dashboard',
    menu_knowledge: 'ความรู้ใหม่', menu_process: 'กระบวนการ', menu_news: 'ข่าวสาร', menu_contact: 'ติดต่อ',
    menu_report: 'ผลดำเนินการ', menu_library: 'คลังความรู้',
    newsCategories: 'ข่าว, กิจกรรม, ประชาสัมพันธ์, ประกาศ, ขอแสดงความยินดี'
  };
  var existing = getSettings_();
  Object.keys(defaults).forEach(function (k) {
    if (existing[k] === undefined) insertRow_('Settings', { key: k, value: defaults[k] });
  });

  /* ---------- Pages ---------- */
  var havePages = {};
  readTable_('Pages').forEach(function (p) { havePages[p.id] = true; });
  {
    [
      { id: 'home', title: 'ข่าวประชาสัมพันธ์', subtitle: 'ติดตามความเคลื่อนไหวและกิจกรรมของโครงการ', content: '' },
      { id: 'model', title: 'โมเดล', subtitle: 'ส่งเสริมพฤติกรรมการออมสู่เป้าหมายแห่งศรัทธา',
        content: '<p>แผนภาพโมเดลการขับเคลื่อนของโครงการ SRA YALA ที่ใช้ในการส่งเสริมพฤติกรรมการออมและการบริหารจัดการการเงินครัวเรือนของกลุ่มอาชีพในจังหวัดยะลา</p><p><em>(ผู้ดูแลสามารถเพิ่มคำอธิบายองค์ประกอบของโมเดลได้ที่ระบบหลังบ้าน › หน้าเว็บ › โมเดล)</em></p>' },
      { id: 'research', title: 'พื้นที่วิจัย', subtitle: 'ยินดีต้อนรับเข้าสู่เว็บไซต์ SRA YALA : ส่งเสริมพฤติกรรมการออมสู่เป้าหมายแห่งศรัทธา',
        content: '<p>โครงการดำเนินงานร่วมกับกลุ่มอาชีพชุมชน 3 กลุ่มในจังหวัดยะลา ครอบคลุมพื้นที่อำเภอรามัน อำเภอบันนังสตา และอำเภอกรงปินัง โดยมีองค์การบริหารส่วนตำบลเป็นภาคีเครือข่ายในพื้นที่</p>' },
      { id: 'dashboard', title: 'แสดง dashboard', subtitle: 'ข้อมูลสรุปของกลุ่มอาชีพและการบริหารจัดการการเงินครัวเรือน', content: '' },
      { id: 'dashboard_data', title: 'ข้อมูล dashboard', subtitle: 'กดเพื่อดูข้อมูล และกรอกข้อมูล', content: '' },
      { id: 'dashboard_debt', title: 'หนี้สินครัวเรือน', subtitle: 'แบบฟอร์มรับสมัคร ADM ด้าน Financial Literacy และแบบสำรวจหนี้ครัวเรือน', content: '' },
      { id: 'knowledge', title: 'ความรู้ใหม่', subtitle: 'องค์ความรู้ เอกสาร และสื่อการเรียนรู้จากโครงการ', content: '' },
      { id: 'process', title: 'กระบวนการ', subtitle: 'ขั้นตอนการดำเนินงานของโครงการ',
        content: '<p><em>ลำดับขั้นตอนด้านล่างเรียบเรียงจากกิจกรรมที่เผยแพร่บนเว็บไซต์ ผู้ดูแลสามารถแก้ไขได้ที่ระบบหลังบ้าน › กระบวนการ</em></p>' },
      { id: 'news', title: 'ข่าวสาร', subtitle: 'ข่าว กิจกรรม และประชาสัมพันธ์ล่าสุดทั้งหมด', content: '' },
      { id: 'reports', title: 'รายงานผลดำเนินการ', subtitle: 'ผลการดำเนินงานตามกิจกรรมและตัวชี้วัดของโครงการ',
        content: '<p>สรุปผลการดำเนินกิจกรรมของโครงการ SRA YALA แยกตามปีงบประมาณและระยะการดำเนินงาน พร้อมเอกสารรายงานฉบับเต็มให้ดาวน์โหลด</p>' },
      { id: 'gallery', title: 'คลังภาพ', subtitle: 'ภาพกิจกรรมและบรรยากาศการดำเนินงานของโครงการ', content: '' },
      { id: 'downloads', title: 'เอกสารดาวน์โหลด', subtitle: 'เอกสาร รายงาน คู่มือ และแบบฟอร์มของโครงการ', content: '' },
      { id: 'tools', title: 'เครื่องมือ', subtitle: 'แบบฟอร์ม แบบสำรวจ ระบบบันทึกข้อมูล และเครื่องมือสำหรับกลุ่มอาชีพและ ADM', content: '' },
      { id: 'contact', title: 'ติดต่อ', subtitle: 'หากมีข้อสงสัย สามารถติดต่อทีมงานได้ตามช่องทางด้านล่าง',
        content: '<p>คลังเอกสารเพื่อเป็นแหล่งข้อมูลให้ผู้เข้าชมเว็บไซต์ค้นหาข้อมูลได้ด้วยตนเอง และหากยังมีข้อสงสัย สามารถส่งข้อความถึงทีมงานผ่านแบบฟอร์มหรือแชทสดทาง Facebook</p>' }
    ].forEach(function (p) { if (havePages[p.id]) return; p.imageUrl = ''; p.updatedAt = now; insertRow_('Pages', p); });
  }

  /* ---------- Groups ---------- */
  if (isEmpty('Groups')) {
    [
      {
        id: 'banana-rope', name: 'กลุ่มอาชีพเชือกกล้วย', shortName: 'เชือกกล้วย', icon: '🪢',
        location: 'ตำบลกายูบอเกาะ อำเภอรามัน จังหวัดยะลา', members: '25',
        memberProfile: 'สมาชิกส่วนใหญ่เป็นสตรีวัยกลางคน อายุ 35–55 ปี ที่มีประสบการณ์ทำอาชีพนี้ในครัวเรือนมาก่อน',
        summary: 'กลุ่มอาชีพชุมชนที่เกิดจากความร่วมมือของคนในพื้นที่ สืบสานภูมิปัญญาท้องถิ่นการผลิตเชือกจากใยกล้วยที่ถ่ายทอดกันมาหลายรุ่น',
        strengths: 'เชือกมีคุณภาพ ประณีต และทนทาน\nมีเอกลักษณ์จากวัตถุดิบธรรมชาติในท้องถิ่น\nสมาชิกมีความสามัคคี ช่วยกันแก้ปัญหาและพัฒนากระบวนการผลิตอย่างต่อเนื่อง',
        limitations: 'การตลาด: จำหน่ายได้เฉพาะในชุมชนและงานแสดงสินค้าท้องถิ่น ยังขยายสู่ตลาดภายนอกและตลาดออนไลน์ได้น้อย\nการเงิน: เข้าถึงเงินทุนหมุนเวียนได้ยาก กระทบการจัดซื้อวัตถุดิบ การปรับปรุงอุปกรณ์ และการพัฒนาบรรจุภัณฑ์',
        products: 'เชือกจากใยกล้วย', income: '', channels: 'ชุมชน, งานแสดงสินค้าท้องถิ่น',
        detail: '', coverUrl: ''
      },
      {
        id: 'sweet-corn', name: 'กลุ่มข้าวโพดหวาน', shortName: 'ข้าวโพดหวาน', icon: '🌽',
        location: 'ตำบลตาเนาะปูเต๊ะ อำเภอบันนังสตา จังหวัดยะลา', members: '28',
        memberProfile: 'สมาชิก 28 คน เป็นเกษตรกรผู้ปลูกข้าวโพดหวาน 10 คน แบ่งพื้นที่ปลูกเป็น 4 แปลง',
        summary: 'กลุ่มอาชีพชุมชนที่เกิดจากความร่วมมือของคนในพื้นที่ซึ่งมีความรู้และประสบการณ์การปลูกข้าวโพดหวานมายาวนาน ดำเนินงานครบวงจรตั้งแต่คัดเลือกพันธุ์ ปลูก เก็บเกี่ยว จนถึงแปรรูป',
        strengths: 'ผลิตน้ำข้าวโพดหวานพร้อมดื่มที่มีรสชาติเฉพาะตัว\nใช้วัตถุดิบสดจากแปลงของสมาชิก\nผลิตอย่างสะอาด ปลอดภัย คงความหวานตามธรรมชาติ',
        limitations: 'การตลาด: เข้าถึงลูกค้าภายนอกได้จำกัด การขายออนไลน์ยังอยู่ในวงแคบ และยังไม่มีแบรนด์ที่ชัดเจน\nการเงิน: ขาดเงินทุนหมุนเวียนสำหรับซื้อวัตถุดิบในฤดูเก็บเกี่ยว ปรับปรุงอุปกรณ์การผลิต และพัฒนาบรรจุภัณฑ์ให้ได้มาตรฐาน',
        products: 'น้ำข้าวโพดหวานพร้อมดื่ม (ขวด 250 มล.), ข้าวโพดหวานสด',
        income: 'จำหน่ายเฉลี่ย 100–200 ขวด/เดือน สร้างรายได้เสริมเฉลี่ย 5,000–7,000 บาท/เดือน (นอกเหนือจากการขายผลผลิตสด)',
        channels: 'ตลาดชุมชน, งานสัมมนา, กิจกรรมของหน่วยงาน, ออนไลน์',
        detail: '', coverUrl: ''
      },
      {
        id: 'raised-vegetable', name: 'กลุ่มอาชีพผักยกแคร่', shortName: 'ผักยกแคร่', icon: '🥬',
        location: 'ตำบลสะเอะ อำเภอกรงปินัง จังหวัดยะลา', members: '27',
        memberProfile: 'สมาชิกส่วนใหญ่เป็นเกษตรกรในพื้นที่ที่มีประสบการณ์ปลูกผักพื้นบ้าน',
        summary: 'กลุ่มอาชีพชุมชนที่เพาะปลูกและแปรรูปผักยกแคร่ พืชพื้นถิ่นที่มีคุณค่าทางยา ใช้ประกอบอาหารหรือเป็นสมุนไพรได้',
        strengths: 'ใช้วัตถุดิบสดจากพื้นที่ ปลอดสารเคมี\nดูแลอย่างพิถีพิถัน ได้ผลผลิตคุณภาพสูง\nมีรสชาติและสรรพคุณเฉพาะตัว',
        limitations: 'ต้องลงทุนจัดหาอุปกรณ์แปรรูปและบรรจุภัณฑ์\nการพัฒนาผลิตภัณฑ์ให้ได้มาตรฐาน\nการสร้างแบรนด์ให้น่าเชื่อถือในตลาดที่กว้างขึ้น',
        products: 'ผักยกแคร่สด; แนวทางพัฒนา: ผักอบแห้ง ผงชงดื่ม และผลิตภัณฑ์พร้อมปรุง',
        income: 'เฉลี่ยประมาณ 2,000 บาท/เดือน/สมาชิก',
        channels: 'ชุมชนและพื้นที่ใกล้เคียง; มีโอกาสขยายสู่ตลาดสุขภาพและตลาดออนไลน์',
        detail: '', coverUrl: ''
      }
    ].forEach(function (g, i) { g.order = String(i + 1); g.published = 'TRUE'; g.updatedAt = now; insertRow_('Groups', g); });
  }

  /* ---------- News ---------- */
  if (isEmpty('News')) {
    [
      { title: 'ผลประกาศรางวัล อัลฮัจย์และอุมเราะห์ ประจำปี 2568', subtitle: 'กิจกรรมดำเนินการระยะที่ 3', category: 'ประชาสัมพันธ์',
        coverUrl: img_(SEED_IMAGES.award), featured: 'TRUE', linkUrl: '', linkLabel: '',
        content: '<p>ประกาศผลรางวัล อัลฮัจย์และอุมเราะห์ ประจำปี 2568 ภายใต้กิจกรรมดำเนินการระยะที่ 3 ของโครงการ SRA YALA ส่งเสริมพฤติกรรมการออมสู่เป้าหมายแห่งศรัทธา</p>' },
      { title: 'พบปะและหารือกับผู้จัดการธนาคาร', subtitle: 'เชื่อมโยงกลุ่มอาชีพกับสถาบันการเงิน', category: 'ข่าว',
        coverUrl: img_(SEED_IMAGES.bank), featured: 'FALSE',
        linkUrl: 'https://www.facebook.com/photo?fbid=1133159339011238&set=a.583504350643409', linkLabel: 'อ่านเพิ่มเติม',
        content: '<p>คณะทำงานโครงการพบปะและหารือกับผู้จัดการธนาคาร รายละเอียดเพิ่มเติมดูได้ที่เพจ Facebook ของโครงการ</p>' },
      { title: 'พบปะและหารือกับผู้จัดการสหกรณ์', subtitle: 'เชื่อมโยงกลุ่มอาชีพกับสถาบันการเงิน', category: 'ข่าว',
        coverUrl: img_(SEED_IMAGES.coop), featured: 'FALSE',
        linkUrl: 'https://www.facebook.com/photo?fbid=1101336668860172&set=a.583504350643409', linkLabel: 'อ่านเพิ่มเติม',
        content: '<p>คณะทำงานโครงการพบปะและหารือกับผู้จัดการสหกรณ์ รายละเอียดเพิ่มเติมดูได้ที่เพจ Facebook ของโครงการ</p>' },
      { title: 'ยกระดับการบริหารกองทุน', subtitle: 'กิจกรรมพัฒนาศักยภาพกลุ่มอาชีพ', category: 'กิจกรรม',
        coverUrl: img_(SEED_IMAGES.fund), featured: 'FALSE',
        linkUrl: 'https://www.facebook.com/photo/?fbid=1072929445034228&set=pcb.1072935308366975', linkLabel: 'อ่านเพิ่มเติม',
        content: '<p>กิจกรรมยกระดับการบริหารกองทุนของกลุ่มอาชีพ รายละเอียดเพิ่มเติมดูได้ที่เพจ Facebook ของโครงการ</p>' },
      { title: 'ยกระดับการบริหารกองทุน (ครั้งที่ 2)', subtitle: 'กิจกรรมพัฒนาศักยภาพกลุ่มอาชีพ', category: 'กิจกรรม',
        coverUrl: '', featured: 'FALSE',
        linkUrl: 'https://www.facebook.com/photo?fbid=1116633177330521&set=pcb.1116656553994850', linkLabel: 'อ่านเพิ่มเติม',
        content: '<p>กิจกรรมยกระดับการบริหารกองทุนของกลุ่มอาชีพ (ต่อเนื่อง) รายละเอียดเพิ่มเติมดูได้ที่เพจ Facebook ของโครงการ</p>' }
    ].forEach(function (n, i) {
      n.id = newId_(); n.date = ''; n.images = '[]'; n.published = 'TRUE'; n.order = String(i + 1);
      n.createdAt = now; n.updatedAt = now; insertRow_('News', n);
    });
  }

  /* ---------- Gallery ---------- */
  if (isEmpty('Gallery')) {
    var addG = function (section, list, captionPrefix) {
      list.forEach(function (p, i) {
        insertRow_('Gallery', { id: newId_(), section: section, url: img_(p), fileId: '', caption: captionPrefix ? captionPrefix + ' ' + (i + 1) : '', order: String(i + 1), published: 'TRUE', createdAt: now });
      });
    };
    addG('home_activity', SEED_IMAGES.activity, '');
    addG('home_congrats', SEED_IMAGES.congrats, '');
    addG('home_learning', SEED_IMAGES.learning, '');
    addG('model', SEED_IMAGES.model, '');
    addG('research', SEED_IMAGES.research, '');
  }

  /* ---------- Links ---------- */
  if (isEmpty('Links')) {
    [
      { section: 'learning', label: 'กดอ่านเพิ่มเติม — แหล่งเรียนรู้ (E-Book)', url: 'https://anyflip.com/bplsl/tedq/', description: 'หนังสืออิเล็กทรอนิกส์แหล่งเรียนรู้ของโครงการ', icon: '📖', style: 'button' },
      { section: 'dashboard_data', label: 'กดเพื่อดูข้อมูล และกรอกข้อมูล', url: 'https://netflik.my.canva.site/bvacdapy6e4rwgqz', description: 'หน้ารวมข้อมูลและแบบฟอร์มบันทึกข้อมูลของกลุ่มอาชีพ', icon: '📊', style: 'card' },
      { section: 'dashboard_data', label: 'ระบบบันทึกข้อมูลการเงินครัวเรือน', url: 'https://script.google.com/a/macros/yru.ac.th/s/AKfycbzQoFvdvlQltlcAM7QXNLPGU3TSrjn9OqXC_MK9Fw4JSqDU6QNbhDuKuYxsM5FUVtA/exec', description: 'ดูข้อมูลและกรอกข้อมูลผ่านระบบของมหาวิทยาลัย', icon: '📝', style: 'card' },
      { section: 'dashboard_debt', label: 'แบบฟอร์มรับสมัคร ADM ด้าน Financial Literacy', url: 'https://easy-tahfiz-v.my.canva.site/c4ph2xd5h7wr686v', description: 'รับสมัครผู้จัดการข้อมูลบัญชีชุมชน (ADM)', icon: '🧑‍🏫', style: 'card' },
      { section: 'dashboard_debt', label: 'แบบฟอร์มสำรวจหนี้ครัวเรือน', url: 'https://script.google.com/a/macros/yru.ac.th/s/AKfycbz7-0AhiuxjBWhSmDLYIJ8jrLO1fcWk3jsIywnX9QNZR-KyTYc31SYkwsBLxUQ6ZAaF-w/exec', description: 'สำรวจข้อมูลหนี้สินของครัวเรือนกลุ่มเป้าหมาย', icon: '📋', style: 'card' },
      { section: 'agency', label: 'อบต.สะเอะ', url: 'https://www.sa-ae.go.th/index.php', description: 'อำเภอกรงปินัง', icon: '🏛️', style: 'card' },
      { section: 'agency', label: 'อบต.กายูบอเกาะ', url: 'https://www.kayuboko.go.th/index.php', description: 'อำเภอรามัน', icon: '🏛️', style: 'card' },
      { section: 'agency', label: 'อบต.ตาเนาะปูเต๊ะ', url: 'https://tanohputae.go.th/index.php', description: 'อำเภอบันนังสตา', icon: '🏛️', style: 'card' },
      { section: 'agency', label: 'อบต.วังพญา', url: 'https://www.wangpaya.go.th/index.php', description: 'อำเภอรามัน', icon: '🏛️', style: 'card' },
      { section: 'agency', label: 'อบต.กอตอตือระ', url: 'https://www.kototeura.go.th/index.php', description: 'อำเภอรามัน', icon: '🏛️', style: 'card' }
    ].forEach(function (l, i) { l.id = newId_(); l.order = String(i + 1); l.published = 'TRUE'; insertRow_('Links', l); });
  }

  /* ---------- Indicators ---------- */
  if (isEmpty('Indicators')) {
    [
      { section: 'home', label: 'กลุ่มอาชีพนำร่อง', value: '3', unit: 'กลุ่ม', note: 'เชือกกล้วย · ข้าวโพดหวาน · ผักยกแคร่' },
      { section: 'home', label: 'สมาชิกกลุ่มอาชีพ', value: '80', unit: 'คน', note: '25 + 28 + 27 คน' },
      { section: 'home', label: 'อำเภอพื้นที่ดำเนินงาน', value: '3', unit: 'อำเภอ', note: 'รามัน · บันนังสตา · กรงปินัง' },
      { section: 'home', label: 'ภาคีเครือข่าย อบต.', value: '5', unit: 'แห่ง', note: 'องค์การบริหารส่วนตำบลในจังหวัดยะลา' },
      { section: 'dashboard', label: 'ยอดขายน้ำข้าวโพดหวาน', value: '100–200', unit: 'ขวด/เดือน', note: 'กลุ่มข้าวโพดหวาน' },
      { section: 'dashboard', label: 'รายได้เสริมกลุ่มข้าวโพดหวาน', value: '5,000–7,000', unit: 'บาท/เดือน', note: 'จากการแปรรูป' },
      { section: 'dashboard', label: 'รายได้เฉลี่ยสมาชิกผักยกแคร่', value: '≈2,000', unit: 'บาท/เดือน/คน', note: 'กลุ่มผักยกแคร่' }
    ].forEach(function (r, i) { r.id = newId_(); r.order = String(i + 1); r.published = 'TRUE'; insertRow_('Indicators', r); });
  }

  /* ---------- Steps (กระบวนการ) ---------- */
  if (isEmpty('Steps')) {
    [
      { title: 'สำรวจข้อมูลหนี้สินครัวเรือน', description: 'เก็บข้อมูลรายรับ รายจ่าย และหนี้สินของครัวเรือนกลุ่มอาชีพผ่านแบบสำรวจหนี้ครัวเรือน เพื่อใช้เป็นฐานข้อมูลในการวางแผน' },
      { title: 'พัฒนาผู้จัดการข้อมูลบัญชีชุมชน (ADM)', description: 'รับสมัครและพัฒนาสมรรถนะ ADM ด้านความรู้ทางการเงิน (Financial Literacy) เพื่อเป็นพี่เลี้ยงด้านการเงินให้ครัวเรือน' },
      { title: 'บันทึกและติดตามผ่าน Dashboard', description: 'ครัวเรือนและ ADM บันทึกข้อมูลการเงินผ่านแพลตฟอร์มดิจิทัล และติดตามผลผ่าน dashboard' },
      { title: 'ยกระดับการบริหารกองทุนกลุ่ม', description: 'จัดกิจกรรมพัฒนาการบริหารจัดการกองทุนของกลุ่มอาชีพให้มีระบบและโปร่งใส' },
      { title: 'เชื่อมโยงสถาบันการเงิน', description: 'พบปะและหารือกับผู้จัดการธนาคารและสหกรณ์ เพื่อเปิดช่องทางการเข้าถึงแหล่งทุนและบริการทางการเงินที่เหมาะสม' },
      { title: 'ส่งเสริมการออมสู่เป้าหมายแห่งศรัทธา', description: 'สร้างแรงจูงใจการออมผ่านกิจกรรมและรางวัล เช่น รางวัลอัลฮัจย์และอุมเราะห์ (กิจกรรมระยะที่ 3)' }
    ].forEach(function (s, i) { s.id = newId_(); s.imageUrl = ''; s.order = String(i + 1); s.published = 'TRUE'; insertRow_('Steps', s); });
  }

  /* ---------- Documents & Tools ---------- */
  if (isEmpty('Documents')) {
    insertRow_('Documents', {
      id: newId_(), kind: 'document', icon: '📖', title: 'แหล่งเรียนรู้ SRA YALA (E-Book)', category: 'สื่อการเรียนรู้', page: 'knowledge',
      description: 'หนังสืออิเล็กทรอนิกส์รวบรวมองค์ความรู้จากโครงการ อ่านออนไลน์ผ่าน AnyFlip',
      url: 'https://anyflip.com/bplsl/tedq/', fileId: '', fileName: '', mimeType: 'text/html', size: '',
      coverUrl: img_(SEED_IMAGES.learning[0]), downloads: '0', published: 'TRUE', order: '1', createdAt: now, updatedAt: now
    });
    [
      { title: 'แบบฟอร์มสำรวจหนี้ครัวเรือน', category: 'แบบสำรวจ', icon: '📋', page: 'dashboard_debt',
        description: 'แบบสำรวจข้อมูลรายรับ รายจ่าย และหนี้สินของครัวเรือนกลุ่มเป้าหมาย (ระบบออนไลน์ของมหาวิทยาลัย)',
        url: 'https://script.google.com/a/macros/yru.ac.th/s/AKfycbz7-0AhiuxjBWhSmDLYIJ8jrLO1fcWk3jsIywnX9QNZR-KyTYc31SYkwsBLxUQ6ZAaF-w/exec' },
      { title: 'ระบบบันทึกข้อมูลการเงินครัวเรือน', category: 'ระบบบันทึกข้อมูล', icon: '📝', page: 'dashboard_data',
        description: 'ดูข้อมูลและกรอกข้อมูลการเงินครัวเรือนผ่านระบบของมหาวิทยาลัย',
        url: 'https://script.google.com/a/macros/yru.ac.th/s/AKfycbzQoFvdvlQltlcAM7QXNLPGU3TSrjn9OqXC_MK9Fw4JSqDU6QNbhDuKuYxsM5FUVtA/exec' },
      { title: 'หน้ารวมข้อมูล Dashboard (Canva)', category: 'Dashboard', icon: '📊', page: 'dashboard_data',
        description: 'หน้ารวมข้อมูลและลิงก์กรอกข้อมูลของกลุ่มอาชีพ', url: 'https://netflik.my.canva.site/bvacdapy6e4rwgqz' },
      { title: 'แบบฟอร์มรับสมัคร ADM ด้าน Financial Literacy', category: 'แบบฟอร์ม', icon: '🧑‍🏫', page: 'dashboard_debt',
        description: 'รับสมัครผู้จัดการข้อมูลบัญชีชุมชน (ADM)', url: 'https://easy-tahfiz-v.my.canva.site/c4ph2xd5h7wr686v' }
    ].forEach(function (t, i) {
      t.id = newId_(); t.kind = 'tool'; t.fileId = ''; t.fileName = ''; t.mimeType = 'text/html'; t.size = ''; t.coverUrl = '';
      t.downloads = '0'; t.published = 'TRUE'; t.order = String(i + 2); t.createdAt = now; t.updatedAt = now;
      insertRow_('Documents', t);
    });
  }

  /* ---------- Reports (รายงานผลดำเนินการ) ----------
   * เรียบเรียงจากกิจกรรมที่เผยแพร่บนเว็บไซต์เดิม — ตัวเลข (ผู้เข้าร่วม งบประมาณ ความก้าวหน้า) ให้ผู้ดูแลกรอกเพิ่ม */
  if (isEmpty('Reports')) {
    [
      { title: 'กิจกรรมยกระดับการบริหารกองทุนกลุ่มอาชีพ', phase: '', status: 'เสร็จสิ้น', progress: '100',
        objective: 'พัฒนาการบริหารจัดการกองทุนของกลุ่มอาชีพให้มีระบบ โปร่งใส และตรวจสอบได้',
        result: 'จัดกิจกรรมยกระดับการบริหารกองทุนร่วมกับกลุ่มอาชีพ จำนวน 2 ครั้ง',
        coverUrl: img_(SEED_IMAGES.fund),
        content: '<p>ภาพและรายละเอียดกิจกรรม: <a href="https://www.facebook.com/photo/?fbid=1072929445034228&set=pcb.1072935308366975">ครั้งที่ 1</a> · <a href="https://www.facebook.com/photo?fbid=1116633177330521&set=pcb.1116656553994850">ครั้งที่ 2</a></p>' },
      { title: 'เชื่อมโยงกลุ่มอาชีพกับสถาบันการเงิน (ธนาคารและสหกรณ์)', phase: '', status: 'เสร็จสิ้น', progress: '100',
        objective: 'เปิดช่องทางการเข้าถึงแหล่งทุนและบริการทางการเงินที่เหมาะสมกับกลุ่มอาชีพ',
        result: 'พบปะและหารือกับผู้จัดการธนาคาร และผู้จัดการสหกรณ์',
        coverUrl: img_(SEED_IMAGES.bank), images: JSON.stringify([img_(SEED_IMAGES.bank), img_(SEED_IMAGES.coop)]),
        content: '<p>รายละเอียด: <a href="https://www.facebook.com/photo?fbid=1133159339011238&set=a.583504350643409">พบปะผู้จัดการธนาคาร</a> · <a href="https://www.facebook.com/photo?fbid=1101336668860172&set=a.583504350643409">พบปะผู้จัดการสหกรณ์</a></p>' },
      { title: 'กิจกรรมระยะที่ 3: รางวัลอัลฮัจย์และอุมเราะห์ ประจำปี 2568', fiscalYear: '2568', phase: '3', status: 'เสร็จสิ้น', progress: '100',
        objective: 'สร้างแรงจูงใจการออมของสมาชิกกลุ่มอาชีพสู่เป้าหมายแห่งศรัทธา',
        result: 'ประกาศผลรางวัลอัลฮัจย์และอุมเราะห์ ประจำปี 2568',
        coverUrl: img_(SEED_IMAGES.award), content: '' },
      { title: 'สำรวจหนี้สินครัวเรือนและพัฒนา ADM ด้าน Financial Literacy', phase: '', status: 'กำลังดำเนินการ', progress: '',
        objective: 'จัดทำฐานข้อมูลหนี้สินครัวเรือน และพัฒนาผู้จัดการข้อมูลบัญชีชุมชน (ADM) เป็นพี่เลี้ยงด้านการเงิน',
        result: 'เปิดแบบสำรวจหนี้ครัวเรือนและแบบฟอร์มรับสมัคร ADM ผ่านระบบออนไลน์',
        coverUrl: '', content: '' }
    ].forEach(function (r, i) {
      r.id = newId_(); r.fiscalYear = r.fiscalYear || ''; r.activityDate = ''; r.groupId = ''; r.location = ''; r.target = '';
      r.participants = ''; r.budget = ''; r.spent = ''; r.images = r.images || '[]'; r.fileId = ''; r.fileName = ''; r.fileUrl = '';
      r.published = 'TRUE'; r.order = String(i + 1); r.createdAt = now; r.updatedAt = now;
      insertRow_('Reports', r);
    });
  }

  /* ---------- KPIs (ตัวชี้วัด) — ค่าเป้าหมายให้ผู้ดูแลกรอกเพิ่ม ---------- */
  if (isEmpty('KPIs')) {
    [
      { name: 'กลุ่มอาชีพที่เข้าร่วมโครงการ', unit: 'กลุ่ม', result: '3' },
      { name: 'สมาชิกกลุ่มอาชีพที่เข้าร่วมโครงการ', unit: 'คน', result: '80' },
      { name: 'ภาคีเครือข่ายองค์การบริหารส่วนตำบล', unit: 'แห่ง', result: '5' }
    ].forEach(function (k, i) {
      k.id = newId_(); k.fiscalYear = ''; k.target = ''; k.note = ''; k.order = String(i + 1); k.published = 'TRUE';
      insertRow_('KPIs', k);
    });
  }
}

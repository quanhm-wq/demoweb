/* ============================================================
   Smart Pickleball — Lớp dữ liệu & nghiệp vụ dùng chung
   Mô phỏng CRM/DB bằng localStorage để các màn hình liên thông.
   ============================================================ */
(function (global) {
  "use strict";

  const KEY = "sbadm_state_v1";

  // ---------- Hằng số nghiệp vụ ----------
  const LEVELS = {
    newbie: { name: "Mới chơi (2.0)", cls: "lv-newbie", order: 0 },
    y:      { name: "Sơ cấp (2.5)", cls: "lv-y", order: 1 },
    tb:     { name: "Trung cấp (3.0)", cls: "lv-tb", order: 2 },
    tbc:    { name: "Khá (3.5)", cls: "lv-tbc", order: 3 },
    pro:    { name: "Giỏi (4.0+)", cls: "lv-pro", order: 4 },
  };
  const RACKETS = ["Selkirk Vanguard Power Air", "JOOLA Ben Johns Hyperion", "CRBN-1X Power Series", "Paddletek Bantam EX-L", "Franklin Signature", "Onix Evoke Premier"];
  const COURT_COUNT = 6;
  const CHECKIN_GRACE_MIN = 15; // quá 15p báo trống

  // ---------- Tiện ích ----------
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, "0");
  const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const fmtDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const fmtVND = (n) => n.toLocaleString("vi-VN") + "đ";
  const genPIN = () => String(Math.floor(1000 + Math.random() * 9000));

  // ---------- Seed dữ liệu ban đầu ----------
  function seed() {
    const now = new Date();
    const members = [
      mkMember("Nguyễn Văn An", "0901234567", "1995-04-12", "tbc", 0, 8, { gender: "m", address: "12 Nguyễn Huệ, Q.1, TP.HCM", pkg: "Gói 10 buổi", spent: 2340000, visits: 34 }),
      mkMember("Trần Thị Bình", "0912345678", "1999-08-25", "tb", 1, 5, { gender: "f", address: "45 Lê Lợi, Q.3, TP.HCM", pkg: "Gói 5 buổi", spent: 1180000, visits: 19 }),
      mkMember("Lê Hoàng Cường", "0987654321", "1990-01-03", "pro", 2, 12, { gender: "m", address: "78 Phan Xích Long, Phú Nhuận, TP.HCM", pkg: "Hội viên tháng", spent: 3600000, visits: 52 }),
      mkMember("Phạm Thu Dung", "0934567890", "2001-11-19", "y", 3, 3, { gender: "f", address: "23 Nguyễn Thị Minh Khai, Q.1, TP.HCM", pkg: "Vãng lai", spent: 480000, visits: 8 }),
      mkMember("Vũ Minh Đức", "0977123456", "1988-06-30", "tbc", 4, 6, { gender: "m", address: "9 Hoàng Văn Thụ, Tân Bình, TP.HCM", pkg: "Gói 10 buổi", spent: 1980000, visits: 27 }),
      mkMember("Hoàng Thị Em", "0965432109", "2003-02-14", "newbie", 5, 2, { gender: "f", address: "156 Cách Mạng Tháng 8, Q.10, TP.HCM", pkg: "Vãng lai", spent: 240000, visits: 5 }),
      mkMember("Đỗ Quang Huy", "0943210987", "1993-09-09", "tb", 6, 7, { gender: "m", address: "34 Điện Biên Phủ, Bình Thạnh, TP.HCM", pkg: "Gói 5 buổi", spent: 1500000, visits: 23 }),
      mkMember("Bùi Lan Chi", "0956789012", "1997-12-01", "tbc", 7, 4, { gender: "f", address: "67 Nguyễn Trãi, Q.5, TP.HCM", pkg: "Gói 5 buổi", spent: 900000, visits: 15 }),
    ];

    // Vài booking hôm nay
    const bookings = [];
    const mkSlot = (h) => { const d = new Date(now); d.setHours(h, 0, 0, 0); return d; };
    bookings.push(mkBooking(members[0], 1, mkSlot(now.getHours()), 90, "paid", true));
    bookings.push(mkBooking(members[2], 3, mkSlot(now.getHours()), 90, "paid", true));
    bookings.push(mkBooking(members[1], 2, mkSlot(now.getHours() + 1), 60, "paid", false));
    bookings.push(mkBooking(members[4], 5, mkSlot(now.getHours() - 1), 60, "paid", false)); // sẽ thành no-show
    bookings.push(mkBooking(members[6], 4, mkSlot(now.getHours() + 2), 90, "paid", false));

    // Sân
    const courts = [];
    for (let i = 1; i <= COURT_COUNT; i++) {
      courts.push({ id: i, name: "Sân " + i, status: "free", light: false, players: [], bookingId: null, checkinAt: null });
    }
    // Gán 2 sân đang chơi
    assignBooking(courts, bookings[0]);
    assignBooking(courts, bookings[1]);

    // Thư viện video (đoạn cut) do khách tự cắt & đăng lên, để chiếu lên màn LED
    const clips = [
      mkClip("Pha bóng đẹp — sân 3", 3, 14, "Khách đăng"),
      mkClip("Rally dài giao hữu tối qua", 1, 22, "Khách đăng"),
      mkClip("Cú smash quyết định", 5, 10, "Khách đăng"),
    ];

    return {
      members, bookings, courts, clips,
      led: { nowPlaying: null, court: 3, startedAt: null },
      revenueToday: bookings.filter(b => b.pay === "paid").reduce((s, b) => s + b.price, 0),
      lastCheckin: null,
      createdAt: now.toISOString(),
    };
  }

  function mkClip(title, court, durSec, source) {
    return { id: uid("clip"), title, court, durSec, source: source || "Tải lên", at: new Date().toISOString() };
  }

  function mkMember(name, phone, dob, level, faceIdx, sessions, opt) {
    opt = opt || {};
    return {
      id: uid("m"), name, phone, dob, level,
      gender: opt.gender || (faceIdx % 2 === 0 ? "m" : "f"),
      address: opt.address || "",
      racket: opt.racket || RACKETS[faceIdx % RACKETS.length],
      faceIdx,                 // dùng để mô phỏng "khuôn mặt đã đăng ký"
      sessionsLeft: sessions,  // số buổi còn lại
      pkg: opt.pkg || "Vãng lai",          // gói đang dùng
      spent: opt.spent || 0,               // tổng chi tiêu (doanh thu từ khách)
      joinedAt: opt.joinedAt || new Date().toISOString(),
      visits: opt.visits != null ? opt.visits : Math.floor(Math.random() * 40) + 5,
    };
  }

  function mkBooking(member, court, start, durationMin, pay, checkedIn) {
    const price = durationMin === 90 ? 180000 : 120000;
    const end = new Date(start.getTime() + durationMin * 60000);
    return {
      id: uid("b"), memberId: member.id, memberName: member.name, level: member.level,
      court, start: start.toISOString(), end: end.toISOString(), durationMin,
      pay, price, pin: genPIN(), qr: uid("QR"),
      checkedIn: !!checkedIn, checkinAt: checkedIn ? start.toISOString() : null,
      status: checkedIn ? "playing" : "booked",
    };
  }

  function assignBooking(courts, booking) {
    const c = courts.find((x) => x.id === booking.court);
    if (!c) return;
    c.status = "occupied"; c.light = true; c.bookingId = booking.id;
    c.checkinAt = booking.checkinAt;
    c.players = [{ name: booking.memberName, level: booking.level }];
  }

  // ---------- State I/O ----------
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        // Backfill cho dữ liệu cũ (tránh phải reset)
        if (!s.clips) s.clips = [
          mkClip("Pha bóng đẹp — sân 3", 3, 14, "Khách đăng"),
          mkClip("Rally dài giao hữu tối qua", 1, 22, "Khách đăng"),
        ];
        if (!s.led) s.led = { nowPlaying: null, court: 3, startedAt: null };
        return s;
      }
    } catch (e) {}
    const s = seed();
    save(s);
    return s;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    // báo cho các tab/màn khác
    try { global.dispatchEvent(new CustomEvent("sbadm:update")); } catch (e) {}
  }
  function reset() { localStorage.removeItem(KEY); return load(); }

  // ---------- Nghiệp vụ ----------
  // 1) Đăng ký thành viên
  function registerMember({ name, phone, dob, level, racket, gender, address, pkg }) {
    const s = load();
    const faceIdx = s.members.length;
    const m = mkMember(name, phone, dob, level, faceIdx, 0, { gender, address, racket, pkg, visits: 0, spent: 0 });
    s.members.push(m);
    save(s);
    return m;
  }

  // 2) Đặt sân online + thanh toán trước -> QR/PIN
  function createBooking({ memberId, court, startISO, durationMin, sessionsPack }) {
    const s = load();
    const m = s.members.find((x) => x.id === memberId);
    if (!m) throw new Error("Không tìm thấy thành viên");
    const start = new Date(startISO);
    const b = mkBooking(m, court, start, durationMin, "paid", false);
    const packPrice = { 5: 800000, 10: 1500000 }[sessionsPack] || 0;
    if (sessionsPack) { m.sessionsLeft += sessionsPack; m.pkg = "Gói " + sessionsPack + " buổi"; }
    const total = b.price + packPrice;
    m.spent = (m.spent || 0) + total;
    s.bookings.push(b);
    s.revenueToday += total;
    save(s);
    return b;
  }

  // Xếp sân theo trình độ: ưu tiên sân trống, ghép người cùng/kề trình độ
  function suggestCourt(level) {
    const s = load();
    const free = s.courts.filter((c) => c.status === "free");
    if (!free.length) return null;
    // tìm sân có người cùng trình độ trước (ghép cặp) — ở demo tất cả free nên trả sân trống đầu
    const lvOrder = LEVELS[level] ? LEVELS[level].order : 2;
    // ưu tiên sân trống có số nhỏ nhất
    free.sort((a, b) => a.id - b.id);
    return free[0].id;
  }

  // 3) Check-in bằng khuôn mặt -> trừ buổi, gán sân, thông báo
  function checkinByFace(faceIdx) {
    const s = load();
    const m = s.members.find((x) => x.faceIdx === faceIdx);
    if (!m) return { ok: false, reason: "Khuôn mặt chưa đăng ký" };

    // tìm booking hôm nay chưa check-in của thành viên
    let b = s.bookings.find((x) => x.memberId === m.id && !x.checkedIn);
    let assignedCourt;
    if (b) {
      assignedCourt = b.court;
    } else {
      assignedCourt = suggestCourt(m.level);
      if (!assignedCourt) return { ok: false, reason: "Hết sân trống" };
    }

    // trừ buổi
    let deducted = false;
    if (m.sessionsLeft > 0) { m.sessionsLeft -= 1; deducted = true; }

    const now = new Date();
    if (b) { b.checkedIn = true; b.checkinAt = now.toISOString(); b.status = "playing"; }

    const c = s.courts.find((x) => x.id === assignedCourt);
    if (c) {
      c.status = "occupied"; c.light = true; c.checkinAt = now.toISOString();
      c.bookingId = b ? b.id : null;
      if (!c.players.some((p) => p.name === m.name))
        c.players.push({ name: m.name, level: m.level });
    }

    s.lastCheckin = { memberId: m.id, name: m.name, level: m.level, court: assignedCourt, at: now.toISOString(), deducted };
    save(s);
    return { ok: true, member: m, court: assignedCourt, deducted, booking: b || null };
  }

  // Phát hiện no-show (quá giờ + grace mà chưa check-in)
  function detectNoShows() {
    const s = load();
    const now = Date.now();
    return s.bookings.filter((b) => {
      if (b.checkedIn) return false;
      const start = new Date(b.start).getTime();
      return now > start + CHECKIN_GRACE_MIN * 60000;
    });
  }

  // Bật/tắt đèn sân
  function toggleLight(courtId, on) {
    const s = load();
    const c = s.courts.find((x) => x.id === courtId);
    if (c) { c.light = on != null ? on : !c.light; save(s); }
    return c;
  }

  // Kết thúc / trả sân
  function releaseCourt(courtId) {
    const s = load();
    const c = s.courts.find((x) => x.id === courtId);
    if (c) { c.status = "free"; c.players = []; c.bookingId = null; c.checkinAt = null; c.light = false; save(s); }
  }

  // ---------- Quản lý màn hình LED (chiếu video đoạn cut) ----------
  function addClip({ title, court, durSec, source }) {
    const s = load();
    const c = mkClip(title || "Video mới", court || 1, durSec || 12, source || "Tải lên");
    s.clips.unshift(c);
    save(s);
    return c;
  }
  function removeClip(clipId) {
    const s = load();
    s.clips = s.clips.filter((c) => c.id !== clipId);
    if (s.led.nowPlaying && s.led.nowPlaying.id === clipId) s.led = { nowPlaying: null, court: s.led.court, startedAt: null };
    save(s);
  }
  function castToLed(clipId, court) {
    const s = load();
    const c = s.clips.find((x) => x.id === clipId);
    if (!c) return null;
    s.led = { nowPlaying: c, court: court || c.court || s.led.court, startedAt: new Date().toISOString() };
    save(s);
    return c;
  }
  function stopLed() {
    const s = load();
    s.led = { nowPlaying: null, court: s.led ? s.led.court : 3, startedAt: null };
    save(s);
  }
  function getLed() { return load().led; }

  // ---------- Helper UI dùng chung ----------
  // Ảnh đại diện thật (ảnh chân dung placeholder, đúng giới tính, ổn định theo faceIdx)
  function avatarUrl(m, size) {
    const g = (m && m.gender === "f") ? "women" : "men";
    const idx = m ? (m.faceIdx || 0) : 0;
    const n = (idx * 13 + 5) % 90;
    return `https://randomuser.me/api/portraits/${g}/${n}.jpg`;
  }

  function icon(name, size) {
    size = size || 20;
    const P = {
      shuttle: '<path d="M4 20l8-8m0 0l6-6a2 2 0 00-3-3l-6 6m3 3l3 3M8 12l-4 4 3 1 1 3 4-4"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
      users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0113 0"/><path d="M16 5.5a3.5 3.5 0 010 6.9M22 21a6.5 6.5 0 00-5-6.3"/>',
      grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      chart: '<path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 4-6"/>',
      monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
      scan: '<path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><path d="M3 12h18"/>',
      bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
      bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
      light: '<path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0012 2z"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 21v-3M17 21h1"/>',
      check: '<path d="M20 6L9 17l-5-5"/>',
      play: '<path d="M6 4l14 8-14 8V4z"/>',
      money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 000-8H9a4 4 0 010-8h5"/>',
      timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.shuttle}</svg>`;
  }

  function topbar(active) {
    const nav = [
      ["index.html", "Trang chủ", "grid"],
      ["app-booking.html", "Đặt sân", "calendar"],
      ["checkin-kiosk.html", "Check-in", "scan"],
      ["admin-dashboard.html", "Quản lý", "monitor"],
      ["crm.html", "Khách hàng", "users"],
      ["led-display.html", "Màn LED", "bolt"],
      ["match-analytics.html", "Phân tích AI", "chart"],
    ];
    const links = nav.map(([href, label, ic]) => {
      const on = active === href;
      return `<a href="${href}" class="btn btn-sm ${on ? "btn-primary" : "btn-ghost"}" style="${on ? "" : "border-color:transparent"}">${icon(ic, 16)}<span class="nav-label">${label}</span></a>`;
    }).join("");
    return `
    <header class="topbar">
      <div class="container" style="display:flex;align-items:center;gap:16px;height:60px;">
        <a href="index.html" class="brand"><span class="brand-mark">SP</span><span class="nav-label">Smart Pickleball</span></a>
        <nav style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;">${links}</nav>
      </div>
    </header>`;
  }

  let toastId = 0;
  function toast(title, msg, type) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const colors = { ok: "var(--color-accent)", warn: "var(--color-warning)", err: "var(--color-destructive)", info: "var(--color-info)" };
    const el = document.createElement("div");
    el.className = "toast";
    el.style.borderLeftColor = colors[type] || colors.ok;
    el.innerHTML = `<div style="color:${colors[type] || colors.ok}">${icon(type === "err" ? "bell" : "bell", 18)}</div>
      <div><div style="font-weight:700;font-size:14px">${title}</div><div class="muted" style="font-size:13px">${msg || ""}</div></div>`;
    wrap.appendChild(el);
    const id = ++toastId;
    setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 4200);
    return id;
  }

  // Mô phỏng "loa thông báo" bằng Web Speech (nếu trình duyệt hỗ trợ) + toast
  function announce(text) {
    toast("Loa thông báo", text, "info");
    try {
      if (global.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "vi-VN"; u.rate = 1;
        global.speechSynthesis.speak(u);
      }
    } catch (e) {}
  }

  // ---------- Export ----------
  global.SB = {
    KEY, LEVELS, RACKETS, COURT_COUNT, CHECKIN_GRACE_MIN,
    load, save, reset, seed,
    registerMember, createBooking, suggestCourt, checkinByFace,
    detectNoShows, toggleLight, releaseCourt,
    addClip, removeClip, castToLed, stopLed, getLed,
    // utils
    uid, pad, fmtTime, fmtDate, fmtVND, genPIN,
    avatarUrl, icon, topbar, toast, announce,
  };
})(window);

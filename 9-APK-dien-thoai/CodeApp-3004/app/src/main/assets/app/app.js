// app.js — giao diện ứng dụng SCI Công việc (Android). Khuôn lấy từ demo-apk-cong-viec.html; dữ liệu THẬT qua cầu nối window.Android.
// Hàm thuần (số chuông, chữ họp, 3 trạng thái dòng họp) dùng chung với bản PC: thuan.js.
(function () {
  "use strict";
  const NA = window.Android;
  const T = window.Thuan;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : iso || "");
  const homNay = () => T.bayGioVN().ngay;
  const cachNgay = (iso) => Math.round((Date.parse(iso.slice(0, 10) + "T00:00:00Z") - Date.parse(homNay() + "T00:00:00Z")) / 86400000); // âm = quá hạn
  const luu = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* không lưu được thì thôi */ } };
  const doc = (k, mac) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : mac; } catch (e) { return mac; } };

  // ---------- cầu nối ----------
  const cbs = {};
  let seq = 0;
  window.__cb = (id, ma, txt) => { const f = cbs[id]; delete cbs[id]; if (f) f(ma, txt); };
  function api(method, path, body) {
    return new Promise((ok) => {
      const id = ++seq;
      cbs[id] = (ma, txt) => {
        let j = null;
        try { j = JSON.parse(txt); } catch (e) { /* không phải JSON */ }
        if (ma === 401) hetPhien();
        ok({ ma, j, txt, path });
      };
      NA.api(id, method, path, body ? JSON.stringify(body) : "");
    });
  }
  // Báo lỗi kèm đường dẫn + mã để chụp màn hình gửi lại là biết máy chủ thiếu chỗ nào
  const loiCau = (r) => (r.j && r.j.loi) || (r.ma === 0 ? "Không kết nối được máy chủ" : r.ma === 403 ? "Bạn không có quyền xem mục này" : r.ma === 404 ? "Máy chủ này chưa có chức năng này [404 " + (r.path || "") + (r.txt ? " → " + String(r.txt).replace(/\s+/g, " ").slice(0, 80) : "") + "]" : "Lỗi " + r.ma + " [" + (r.path || "") + "]");

  // ---------- trạng thái ----------
  const S = { dangNhap: false, server: "", email: "", ten: "", so: 0, soMoi: 0, hop: [] };
  const tt = { tab: "toi", vai: "nhan", dv: null, da: null, loc: "tat-ca", sua: null, d: 0, mo: null, thao: "", qh: false };
  const CACHE = {};
  // bản 3004 — trạng thái mục «Trợ lý» (chat với trợ lý AI của Main); hàm ở phần «TRỢ LÝ MAIN» cuối tệp
  const CHAT = { mo: false, dn: null, ds: null, xemDs: false, phien: null, ten: "", tin: [], cho: [], gui: false, batDau: 0, loi: "", tai: false, tok: 0, dem: 0,
    da: "", dsDa: null, moDa: false, timDa: "" }; // dự án đang hỏi (AP-01): da = id, dsDa = mảng {id,name} | {loi} | null (chưa tải)
  let ST = null; // trạng thái dòng họp hiện tại

  function docTrangThai() {
    try { Object.assign(S, JSON.parse(NA.trangThai())); } catch (e) { /* giữ trạng thái cũ */ }
  }
  // Đổi tài khoản / đăng xuất: bỏ mọi thứ nhớ của người trước (việc, người nhận, bình luận, tệp đang kẹp, id của «tôi»)
  function xoaBoNho() {
    Object.keys(CACHE).forEach((k) => delete CACHE[k]);
    Object.keys(CMT).forEach((k) => delete CMT[k]);
    TEP.bl = {}; TEP.xong = []; TEP.giao = []; MO_XONG.clear();
    tt.mo = null; tt.dv = null; tt.da = null; tt.thao = ""; GV = null; F = null; XEM.tok++;
    CHON = null; TIM.q = ""; TIM.loai = ""; TIM.mo = false; $("tim-q").value = ""; $("tim-loai").value = "";
    CHAT.tok++; CHAT.phien = null; CHAT.ten = ""; CHAT.tin = []; CHAT.cho = []; CHAT.ds = null; CHAT.gui = false; CHAT.loi = ""; CHAT.xemDs = false; // bản 3004
    CHAT.da = ""; CHAT.dsDa = null; CHAT.moDa = false; CHAT.timDa = ""; CHAT.daThuTuDn = false;
  }
  function hetPhien() {
    S.dangNhap = false;
    hienDangNhap("Phiên đăng nhập đã hết hạn — đăng nhập lại");
  }

  // ---------- đăng nhập ----------
  function hienDangNhap(loi) {
    $("man-dn").classList.add("mo");
    $("dn-s").value = S.server || ""; // bản 3004: không có địa chỉ mặc định — mỗi máy chủ một IP LAN (gợi ý ở ô: http://192.168.1.10:3004)
    $("dn-e").value = S.email || "";
    $("dn-loi").textContent = loi || "";
    $("dn-loi").classList.remove("goi-y-dc");
    if (!loi) canhBaoHttp();
  }
  // Bản 3004 (duyệt 01/11/2026, câu 1A): máy chủ ở mạng LAN → http:// tới IP riêng là BÌNH THƯỜNG, không cảnh báo.
  // Bản gốc viết /^http:///i — dấu // biến nửa sau thành chú thích nên ô lỗi hiện chữ «/^http:/» mỗi lần gõ; sửa ở đây.
  function nhanXetDiaChi(v) {
    const m = /^(https?):\/\/\[?([^/:\]]+)\]?(?::\d+)?\/?$/i.exec(String(v || "").trim());
    if (!m) return "";
    const host = m[2].toLowerCase();
    if (host === "localhost" || /^127\./.test(host)) return "ⓘ Trên điện thoại «localhost» là chính điện thoại. Nhập IP máy tính chạy 3004 trong Wi-Fi (vd http://192.168.1.10:3004), trừ khi đang cắm cáp USB và đã chạy «adb reverse tcp:3004 tcp:3004».";
    const rieng = /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /\.local$/.test(host);
    if (m[1].toLowerCase() === "http" && !rieng) return "⚠ Địa chỉ http:// ra Internet gửi mật khẩu không mã hoá — dùng https://";
    return "";
  }
  const canhBaoHttp = () => {
    const s = nhanXetDiaChi($("dn-s").value);
    $("dn-loi").textContent = s;
    $("dn-loi").classList.toggle("goi-y-dc", s.startsWith("ⓘ"));
  };
  $("dn-s").addEventListener("input", canhBaoHttp);
  $("dn-f").addEventListener("submit", (ev) => {
    ev.preventDefault();
    $("dn-b").disabled = true;
    $("dn-loi").textContent = "";
    const id = ++seq;
    cbs[id] = (ma, txt) => {
      $("dn-b").disabled = false;
      let j = {};
      try { j = JSON.parse(txt); } catch (e) { /* bỏ */ }
      if (ma === 200) { $("man-dn").classList.remove("mo"); $("dn-m").value = ""; xoaBoNho(); docTrangThai(); ve(); veChuong(); veHop(); napTab(); CHAT.daThuTuDn = false; tuDnMain(true); } // vào luôn trợ lý Main, chạy nền
      else { $("dn-loi").classList.remove("goi-y-dc"); $("dn-loi").textContent = (j.loi || "Đăng nhập không được") + (nhanXetDiaChi($("dn-s").value).startsWith("ⓘ") ? " — " + nhanXetDiaChi($("dn-s").value) : ""); }
    };
    canhBaoHttp();
    NA.dangNhap(id, $("dn-s").value, $("dn-e").value, $("dn-m").value);
  });

  // ---------- toast + khung kéo lên ----------
  const toast = (s) => { const t = $("toast"); t.textContent = s; t.style.display = "block"; setTimeout(() => (t.style.display = "none"), 2400); };
  const mo = (html) => { $("khung").innerHTML = html; $("man").classList.add("mo"); };
  const dong = () => $("man").classList.remove("mo");
  $("man").addEventListener("click", (e) => e.target === $("man") && dong());

  // ---------- chuông + dòng họp ----------
  function veChuong() {
    const so = $("so");
    if (S.so > 0) { so.style.display = ""; so.textContent = T.chuSo(S.so, S.soMoi); so.className = Math.min(S.soMoi, S.so) ? "so" : "so tinh"; }
    else so.style.display = "none";
  }
  function veHop() {
    const bay = T.bayGioVN();
    const hien = S.dangNhap ? S.hop.filter((c) => T.conHien(c, bay)) : [];
    const el = $("hop");
    if (!hien.length) { el.className = ""; ST = null; return; }
    ST = T.trangThaiHop(hien, bay);
    $("hop-chu").textContent = ST.chu;
    el.className = "co " + ST.kieu;
  }
  const vaoHop = (c) => (T.laDuongDanHop(c.duong_dan) ? NA.moWeb(c.duong_dan) : window.moLienKet("/phong-hop?ngay=" + c.ngay)); // đường họp trực tuyến thật thì mở ngoài; không có thì vào Phòng họp trong app
  $("hop").addEventListener("click", async () => {
    if (!ST) return;
    const bay = T.bayGioVN();
    const hien = S.hop.filter((c) => T.conHien(c, bay));
    if (ST.chua_xem.length) {
      // bấm lần 1: chỉ đánh dấu ĐÃ XEM (chữ chuyển sang chạy ngang)
      const ids = ST.chua_xem;
      S.hop = S.hop.map((c) => (ids.includes(c.id) ? Object.assign({}, c, { da_xem: true }) : c));
      veHop();
      await api("POST", "/api/phong-hop/cua-toi", { ids });
      NA.dongBoNgay();
      toast("Đã xem — bấm lần nữa để vào họp");
    } else if (hien.length === 1) vaoHop(hien[0]);
    else mo("<h2>Cuộc họp của tôi</h2>" + hien.map((c) => `<button class="dong-chon" data-vaohop="${c.id}"><span>${esc(T.chuDongHop(c, bay))}</span><span class="n">vào ›</span></button>`).join(""));
  });

  // ---------- thông báo (chuông) ----------
  let TB_DA = false; // đang xem tin ĐÃ ĐỌC (nút góc dưới trái) hay tin chưa đọc
  const soDaDoc = (d) => (d && (d.so_da_doc != null ? d.so_da_doc : d.da_doc_gan_day)) || 0; // 3004 gọi da_doc_gan_day, bản hosting gọi so_da_doc
  function veChanTb() {
    $("tb-da-doc").textContent = TB_DA ? "‹ Về tin chưa đọc" : "Xem tin đã đọc" + (soDaDoc(CACHE.tb) ? " (" + soDaDoc(CACHE.tb) + ")" : "");
    $("doc-het").style.display = TB_DA ? "none" : "";
  }
  async function moThongBao() {
    TB_DA = false; veChanTb();
    $("man-tb").classList.add("mo");
    ve_tb(CACHE.tb, CACHE.tb ? "Đang cập nhật…" : "Đang tải…");
    const r = await api("GET", "/api/thong-bao?gioi_han=200&mo=1");
    if (r.ma === 200 && r.j) { CACHE.tb = r.j; NA.dongBoNgay(); if (!TB_DA) { veChanTb(); ve_tb(r.j, ""); } return; } // đang xem tin đã đọc thì chỉ nhớ kết quả, không vẽ đè
    if (TB_DA) return;
    else ve_tb(CACHE.tb, (CACHE.tb ? "Không cập nhật được: " : "") + loiCau(r));
  }
  function ve_tb(d, ghiChu) {
    const el = $("ds-tb");
    if (!d) { el.innerHTML = `<div class="tb">${esc(ghiChu)}</div>`; return; }
    const nhom = T.gopTin(d.thong_bao || [], d.moc_cu || 0);
    // Tin ĐÃ ĐỌC: xếp thuần theo giờ mới nhất trước (01/11/2026). gopTin xếp theo LOẠI trước (quá hạn, nhắc nộp lên đầu) rồi mới tới giờ — đúng cho tin chưa đọc,
    // nhưng ở danh sách đã đọc làm tin cũ loại đỏ đứng trên bình luận mới (anh thấy ở máy giả lập; máy thật toàn bình luận nên không lộ)
    if (TB_DA) nhom.sort((a, b) => (a.luc < b.luc ? 1 : a.luc > b.luc ? -1 : 0));
    el.innerHTML = (ghiChu ? `<div class="tb"><small>${esc(ghiChu)}</small></div>` : "")
      + (nhom.length ? nhom.map((g, i) => `<div class="tb ${T.LOAI_DO.has(g.loai) && g.chua_doc ? "do" : ""}" data-tin="${i}">${T.LOAI_TEN[g.loai] ? "<b>" + esc(T.LOAI_TEN[g.loai]) + "</b>" : ""}${g.moi ? '<span class="mn">!</span>' : ""}${esc(g.noi_dung)}<br><small>${esc(new Date(g.luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }))}${g.ids.length > 1 ? " · ×" + g.ids.length : ""}</small></div>`).join("")
        : '<div class="tb">' + (TB_DA ? "Chưa có tin đã đọc nào trong 7 ngày qua." : "Không còn thông báo chưa đọc.") + "</div>");
    el._nhom = nhom;
  }
  // «Xem tin đã đọc» (góc dưới trái): tin đã đọc giữ lại 7 ngày; bấm lần nữa để về tin chưa đọc
  $("tb-da-doc").addEventListener("click", async () => {
    TB_DA = !TB_DA; veChanTb();
    if (!TB_DA) { ve_tb(CACHE.tb, ""); return; }
    ve_tb({ thong_bao: [] }, "Đang tải tin đã đọc…");
    const r = await api("GET", "/api/thong-bao?gioi_han=100&xem=da_doc&da_doc=1"); // 3004 hiểu xem=da_doc, bản hosting hiểu da_doc=1
    if (!TB_DA) return;
    if (r.ma === 200 && r.j) ve_tb({ thong_bao: r.j.thong_bao || [], moc_cu: 0 }, "");
    else ve_tb({ thong_bao: [] }, "Không tải được tin đã đọc: " + loiCau(r));
  });
  $("ds-tb").addEventListener("click", async (e) => {
    const t = e.target.closest("[data-tin]");
    if (!t) return;
    const g = $("ds-tb")._nhom[Number(t.dataset.tin)];
    if (g.chua_doc) await api("POST", "/api/thong-bao", { ids: g.ids });
    if (g.chua_doc) CACHE.tb = null; // tin vừa đọc rời chuông: lần mở sau tải lại
    NA.dongBoNgay();
    $("man-tb").classList.remove("mo");
    if (g.lien_ket) moLienKet(g.lien_ket);
  });
  $("doc-het").addEventListener("click", async () => {
    await api("POST", "/api/thong-bao", { tat_ca: true });
    CACHE.tb = null;
    S.so = 0; S.soMoi = 0; veChuong();
    NA.dongBoNgay();
    ve_tb({ thong_bao: [] }, "");
    toast("Đã đánh dấu đã đọc hết");
  });
  $("b-chuong").addEventListener("click", moThongBao);
  $("tb-lui").addEventListener("click", () => $("man-tb").classList.remove("mo"));

  // ---------- thẻ việc ----------
  const dem = (ds) => ({ n: ds.length, qua: ds.filter((v) => v.tt === "tre").length });
  // Nút «!» đỏ: chỉ hiện việc QUÁ HẠN ở Việc của tôi · Phòng ban · Dự án. Công tắc ở Cấu hình: ẩn phòng/dự án/đơn vị con 0 việc (Mr. Đại chốt 28/10/2026)
  const qh = () => !!tt.qh;
  // Tìm việc (nút kính lúp): ô lọc «chưa / đã giao chuyển tiếp» + gõ chữ lọc theo tên việc, áp cho danh sách đang hiện (Mr. Đại giao 28/10/2026)
  const TIM = { mo: false, loai: "", q: "" };
  const khongDau = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/đ/g, "d"); // toLowerCase TRƯỚC: «Đ» hoa không tách dấu, phải thành «đ» rồi mới đổi
  const timDangLoc = () => !!TIM.loai || !!TIM.q.trim();
  const dongSoCai = (ma) => (CACHE.sd && CACHE.sd.viec.find((x) => x.ma === ma)) || null; // cờ giao chuyển tiếp nằm ở hàng sổ cái
  const loTim = (ds) => {
    if (!timDangLoc()) return ds;
    const q = khongDau(TIM.q.trim());
    return ds.filter((v) => {
      if (q && !khongDau([v.ten || v.tenViec, v.ma, v.duAn, v.chu, v.giao].join(" ")).includes(q)) return false;
      if (!TIM.loai) return true;
      const r = v.ctCo !== undefined ? v : dongSoCai(v.ma);
      if (!r) return false;
      return TIM.loai === "chua" ? r.ctChua : r.ctCo && !r.ctChua;
    });
  };
  const loQ = (ds) => loTim(qh() ? ds.filter((v) => v.tt === "tre") : ds);
  const anTrong = () => !!KHO.anTrong || qh() || timDangLoc();
  // Gom theo NGƯỜI: người xếp theo TÊN (chữ cuối) A–Z — Anh → Hương → Thịnh (Mr. Đại chốt 28/10); cuối cùng «Việc chung — chưa giao cá nhân»
  const tenGoi = (ho) => String(ho || "").trim().split(/\s+/).pop();
  const soTen = (a, b) => tenGoi(a).localeCompare(tenGoi(b), "vi") || String(a).localeCompare(String(b), "vi");
  const nguoiCua = (v) => { if (v.nguoiTen !== undefined) return v.nguoiTen; const r = dongSoCai(v.ma); return r ? r.nguoiTen : v.chu || null; };
  function gomNguoi(ds, tenChung) {
    const theo = new Map(), chung = [];
    ds.forEach((v) => { const n = nguoiCua(v); if (n) String(n).split(", ").forEach((t) => theo.set(t, (theo.get(t) || []).concat(v))); else chung.push(v); });
    let h = [...theo.keys()].sort(soTen).map((n) => '<div class="nhom2">' + esc(n) + " <small>(" + theo.get(n).length + ")</small></div>" + theo.get(n).map(the).join("")).join("");
    if (chung.length) h += '<div class="nhom2 chung">' + esc(tenChung) + " — chưa giao cá nhân <small>(" + chung.length + ")</small></div>" + chung.map(the).join("");
    return h;
  }
  const so = (a) => `${a.n} việc${a.qua ? ` · <span class="do">${a.qua} quá hạn</span>` : ""}`;
  const tong = (ds, them) => { const d = dem(ds); return `<div class="tong"><b>${d.n} việc</b>${d.qua ? ` · <span class="do">${d.qua} quá hạn</span>` : ""}${them ? " · " + them : ""}</div>`; };
  const thongBaoLoi = (r, ten) => `<div class="tong">Không tải được ${esc(ten)}: ${esc(loiCau(r))}</div><div class="tong"><button class="nut" data-tai-lai="1">Thử lại</button></div>`;

  // ---------- Việc của tôi (nối /api/viec-cua-toi: viec_nhan · viec_phoi_hop · viec_giao) ----------
  const chuyenDong = (v) => ({
    ma: v.ma_viec_base, ten: v.ten, duAn: v.du_an, han: v.han, tt: v.qua_han_ngay > 0 ? "tre" : v.tt === "sap" ? "sap" : "con",
    ttChu: v.qua_han_ngay > 0 ? "quá hạn " + v.qua_han_ngay + " ngày" : v.tt_chu || "", chu: v.chu_tri, giao: v.nguoi_giao, gang: !!v.gang, duong: v.duong_mo,
  });
  // Bản live cũ chưa có /api/viec-cua-toi (trả 404) → tự dựng 3 danh sách từ /api/so-cai + /api/toi, CHÉP luật locViecCuaToi của 3004:
  //  nhận = tôi chủ trì đích danh · phối hợp = phần phối hợp chưa xong của tôi (tôi không chủ trì) · giao = tôi giao tay (giao_boi là tôi)
  // «tôi» là ai trong sơ đồ: chức danh lãnh đạo tôi giữ + đơn vị tôi đứng đầu (không tính ô chức danh) — chép toiLocMay của 3004 (cong-base-thuan.ts)
  async function napVaiToi(me) {
    const j = await soDoThoTaiDay();
    const ld = new Set(((j && j.lanh_dao) || []).map((l) => l.id));
    CACHE.chucDanh = (me.don_vi_ids || []).filter((x) => ld.has(x));
    const d0 = me.don_vi_dau || ((me.vai_tro || []).includes("truong-don-vi") ? me.don_vi_ids || [] : []);
    CACHE.donViTruong = d0.filter((x) => !ld.has(x));
  }
  async function toiTuSoCai() {
    const [a, b, g] = await Promise.all([api("GET", "/api/toi"), api("GET", "/api/so-cai"), api("GET", "/api/phong/viec-gang")]);
    if (a.ma !== 200 || !a.j || !a.j.id) return { loi: a.ma === 200 ? { ma: 0, j: { loi: "Máy chủ không cho biết bạn là ai" } } : a };
    if (b.ma !== 200 || !b.j) return { loi: b };
    CACHE.me = a.j;
    await napVaiToi(a.j);
    const me = a.j.id, cd = CACHE.chucDanh || [], dau = CACHE.donViTruong || [];
    const gang = new Set((g.j && g.j.ids) || []);
    const hn = b.j.hom_nay || homNay();
    const L = { nhan: [], phoi: [], giao: [] };
    (b.j.viec || []).forEach((v) => {
      if (v.trang_thai && v.trang_thai !== "dang_mo") return;
      const pt = (v.phan_viec || []).filter((p) => !p.da_bo);
      const vai = (p) => (p.vai === "phoi_hop" ? "phoi_hop" : "chu_tri");
      const laToi = (p) => (p.phu_trach_loai === "nguoi" ? p.phu_trach_id === me : cd.includes(p.phu_trach_id));
      const laCua = (p) => laToi(p) || (p.phu_trach_loai === "don_vi" && dau.includes(p.phu_trach_id));
      const ct = pt.filter((p) => vai(p) === "chu_tri" && p.trang_thai === "dang_lam");
      const han = v.ket_thuc ? v.ket_thuc.slice(0, 10) : null; // hạn = ket_thuc của việc, như base.viec_cua_toi (cong-base.ts)
      let t = "con", chu = "", qua = 0;
      if (v.luon_mo || !han) chu = "việc thường xuyên";
      else { const n = cachNgay(han); if (n < 0) { t = "tre"; qua = -n; } else if (n <= 3) { t = "sap"; chu = n === 0 ? "đến hạn hôm nay" : "còn " + n + " ngày"; } else chu = "còn " + n + " ngày"; }
      const dong = { ma_viec_base: v.id, ten: v.ten, du_an: v.du_an, han, qua_han_ngay: qua, tt: t, tt_chu: chu, chu_tri: ct.map((p) => p.phu_trach_ten || p.phu_trach_id).filter((x, i, A) => A.indexOf(x) === i).join(", "), nguoi_giao: "", gang: gang.has(v.id) };
      if (pt.some((p) => vai(p) === "chu_tri" && laToi(p))) L.nhan.push(dong);
      if (!pt.some((p) => vai(p) === "chu_tri" && laCua(p)) && pt.some((p) => vai(p) === "phoi_hop" && p.trang_thai === "dang_lam" && laCua(p))) L.phoi.push(dong);
      if (v.giao_boi === me && ["giao_tay", "bang_quyet_dinh"].includes(((v.nguon_hien_hanh || {}).du_lieu || {}).nguon_bang || "")) L.giao.push(dong);
    });
    return { viec: { viec_nhan: L.nhan, viec_phoi_hop: L.phoi, viec_giao: L.giao } };
  }
  const coQuyenGiao = () => (CACHE.coGiao !== undefined ? CACHE.coGiao : CACHE.me ? !!(CACHE.me.la_quan_tri || (CACHE.me.quyen && CACHE.me.quyen["cong_viec.giao"])) : false);
  async function taiToi() {
    const r = await api("GET", "/api/viec-cua-toi");
    if (r.ma === 200 && r.j && typeof r.j.co_quyen_giao === "boolean") CACHE.coGiao = r.j.co_quyen_giao;
    if (r.ma === 200 && r.j && r.j.viec) { CACHE.toi = r.j.viec; CACHE.toiLoi = null; }
    else if (r.ma === 404) {
      const k = await toiTuSoCai();
      if (k.viec) { CACHE.toi = k.viec; CACHE.toiLoi = null; } else CACHE.toiLoi = k.loi;
    } else CACHE.toiLoi = r;
    if (tt.tab === "toi") ve();
    if (!CACHE.sd && S.dangNhap) taiSoDo().then(() => { if (tt.tab === "toi") ve(); });
    taiXong().then(() => { if (tt.tab === "toi") ve(); }).catch(() => undefined);
  }
  function manToi() {
    if (!CACHE.toi) return CACHE.toiLoi ? thongBaoLoi(CACHE.toiLoi, "Việc của tôi") : '<div class="tong">Đang tải…</div>';
    if (TIM.loai && !CACHE.sd) return CACHE.sdLoi ? thongBaoLoi(CACHE.sdLoi, "dữ liệu giao chuyển tiếp") : '<div class="tong">Đang tải dữ liệu giao chuyển tiếp…</div>';
    const v = CACHE.toi;
    const L = { nhan: loQ((v.viec_nhan || []).map(chuyenDong)), phoi: loQ((v.viec_phoi_hop || []).map(chuyenDong)), giao: loQ((v.viec_giao || []).map(chuyenDong)) };
    const ds = L[tt.vai];
    const nut = (k, ten) => `<button data-vai="${k}" class="${tt.vai === k ? "dang" : ""}">${ten}<small>${L[k].length} việc${dem(L[k]).qua ? " · " + dem(L[k]).qua + " quá hạn" : ""}</small></button>`;
    return `<div class="bo-loc"><div class="doan">${nut("nhan", "Tôi nhận")}${nut("phoi", "Cần phối hợp")}${nut("giao", "Tôi giao")}</div></div>`
      + (qh() && !ds.length ? '<div class="tong">Không có việc quá hạn.</div>' : "") + tong(ds, tt.vai === "giao" ? "việc tôi đã giao đang mở" : tt.vai === "phoi" ? "phần phối hợp của tôi chưa xong" : "tôi chủ trì đích danh") + gomNguoi(ds, "Việc giao cho cả đơn vị") + khoiXong("toi:" + tt.vai, xongCuaToi(tt.vai));
  }

  // ---------- «Việc làm xong: Tuần N−1 và N» (3004: SoDoPhong.tsx:671 · viec.ts khoangViecLamXong) ----------
  // Việc hoàn thành từ đầu TUẦN TRƯỚC tới hết tuần này (không quá hôm nay), mới xong đứng trước; khối xanh, mặc định ĐÓNG, không nhớ, chỉ xem; ẩn khi bật lọc quá hạn.
  const tuanCua = (ngay) => {
    const t = Date.parse(ngay + "T00:00:00Z"), thu = (new Date(t).getUTCDay() + 6) % 7, tu = new Date(t - thu * 864e5).toISOString().slice(0, 10);
    const thuNam = Date.parse(tu + "T00:00:00Z") + 3 * 864e5, nam = new Date(thuNam).getUTCFullYear();
    return { so: 1 + Math.floor(Math.round((thuNam - Date.UTC(nam, 0, 1)) / 864e5) / 7), tu, den: T.congNgay(tu, 6) };
  };
  const khoangLamXong = () => { const hn = homNay(), nay = tuanCua(hn), truoc = tuanCua(T.congNgay(nay.tu, -7)); return { tu: truoc.tu, den: nay.den < hn ? nay.den : hn, nhan: "Việc làm xong: Tuần " + truoc.so + " và " + nay.so }; };
  const ngayXong = (v) => (v.dong_luc ? new Date(Date.parse(v.dong_luc) + 7 * 3600e3).toISOString().slice(0, 10) : null);
  const MO_XONG = new Set();
  async function taiXong() {
    const k = khoangLamXong();
    const [a, b] = await Promise.all([CACHE.me ? Promise.resolve({ ma: 200, j: CACHE.me }) : api("GET", "/api/toi"), api("GET", "/api/so-cai/da-xong?tu=" + k.tu)]);
    if (a.ma === 200 && a.j && a.j.id) { CACHE.me = a.j; if (!CACHE.chucDanh) await napVaiToi(a.j); }
    CACHE.xongRaw = b.ma === 200 && b.j ? (b.j.viec || []).filter((v) => { const n = ngayXong(v); return n && n >= k.tu && n <= k.den; }).sort((x, y) => (ngayXong(y) > ngayXong(x) ? 1 : ngayXong(y) < ngayXong(x) ? -1 : 0)) : null;
  }
  const theXong = (v, ex) => Object.assign({ ma: v.id, ten: v.ten, duAn: v.du_an, han: null, tt: "xong", ttChu: "đã xong " + fmt(ngayXong(v)), gang: false, chu: "", giao: "" }, ex || {});
  function xongCuaToi(loai) {
    const raw = CACHE.xongRaw, me = CACHE.me;
    if (!raw || !me) return [];
    const dau = CACHE.donViTruong || [], cdm = CACHE.chucDanh || [];
    const vai = (x) => (x.vai === "phoi_hop" ? "phoi_hop" : "chu_tri"), laToi = (x) => (x.phu_trach_loai === "nguoi" ? x.phu_trach_id === me.id : cdm.includes(x.phu_trach_id));
    const laCua = (x) => laToi(x) || (x.phu_trach_loai === "don_vi" && dau.includes(x.phu_trach_id));
    return raw.filter((v) => {
      const pt = (v.phan_viec || []).filter((x) => !x.da_bo);
      if (loai === "giao") return v.giao_boi === me.id && ["giao_tay", "bang_quyet_dinh"].includes(((v.nguon_hien_hanh || {}).du_lieu || {}).nguon_bang || "");
      if (loai === "nhan") return pt.some((x) => vai(x) === "chu_tri" && laToi(x));
      return !pt.some((x) => vai(x) === "chu_tri" && laCua(x)) && pt.some((x) => vai(x) === "phoi_hop" && laCua(x)); // 3004: phần phối hợp của tôi đã xong vẫn tính (cong-base.ts)
    }).map((v) => theXong(v, { chu: (v.phan_viec || []).filter((x) => vai(x) === "chu_tri").map((x) => x.phu_trach_ten || x.phu_trach_id).join(", ") }));
  }
  function khoiXong(khoa, ds) {
    if (tt.qh || TIM.loai) return ""; // việc đã xong không còn phần chủ trì mở → không thuộc «chưa/đã giao chuyển tiếp»
    ds = loTim(ds);
    if (!ds.length) return "";
    const k = khoangLamXong(), mo_ = MO_XONG.has(khoa), n = Math.round((Date.parse(k.den) - Date.parse(k.tu)) / 864e5) + 1;
    return '<div class="khoi-xong"><button class="dong-khoi-xong" data-moxong="' + esc(khoa) + '"><span>' + (mo_ ? "▾" : "▸") + "</span> " + esc(k.nhan) + '<span class="so-xong">' + ds.length + "</span></button>"
      + (mo_ ? '<div class="mo-nho" style="padding:0 14px 6px">' + n + " ngày · " + isoSangVN(k.tu) + " – " + isoSangVN(k.den) + " — chỉ xem</div>" + ds.map(the).join("") : "") + "</div>";
  }
  const xongDonVi = (id) => { const ids = CACHE.sd.cay(id); return ((CACHE.sd && CACHE.sd.xong) || []).filter((v) => duocO(v, id) && v.dv.some((u) => ids.includes(u))); };
  // Việc xong của đơn vị nào kê vào đơn vị đó (không gom lên đơn vị cha); riêng Ban lãnh đạo là thống kê toàn công ty (Mr. Đại chốt 29/10/2026)
  const xongRieng = (id) => ((CACHE.sd && CACHE.sd.xong) || []).filter((v) => duocO(v, id) && v.dv.includes(id));
  const xongDuAn = (id) => ((CACHE.sd && CACHE.sd.xong) || []).filter((v) => v.daId === id);

  // ---------- Phòng ban + Dự án (nối /api/phong/so-do + /api/so-cai + /api/phong/viec-gang) ----------
  // LƯU Ý: số việc theo đơn vị tính theo PHẦN VIỆC CHỦ TRÌ (+ đơn vị giao nếu chưa có ai chủ trì), gộp đơn vị con theo luồng báo cáo.
  // Đã chép luật «Loại khác» của web (dừng ở đơn vị làm, chốt 20/10): đo trên web live 28/10 khớp Ban lãnh đạo 74/29 · P.ĐT&PC 51/17 · SCI E&C 13/13 · BQLDA QT 12/5.
  async function taiSoDo() {
    const [a, b, g] = await Promise.all([api("GET", "/api/phong/so-do"), api("GET", "/api/so-cai"), api("GET", "/api/phong/viec-gang")]);
    if (a.ma !== 200 || !a.j || b.ma !== 200 || !b.j) { CACHE.sdLoi = a.ma !== 200 ? a : b; if (tt.tab === "pb" || tt.tab === "da") ve(); return; }
    const o = a.j.o || [];
    const con = {};
    o.forEach((x) => { if (x.cha) (con[x.cha] = con[x.cha] || []).push(x.id); });
    const cay = (id) => [id].concat((con[id] || []).flatMap(cay));
    // Như web: người đếm về ĐƠN VỊ CHÍNH (đo 28/10: dùng cả don_vi_ids thì BQLDA QT lệch 19/10 thay vì 12/5)
    const dvNguoi = {};
    (a.j.nguoi || []).forEach((n) => { dvNguoi[n.id] = n.don_vi_id ? [n.don_vi_id] : []; });
    const lanhSet = new Set((a.j.lanh_dao || []).map((l) => l.id));
    const tenNguoi = {};
    (a.j.nguoi || []).forEach((n) => { tenNguoi[n.id] = n.ten; const k = String(n.id).split("@")[0]; if (!tenNguoi[k]) tenNguoi[k] = n.ten; });
    CACHE.tenNguoi = tenNguoi;
    const tenNg = (id) => (id ? tenNguoi[id] || tenNguoi[String(id).split("@")[0]] || id : "");
    const oMap = {};
    o.forEach((x) => { oMap[x.id] = x; });
    (a.j.lanh_dao || []).forEach((l) => { if (!oMap[l.id]) oMap[l.id] = l; });
    const tenPt = (p) => (p.phu_trach_loai === "nguoi" ? tenNg(p.phu_trach_id) || p.phu_trach_ten : (oMap[p.phu_trach_id] && (oMap[p.phu_trach_id].ten_ngan || oMap[p.phu_trach_id].ten)) || p.phu_trach_ten || p.phu_trach_id);
    const coO = new Set(o.map((x) => x.id));
    const gocId = (o.find((x) => !x.cha) || {}).id || null;
    const oCua = (id) => (!id ? null : coO.has(id) ? id : lanhSet.has(id) ? gocId : null); // như oCua trong doi-viec.ts của web
    const gang = new Set((g.j && g.j.ids) || []);
    const hn = b.j.hom_nay || homNay();
    const ds = (a.j.du_an || []);
    const viec = (b.j.viec || []).map((v) => {
      const pv = (v.phan_viec || []).filter((p) => !p.da_bo);
      const ct = pv.filter((p) => p.vai !== "phoi_hop");
      const dv = new Set();
      ct.forEach((p) => (p.phu_trach_loai === "don_vi" ? [p.phu_trach_id] : dvNguoi[p.phu_trach_id] || []).forEach((u) => { const o2 = oCua(u); if (o2) dv.add(o2); }));
      if (!dv.size) { const o2 = oCua(v.don_vi_giao); if (o2) dv.add(o2); }
      const ks = ct.filter((p) => p.trang_thai === "dang_lam").map((p) => p.ket_thuc).filter(Boolean).sort();
      const han = ks[0] || v.ket_thuc || null;
      let t = "con", chu = "";
      if (v.luon_mo || !han) { t = "thuong-xuyen"; chu = "việc thường xuyên"; }
      else { const n = cachNgay(han); if (n < 0) { t = "tre"; chu = "quá hạn " + (-n) + " ngày"; } else if (n <= 3) { t = "sap"; chu = n === 0 ? "đến hạn hôm nay" : "còn " + n + " ngày"; } else chu = "còn " + n + " ngày"; }
      // Giao chuyển tiếp (web: locChuyenTiep): xét phần CHỦ TRÌ còn mở — còn phần giao cả đơn vị = «chưa»; toàn cá nhân (người / chức danh lãnh đạo) = «đã»
      const moCt = ct.filter((p) => p.trang_thai === "dang_lam");
      const ctChua = moCt.some((p) => !(p.phu_trach_loai === "nguoi" || lanhSet.has(p.phu_trach_id)));
      return { ctCo: moCt.length > 0, ctChua, ma: v.id, ten: v.ten, duAn: v.du_an, han: han, tt: t, ttChu: chu, dv: [...dv], chu: ct.map((p) => p.phu_trach_ten || p.phu_trach_id).filter((x, i, A) => A.indexOf(x) === i).join(", "), giao: tenNg(v.giao_boi), giaoMa: v.giao_boi, ai: [...new Set((moCt.length ? moCt : ct).map(tenPt))].join(" + "), aiPh: [...new Set(pv.filter((p) => p.vai === "phoi_hop").map(tenPt))], nguoiTen: moCt.length && !ctChua ? [...new Set(moCt.map(tenPt))].join(", ") : null, pc: v.co_the_phan_cong || [], ptCt: moCt.map((p) => ({ id: p.id, pid: p.phu_trach_id, ten: tenPt(p) })), gang: gang.has(v.id), coPh: !!v.co_the_phoi_hop, suaViec: !!v.co_the_sua_viec, dieuChinh: v.co_the_dieu_chinh || [], pv: pv.map((p) => p.phu_trach_id), tenViec: v.ten, duongMo: "/cong-viec/" + v.id };
    });
    await taiXong().catch(() => undefined);
    const xong = (CACHE.xongRaw || []).map((v) => {
      const pv = (v.phan_viec || []).filter((x) => !x.da_bo), ct = pv.filter((x) => x.vai !== "phoi_hop"), dv = new Set();
      ct.forEach((x) => (x.phu_trach_loai === "don_vi" ? [x.phu_trach_id] : dvNguoi[x.phu_trach_id] || []).forEach((u) => { const o2 = oCua(u); if (o2) dv.add(o2); }));
      if (!dv.size) { const o2 = oCua(v.don_vi_giao); if (o2) dv.add(o2); }
      return theXong(v, { dv: [...dv], chu: ct.map((x) => x.phu_trach_ten || x.phu_trach_id).filter((y, i, A) => A.indexOf(y) === i).join(", "), pv: pv.map((x) => x.phu_trach_id), tenViec: v.ten });
    });
    // Dự án của việc: khớp tên (giữ dấu) → khớp bỏ dấu duy nhất → ban điều hành (đúng 3 bước của duAnCuaViec trên web live)
    const nfc = (s) => String(s || "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
    const kd = (s) => nfc(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
    viec.concat(xong).forEach((v) => {
      let id = null;
      const t = nfc(v.duAn);
      if (t) {
        const d1 = ds.find((a2) => [a2.ten].concat(a2.ten_khac || []).some((x) => nfc(x) === t));
        if (d1) id = d1.id;
        else { const k = kd(v.duAn); const g2 = ds.filter((a2) => [a2.ten].concat(a2.ten_khac || []).some((x) => kd(x) === k)); if (g2.length === 1) id = g2[0].id; }
      }
      if (!id) { const b2 = ds.find((a2) => a2.ban_dieu_hanh && v.pv.includes(a2.ban_dieu_hanh)); if (b2) id = b2.id; }
      v.daId = id;
    });
    // Luật «Loại khác» của web (doi-viec.ts oDemViecLoaiKhac, chốt 20/10): việc của dự án KHÔNG thuộc SCI đầu tư chỉ đếm từ ô chủ trì
    // lên tới đơn vị làm (SCI E&C / SCI PMC…) rồi DỪNG — không đổ về Phòng Đầu tư, Ban lãnh đạo.
    const cha = {};
    o.forEach((x) => { cha[x.id] = x.cha; });
    const goc = (o.find((x) => !x.cha) || {}).id || null;
    const lam = (a2) => (a2.don_vi || []).filter((u) => u && u !== a2.ban_dieu_hanh);
    const dung = new Set(ds.filter((x) => x.nhom !== "sci").flatMap(lam));
    viec.concat(xong).forEach((v) => {
      const a2 = v.daId ? ds.find((x) => x.id === v.daId) : null;
      if (!a2 || a2.nhom === "sci") return;
      const r = new Set();
      const bdh = a2.ban_dieu_hanh, chaBdh = bdh ? cha[bdh] : null;
      if (chaBdh && lam(a2).includes(chaBdh)) v.dv = v.dv.map((n) => (n === chaBdh ? bdh : n)); // việc của đơn vị làm dồn vào ô Ban điều hành đã treo dưới nó
      v.dv.forEach((n) => { r.add(n); for (let id = n; id && !dung.has(id); ) { id = cha[id]; if (!id || id === goc) break; r.add(id); } });
      v.duoc = r;
    });
    CACHE.soDoRaw = a.j;
    CACHE.coGang = g.ma === 200;
    CACHE.sd = { o, cay, ds, viec, xong, goc: gocId, dung };
    CACHE.sdLoi = null;
    ["pb", "da"].forEach((k) => themMucMoi(k, k === "pb" ? o.map((x) => x.id) : ds.map((x) => x.id)));
    if (tt.tab === "pb" || tt.tab === "da") ve();
  }
  const duocO = (v, id) => !v.duoc || v.duoc.has(id);
  function viecDon(id) { const ids = CACHE.sd.cay(id); return loQ(CACHE.sd.viec).filter((v) => duocO(v, id) && v.dv.some((u) => ids.includes(u))).sort((a, b) => (a.han || "9").localeCompare(b.han || "9")); }
  function viecDuAn(id) { return loQ(CACHE.sd.viec).filter((v) => v.daId === id).sort((a, b) => (a.han || "9").localeCompare(b.han || "9")); }

  // Thứ tự + ẩn do NGƯỜI DÙNG chọn, nhớ trên máy (Mr. Đại 28/10)
  const KHO = doc("sci_kho_v1", { pb: { ds: [], an: [] }, da: { ds: [], an: [] } });
  function themMucMoi(k, ids) {
    ids.forEach((id) => { if (!KHO[k].ds.includes(id)) KHO[k].ds.push(id); });
    KHO[k].ds = KHO[k].ds.filter((id) => ids.includes(id));
    KHO[k].an = KHO[k].an.filter((id) => ids.includes(id));
    luu("sci_kho_v1", KHO);
  }
  const SVG = {
    pb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></svg>',
    gio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="1.6"/><path d="M12 7.4V2M10.6 9.8l-4.7 2.7M13.4 9.8l4.7 2.7M12 10.6V22M8 22h8"/></svg>',
    thuy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l2.5 9h-17z"/><path d="M3 16c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0 3-1.4 4.5 0 3 1.4 4.5 0M3 20.5c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0 3-1.4 4.5 0 3 1.4 4.5 0"/></svg>',
    mat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
    nha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
    tram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L7 22M12 2l5 20M8.6 9h6.8M7.7 14h8.6M6 19h12M9 9l6 5M15 9l-6 5"/></svg>',
    canCau: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4M3 4h18M3 4v3h3M18 4v6M16 10h4v3h-4zM3 22h8M6 8l4 4-4 4 4 4"/></svg>',
    toaNha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/></svg>',
    can: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M4 7h16M4 7l-2.5 7h5zM20 7l-2.5 7h5zM1.5 14a2.5 2 0 0 0 5 0M17.5 14a2.5 2 0 0 0 5 0"/></svg>',
    cau: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20M4 18v-4a8 8 0 0 1 16 0v4M8 18v-7M12 18V7M16 18v-7"/></svg>',
    huyHieu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 8l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-2 2.8-.4z"/></svg>',
    tien: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-.9-1.400-1.300-2.500-1.300-1.400 0-2.500.7-2.500 1.800s1 1.500 2.500 1.900 2.500.8 2.500 1.900-1.100 1.800-2.500 1.800c-1.100 0-2-.4-2.600-1.300M12 6v2M12 16v2"/></svg>',
    hoSo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M7 12h10M7 15h6"/></svg>',
    banh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.500"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    banVe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M9 9v11M13 13h5M13 16h3"/></svg>',
    nhaMay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V11l5 3v-3l5 3V5h4v16z"/><path d="M3 21h18M7 17h1M11 17h1M15 17h1M15 9h2"/></svg>',
  };
  // Icon dự án TỰ CHỌN theo tên (Mr. Đại 28/10): «điện gió» → quạt gió · «thuỷ/thủy điện» → thuỷ điện · «mặt trời» → mặt trời · còn lại → ngôi nhà
  function iconDuAn(ten) {
    const t = String(ten).normalize("NFC").toLowerCase();
    if (/điện gió/.test(t)) return SVG.gio;
    if (/th(ủ|uỷ)y? điện|thuỷ điện|thủy điện/.test(t)) return SVG.thuy;
    if (/mặt trời/.test(t)) return SVG.mat;
    return SVG.nha;
  }
  // Bảng biểu tượng NGƯỜI DÙNG chọn (Mr. Đại 29/10): lưu trên máy, riêng từng tài khoản. Bấm vào hình ở chế độ chỉnh (giữ lâu) → bảng 3 hàng 3 cột.
  const BANG_ICON = {
    da: [["thuy", "Thuỷ điện"], ["gio", "Điện gió"], ["mat", "Mặt trời"], ["nha", "Chung"], ["tram", "Đường dây, trạm"], ["canCau", "Công trường"], ["toaNha", "Văn phòng"], ["can", "Pháp lý"], ["cau", "Hạ tầng"]],
    pb: [["huyHieu", "Lãnh đạo"], ["can", "Đầu tư, pháp chế"], ["tien", "Tài chính, kế toán"], ["hoSo", "Hành chính"], ["banh", "Kỹ thuật, vận hành"], ["set", "Cơ điện"], ["banVe", "Quản lý dự án"], ["canCau", "Thi công"], ["nhaMay", "Nhà máy"]],
  };
  const khoaIcon = () => "sci_icon_v1_" + String(S.email || S.ten || "").trim().toLowerCase();
  const icoMap = () => CACHE.ico || (CACHE.ico = doc(khoaIcon(), {}));
  // Phòng ban: máy tự đoán theo tên (chức năng phòng), người dùng đổi tay nếu máy đoán sai
  function iconPb(ten) {
    const t = String(ten).normalize("NFC").toLowerCase();
    if (/lãnh đạo|tổng giám đốc|hội đồng|hđqt|chủ tịch/.test(t)) return "huyHieu"; // đo 29/10: «Chủ tịch HĐQT · …» viết tắt, trước rơi về mặc định
    if (/pháp chế|đầu tư/.test(t)) return "can";
    if (/tài chính|kế toán/.test(t)) return "tien";
    if (/hành chính|tổng hợp|văn thư/.test(t)) return "hoSo";
    if (/cơ điện/.test(t)) return "set";
    if (/kỹ thuật|vận hành/.test(t)) return "banh";
    if (/quản lý dự án|bqlda|pmc|thiết kế/.test(t)) return "banVe";
    if (/thi công|e&c|ban điều hành/.test(t)) return "canCau"; // «Ban điều hành dự án …» = ban điều hành tổng thầu (thi công), không phải nhà máy
    if (/nhà máy|vận hành/.test(t)) return "nhaMay";
    return "pb";
  }
  function iconCua(k, id, ten) {
    const ch = icoMap()[k + ":" + id];
    if (ch && SVG[ch]) return SVG[ch];
    if (k === "pb") return SVG[iconPb(ten)];
    return iconDuAn(ten);
  }
  function moIcon(k, id) {
    const hien = icoMap()[k + ":" + id];
    mo('<h2>Chọn biểu tượng</h2><div class="luoi-ic">' + BANG_ICON[k].map((x) => '<button class="o-ic ' + (hien === x[0] ? "chon" : "") + '" data-ico="' + k + "|" + esc(id) + "|" + x[0] + '"><span>' + SVG[x[0]] + "</span><small>" + x[1] + "</small></button>").join("")
      + '</div><div class="hanh-dong"><button class="nut" data-ico="' + k + "|" + esc(id) + '|">Để máy tự chọn theo tên</button><button class="nut" id="dk-huy">Đóng</button></div>');
  }
  function theIcon(k, id, an) {
    const sua = tt.sua === k;
    let ten, phu, a, attr, ico;
    if (k === "pb") {
      const d = CACHE.sd.o.find((x) => x.id === id), cha = d && d.cha ? CACHE.sd.o.find((x) => x.id === d.cha) : null;
      ten = d ? d.ten : id; a = dem(viecDon(id)); phu = cha ? "thuộc " + (cha.ten_ngan || cha.ten) : "cấp cao nhất"; attr = 'data-dv="' + esc(id) + '"'; ico = iconCua("pb", id, ten);
    } else {
      const d = CACHE.sd.ds.find((x) => x.id === id);
      ten = d ? d.ten : id; const vv = viecDuAn(id); a = dem(vv); const ng = vv.filter((v) => v.gang).length; phu = CACHE.coGang === false ? "" : ng ? ng + " việc găng" : "không có việc găng"; attr = 'data-da="' + esc(id) + '"'; ico = iconCua("da", id, ten);
    }
    const dau = an ? '<button class="hien" data-hien="' + k + "|" + esc(id) + '" aria-label="Hiện lại">+</button>' : sua ? '<button class="an" data-an="' + k + "|" + esc(id) + '" aria-label="Ẩn">−</button>' : "";
    const coBang = k === "da" && !an && !sua && CACHE.ttCo && CACHE.ttCo.has(id); // dự án có bảng tiến độ → nút 3 gạch cạnh icon
    const duoi = (coBang ? '<button class="td-nut" data-td="' + esc(id) + '" aria-label="Bảng tiến độ">' + SVG_BANG + "</button>" : "") + (an ? "" : sua ? '<span class="keo" aria-label="Kéo để sắp xếp">≡</span>' : '<span class="mui">›</span>');
    return '<div class="ic ' + (sua && !an ? "rung " : "") + (an ? "dang-an" : "") + '" data-k="' + k + '" data-id="' + esc(id) + '" ' + (sua ? "" : attr) + '>' + dau + '<span class="bieu">' + ico + '</span><span class="nd"><b>' + esc(ten) + "</b><small>" + (phu ? phu + " · " : "") + so(a) + "</small></span>" + duoi + "</div>";
  }
  function manLuoi(k) {
    const sua = tt.sua === k, soViec = (id) => (k === "pb" ? viecDon(id) : viecDuAn(id)).length;
    const hien = KHO[k].ds.filter((id) => !KHO[k].an.includes(id) && (sua || !anTrong() || soViec(id) > 0)), an = KHO[k].ds.filter((id) => KHO[k].an.includes(id));
    const tuAn = anTrong() ? KHO[k].ds.filter((id) => !KHO[k].an.includes(id) && soViec(id) === 0).length : 0;
    const dau = sua
      ? '<div class="bo-loc" style="display:flex;gap:8px;align-items:center"><span style="flex:1;font-size:13px;color:var(--phu)">Kéo ≡ để xếp · bấm − để ẩn · bấm vào hình để đổi biểu tượng</span><button class="nut chinh" id="sua-xong">Xong</button></div>'
      : '<div class="tong"><b>' + hien.length + (k === "pb" ? " đơn vị" : " dự án") + '</b> — bấm để xem việc · <span style="color:var(--cam-chu)">giữ lâu để sắp xếp / ẩn</span></div>';
    // lưu ý: <span> dưới đây viết tách để tránh lỗi đóng thẻ khi nối chuỗi
    return dau + '<div class="ds-ic" data-k="' + k + '">' + hien.map((id) => theIcon(k, id, false)).join("") + "</div>"
      + (sua && an.length ? '<div class="nhom">Đang ẩn (' + an.length + ')</div><div class="ds-ic">' + an.map((id) => theIcon(k, id, true)).join("") + "</div>" : "")
      + (!sua && an.length ? '<div class="tong">Đang ẩn ' + an.length + " mục — giữ lâu một biểu tượng để hiện lại</div>" : "")
      + (!sua && tuAn ? '<div class="tong">Đã tự ẩn ' + tuAn + " mục " + (qh() ? "không có việc quá hạn" : "không có việc") + "</div>" : "");
  }
  // Đang tìm / lọc: một danh sách PHẲNG mọi việc khớp (không phải bấm phòng / dự án rồi mới thấy việc) — bấm một việc là mở thẻ ngay (Mr. Đại 29/10/2026)
  function manKetQuaTim(k) {
    const ds = loQ(CACHE.sd.viec).filter((v) => (k === "pb" ? v.dv && v.dv.length : v.daId)).sort((a, b) => (a.han || "9").localeCompare(b.han || "9"));
    return tong(ds, "kết quả tìm") + (ds.length ? ds.map(the).join("") : '<div class="tong">Không có việc nào khớp.</div>');
  }
  function manPhongBan() {
    if (!CACHE.sd) return CACHE.sdLoi ? thongBaoLoi(CACHE.sdLoi, "Phòng ban") : '<div class="tong">Đang tải sơ đồ và việc…</div>';
    if (timDangLoc()) return manKetQuaTim("pb");
    if (!tt.dv) return manLuoi("pb");
    const d = CACHE.sd.o.find((x) => x.id === tt.dv);
    if (!d) { tt.dv = null; return manLuoi("pb"); }
    const cha = d.cha && d.cha !== CACHE.sd.goc ? CACHE.sd.o.find((x) => x.id === d.cha) : null; // phòng cấp 1 chỉ có 🏠, không có «‹ Ban TGĐ» (ý 7)
    const ids = CACHE.sd.cay(d.id), ds = viecDon(d.id);
    const truc = (id) => viecDon(id).filter((v) => v.dv.includes(id));
    const ngan = (x) => x.ten_ngan || x.ten;
    const con = CACHE.sd.o.filter((x) => x.cha === d.id).sort((p, q) => (p.cap || 0) - (q.cap || 0) || String(p.ten).localeCompare(String(q.ten), "vi"));
    const rieng = truc(d.id);
    let h = viTri(d.ten, cha, "") + tong(ds, ids.length > 1 ? "gồm cả " + (ids.length - 1) + " đơn vị con" : "");
    const laGoc = d.id === CACHE.sd.goc, xongD = laGoc ? [] : xongRieng(d.id);
    if (rieng.length || xongD.length) h += '<div class="nhom1">' + (con.length ? "Của riêng " : "") + esc(ngan(d)) + " <span>" + rieng.length + "</span></div>" + gomNguoi(rieng, "Việc chung của " + ngan(d)) + khoiXong("pb:" + d.id, xongD);
    con.forEach((c) => {
      const ngoai = CACHE.sd.dung && CACHE.sd.dung.has(c.id); // công ty độc lập (SCI E&C / SCI PMC): SCI chỉ thấy phần giao thẳng cho họ, không theo dõi đơn vị con
      const dc = ngoai ? truc(c.id) : viecDon(c.id), xongC = laGoc ? [] : xongRieng(c.id);
      if (!dc.length && !xongC.length) return;
      h += '<div class="nhom1">' + esc(c.ten) + " <span>" + dc.length + "</span></div>" + gomNguoi(truc(c.id), "Việc chung của " + ngan(c)) + khoiXong("pb:" + c.id, xongC);
      if (!ngoai) h += CACHE.sd.o.filter((x) => x.cha === c.id && viecDon(x.id).length).map((x) => '<button class="dvcon" data-dv="' + esc(x.id) + '"><span>' + esc(x.ten) + '</span><span class="n">' + viecDon(x.id).length + " việc ›</span></button>").join("");
    });
    return h + (laGoc ? khoiXong("pb:" + d.id, xongDonVi(d.id)) : ""); // Ban lãnh đạo: một khối thống kê toàn công ty
  }
  const viTri = (ten, cha, them) => '<div class="vitri"><button class="nha" data-nha="1" aria-label="Về danh sách">' + SVG.nha + "</button>" + (cha ? '<button class="lui" data-luipb="' + esc(cha.id) + '">‹ ' + esc(cha.ten_ngan || cha.ten) + "</button>" : "") + '<span class="ten">' + esc(ten) + "</span>" + (them || "") + "</div>";
  function manDuAn() {
    if (!CACHE.sd) return CACHE.sdLoi ? thongBaoLoi(CACHE.sdLoi, "Dự án") : '<div class="tong">Đang tải dự án và việc…</div>';
    if (timDangLoc()) return manKetQuaTim("da");
    if (!tt.da) return manLuoi("da");
    const d = CACHE.sd.ds.find((x) => x.id === tt.da);
    if (!d) { tt.da = null; return manLuoi("da"); }
    const tat = viecDuAn(d.id);
    const ds = tt.loc === "gang" ? tat.filter((v) => v.gang) : tat; // ý 6: chỉ còn nút Đường găng nhỏ (đã có nút ! ở trên cùng)
    const nutGang = CACHE.coGang === false ? "" : '<button class="gang ' + (tt.loc === "gang" ? "dang" : "") + '" data-gang="1">Đường găng</button>';
    // Mr. Đại chốt 01/11/2026 (chỉ bản 3004): việc găng LUÔN đứng đầu, dưới dòng «Việc nằm trên đường găng»; vẫn hiện thêm ở nhóm người / việc chung.
    // Đang bật lọc «Đường găng» thì cả danh sách đã là việc găng → không lặp nhóm này.
    const gg = tt.loc === "gang" ? [] : ds.filter((v) => v.gang);
    const khoiGang = gg.length ? '<div class="nhom2 nhom-gang"><span class="gang">!</span> Việc nằm trên đường găng <small>(' + gg.length + ")</small></div>" + gg.map((v) => the(v, "g")).join("") : "";
    return viTri(d.ten, null, nutGang) + tong(ds, "") + khoiGang + gomNguoi(ds, "Việc chung của các đơn vị") + (tt.loc !== "gang" ? khoiXong("da:" + d.id, xongDuAn(d.id)) : "");
  }

  // ---------- Bảng tiến độ dự án (chỉ XEM) — Mr. Đại giao 30/10/2026; dữ liệu = /api/phong/tom-tat-tien-do của web ----------
  // Trái: tên việc (mặc định rộng ~5 chữ, kéo vạch giữa để mở rộng) · Phải: sơ đồ theo tháng. Cấp 1, 2 cam · cấp 3, 4 đen. C2 / C3 bung tới cấp đó; bấm lại nút đang chọn = bung hết.
  const TD = { id: null, ban: null, mo: new Set(), cap: 0, px: 1.5, rong: doc("sci_td_rong2", 92), loi: "", chon: -1 };
  const SVG_BANG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 5.5h9M7 12h11M11 18.5h10"/></svg>';
  const SVG_TAM = '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M2 1l6 4-6 4z" fill="currentColor"/></svg>';
  async function taiTomTat() {
    if (!S.dangNhap) return;
    const r = await api("GET", "/api/phong/tom-tat-tien-do");
    if (r.ma === 200 && r.j && Array.isArray(r.j.co)) {
      const moi = r.j.co.slice().sort().join("|");
      if (moi !== CACHE.ttCoKhoa) { CACHE.ttCoKhoa = moi; CACHE.ttCo = new Set(r.j.co); if (tt.tab === "da") ve(); }
    }
  }
  const tdCap = (w) => String(w).split(".").length;
  function tdDong() {
    const ds = (TD.ban && TD.ban.dong) || [];
    return ds.map((d, i) => { const w = String(d.wbs).trim(); return Object.assign({}, d, { w, cap: tdCap(w), co: i + 1 < ds.length && String(ds[i + 1].wbs).trim().indexOf(w + ".") === 0 }); });
  }
  function tdApCap(n) { // n = 0: bung hết · n = 2 / 3: chỉ bung các việc cha có cấp nhỏ hơn n
    TD.cap = n;
    TD.mo = new Set(tdDong().filter((d) => d.co && (n === 0 || d.cap < n)).map((d) => d.w));
  }
  const tdNgay = (s) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? Math.floor(Date.parse(s.slice(0, 10) + "T00:00:00Z") / 864e5) : null);
  const tdSo = (n) => (n == null ? "" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(n)); // «,» thập phân · «.» nhóm ba
  // ---- vẽ dòng có số của agent Tiến độ (chép TomTatGanttTD.tsx + cotPctTH ở lib/tom-tat-tien-do/thuan.ts của web 3004) ----
  const RONG_PCT = 46;
  const so1 = (n) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(n);
  /** Ô «% TH»: chưa làm (0%) → «—» trắng · đang làm / xong → xanh · vượt khối lượng thiết kế / BOQ → vàng · dòng tên dự án trống */
  function pctTH(t) {
    if (!t || t.pct == null) return { chu: "", mau: "trang" };
    const p = t.vuot_pct != null ? t.vuot_pct : t.pct;
    if (p <= 0) return { chu: "—", mau: "trang" };
    return { chu: so1(p) + "%", mau: t.vuot_pct != null ? "vang" : "xanh" };
  }
  function hangTD(r, i, d0, px, haiDau) {
    const t = r.td;
    let bar = "";
    if (t) {
      const x = (iso) => (tdNgay(iso) - d0) * px, xHet = (iso) => (tdNgay(iso) - d0 + 1) * px;
      const doan = (k, lop) => (k && k.bd ? '<i class="' + lop + '" style="left:' + x(k.bd).toFixed(1) + "px;width:" + Math.max(2, xHet(k.kt) - x(k.bd)).toFixed(1) + 'px"></i>' : "");
      const thoi = (iso, lop) => '<i class="tdb-moc ' + lop + '" style="left:' + (x(iso) - 4).toFixed(1) + 'px"></i>';
      const gang = t.gang ? " gang" : "";
      if (t.moc) {
        if (t.ke_hoach && t.ke_hoach.bd) bar += thoi(t.ke_hoach.bd, gang.trim());
        if (t.thuc_te && t.thuc_te.xong) bar += thoi(t.thuc_te.kt, "dat"); // mốc đã đạt: thoi trắng tại ngày đạt
        else if (t.du_bao) bar += thoi(t.du_bao.kt, "db"); // mốc chưa đạt có dự báo: thoi rỗng viền trắng
      } else if (t.nhom) {
        const k = t.thanh_nhom || t.ke_hoach;
        if (k && k.bd) { const x1 = x(k.bd), w = Math.max(2, xHet(k.kt) - x1); bar += '<i class="tdb-nhom" style="left:' + x1.toFixed(1) + "px;width:" + w.toFixed(1) + 'px"></i>' + haiDau(x1, w, "xanh", 19); }
      } else bar += doan(t.ke_hoach, "tdb-kh" + gang);
      if (!t.moc) {
        bar += doan(t.thuc_te, "tdb-th" + (t.nhom ? " tdb-nh" : "")); // KHÔNG dùng lớp «nhom»: trùng lớp tiêu đề nhóm của giao diện (có padding) // thực hiện: nét trắng mảnh trùng tim thanh Baseline
        bar += doan(t.cho_bao_cao, "tdb-cho" + (t.nhom ? " tdb-nh" : "")); // ngày báo cáo → hôm nay chưa có số: nét xám
        bar += doan(t.du_bao, "tdb-db" + (t.gang_du_bao ? " gang" : "")); // dự báo: trắng đứt (đỏ khi găng ở lượt dự báo)
      }
    }
    const p = pctTH(t);
    const tg = r.co ? '<button class="td-tg ' + (TD.mo.has(r.w) ? "mo" : "") + '" data-tg="' + esc(r.w) + '" aria-label="Bung hoặc thu">' + SVG_TAM + "</button>" : '<span class="td-tg"></span>';
    return '<div class="td-hang ' + (TD.chon === i ? "td-sel" : "") + '" data-i="' + i + '"><div class="td-t c' + Math.min(r.cap, 4) + '">' + tg + '<span class="td-ten">' + esc(r.ten) + '</span><span class="td-pct ' + p.mau + '">' + p.chu + '</span><i class="td-vach" data-vach="1"></i></div><div class="td-p">' + bar + "</div></div>";
  }
  /** Chú giải — chỉ ký hiệu đang có trên bảng, như web */
  function chuGiaiTD(tdT, rows) {
    const o = (lop, chu) => '<span><i class="cg ' + lop + '"></i>' + esc(chu) + "</span>";
    return '<div class="td-chu">' + o("kh", "Baseline") + o("gang", "đường găng") + o("th", "thực hiện")
      + (rows.some((r) => r.td && r.td.cho_bao_cao) ? o("cho", "chưa có báo cáo") : "") + o("db", "dự báo") + o("hn", "hôm nay")
      + (tdT.cod_baseline ? o("cod", "COD Baseline " + fmt(tdT.cod_baseline)) : "") + (tdT.cod_du_bao ? o("cod db", "COD dự báo " + fmt(tdT.cod_du_bao)) : "")
      + '<span class="nguon">Lấy từ agent Tiến độ · Baseline' + (tdT.phien_ban_baseline ? " v" + tdT.phien_ban_baseline : "")
      + (tdT.ngay_bao_cao ? " · số báo cáo tới " + fmt(tdT.ngay_bao_cao) : " · chưa có ngày báo cáo nên chưa vẽ nét thực hiện") + "</span></div>";
  }
  function veTd() {
    const el = $("td-than");
    el.className = "";
    if (TD.loi) { el.innerHTML = '<div class="tong">' + esc(TD.loi) + '</div><div class="tong"><button class="nut" data-td="' + esc(TD.id) + '">Thử lại</button></div>'; return; }
    if (!TD.ban) { el.innerHTML = '<div class="tong">Đang tải bảng tiến độ…</div>'; return; }
    const rows = tdDong();
    if (!rows.length) { el.innerHTML = '<div class="tong">Dự án này chưa có bảng tiến độ.</div>'; return; }
    const ton = new Set(rows.map((r) => r.w));
    const hien = rows.map((r, i) => ({ r, i })).filter(({ r }) => { // ẩn nếu một việc cha (có trong bảng) đang thu
      const k = r.w.split(".");
      for (let n = 1; n < k.length; n++) { const p = k.slice(0, n).join("."); if (ton.has(p) && !TD.mo.has(p)) return false; }
      return true;
    });
    // Dự án có Baseline ĐÃ DUYỆT bên agent Tiến độ → bảng mang số của agent Tiến độ (dong[].td) → vẽ như web 3004 (TomTatGanttTD.tsx):
    // nền tối · Baseline xanh lá · găng viền đỏ · thực hiện trắng liền · chưa có báo cáo xám · dự báo trắng đứt · hôm nay vàng · cột «% TH».
    // Mr. Đại chốt 01/11/2026 (phương án A: tên cột «% TH» như web). Dự án chưa có Baseline giữ cách vẽ cũ (cam / đen, nền sáng).
    const coTD = !!TD.ban.tien_do && rows.some((r) => r.td);
    const tdT = TD.ban.tien_do || {};
    el.className = coTD ? "td-toi" : "";
    let nb, nk;
    if (coTD) {
      const ds = [];
      rows.forEach((r) => { const t = r.td; if (t) [t.ke_hoach, t.thanh_nhom, t.du_bao, t.thuc_te, t.cho_bao_cao].forEach((k) => { if (k && k.bd) ds.push(k.bd, k.kt); }); });
      [tdT.cod_baseline, tdT.cod_du_bao].forEach((x) => { if (x) ds.push(x); });
      nb = ds.map(tdNgay).filter((x) => x != null); nk = [];
    } else {
      nb = rows.map((r) => tdNgay(r.bat_dau)).filter((x) => x != null); nk = rows.map((r) => tdNgay(r.ket_thuc)).filter((x) => x != null);
    }
    if (!nb.length && !nk.length) { el.innerHTML = '<div class="tong">Bảng chưa có ngày nào để vẽ.</div>'; return; }
    const lo = new Date(Math.min.apply(null, nb.concat(nk)) * 864e5), hi = new Date(Math.max.apply(null, nb.concat(nk)) * 864e5);
    const d0 = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth(), 1) / 864e5, d1 = Date.UTC(hi.getUTCFullYear(), hi.getUTCMonth() + 1, 1) / 864e5; // trọn các tháng
    const px = TD.px, tong = Math.round((d1 - d0) * px);
    let thang = "", dong = "";
    for (let y = lo.getUTCFullYear(), m = lo.getUTCMonth(); Date.UTC(y, m, 1) / 864e5 < d1; m++) {
      if (m > 11) { m = 0; y++; }
      const a = Date.UTC(y, m, 1) / 864e5, b = Date.UTC(y, m + 1, 1) / 864e5, w = (b - a) * px, x = (a - d0) * px;
      const ch = w >= 40 ? "T" + (m + 1) + "/" + String(y).slice(2) : w >= 20 ? "T" + (m + 1) : "";
      thang += '<span class="td-th" style="left:' + x.toFixed(1) + "px;width:" + w.toFixed(1) + 'px">' + ch + "</span>";
      dong += '<i class="td-gach" style="left:calc(var(--w) + ' + x.toFixed(1) + 'px)"></i>';
    }
    const hn = tdNgay(homNay()), xHn = hn != null && hn >= d0 && hn <= d1 ? (hn - d0 + 0.5) * px : null;
    const mauCap = (cap) => (cap <= 2 ? "cam" : "den");
    // tam giác chúc xuống sát HAI ĐẦU thanh nhóm — như web 3004 (tam giác vuông, cạnh đứng ở mép ngoài, cao 5px, rộng tối đa 6px)
    const haiDau = (x, w, lop, top) => { const m = Math.min(6, w / 2).toFixed(1); return '<i class="td-tam trai ' + lop + '" style="left:' + x.toFixed(1) + "px;width:" + m + "px;top:" + top + 'px"></i><i class="td-tam phai ' + lop + '" style="left:' + (x + w - m).toFixed(1) + "px;width:" + m + "px;top:" + top + 'px"></i>'; };
    const hang = hien.map(({ r, i }) => {
      if (coTD) return hangTD(r, i, d0, px, haiDau);
      const a = tdNgay(r.bat_dau), b = tdNgay(r.ket_thuc);
      let bar = "";
      if ((a != null || b != null) && (a == null || b == null || a === b)) { // MỐC: bắt đầu = kết thúc (hoặc chỉ có một ngày) → hình vuông xoay 45 độ, tâm ở giữa ngày
        bar = '<i class="td-moc ' + mauCap(r.cap) + '" style="left:' + (((a != null ? a : b) - d0) * px + px / 2 - 6).toFixed(1) + 'px"></i>';
      } else if (a != null || b != null) {
        const x = ((a != null ? a : b) - d0) * px, w = Math.max(3, (((b != null ? b : a) - (a != null ? a : b)) + 1) * px);
        bar = r.co
          ? '<i class="td-cha ' + mauCap(r.cap) + '" style="left:' + x.toFixed(1) + "px;width:" + w.toFixed(1) + 'px"></i>' + haiDau(x, w, mauCap(r.cap), 16)
          : '<i class="td-thanh ' + mauCap(r.cap) + '" style="left:' + x.toFixed(1) + "px;width:" + w.toFixed(1) + 'px"></i>';
      }
      const tg = r.co ? '<button class="td-tg ' + (TD.mo.has(r.w) ? "mo" : "") + '" data-tg="' + esc(r.w) + '" aria-label="Bung hoặc thu">' + SVG_TAM + "</button>" : '<span class="td-tg"></span>';
      return '<div class="td-hang ' + (TD.chon === i ? "td-sel" : "") + '" data-i="' + i + '"><div class="td-t c' + Math.min(r.cap, 4) + '">' + tg + '<span class="td-ten">' + esc(r.ten) + '</span><i class="td-vach" data-vach="1"></i></div><div class="td-p">' + bar + "</div></div>";
    }).join("");
    const giuX = el.scrollLeft, giuY = el.scrollTop;
    const rongTrai = TD.rong + (coTD ? RONG_PCT : 0); // cột «% TH» cộng thêm vào bề rộng phần chữ
    // vạch COD dọc cả thân (như web: COD Baseline xanh lá liền · COD dự báo trắng đứt; COD mục tiêu ẩn như mặc định của web)
    let cod = "";
    if (coTD) [[tdT.cod_baseline, ""], [tdT.cod_du_bao, " db"]].forEach(([iso, lop]) => {
      const n = tdNgay(iso); if (n == null || n < d0 || n > d1) return;
      cod += '<i class="tdb-cod' + lop + '" style="left:calc(var(--w) + ' + ((n - d0) * px).toFixed(1) + 'px)"></i>';
    });
    el.innerHTML = '<div class="td-luoi" style="--w:' + rongTrai + "px;--tw:" + tong + "px;width:calc(" + rongTrai + "px + " + tong + 'px)">'
      + '<div class="td-hang td-dau"><div class="td-t"><span class="td-ten">Công việc</span>' + (coTD ? '<span class="td-pct">% TH</span>' : "") + '<i class="td-vach" data-vach="1"></i></div><div class="td-p">' + thang + "</div></div>"
      + hang + dong + cod + (xHn != null ? '<i class="td-homnay" style="left:calc(var(--w) + ' + xHn.toFixed(1) + 'px)"></i>' : "") + "</div>"
      + (coTD ? chuGiaiTD(tdT, rows) : "");
    el.scrollLeft = giuX; el.scrollTop = giuY;
    document.querySelectorAll("#man-td .td-c").forEach((n) => n.classList.remove("sang"));
    $("td-c2").classList.toggle("sang", TD.cap === 2); $("td-c3").classList.toggle("sang", TD.cap === 3);
  }
  async function moBangTd(id) {
    const d = CACHE.sd && CACHE.sd.ds.find((x) => x.id === id);
    $("td-ten").textContent = d ? d.ten : id;
    $("td-pop").style.display = "none";
    TD.id = id; TD.loi = ""; TD.chon = -1; TD.ban = CACHE["td_" + id] || null;
    if (TD.ban) tdApCap(0);
    $("man-td").classList.add("mo");
    veTd();
    const r = await api("GET", "/api/phong/tom-tat-tien-do?du_an=" + encodeURIComponent(id));
    if (TD.id !== id) return;
    if (r.ma === 200 && r.j) {
      const moiBan = r.j.ban || { dong: [] };
      const doi = !TD.ban || TD.ban.nap_luc !== moiBan.nap_luc;
      CACHE["td_" + id] = moiBan; TD.ban = moiBan; TD.loi = "";
      if (doi) tdApCap(0);
    } else if (!TD.ban) TD.loi = "Không tải được bảng tiến độ: " + loiCau(r);
    veTd();
  }
  function tdDong_() { $("man-td").classList.remove("mo"); $("td-pop").style.display = "none"; TD.id = null; }
  $("td-lui").addEventListener("click", tdDong_);
  $("td-c2").addEventListener("click", () => { tdApCap(TD.cap === 2 ? 0 : 2); veTd(); });
  $("td-c3").addEventListener("click", () => { tdApCap(TD.cap === 3 ? 0 : 3); veTd(); });
  const tdPx = (h) => { TD.px = Math.max(0.4, Math.min(16, TD.px * h)); veTd(); };
  $("td-nho").addEventListener("click", () => tdPx(1 / 1.5));
  $("td-lon").addEventListener("click", () => tdPx(1.5));
  function tdPopup(i, hangEl) {
    const r = tdDong()[i]; if (!r) return;
    const coTD = !!(TD.ban && TD.ban.tien_do) && !!r.td;
    $("td-pop").classList.toggle("toi", coTD);
    if (coTD) {
      // Hộp do agent Tiến độ DỰNG SẴN (chữ, màu, thứ tự dòng) — như web 3004 NoiDungHopTD: «% thực tế: 1 bộ / 1 bộ = 100%», «Dự báo xong: …», câu chậm/nhanh so với hệ nào
      const t = r.td, h = t.hop, tdT = TD.ban.tien_do;
      const dongH = (nhan, chu, mau, dam) => '<div class="hd"><span>' + esc(nhan) + '</span><span style="' + (mau ? "color:" + esc(mau) + ";" : "") + (dam ? "font-weight:700" : "") + '">' + esc(chu) + "</span></div>";
      let nd;
      if (!r.ma) { // dòng tên dự án
        nd = "<b>" + esc(t.ten || r.ten) + "</b>"
          + (t.baseline_duyet ? dongH("Baseline:", (tdNgay(t.baseline_duyet.kt) - tdNgay(t.baseline_duyet.bd) + 1) + " ngày · " + fmt(t.baseline_duyet.bd) + " – " + fmt(t.baseline_duyet.kt), "#22c55e") : "")
          + (tdT.cod_baseline ? dongH("COD Baseline:", fmt(tdT.cod_baseline), "#22c55e") : "") + (tdT.cod_du_bao ? dongH("COD dự báo:", fmt(tdT.cod_du_bao)) : "");
      } else if (!h) nd = "<b>" + esc(r.ma + " " + r.ten) + "</b>";
      else nd = "<b>" + esc(h.ma + " " + h.ten) + "</b>"
        + h.dong.map((x) => dongH(x.nhan, x.chu, x.mau, x.nhan === "% thực tế:")).join("")
        + h.ghiChu.filter((g) => g.chu).map((g) => '<div class="gc" style="color:' + esc(g.mau || "") + '">' + esc(g.chu) + "</div>").join("")
        + (h.cham.length ? '<div class="ch">' + h.cham.map((c) => '<div style="color:' + esc(c.mau || "") + '">' + esc(c.chu) + "</div>").join("") + "</div>" : "");
      $("td-pop").innerHTML = nd;
      return tdDatPop(hangEl);
    }
    const a = tdNgay(r.bat_dau), b = tdNgay(r.ket_thuc);
    const so = a != null && b != null ? " · " + (b - a + 1) + " ngày" : ""; // luật 31: khoảng ngày kèm số ngày
    $("td-pop").innerHTML = "<b>" + esc(r.ten) + "</b>"
      + (r.khoi_luong != null ? "<div>Khối lượng: " + tdSo(r.khoi_luong) + (r.don_vi ? " " + esc(r.don_vi) : "") + "</div>" : r.don_vi ? "<div>Đơn vị: " + esc(r.don_vi) + "</div>" : "")
      + "<div>Bắt đầu: " + (r.bat_dau ? fmt(r.bat_dau) : "chưa có") + "</div><div>Kết thúc: " + (r.ket_thuc ? fmt(r.ket_thuc) : "chưa có") + so + "</div>";
    tdDatPop(hangEl);
  }
  function tdDatPop(hangEl) { // đặt hộp ngay dưới dòng được bấm; sát đáy thì bật lên trên
    const p = $("td-pop"), kh = $("man-td").getBoundingClientRect(), h = hangEl.getBoundingClientRect();
    p.style.display = "block";
    const cao = p.offsetHeight;
    let top = h.bottom - kh.top + 4;
    if (top + cao > kh.height - 6) top = Math.max(52, h.top - kh.top - 4 - cao); // sát đáy thì bật lên phía trên dòng
    p.style.top = top + "px";
  }
  $("td-than").addEventListener("click", (e) => {
    const nut = e.target.closest("[data-td]");
    if (nut) { moBangTd(nut.dataset.td); return; }
    const tg = e.target.closest("[data-tg]");
    if (tg) { const w = tg.dataset.tg; if (TD.mo.has(w)) TD.mo.delete(w); else TD.mo.add(w); TD.cap = 0; $("td-pop").style.display = "none"; veTd(); return; }
    if (e.target.closest("[data-vach]")) return;
    const hg = e.target.closest(".td-hang[data-i]");
    if (!hg) { $("td-pop").style.display = "none"; return; }
    TD.chon = Number(hg.dataset.i);
    document.querySelectorAll("#td-than .td-hang.td-sel").forEach((n) => n.classList.remove("td-sel"));
    hg.classList.add("td-sel");
    tdPopup(TD.chon, hg);
  });
  $("td-than").addEventListener("scroll", () => { $("td-pop").style.display = "none"; }, { passive: true });
  // vạch giữa: bấm giữ rồi kéo trái / phải để mở rộng cột tên (nhớ theo máy)
  $("td-than").addEventListener("pointerdown", (e) => {
    const v = e.target.closest("[data-vach]"); if (!v) return;
    e.preventDefault();
    const x0 = e.clientX, w0 = TD.rong, luoi = $("td-than").querySelector(".td-luoi"), tw = luoi ? parseFloat(luoi.style.getPropertyValue("--tw")) : 0;
    $("td-pop").style.display = "none";
    try { v.setPointerCapture(e.pointerId); } catch (_) { /* trình duyệt cũ */ }
    const chay = (ev) => {
      TD.rong = Math.round(Math.max(60, Math.min(window.innerWidth - 70, w0 + ev.clientX - x0)));
      if (luoi) { luoi.style.setProperty("--w", TD.rong + "px"); luoi.style.width = "calc(" + TD.rong + "px + " + tw + "px)"; }
    };
    const xong = () => { v.removeEventListener("pointermove", chay); v.removeEventListener("pointerup", xong); v.removeEventListener("pointercancel", xong); luu("sci_td_rong2", TD.rong); };
    v.addEventListener("pointermove", chay); v.addEventListener("pointerup", xong); v.addEventListener("pointercancel", xong);
  });

  // ---------- Phòng họp: lịch + đăng ký (nối /api/phong-hop) ----------
  const PHONG = [{ id: "p01", ten: "Phòng họp 01", ghe: 8 }, { id: "p03", ten: "Phòng họp 03", ghe: 10 }, { id: "p09", ten: "Phòng họp 09", ghe: 24 }];
  const Q = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
  const pm = (s) => +s.slice(0, 2) * 60 + +s.slice(3);
  const gioStr = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const ngayThu = (d) => T.congNgay(homNay(), d);
  const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const ngayChu = (d) => { const iso = ngayThu(d); return THU[new Date(iso + "T00:00:00Z").getUTCDay()] + " " + fmt(iso); };
  async function taiPhong() {
    const iso = ngayThu(tt.d);
    const r = await api("GET", "/api/phong-hop?ngay=" + iso + "&danh_muc=0");
    if (r.ma === 200 && r.j) { CACHE["ph" + iso] = r.j; CACHE.phLoi = null; } else CACHE.phLoi = r;
    if (tt.tab === "ph") ve();
  }
  const laCuaToi = (b, d) => { const me = (d && d.toi && d.toi.id) || (CACHE.me && CACHE.me.id); return !!me && (b.nguoi_dat === me || (b.moi || []).some((m) => m.id === me)); };
  const cuocO = (cs, p, o) => cs.find((b) => b.phong === p && pm(b.tu) <= pm(o) && pm(o) < pm(b.den));
  function manPhong() {
    const iso = ngayThu(tt.d), d = CACHE["ph" + iso];
    const bar = `<div class="ph-dau"><div class="ngay-bar"><button data-nd="-1" aria-label="Ngày trước">‹</button><b>${ngayChu(tt.d)}</b><button data-nd="1" aria-label="Ngày sau">›</button></div>
      <div class="hai-nut"><button class="chinh" id="dk-moi">Đăng ký phòng họp</button><button class="${tt.cuaToi ? "dang" : ""}" data-cuatoi="1">${tt.cuaToi ? "✓ " : ""}Chỉ cuộc họp của tôi</button></div></div>`;
    if (!d) return bar + (CACHE.phLoi ? thongBaoLoi(CACHE.phLoi, "Phòng họp") : '<div class="tong">Đang tải lịch phòng họp…</div>');
    const cs = d.cuoc || [], bay = d.bay || T.bayGioVN();
    let g = '<div class="luoi"><div></div>' + PHONG.map((p) => `<div class="dau">${p.ten.replace("Phòng họp ", "P.")}</div>`).join("");
    Q.forEach((o) => {
      if (o === "13:30") g += '<div class="nghi">nghỉ trưa 12:00 – 13:30</div>';
      g += `<div class="g">${o}</div>` + PHONG.map((p) => {
        const b = cuocO(cs, p.id, o);
        if (b && tt.cuaToi && !laCuaToi(b, d)) return '<button class="o khac" disabled></button>'; // ô của người khác: xám, không ghi chữ
        let s;
        if (b) s = tt.d === 0 && pm(b.tu) <= bay.phut && bay.phut < pm(b.den) ? "dang" : tt.d === 0 && pm(b.den) <= bay.phut ? "qua" : "dat";
        else s = tt.d === 0 && pm(o) + 30 <= bay.phut ? "qua" : "trong";
        return `<button class="o ${s}" data-o="${p.id}|${o}" ${s === "qua" && !b ? "disabled" : ""}>${b && b.tu === o ? esc(b.noi_dung) : ""}</button>`;
      }).join("");
    });
    return bar + g + '</div><div class="chuthich"><span><i style="background:#DCFCE7"></i>Trống</span><span><i style="background:#FEF08A"></i>Đã đặt</span><span><i style="background:#DC2626"></i>Đang họp</span><span><i style="background:#E7E5E4"></i>Đã qua</span></div><div class="chuthich" style="padding-top:0">Bấm ô xanh để đăng ký nhanh · bấm ô vàng/đỏ để xem cuộc họp.</div>' + (tt.cuaToi ? '<div class="tong">Đang chỉ hiện cuộc họp của tôi — ô xám là phòng người khác đã đặt.</div>' : "");
  }
  let F = null;
  // Thành phần mời GIỐNG WEB (PhongHop.tsx ChonMoi): gõ tìm · mời nhóm / cả đơn vị / từng người · bấm một dòng là thêm và đóng · «Tổng N người dự»
  const bo = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
  async function napDm() {
    const r = await api("GET", "/api/phong-hop?ngay=" + ngayThu(0));
    if (r.ma === 200 && r.j && r.j.danh_muc) { CACHE.dm = r.j.danh_muc; if (F && $("moi-vung")) veMoi(); }
  }
  const bungMoi = (muc, dm) => {
    const ra = new Set();
    (muc || []).forEach((m) => {
      if (m.loai === "nguoi") ra.add(m.id);
      else if (dm) ((m.loai === "don_vi" ? dm.don_vi : dm.nhom).find((x) => x.id === m.id) || { ids: [] }).ids.forEach((i) => ra.add(i));
    });
    return ra;
  };
  const tenMuc = (m, dm) => (m.loai === "nguoi" ? ((dm && dm.nguoi.find((n) => n.id === m.id)) || { ten: m.id }).ten : m.loai === "don_vi" ? "Cả " + ((dm && dm.don_vi.find((x) => x.id === m.id)) || { ten_ngan: m.id }).ten_ngan : ((dm && dm.nhom.find((x) => x.id === m.id)) || { ten: m.id }).ten);
  function moiHtml() {
    const dm = CACHE.dm, k = bo((F.timMoi || "").trim());
    const co = (l, id) => F.moi.some((m) => m.loai === l && m.id === id);
    const n = dm ? dm.nhom.filter((x) => !co("nhom", x.id) && (!k || bo(x.ten).includes(k))) : [];
    const d = dm ? dm.don_vi.filter((x) => !co("don_vi", x.id) && (!k || bo(x.ten_ngan + " " + x.ten).includes(k))) : [];
    const p = dm ? dm.nguoi.filter((x) => !co("nguoi", x.id) && (!k || bo(x.ten + " " + (x.don_vi || "")).includes(k))).slice(0, 40) : [];
    const tong = bungMoi(F.moi, dm);
    (F.moiGoc || []).forEach((m) => tong.add(m.id));
    if (CACHE.me) tong.add(CACHE.me.id);
    const chip = F.moi.map((m, i) => '<span class="mchip">' + esc(tenMuc(m, dm)) + (m.loai !== "nguoi" && dm ? " <small>(" + (((m.loai === "don_vi" ? dm.don_vi : dm.nhom).find((x) => x.id === m.id) || {}).so || 0) + " người)</small>" : "") + '<button data-bomoi="' + i + '" aria-label="Bỏ">✕</button></span>').join("");
    const ds = !dm ? '<div class="tong">Đang tải danh mục…</div>'
      : (n.length ? '<div class="dn">Nhóm</div>' + n.map((x) => '<button data-moi="nhom|' + esc(x.id) + '"><b>' + esc(x.ten) + "</b> <small>· " + x.so + " người</small></button>").join("") : "")
        + (d.length ? '<div class="dn">Cả đơn vị</div>' + d.map((x) => '<button data-moi="don_vi|' + esc(x.id) + '">Cả <b>' + esc(x.ten_ngan) + "</b> <small>· " + esc(x.ten) + " · " + x.so + " người</small></button>").join("") : "")
        + (p.length ? '<div class="dn">Từng người</div>' + p.map((x) => '<button data-moi="nguoi|' + esc(x.id) + '">' + esc(x.ten) + " <small>· " + esc(x.don_vi || "chưa có đơn vị") + "</small></button>").join("") : "")
        + (!n.length && !d.length && !p.length ? '<div class="tong">Không tìm thấy.</div>' : "");
    return '<div class="chip-ds">' + chip + '</div><div class="moi-o"><input id="moi-q" type="search" value="' + esc(F.timMoi || "") + '" placeholder="+ thêm người, cả phòng, Ban lãnh đạo… (gõ để tìm)" autocomplete="off"><div class="moi-pop ' + (F.moMoi ? "mo" : "") + '">' + ds + '</div></div><div class="mo-nho">Tổng ' + tong.size + " người dự (tính cả người trong nhóm, cả phòng; người tạo cuộc họp tự được thêm).</div>";
  }
  function veMoi() {
    const v = $("moi-vung");
    if (!v) return;
    v.innerHTML = moiHtml();
    if (F.moMoi) { const i = $("moi-q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
  function moDK(p, o) {
    if (!F) { const t = o || "08:00"; F = { p: p || "p09", d: tt.d, tu: t, den: gioStr(Math.min(pm(t) + 60, pm(t) < 720 ? 720 : 1020)), nd: "", moi: [], khach: "", dd: "", gc: "", loi: "" }; }
    if (!CACHE.dm) napDm();
    const tuOps = Q.map((o_) => `<option ${F.tu === o_ ? "selected" : ""}>${o_}</option>`).join("");
    const denOps = Q.map((o_) => gioStr(pm(o_) + 30)).map((o_) => `<option ${F.den === o_ ? "selected" : ""}>${o_}</option>`).join("");
    mo(`<h2>${F.sua ? "Sửa cuộc họp" : "Đăng ký phòng họp"}</h2>
      <div class="ngay-bar"><button data-fd="-1">‹</button><b>${ngayChu(F.d)}</b><button data-fd="1">›</button></div>
      <label>Phòng</label><div class="doan">${PHONG.map((p_) => `<button data-fp="${p_.id}" class="${F.p === p_.id ? "dang" : ""}">${p_.ten.replace("Phòng họp ", "P.")}</button>`).join("")}</div>
      <div class="hai"><div><label>Từ</label><select data-f="tu">${tuOps}</select></div><div><label>Đến</label><select data-f="den">${denOps}</select></div></div>
      <label>Nội dung họp</label><input data-f="nd" value="${esc(F.nd)}" placeholder="vd: Rà soát tiến độ lô 2 tuần 44">
      <label>Thành phần mời</label>${F.sua ? '<div class="mo-nho" style="margin-bottom:4px">Giữ nguyên ' + (F.moiGoc || []).length + " người đã mời. Bấm nhóm dưới đây để THÊM.</div>" : ""}<div id="moi-vung">${moiHtml()}</div>
      <label>Khách ngoài (không bắt buộc)</label><input data-f="khach" value="${esc(F.khach)}">
      <label>Đường dẫn họp trực tuyến (không bắt buộc)</label><input data-f="dd" value="${esc(F.dd)}" placeholder="Dán đường dẫn Zoom / Teams / Meet">
      <label>Ghi chú (không bắt buộc)</label><textarea data-f="gc">${esc(F.gc)}</textarea>
      ${F.loi ? `<div class="loi">${esc(F.loi)}</div>` : ""}
      <div class="hanh-dong"><button class="nut chinh" id="dk-gui">${F.sua ? "Lưu thay đổi" : "Đăng ký phòng họp"}</button><button class="nut" id="dk-huy">Hủy</button></div>`);
  }
  async function guiDK() {
    const a = pm(F.tu), b = pm(F.den);
    F.loi = !F.nd.trim() ? "Nhập nội dung họp" : b <= a ? "Giờ kết thúc phải sau giờ bắt đầu" : a < 720 && b > 720 ? "Cuộc họp không được vắt qua giờ nghỉ trưa (12:00 – 13:30)" : "";
    if (F.loi) return moDK();
    $("dk-gui").disabled = true;
    const dsMoi = (F.moiGoc ? F.moiGoc.map((m) => ({ loai: "nguoi", id: m.id })) : []).concat(F.moi.map((m) => ({ loai: m.loai, id: m.id }))); // sửa họp: giữ nguyên người đã mời, mục chọn chỉ THÊM
    const r = await api(F.sua ? "PUT" : "POST", F.sua ? "/api/phong-hop/" + F.sua : "/api/phong-hop", { phong: F.p, ngay: ngayThu(F.d), tu: F.tu, den: F.den, noi_dung: F.nd.trim(), ghi_chu: F.gc, khach_ngoai: F.khach, duong_dan: F.dd, moi: dsMoi });
    const F0 = F;
    if (r.ma >= 200 && r.ma < 300) { tt.d = F.d; F = null; dong(); await taiPhong(); NA.dongBoNgay(); toast(F0.sua ? "Đã lưu thay đổi. Người dự được báo lại" : "Đã đăng ký. Người được mời thấy dòng báo họp sau tối đa 60 giây"); }
    else { F.loi = loiCau(r); moDK(); }
  }

  // ---------- Giao việc NGAY TRONG APP (dấu +) — khuôn demo: Giao cho · Dự án · Nội dung · Kết quả · Hạn; nối /api/phong/noi-nhan + POST /api/cong-viec ----------
  let GV = null;
  function dsNhan() {
    const d = CACHE.noiNhan;
    if (!d || !d.nguoi) return [];
    const dv = new Map((d.don_vi || []).map((x) => [x.id, x])), ng = new Map(d.nguoi.map((x) => [x.id, x])), nh = d.nhom || {};
    const ra = [];
    (nh.lanh_dao || []).forEach((id) => dv.has(id) && ra.push({ nhom: "Ban lãnh đạo", v: "don_vi:" + id, ten: dv.get(id).ten, hien: dv.get(id).ten }));
    (nh.cay || []).forEach((c) => dv.has(c.id) && ra.push({ nhom: "Đơn vị", v: "don_vi:" + c.id, ten: dv.get(c.id).ten, hien: " ".repeat(c.thut || 0) + dv.get(c.id).ten }));
    (nh.ca_nhan || []).forEach((id) => ng.has(id) && ra.push({ nhom: "Cá nhân", v: "nguoi:" + id, ten: ng.get(id).ten, hien: ng.get(id).ten + (ng.get(id).dv ? " · " + ng.get(id).dv : "") }));
    return ra;
  }
  function veOChon() {
    const loc = (GV.loc || "").normalize("NFC").toLowerCase();
    const ds = dsNhan().filter((x) => !loc || x.hien.normalize("NFC").toLowerCase().includes(loc) || x.v === GV.nhan);
    const nhom = {};
    ds.forEach((x) => (nhom[x.nhom] = nhom[x.nhom] || []).push(x));
    return '<option value="">— chọn người / đơn vị nhận —</option>' + Object.entries(nhom).map(([n, a]) => `<optgroup label="${esc(n)}">${a.map((x) => `<option value="${esc(x.v)}" ${GV.nhan === x.v ? "selected" : ""}>${esc(x.hien)}</option>`).join("")}</optgroup>`).join("");
  }
  // BẢNG CHỌN NGƯỜI NHẬN (Mr. Đại chốt 29/10/2026). Danh sách các PHÒNG; nút tròn bên phải = giao cho CẢ đơn vị (trưởng đơn vị giao chuyển tiếp);
  // bấm vào TÊN phòng = bung danh sách người, mỗi người một nút tròn (chỉ ghi tên, không chức danh). Chọn là áp dụng và đóng, không nút xác nhận.
  // Phạm vi người/phòng hiện ra do MÁY CHỦ quyết (giao_duoc, giao_nguoi — phamViGiao / nguoiGiaoDuoc của web); app chỉ vẽ lại, máy chủ vẫn chặn lần cuối.
  let CHON = null;
  const tenRut = (t) => String(t || "").split(" · ").pop();
  // đơn vị nằm TRONG một công ty độc lập (con cháu của SCI E&C / SCI PMC) mà tôi không thuộc về: SCI không giao sâu xuống đó (Mr. Đại chốt 29/10/2026)
  function trongCongTyNgoai(id) {
    const dung = (CACHE.sd && CACHE.sd.dung) || new Set(), cha = {};
    ((CACHE.soDoRaw && CACHE.soDoRaw.o) || (CACHE.sd && CACHE.sd.o) || []).forEach((x) => { cha[x.id] = x.cha; });
    const toi = new Set((CACHE.me && CACHE.me.don_vi_ids) || []);
    for (let u = cha[id], n = 0; u && n < 20; u = cha[u], n++) {
      if (dung.has(u)) { for (let t = id, m = 0; t && m < 20; t = t === u ? null : cha[t], m++) if (toi.has(t)) return false; return true; } // tôi thuộc công ty đó thì vẫn giao được
    }
    return false;
  }
  function nhomGiaoMoi() {
    const d = CACHE.noiNhan;
    if (!d || !d.nguoi) return [];
    const dv = new Map((d.don_vi || []).map((x) => [x.id, x])), nh = d.nhom || {}, caNhan = new Set(nh.ca_nhan || []);
    const ra = [], dung = new Set();
    if (CACHE.me && CACHE.me.id) ra.push({ id: "toi", ten: "Chính tôi", thut: 0, radio: "nguoi:" + CACHE.me.id, nguoi: [], rieng: true });
    const ld = (nh.lanh_dao || []).filter((id) => dv.has(id)).map((id) => ({ v: "don_vi:" + id, ten: tenRut(dv.get(id).ten) }));
    if (ld.length) ra.push({ id: "bld", ten: "Ban lãnh đạo", thut: 0, radio: null, nguoi: ld });
    (nh.cay || []).forEach((c) => {
      const u = dv.get(c.id);
      if (!u || trongCongTyNgoai(c.id)) return;
      const goc = ((CACHE.soDoRaw && CACHE.soDoRaw.giao_nguoi) || []).find((x) => x.don_vi_id === c.id); // ưu tiên ghép theo MÃ đơn vị, không theo tên
      // ghép người vào phòng theo MÃ đơn vị (don_vi_ids) — trước ghép theo tên: máy chủ ghi dv là TÊN NGẮN («BQLDA QT») còn u.ten là tên đầy đủ
      // («BQLDA Quảng Trị») nên 44/59 người rơi vào nhóm «Khác» (Mr. Đại bắt 01/11/2026). Máy chủ cũ không có don_vi_ids thì so cả tên đầy đủ lẫn tên ngắn.
      const thuoc = (n) => (Array.isArray(n.don_vi_ids) && n.don_vi_ids.length ? n.don_vi_ids.includes(c.id) : n.dv === u.ten || n.dv === u.ten_ngan);
      const ng = goc ? (goc.nguoi || []).map((n) => ({ v: "nguoi:" + n.id, ten: n.ten })) : d.nguoi.filter((n) => caNhan.has(n.id) && thuoc(n)).map((n) => ({ v: "nguoi:" + n.id, ten: n.ten }));
      ng.forEach((x) => dung.add(x.v));
      const gd = CACHE.soDoRaw && CACHE.soDoRaw.giao_duoc, trongDonViMinh = gd !== undefined && gd !== "tat_ca" && ((CACHE.me && CACHE.me.don_vi_ids) || []).includes(c.id);
      ra.push({ id: c.id, ten: u.ten, thut: c.thut || 0, radio: trongDonViMinh ? null : "don_vi:" + c.id, nguoi: ng });
    });
    // «Khác» chỉ còn người không thuộc phòng nào trên cây; người ở ô chức danh Ban lãnh đạo đã có trong nhóm «Ban lãnh đạo» thì không lặp lại
    const oLd = new Set(nh.lanh_dao || []);
    const khac = d.nguoi.filter((n) => caNhan.has(n.id) && !dung.has("nguoi:" + n.id) && !(n.don_vi_ids || []).some((x) => oLd.has(x))).map((n) => ({ v: "nguoi:" + n.id, ten: n.ten }));
    if (khac.length) ra.push({ id: "khac", ten: "Khác", thut: 0, radio: null, nguoi: khac });
    return ra;
  }
  // đơn vị tôi làm trưởng (chính hoặc kiêm nhiệm) = các đơn vị có vai trò «truong-don-vi» của tôi (vai_tro_tai của /api/toi, như web)
  const donViTruong = () => new Set(Object.entries((CACHE.me && CACHE.me.vai_tro_tai) || {}).filter((e) => (e[1] || []).includes("truong-don-vi")).map((e) => e[0]).concat(CACHE.donViTruong || []));
  // Nhân sự BLĐ là nhân viên nhưng đứng ở ô chức danh (trợ lý Chủ tịch, trưởng BP kiểm soát nội bộ): web không đưa vào danh sách giao chuyển tiếp
  // vì ô chức danh bị loại; Mr. Đại chốt 29/10/2026: người trong Ban lãnh đạo giao chuyển tiếp được cho cả hai (máy chủ cũng phải cho phép — xem báo cáo).
  const O_NHAN_SU_BLD = ["bld-troly-ct", "tbp-ktnb"];
  const laLanhDaoToi = () => !!(CACHE.me && (CACHE.me.vai_tro || []).includes("lanh-dao"));
  const nhanSuBld = () => ((CACHE.soDoRaw && CACHE.soDoRaw.nguoi) || []).filter((n) => (n.don_vi_ids && n.don_vi_ids.length ? n.don_vi_ids : [n.don_vi_id]).some((u) => O_NHAN_SU_BLD.includes(u)));
  function nhomChuyenTiep(pid) {
    const truong = donViTruong();
    const gs = ((CACHE.soDoRaw && CACHE.soDoRaw.giao_nguoi) || []).map((x) => ({ id: x.don_vi_id, ten: x.ten, thut: 0, radio: null, truong: truong.has(x.don_vi_id), nguoi: (x.nguoi || []).filter((n) => n.id !== pid).map((n) => ({ v: "nguoi:" + n.id, ten: n.ten })) })).filter((x) => x.nguoi.length && !trongCongTyNgoai(x.id));
    // Máy chủ mới đã có nhóm «Hỗ trợ Ban lãnh đạo» (Quản trị chọn ở Cài đặt): dùng nhóm đó. Máy chủ cũ chưa có thì tự thêm trợ lý + kiểm soát như trước
    const coHoTro = gs.some((g) => g.id === "@ho-tro-bld");
    if (laLanhDaoToi() && !coHoTro) { const b = nhanSuBld().filter((n) => n.id !== pid).map((n) => ({ v: "nguoi:" + n.id, ten: n.ten })); if (b.length) gs.unshift({ id: "bld", ten: "Ban lãnh đạo", thut: 0, radio: null, truong: true, nguoi: b }); }
    // «Chính tôi»: tự nhận phần việc đang giao cả đơn vị mình thuộc (máy chủ mới cho phép; vẫn cần quyền Giao việc)
    if (CACHE.me && CACHE.me.id && pid !== CACHE.me.id) gs.unshift({ id: "toi", ten: "Chính tôi", thut: 0, radio: "nguoi:" + CACHE.me.id, truong: true, nguoi: [] });
    return gs.sort((a, b) => Number(b.truong) - Number(a.truong)); // Ban lãnh đạo (nếu tôi thuộc) và đơn vị tôi làm trưởng lên đầu
  }
  function timNhanChon(v) {
    for (const gr of nhomGiaoMoi()) {
      if (gr.radio === v) return { v, ten: gr.id === "toi" && CACHE.me ? CACHE.me.ten : gr.ten };
      const n = gr.nguoi.find((x) => x.v === v);
      if (n) return { v, ten: n.ten };
    }
    return null;
  }
  function tenNhanChon(v) {
    const nhom = nhomGiaoMoi();
    for (const gr of nhom) {
      if (gr.radio === v) return gr.id === "toi" ? "Chính tôi" : "Cả " + gr.ten + " (trưởng đơn vị giao chuyển tiếp)";
      const n = gr.nguoi.find((x) => x.v === v);
      if (n) return n.ten + (gr.id === "bld" || gr.id === "khac" ? "" : " · " + gr.ten);
    }
    return v;
  }
  function veChon() {
    const C = CHON, k = bo(C.q.trim());
    const nhom = C.nhom();
    let h = "";
    nhom.forEach((gr) => {
      const khop = !k || bo(gr.ten).includes(k);
      const ng = k && !khop ? gr.nguoi.filter((n) => bo(n.ten).includes(k)) : gr.nguoi;
      if (k && !khop && !ng.length) return;
      const mo_ = k ? true : C.mo.has(gr.id);
      const chon_ = (v) => (C.sel === v ? "dang" : "");
      h += '<div class="chon-nhom" style="padding-left:' + (gr.thut || 0) * 12 + 'px"><button class="chon-ten" data-cn="' + esc(gr.id) + '"><span class="mui">' + (mo_ ? "▾" : "▸") + "</span>" + esc(gr.ten) + (gr.nguoi.length ? " <small>(" + gr.nguoi.length + ")</small>" : "") + "</button>"
        + (gr.radio ? '<button class="tron ' + chon_(gr.radio) + '" data-cv="' + esc(gr.radio) + '" aria-label="Giao cho cả ' + esc(gr.ten) + '"></button>' : "") + "</div>";
      if (mo_) h += ng.map((n) => '<button class="chon-nguoi" data-cv="' + esc(n.v) + '"><span>' + esc(n.ten) + '</span><i class="tron ' + chon_(n.v) + '"></i></button>').join("");
    });
    $("chon-ds").innerHTML = h || '<div class="tong">Không tìm thấy.</div>';
  }
  // Danh sách PHỐI HỢP vẽ theo CÙNG khuôn bảng chọn «Giao cho» (Mr. Đại 01/11/2026): BLĐ chỉ ghi tên (bỏ chức danh), nút tròn cạnh tên phòng
  // = cả đơn vị (tập thể), bấm tên phòng = bung từng người (cá nhân). Nguồn vẫn là /api/cong-viec/noi-phoi-hop (rộng hơn phạm vi giao).
  // daCo: tập «loai:id» đã có (phối hợp đang có + chủ trì) — không hiện lại.
  function nhomPhoiHop(daCo) {
    const np = CACHE.noiPh;
    if (!np) return [];
    const ra = [];
    (np.nhom || []).forEach((g, i) => {
      const muc = (g.muc || []).filter((x) => !daCo.has(x.loai + ":" + x.id));
      const laBld = /lãnh đạo/i.test(g.don_vi || "");
      const ca = laBld ? null : muc.find((x) => x.loai === "don_vi" && /^Cả /.test(x.ten || ""));
      const ng = muc.filter((x) => x !== ca).map((x) => ({ v: x.loai + ":" + x.id, ten: laBld ? tenRut(x.ten) : x.ten }));
      if (!ca && !ng.length) return;
      ra.push({ id: "ph" + i, ten: g.don_vi || "", thut: 0, radio: ca ? ca.loai + ":" + ca.id : null, nguoi: ng });
    });
    return ra;
  }
  /** Tên hiện của một lựa chọn trong một bộ nhóm: người = tên; cả đơn vị = «Cả <phòng>» */
  function tenTrongNhom(nhom, v) {
    for (const gr of nhom) {
      if (gr.radio === v) return gr.id === "toi" && CACHE.me ? CACHE.me.ten || "Chính tôi" : "Cả " + gr.ten;
      const n = gr.nguoi.find((x) => x.v === v);
      if (n) return n.ten;
    }
    return "";
  }
  async function taiNoiNhan() {
    if (CACHE.noiNhan) return true;
    let r = await api("GET", "/api/phong/noi-nhan");
    if (r.ma === 404) { const nn = noiNhanTuSoDo(await soDoThoTaiDay()); if (nn) r = { ma: 200, j: nn }; } // bản live cũ
    if (r.ma === 200 && r.j) { CACHE.noiNhan = r.j; return true; }
    toast(r.ma === 403 ? "Bạn không có quyền giao việc" : loiCau(r));
    return false;
  }
  function moChon(kieu, pv) {
    if (kieu === "giao") CHON = { kieu, nhom: nhomGiaoMoi, mo: new Set(), q: "", sel: GV && GV.nhan, tieu: "Giao cho…" };
    else if (kieu === "ct") { // ✏ đổi chủ trì = giao việc lại → đúng danh sách + phạm vi «Giao cho» (chốt 10/10, Mr. Đại 01/11/2026)
      const sv = pv;
      CHON = { kieu, nhom: () => nhomGiaoMoi().map((gr) => Object.assign({}, gr, { radio: gr.radio === sv.ctCu ? null : gr.radio, nguoi: gr.nguoi.filter((n) => n.v !== sv.ctCu) })).filter((gr) => gr.radio || gr.nguoi.length), mo: new Set(), q: "", sel: sv.ct !== sv.ctCu ? sv.ct : "", tieu: "Đổi chủ trì…" };
    } else if (kieu === "sph" || kieu === "ph") { // ✏ thêm phối hợp (chip, gửi khi Lưu) · nút «+ Phối hợp» (thêm ngay)
      const daCo = pv;
      CHON = { kieu, nhom: () => nhomPhoiHop(daCo), mo: new Set(), q: "", sel: "", tieu: kieu === "sph" ? "Thêm phối hợp…" : "Phối hợp với…" };
    } else {
      const nh = nhomChuyenTiep((((dongSoCai(tt.mo) || {}).ptCt || []).find((p) => p.id === pv) || {}).pid);
      CHON = { kieu, pv, nhom: () => nh, mo: new Set(nh.filter((x) => x.truong).map((x) => x.id)), q: "", sel: "", tieu: "Giao chuyển tiếp cho…" };
    }
    $("chon-tieu").textContent = CHON.tieu;
    $("chon-q").value = "";
    veChon();
    $("man-chon").classList.add("mo");
  }
  const dongChon = () => { $("man-chon").classList.remove("mo"); CHON = null; };
  function chonXong(v) {
    const C = CHON;
    if (!C) return;
    const ten = tenTrongNhom(C.nhom(), v);
    dongChon();
    const loaiId = v.replace(":", "|"); // «don_vi:id» → «don_vi|id» (khuôn cũ của danh sách phối hợp)
    if (C.kieu === "giao") { GV.nhan = v; veGiao(); }
    else if (C.kieu === "ct") { H.sCt = v; H.sCtTen = ten; ve(); } // gửi khi bấm «Lưu thay đổi»
    else if (C.kieu === "sph") themPhoiHopForm(loaiId);
    else if (C.kieu === "ph") themPhoiHop(loaiId);
    else phanCong(C.pv, v.replace(/^nguoi:/, ""));
  }
  async function soDoThoTaiDay() {
    if (CACHE.soDoRaw) return CACHE.soDoRaw;
    const k = await api("GET", "/api/phong/so-do");
    if (k.ma === 200 && k.j) CACHE.soDoRaw = k.j;
    return CACHE.soDoRaw || null;
  }
  // chép luật 3004: phạm vi giao = giao_duoc ("tat_ca" hoặc danh sách đơn vị) trừ chan_chu_tri; cá nhân = giao_nguoi (nhóm theo đơn vị)
  function noiNhanTuSoDo(j) {
    if (!j || !j.o) return null;
    const gd = j.giao_duoc, chan = new Set(j.chan_chu_tri || []);
    const duoc = (id) => !chan.has(id) && (!gd || gd === "tat_ca" || gd.includes(id));
    const o = j.o || [], con = {};
    o.forEach((x) => { const k = x.cha && o.some((y) => y.id === x.cha) ? x.cha : "_"; (con[k] = con[k] || []).push(x); });
    const cay = [];
    const di = (cha, thut) => (con[cha] || []).slice().sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0)).forEach((x) => {
      if (x.loai === "chuc_danh") return;
      const an = x.loai === "ban_tgd";
      if (!an && duoc(x.id)) cay.push({ id: x.id, thut });
      di(x.id, an ? thut : thut + 1);
    });
    di("_", 0);
    const donVi = o.map((x) => ({ id: x.id, ten: x.ten, ten_ngan: x.ten_ngan, loai: x.loai, cha_id: x.cha }));
    (j.lanh_dao || []).forEach((l) => { if (!donVi.some((d) => d.id === l.id)) donVi.push({ id: l.id, ten: l.ten, ten_ngan: l.ten_ngan, loai: "chuc_danh" }); });
    const nguoi = [];
    (j.giao_nguoi || []).forEach((g) => (g.nguoi || []).forEach((n) => nguoi.push({ id: n.id, ten: n.ten, dv: g.ten })));
    return { nguoi, don_vi: donVi, nhom: { lanh_dao: (j.lanh_dao || []).filter((l) => !/^trợ lý/i.test(String(l.ten || "").trim()) && duoc(l.id)).map((l) => l.id), cay, ca_nhan: nguoi.map((n) => n.id) } };
  }
  function phoiHopTuSoDo(j) {
    const ph = j && j.phoi_hop;
    if (!ph) return null;
    const nhom = [];
    if ((ph.lanh_dao || []).length) nhom.push({ don_vi: "Ban lãnh đạo", muc: ph.lanh_dao.map((l) => ({ loai: "don_vi", id: l.id, ten: l.ten })) });
    (ph.nhom || []).forEach((g) => nhom.push({ don_vi: g.ten, muc: (g.ca ? [{ loai: "don_vi", id: g.don_vi_id, ten: "Cả " + g.ten }] : []).concat((g.nguoi || []).map((n) => ({ loai: "nguoi", id: n.id, ten: n.ten }))) }));
    return { nhom };
  }
  async function moGiao() {
    // Chạm ra ngoài khung chỉ ĐÓNG, chữ đã gõ và tệp đã kẹp giữ nguyên; bấm «+» lại thấy như cũ. Chỉ «Hủy» hoặc giao xong mới xoá (Mr. Đại 01/11/2026)
    if (GV && !GV.dang) { GV.tai = true; GV.loi = ""; }
    else { GV = { nhan: "", da: "", ten: "", kq: "", han: "", loc: "", loi: "", dang: false, tai: true }; TEP.giao = []; }
    soDoThoTaiDay(); // cần giao_duoc để biết đơn vị nào phải chọn một nhân viên
    DANGTEP = "";
    taiCD();
    veGiao();
    if (!CACHE.noiNhan) {
      let r = await api("GET", "/api/phong/noi-nhan");
      if (r.ma === 404) { const nn = noiNhanTuSoDo(await soDoThoTaiDay()); if (nn) r = { ma: 200, j: nn }; } // bản live cũ
      if (r.ma === 200 && r.j) CACHE.noiNhan = r.j;
      else { GV.tai = false; GV.loiTai = r.ma === 403 ? "Bạn không có quyền giao việc" : loiCau(r); veGiao(); return; }
    }
    if (!CACHE.sd) await taiSoDo();
    await taiCD();
    GV.tai = false;
    veGiao();
  }
  function veGiao() {
    const g = GV;
    if (!g) return;
    if (g.tai) return mo('<h2>Giao việc</h2><div class="tong">Đang tải danh sách người nhận…</div>');
    if (g.loiTai) return mo('<h2>Giao việc</h2><div class="loi">' + esc(g.loiTai) + '</div><div class="hanh-dong"><button class="nut" id="g-huy">Đóng</button></div>');
    const da = (CACHE.sd && CACHE.sd.ds) || [];
    mo(`<h2>Giao việc</h2>
      <label>Giao cho</label><button class="chon-nut ${g.nhan ? "co" : ""}" id="g-chon">${esc(g.nhan ? tenNhanChon(g.nhan) : "— chọn người / đơn vị nhận —")}<span>›</span></button>
      <label>Thuộc dự án (không bắt buộc)</label><select data-gv="da"><option value="">— không chọn —</option>${da.map((d) => `<option ${g.da === d.ten ? "selected" : ""}>${esc(d.ten)}</option>`).join("")}</select>
      <label>Nội dung việc</label><textarea data-gv="ten" placeholder="Việc cần làm…">${esc(g.ten)}</textarea>
      <label>Kết quả cần có (không bắt buộc)</label><input data-gv="kq" value="${esc(g.kq)}" placeholder="Ví dụ: Biên bản nghiệm thu có chữ ký">
      <label>Hạn (bấm để mở lịch)</label><input type="date" data-gv="han" min="${homNay()}" value="${esc(g.han)}">
      ${cdBat("giao_viec") ? `<div class="hang-kep">${nutKep("giao_viec", "g|", TEP.giao)}</div>${chipTep(TEP.giao, "g")}` : ""}
      ${g.loi ? `<div class="loi">${esc(g.loi)}</div>` : ""}
      <div class="hanh-dong"><button class="nut chinh" id="g-giao" ${g.dang ? "disabled" : ""}>${g.dang ? "Đang giao…" : "Giao việc"}</button><button class="nut" id="g-huy">Hủy</button></div>`);
  }
  async function guiGiao() {
    const g = GV, hn = homNay();
    const [loai, ...r] = (g.nhan || "").split(":"), id = r.join(":");
    const nh = timNhanChon(g.nhan);
    const iso = g.han.trim() || null;
    g.loi = !nh ? "Chưa chọn người nhận" : !g.ten.trim() ? "Nhập nội dung việc" : iso && iso < hn ? "Hạn không được trước hôm nay" : "";
    if (g.loi) return veGiao();
    g.dang = true; veGiao();
    const r2 = await api("POST", "/api/cong-viec", { ten: g.ten.trim(), ...(g.da ? { du_an: g.da } : {}), ket_qua_can_co: g.kq.trim() || null, bat_dau: hn, ket_thuc: iso, phan_viec: [{ loai, id, ten: nh.ten, bat_dau: hn, ket_thuc: iso }], dinh_kem: TEP.giao.map((t) => t.id) });
    g.dang = false;
    if (r2.ma >= 200 && r2.ma < 300) { const ma = r2.j && r2.j.ma_viec; GV = null; TEP.giao = []; dong(); toast("Đã giao việc" + (ma ? " " + ma : "") + ": " + g.ten.trim().slice(0, 40)); taiToi(); if (CACHE.sd) taiSoDo(); NA.dongBoNgay(); }
    else { g.loi = r2.ma === 403 ? "Bạn không có quyền giao việc này" : loiCau(r2); veGiao(); }
  }

  // ---------- Cấu hình (răng cưa cạnh chuông) ----------
  function veCH() {
    const dong_ = (cd, ten, phu) => `<button class="dong-chon" data-ch="${cd}"><span><b>${ten}</b>${phu ? `<br><small style="color:var(--phu)">${phu}</small>` : ""}</span><span class="n">›</span></button>`;
    $("ds-ch").innerHTML = '<div class="nhom">Hiển thị</div>'
      + '<button class="dong-chon" data-ch="an-trong"><span><b>Ẩn phòng / dự án không có việc</b><br><small style="color:var(--phu)">Bật: mọi danh sách (kể cả đơn vị con trong một phòng) tự ẩn mục 0 việc, có việc thì tự hiện lại</small></span><span class="gat ' + (KHO.anTrong ? "bat" : "") + '"></span></button>'
      + '<div class="nhom">Thông báo</div>' + dong_("giu", "Giữ thông báo không bị lỡ", "Kiểm pin, thông báo, tự khởi động của máy")
      + '<div class="nhom">Tài khoản</div>' + `<div class="tong">${S.dangNhap ? "Đang đăng nhập: <b>" + esc(S.ten || S.email) + "</b><br><small>" + esc(S.server) + "</small>" : "Chưa đăng nhập"}</div>`
      + dong_("dn", "Đăng nhập", "Đăng nhập lại / đổi tài khoản, máy chủ") + dong_("xuat", "Đăng xuất", "")
      + '<div class="nhom">Phiên bản</div><div class="tong">SCI Công việc <b>' + esc((NA.phienBan && NA.phienBan()) || "?") + '</b><br><small>Cài bản mới: chép tệp APK mới sang máy rồi mở, cài đè — không cần gỡ</small></div>';
  }

  // ---------- Giữ thông báo không bị lỡ ----------
  function veCD() {
    let d = {};
    try { d = JSON.parse(NA.chanDoan()); } catch (e) { /* bỏ */ }
    const daBat = doc("sci_cd_v1", {});
    const m = (t, ten, nho, nut) => `<div class="kiem"><span class="d ${t}">${t === "ok" ? "✓" : t === "sai" ? "✕" : "?"}</span><div><b>${ten}</b><small>${nho}</small>${nut || ""}</div></div>`;
    const b = (cd, chu) => `<button class="nut" data-cd="${cd}">${chu}</button> `;
    const giay = d.nhipCuoi ? Math.round((d.bayGio - d.nhipCuoi) / 1000) : null;
    $("ds-cd").innerHTML = `<div class="tong" style="padding:12px 14px">Máy này: <b>${esc(d.may || "?")}</b>. Xiaomi hay tự tắt app chạy nền nên các mục dưới đây quyết định chuông và báo họp có bị lỡ hay không.</div>`
      + m(d.thongBaoBat ? "ok" : "sai", "Cho phép thông báo", d.thongBaoBat ? "Đã bật." : "Đang TẮT — sẽ không nhận được gì.", d.thongBaoBat ? "" : b("thongbao", "Mở cài đặt thông báo"))
      + m(d.kenhHopMuc >= 4 ? "ok" : "sai", "Kênh «Họp» ưu tiên cao", d.kenhHopMuc >= 4 ? "Nổi lên màn hình và có tiếng." : "Đang bị hạ mức: báo họp sẽ không nổi lên.", d.kenhHopMuc >= 4 ? "" : b("thongbao", "Mở cài đặt thông báo"))
      + m(d.pinKhongHanChe ? "ok" : "sai", "Pin: Không hạn chế", d.pinKhongHanChe ? "Đã cho phép chạy nền." : "Đang «Tiết kiệm pin» — Xiaomi sẽ tắt app khi tắt màn hình. Đây là nguyên nhân hay gặp nhất.", d.pinKhongHanChe ? "" : b("pin", "Cho phép chạy nền") + b("pin-xiaomi", "Cài đặt pin Xiaomi"))
      + m(daBat.autostart ? "ok" : "hoi", "Tự khởi động (Autostart)", "Máy không cho app tự kiểm. Bật trong Cài đặt → Ứng dụng → SCI Công việc → Tự khởi động, rồi bấm «Đã bật».", b("autostart", "Mở cài đặt") + b("da-autostart", daBat.autostart ? "Bỏ đánh dấu" : "Đã bật"))
      + m(daBat.khoa ? "ok" : "hoi", "Khoá app trong đa nhiệm", "Mở màn hình đa nhiệm, kéo thẻ SCI Công việc xuống (hoặc nhấn giữ → ổ khoá). Để vuốt xoá hết app không giết nó.", b("da-khoa", daBat.khoa ? "Bỏ đánh dấu" : "Đã khoá"))
      + m(d.dichVuChay ? "ok" : "sai", "Dịch vụ nền", d.dichVuChay ? "Đang chạy." : d.pinKhongHanChe ? "Đang dừng — sẽ được báo thức cứu hộ bật lại trong vài phút." : "Đang dừng — pin chưa ở «Không hạn chế» nên máy có thể KHÔNG tự bật lại. Sửa mục Pin ở trên.", "")
      + m(giay != null && giay < 150 ? "ok" : "sai", "Lần hỏi máy chủ gần nhất", giay == null ? "Chưa có lần nào." : "Cách đây " + giay + " giây" + (giay < 150 ? "." : " — quá 2 phút là có vấn đề."), b("hoi", "Hỏi ngay"))
      // Số trên biểu tượng (01/11/2026): máy có cho app hiện huy hiệu không + số app đang đặt + số thông báo đang nằm trong khay (HyperOS đếm theo khay)
      + m(d.huyHieuDuocPhep ? "ok" : "sai", "Số trên biểu tượng app", (d.huyHieuDuocPhep ? "Máy cho phép hiện huy hiệu. " : "Máy đang TẮT huy hiệu của app — icon sẽ không có số. Bật ở Cài đặt → Thông báo → Huy hiệu. ") + "App đang đặt số <b>" + (d.huyHieuSo != null ? d.huyHieuSo : "?") + "</b>, khay có " + (d.khaySo != null ? d.khaySo : "?") + " thông báo.", (d.huyHieuDuocPhep ? "" : b("thongbao", "Mở cài đặt thông báo")) + b("thu-hh", "Thử huy hiệu: đặt số 7"))
      + '<div class="nhom">Thử và nhật ký</div><div class="kiem"><div>' + b("thu", "Gửi thông báo thử sau 1 phút") + b("xuat", "Đăng xuất") + `<small style="margin-top:8px;white-space:pre-wrap;font-family:monospace;font-size:11px">${esc((d.nhatKy || []).slice(-14).join("\n"))}</small></div></div>`;
  }
  $("b-tim").addEventListener("click", () => {
    if (tt.tab === "ph") return; // tab Phòng họp không có ô tìm việc
    TIM.mo = !TIM.mo;
    if (TIM.mo) { $("tim-q").value = TIM.q; $("tim-loai").value = TIM.loai; }
    ve();
    if (TIM.mo) $("tim-q").focus();
  });
  // Enter / nút «Tìm» của bàn phím: chốt chữ tìm, ô tìm ẩn, menu đáy hiện lại
  let henTim;
  const ketThucTim = () => { clearTimeout(henTim); TIM.q = $("tim-q").value; TIM.mo = false; tt.mo = null; $("tim-q").blur(); ve(); };
  $("tim-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); ketThucTim(); } });
  // gõ chữ nào lọc chữ đó ngay bên dưới (chờ 150 ms sau phím cuối cho đỡ giật); Enter mới ẩn ô tìm
  $("tim-q").addEventListener("input", () => {
    $("tim-xoa").style.display = $("tim-q").value ? "block" : "none";
    clearTimeout(henTim);
    henTim = setTimeout(() => { TIM.q = $("tim-q").value; tt.mo = null; ve(); }, 150);
  });
  // chạm ra ngoài ô tìm (không phải kính lúp) thì ô tìm ẩn luôn — chờ cú chạm làm xong việc của nó rồi mới ẩn, khỏi mất cú bấm vào thẻ việc
  document.addEventListener("click", (e) => {
    if (!TIM.mo || e.target.closest("#o-tim") || e.target.closest("#b-tim")) return;
    setTimeout(() => { if (TIM.mo) { clearTimeout(henTim); TIM.q = $("tim-q").value; TIM.mo = false; $("tim-q").blur(); ve(); } }, 0); // không đụng tt.mo: thẻ việc vừa bấm vẫn mở
  }, true);
  $("chon-q").addEventListener("input", () => { if (CHON) { CHON.q = $("chon-q").value; veChon(); } });
  $("man-chon").addEventListener("click", (e) => { if (e.target === $("man-chon")) dongChon(); });
  $("tim-xoa").addEventListener("click", () => { $("tim-q").value = ""; $("tim-xoa").style.display = "none"; if (TIM.q) { TIM.q = ""; tt.mo = null; ve(); } $("tim-q").focus(); });
  $("tim-loai").addEventListener("change", () => {
    TIM.loai = $("tim-loai").value;
    TIM.mo = false; // chọn bộ lọc là ô tìm tự ẩn
    tt.mo = null;
    ve();
    if (TIM.loai && !CACHE.sd && S.dangNhap) taiSoDo().then(ve); // cờ giao chuyển tiếp nằm ở dữ liệu sổ cái
  });
  $("b-ch").addEventListener("click", () => { veCH(); $("man-ch").classList.add("mo"); if (!CACHE.sd && S.dangNhap) taiSoDo().then(veCH); });
  $("ch-lui").addEventListener("click", () => $("man-ch").classList.remove("mo"));
  $("cd-lui").addEventListener("click", () => $("man-cd").classList.remove("mo"));
  $("ds-cd").addEventListener("click", (e) => {
    const t = e.target.closest("[data-cd]");
    if (!t) return;
    const k = t.dataset.cd, daBat = doc("sci_cd_v1", {});
    if (k === "da-autostart") { daBat.autostart = !daBat.autostart; luu("sci_cd_v1", daBat); veCD(); }
    else if (k === "da-khoa") { daBat.khoa = !daBat.khoa; luu("sci_cd_v1", daBat); veCD(); }
    else if (k === "thu") { NA.guiThu(); toast("Sẽ gửi thông báo thử sau 1 phút — khoá màn hình để thử"); }
    else if (k === "thu-hh") { if (NA.thuHuyHieu) NA.thuHuyHieu(7); toast("Đã đặt số 7 — về màn hình chính nhìn icon ngay. Sau ≤ 1 phút app tự trả về số thật"); setTimeout(veCD, 1500); }
    else if (k === "hoi") { NA.dongBoNgay(); toast("Đang hỏi máy chủ…"); setTimeout(() => { docTrangThai(); veCD(); }, 2500); }
    else if (k === "xuat") { NA.dangXuat(); S.dangNhap = false; xoaBoNho(); $("man-cd").classList.remove("mo"); hienDangNhap(""); }
    else { NA.moCaiDat(k); setTimeout(veCD, 1500); }
  });

  // ---------- khung chính ----------
  function ve() {
    const t = tt.tab;
    const giuCuon = $("than").scrollTop;
    $("than").className = tt.mo ? "co-mo" : "";
    $("b-qh").classList.toggle("sang", !!tt.qh);
    $("b-qh").setAttribute("aria-pressed", tt.qh ? "true" : "false");
    $("b-tim").classList.toggle("sang", timDangLoc());
    const dangTim = TIM.mo && t !== "ph";
    $("o-tim").style.display = dangTim ? "flex" : "none";
    $("duoi").style.display = dangTim ? "none" : ""; // bàn phím ảo chiếm đáy màn hình: ẩn menu đáy khi đang tìm
    $("tim-xoa").style.display = $("tim-q").value || TIM.q ? "block" : "none";
    $("than").innerHTML = (timDangLoc() && !TIM.mo ? '<div class="bao-loc">Đang lọc: ' + esc([TIM.loai === "chua" ? "Việc chưa giao chuyển tiếp" : TIM.loai === "da" ? "Việc đã giao chuyển tiếp" : "", TIM.q.trim() ? "«" + TIM.q.trim() + "»" : ""].filter(Boolean).join(" · ")) + " — bấm kính lúp để sửa hoặc xoá</div>" : "") + (tt.qh ?'<div class="tong qh-bao">Đang chỉ hiện việc quá hạn — bấm ! để hiện tất cả</div>' : "") + (t === "toi" ? manToi() : t === "pb" ? manPhongBan() : t === "da" ? manDuAn() : manPhong());
    $("than").scrollTop = giuCuon;
    $("nutgiao").style.display = t === "toi" && !dangTim && coQuyenGiao() ? "block" : "none";
    document.querySelectorAll("#duoi button").forEach((b) => b.classList.toggle("dang", b.dataset.t === t));
  }
  function napTab() {
    if (!S.dangNhap) return;
    if (tt.tab === "toi") taiToi();
    else if (tt.tab === "pb" || tt.tab === "da") { taiSoDo(); if (tt.tab === "da") taiTomTat(); }
    else taiPhong();
  }

  document.addEventListener("click", (e) => {
    const bi = e.target.closest(".ic .bieu");
    if (bi && tt.sua) { const ic0 = bi.closest(".ic"); if (ic0 && !vuaGiu) { moIcon(ic0.dataset.k, ic0.dataset.id); return; } }
    const t = e.target.closest("button, #hop, .tb, .ic");
    if (!t) return;
    if (vuaGiu) { vuaGiu = 0; return; } // đúng MỘT cú click lúc nhả tay sau khi giữ lâu thì bỏ
    if (t.matches(".ic") && (tt.sua || (!t.dataset.dv && !t.dataset.da))) return;
    if (t.matches("#duoi button") && t.dataset.t === "chat") moChat(); // bản 3004: «Trợ lý» là lớp phủ riêng, không đổi tab đang xem
    else if (t.matches("#duoi button")) { tt.sua = null; tt.tab = t.dataset.t; tt.mo = null; ve(); napTab(); $("than").scrollTop = 0; }
    else if (t.dataset.taiLai) napTab();
    else if (t.dataset.an) { const [k, id] = t.dataset.an.split("|"); KHO[k].an.push(id); luu("sci_kho_v1", KHO); ve(); }
    else if (t.dataset.ico) { const [k, id, ma] = t.dataset.ico.split("|"); const m = icoMap(); if (ma) m[k + ":" + id] = ma; else delete m[k + ":" + id]; luu(khoaIcon(), m); dong(); ve(); }
    else if (t.dataset.hien) { const [k, id] = t.dataset.hien.split("|"); KHO[k].an = KHO[k].an.filter((x) => x !== id); luu("sci_kho_v1", KHO); ve(); }
    else if (t.id === "sua-xong") { tt.sua = null; ve(); }
    else if (t.dataset.vai) { tt.vai = t.dataset.vai; tt.mo = null; ve(); }
    else if (t.dataset.loc) { tt.loc = t.dataset.loc; ve(); }
    else if (t.id === "g-chon") moChon("giao");
    else if (t.dataset.pcmo) moChon("pc", t.dataset.pcmo);
    else if (t.dataset.cn && CHON) { if (CHON.mo.has(t.dataset.cn)) CHON.mo.delete(t.dataset.cn); else CHON.mo.add(t.dataset.cn); veChon(); }
    else if (t.dataset.cv && CHON) chonXong(t.dataset.cv);
    else if (t.id === "chon-dong") dongChon();
    else if (t.dataset.gang) { tt.loc = tt.loc === "gang" ? "tat-ca" : "gang"; ve(); }
    else if (t.dataset.nha) { tt.dv = null; tt.da = null; tt.mo = null; ve(); $("than").scrollTop = 0; }
    else if (t.dataset.cuatoi) { tt.cuaToi = !tt.cuaToi; ve(); }
    else if (t.dataset.td) moBangTd(t.dataset.td);
    else if (t.dataset.dv) { tt.dv = t.dataset.dv; ve(); $("than").scrollTop = 0; dong(); }
    else if (t.dataset.luipb !== undefined) { tt.dv = t.dataset.luipb || null; ve(); }
    else if (t.dataset.da) { tt.da = t.dataset.da; tt.loc = "tat-ca"; ve(); $("than").scrollTop = 0; }
    else if (t.dataset.luida) { tt.da = null; ve(); }
    else if (t.dataset.nd) { tt.d = Math.max(0, Math.min(6, tt.d + Number(t.dataset.nd))); ve(); taiPhong(); }
    else if (t.dataset.o) { const [p, o] = t.dataset.o.split("|"); const d = CACHE["ph" + ngayThu(tt.d)]; const b = d && cuocO(d.cuoc || [], p, o); if (b) chiTietO(b); else { F = null; moDK(p, o); } }
    else if (t.id === "dk-moi") { F = null; moDK(); }
    else if (t.dataset.fd) { F.d = Math.max(0, Math.min(6, F.d + Number(t.dataset.fd))); moDK(); }
    else if (t.dataset.fp) { F.p = t.dataset.fp; moDK(); }
    else if (t.dataset.moi && F) { const [l, ...r] = t.dataset.moi.split("|"); F.moi.push({ loai: l, id: r.join("|") }); F.timMoi = ""; F.moMoi = false; veMoi(); }
    else if (t.dataset.bomoi !== undefined && F) { F.moi.splice(Number(t.dataset.bomoi), 1); veMoi(); }
    else if (t.id === "dk-gui") guiDK();
    else if (t.id === "dk-huy") { F = null; dong(); }
    else if (t.id === "nutgiao") moGiao();
    else if (t.id === "g-giao" && GV) guiGiao();
    else if (t.id === "g-huy") { GV = null; TEP.giao = []; dong(); }
    else if (t.dataset.ch) {
      const k = t.dataset.ch;
      if (k === "an-trong") { KHO.anTrong = !KHO.anTrong; luu("sci_kho_v1", KHO); veCH(); if (tt.tab === "pb" || tt.tab === "da") ve(); }
      else if (k === "giu") { $("man-ch").classList.remove("mo"); veCD(); $("man-cd").classList.add("mo"); }
      else if (k === "dn") { $("man-ch").classList.remove("mo"); hienDangNhap(""); }
      else if (k === "xuat") { NA.dangXuat(); S.dangNhap = false; xoaBoNho(); $("man-ch").classList.remove("mo"); hienDangNhap(""); }
    }
    else if (t.dataset.moxong) { const k = t.dataset.moxong; if (MO_XONG.has(k)) MO_XONG.delete(k); else MO_XONG.add(k); ve(); }
    else if (t.dataset.mo) moThe(t.dataset.mo, t.dataset.nhom);
    else if (t.dataset.kep) { const [k, ma] = t.dataset.kep.split("|"); if (k === "bl") kepTep("binh_luan", (TEP.bl[ma] = TEP.bl[ma] || []), laiXong); else if (k === "xong") kepTep("bao_xong", TEP.xong, laiXong); else kepTep("giao_viec", TEP.giao, veGiao); }
    else if (t.dataset.boTep) { const [k, ma, i] = t.dataset.boTep.split("|"); const ds = k === "bl" ? TEP.bl[ma] : k === "xong" ? TEP.xong : TEP.giao; ds.splice(Number(i != null ? i : ma), 1); if (k === "g") veGiao(); else ve(); }
    else if (t.dataset.moTep) { const [tid, ...ten] = t.dataset.moTep.split("|"); xemTepApp(tid, ten.join("|")); }
    else if (t.id === "xem-lui") dongXem();
    else if (t.id === "xem-nho") doiZoom(-1);
    else if (t.id === "xem-lon") doiZoom(1);
    else if (t.id === "xem-tai") moTepApp(XEM.id, XEM.ten);
    else if (t.dataset.th) {
      const k = t.dataset.th;
      if (k === "tai-lai") { taiCT(tt.mo); return; }
      tt.thao = k === tt.thao ? "" : k; H.lyDo = ""; H.han = ""; H.pv = ""; H.sTen = undefined; H.sKq = undefined; H.sHan = ""; H.sBd = undefined; H.sCt = undefined; H.sCtTen = undefined; H.sPh = undefined; ve();
      if (tt.thao === "phoi-hop") moPhoiHop();
      if (tt.thao === "sua-viec") { moPhoiHop(); taiNoiNhan(); } // ✏ nạp sẵn danh sách «Giao cho» (chủ trì) + nơi phối hợp
    }
    else if (t.dataset.boph !== undefined) { if (H.sPh) { H.sPh.splice(Number(t.dataset.boph), 1); ve(); } } // ✏ bỏ một chip phối hợp
    else if (t.dataset.chonct) { const c_ = duocCT(tt.mo), v = c_ && c_.viec; if (v) taiNoiNhan().then((ok) => ok && moChon("ct", suaViecTrangThai(v))); } // ✏ đổi chủ trì
    else if (t.dataset.chonph) { // ✏ thêm phối hợp · nút «+ Phối hợp»
      const c_ = duocCT(tt.mo), v = c_ && c_.viec;
      if (v && CACHE.noiPh) {
        const daCo = t.dataset.chonph === "sua"
          ? (() => { const sv = suaViecTrangThai(v); return new Set(sv.ph.map((x) => x.loai + ":" + x.id).concat([sv.ct])); })()
          : new Set((v.phan_viec || []).filter((p) => p.trang_thai === "dang_lam").map((p) => p.phu_trach_loai + ":" + p.phu_trach_id));
        moChon(t.dataset.chonph === "sua" ? "sph" : "ph", daCo);
      }
    }
    else if (t.dataset.lam) { if (t.dataset.lam !== "ph" && t.dataset.lam !== "sct" && t.dataset.lam !== "sph") lamViec(t.dataset.lam); }
    else if (t.dataset.at) chenAt(t.dataset.at, t.dataset.atTen);
    else if (t.id === "bl-gui") guiBl();
    else if (t.id === "b-qh") { tt.qh = !tt.qh; luu("sci_qh", tt.qh ? 1 : 0); tt.mo = null; ve(); toast(tt.qh ? "Chỉ hiện việc quá hạn" : "Hiện tất cả việc"); }
    else if (t.id === "hop-sua" && SUA_HOP) suaCuoc();
    else if (t.id === "hop-xoa" && SUA_HOP) xoaCuoc();
    else if (t.id === "xoa-ok" && SUA_HOP) thucXoaCuoc();
    else if (t.dataset.vaohop) { const c = S.hop.find((x) => String(x.id) === t.dataset.vaohop); dong(); if (c) vaoHop(c); }
  });
  let SUA_HOP = null; // cuộc họp đang xem chi tiết (để Sửa / Xoá)
  function chiTietO(b) {
    SUA_HOP = b;
    const d = CACHE["ph" + ngayThu(tt.d)] || {}, toi = d.toi || {};
    const bay = d.bay || T.bayGioVN();
    const daXong = tt.d === 0 && pm(b.den) <= bay.phut, dangHop = tt.d === 0 && pm(b.tu) <= bay.phut && bay.phut < pm(b.den);
    const cua = toi.id && (b.nguoi_dat === toi.id || toi.la_quan_tri);
    const nut = !cua ? "" : daXong ? "" : dangHop ? '<button class="nut" id="hop-xoa">Kết thúc sớm</button>' : '<button class="nut chinh" id="hop-sua">Sửa</button><button class="nut" id="hop-xoa" style="color:var(--do)">Xoá lịch</button>';
    mo(`<h2>Cuộc họp</h2><div><b>${esc(b.noi_dung)}</b></div><div style="color:var(--phu);margin:4px 0 10px">${esc(T.tenPhong(b.phong))} · ${ngayChu(tt.d)} · ${b.tu} – ${b.den}<br>Người đặt: ${esc(b.nguoi_dat_ten || "")}${cua ? " (bạn)" : ""}${b.duong_dan ? "<br>Họp trực tuyến: " + esc(b.duong_dan) : ""}${b.ghi_chu ? "<br>Ghi chú: " + esc(b.ghi_chu) : ""}</div><div class="hanh-dong">${nut}<button class="nut" id="dk-huy">Đóng</button></div>`);
  }
  function suaCuoc() {
    const b = SUA_HOP;
    F = { sua: b.id, p: b.phong, d: tt.d, tu: b.tu, den: b.den, nd: b.noi_dung || "", moi: [], moiGoc: b.moi || null, khach: b.khach_ngoai || "", dd: b.duong_dan || "", gc: b.ghi_chu || "", loi: "" };
    moDK();
  }
  async function xoaCuoc() {
    const b = SUA_HOP, d = CACHE["ph" + ngayThu(tt.d)] || {}, bay = d.bay || T.bayGioVN();
    const dangHop = tt.d === 0 && pm(b.tu) <= bay.phut && bay.phut < pm(b.den);
    if (!dangHop) { mo('<h2>Xoá lịch họp</h2><div style="margin:6px 0 10px">Xoá lịch «' + esc(b.noi_dung) + '»? Người được mời sẽ nhận thông báo huỷ.</div><div class="hanh-dong"><button class="nut chinh" id="xoa-ok">Xoá lịch</button><button class="nut" id="dk-huy">Không xoá</button></div>'); return; }
    return thucXoaCuoc();
  }
  async function thucXoaCuoc() {
    const b = SUA_HOP, d = CACHE["ph" + ngayThu(tt.d)] || {}, bay = d.bay || T.bayGioVN();
    const dangHop = tt.d === 0 && pm(b.tu) <= bay.phut && bay.phut < pm(b.den);
    const r = dangHop ? await api("POST", "/api/phong-hop/" + b.id) : await api("DELETE", "/api/phong-hop/" + b.id);
    if (r.ma >= 200 && r.ma < 300) { SUA_HOP = null; dong(); toast(dangHop ? "Đã kết thúc sớm" : "Đã xoá lịch họp"); await taiPhong(); NA.dongBoNgay(); }
    else toast(loiCau(r));
  }
  // ---------- Thẻ việc mở TẠI CHỖ như 3004 (demo-apk-viec-3004.html): nền khung thẫm lại, chỉ việc đang mở sáng; nút theo QUYỀN, không quyền thì ẨN ----------
  const H = { lyDo: "", han: "", pv: "" }; // ô đang gõ ở thẻ đang mở
  const CMT = {}; // bình luận theo mã việc: { bl, nd, nhac }
  const boDau = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/đ/g, "d"); // toLowerCase TRƯỚC: «Đ» hoa không tách dấu, phải thành «đ» rồi mới đổi
  const isoSangVN = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "");
  const vnSangIso = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s).trim()); if (!m) return null; const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])); return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1 ? m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0") : null; };
  const gioBl = (luc) => new Date(luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  const duocCT = (ma) => { const c = CACHE.ct && CACHE.ct[ma]; return c && c.viec ? c : null; };
  // ---------- 📎 kẹp tệp (giống 3004: bình luận · báo xong · giao việc) — tải lên từng tệp qua cầu nối Android, gửi danh sách mã khi bấm Gửi / Xong / Giao ----------
  const TEP = { bl: {}, xong: [], giao: [] }; // tệp đã tải lên, đang chờ gửi: { id, ten, kich_thuoc }
  const TEPCB = {};
  let DANGTEP = ""; // chữ tiến độ «Đang tải 1/2: …»
  const coTep = (b) => (b < 1024 ? b + " B" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB");
  window.__tep = (id, loai, json) => {
    const f = TEPCB[id]; if (!f) return;
    let d; try { d = JSON.parse(json); } catch (e) { d = loai === "tien" ? {} : []; }
    if (loai === "tien") f.tien(d); else { delete TEPCB[id]; f.xong(d); }
  };
  async function taiCD() {
    if (CACHE.dk) return CACHE.dk;
    const r = await api("GET", "/api/dinh-kem/cai-dat");
    CACHE.dk = r.ma === 200 && r.j ? r.j : { khongCo: true }; // máy chủ chưa có / không cho → ẩn nút 📎 (3004: không bấm được thì không hiện)
    return CACHE.dk;
  }
  const cdBat = (noi) => { const c = CACHE.dk; return !!(c && !c.khongCo && c[noi]); };
  function nutKep(noi, khoa, ds) {
    if (!cdBat(noi)) return "";
    const toi = (CACHE.dk && CACHE.dk.so_file_toi_da) || 20;
    return '<button class="kep" data-kep="' + khoa + '" ' + (DANGTEP || ds.length >= toi ? "disabled" : "") + ' aria-label="Kẹp tệp">📎' + (ds.length ? " " + ds.length + "/" + toi : "") + "</button>";
  }
  function chipTep(ds, khoa) {
    if (!ds.length && !DANGTEP) return "";
    return '<div class="chon-tep">' + (DANGTEP ? '<span class="mo-nho">' + esc(DANGTEP) + "</span>" : "") + ds.map((t, i) => '<span class="tep-da-kep">📎 ' + esc(t.ten) + " <small>" + coTep(t.kich_thuoc) + '</small> <button class="bo-tep" data-bo-tep="' + khoa + "|" + i + '" aria-label="Bỏ tệp">✕</button></span>').join("") + "</div>";
  }
  function kepTep(noi, ds, lai) {
    const toi = (CACHE.dk && CACHE.dk.so_file_toi_da) || 20, mb = (CACHE.dk && CACHE.dk.toi_da_mb) || 50;
    if (ds.length >= toi) return toast("Mỗi lần kẹp tối đa " + toi + " tệp");
    const id = ++seq;
    TEPCB[id] = {
      tien: (d) => { DANGTEP = "Đang tải " + (d.i || 1) + "/" + (d.n || 1) + ": " + (d.ten || ""); lai(); },
      xong: (kq) => {
        DANGTEP = "";
        const hong = [];
        (kq || []).forEach((k) => { if (k.ok) { if (ds.length < toi) ds.push({ id: k.id, ten: k.ten, kich_thuoc: k.kich_thuoc }); } else hong.push((k.ten ? k.ten + ": " : "") + (k.loi || "lỗi")); });
        if (hong.length) toast(hong.join(" · "));
        lai();
      },
    };
    NA.chonTep(id, noi, mb);
  }
  function moTepApp(tepId, ten) {
    const id = ++seq;
    cbs[id] = (ma, txt) => { let j = {}; try { j = JSON.parse(txt); } catch (e) { /* bỏ */ } toast(j.thongbao || "Không mở được tệp"); };
    toast("Đang tải " + ten + "…");
    NA.moTep(id, tepId, ten);
  }
  const dsTepHien = (ds, tieuDe) => {
    const a = (ds || []).filter(Boolean);
    return a.length ? '<div class="ds-tep">' + (tieuDe ? '<div class="mo-nho">' + esc(tieuDe) + "</div>" : "") + a.map((t) => t.xoa_luc ? '<span class="tep-het">📎 ' + esc(t.ten_tep) + " — đã xoá do hết hạn lưu</span>" : '<button class="tep-mo" data-mo-tep="' + esc(t.id) + "|" + esc(t.ten_tep) + '">📎 ' + esc(t.ten_tep) + " <small>" + coTep(t.kich_thuoc) + "</small></button>").join("") + "</div>" : "";
  };
  const laiXong = () => ve();

  // ---------- XEM tệp ngay trong app, không lưu về máy (docx · xlsx · pdf · ảnh · chữ) ----------
  // docx/xlsx: máy chủ đổi sẵn HTML (/api/dinh-kem/<id>/xem) → vẽ trong khung cách ly (không chạy được mã). PDF: Android PdfRenderer vẽ từng trang khi cuộn tới.
  const XEM = { id: "", ten: "", loai: "", zoom: 1, tok: 0, io: null, html: "", ghi: "", chu: "", anh: "" };
  const BUOC_ZOOM = [0.8, 1, 1.5, 2, 3];
  const naXem = (ham, ...a) => new Promise((ok) => { const id = ++seq; cbs[id] = (ma, txt) => { let j = {}; try { j = JSON.parse(txt); } catch (e) { /* bỏ */ } if (ma === 401) hetPhien(); ok(j); }; NA[ham](id, ...a); });
  function dongXem() {
    XEM.tok++;
    if (XEM.io) { XEM.io.disconnect(); XEM.io = null; }
    if (XEM.loai === "pdf") NA.pdfDong();
    XEM.loai = "";
    $("man-xem").classList.remove("mo");
    $("xem-than").innerHTML = "";
  }
  const xemLoi = (m, kemTai) => { $("xem-than").innerHTML = '<div class="loi" style="padding:14px">' + esc(m) + "</div>" + (kemTai ? '<div class="hanh-dong" style="padding:0 14px"><button class="nut" id="xem-tai">Tải về máy</button></div>' : ""); };
  function veXemHtml() {
    const z = XEM.zoom, css = "body{font:" + Math.round(14 * z) + "px/1.45 sans-serif;margin:8px;color:#1a1a1a;word-wrap:break-word}table{border-collapse:collapse;font-size:" + Math.round(12 * z) + "px}td,th{border:1px solid #ccc;padding:2px 6px;vertical-align:top}img{max-width:100%}";
    $("xem-than").innerHTML = (XEM.ghi ? '<div class="mo-nho" style="padding:6px 12px">' + esc(XEM.ghi) + "</div>" : "") + '<iframe class="xem-khung" sandbox="" srcdoc="' + esc("<!doctype html><meta charset=utf-8><style>" + css + "</style>" + XEM.html) + '"></iframe>';
  }
  function veXemChu() { $("xem-than").innerHTML = '<pre class="xem-chu" style="font-size:' + Math.round(12 * XEM.zoom) + 'px">' + esc(XEM.chu) + "</pre>"; }
  function veXemAnh() { $("xem-than").innerHTML = '<div class="xem-cuon"><img class="xem-anh" style="width:' + XEM.zoom * 100 + '%" src="' + XEM.anh + '"></div>'; }
  function veXemPdf(ti) {
    if (XEM.io) XEM.io.disconnect();
    const tok = XEM.tok, goc = $("xem-than");
    goc.innerHTML = '<div class="xem-cuon"><div class="xem-pdf" style="width:' + XEM.zoom * 100 + '%">' + ti.map((t, i) => '<div class="xem-trang" data-n="' + i + '" style="padding-top:' + (t * 100).toFixed(2) + '%"></div>').join("") + "</div></div>";
    XEM.io = new IntersectionObserver((ds) => {
      ds.forEach(async (d) => {
        const el = d.target;
        if (!d.isIntersecting || el.dataset.xong) return;
        el.dataset.xong = "1";
        const rong = Math.min(2400, Math.round(el.clientWidth * (window.devicePixelRatio || 2)));
        const kq = await naXem("pdfTrang", Number(el.dataset.n), rong);
        if (tok !== XEM.tok) return;
        el.innerHTML = kq.ok ? '<img src="' + kq.u + '">' : '<div class="loi" style="padding:8px">' + esc(kq.loi || "Không vẽ được trang") + "</div>";
      });
    }, { root: goc.querySelector(".xem-cuon"), rootMargin: "700px 0px" });
    goc.querySelectorAll(".xem-trang").forEach((e) => XEM.io.observe(e));
  }
  function veXemLai() {
    if (XEM.loai === "html") veXemHtml(); else if (XEM.loai === "chu") veXemChu(); else if (XEM.loai === "anh") veXemAnh(); else if (XEM.loai === "pdf") veXemPdf(XEM.ti);
  }
  async function xemTepApp(tepId, ten) {
    if (XEM.loai === "pdf") NA.pdfDong();
    XEM.tok++;
    const tok = XEM.tok;
    Object.assign(XEM, { id: tepId, ten, loai: "", zoom: 1, html: "", ghi: "", chu: "", anh: "", ti: [] });
    $("xem-ten").textContent = ten;
    $("xem-than").innerHTML = '<div class="tong">Đang mở…</div>';
    $("man-xem").classList.add("mo");
    const k = await api("GET", "/api/dinh-kem/" + encodeURIComponent(tepId) + "/xem");
    if (tok !== XEM.tok) return;
    if (k.ma !== 200 || !k.j) return xemLoi(loiCau(k), k.ma === 404);
    const b = k.j;
    if (b.ten_tep) $("xem-ten").textContent = b.ten_tep;
    if (b.loai === "html") { Object.assign(XEM, { loai: "html", html: b.html || "", ghi: b.ghi_chu || "" }); veXemHtml(); }
    else if (b.loai === "chu") { Object.assign(XEM, { loai: "chu", chu: b.chu || "" }); veXemChu(); }
    else if (b.loai === "pdf") {
      const q = await naXem("pdfMo", tepId);
      if (tok !== XEM.tok) { if (q.ok) NA.pdfDong(); return; }
      if (!q.ok) return xemLoi(q.loi || "Không mở được PDF", true);
      Object.assign(XEM, { loai: "pdf", ti: q.ti || [] });
      veXemPdf(XEM.ti);
    } else if (b.loai === "anh") {
      const q = await naXem("anhMo", tepId);
      if (tok !== XEM.tok) return;
      if (!q.ok) return xemLoi(q.loi || "Không mở được ảnh", true);
      Object.assign(XEM, { loai: "anh", anh: q.u });
      veXemAnh();
    } else xemLoi(b.ghi_chu || "Chưa xem trực tiếp được loại tệp này.", true);
  }
  function doiZoom(d) {
    if (!XEM.loai) return;
    const i = Math.max(0, Math.min(BUOC_ZOOM.length - 1, BUOC_ZOOM.indexOf(XEM.zoom) + d));
    if (BUOC_ZOOM[i] === XEM.zoom) return;
    XEM.zoom = BUOC_ZOOM[i];
    veXemLai();
  }

  async function taiCT(ma) {
    const p = encodeURIComponent(ma);
    const [a, b] = await Promise.all([api("GET", "/api/cong-viec/" + p), api("GET", "/api/cong-viec/" + p + "/binh-luan?da_xem=1")]);
    CACHE.ct = CACHE.ct || {};
    CACHE.ct[ma] = a.ma === 200 && a.j && a.j.viec ? a.j : { loi: loiCau(a) };
    const c = (CMT[ma] = CMT[ma] || { nd: "", nhac: [] });
    c.bl = b.ma === 200 && b.j ? b.j : { loi: loiCau(b) };
    if (tt.mo === ma) ve();
  }
  function nutViec(ma) {
    const c = duocCT(ma);
    if (!CACHE.ct || !CACHE.ct[ma]) return '<div class="tong">Đang tải…</div>';
    if (!c) return '<div class="loi">' + esc(CACHE.ct[ma].loi) + '</div><div class="hanh-dong"><button class="nut" data-th="tai-lai">Thử lại</button></div>';
    const v = c.viec, mo_ = v.trang_thai === "dang_mo";
    const b = (k, ten, cl) => `<button data-th="${k}" class="${cl || ""} ${tt.thao === k || (k === "gia-han" && tt.thao === "ngay-khac") ? "dang" : ""}">${ten}</button>`;
    const xong = mo_ && (v.co_the_ket_thuc || []).length > 0, sua = !!c.co_the_sua;
    const hang = ((CACHE.sd && CACHE.sd.viec) || []).find((x) => x.ma === ma), xr = (CACHE.xongRaw || []).find((x) => x.id === ma);
    const dc = (c.co_the_dieu_chinh && c.co_the_dieu_chinh.length ? c.co_the_dieu_chinh : (hang && hang.dieuChinh) || []); // trưởng đơn vị chủ trì: gia hạn phần việc của đơn vị mình (phương án A, 29/10)
    const giaHan = sua || dc.length > 0, coBut = !!(hang && hang.suaViec);
    const phoi = sua || !!(hang && hang.coPh); // 3004: co_the_phoi_hop ?? co_the_sua — trưởng đơn vị cấp trên mời phối hợp được dù không sửa được việc
    const moLai = !!(xr && xr.co_the_mo_lai && xr.trang_thai === "hoan_thanh"); // 3004: «Mở lại» lấy quyền từ /api/so-cai/da-xong
    const ds = (xong ? b("xong", "Xong việc", "chinh") : "") + (mo_ && giaHan ? b("gia-han", "Gia hạn") : "") + (mo_ && coBut ? b("sua-viec", "✏ Sửa việc") : "") + (mo_ && phoi ? b("phoi-hop", "＋ Phối hợp") : "") + (mo_ && sua ? b("huy", "Hủy việc") : "") + (!mo_ && moLai ? b("mo-lai", "Mở lại") : "");
    return ds ? '<div class="ba-nut">' + ds + "</div>" : "";
  }
  function formThao(ma, item) {
    const c = duocCT(ma);
    if (!c || !tt.thao) return "";
    const v = c.viec, pvs = (v.phan_viec || []).filter((p) => p.trang_thai === "dang_lam" && p.vai !== "phoi_hop");
    const tenPv = (p) => esc(p.phu_trach_ten || p.phu_trach_id);
    const chon = (ds) => (ds.length > 1 ? '<select data-h="pv" style="flex-basis:100%">' + ds.map((p) => `<option value="${esc(p.id)}" ${H.pv === p.id ? "selected" : ""}>${tenPv(p)}</option>`).join("") + "</select>" : "");
    const hangF = ((CACHE.sd && CACHE.sd.viec) || []).find((x) => x.ma === ma), dcF = (c.co_the_dieu_chinh && c.co_the_dieu_chinh.length ? c.co_the_dieu_chinh : (hangF && hangF.dieuChinh) || []);
    const pvsGia = c.co_the_sua ? pvs : pvs.filter((p) => dcF.includes(p.id));
    const t = tt.thao;
    if (t === "xong") { const ds = (v.phan_viec || []).filter((p) => (v.co_the_ket_thuc || []).includes(p.id)); return '<div class="form-nho">' + chon(ds) + '<input type="text" data-h="lyDo" placeholder="Báo kết quả bằng lời (không bắt buộc)" value="' + esc(H.lyDo) + '">' + nutKep("bao_xong", "xong|", TEP.xong) + '<button class="nut chinh" data-lam="xong">Xong việc</button>' + (TEP.xong.length || DANGTEP ? '<div style="flex-basis:100%">' + chipTep(TEP.xong, "xong|") + "</div>" : "") + "</div>"; }
    if (t === "gia-han") return '<div class="form-nho">' + chon(pvsGia) + '<span>Hạn mới</span><button class="chip" data-lam="+3">+3 ngày</button><button class="chip" data-lam="+7">+7 ngày</button><button class="chip" data-lam="+14">+14 ngày</button><input type="date" class="chon-ngay" data-h="hanIso" min="' + homNay() + '"><span class="mo-nho" style="flex-basis:100%">bấm nút hoặc chọn ngày trên lịch là áp dụng — không phải ghi lý do</span></div>';
    if (t === "sua-viec") {
      // ✏ Sửa việc — đúng form web live (SoDoPhong.tsx FormSuaViec, bản congviec.scigroup.vn): Tên · Kết quả · Bắt đầu · Hạn · Chủ trì · Phối hợp (Mr. Đại 01/11/2026)
      const sv = suaViecTrangThai(v), nh = '<span style="flex-basis:100%">';
      // Chủ trì + Phối hợp: CÙNG bảng chọn «Giao cho» (trượt lên, BLĐ chỉ ghi tên, nút tròn = cả đơn vị, bấm tên phòng = bung từng người,
      // chọn là đóng) — Mr. Đại 01/11/2026. Chủ trì lấy phạm vi «Giao cho» (đổi chủ trì = giao việc lại); phối hợp lấy danh sách phối hợp.
      const tenCt = sv.ct === sv.ctCu ? tenRut(sv.ctCuTen) + " (đang chủ trì)" : (H.sCtTen || sv.ct) + " (mới — bấm Lưu để đổi)";
      const oCt = sv.ctCu ? nh + 'Chủ trì</span><button class="chon-nut co" data-chonct="1" style="flex-basis:100%">' + esc(tenCt) + "<span>›</span></button>" : "";
      const chips = sv.ph.map((x, i) => '<span class="tep-da-kep">' + esc(tenRut(x.ten)) + ' <button class="bo-tep" data-boph="' + i + '" aria-label="Bỏ phối hợp">✕</button></span>').join("");
      const oPh = nh + 'Phối hợp</span><div class="chon-tep" style="flex-basis:100%">' + chips + '<button class="chon-nut" data-chonph="sua" style="flex:1;min-width:140px">' + (CACHE.noiPh ? "＋ thêm phối hợp…" : "Đang tải danh sách…") + "<span>›</span></button></div>";
      return '<div class="form-nho">' + nh + 'Tên việc</span><input type="text" data-h="sTen" style="flex-basis:100%" value="' + esc(H.sTen !== undefined ? H.sTen : v.ten) + '">'
        + nh + 'Kết quả cần có</span><input type="text" data-h="sKq" style="flex-basis:100%" placeholder="Ví dụ: tờ trình gửi TGĐ" value="' + esc(H.sKq !== undefined ? H.sKq : (v.ket_qua_can_co || "")) + '">'
        + '<span>Bắt đầu</span><input type="date" class="chon-ngay" data-h="sBd" value="' + esc(H.sBd !== undefined ? H.sBd : (v.bat_dau || "").slice(0, 10)) + '">'
        + '<span>Hạn mới (để trống = giữ)</span><input type="date" class="chon-ngay" data-h="sHan" min="' + homNay() + '" value="' + esc(H.sHan || "") + '">'
        + oCt + oPh + '<button class="nut chinh" data-lam="sua-viec">Lưu thay đổi</button></div>';
    }
    if (t === "huy") return '<div class="form-nho"><input type="text" data-h="lyDo" placeholder="Lý do hủy việc (bắt buộc)" value="' + esc(H.lyDo) + '"><button class="nut chinh" data-lam="huy">Hủy việc</button></div>';
    if (t === "mo-lai") return '<div class="form-nho"><input type="text" data-h="lyDo" placeholder="Lý do mở lại (bắt buộc)" value="' + esc(H.lyDo) + '"><button class="nut chinh" data-lam="mo-lai">Mở lại</button></div>';
    if (t === "phoi-hop") {
      // cùng bảng chọn «Giao cho» (Mr. Đại 01/11/2026); chọn là thêm ngay
      return '<div class="form-nho"><button class="chon-nut" data-chonph="the" style="flex-basis:100%">' + (CACHE.noiPh ? "Phối hợp với…" : "Đang tải danh sách…") + '<span>›</span></button><span class="mo-nho" style="flex-basis:100%">chọn là thêm ngay (chỉ để biết, không hạn riêng)</span></div>';
    }
    return "";
  }
  /** Trạng thái form ✏: chủ trì đang có / đang chọn, danh sách phối hợp đang chọn (khởi tạo từ phần việc đang làm của thẻ) */
  function suaViecTrangThai(v) {
    const dang = (v.phan_viec || []).filter((p) => p.trang_thai === "dang_lam");
    const ct = dang.find((p) => p.vai !== "phoi_hop");
    const ctCu = ct ? ct.phu_trach_loai + ":" + ct.phu_trach_id : "";
    if (H.sPh === undefined) H.sPh = dang.filter((p) => p.vai === "phoi_hop").map((p) => ({ loai: p.phu_trach_loai, id: p.phu_trach_id, ten: p.phu_trach_ten || p.phu_trach_id }));
    if (H.sCt === undefined) H.sCt = ctCu;
    return { ctCu, ctCuTen: ct ? ct.phu_trach_ten || ct.phu_trach_id : "", ct: H.sCt, ph: H.sPh };
  }
  function themPhoiHopForm(giaTri) {
    const np = CACHE.noiPh, [loai, ...r] = giaTri.split("|"), id = r.join("|");
    const m = np && (np.nhom || []).flatMap((g) => g.muc || []).find((x) => x.loai === loai && x.id === id);
    if (!m || !H.sPh || H.sPh.some((x) => x.loai === m.loai && x.id === m.id)) return;
    H.sPh.push({ loai: m.loai, id: m.id, ten: m.ten });
    ve();
  }
  function noiDungBl(b) {
    let s = esc(b.noi_dung);
    (b.nhac || []).map((n) => "@" + n.ten).sort((a, c) => c.length - a.length).forEach((t) => { s = s.split(esc(t)).join('<span class="at">' + esc(t) + "</span>"); });
    return s;
  }
  function blKhoi(ma) {
    const c = CMT[ma], b = c && c.bl;
    if (!b) return '<div class="tong">Đang tải bình luận…</div>';
    if (b.loi) return '<div class="loi">' + esc(b.loi) + "</div>";
    if (b.cai_dat_dinh_kem && !CACHE.dk) CACHE.dk = b.cai_dat_dinh_kem;
    const dk = (b.dinh_kem || []).filter((t) => t.noi !== "binh_luan");
    const ds = (b.binh_luan || []).slice(-30).map((x) => `<li><b>${esc(x.ten)}</b> <span class="gio">${esc(gioBl(x.luc))}</span> — <span class="nd-bl">${noiDungBl(x)}</span>${dsTepHien((x.tep || []).map((t) => (t.ten_tep ? t : Object.assign({}, t, { ten_tep: t.ten }))))}</li>`).join("");
    const mang = (TEP.bl[ma] = TEP.bl[ma] || []);
    const viet = b.co_the_binh_luan ? `<div class="o-viet" id="ov"><textarea id="bl-ta" rows="2" data-ma="${esc(ma)}" placeholder="Viết ý kiến… gõ @ gọi người liên quan, @@ tìm thêm người">${esc(c.nd)}</textarea>${nutKep("binh_luan", "bl|" + ma, mang)}<button class="gui" id="bl-gui" ${c.nd.trim() || mang.length ? "" : "disabled"}>Gửi</button></div>${chipTep(mang, "bl|" + ma)}` : '<div class="tong">Bạn chỉ xem được bình luận, không viết được.</div>';
    return dsTepHien(dk.filter((t) => t.noi === "giao_viec").map((t) => t), "Tệp kèm khi giao việc") + dsTepHien(dk.filter((t) => t.noi === "bao_xong"), "Tệp kèm khi báo xong") + `<ul class="bl-ds">${ds}</ul>` + viet;
  }
  function seBaoChu(ma) {
    const c = CMT[ma], b = c.bl, m = new Map();
    (b.se_bao || []).forEach((x) => m.set(x.id, { ten: x.ten, ly: x.ly.slice() }));
    c.nhac.filter((n) => c.nd.includes("@" + n.ten)).forEach((n) => { const x = m.get(n.id) || { ten: n.ten, ly: [] }; if (!x.ly.includes("được @")) x.ly.push("được @"); m.set(n.id, x); });
    return m.size ? "Sẽ báo cho: " + [...m.values()].map((x) => `<b>${esc(x.ten)}</b> <span class="mo-nho">(${esc(x.ly.join(", "))})</span>`).join(" · ") : "Chưa có ai để báo";
  }
  // Giao chuyển tiếp (web SoDoPhong.tsx:1308): hiện khi co_the_phan_cong; danh sách người = giao_nguoi (theo quyền giao); chọn là giao luôn
  function pcOChon(ma) {
    const r = dongSoCai(ma);
    if (!r || !(r.pc || []).length || !r.ptCt) return "";
    const nhomG = (CACHE.soDoRaw && CACHE.soDoRaw.giao_nguoi) || [];
    const dsP = r.ptCt.filter((p) => r.pc.includes(p.id));
    return dsP.map((p) => {
      const nhom = nhomG.map((gr) => Object.assign({}, gr, { nguoi: (gr.nguoi || []).filter((n) => n.id !== p.pid) })).filter((gr) => gr.nguoi.length);
      if (!nhom.length && !laLanhDaoToi() && !(CACHE.me && CACHE.me.id && p.pid !== CACHE.me.id)) return "";
      return '<div class="phan-cong"><button class="chon-nut" data-pcmo="' + esc(p.id) + '">' + (dsP.length > 1 ? "Phần của " + esc(p.ten) + ": giao chuyển tiếp cho…" : "Giao chuyển tiếp cho…") + "<span>›</span></button></div>";
    }).join("");
  }
  async function phanCong(pvId, nguoiId) {
    const ma = tt.mo;
    if (!ma) return;
    const ng = ((CACHE.soDoRaw && CACHE.soDoRaw.giao_nguoi) || []).flatMap((gr) => gr.nguoi || []).concat(nhanSuBld()).find((n) => n.id === nguoiId) || (CACHE.me && CACHE.me.id === nguoiId ? { ten: "chính tôi" } : null);
    const r = await api("POST", "/api/cong-viec/" + encodeURIComponent(ma), { hanh_dong: "phan_cong", phan_viec_id: pvId, nguoi_id: nguoiId });
    if (r.ma >= 200 && r.ma < 300) { toast("Đã giao «" + String((dongSoCai(ma) || {}).ten || ma).slice(0, 40) + "» cho " + (ng ? ng.ten : nguoiId)); taiToi(); taiSoDo().then(() => ve()); NA.dongBoNgay(); taiCT(ma); }
    else toast(loiCau(r));
  }
  function thanViec(v) {
    const c = duocCT(v.ma), ct = c && c.viec;
    const bd = ct && ct.bat_dau ? ct.bat_dau.slice(0, 10) : "", kt = v.han ? v.han.slice(0, 10) : ct && ct.ket_thuc ? ct.ket_thuc.slice(0, 10) : "";
    let moc = "";
    if (bd && kt && kt >= bd) {
      const tong = Math.max(1, (Date.parse(kt) - Date.parse(bd)) / 86400000), da = Math.min(1, Math.max(0, (Date.parse(homNay()) - Date.parse(bd)) / 86400000 / tong));
      moc = `<div class="moc"><span>${isoSangVN(bd)}</span><span class="thanh"><i style="width:${Math.round(da * 100)}%"></i><em>${Math.round((Date.parse(kt) - Date.parse(bd)) / 864e5) + 1} ngày</em></span><span class="${v.tt === "tre" ? "qh" : ""}">${isoSangVN(kt)}</span></div>`;
    } else if (kt) moc = `<div class="dong"><span>Hạn:</span> ${isoSangVN(kt)}</div>`;
    const r0 = dongSoCai(v.ma);
    const ai = (r0 && r0.ai) || v.chu || "—", ph = r0 && r0.aiPh ? r0.aiPh.filter((t) => t !== ai) : [];
    const giao = (r0 && r0.giao) || (v.giao ? (CACHE.tenNguoi && (CACHE.tenNguoi[v.giao] || CACHE.tenNguoi[String(v.giao).split("@")[0]])) || v.giao : "không rõ");
    const cuaAi = '<div class="cua-ai">Việc của <b>' + esc(ai) + "</b>" + (ph.length ? " · " + esc(ph.join(" + ")) + " phối hợp" : "") + " · được giao bởi " + esc(giao) + "</div>";
    const kq = ct && ct.ket_qua_can_co ? `<div class="dong"><span>Kết quả cần có:</span> ${esc(ct.ket_qua_can_co)}</div>` : "";
    return `<div class="than-viec">${cuaAi}${moc}${kq}${pcOChon(v.ma)}${nutViec(v.ma)}${formThao(v.ma)}${blKhoi(v.ma)}</div>`;
  }
  // nhom: một việc có thể hiện ở HAI chỗ trên cùng màn (nhóm «Việc nằm trên đường găng» + nhóm người/đơn vị) → chỉ mở đúng bản được bấm.
  // Gọi qua .map(the) thì đối số 2 là số thứ tự → coi như không có nhóm.
  function the(v, nhom) {
    const nh = typeof nhom === "string" ? nhom : "";
    const dang = tt.mo === v.ma && (tt.moNhom || "") === nh, qua = v.tt === "tre";
    return `<div class="viec ${qua ? "qua" : ""} ${dang ? "mo" : ""}" data-ma="${esc(v.ma)}" data-nhom="${nh}"><button class="dau" data-mo="${esc(v.ma)}" data-nhom="${nh}"><span class="mui">▸</span><span class="t">${v.gang ? '<span class="gang" title="Trên đường găng">!</span>' : ""}${esc(v.ten)}</span><span class="r ${qua ? "do" : v.tt === "sap" ? "sap" : v.tt === "xong" ? "xong" : ""}">${esc(v.ttChu || "")}</span></button>${dang ? thanViec(v) : ""}</div>`;
  }
  function moThe(ma, nhom) {
    tt.thao = ""; H.lyDo = ""; H.han = ""; H.pv = ""; H.sTen = undefined; H.sKq = undefined; H.sHan = ""; H.sBd = undefined; H.sCt = undefined; H.sCtTen = undefined; H.sPh = undefined; TEP.xong = []; DANGTEP = "";
    const nh = nhom || "";
    tt.mo = tt.mo === ma && (tt.moNhom || "") === nh ? null : ma;
    tt.moNhom = tt.mo ? nh : "";
    ve();
    if (tt.mo && !CACHE.sd && S.dangNhap) taiSoDo(); // cần cờ co_the_phoi_hop của hàng so-cai
    if (tt.mo) { if (CACHE.ct) delete CACHE.ct[ma]; taiCD().then(() => tt.mo === ma && ve()); taiCT(ma); }
  }
  async function lamViec(k) {
    const ma = tt.mo, c = duocCT(ma);
    if (!c) return;
    const v = c.viec, p = encodeURIComponent(ma);
    const pvs = (v.phan_viec || []).filter((x) => x.trang_thai === "dang_lam" && x.vai !== "phoi_hop");
    const hangL = ((CACHE.sd && CACHE.sd.viec) || []).find((x) => x.ma === ma), dcL = (c.co_the_dieu_chinh && c.co_the_dieu_chinh.length ? c.co_the_dieu_chinh : (hangL && hangL.dieuChinh) || []);
    const pvsG = c.co_the_sua ? pvs : pvs.filter((x) => dcL.includes(x.id));
    const pvGia = pvsG.find((x) => x.id === H.pv) || pvsG[0];
    const base = (() => { const h = (v.ket_thuc || "").slice(0, 10), hn = homNay(); return h && h > hn ? h : hn; })();
    let body, ok;
    if (k === "xong") { const id = H.pv && (v.co_the_ket_thuc || []).includes(H.pv) ? H.pv : (v.co_the_ket_thuc || [])[0]; body = { hanh_dong: "ket_thuc", phan_viec_id: id, ghi_chu: H.lyDo.trim() || null, dinh_kem: TEP.xong.map((t) => t.id) }; ok = "Đã báo xong"; }
    else if (k === "+3" || k === "+7" || k === "+14") { const iso = T.congNgay(base, Number(k.slice(1))); body = { hanh_dong: "gia_han", ...(pvGia ? { phan_viec_id: pvGia.id } : {}), ket_thuc: iso, ly_do: "Gia hạn trên ứng dụng điện thoại" }; ok = "Đã gia hạn tới " + isoSangVN(iso); }
    else if (k === "ngay") { const iso = H.hanIso; if (!iso) return; if (iso < homNay()) return toast("Hạn mới không được trước hôm nay"); body = { hanh_dong: "gia_han", ...(pvGia ? { phan_viec_id: pvGia.id } : {}), ket_thuc: iso, ly_do: "Gia hạn trên ứng dụng điện thoại" }; ok = "Đã gia hạn tới " + isoSangVN(iso); }
    else if (k === "sua-viec") {
      const ten = String(H.sTen !== undefined ? H.sTen : v.ten).replace(/\s+/g, " ").trim(), kq =String(H.sKq !== undefined ? H.sKq : (v.ket_qua_can_co || "")).trim();
      if (!ten) return toast("Tên việc không được để trống");
      if (H.sHan && H.sHan < homNay()) return toast("Hạn mới không được trước hôm nay");
      const sv = suaViecTrangThai(v), bdCu = (v.bat_dau || "").slice(0, 10), bd = H.sBd !== undefined ? H.sBd : bdCu, hanMoi = H.sHan || (v.ket_thuc || "").slice(0, 10);
      if (bd && hanMoi && bd > hanMoi) return toast("Ngày bắt đầu sau hạn");
      // Một lệnh sua_viec như web live: chu_tri chỉ gửi khi đổi; phoi_hop gửi toàn bộ danh sách đang chọn (máy chủ bỏ cái thiếu, thêm cái mới)
      let chuTri = null;
      // chủ trì mới chọn ở bảng «Giao cho»: «nguoi:<email>» hoặc «don_vi:<mã>» (cả đơn vị — máy chủ nhận cả hai loại)
      if (sv.ctCu && sv.ct && sv.ct !== sv.ctCu) { const loai = sv.ct.split(":")[0], id = sv.ct.split(":").slice(1).join(":"); chuTri = { loai: loai === "don_vi" ? "don_vi" : "nguoi", id, ten: (H.sCtTen || id).replace(/^Cả /, "") }; }
      body = { hanh_dong: "sua_viec", ten: ten, ket_qua_can_co: kq || null, ...(bd !== bdCu ? { bat_dau: bd || null } : {}), ...(H.sHan ? { ket_thuc: H.sHan } : {}), ...(chuTri ? { chu_tri: chuTri } : {}), phoi_hop: sv.ph.map((x) => ({ loai: x.loai, id: x.id, ten: x.ten })) }; ok = "Đã lưu thay đổi việc";
    }
    else if (k === "huy") { if (!H.lyDo.trim()) return toast("Phải ghi lý do hủy việc"); body = { hanh_dong: "dong_viec", ly_do: H.lyDo.trim() }; ok = "Đã hủy việc"; }
    else if (k === "mo-lai") { if (!H.lyDo.trim()) return toast("Phải ghi lý do mở lại"); body = { hanh_dong: "mo_lai", ly_do: H.lyDo.trim(), ket_thuc: null }; ok = "Đã mở lại việc"; }
    else return;
    const r = await api("POST", "/api/cong-viec/" + p, body);
    if (r.ma >= 200 && r.ma < 300) { toast(ok); tt.thao = ""; H.lyDo = ""; H.han = ""; TEP.xong = []; taiToi(); if (CACHE.sd) taiSoDo(); NA.dongBoNgay(); taiCT(ma); }
    else toast(loiCau(r));
  }
  async function themPhoiHop(giaTri) {
    const ma = tt.mo, np = CACHE.noiPh, [loai, ...r] = giaTri.split("|"), id = r.join("|");
    const m = np && (np.nhom || []).flatMap((g) => g.muc || []).find((x) => x.loai === loai && x.id === id);
    if (!m) return;
    const kq = await api("POST", "/api/cong-viec/" + encodeURIComponent(ma), { hanh_dong: "them_phan_viec", phu_trach: { loai: m.loai, id: m.id, ten: m.ten }, bat_dau: homNay(), ket_thuc: null });
    if (kq.ma >= 200 && kq.ma < 300) { toast("Đã thêm " + m.ten + " phối hợp"); tt.thao = ""; NA.dongBoNgay(); taiCT(ma); } else toast(loiCau(kq));
  }
  async function moPhoiHop() {
    if (CACHE.noiPh) return;
    let r = await api("GET", "/api/cong-viec/noi-phoi-hop");
    if (r.ma === 404) { const ph = phoiHopTuSoDo(await soDoThoTaiDay()); if (ph) r = { ma: 200, j: ph }; } // bản live cũ
    if (r.ma === 200 && r.j) CACHE.noiPh = r.j; else { tt.thao = ""; toast(loiCau(r)); }
    ve();
  }
  // gõ @ / @@: @ = người liên quan việc (xếp đầu) · @@ = tìm thêm theo quyền «Tag tên» (BinhLuanViec.tsx)
  function goiYAt(ta) {
    const cu = document.querySelector(".goi-y"); if (cu) cu.remove();
    const c = CMT[ta.dataset.ma], b = c && c.bl; if (!b) return;
    const m = /(@@?)([^\s@]*(?:\s[^\s@]*){0,2})$/.exec(ta.value.slice(0, ta.selectionStart)); if (!m) return;
    const rong = m[1] === "@@", k = boDau(m[2]);
    const ds = (rong ? b.nguoi_rong || [] : b.nguoi || []).filter((n) => n.id !== b.toi && boDau(n.ten).includes(k)).slice(0, rong ? 8 : 12);
    const d = document.createElement("div"); d.className = "goi-y";
    d.innerHTML = '<div class="dau-nhom">' + (rong ? "Tìm thêm người" : "Người liên quan việc") + "</div>" + (ds.length ? ds.map((n) => `<button data-at="${esc(n.id)}" data-at-ten="${esc(n.ten)}"><b>${esc(n.ten)}</b><small>${esc([n.trong_viec ? "trong việc" : "", n.chuc_vu, n.don_vi].filter(Boolean).join(" · "))}</small></button>`).join("") : '<div class="tong">Không có ai khớp</div>');
    $("ov").appendChild(d);
  }
  function chenAt(id, ten) {
    const ta = $("bl-ta"), c = CMT[ta.dataset.ma], pos = ta.selectionStart;
    const truoc = ta.value.slice(0, pos).replace(/@@?[^\s@]*(?:\s[^\s@]*){0,2}$/, "");
    ta.value = truoc + "@" + ten + " " + ta.value.slice(pos);
    c.nd = ta.value;
    if (!c.nhac.some((n) => n.id === id)) c.nhac.push({ id, ten });
    const g = document.querySelector(".goi-y"); if (g) g.remove();
    $("bl-gui").disabled = false; 
    ta.focus();
  }
  async function guiBl() {
    const ta = $("bl-ta"), ma = ta.dataset.ma, c = CMT[ma], nd = c.nd.trim(), tep = TEP.bl[ma] || [];
    if (!nd && !tep.length) return;
    $("bl-gui").disabled = true;
    const r = await api("POST", "/api/cong-viec/" + encodeURIComponent(ma) + "/binh-luan", { noi_dung: nd, nhac: c.nhac.filter((n) => nd.includes("@" + n.ten)).map((n) => n.id), dinh_kem: tep.map((t) => t.id) });
    if (r.ma >= 200 && r.ma < 300) { c.nd = ""; c.nhac = []; TEP.bl[ma] = []; toast("Đã gửi — người liên quan được báo chuông"); NA.dongBoNgay(); taiCT(ma); }
    else { $("bl-gui").disabled = false; toast(loiCau(r)); }
  }

  const ghiF = (e) => {
    const d = e.target.dataset || {};
    if (d.f && F) F[d.f] = e.target.value;
    if (d.h) H[d.h] = e.target.value;
    if (d.gv && GV) { GV[d.gv] = e.target.value; if (d.gv === "loc") $("g-nhan").innerHTML = veOChon(); }
    if (e.target.id === "bl-ta" && e.type === "input") { const c = CMT[e.target.dataset.ma]; c.nd = e.target.value; $("bl-gui").disabled = !c.nd.trim() && !(TEP.bl[e.target.dataset.ma] || []).length;  goiYAt(e.target); }
    if (d.lam === "ph" && e.type === "change") themPhoiHop(e.target.value);
    if (d.lam === "sct" && e.type === "change") H.sCt = e.target.value; // ✏ chọn chủ trì mới (gửi khi bấm Lưu)
    if (d.lam === "sph" && e.type === "change" && e.target.value) themPhoiHopForm(e.target.value); // ✏ thêm chip phối hợp
    if (d.pc && e.type === "change" && e.target.value) phanCong(d.pc, e.target.value);
    if (d.h === "hanIso" && e.type === "change" && e.target.value) lamViec("ngay"); // chọn ngày trên lịch là áp dụng luôn
  };
  // ô mời: bấm vào là xổ danh mục, gõ là lọc; bấm ra ngoài thì đóng
  document.addEventListener("focusin", (e) => { if (F && e.target.id === "moi-q" && !F.moMoi) { F.moMoi = true; const p = document.querySelector(".moi-pop"); if (p) p.classList.add("mo"); } });
  document.addEventListener("focusout", (e) => { if (F && e.target.id === "moi-q") setTimeout(() => { if (F && F.moMoi && document.activeElement && document.activeElement.id !== "moi-q") { F.moMoi = false; const p = document.querySelector(".moi-pop"); if (p) p.classList.remove("mo"); } }, 180); });
  document.addEventListener("input", (e) => { if (F && e.target.id === "moi-q") { F.timMoi = e.target.value; F.moMoi = true; veMoi(); } });
  document.addEventListener("click", (e) => { if (F && F.moMoi && !e.target.closest(".moi-o")) { F.moMoi = false; const p = document.querySelector(".moi-pop"); if (p) p.classList.remove("mo"); } });
  document.addEventListener("input", ghiF);
  document.addEventListener("change", ghiF);

  // giữ lâu một biểu tượng → vào chế độ chỉnh; kéo ≡ để xếp
  let giu = null, vuaGiu = 0;
  function batDauKeo(e, ic) {
    e.preventDefault();
    const lst = ic.parentElement, cuon = $("than"), sibs = [...lst.querySelectorAll(".ic")];
    const i0 = sibs.indexOf(ic), buoc = ic.offsetHeight + 8; // 8 = khoảng cách giữa hai ô
    const y0 = e.clientY, s0 = cuon.scrollTop, giuTay = e.target;
    let clientY = y0, idx = i0, raf = 0;
    try { giuTay.setPointerCapture(e.pointerId); } catch (_) { /* không giữ được thì vẫn kéo bằng document */ }
    sibs.forEach((s) => { s.style.animation = "none"; if (s !== ic) s.style.transition = "transform .16s ease"; }); // .rung có animation đè transform nên tắt khi kéo
    ic.classList.add("keo-dang");
    const dat = () => {
      const dy = clientY - y0 + (cuon.scrollTop - s0);
      ic.style.transform = "translateY(" + dy + "px)";
      idx = Math.max(0, Math.min(sibs.length - 1, i0 + Math.round(dy / buoc)));
      sibs.forEach((s, i) => {
        if (s === ic) return;
        s.style.transform = i0 < idx && i > i0 && i <= idx ? "translateY(" + -buoc + "px)" : idx < i0 && i >= idx && i < i0 ? "translateY(" + buoc + "px)" : "";
      });
    };
    const vong = () => { // chạm mép trên/dưới thì tự cuộn, ô vẫn dính ngón tay
      const r = cuon.getBoundingClientRect();
      if (clientY < r.top + 70) cuon.scrollTop -= 8; else if (clientY > r.bottom - 70) cuon.scrollTop += 8;
      dat(); raf = requestAnimationFrame(vong);
    };
    raf = requestAnimationFrame(vong);
    const move = (ev) => { clientY = ev.clientY; dat(); };
    const xong = () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", xong); document.removeEventListener("pointercancel", xong);
      ic.style.transition = "transform .16s ease"; ic.style.transform = "translateY(" + (idx - i0) * buoc + "px)"; // trượt vào đúng chỗ rồi mới vẽ lại
      setTimeout(() => {
        const k = lst.dataset.k, ids = sibs.map((s) => s.dataset.id), mv = ids.splice(i0, 1)[0]; ids.splice(idx, 0, mv);
        KHO[k].ds = ids.concat(KHO[k].ds.filter((id) => KHO[k].an.includes(id))); luu("sci_kho_v1", KHO); ve();
      }, 170);
    };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", xong); document.addEventListener("pointercancel", xong);
  }
  document.addEventListener("pointerdown", (e) => {
    const keo = e.target.closest(".keo"); if (keo) return batDauKeo(e, keo.closest(".ic"));
    const ic = e.target.closest(".ic"); if (!ic || tt.sua || e.button > 0) return;
    giu = { x: e.clientX, y: e.clientY, t: setTimeout(() => { tt.sua = ic.dataset.k; vuaGiu = 1; setTimeout(() => (vuaGiu = 0), 800); giu = null; ve(); }, 450) };
  });
  document.addEventListener("pointermove", (e) => { if (giu && Math.hypot(e.clientX - giu.x, e.clientY - giu.y) > 8) { clearTimeout(giu.t); giu = null; } });
  ["pointerup", "pointercancel"].forEach((n) => document.addEventListener(n, () => { if (giu) { clearTimeout(giu.t); giu = null; } }));
  document.addEventListener("contextmenu", (e) => e.target.closest(".ic") && e.preventDefault());

  // Mở liên kết của chuông / thông báo NGAY TRONG APP, không văng ra trình duyệt (Mr. Đại chốt 29/10/2026).
  // Việc → thẻ việc trong «Việc của tôi» · phòng họp → tab Phòng họp đúng ngày. Trang app chưa có thì mới mở web.
  async function moLienKet(lk) {
    lk = String(lk || "");
    try { NA.lienKetCho(); } catch (e) { /* bản vỏ cũ chưa có cầu nối này */ }
    if (!S.dangNhap || !lk) return;
    ["man-chon", "man-ch", "man-cd", "man-tb", "man", "man-td", "man-chat"].forEach((i) => $(i).classList.remove("mo"));
    CHAT.mo = false;
    if ($("man-xem").classList.contains("mo")) dongXem();
    const mv = /^\/cong-viec\/([^/?#]+)/.exec(lk) || /^\/so-do\?(?:[^#]*&)?viec=([^&#]+)/.exec(lk);
    if (mv) {
      let ma = mv[1];
      try { ma = decodeURIComponent(ma); } catch (e) { /* «%» hỏng: giữ nguyên chữ */ }
      if (!CACHE.toi) await taiToi();
      const KHOA = { nhan: "viec_nhan", phoi: "viec_phoi_hop", giao: "viec_giao" };
      const vai = Object.keys(KHOA).find((k) => ((CACHE.toi && CACHE.toi[KHOA[k]]) || []).some((x) => x.ma_viec_base === ma));
      if (!vai) {
        // Việc không nằm trong 3 ngăn «của tôi» (chuông báo việc của đơn vị / dự án mình theo dõi): mở trong Phòng ban hoặc Dự án
        try { if (!CACHE.sd) await taiSoDo(); } catch (e) { /* hiện thông báo bên dưới */ }
        const sd = CACHE.sd, hang = sd && (sd.viec.find((x) => x.ma === ma) || (sd.xong || []).find((x) => x.ma === ma));
        const thay = () => [...document.querySelectorAll(".viec[data-ma]")].find((x) => x.dataset.ma === ma);
        if (hang) {
          const dangMo = sd.viec.includes(hang);
          const noi = [];
          const dv = (hang.dv || []).find((u) => sd.o.some((x) => x.id === u));
          if (dv) noi.push({ tab: "pb", dv: dv, khoa: "pb:" + dv });
          if (hang.daId && sd.ds.some((x) => x.id === hang.daId)) noi.push({ tab: "da", da: hang.daId, khoa: "da:" + hang.daId });
          for (const n of noi) {
            // tắt lọc «chỉ quá hạn» (!) và «Đường găng»: đang bật thì việc chưa quá hạn / không găng bị ẩn → báo nhầm «không mở được»
            tt.sua = null; tt.tab = n.tab; tt.dv = n.dv || null; tt.da = n.da || null; tt.mo = null; if (tt.qh) { tt.qh = false; luu("sci_qh", 0); } tt.loc = "tat-ca"; TIM.q = ""; TIM.loai = ""; TIM.mo = false; $("tim-q").value = "";
            if (!dangMo) MO_XONG.add(n.khoa);
            ve(); napTab();
            if (thay()) { moThe(ma, thay().dataset.nhom); setTimeout(() => { const e = thay(); if (e) e.scrollIntoView({ block: "start" }); }, 150); return; }
          }
        }
        const tenV = String((dongSoCai(ma) || {}).ten || "").slice(0, 50);
        toast("Không mở được việc " + ma + (tenV ? " «" + tenV + "»" : "") + " trong app — có thể bạn không theo dõi đơn vị / dự án chứa việc này");
        return;
      }
      tt.sua = null; tt.tab = "toi"; tt.vai = vai; tt.mo = null; if (tt.qh) { tt.qh = false; luu("sci_qh", 0); } TIM.q = ""; TIM.loai = ""; TIM.mo = false; $("tim-q").value = "";
      ve(); napTab(); moThe(ma);
      setTimeout(() => { const e = [...document.querySelectorAll(".viec[data-ma]")].find((x) => x.dataset.ma === ma); if (e) e.scrollIntoView({ block: "start" }); }, 150);
      return;
    }
    const mp = /^\/phong-hop(?:\?(?:[^#]*&)?ngay=(\d{4}-\d{2}-\d{2}))?/.exec(lk);
    if (mp) {
      let d = 0;
      if (mp[1]) d = Math.max(0, Math.min(6, Math.round((new Date(mp[1] + "T00:00:00Z") - new Date(homNay() + "T00:00:00Z")) / 864e5)));
      tt.sua = null; tt.tab = "ph"; tt.d = d; tt.mo = null; ve(); napTab(); taiPhong();
      return;
    }
    if (/^\/viec-cua-toi/.test(lk)) { tt.sua = null; tt.tab = "toi"; tt.mo = null; ve(); napTab(); return; }
    NA.moWebTuongDoi(lk); // trang app chưa có (Sơ đồ tổ chức, báo cáo tuần…) → mới mở web
  }
  window.moLienKet = moLienKet;

  // ---------- TRỢ LÝ MAIN (bản 3004 — Mr. Đại duyệt 01/11/2026: câu 2A gọi thẳng Main 3010, câu 4A phạm vi bản đầu) ----------
  // Cùng bộ não với khung chat web và bot Telegram của Main (runChatAgent + chat-store). Hợp đồng: main-3010/src/lib/ai/chat-types.ts.
  // Bản đầu: hỏi–đáp · danh sách phiên · ✅ Làm / ❌ Bỏ. CHƯA có: xuất file, kẹp tệp 📎, tìm web 🌐, chọn model, duyệt kế hoạch tạo file.
  function mainApi(method, path, body) {
    return new Promise((ok) => {
      const id = ++seq;
      cbs[id] = (ma, txt) => {
        let j = null;
        try { j = JSON.parse(txt); } catch (e) { /* không phải JSON */ }
        ok({ ma, j, txt, path });
      };
      NA.mainApi(id, method, path, body ? JSON.stringify(body) : "");
    });
  }
  const loiMain = (r) => (r.j && (r.j.message || r.j.loi)) || (r.ma === 0 ? "Không kết nối được Main" : r.ma === 403 ? "Tài khoản Main này không được dùng trợ lý" : "Main trả lỗi " + r.ma + " [" + (r.path || "") + "]");
  const mainTT = () => { try { return JSON.parse(NA.mainTrangThai()); } catch (e) { return { dangNhap: false, server: "", email: "", coMk3004: false }; } };
  const emailMain = () => ((CHAT.dn && CHAT.dn.email) || S.email || "").toLowerCase();
  // Phiên nhớ THEO DỰ ÁN: mỗi dự án một phiên đang mở (phiên của Main gắn với dự án)
  const khoaPhien = () => "sci_chat_phien:" + emailMain() + ":" + (CHAT.da || "");
  const khoaDa = () => "sci_chat_da:" + emailMain(); // dự án chọn lần trước — nhớ theo email (Mr. Đại chốt 01/11)
  // Mọi cuộc gọi chat gửi kèm ?project= như web (ChatPanel.tsx projectQuery) — thiếu thì Main rơi về dự án đầu danh sách (AP-01)
  const pq = (duong) => !CHAT.da ? duong : duong + (duong.indexOf("?") < 0 ? "?" : "&") + "project=" + encodeURIComponent(CHAT.da);
  const tenDa = (id) => { const p = Array.isArray(CHAT.dsDa) && CHAT.dsDa.find((x) => x.id === id); return p ? p.name || p.id : ""; };
  const gioVN = (iso) => { try { return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }); } catch (e) { return ""; } };

  // Markdown gọn của trợ lý: **đậm**, `mã`, [chữ](đường), tiêu đề #, gạch đầu dòng, bảng |…|. Thoát HTML TRƯỚC rồi mới gắn thẻ.
  function mdNoi(s) {
    return s.replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, chu, lk) => '<a data-lk-main="' + lk + '">' + chu + "</a>");
  }
  function md(s) {
    let out = "", bang = null;
    const xongBang = () => {
      if (!bang) return;
      out += '<div class="bang"><table>' + bang.map((h, i) => "<tr>" + h.map((c) => (i === 0 ? "<th>" : "<td>") + mdNoi(esc(c)) + (i === 0 ? "</th>" : "</td>")).join("") + "</tr>").join("") + "</table></div>";
      bang = null;
    };
    for (const d of String(s || "").replace(/\r/g, "").split("\n")) {
      const t = d.trim();
      if (/^\|.*\|$/.test(t)) {
        if (!/^\|[\s:|-]+\|$/.test(t)) (bang = bang || []).push(t.slice(1, -1).split("|").map((c) => c.trim())); // dòng |---| là vạch kẻ, bỏ
        continue;
      }
      xongBang();
      if (!t) continue;
      const h = /^#{1,6}\s+(.*)$/.exec(t);
      if (h) { out += "<h4>" + mdNoi(esc(h[1])) + "</h4>"; continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { out += '<hr style="border:0;border-top:1px solid var(--vien)">'; continue; }
      const li = /^[-*•]\s+(.*)$/.exec(t);
      out += "<p>" + (li ? "• " + mdNoi(esc(li[1])) : mdNoi(esc(t))) + "</p>";
    }
    xongBang();
    return out;
  }

  function tinHtml(m) {
    if (m.role === "user") return '<div class="ct-tin nguoi"><div class="ct-nd">' + esc(m.content) + '</div><div class="ct-gio">' + esc(gioVN(m.at)) + "</div></div>";
    const chip = (m.actions || []).filter((a) => a && a.summary).map((a) => '<span class="ct-chip ' + (a.ok ? "" : "hong") + '">' + (a.ok ? "✓ " : "✗ ") + esc(a.summary) + "</span>").join("");
    return '<div class="ct-tin"><div class="dau-ai"><span class="ai">AI</span><b>Trợ lý</b> · ' + esc(gioVN(m.at)) + (tenDa(CHAT.da) ? " · dự án " + esc(tenDa(CHAT.da)) : "") + '</div><div class="ct-nd">' + md(m.content) + "</div>" + chip + "</div>";
  }
  const choHtml = (v) => '<div class="ct-cho"><b>Trợ lý xin làm:</b> ' + esc(v.moTa || v.name || "") + '<div class="hai-nut"><button class="chinh" data-cho="lam|' + esc(v.id) + '">✅ Làm</button><button data-cho="bo|' + esc(v.id) + '">❌ Bỏ</button></div></div>';
  const chuDoi = () => "Đang trả lời… " + Math.round((Date.now() - CHAT.batDau) / 1000) + " giây (câu cần hỏi nhiều agent có thể mất vài phút)";

  function dnHtml() {
    const d = CHAT.dn || {};
    return '<div class="ct-dn"><p>Trợ lý AI của agent Main chạy ở máy chủ riêng (cổng 3010) và dùng tài khoản Main. Chỉ phải đăng nhập một lần trên máy này.</p>'
      + '<label for="cdn-s">Địa chỉ Main</label><input id="cdn-s" type="url" spellcheck="false" autocapitalize="off" placeholder="Gõ địa chỉ, ví dụ http://192.168.1.10:3010" value="' + esc(d.server || "") + '">' + '<small style="display:block;color:var(--phu);margin-top:3px">Cổng của Main (thường 3010), KHÁC cổng SCI Công việc 3004</small>'
      + '<label for="cdn-e">Email</label><input id="cdn-e" type="email" autocomplete="username" value="' + esc(d.email || S.email || "") + '">'
      + '<label for="cdn-m">Mật khẩu Main</label><input id="cdn-m" type="password" autocomplete="current-password" placeholder="' + (d.coMk3004 ? "Để trống = dùng mật khẩu SCI Công việc" : "") + '">'
      + '<button class="nut-dn" id="cdn-b">Đăng nhập trợ lý</button>'
      + (CHAT.loi ? '<div class="ct-loi">' + esc(CHAT.loi) + "</div>" : "") + "</div>";
  }
  function dsHtml() {
    const ds = CHAT.ds;
    const than = !ds ? '<div class="ct-trong">Đang tải danh sách phiên…</div>'
      : ds.loi ? '<div class="ct-loi">' + esc(ds.loi) + "</div>"
      : !ds.length ? '<div class="ct-trong">Chưa có phiên nào. Gửi câu hỏi đầu tiên để tạo phiên.</div>'
      : ds.map((p) => '<button class="ct-phien ' + (p.id === CHAT.phien ? "dang" : "") + '" data-phien="' + esc(p.id) + '">' + esc(p.title || "Phiên mới") + "<small>" + esc(gioVN(p.updatedAt)) + " · " + (p.messageCount || 0) + " tin</small></button>").join("");
    return than + '<div class="ct-trong"><small>Đang dùng trợ lý Main ở ' + esc((CHAT.dn && CHAT.dn.server) || "") + " · " + esc((CHAT.dn && CHAT.dn.email) || "") + '</small><br><br><button class="nut" data-chat-thoat="1">Đăng nhập lại trợ lý Main</button></div>';
  }

  // ---- ô chọn dự án (demo «demo-apk-tro-ly-chon-du-an.html», Mr. Đại duyệt 01/11/2026) ----
  // Danh sách: GET /api/projects của Main (đã lọc theo quyền người này). Bấm một dự án = áp dụng + đóng (bớt cú bấm).
  async function taiDa() {
    CHAT.dsDa = null; veDa();
    const r = await mainApi("GET", "/api/projects");
    if (r.ma === 401) { canDangNhapMain(); return; }
    const ds = r.ma === 200 && r.j && Array.isArray(r.j.projects) ? r.j.projects.filter((p) => p && p.id) : null;
    // 404 = máy ở địa chỉ này không có danh sách dự án → không phải Main (vd gõ nhầm cổng 3004 vào ô Main — anh Đại gặp 01/11/2026)
    if (!ds) { CHAT.dsDa = r.ma === 404 ? { loi: "Main trả lỗi 404", saiMay: true } : { loi: loiMain(r) }; veChat(); return; }
    CHAT.dsDa = ds.map((p) => ({ id: String(p.id), name: String(p.name || p.id) }));
    const cu = doc(khoaDa(), "");
    // dự án nhớ lần trước còn quyền thì giữ; chỉ có MỘT dự án thì chọn luôn; còn lại chờ người dùng chọn (không tự đoán)
    const da = CHAT.dsDa.some((p) => p.id === cu) ? cu : CHAT.dsDa.length === 1 ? CHAT.dsDa[0].id : "";
    if (da !== CHAT.da) { CHAT.tok++; CHAT.da = da; CHAT.phien = null; CHAT.ten = ""; CHAT.tin = []; CHAT.cho = []; CHAT.ds = null; }
    if (da) luu(khoaDa(), da);
    if (CHAT.da && !CHAT.phien && !CHAT.tin.length && !CHAT.gui) { const ph = doc(khoaPhien(), ""); if (ph) { moPhien(ph); return; } }
    veChat();
  }
  function veDa() {
    const el = $("chat-da");
    const coDn = !!(CHAT.dn && CHAT.dn.dangNhap);
    el.style.display = coDn && !CHAT.xemDs ? "" : "none";
    const moDs = CHAT.moDa && Array.isArray(CHAT.dsDa) && CHAT.dsDa.length > 1;
    el.classList.toggle("mo", moDs);
    $("man-chat").classList.toggle("co-ds-da", moDs);
    if (!coDn || CHAT.xemDs) return;
    const ds = CHAT.dsDa;
    const ten = !ds ? '<span class="ten trong">Đang tải danh sách dự án…</span>'
      : ds.loi ? '<span class="ten loi">Chưa chọn được dự án</span>'
      : !ds.length ? '<span class="ten loi">Tài khoản Main này chưa được vào dự án nào</span>'
      : CHAT.da ? '<span class="ten">' + esc(tenDa(CHAT.da)) + "</span>"
      : '<span class="ten trong">Chọn dự án để hỏi</span>';
    const mui = Array.isArray(ds) && ds.length === 1 ? "" : '<span class="mui">▾</span>'; // một dự án: không xổ
    let h = '<div class="nhan">Hỏi về dự án</div><button class="nut-da" data-da-mo="1">' + ten + mui + "</button>";
    if (moDs) {
      const q = CHAT.timDa.trim().toLowerCase();
      const loc = q ? ds.filter((p) => p.name.toLowerCase().includes(q)) : ds;
      h += '<div class="ds-da">'
        + (ds.length >= 20 ? '<input class="tim-da" id="tim-da" type="search" placeholder="Tìm dự án…" value="' + esc(CHAT.timDa) + '">' : "") // ≥20 mục có ô tìm
        + (loc.length ? loc.map((p) => '<button class="' + (p.id === CHAT.da ? "dang" : "") + '" data-da="' + esc(p.id) + '"><span class="dau-chon">' + (p.id === CHAT.da ? "✓" : "") + "</span>" + esc(p.name) + (p.id === CHAT.da ? "<small>đang chọn</small>" : "") + "</button>").join("")
          : '<div class="trong-da">Không có dự án khớp</div>')
        + "</div>";
    }
    el.innerHTML = h;
  }
  function chonDa(id) {
    CHAT.moDa = false; CHAT.timDa = "";
    if (id === CHAT.da) { veChat(); return; }
    CHAT.da = id; luu(khoaDa(), id);
    phienMoi(); // đổi dự án = chat mới của dự án đó; phiên cũ vẫn nằm trong «Phiên cũ» của dự án cũ
  }

  function veChat() {
    const el = $("chat-than");
    const coDn = !!(CHAT.dn && CHAT.dn.dangNhap);
    veDa();
    const chuaChonDa = coDn && !CHAT.da;
    $("chat-o").disabled = chuaChonDa; // chưa chọn dự án thì chưa gửi được — hiện mờ, không ẩn (luật 17)
    $("chat-o").placeholder = chuaChonDa ? "Chọn dự án trước…" : "Nhắn cho trợ lý Main…";
    $("chat-ten").textContent = !coDn ? "Trợ lý Main" : CHAT.xemDs ? "Phiên cũ" : CHAT.ten || "Trợ lý Main";
    $("chat-viet").style.display = coDn && !CHAT.xemDs ? "" : "none";
    $("chat-ds-nut").style.display = coDn && !CHAT.xemDs ? "" : "none";
    $("chat-moi").style.display = coDn ? "" : "none";
    $("chat-gui").disabled = CHAT.gui || chuaChonDa;
    if (!coDn && CHAT.tuDn) { el.innerHTML = '<div class="ct-trong">Đang vào trợ lý Main bằng tài khoản SCI Công việc…</div>'; return; }
    if (!coDn) { el.innerHTML = dnHtml(); return; }
    if (CHAT.xemDs) { el.innerHTML = dsHtml(); el.scrollTop = 0; return; }
    let h = "";
    if (chuaChonDa) {
      const d = CHAT.dsDa;
      h += d && d.saiMay ? '<div class="ct-loi">Địa chỉ ' + esc((CHAT.dn && CHAT.dn.server) || "") + ' không phải máy Main (máy này không có danh sách dự án). Bấm nút dưới để thoát rồi nhập đúng địa chỉ Main — thường là cổng 3010, khác cổng SCI Công việc 3004.</div><div class="ct-trong"><button class="nut" data-chat-thoat="1">Đăng nhập lại trợ lý Main</button></div>'
        : d && d.loi ? '<div class="ct-loi">Không tải được danh sách dự án từ Main (' + esc(d.loi) + '). Bấm ô trên để thử lại. Chưa chọn dự án thì chưa gửi câu hỏi được, để trợ lý không trả lời nhầm dự án.</div>'
        : Array.isArray(d) && !d.length ? '<div class="ct-loi">Tài khoản Main này chưa được vào dự án nào nên chưa hỏi trợ lý được. Nhờ quản trị thêm anh/chị vào dự án ở Main.</div>'
        : Array.isArray(d) ? '<div class="ct-trong">Chọn dự án ở ô trên để bắt đầu hỏi.<br><small>Trợ lý trả lời và làm việc theo đúng dự án anh/chị chọn.</small></div>' : "";
    }
    else if (CHAT.tai) h += '<div class="ct-trong">Đang tải phiên…</div>';
    else if (!CHAT.tin.length && !CHAT.gui) h += '<div class="ct-trong"><b>Hỏi về ' + esc(tenDa(CHAT.da)) + '</b><br>Mọi câu hỏi và nút ✅ Làm sẽ chạy trên dự án này. «Phiên cũ» chỉ liệt kê phiên của dự án này.<br><small>Việc nào trợ lý cần GHI dữ liệu sẽ hiện nút ✅ Làm / ❌ Bỏ để anh/chị duyệt.</small></div>';
    h += CHAT.tin.map(tinHtml).join("");
    if (CHAT.gui) h += '<div class="ct-tin"><div class="dau-ai"><span class="ai">AI</span><b>Trợ lý</b></div><div class="ct-doi" id="chat-dem">' + esc(chuDoi()) + "</div></div>";
    h += CHAT.cho.map(choHtml).join("");
    if (CHAT.loi) h += '<div class="ct-loi">' + esc(CHAT.loi) + "</div>";
    el.innerHTML = h;
    el.scrollTop = el.scrollHeight;
  }

  // Đăng nhập MỘT lần (Mr. Đại chốt 01/11/2026): vào trợ lý Main bằng chính tài khoản SCI Công việc, không hỏi lại.
  // Ô đăng nhập Main chỉ hiện khi tự vào không được (Main khác máy, mật khẩu Main khác…).
  function tuDnMain(imLang) {
    if (CHAT.tuDn || !NA.mainTuDangNhap) return;
    CHAT.tuDn = true;
    if (!imLang) veChat();
    const id = ++seq;
    cbs[id] = (ma, txt) => {
      let j = {};
      try { j = JSON.parse(txt); } catch (e) { /* bỏ */ }
      CHAT.tuDn = false; CHAT.daThuTuDn = true;
      CHAT.dn = mainTT();
      if (ma === 200) { CHAT.loi = ""; CHAT.da = ""; CHAT.dsDa = null; if (CHAT.mo) taiDa(); }
      else { CHAT.loi = "Chưa tự vào được trợ lý Main bằng tài khoản SCI Công việc: " + (j.loi || "lỗi " + ma); if (CHAT.mo) veChat(); }
    };
    NA.mainTuDangNhap(id);
  }
  window.tuDnMain = tuDnMain;

  function moChat() {
    CHAT.mo = true;
    CHAT.dn = mainTT();
    $("man-chat").classList.add("mo");
    if (!CHAT.dn.dangNhap && !CHAT.daThuTuDn) { tuDnMain(); return; }
    if (CHAT.dn.dangNhap && (!Array.isArray(CHAT.dsDa) || !CHAT.da)) { taiDa(); return; } // mỗi lần mở mà chưa có dự án: tải danh sách (cũng là «thử lại» khi lỗi)
    if (CHAT.dn.dangNhap && !CHAT.phien && !CHAT.tin.length && !CHAT.gui) {
      const cu = doc(khoaPhien(), "");
      if (cu) { moPhien(cu); return; }
    }
    veChat();
  }
  function dongChat() { CHAT.mo = false; CHAT.xemDs = false; CHAT.moDa = false; CHAT.timDa = ""; $("man-chat").classList.remove("mo"); $("chat-o").blur(); }
  function canDangNhapMain(loi) {
    CHAT.gui = false; CHAT.tai = false; CHAT.xemDs = false;
    CHAT.dn = mainTT();
    CHAT.loi = loi || (CHAT.dn.dangNhap ? "" : "Cần đăng nhập trợ lý Main (phiên hết hạn hoặc mật khẩu Main đã đổi)");
    veChat();
  }
  function phienMoi() {
    CHAT.tok++; CHAT.phien = null; CHAT.ten = ""; CHAT.tin = []; CHAT.cho = []; CHAT.gui = false; CHAT.loi = ""; CHAT.xemDs = false; CHAT.tai = false;
    luu(khoaPhien(), "");
    veChat();
    $("chat-o").focus();
  }
  async function moPhien(id) {
    const tok = ++CHAT.tok;
    CHAT.xemDs = false; CHAT.phien = id; CHAT.ten = ""; CHAT.tin = []; CHAT.cho = []; CHAT.loi = ""; CHAT.gui = false; CHAT.tai = true;
    veChat();
    const r = await mainApi("GET", pq("/api/ai/chat/messages?id=" + encodeURIComponent(id)));
    if (tok !== CHAT.tok) return;
    CHAT.tai = false;
    if (r.ma === 401) { canDangNhapMain(); return; }
    if (r.ma === 404) { CHAT.phien = null; luu(khoaPhien(), ""); veChat(); return; } // phiên đã xoá ở web: về phiên mới
    if (r.ma !== 200 || !r.j || !r.j.session) { CHAT.loi = loiMain(r); veChat(); return; }
    CHAT.tin = r.j.session.messages || [];
    CHAT.ten = r.j.session.title || "";
    CHAT.cho = r.j.choDuyet || [];
    luu(khoaPhien(), id);
    veChat();
  }
  async function moDsPhien() {
    CHAT.xemDs = true; CHAT.ds = null; veChat();
    const r = await mainApi("GET", pq("/api/ai/chat/sessions"));
    if (r.ma === 401) { canDangNhapMain(); return; }
    CHAT.ds = r.ma === 200 && r.j && Array.isArray(r.j.sessions) ? r.j.sessions : { loi: loiMain(r) };
    if (CHAT.xemDs) veChat();
  }
  async function guiChat() {
    const o = $("chat-o"), cau = o.value.trim();
    if (!cau || CHAT.gui) return;
    if (!CHAT.da) { toast("Chọn dự án trước khi hỏi"); return; }
    if (cau.length > 4000) { toast("Câu hỏi quá dài (tối đa 4.000 ký tự)"); return; }
    o.value = ""; tuCao();
    const tok = CHAT.tok;
    CHAT.tin.push({ role: "user", content: cau, at: new Date().toISOString() });
    CHAT.gui = true; CHAT.batDau = Date.now(); CHAT.loi = "";
    veChat();
    clearInterval(CHAT.dem);
    CHAT.dem = setInterval(() => { const e = $("chat-dem"); if (e && CHAT.gui) e.textContent = chuDoi(); else clearInterval(CHAT.dem); }, 1000);
    const r = await mainApi("POST", pq("/api/ai/chat"), { sessionId: CHAT.phien || "", message: cau });
    if (tok !== CHAT.tok) return; // đã đổi phiên trong lúc chờ: Main vẫn lưu câu trả lời vào phiên cũ
    CHAT.gui = false; clearInterval(CHAT.dem);
    if (r.ma === 401) { canDangNhapMain(); return; }
    if (r.ma !== 200 || !r.j || !r.j.ok) {
      CHAT.loi = "Chưa nhận được trả lời: " + loiMain(r) + (r.ma === 0 ? ". Nếu Main vẫn đang xử lý, câu trả lời sẽ có trong phiên — bấm «Phiên cũ» để mở lại sau ít phút." : "");
      if (!o.value) { o.value = cau; tuCao(); } // trả lại câu hỏi vào ô để gửi lại
      veChat();
      return;
    }
    const s = r.j.session || {};
    if (s.id) { CHAT.phien = s.id; luu(khoaPhien(), s.id); }
    if (s.title) CHAT.ten = s.title;
    CHAT.tin.push({ role: "assistant", content: r.j.reply || "", at: new Date().toISOString(), actions: r.j.actions || [] });
    if (r.j.keHoachChoDuyet) CHAT.tin.push({ role: "assistant", content: "ⓘ App chưa có nút «Duyệt & tạo file» — mở khung chat web của Main để duyệt kế hoạch tạo file này.", at: new Date().toISOString() });
    CHAT.cho = Array.isArray(r.j.choDuyet) ? r.j.choDuyet : CHAT.cho;
    CHAT.ds = null;
    veChat();
  }
  async function xacNhan(nut) {
    const [hd, id] = nut.dataset.cho.split("|");
    nut.closest(".ct-cho").querySelectorAll("button").forEach((b) => (b.disabled = true));
    const r = await mainApi("POST", "/api/ai/chat/xac-nhan", { id: id, hanhDong: hd });
    if (r.ma === 401) { canDangNhapMain(); return; }
    if (r.ma === 0) {
      // Mất mạng / quá giờ chờ: KHÔNG biết Main đã chạy lệnh chưa → giữ nguyên thẻ chờ duyệt, báo rõ (kiểm độc lập AP-02)
      CHAT.loi = "Chưa rõ lệnh đã chạy hay chưa (" + loiMain(r) + "). Mở «Phiên cũ» → phiên này để kiểm trước khi bấm lại.";
      veChat();
      return;
    }
    const j = r.j || {};
    if (j.cau) CHAT.tin.push({ role: "assistant", content: j.cau, at: new Date().toISOString(), actions: j.action ? [j.action] : [] });
    else if (r.ma !== 200) CHAT.loi = loiMain(r);
    CHAT.cho = r.ma === 200 && Array.isArray(j.choDuyet) ? j.choDuyet : CHAT.cho.filter((v) => v.id !== id);
    veChat();
  }
  function tuCao() { const o = $("chat-o"); o.style.height = "auto"; o.style.height = Math.min(140, o.scrollHeight) + "px"; }

  $("chat-lui").addEventListener("click", () => { if (CHAT.xemDs) { CHAT.xemDs = false; veChat(); } else dongChat(); });
  $("chat-ds-nut").addEventListener("click", moDsPhien);
  $("chat-moi").addEventListener("click", phienMoi);
  $("chat-gui").addEventListener("click", guiChat);
  $("chat-o").addEventListener("input", tuCao);
  $("chat-o").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); guiChat(); } });
  $("chat-da").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.da) { chonDa(t.dataset.da); return; }
    if (t.dataset.daMo) {
      if (!Array.isArray(CHAT.dsDa) || !CHAT.dsDa.length) { taiDa(); return; } // lỗi / chưa có: bấm ô = thử tải lại
      if (CHAT.dsDa.length === 1) return; // một dự án: không có gì để chọn
      CHAT.moDa = !CHAT.moDa; CHAT.timDa = ""; veDa();
      const o = $("tim-da"); if (o) o.focus();
    }
  });
  $("chat-da").addEventListener("input", (e) => {
    if (e.target.id !== "tim-da") return;
    CHAT.timDa = e.target.value; veDa();
    const o = $("tim-da"); if (o) { o.focus(); o.setSelectionRange(o.value.length, o.value.length); }
  });
  $("chat-viet").addEventListener("click", () => { if (CHAT.moDa) { CHAT.moDa = false; CHAT.timDa = ""; veDa(); } });
  $("chat-than").addEventListener("click", (e) => {
    const t = e.target.closest("button, a, .ct-chip");
    if (CHAT.moDa) { CHAT.moDa = false; CHAT.timDa = ""; veDa(); return; } // chạm ra ngoài danh sách dự án: chỉ đóng, không bấm nhầm nút bên dưới
    if (!t) return;
    if (t.id === "cdn-b") {
      t.disabled = true;
      CHAT.dn = Object.assign({}, CHAT.dn, { server: $("cdn-s").value.trim(), email: $("cdn-e").value.trim() });
      const id = ++seq;
      cbs[id] = (ma, txt) => {
        let j = {};
        try { j = JSON.parse(txt); } catch (er) { /* bỏ */ }
        if (ma === 200) { CHAT.loi = ""; CHAT.dn = mainTT(); CHAT.da = ""; CHAT.dsDa = null; phienMoi(); taiDa(); }
        else { CHAT.loi = j.loi || "Đăng nhập trợ lý Main không được"; veChat(); }
      };
      NA.mainDangNhap(id, CHAT.dn.server, CHAT.dn.email, $("cdn-m").value);
    }
    else if (t.dataset.phien) moPhien(t.dataset.phien);
    else if (t.dataset.cho) xacNhan(t);
    else if (t.dataset.chatThoat) { NA.mainThoat(); CHAT.tok++; CHAT.phien = null; CHAT.tin = []; CHAT.cho = []; CHAT.ds = null; CHAT.xemDs = false; CHAT.loi = ""; CHAT.da = ""; CHAT.dsDa = null; CHAT.moDa = false; CHAT.dn = mainTT(); CHAT.daThuTuDn = false; tuDnMain(); } // «Đăng nhập lại» = bỏ phiên cũ rồi tự vào lại bằng tài khoản SCI Công việc
    else if (t.dataset.lkMain) {
      // Đường trong câu trả lời là trang WEB của Main (vd /alerts) → mở bằng trình duyệt; app chưa có màn đó
      const lk = t.dataset.lkMain;
      if (/^https?:\/\//i.test(lk)) NA.moWeb(lk);
      else if (lk.startsWith("/") && !lk.startsWith("//") && CHAT.dn && CHAT.dn.server) NA.moWeb(CHAT.dn.server.replace(/\/+$/, "") + lk);
    }
    else if (t.classList.contains("ct-chip")) t.style.whiteSpace = t.style.whiteSpace === "normal" ? "" : "normal"; // chạm chip: xem đủ chữ
  });

  // nút Back của Android: đóng lớp trên cùng trước
  window.__quayLai = () => {
    if (TIM.mo && tt.tab !== "ph") { ketThucTim(); return true; } // Back khi đang tìm: đóng ô tìm, menu đáy hiện lại
    if ($("man-td").classList.contains("mo")) { if ($("td-pop").style.display === "block") $("td-pop").style.display = "none"; else tdDong_(); return true; }
    if ($("man-chon").classList.contains("mo")) { dongChon(); return true; }
    if ($("man").classList.contains("mo")) { dong(); return true; }
    if ($("man-xem").classList.contains("mo")) { dongXem(); return true; }
    if ($("man-chat").classList.contains("mo") && CHAT.moDa) { CHAT.moDa = false; CHAT.timDa = ""; veDa(); return true; }
    if ($("man-chat").classList.contains("mo")) { if (CHAT.xemDs) { CHAT.xemDs = false; veChat(); } else dongChat(); return true; }
    if ($("man-ch").classList.contains("mo")) { $("man-ch").classList.remove("mo"); return true; }
    if ($("man-cd").classList.contains("mo")) { $("man-cd").classList.remove("mo"); return true; }
    if ($("man-tb").classList.contains("mo")) { $("man-tb").classList.remove("mo"); return true; }
    if (tt.sua) { tt.sua = null; ve(); return true; }
    if (tt.tab === "pb" && tt.dv) { const d = CACHE.sd && CACHE.sd.o.find((x) => x.id === tt.dv); tt.dv = d && d.cha && d.cha !== CACHE.sd.goc ? d.cha : null; ve(); return true; }
    if (tt.tab === "da" && tt.da) { tt.da = null; ve(); return true; }
    // Ở menu ngoài cùng của Phòng ban / Dự án / Phòng họp: Back (phím hoặc vuốt mép) về «Việc của tôi»; Back lần nữa mới thoát app (Mr. Đại 01/11/2026)
    if (tt.tab !== "toi") { tt.sua = null; tt.tab = "toi"; tt.mo = null; ve(); napTab(); $("than").scrollTop = 0; return true; }
    return false;
  };
  window.__hienLai = () => { docTrangThai(); veChuong(); veHop(); if (S.dangNhap) napTab(); };

  // ---------- khởi động ----------
  tt.qh = doc("sci_qh", 0) === 1;
  docTrangThai();
  if (!S.dangNhap) hienDangNhap(""); else { ve(); napTab(); }
  try { const lkCho = NA.lienKetCho(); if (lkCho && S.dangNhap) moLienKet(lkCho); } catch (e) { /* vỏ cũ */ } // bấm thông báo lúc app chưa mở
  veChuong(); veHop();
  setInterval(() => { docTrangThai(); veChuong(); veHop(); }, 15000);
})();

// ============================================================
// scripts/chuyen-len-main.mjs — BỘ CHUYỂN NGƯỜI + TỔ CHỨC từ agent Công việc lên Main (LOI-DUNG-CHUNG 6g.6 Đợt 2, 03/10/2026).
//
// Chạy thử (KHÔNG ghi gì, in bảng số):
//   node scripts/chuyen-len-main.mjs --nguon <thư mục CSDL>            [--main ../../4-agent-main/data] [--chi-tiet]
// Chạy thật (Mr. Đại tự chạy):
//   node scripts/chuyen-len-main.mjs --nguon data/pgdata --ghi
//   → phải DỪNG agent Công việc (cổng 3004) trước khi đọc data/pgdata — bộ chuyển tự kiểm, cổng còn trả lời thì từ chối.
//
// Ghi ở Main (sao lưu trước vào <main>/_truoc-6g6-dot2-<giờ>/):
//   users.json            52 người: mã giữ nguyên (A1) · mật khẩu băm scrypt có tiền tố (A2) · đơn vị chính + chức vụ (A9)
//                         loại tài khoản T3: quantri = Admin · dainc = PM · còn lại = Người dùng · bỏ 4 tài khoản mẫu (T1)
//   to-chuc.json          cây đơn vị (chức năng nhiệm vụ, trưởng chính) · kiêm nhiệm · uy_quyen_ky rỗng (A12)
//   bi-danh-tai-khoan.json dai@sci.vn → dainc (gộp, T2) · admin@sci.vn → quantri (chuyển chủ tài khoản mẫu)
//   projects.json         Giám đốc dự án dai@sci.vn → dainc (đổi chủ, T2) · ⭐ bước E: Ban QLDA · đơn vị làm · Ban điều hành
//                         chép từ Cài đặt › Sơ đồ tổ chức dự án (ghép theo mã ngắn; dự án Main ĐÃ có thì giữ bản Main)
//   users.json            ⭐ 6g.6.13: vaiCongViec = bản chép vai trò (lanh-dao · truong-don-vi …) để Main tính loại theo sơ đồ
//   telegram-tro-ly/phien.json  phiên bot của dai@sci.vn → dainc
// GIỮ NGUYÊN (A11): phiên chat, người tạo dự án, nhật ký, lịch sử đứng tên email cũ — bí danh hiện đúng tên.
// Chạy lại được: người đã có ở Main (không phải tài khoản mẫu) GIỮ mật khẩu, Telegram, loại tài khoản, dự án được vào của Main;
//   tên + tổ chức lấy theo agent Công việc (nơi còn sửa tổ chức tới hết Đợt 3).
// Bộ chuyển KHÔNG đẩy sang các agent — xong thì bấm "Kéo lại từ Main" ở từng agent (hoặc Main tự đẩy ở lần ghi người kế tiếp).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TAI_KHOAN_MAU = ["dai@sci.vn", "admin@sci.vn", "nguoidung@sci.vn", "xem@sci.vn"];
export const EMAIL_ADMIN = "quantri@scigroup.vn";
export const EMAIL_PM = "dainc@scigroup.vn";
export const BI_DANH = [
  { email_cu: "dai@sci.vn", email_moi: EMAIL_PM, cach: "gop", ly_do: "Cùng là Mr. Đại (6g.6.5 T2)" },
  { email_cu: "admin@sci.vn", email_moi: EMAIL_ADMIN, cach: "chuyen_chu", ly_do: "Tài khoản mẫu — thứ đứng tên chuyển cho tài khoản quản trị (Mr. Đại chốt 03/10)" },
];

const thuong = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
const iso = (v) => (v instanceof Date ? v.toISOString() : typeof v === "string" && v ? new Date(v).toISOString() : new Date(0).toISOString());
const laBam = (h, s) => typeof h === "string" && /^[0-9a-f]{64}$/i.test(h) && typeof s === "string" && s.trim() !== "";

/**
 * HÀM THUẦN — dựng bản Main từ dữ liệu agent Công việc.
 * @param nguon { nguoi: hàng identity.nguoi_dung[], donVi: hàng identity.don_vi[], kiemNhiem: hàng identity.kiem_nhiem[],
 *                vai?: hàng identity.gan_vai_tro[], duAn?: cấu hình "du_an" (Cài đặt › Sơ đồ tổ chức dự án) }
 * @param main  { users: users.json hiện có, projects: projects.json hiện có | null, phienTelegram: phien.json | null }
 */
export function dungBanMain(nguon, main) {
  const canhBao = [];
  const usersCu = Array.isArray(main.users) ? main.users : [];
  const mau = new Set(TAI_KHOAN_MAU);
  const cuTheoMa = new Map(usersCu.filter((u) => u?.id).map((u) => [u.id, u]));
  const cuTheoEmail = new Map(usersCu.map((u) => [thuong(u?.email), u]));
  const daiCu = cuTheoEmail.get("dai@sci.vn");

  const users = [];
  const dem = { admin: 0, pm: 0, engineer: 0, viewer: 0, maKhacEmail: 0, matKhauMoi: 0, giuMatKhauMain: 0, khoa: 0 };
  // 6g.6.13: bản chép vai trò — Main tính "lãnh đạo / trưởng" từ đây (⏸ ④ từ Đợt 3 sửa ở đâu: chốt sau)
  const vaiTheoNguoi = new Map();
  for (const v of nguon.vai ?? []) vaiTheoNguoi.set(v.nguoi_dung_id, [...(vaiTheoNguoi.get(v.nguoi_dung_id) ?? []), v.vai_tro_id]);
  const daDung = new Set();
  for (const p of nguon.nguoi) {
    const email = thuong(p.email);
    const cu = cuTheoMa.get(p.id) ?? cuTheoEmail.get(email);
    const coCu = !!cu && !mau.has(thuong(cu.email));
    if (!laBam(p.mat_khau_hash, p.salt) && !coCu) canhBao.push(`${email}: băm mật khẩu bên agent Công việc sai khuôn — người này sẽ không đăng nhập được`);
    if (p.la_quan_tri && email !== EMAIL_ADMIN) canhBao.push(`${email}: là quản trị ở agent Công việc nhưng không phải ${EMAIL_ADMIN} — Main xếp loại Người dùng (A10)`);
    const role = email === EMAIL_ADMIN ? "admin" : email === EMAIL_PM ? "pm" : coCu ? cu.role : "engineer";
    const u = {
      id: p.id,
      email,
      name: p.ten,
      role,
      ...(coCu ? { passwordHash: cu.passwordHash, salt: cu.salt } : { passwordHash: `scrypt:${p.salt}:${p.mat_khau_hash}`, salt: p.salt }),
      active: p.active !== false,
      createdAt: coCu ? cu.createdAt : iso(p.tao_luc),
      ...(coCu && Array.isArray(cu.projectIds) && cu.projectIds.length ? { projectIds: cu.projectIds } : {}),
      ...(coCu && cu.baseUsername ? { baseUsername: cu.baseUsername } : {}),
      ...(coCu && cu.telegramChatId ? { telegramChatId: cu.telegramChatId } : email === EMAIL_PM && daiCu?.telegramChatId ? { telegramChatId: daiCu.telegramChatId } : {}),
      donViId: p.don_vi_id ?? null,
      chucVu: p.chuc_vu ?? null,
      capChucVu: typeof p.cap_chuc_vu === "number" ? p.cap_chuc_vu : null,
      vaiCongViec: [...(vaiTheoNguoi.get(p.id) ?? [])].sort(),
    };
    users.push(u);
    daDung.add(thuong(cu?.email));
    dem[role]++;
    if (p.id !== email) dem.maKhacEmail++;
    if (coCu) dem.giuMatKhauMain++;
    else dem.matKhauMoi++;
    if (!u.active) dem.khoa++;
  }
  if (!users.some((u) => u.email === EMAIL_ADMIN)) canhBao.push(`agent Công việc không có ${EMAIL_ADMIN} — Main sẽ KHÔNG có tài khoản Admin`);
  if (!users.some((u) => u.email === EMAIL_PM)) canhBao.push(`agent Công việc không có ${EMAIL_PM} — Main sẽ KHÔNG có PM (luật ≥ 1 PM, 6g.5)`);
  // Người chỉ có ở Main (tạo ở Main sau lần chuyển đầu) — giữ nguyên; tài khoản mẫu — bỏ (T1)
  const chiMain = usersCu.filter((u) => !daDung.has(thuong(u?.email)) && !mau.has(thuong(u?.email)));
  users.push(...chiMain);
  const boMau = usersCu.filter((u) => mau.has(thuong(u?.email))).map((u) => thuong(u.email));

  const toChuc = {
    cap_nhat: null,
    don_vi: nguon.donVi.map((d) => ({
      id: d.id,
      ten: d.ten,
      ten_ngan: d.ten_ngan ?? d.ten,
      cap: d.cap,
      cha_id: d.cha_id ?? null,
      loai: d.loai,
      thu_tu: d.thu_tu ?? 0,
      active: d.active !== false,
      chuc_danh: d.chuc_danh ?? null,
      chuc_danh_ngan: d.chuc_danh_ngan ?? null,
      chuc_nang: d.chuc_nang ?? null,
      uy_quyen_truong: d.uy_quyen_truong ?? null,
    })),
    kiem_nhiem: nguon.kiemNhiem.map((k) => ({ nguoi_id: k.nguoi_dung_id, don_vi_id: k.don_vi_id, chuc_vu: k.chuc_vu ?? null })),
    uy_quyen_ky: [],
  };
  const maDonVi = new Set(toChuc.don_vi.map((d) => d.id));
  for (const u of users) if (u.donViId && !maDonVi.has(u.donViId)) canhBao.push(`${u.email}: đơn vị chính ${u.donViId} không có trong cây đơn vị`);

  // Đổi chủ (T2): Giám đốc dự án + phiên bot Telegram của dai@sci.vn → dainc
  // ⭐ Bước E (Mr. Đại chốt 03/10 "2a"): Main giữ Ban QLDA · đơn vị làm · Ban điều hành — chép từ Cài đặt agent Công việc,
  //   ghép theo mã ngắn. Dự án Main đã có `donVi` (đã sửa ở Main) thì GIỮ bản Main — chạy lại không đè.
  let giamDoc = 0;
  const duAnTheoMa = new Map((nguon.duAn ?? []).map((d) => [String(d.id ?? "").trim().toUpperCase(), d]));
  const donViDuAn = { ghi: [], giuMain: [], khongKhop: [] };
  const projects =
    main.projects && Array.isArray(main.projects.projects)
      ? {
          ...main.projects,
          projects: main.projects.projects.map((pr0) => {
            let pr = pr0;
            if (thuong(pr?.giamDoc) === "dai@sci.vn") {
              giamDoc++;
              pr = { ...pr, giamDoc: EMAIL_PM };
            }
            const ma = String(pr?.ma ?? "").trim().toUpperCase();
            if (!ma || pr?.archived === true) return pr;
            if (Array.isArray(pr.donVi)) {
              donViDuAn.giuMain.push(ma);
              return pr;
            }
            const d = duAnTheoMa.get(ma);
            if (!d) {
              donViDuAn.khongKhop.push(ma);
              return pr;
            }
            const donVi = (Array.isArray(d.don_vi) ? d.don_vi : []).filter((x) => typeof x === "string" && x);
            for (const x of [...donVi, ...(d.ban_dieu_hanh ? [d.ban_dieu_hanh] : [])])
              if (!maDonVi.has(x)) canhBao.push(`dự án ${ma}: đơn vị gắn "${x}" không có trong cây đơn vị`);
            donViDuAn.ghi.push(ma);
            const { banDieuHanh: _bo, ...conLai } = pr;
            return { ...conLai, donVi, ...(d.ban_dieu_hanh ? { banDieuHanh: d.ban_dieu_hanh } : {}) };
          }),
        }
      : null;
  let phienTelegram = main.phienTelegram && typeof main.phienTelegram === "object" ? { ...main.phienTelegram } : null;
  let doiPhienBot = false;
  if (phienTelegram && phienTelegram["dai@sci.vn"] && !phienTelegram[EMAIL_PM]) {
    phienTelegram[EMAIL_PM] = phienTelegram["dai@sci.vn"];
    delete phienTelegram["dai@sci.vn"];
    doiPhienBot = true;
  }

  const pm = users.find((u) => u.email === EMAIL_PM);
  return {
    users,
    toChuc,
    biDanh: BI_DANH,
    projects,
    phienTelegram,
    bang: {
      soNguon: nguon.nguoi.length,
      soMain: users.length,
      ...dem,
      chiMain: chiMain.map((u) => u.email),
      boMau,
      donVi: toChuc.don_vi.length,
      coChucNang: toChuc.don_vi.filter((d) => d.chuc_nang).length,
      truongChinh: toChuc.don_vi.filter((d) => d.uy_quyen_truong).length,
      kiemNhiem: toChuc.kiem_nhiem.length,
      lanhDao: users.filter((u) => (u.vaiCongViec ?? []).includes("lanh-dao")).length,
      vaiTruong: users.filter((u) => (u.vaiCongViec ?? []).includes("truong-don-vi")).length,
      donViDuAn,
      giamDoc,
      doiPhienBot,
      telegramPm: !!pm?.telegramChatId,
    },
    canhBao,
  };
}

/** In bảng số tiếng Việt cho người đọc trên điện thoại */
export function inBang(kq, chiTiet = false) {
  const b = kq.bang;
  const dong = [];
  dong.push(`1. NGƯỜI: ${b.soNguon} người từ agent Công việc → Main sẽ có ${b.soMain} người`);
  dong.push(`   Admin ${b.admin} · PM ${b.pm} · ${b.engineer + b.viewer} người còn lại: loại TÍNH THEO SƠ ĐỒ ở Main (6g.6.13 — lãnh đạo + trưởng = Người dùng; theo dự án: thuộc = Người dùng) · đã khoá ${b.khoa}`);
  dong.push(`   Mã người ≠ email: ${b.maKhacEmail} (giữ nguyên mã — A1)`);
  dong.push(`   Mật khẩu: ${b.matKhauMoi} lấy từ agent Công việc · ${b.giuMatKhauMain} giữ mật khẩu đang có ở Main`);
  dong.push(`   Bỏ tài khoản mẫu: ${b.boMau.length ? b.boMau.join(", ") : "không có"}`);
  if (b.chiMain.length) dong.push(`   Người chỉ có ở Main — giữ nguyên: ${b.chiMain.join(", ")}`);
  dong.push(`2. TỔ CHỨC: ${b.donVi} đơn vị (${b.coChucNang} có chức năng nhiệm vụ · ${b.truongChinh} đã chọn trưởng chính) · ${b.kiemNhiem} kiêm nhiệm`);
  dong.push(`   Vai trò chép sang Main: ${b.lanhDao} người vai Lãnh đạo · ${b.vaiTruong} người vai Trưởng phòng / GĐ đơn vị`);
  const dv = b.donViDuAn;
  dong.push(`   Đơn vị gắn dự án (Ban QLDA · đơn vị làm · Ban điều hành): chép ${dv.ghi.length} dự án${dv.giuMain.length ? ` · giữ bản Main ${dv.giuMain.length}` : ""}${dv.khongKhop.length ? ` · Main có mà agent Công việc không có: ${dv.khongKhop.join(", ")}` : ""}`);
  dong.push(`3. GỘP dai@sci.vn → ${EMAIL_PM}: Telegram ${b.telegramPm ? "có" : "KHÔNG"} · Giám đốc dự án ${b.giamDoc} dự án · phiên bot ${b.doiPhienBot ? "chuyển" : "không có / đã chuyển"}`);
  dong.push(`   Giữ nguyên đứng tên cũ (A11): phiên chat, người tạo dự án, nhật ký — bí danh hiện đúng tên`);
  dong.push(`4. BÍ DANH giao các agent: ${kq.biDanh.map((x) => `${x.email_cu} → ${x.email_moi}`).join(" · ")}`);
  dong.push(`5. CẢNH BÁO: ${kq.canhBao.length ? "" : "không có"}`);
  for (const c of kq.canhBao) dong.push(`   ⚠ ${c}`);
  if (chiTiet) {
    dong.push("6. CHI TIẾT:");
    const nhan = { admin: "Admin", pm: "PM", engineer: "Người dùng", viewer: "Người xem" };
    for (const u of kq.users) dong.push(`   ${u.email.padEnd(32)} ${nhan[u.role].padEnd(10)} ${u.id !== u.email ? `mã ${u.id}` : ""}`);
  }
  return dong.join("\n");
}

// ---------------- Chạy dòng lệnh ----------------
async function chay() {
  const thamSo = process.argv.slice(2);
  const lay = (ten, mac) => {
    const i = thamSo.indexOf(ten);
    return i >= 0 && thamSo[i + 1] ? thamSo[i + 1] : mac;
  };
  const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const nguonDir = path.resolve(lay("--nguon", path.join(goc, "data", "pgdata")));
  const mainDir = path.resolve(lay("--main", path.join(goc, "..", "..", "4-agent-main", "data")));
  const ghi = thamSo.includes("--ghi");
  const chiTiet = thamSo.includes("--chi-tiet");
  const laCsdlThat = nguonDir === path.resolve(goc, "data", "pgdata");
  if (laCsdlThat) {
    const conChay = await fetch("http://localhost:3004/", { redirect: "manual", signal: AbortSignal.timeout(2000) }).then(() => true, () => false);
    if (conChay) {
      console.error("⛔ Agent Công việc (cổng 3004) đang chạy — đọc data/pgdata lúc này có thể hỏng CSDL. Dừng cổng 3004 rồi chạy lại, hoặc trỏ --nguon vào một bản sao.");
      process.exit(2);
    }
  }
  if (!fs.existsSync(path.join(mainDir, "users.json"))) {
    console.error(`⛔ Không thấy ${path.join(mainDir, "users.json")} — kiểm lại --main`);
    process.exit(2);
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(nguonDir);
  const nguoi = (await db.query("SELECT id, email, ten, mat_khau_hash, salt, don_vi_id, chuc_vu, cap_chuc_vu, la_quan_tri, active, tao_luc FROM identity.nguoi_dung ORDER BY email")).rows;
  const donVi = (await db.query("SELECT id, ten, ten_ngan, cap, cha_id, loai, thu_tu, active, chuc_danh, chuc_danh_ngan, chuc_nang, uy_quyen_truong FROM identity.don_vi ORDER BY cap, thu_tu, id")).rows;
  const kiemNhiem = (await db.query("SELECT nguoi_dung_id, don_vi_id, chuc_vu FROM identity.kiem_nhiem ORDER BY nguoi_dung_id, don_vi_id")).rows;
  const vai = (await db.query("SELECT nguoi_dung_id, vai_tro_id FROM identity.gan_vai_tro ORDER BY nguoi_dung_id, vai_tro_id")).rows;
  const duAn = (await db.query("SELECT gia_tri FROM docflow.cau_hinh WHERE khoa = 'du_an'")).rows[0]?.gia_tri ?? [];
  await db.close();

  const docJson = (f) => {
    try {
      return JSON.parse(fs.readFileSync(f, "utf8"));
    } catch {
      return null;
    }
  };
  const fUsers = path.join(mainDir, "users.json");
  const fProjects = path.join(mainDir, "projects.json");
  const fPhien = path.join(mainDir, "telegram-tro-ly", "phien.json");
  const kq = dungBanMain({ nguoi, donVi, kiemNhiem, vai, duAn: Array.isArray(duAn) ? duAn : [] }, { users: docJson(fUsers), projects: docJson(fProjects), phienTelegram: docJson(fPhien) });

  console.log(`BỘ CHUYỂN NGƯỜI — agent Công việc → Main ${ghi ? "(GHI THẬT)" : "(CHẠY THỬ — chưa ghi gì)"}`);
  console.log(`Nguồn: ${nguonDir}\nMain:  ${mainDir}\n`);
  console.log(inBang(kq, chiTiet));
  if (!ghi) {
    console.log("\nChạy thử xong. Ghi thật: dừng agent Công việc rồi chạy lại với --ghi");
    return;
  }

  // Giờ máy (giờ Việt Nam) cho tên thư mục sao lưu dễ đọc: _truoc-6g6-dot2-20261003-2032
  const gio = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
  const sao = path.join(mainDir, `_truoc-6g6-dot2-${gio}`);
  fs.mkdirSync(path.join(sao, "telegram-tro-ly"), { recursive: true });
  for (const f of ["users.json", "projects.json", "to-chuc.json", "bi-danh-tai-khoan.json", path.join("telegram-tro-ly", "phien.json")])
    if (fs.existsSync(path.join(mainDir, f))) fs.copyFileSync(path.join(mainDir, f), path.join(sao, f));
  const viet = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + "\n", "utf8");
  viet(fUsers, kq.users);
  viet(path.join(mainDir, "to-chuc.json"), { ...kq.toChuc, cap_nhat: new Date().toISOString() });
  viet(path.join(mainDir, "bi-danh-tai-khoan.json"), kq.biDanh);
  if (kq.projects) viet(fProjects, kq.projects);
  if (kq.phienTelegram) viet(fPhien, kq.phienTelegram);
  console.log(`\n✅ Đã ghi. Bản cũ sao lưu ở ${sao}`);
  console.log("Tiếp theo: bật lại agent Công việc · đăng nhập Main bằng dainc@scigroup.vn (mật khẩu như agent Công việc) · bấm \"Kéo lại từ Main\" ở Tiến độ, Hợp đồng, Pháp lý, Base.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  chay().catch((e) => {
    console.error(`⛔ Lỗi: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}

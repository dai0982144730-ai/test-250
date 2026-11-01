// ============================================================
// cau-hinh/kiem-tra.ts — KIỂM TRA CẤU HÌNH TRƯỚC KHI LƯU (CHỈ SERVER).
// Hai lớp: (1) đúng kiểu so với mặc định (thiếu trường, sai kiểu, số âm, trường lạ);
//          (2) luật nghiệp vụ từng nhóm (luồng báo cáo vòng tròn, đơn vị không tồn tại / không có cấp…).
// ============================================================
import type { Q } from "@/lib/db";
import { MAC_DINH, type CauHinh, type KhoaCauHinh } from "./mac-dinh";
import { NGUYEN_TAC_MA_VIEC } from "@/lib/so-cai/tien-ich";

/** Các đối tượng mà khóa là dữ liệu (không bắt buộc đủ khóa như mặc định). */
// ten_goi_khac_don_vi: khoá = mã đơn vị bất kỳ (lỗi đo 01/10: trước đây chỉ lưu được HL7/HL8 có sẵn trong mặc định, mọi đơn vị khác báo "trường lạ")
const KHOA_TU_DO = new Set(["gui.duoc_chuyen_tiep", "phan_quyen_cau_hinh.nhom", "thong_bao.mau", "thong_bao.theo_loai", "ten_goi_khac_don_vi", "cong_ty_don_vi"]);
/** Trong số đó: khóa nào thiếu thì lấy mặc định (mẫu thông báo, kênh theo loại). Hai cái còn lại xóa khóa là có chủ ý. */
const KHOA_TU_DO_TRON_MAC_DINH = new Set(["thong_bao.mau", "thong_bao.theo_loai"]);
/** Trường không bắt buộc trong phần tử mảng. */
const TRUONG_TUY_CHON = new Set(["luong_bao_cao[].tong_hop_thanh", "du_an[].ban_dieu_hanh", "du_an[].ma_tien_do"]);
/** Trường nhận nhiều kiểu — để luật nghiệp vụ kiểm. */
const NHIEU_KIEU = new Set(["luat_kiem_tra.luat[].ap_dung"]);

function kieu(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "mảng";
  return { boolean: "bật/tắt", number: "số", string: "chữ", object: "đối tượng" }[typeof v as string] ?? typeof v;
}

/** So kiểu giá trị với mẫu (giá trị mặc định). */
function soKieu(mau: unknown, v: unknown, duong: string, loi: string[]): void {
  const tenDuong = duong || "(gốc)";
  if (typeof mau === "boolean") {
    if (typeof v !== "boolean") loi.push(`${tenDuong}: phải là bật/tắt, đang là ${kieu(v)}`);
    return;
  }
  if (typeof mau === "number") {
    if (typeof v !== "number" || !Number.isFinite(v)) loi.push(`${tenDuong}: phải là số, đang là ${kieu(v)}`);
    else if (v < 0) loi.push(`${tenDuong}: không được là số âm (${v})`);
    return;
  }
  if (typeof mau === "string") {
    if (typeof v !== "string") loi.push(`${tenDuong}: phải là chữ, đang là ${kieu(v)}`);
    return;
  }
  if (Array.isArray(mau)) {
    if (!Array.isArray(v)) {
      loi.push(`${tenDuong}: phải là danh sách, đang là ${kieu(v)}`);
      return;
    }
    const mauPhanTu = mau[0];
    v.forEach((pt, i) => {
      if (mauPhanTu === undefined) {
        if (typeof pt !== "string") loi.push(`${tenDuong}[${i + 1}]: phải là chữ`);
      } else soKieu(mauPhanTu, pt, `${duong}[${i + 1}]`, loi);
    });
    return;
  }
  if (mau && typeof mau === "object") {
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      loi.push(`${tenDuong}: phải là đối tượng, đang là ${kieu(v)}`);
      return;
    }
    const duongChuan = duong.replace(/\[\d+\]/g, "[]");
    const m = mau as Record<string, unknown>;
    const g = v as Record<string, unknown>;
    if (KHOA_TU_DO.has(duongChuan)) {
      const mauGiaTri = Object.values(m)[0];
      for (const [k, x] of Object.entries(g)) if (mauGiaTri !== undefined) soKieu(mauGiaTri, x, `${duong}.${k}`, loi);
      return;
    }
    for (const k of Object.keys(m)) {
      if (NHIEU_KIEU.has(`${duongChuan}.${k}`)) continue;
      if (TRUONG_TUY_CHON.has(`${duongChuan}.${k}`)) {
        if (g[k] !== undefined && g[k] !== null && typeof g[k] !== "string") loi.push(`${duong}.${k}: phải là chữ`);
        continue;
      }
      if (!(k in g) || g[k] === undefined) {
        loi.push(`${duong ? duong + "." : ""}${k}: thiếu trường`);
        continue;
      }
      soKieu(m[k], g[k], duong ? `${duong}.${k}` : k, loi);
    }
    for (const k of Object.keys(g)) {
      if (k in m) continue;
      if (TRUONG_TUY_CHON.has(`${duongChuan}.${k}`)) {
        if (g[k] !== undefined && g[k] !== null && typeof g[k] !== "string") loi.push(`${duong}.${k}: phải là chữ`);
        continue;
      }
      loi.push(`${duong ? duong + "." : ""}${k}: trường lạ, không có trong cấu hình`);
    }
  }
}

/** Mẫu kiểu cho từng nhóm (mặc định; với luồng báo cáo lấy phần tử có đủ trường). */
function mauKieu(khoa: KhoaCauHinh): unknown {
  return MAC_DINH[khoa];
}

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;
const NGAY = /^\d{4}-\d{2}-\d{2}$/;

function trongMot<T extends string>(v: string, ds: readonly T[], ten: string, loi: string[]): void {
  if (!ds.includes(v as T)) loi.push(`${ten}: "${v}" không hợp lệ (chọn một trong: ${ds.join(", ")})`);
}

interface DanhMuc {
  donVi: Map<string, { cap: number | null; active: boolean; ten_ngan: string }>;
  vaiTro: Set<string>;
  mau: Set<string>;
}

async function napDanhMuc(q: Q): Promise<DanhMuc> {
  const dv = await q.query<{ id: string; cap: number | null; active: boolean; ten_ngan: string }>(
    "SELECT id, cap, active, ten_ngan FROM identity.don_vi",
  );
  const vt = await q.query<{ id: string }>("SELECT id FROM identity.vai_tro");
  const mau = await q.query<{ ma: string }>("SELECT ma FROM docflow.mau_word");
  return {
    donVi: new Map(dv.rows.map((d) => [d.id, d])),
    vaiTro: new Set(vt.rows.map((v) => v.id)),
    mau: new Set(mau.rows.map((m) => m.ma)),
  };
}

function kiemDonVi(dm: DanhMuc, id: string, ten: string, loi: string[], choSao = false): void {
  if (choSao && id === "*") return;
  const d = dm.donVi.get(id);
  if (!d) loi.push(`${ten}: đơn vị "${id}" không tồn tại`);
  else if (!d.active) loi.push(`${ten}: đơn vị "${d.ten_ngan}" đã ngừng hoạt động`);
  else if (d.cap === null || d.cap === undefined) loi.push(`${ten}: đơn vị "${d.ten_ngan}" chưa có cấp`);
}

/** Tìm vòng trong đồ thị từ → đến (bỏ qua vòng tự thân, vd Ban TGĐ → Ban TGĐ). Trả chuỗi đơn vị của vòng. */
/**
 * MỘT DỰ ÁN KHÔNG ĐƯỢC CÓ HAI TÊN (Mr. Đại chốt 03/10/2026 — "Nam Khian 1" và "Nậm Khiên 1" từng là hai dòng của cùng một dự án):
 * hai dự án mà một tên (tên chính hoặc tên gọi khác) của bên này gần trùng một tên của bên kia — bỏ dấu, cùng các con số, lệch
 * không quá 2 chữ cái — thì chặn lưu, bảo gộp làm một và chuyển tên kia vào "tên gọi khác". Khác số (Nậm Mô 1 / Nậm Mô 2) không tính.
 */
export function duAnHaiTen(ds: { ten: string; ten_khac?: string[] }[]): string[] {
  const bo = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/^(du an|da|thuy dien|td|dien gio|dg|nmdg|nmtd|nha may)\s+/, "")
      .replace(/[^a-z0-9]+/g, "");
  const so = (s: string) => (s.match(/\d+/g) ?? []).join(",");
  const lech = (a: string, b: string) => {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const d = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let truoc = d[0];
      d[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const t = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, truoc + (a[i - 1] === b[j - 1] ? 0 : 1));
        truoc = t;
      }
    }
    return d[b.length];
  };
  const tenCua = ds.map((d) =>
    [d.ten, ...(d.ten_khac ?? [])].filter((x) => x?.trim()).map((x) => ({ goc: x.trim(), k: bo(x.trim()), s: so(x) })),
  );
  const loi: string[] = [];
  for (let i = 0; i < ds.length; i++)
    for (let j = i + 1; j < ds.length; j++) {
      const trung = tenCua[i].flatMap((a) => tenCua[j].filter((b) => a.k.length >= 5 && a.s === b.s && lech(a.k, b.k) <= 2).map((b) => [a.goc, b.goc]))[0];
      if (trung)
        loi.push(`Dự án "${ds[i].ten}" và "${ds[j].ten}" có tên gần trùng ("${trung[0]}" ~ "${trung[1]}") — nếu là một dự án thì gộp làm một dòng, chuyển tên kia vào "tên gọi khác"`);
    }
  return loi;
}

export function timVong(canh: { tu: string; den: string }[]): string[] | null {
  const ke = new Map<string, string[]>();
  for (const c of canh) if (c.tu !== c.den) ke.set(c.tu, [...(ke.get(c.tu) ?? []), c.den]);
  const trangThai = new Map<string, 1 | 2>(); // 1 = đang đi, 2 = xong
  const duong: string[] = [];
  const di = (n: string): string[] | null => {
    trangThai.set(n, 1);
    duong.push(n);
    for (const m of ke.get(n) ?? []) {
      if (trangThai.get(m) === 1) return [...duong.slice(duong.indexOf(m)), m];
      if (!trangThai.has(m)) {
        const r = di(m);
        if (r) return r;
      }
    }
    duong.pop();
    trangThai.set(n, 2);
    return null;
  };
  for (const n of Array.from(ke.keys())) {
    if (!trangThai.has(n)) {
      const r = di(n);
      if (r) return r;
    }
  }
  return null;
}

/** Luật nghiệp vụ từng nhóm. */
function kiemNghiepVu(khoa: KhoaCauHinh, gt: CauHinh[KhoaCauHinh], dm: DanhMuc, loi: string[]): void {
  switch (khoa) {
    case "quy_tac_de": {
      const v = gt as CauHinh["quy_tac_de"];
      trongMot(v.thu_tu, ["cap_truoc", "ngay_truoc", "chi_cap", "chi_ngay"] as const, "Thứ tự ưu tiên", loi);
      trongMot(v.ngay_sau_tinh_theo, ["ky_bao_cao", "ngay_gui"] as const, "\"Ngày sau\" tính theo", loi);
      if (v.nguong_goi_y_trung > 1) loi.push("Ngưỡng gợi ý trùng phải trong khoảng 0–1");
      break;
    }
    case "luat_kiem_tra": {
      const v = gt as CauHinh["luat_kiem_tra"];
      const ma = new Set<string>();
      v.luat.forEach((l, i) => {
        const ten = `Luật ${i + 1}${l.ma ? ` (${l.ma})` : ""}`;
        if (!l.ma?.trim()) loi.push(`${ten}: thiếu mã luật`);
        else if (ma.has(l.ma)) loi.push(`${ten}: mã luật bị trùng`);
        ma.add(l.ma);
        if (!l.ten?.trim()) loi.push(`${ten}: thiếu tên luật`);
        trongMot(l.muc, ["chan", "canh_bao", "goi_y"] as const, `${ten} — mức`, loi);
        if (l.ap_dung !== "tat_ca") {
          if (!Array.isArray(l.ap_dung)) loi.push(`${ten}: "áp dụng" phải là "tat_ca" hoặc danh sách mã mẫu`);
          else {
            if (l.ap_dung.length === 0) loi.push(`${ten}: chưa chọn mẫu nào để áp dụng`);
            for (const m of l.ap_dung) if (dm.mau.size > 0 && !dm.mau.has(m)) loi.push(`${ten}: không có mẫu "${m}"`);
          }
        }
      });
      break;
    }
    case "gui": {
      const v = gt as CauHinh["gui"];
      for (const [tu, den] of Object.entries(v.duoc_chuyen_tiep)) {
        kiemDonVi(dm, tu, `Chuyển tiếp từ "${tu}"`, loi, true);
        for (const d of den) kiemDonVi(dm, d, `Chuyển tiếp từ "${tu}" đến`, loi, true);
      }
      break;
    }
    case "nguoi_ngoai": {
      const v = gt as CauHinh["nguoi_ngoai"];
      trongMot(v.chua_gan_don_vi, ["chan_gui", "cho_gui_cap_thap_nhat"] as const, "Người chưa gán đơn vị", loi);
      if (!Number.isInteger(v.cap_ben_ngoai) || !Number.isInteger(v.cap_thap_nhat)) loi.push("Cấp phải là số nguyên");
      break;
    }
    case "cong_ty_don_vi": {
      const v = gt as CauHinh["cong_ty_don_vi"];
      if (!v || typeof v !== "object" || Array.isArray(v) || Object.values(v).some((x) => typeof x !== "string"))
        loi.push("Công ty của đơn vị phải là bảng mã đơn vị → tên công ty");
      else if (Object.values(v).some((x) => x.includes("�"))) loi.push("Tên công ty có ký tự lỗi phông (�) — gõ lại tên");
      break;
    }
    case "ten_goi_khac_don_vi": {
      const v = gt as CauHinh["ten_goi_khac_don_vi"];
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        loi.push("Tên gọi khác của đơn vị phải là bảng mã đơn vị → danh sách tên");
        break;
      }
      const daCo = new Map<string, string>();
      for (const [dv, ds] of Object.entries(v)) {
        if (!Array.isArray(ds) || ds.some((x) => typeof x !== "string")) loi.push(`Tên gọi khác của ${dv} phải là danh sách chữ`);
        for (const t of ds ?? []) {
          const k = t.trim().toLowerCase();
          if (k && daCo.has(k) && daCo.get(k) !== dv) loi.push(`Tên "${t}" đang khai cho cả ${daCo.get(k)} và ${dv} — mỗi tên gọi chỉ thuộc một đơn vị`);
          daCo.set(k, dv);
        }
      }
      break;
    }
    case "du_an": {
      const v = gt as CauHinh["du_an"];
      if (!Array.isArray(v)) {
        loi.push("Danh mục dự án phải là danh sách");
        break;
      }
      const id = new Set<string>();
      const ten = new Set<string>();
      v.forEach((d, i) => {
        const nhan = `Dự án ${i + 1}${d?.ten ? ` (${d.ten})` : ""}`;
        if (!d?.id?.trim()) loi.push(`${nhan}: thiếu mã`);
        else if (id.has(d.id)) loi.push(`${nhan}: trùng mã ${d.id}`);
        else id.add(d.id);
        if (!d?.ten?.trim()) loi.push(`${nhan}: thiếu tên`);
        else if (ten.has(d.ten.trim().toLowerCase())) loi.push(`${nhan}: trùng tên`);
        else ten.add(d.ten.trim().toLowerCase());
        if (d?.nhom !== "sci" && d?.nhom !== "khac") loi.push(`${nhan}: nhóm phải là SCI đầu tư hoặc Loại khác`);
        // Sơ đồ dự án: SCI đầu tư có Ban QLDA đứng đầu (don_vi[0]), sau đó là đơn vị làm (PMC thiết kế, E&C thi công… — chốt 03/10);
        // Loại khác không bắt buộc đơn vị (chỉ là thuộc tính phụ). Dự án SCI đầu tư CHƯA chọn Ban QLDA (Main mới khai — 6g.6)
        // vẫn lưu được: don_vi = [] , nằm dưới nút "Chưa chọn Ban QLDA" chờ người chọn — không để lượt kéo từ Main bị chặn.
        if (!Array.isArray(d?.don_vi)) loi.push(`${nhan}: đơn vị phải là danh sách`);
        else {
          if (d.nhom === "sci" && !d.don_vi[0] && d.don_vi.length) loi.push(`${nhan}: chọn Ban QLDA trước rồi mới thêm đơn vị làm`);
          if (new Set(d.don_vi).size !== d.don_vi.length) loi.push(`${nhan}: một đơn vị chọn hai lần`);
          d.don_vi.forEach((x) => kiemDonVi(dm, x, `${nhan} — đơn vị`, loi));
        }
        if (d?.ban_dieu_hanh) kiemDonVi(dm, d.ban_dieu_hanh, `${nhan} — Ban điều hành`, loi);
        if (!Array.isArray(d?.ten_khac)) loi.push(`${nhan}: tên gọi khác phải là danh sách`);
        if (d?.ma_tien_do != null && (typeof d.ma_tien_do !== "string" || /\s/.test(d.ma_tien_do.trim()))) loi.push(`${nhan}: mã bên Tiến độ không được có dấu cách`);
      });
      for (const x of duAnHaiTen(v)) loi.push(x);
      break;
    }
    case "luong_bao_cao": {
      const v = gt as CauHinh["luong_bao_cao"];
      const cap = new Set<string>();
      v.forEach((l, i) => {
        const ten = `Luồng ${i + 1}`;
        kiemDonVi(dm, l.tu, `${ten} — từ`, loi);
        kiemDonVi(dm, l.den, `${ten} — đến`, loi);
        const k = `${l.tu}→${l.den}`;
        if (cap.has(k)) loi.push(`${ten}: trùng luồng ${l.tu} → ${l.den}`);
        cap.add(k);
        for (const ks of l.kiem_soat) if (!dm.vaiTro.has(ks) && !dm.donVi.has(ks)) loi.push(`${ten}: người kiểm soát "${ks}" không phải vai trò hay đơn vị có sẵn`);
        if (l.tong_hop_thanh && dm.mau.size > 0 && !dm.mau.has(l.tong_hop_thanh)) loi.push(`${ten}: không có mẫu tổng hợp "${l.tong_hop_thanh}"`);
      });
      const vong = timVong(v);
      if (vong) loi.push(`Luồng báo cáo bị vòng tròn: ${vong.map((id) => dm.donVi.get(id)?.ten_ngan ?? id).join(" → ")}`);
      break;
    }
    case "ky_bao_cao": {
      const v = gt as CauHinh["ky_bao_cao"];
      if (v.loai.length === 0) loi.push("Phải chọn ít nhất một loại kỳ báo cáo");
      for (const l of v.loai) trongMot(l, ["tuan", "thang", "quy"] as const, "Loại kỳ", loi);
      for (const c of ["cap1", "cap2", "cap3", "cap4"] as const) {
        const h = v.han_nop_theo_cap?.[c];
        const ten = `Hạn nộp tuần cấp ${c.slice(3)}`;
        if (!h) {
          loi.push(`${ten}: chưa khai`);
          continue;
        }
        if (h.tuan !== "nay" && h.tuan !== "sau") loi.push(`${ten}: tuần phải là "tuần cần báo cáo" hoặc "tuần sau đó"`);
        if (!Number.isInteger(h.thu) || h.thu < 1 || h.thu > 7) loi.push(`${ten}: thứ phải từ 1 (thứ Hai) đến 7 (Chủ nhật)`);
        if (!GIO.test(h.gio)) loi.push(`${ten}: giờ "${h.gio}" phải dạng HH:MM`);
      }
      if (!Number.isInteger(v.han_nop_thang.ngay) || v.han_nop_thang.ngay < 1 || v.han_nop_thang.ngay > 28) loi.push("Hạn nộp tháng: ngày phải từ 1 đến 28");
      if (!GIO.test(v.han_nop_thang.gio)) loi.push(`Hạn nộp tháng: giờ "${v.han_nop_thang.gio}" phải dạng HH:MM`);
      for (const n of v.ngay_nghi) if (!NGAY.test(n) || Number.isNaN(Date.parse(n))) loi.push(`Ngày nghỉ "${n}" phải dạng yyyy-mm-dd`);
      break;
    }
    case "so_cai": {
      const v = gt as CauHinh["so_cai"];
      if (!Number.isInteger(v.sap_den_han_ngay)) loi.push("Số ngày \"sắp đến hạn\" phải là số nguyên");
      if (v.qua_han_vang_ngay !== undefined && (!Number.isInteger(v.qua_han_vang_ngay) || v.qua_han_vang_ngay < 0)) loi.push("Ngưỡng quá hạn tô vàng phải là số nguyên ≥ 0");
      if (!v.dang_ma_viec.includes("{so")) loi.push("Dạng mã việc phải có {so} (vd CV-{nam}-{so:4})");
      if (v.nguyen_tac_ma_viec !== undefined && !NGUYEN_TAC_MA_VIEC.some((x) => x.gia_tri === v.nguyen_tac_ma_viec))
        loi.push(`Nguyên tắc sinh mã việc "${v.nguyen_tac_ma_viec}" không có trong danh sách`);
      if (!GIO.test(v.gio_nhac)) loi.push(`Giờ nhắc "${v.gio_nhac}" phải dạng HH:MM`);
      for (const k of v.kenh_nhac) trongMot(k, ["trong_app", "email"] as const, "Kênh nhắc", loi);
      break;
    }
    case "bao_cao_tuan": {
      const v = gt as CauHinh["bao_cao_tuan"];
      if (!Array.isArray(v.don_vi_danh_gia)) loi.push("Đơn vị được đánh giá phải là danh sách");
      if (!(v.nguong_qua_tai > v.nguong_can_bang)) loi.push("Ngưỡng Quá tải phải lớn hơn ngưỡng Cân bằng");
      if (!(v.nguong_tre >= 1 && v.nguong_tre <= 100)) loi.push("Ngưỡng % trễ phải từ 1 đến 100");
      if (!(Number.isInteger(v.tre_muc_1) && Number.isInteger(v.tre_muc_2) && v.tre_muc_1 >= 1 && v.tre_muc_2 > v.tre_muc_1)) loi.push("Mốc trễ ×2 phải lớn hơn mốc trễ ×1");
      if (!GIO.test(v.gio_viet_muon)) loi.push(`Giờ viết muộn nhất "${v.gio_viet_muon}" phải dạng HH:MM`);
      break;
    }
    case "gan_wbs": {
      const v = gt as CauHinh["gan_wbs"];
      if (typeof v.bat !== "boolean") loi.push("Bật gắn WBS phải là bật/tắt");
      trongMot(v.che_do, ["nguoi_duyet", "ai_tu_duyet"] as const, "Ai duyệt mã WBS", loi);
      if (!(typeof v.nguong_tu_duyet === "number" && v.nguong_tu_duyet >= 0 && v.nguong_tu_duyet <= 1)) loi.push("Ngưỡng độ chắc phải từ 0 đến 1");
      if (v.cua_so_giao_ngay !== undefined && !(Number.isInteger(v.cua_so_giao_ngay) && v.cua_so_giao_ngay >= 0 && v.cua_so_giao_ngay <= 365))
        loi.push("Cửa sổ giao việc găng phải là số ngày từ 0 đến 365");
      break;
    }
    case "bao_mat": {
      const v = gt as CauHinh["bao_mat"];
      if (!v.cau_tu_choi.trim()) loi.push("Câu trả cho người không được xem không được trống");
      if (v.mau_mat.some((m) => m.trim()) && !v.chuong_mat.some((c) => c.trim())) loi.push("Có mẫu mật thì phải ghi ít nhất một chương mật");
      for (const m of v.mau_mat) if (m.trim() && dm.mau.size > 0 && !dm.mau.has(m.trim())) loi.push(`Mẫu mật: không có mẫu "${m}"`);
      for (const d of v.don_vi_theo_quyen) if (dm.donVi.size > 0 && !dm.donVi.has(d)) loi.push(`Đơn vị xét theo phân quyền: không có đơn vị "${d}"`);
      break;
    }
    case "dinh_kem": {
      const v = gt as CauHinh["dinh_kem"];
      if (!Number.isInteger(v.toi_da_mb) || v.toi_da_mb < 1 || v.toi_da_mb > 200) loi.push("Dung lượng tối đa mỗi file phải từ 1 đến 200 MB");
      if (!Number.isInteger(v.so_file_toi_da) || v.so_file_toi_da < 1 || v.so_file_toi_da > 50) loi.push("Số file mỗi lần kẹp phải từ 1 đến 50");
      if (!Number.isInteger(v.luu_thang) || v.luu_thang < 1 || v.luu_thang > 120) loi.push("Thời hạn lưu phải từ 1 đến 120 tháng");
      break;
    }
    case "thu_muc": {
      const v = gt as CauHinh["thu_muc"];
      const ten = new Set<string>();
      if (v.thu_muc_con_mac_dinh.length === 0) loi.push("Phải có ít nhất một thư mục con mặc định");
      v.thu_muc_con_mac_dinh.forEach((t, i) => {
        if (!t.ten.trim()) loi.push(`Thư mục con ${i + 1}: thiếu tên`);
        if (ten.has(t.ten.trim())) loi.push(`Thư mục con "${t.ten}" bị trùng tên`);
        ten.add(t.ten.trim());
        trongMot(t.loai, ["den", "di", "du_an", "thung_rac", "khac"] as const, `Thư mục con "${t.ten}" — loại`, loi);
      });
      trongMot(v.xem_noi_dung_phong_khac, ["tat_ca", "theo_quyen"] as const, "Xem nội dung phòng khác", loi);
      break;
    }
    case "thong_bao": {
      const v = gt as CauHinh["thong_bao"];
      if (v.email_gui && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email_gui)) loi.push(`Hộp thư gửi "${v.email_gui}" không phải email hợp lệ`);
      for (const k of Object.keys(MAC_DINH.thong_bao.mau)) if (!v.mau[k]?.trim()) loi.push(`Nội dung mẫu "${k}" không được trống`);
      if (!v.theo_loai.khac) loi.push('Kênh theo loại thông báo: phải có dòng "khac" (dùng cho loại chưa có dòng riêng)');
      for (const [k, d] of Object.entries(v.theo_loai)) if (d.email && !d.tieu_de.trim()) loi.push(`Kênh theo loại "${k}": bật email thì phải có tiêu đề thư`);
      if (!Number.isInteger(v.smtp.cong) || v.smtp.cong < 1 || v.smtp.cong > 65535) loi.push(`Cổng SMTP "${v.smtp.cong}" phải là số nguyên 1–65535`);
      trongMot(v.smtp.bao_mat, ["starttls", "ssl", "khong"] as const, "Bảo mật SMTP", loi);
      if (/\s/.test(v.smtp.may_chu.trim())) loi.push(`Máy chủ SMTP "${v.smtp.may_chu}" không được có dấu cách`);
      break;
    }
    case "giao_dien": {
      const v = gt as CauHinh["giao_dien"];
      if (!v.ten_ung_dung.trim()) loi.push("Tên ứng dụng không được trống");
      if (!/^#[0-9a-fA-F]{6}$/.test(v.mau_chinh)) loi.push(`Màu chính "${v.mau_chinh}" phải dạng #RRGGBB`);
      if (!GIO.test(v.gio_sao_luu)) loi.push(`Giờ sao lưu "${v.gio_sao_luu}" phải dạng HH:MM`);
      if (v.so_ngay_giu_sao_luu < 1) loi.push("Số ngày giữ sao lưu phải ít nhất 1");
      for (const d of v.nhom_gap_so_do ?? []) {
        const [ma, nhan] = d.split("|").map((x) => x.trim());
        if (!ma || !nhan) loi.push(`Nhóm bung/gập "${d}" phải ghi dạng: mã đơn vị | nhãn | tên gọi ô con (tên gọi ô con có thể bỏ)`);
      }
      break;
    }
    case "ai": {
      const v = gt as CauHinh["ai"];
      if (!v.model_mac_dinh.trim()) loi.push("Model mặc định không được trống");
      if (v.model_tro_ly?.trim() && !/^[\w.\-:/]{1,100}$/.test(v.model_tro_ly.trim())) loi.push(`Model của trợ lý chat "${v.model_tro_ly}" không hợp lệ (chỉ chữ, số, dấu . - : /)`);
      if (v.moi_phien_gio && !GIO.test(v.moi_phien_gio)) loi.push(`Giờ mồi phiên "${v.moi_phien_gio}" phải dạng HH:MM`);
      if (v.model_vong_cong_cu?.trim() && !/^[\w.\-:/]{1,100}$/.test(v.model_vong_cong_cu.trim())) loi.push(`Model ở vòng tra cứu "${v.model_vong_cong_cu}" không hợp lệ (chỉ chữ, số, dấu . - : /)`);
      for (const m of v.model_them ?? []) if (!/^[\w.\-:/]{1,100}$/.test(m.trim())) loi.push(`Model bổ sung "${m}" không hợp lệ (chỉ chữ, số, dấu . - : /)`);
      break;
    }
    case "tai_khoan": {
      const v = gt as CauHinh["tai_khoan"];
      for (const vt of v.vai_tro_mac_dinh) if (!dm.vaiTro.has(vt)) loi.push(`Vai trò mặc định "${vt}" không tồn tại`);
      if (!Number.isInteger(v.do_dai_mat_khau_toi_thieu) || v.do_dai_mat_khau_toi_thieu < 4) loi.push("Độ dài mật khẩu tối thiểu phải là số nguyên từ 4");
      if (v.danh_sach_dang_nhap && v.bam_la_dang_nhap) loi.push("Không được bật cùng lúc «Màn đăng nhập hiện danh sách tài khoản» và «Bấm tên là đăng nhập luôn»: bật cả hai thì ai cũng vào được tài khoản chưa đổi mật khẩu chỉ bằng một cú bấm. Hãy tắt một trong hai");
      break;
    }
    case "phan_quyen_cau_hinh": {
      const v = gt as CauHinh["phan_quyen_cau_hinh"];
      const khoaCo = new Set(Object.keys(MAC_DINH));
      for (const [k, r] of Object.entries(v.nhom)) {
        if (!khoaCo.has(k)) loi.push(`Phân quyền: không có nhóm cài đặt "${k}"`);
        if (k === "phan_quyen_cau_hinh") loi.push("Phân quyền: nhóm \"Phân quyền cài đặt\" chỉ người có quyền cau_hinh.sua sửa được, không giao riêng");
        for (const d of r.don_vi) if (!dm.donVi.has(d)) loi.push(`Phân quyền nhóm "${k}": đơn vị "${d}" không tồn tại`);
        for (const vt of r.vai_tro) if (!dm.vaiTro.has(vt)) loi.push(`Phân quyền nhóm "${k}": vai trò "${vt}" không tồn tại`);
      }
      break;
    }
  }
}

const laDoiTuong = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Trộn sâu: trường thiếu (ở mọi tầng đối tượng) lấy mặc định; mảng và giá trị đơn giữ nguyên của người dùng. */
function tronSau(md: unknown, v: unknown, duong: string): unknown {
  if (!laDoiTuong(md) || !laDoiTuong(v)) return v;
  if (KHOA_TU_DO.has(duong)) {
    if (!KHOA_TU_DO_TRON_MAC_DINH.has(duong)) return v;
    // Khóa là dữ liệu: thêm khóa mặc định còn thiếu; phần tử mới lấy mẫu của dòng "khac" (hoặc dòng đầu)
    const mauPhanTu = md.khac ?? Object.values(md)[0];
    const kq: Record<string, unknown> = structuredClone(md);
    for (const [k, x] of Object.entries(v)) kq[k] = tronSau(k in md ? md[k] : mauPhanTu, x, `${duong}.*`);
    return kq;
  }
  const kq: Record<string, unknown> = structuredClone(md);
  for (const [k, x] of Object.entries(v)) kq[k] = k in md ? tronSau(md[k], x, `${duong}.${k}`) : x;
  return kq;
}

/**
 * Trộn giá trị lên mặc định: thiếu trường thì lấy mặc định, kể cả trường lồng (vd file cấu hình xuất từ bản cũ
 * chưa có thong_bao.smtp / theo_loai). Trường lạ vẫn giữ để lớp kiểm kiểu báo "trường lạ".
 */
export function tronMacDinh<K extends KhoaCauHinh>(khoa: K, v: CauHinh[K]): CauHinh[K] {
  const md = MAC_DINH[khoa];
  if (Array.isArray(md) || Array.isArray(v) || !v || typeof v !== "object") return v;
  const kq = tronSau(md, v, khoa) as Record<string, unknown>;
  for (const k of TRUONG_DA_BO[khoa] ?? []) delete kq[k]; // cấu hình / tệp xuất bản cũ còn trường đã bỏ: lặng lẽ bỏ, không báo "trường lạ"
  return kq as CauHinh[K];
}

/** Trường đã BỎ khỏi cài đặt. quy_tac_de.cap_ben_ngoai_duoc_de — Mr. Đại chốt 28/09: văn bản đến từ bên ngoài không sinh việc. */
const TRUONG_DA_BO: Partial<Record<KhoaCauHinh, string[]>> = { quy_tac_de: ["cap_ben_ngoai_duoc_de"] };

export async function kiemTra(q: Q, khoa: string, giaTri: unknown): Promise<string[]> {
  if (!(khoa in MAC_DINH)) return [`Không có nhóm cài đặt "${khoa}"`];
  const k = khoa as KhoaCauHinh;
  if (giaTri === undefined || giaTri === null) return ["Chưa có giá trị"];
  const gt = tronMacDinh(k, giaTri as CauHinh[KhoaCauHinh]);
  const loi: string[] = [];
  soKieu(mauKieu(k), gt, k, loi);
  if (loi.length > 0) {
    // sai kiểu thì chưa xét nghiệp vụ; bỏ tiền tố tên nhóm cho dễ đọc (trang Cài đặt tự thêm nhãn tiếng Việt: nhanLoiCauHinh)
    return loi.map((m) => {
      const r = m.slice(k.length).replace(/^\./, "");
      return r.startsWith(":") ? `Giá trị${r}` : r.startsWith("[") ? `Dòng ${r.slice(1).replace("]", "")}` : r;
    });
  }
  kiemNghiepVu(k, gt, await napDanhMuc(q), loi);
  return loi;
}

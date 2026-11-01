// ============================================================
// ⚠ Từ 29/09/2026 (Mr. Đại chốt, mẫu phiên bản 4): việc CHỈ lấy từ bảng mẫu khai "sinh việc" — kiem-tra.ts chỉ gọi
// dongViecTuBangPhu cho bảng vừa được mẫu khai sinh việc vừa có cách đổi ở đây (hiện: Form 5 "Tiến độ chi tiết công
// tác thiết kế"). Bảng Kiến nghị / Sự cố / Cảnh báo / GPMB / An toàn KHÔNG còn sinh việc; phần đổi của chúng giữ lại
// để quản trị khai lại được nếu cần. Mô tả gốc bên dưới.
// kiem-tra/viec-tu-kien-nghi.ts — LẤY VIỆC TỪ CÁC BẢNG PHỤ của báo cáo, để sổ cái ghi HẾT công việc của báo cáo
// (không chỉ bảng "Công việc"). Báo cáo thật có đầu việc nằm rải ở nhiều bảng:
//   · "Vấn đề nổi bật và kiến nghị" (mọi Form) · "Thiết bị & bảo trì — sự cố" (Form 8)
//   · "Cảnh báo đầu tư – tư vấn – thi công" (Form 1; Form 0 là bản tổng hợp nên bỏ — việc đã vào sổ từ báo cáo gốc)
//   · "GPMB & quan hệ địa phương" (Form 7) · "Tiến độ chi tiết công tác thiết kế" (Form 5: hạng mục có ngày kế hoạch)
// Mỗi dòng thành một dòng Công việc chuẩn (ten, du_an, phu_trach, ket_thuc, ket_qua_can_co, da_xong) rồi đi qua đúng
// quy trình kiểm tra + sổ cái. Dòng TRÙNG việc đã có ở bảng Công việc (hoặc ở bảng phụ trước) thì bỏ, báo lại để người gửi biết.
//   · người làm: đơn vị được nhắc trong câu ("Kiến nghị Phòng KT&VH phê duyệt…"), không có → đơn vị lập;
//   · bắt đầu: để trống → ngày lập báo cáo; hạn: đọc từ chữ ("trước 15/08/2026", "trong T8", "T10/2026") hoặc cột ngày
//     kế hoạch; không có hạn → chặn gửi (mọi việc phải có ngày kết thúc);
//   · dòng đã xử lý xong (sự cố đã khắc phục, hồ sơ đã ký, GPMB đã bàn giao) thì không thành việc; hạng mục 100% là việc đã xong.
// Bảng số liệu (KPI, sản lượng, khối lượng, % tiến độ thi công, công nợ, nhân lực…) không phải việc — không lấy.
// ============================================================
import type { DanhBa, MucDanhBa } from "./phan-giai";
import { chuanHoaTen, khongDau } from "./chuan-hoa";
import { chungMa, congNgay, khacSoHieu, tyLeChuaTu } from "@/lib/so-cai/tien-ich";

type Dong = Record<string, string>;

export interface BangPhu {
  tag: string;
  nhan: string;
  /** Bảng của báo cáo tổng hợp (Form 0 có bảng quyết định) thì không lấy — việc đã vào sổ từ báo cáo gốc. */
  bo_qua_khi_tong_hop?: boolean;
  /** Bảng kế hoạch có cấu trúc (mỗi dòng một hạng mục có ngày): không gộp với bảng khác. */
  ke_hoach?: boolean;
  /** Chỉ lấy khi bảng có cột này (cùng tên bảng ở mẫu khác là bảng số liệu thuần) */
  can_cot?: string;
}

/** Bảng phụ sinh việc, theo thứ tự ưu tiên (trùng nội dung thì giữ dòng của bảng trước). */
export const BANG_PHU_SINH_VIEC: BangPhu[] = [
  { tag: "bang_kien_nghi", nhan: "Vấn đề nổi bật và kiến nghị" },
  { tag: "bang_su_co", nhan: "Thiết bị & bảo trì — sự cố" },
  { tag: "bang_canh_bao", nhan: "Cảnh báo đầu tư – tư vấn – thi công", bo_qua_khi_tong_hop: true },
  { tag: "bang_gpmb", nhan: "GPMB & quan hệ địa phương" },
  { tag: "bang_tien_do_tk", nhan: "Tiến độ chi tiết công tác thiết kế", ke_hoach: true },
  // Mẫu SCI-160 (Phòng Cơ điện): cột "Ghi chú / Hành động ngay" có việc kèm ngày ("đặt lịch kiểm định 08/10")
  { tag: "bang_an_toan", nhan: "Cảnh báo an toàn điện, sự cố thiết bị, kiểm định", can_cot: "hanh_dong" },
];

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const cuoiThang = (y: number, m: number) => iso(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
const hopLe = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Không ghi năm: chọn năm cho ngày gần ngày lập nhất (báo cáo 25/09 ghi "trước 31/07" là 31/07 năm nay — đã quá hạn). */
function namGanNhat(namKy: number, moc: string, ngay: (y: number) => string): string {
  const cach = (x: string) => Math.abs(Date.parse(x) - Date.parse(moc));
  return [namKy - 1, namKy, namKy + 1].map(ngay).sort((a, b) => cach(a) - cach(b))[0];
}

/**
 * Hạn đọc từ câu chữ. Hạn đã qua (≤ 6 tháng trước ngày lập) vẫn giữ — việc đó đang quá hạn;
 * ngày xa hơn về trước thì bỏ (thường là ngày sự việc, không phải hạn).
 */
export function docHanTrongChu(chu: string, ngayLap: string | undefined, namKy: number): string | undefined {
  // Khoảng ngày "06–10/10/2026" → ngày cuối "10/10/2026"
  const s = khongDau(chu ?? "")
    .replace(/\s+/g, " ")
    .replace(/\b\d{1,2}\s*[–—-]\s*(\d{1,2}\s*[/.]\s*\d{1,2})/g, "$1");
  if (!s) return undefined;
  const moc = ngayLap ?? iso(namKy, 1, 1);
  const sauMoc = (x: string) => (x >= congNgay(moc, -183) ? x : undefined);
  // "trước 15/08/2026", "hạn 15/8", "chậm nhất ngày 30/9", "dự kiến 15/10", "hẹn kiểm tra 29/09", "lịch FAT: 10/10"
  // Duyệt mọi chỗ khớp: chỗ đầu có thể không phải ngày ("trong Q4/2026 … trước 05/10")
  // Mã WBS "7.5.1" không phải ngày 07/05 (đo 28/09: "gia hạn hạng mục 7.5.1" từng ra hạn giả 07/05/2026) → sau số thứ hai còn ".<số>" thì bỏ
  for (const m of s.matchAll(/\b(?:truoc|han|cham nhat|den|xong|hoan thanh|trong|vao|du kien|hen|lich|ke hoach|kh)\b[^0-9;]{0,24}?(?:ngay\s*)?(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?(?!\d)(?![./-]\d)/g)) {
    const d = Number(m[1]);
    const t = Number(m[2]);
    const y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : namKy;
    if (hopLe(y, t, d) || (!m[3] && hopLe(2028, t, d))) {
      const kq = sauMoc(m[3] ? iso(y, t, d) : namGanNhat(namKy, moc, (n) => (hopLe(n, t, d) ? iso(n, t, d) : iso(n, t, d - 1))));
      if (kq) return kq;
    }
  }
  // Quý: "trong Q4/2026" → cuối quý
  const q = /\bq([1-4])\s*[/.-]\s*(\d{4})\b/.exec(s);
  if (q) {
    const kq = sauMoc(cuoiThang(Number(q[2]), Number(q[1]) * 3));
    if (kq) return kq;
  }
  // "trong T8", "trước tháng 9", "T10/2026", "tháng 8/2026" → cuối tháng ("Trụ T11" không phải tháng)
  const m = /(?:trong|truoc|den|cuoi|het|vao|du kien|ke hoach|kh)\s+(?:thang\s*|t)(\d{1,2})(?:\s*[/.-]\s*(\d{4}))?\b/.exec(s) ?? /\bt(\d{1,2})\s*[/.-]\s*(\d{4})\b/.exec(s) ?? /\bthang\s*(\d{1,2})(?:\s*[/.-]\s*(\d{4}))?\b/.exec(s);
  if (m) {
    const t = Number(m[1]);
    if (t >= 1 && t <= 12) {
      const kq = sauMoc(m[2] ? cuoiThang(Number(m[2]), t) : namGanNhat(namKy, moc, (n) => cuoiThang(n, t)));
      if (kq) return kq;
    }
  }
  // Mr. Đại chốt 28/09/2026 — một cách tính theo tuần lịch (tuần kết thúc Chủ nhật):
  //   "tuần tới / tuần sau" → CHỦ NHẬT tuần sau · "ngay tuần này / trong tuần / cuối tuần" → CHỦ NHẬT tuần lập báo cáo
  const cn = ngayLap ? congNgay(ngayLap, (7 - new Date(`${ngayLap}T00:00:00Z`).getUTCDay()) % 7) : undefined;
  if (/\b(tuan toi|tuan sau)\b/.test(s) && cn) return congNgay(cn, 7);
  if (/\b(tuan nay|trong tuan|cuoi tuan)\b/.test(s) && cn) return cn;
  return undefined;
}

/** Ngày sớm nhất từ ngày lập trở đi xuất hiện trong câu (dd/mm hoặc dd/mm/yyyy, khoảng "06–10/10" lấy ngày cuối). */
export function ngaySapToi(chu: string, ngayLap: string | undefined, namKy: number): string | undefined {
  const moc = ngayLap ?? iso(namKy, 1, 1);
  const s = (chu ?? "").replace(/\b\d{1,2}\s*[–—-]\s*(\d{1,2}\s*[/.]\s*\d{1,2})/g, "$1");
  const ds: string[] = [];
  for (const m of s.matchAll(/(?<![\d/.])(\d{1,2})\s*[/.]\s*(\d{1,2})(?:\s*[/.]\s*(\d{4}))?(?![\d/]|\.\d)/g)) {
    const d = Number(m[1]);
    const t = Number(m[2]);
    if (m[3] ? !hopLe(Number(m[3]), t, d) : !hopLe(2028, t, d)) continue;
    const x = m[3] ? iso(Number(m[3]), t, d) : namGanNhat(namKy, moc, (n) => (hopLe(n, t, d) ? iso(n, t, d) : iso(n, t, d - 1)));
    if (x >= moc) ds.push(x);
  }
  return ds.sort()[0];
}

/** Đơn vị được nhắc trong câu (theo thứ tự xuất hiện), bỏ chỗ phủ định "không cần … TGĐ". */
export function donViTrongChu(chu: string, db: DanhBa): MucDanhBa[] {
  const s = ` ${chuanHoaTen(chu ?? "")} `;
  const gap: { i: number; d: MucDanhBa }[] = [];
  for (const d of db.don_vi) {
    let tot = -1;
    for (const k of d.khoa) {
      if (k.length < 4) continue; // khóa quá ngắn dễ khớp nhầm
      const i = s.indexOf(` ${k} `);
      if (i >= 0 && !/khong can\s*(\S+\s*){0,3}$/.test(s.slice(Math.max(0, i - 30), i)) && (tot < 0 || i < tot)) tot = i;
    }
    if (tot >= 0) gap.push({ i: tot, d });
  }
  return gap.sort((a, b) => a.i - b.i).map((g) => g.d).slice(0, 3);
}

/**
 * Câu ĐỀ NGHỊ / KIẾN NGHỊ lên Ban lãnh đạo ("Đề nghị TGĐ phê duyệt…", "Kiến nghị HĐQT…", "trình Chủ tịch…").
 * Mr. Đại chốt 28/09: việc đó ĐƠN VỊ LẬP chủ trì, Ban lãnh đạo phối hợp (được biết, quyết khi cần).
 * Đo 28/09: khớp 11/59 việc đang mở; 6 việc chỉ nhắc TGĐ mà không phải đề nghị thì không khớp.
 */
const DE_XUAT_BLD =
  /(de nghi|kien nghi|xin y kien|xin chu truong|trinh|de xuat)[^.;]{0,60}?(tgd|tong giam doc|ban lanh dao|bld|hdqt|hoi dong quan tri|chu tich|ptgd|pho tong giam doc|ban tgd)/;
export function laDeXuatBld(chu: string): boolean {
  return DE_XUAT_BLD.test(khongDau(chu ?? "").toLowerCase());
}
export const MA_BLD = "ban-tgd";
const laDonViBld = (id: string | null | undefined) => !!id && (id === MA_BLD || id.startsWith("bld-"));

/**
 * Câu đầu, gọn cho tên việc. Cắt ở " — ", "; ", ". " ; gạch ngắn " – " / " - " chỉ cắt khi nằm ngoài ngoặc và vế trước
 * đủ dài (≥ 8 từ) — tránh cắt "(NCC 2 năm – SCI 5 năm)" hay "phối hợp P.CĐ – P.KT&VH".
 */
function gon(s: string, toiDa = 140): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  let cat = t.length;
  let sau = 0;
  for (const m of t.matchAll(/\s—\s|(?<=\.)\s(?=\p{Lu})|;\s|\s[–-]\s|\s→\s/gu)) {
    const i = m.index ?? 0;
    const truoc = t.slice(0, i);
    const trongNgoac = (truoc.match(/\(/g)?.length ?? 0) > (truoc.match(/\)/g)?.length ?? 0);
    if (/[–-]/.test(m[0]) && (trongNgoac || truoc.split(" ").length < 8)) continue;
    if (i < cat) cat = i;
    sau = m[0].length;
    break;
  }
  void sau;
  const cau = t.slice(0, cat).trim() || t;
  return cau.length > toiDa ? `${cau.slice(0, toiDa - 1).trimEnd()}…` : cau;
}

// ---------------- Nhận ra hai dòng là CÙNG MỘT VIỆC ----------------

export interface ViecSoKhop {
  /** tên ngắn của việc (so phần lớn các từ của nó) */
  ten: string;
  /** toàn bộ chữ liên quan (tên + kiến nghị + ghi chú…) */
  chu: string;
}

/**
 * Hai dòng có phải cùng một việc: ≥ 75% từ có nghĩa (giữ dấu) của tên này có trong chữ của dòng kia (xét cả hai chiều);
 * chung mã nhận diện (T11, R21, NK1…) thì ≥ 50%. Mã / số hiệu khác nhau thì là việc khác
 * (GPMB Trụ T11 ≠ GPMB Trụ T12–T18, thu vốn đợt 4 ≠ đợt 5). Thà để hai việc na ná còn hơn gộp nhầm mất việc.
 */
export function cungMotViec(a: ViecSoKhop, b: ViecSoKhop): boolean {
  if (khacSoHieu(a.ten, b.ten)) return false;
  const r = Math.max(tyLeChuaTu(a.ten, `${b.ten} ${b.chu}`), tyLeChuaTu(b.ten, `${a.ten} ${a.chu}`));
  return r >= (chungMa(a.ten, b.ten) ? 0.5 : 0.75);
}

// ---------------- Đọc từng loại bảng ----------------

const DA_XONG_SU_CO = /\b(da xu ly xong|da khac phuc|da hoan thanh|hoan thanh|da xong|binh thuong)\b/;
const DA_XONG_HO_SO = /(\bda ky\b|\bda ban hanh\b|✓|\bda hoan thanh\b|\bvan hanh binh thuong\b|\bkhong co rui ro\b)/;
const DA_XONG_GPMB = /\b(hoan thanh|da ban giao|da xong|da nhan mat bang)\b/;

/** Dòng Công việc + chữ dùng để so trùng; null = dòng không thành việc. */
type DongPhu = { dong: Dong; so: ViecSoKhop } | null;

function docDong(tag: string, r: Dong, duAnTren: string): DongPhu {
  const g = (k: string) => (r[k] ?? "").replace(/(^|\n)•\s*/g, "$1").replace(/\s+/g, " ").trim(); // bỏ dấu "• " của danh sách Word
  const catTen = (s: string) => (s.length > 140 ? `${s.slice(0, 139).trimEnd()}…` : s);
  switch (tag) {
    case "bang_su_co": {
      const bp = g("bien_phap");
      if (!g("thiet_bi") && !bp) return null;
      const bpK = khongDau(bp);
      if (DA_XONG_SU_CO.test(bpK) && !/\bdang\b/.test(bpK)) return null; // sự cố đã xử lý xong: không thành việc
      // "Hệ thống điều tốc: ghi nhật ký vận hành; sẽ kiểm tra trong đợt bảo dưỡng T10/2026" (bỏ chữ trạng thái đầu câu)
      const viecLam = bp.replace(/^(đang xử lý|theo dõi|đang theo dõi)\s*[—–:-]\s*/i, "").trim();
      return {
        dong: { ten: catTen(`${g("thiet_bi")}${viecLam ? `: ${viecLam}` : ""}`), ket_qua_can_co: bp, _hanh: bp },
        so: { ten: g("thiet_bi") || viecLam, chu: `${g("mo_ta")} ${bp}` },
      };
    }
    case "bang_canh_bao": {
      const hoSo = g("ho_so");
      if (!hoSo) return null;
      const trangThai = khongDau(`${g("tinh_trang")} | ${g("vuong_mac")} | ${g("anh_huong")}`);
      if (DA_XONG_HO_SO.test(trangThai)) return null; // hồ sơ đã xong / không có rủi ro
      const vm = g("vuong_mac").replace(/^[—–-]$/, "");
      return {
        dong: { ten: catTen(hoSo), ...(vm ? { ket_qua_can_co: vm } : {}), _hanh: `${vm} ; ${g("tinh_trang")}`, _phu: hoSo, ...(g("tinh_trang") ? { tinh_trang: g("tinh_trang") } : {}) },
        so: { ten: hoSo, chu: `${g("tinh_trang")} ${vm} ${g("anh_huong")}` },
      };
    }
    case "bang_gpmb": {
      const kv = g("khu_vuc");
      if (!kv) return null;
      if (DA_XONG_GPMB.test(khongDau(g("tinh_trang")))) return null;
      const ten = /^gpmb\b/i.test(kv) ? kv : `GPMB ${kv}`;
      return {
        dong: { ten: catTen(ten), ...(g("vuong_mac") ? { ket_qua_can_co: g("vuong_mac") } : {}), _hanh: `${g("vuong_mac")} ; ${g("tinh_trang")}`, ...(g("tinh_trang") ? { tinh_trang: g("tinh_trang") } : {}) },
        so: { ten, chu: `${g("tinh_trang")} ${g("vuong_mac")}` },
      };
    }
    case "bang_an_toan": {
      // Chỉ dòng có HÀNH ĐỘNG kèm ngày chưa qua (vd "đã đặt lịch kiểm định 08/10", "tổ chức sát hạch 02/10")
      const hd = g("hanh_dong");
      if (!hd || /^(không phát sinh|không có|—|-)\.?$/i.test(hd) || /\bxem mục\b/i.test(hd)) return null;
      return {
        dong: { ten: catTen(hd), ...(g("chi_tieu") ? { chi_tieu: g("chi_tieu") } : {}), _hanh: hd, _can_ngay: "1" },
        so: { ten: hd, chu: g("chi_tieu") },
      };
    }
    case "bang_tien_do_tk": {
      const hm = g("hang_muc");
      if (!hm) return null;
      const ngay = /\d/.test(g("ngay_ke_hoach")) ? g("ngay_ke_hoach") : "";
      const pt = g("pt_ht");
      const xong = /^100\s*%?$/.test(pt);
      return {
        dong: {
          ten: catTen(hm),
          ...(duAnTren ? { du_an: duAnTren } : {}),
          ...(ngay ? { ket_thuc: ngay } : {}),
          ...(xong ? { da_xong: "xong" } : {}),
          ...(pt ? { tien_do: pt } : {}),
          ...(g("ghi_chu") ? { ghi_chu: g("ghi_chu") } : {}),
          _hanh: g("ghi_chu"),
        },
        so: { ten: hm, chu: g("ghi_chu") },
      };
    }
    default: {
      // bang_kien_nghi
      if (!g("noi_dung") && !g("kien_nghi")) return null;
      const ten = gon(g("noi_dung") || g("kien_nghi"));
      return {
        dong: { ten, ...(g("du_an") ? { du_an: g("du_an") } : {}), ...(g("kien_nghi") ? { ket_qua_can_co: g("kien_nghi") } : {}), _hanh: g("kien_nghi"), _phu: g("noi_dung") },
        so: { ten, chu: `${g("noi_dung")} ${g("kien_nghi")}` },
      };
    }
  }
}

/** Ô "Dự án" gộp dòng (để trống = như dòng trên); bỏ phần công suất / giai đoạn: "ĐG Hướng Việt (48 MW)\nGiai đoạn: TKCS" → "ĐG Hướng Việt". */
function tenDuAnGon(s: string): string {
  const dau = (s ?? "").split("\n")[0].trim();
  return dau.replace(/\s*\([^)]*\b(mw|kw)\b[^)]*\)\s*$/i, "").trim();
}

export interface KetQuaBangPhu {
  bang: { tag: string; nhan: string; dong: Dong[] }[];
  /** Dòng bỏ vì trùng việc đã có (bảng Công việc hoặc bảng phụ trước) */
  trung: { tag: string; nhan: string; dong: number; ten: string; voi: string }[];
}

/**
 * Dòng Công việc chuẩn lấy từ các bảng phụ. Trả theo bảng, giữ số dòng gốc (để báo lỗi / đánh dấu đúng dòng):
 * dòng không thành việc giữ chỗ bằng object rỗng. `viecChinh`: việc ở bảng Công việc của báo cáo (để bỏ dòng trùng).
 */
export function dongViecTuBangPhu(
  bang: Record<string, Dong[]>,
  db: DanhBa,
  ngayLap: string | undefined,
  namKy: number,
  tuyChon: { viecChinh?: ViecSoKhop[]; tongHop?: boolean; donViLap?: { id: string; ten: string } | null; chiBang?: string[] } = {},
): KetQuaBangPhu {
  const kq: KetQuaBangPhu = { bang: [], trung: [] };
  const daLay: ViecSoKhop[] = [...(tuyChon.viecChinh ?? [])];
  const soChinh = daLay.length;
  for (const b of BANG_PHU_SINH_VIEC) {
    const hang = bang[b.tag];
    if (tuyChon.chiBang && !tuyChon.chiBang.includes(b.tag)) continue;
    if (!hang?.length || (b.bo_qua_khi_tong_hop && tuyChon.tongHop)) continue;
    if (b.can_cot && !hang.some((r) => b.can_cot! in r)) continue;
    let duAnTren = "";
    const dong = hang.map((r, i): Dong => {
      if (b.tag === "bang_tien_do_tk" && (r.du_an ?? "").trim()) duAnTren = tenDuAnGon(r.du_an);
      const d = docDong(b.tag, r, duAnTren);
      if (!d) return {};
      // Cùng việc đã có (bảng kế hoạch chỉ so với bảng Công việc; bảng khác so cả bảng phụ trước)
      const soVoi = b.ke_hoach ? daLay.slice(0, soChinh) : daLay;
      // Bảng kế hoạch (Tiến độ chi tiết thiết kế — chương sinh việc, Mr. Đại 01/10): chỉ coi là trùng khi TÊN như hệt.
      // Đo 01/10: "Thiết kế bản vẽ thi công móng trụ T9–T12" bị gộp nhầm vào "Rà soát bản vẽ thi công móng trụ T9–T12".
      const trung = soVoi.find((x) => (b.ke_hoach ? chuanHoaTen(d.so.ten) === chuanHoaTen(x.ten) : cungMotViec(d.so, x)));
      if (trung) {
        kq.trung.push({ tag: b.tag, nhan: b.nhan, dong: i + 1, ten: d.dong.ten, voi: trung.ten });
        return {};
      }
      if (!b.ke_hoach) daLay.push(d.so);
      const { _hanh: hanh = "", _phu: phu = "", _can_ngay: canNgay, ...dong } = d.dong;
      let dv = b.ke_hoach ? [] : donViTrongChu(hanh, db).map((x) => x.ten);
      // Đề nghị lên BLĐ: đơn vị lập chủ trì (đứng đầu), đơn vị khác được nhắc + Ban lãnh đạo phối hợp
      const lap = tuyChon.donViLap;
      if (!b.ke_hoach && lap && !laDonViBld(lap.id) && laDeXuatBld(`${hanh} ; ${phu}`)) {
        const bld = db.don_vi.find((x) => x.id === MA_BLD)?.ten;
        const laBld = new Set(db.don_vi.filter((x) => laDonViBld(x.id)).map((x) => x.ten));
        dv = [lap.ten, ...dv.filter((t) => t !== lap.ten && !laBld.has(t)), ...(bld ? [bld] : [])];
      }
      const han = dong.ket_thuc ? undefined : canNgay ? ngaySapToi(hanh, ngayLap, namKy) : (docHanTrongChu(hanh, ngayLap, namKy) ?? docHanTrongChu(phu, ngayLap, namKy));
      if (canNgay && !han) return {}; // ghi chú không kèm ngày sắp tới: chỉ là thông tin, không phải việc
      return {
        ...dong,
        ...(dv.length ? { phu_trach: dv.join("; ") } : {}),
        ...(han ? { ket_thuc: han } : {}),
      };
    });
    if (dong.some((d) => d.ten)) kq.bang.push({ tag: b.tag, nhan: b.nhan, dong });
  }
  return kq;
}

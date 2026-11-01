// ============================================================
// bao-cao-tuan/tinh.ts — CODE TÍNH MỌI CON SỐ của báo cáo tuần (hàm thuần, không LLM, không CSDL).
// Thước: 0 Tài liệu thiết kế/demo-bao-cao-tuan-3004.html (Mr. Đại duyệt 30/09/2026). Cùng đầu vào → cùng đáp số.
//   Tải = Σ điểm việc đang mở đơn vị chủ trì (việc giao đích danh một người tính về đơn vị chính của người đó;
//         chức danh lãnh đạo / Ban TGĐ tính về "bld" = tập thể Ban lãnh đạo)
//   Tải/người = Tải ÷ nhân sự thật (số tài khoản của đơn vị, kể cả kiêm nhiệm)
//   Xong tuần = Σ điểm việc hoàn thành trong tuần · Đúng hạn = điểm xong đúng hạn ÷ điểm xong
//   Nợ quá hạn = Σ điểm × hệ số trễ (≤ mức 1 ngày ×1 · ≤ mức 2 ×2 · hơn ×3)
// ============================================================

export const BLD = "bld";

export interface PhanTinh {
  loai: "nguoi" | "don_vi";
  id: string;
  vai: "chu_tri" | "phoi_hop";
  xong: boolean;
  ket_thuc: string | null;
}
export interface ViecTinh {
  ma: string;
  ten: string;
  du_an: string | null;
  /** tên dự án SCI ĐẦU TƯ của việc (khớp danh mục dự án như menu Dự án); null = không thuộc dự án SCI đầu tư */
  du_an_sci?: string | null;
  /** cột phụ từ báo cáo (Form 5 Tiến độ thiết kế: "% HT" → tien_do, "Ghi chú" → ghi_chu) — AI đọc thêm, code không tính */
  tien_do?: string | null;
  ghi_chu?: string | null;
  trang_thai: "dang_mo" | "hoan_thanh";
  ket_thuc: string | null;
  bat_dau: string | null;
  luon_mo: boolean;
  /** ngày vào sổ (giờ VN, yyyy-mm-dd) */
  tao_ngay: string | null;
  /** ngày hoàn thành (giờ VN) — chỉ việc đã xong */
  xong_ngay: string | null;
  nguon: string | null;
  pt: PhanTinh[];
  /** điểm độ khó 1·2·4·8·13; chưa chấm = null (tính tạm 2 và đếm vào "chưa chấm") */
  diem: number | null;
}
export interface DonViTinh {
  id: string;
  ten: string;
  ten_ngan: string;
  loai: string;
  cap: number;
}
export interface NguoiTinh {
  id: string;
  don_vi_id: string | null;
  don_vi_ids: string[];
}
export interface NopTinh {
  don_vi_id: string;
  /** lần gửi đầu (giờ VN "yyyy-mm-ddTHH:MM") */
  luc: string;
  so_lan: number;
  tai_lieu_id: string;
}
export interface CauHinhTinh {
  don_vi_danh_gia: string[];
  nguong_qua_tai: number;
  nguong_can_bang: number;
  /** % trễ từ mức này trở lên = "trễ nhiều" */
  nguong_tre: number;
  tre_muc_1: number;
  tre_muc_2: number;
}
export interface DauVaoTinh {
  tuan: { so: number; tu: string; den: string };
  /** ngày chốt số (giờ VN) — thường là ngày viết báo cáo */
  hom_nay: string;
  viec: ViecTinh[];
  don_vi: DonViTinh[];
  nguoi: NguoiTinh[];
  nop: NopTinh[];
  /** hạn nộp từng đơn vị ("yyyy-mm-ddTHH:MM") */
  han_nop: Record<string, string>;
  ch: CauHinhTinh;
}

export type Vung = "qua_tai" | "can_bang" | "du_suc" | "chua_du" | "tap_the";
export interface DongDonVi {
  ma: string;
  ten: string;
  nhan_su: number;
  tai: number;
  so_mo: number;
  tai_nguoi: number | null;
  san_luong: number;
  so_xong: number;
  dung_han: number | null;
  no: number;
  so_qua_han: number;
  /** điểm khó (chưa nhân hệ số trễ) của việc đang quá hạn */
  diem_tre: number;
  /** % trễ = diem_tre ÷ tai × 100 (null khi không có việc đang làm) — cách A, Mr. Đại chốt 30/09 */
  pt_tre: number | null;
  /** Năng suất = điểm việc xong trong tuần ÷ nhân sự */
  lam_ra_nguoi: number | null;
  /** % trễ ≥ ngưỡng → vùng ghép "…, trễ nhiều"; dưới → "…, giữ nhịp" */
  tre_nhieu: boolean;
  moi: number;
  phoi_hop: number;
  vung: Vung;
  /** mã việc theo nhóm — cột phải hiện khi bấm */
  ds: { qua_han: string[]; trong_han: string[]; xong: string[]; moi: string[] };
}
export interface KetQuaTinh {
  tuan: { so: number; tu: string; den: string };
  hom_nay: string;
  /** 4 ô số toàn công ty */
  the: { xong: number; moi: number; dang_mo: number; qua_han: number; nop: number; tong_don_vi: number };
  ds_the: { xong: string[]; moi: string[]; qua_han: string[]; trong_han: string[] };
  don_vi: DongDonVi[];
  /** bình quân tải/người của các đơn vị đánh giá, trừ đơn vị cao nhất (để AI so sánh) */
  binh_quan_tai_nguoi_con_lai: number | null;
  /** 6 điểm nóng: nợ quá hạn lớn nhất */
  nong: { ma: string; no: number; tre: number; diem: number }[];
  /** ứng viên "cần anh quyết" do code lọc (AI chọn tối đa 6 và viết lời) */
  ung_vien_quyet: string[];
  du_an: { ten: string; mo: string[]; qua_han: string[] }[];
  nop: { cap: number; han: string; don_vi: { id: string; ten: string; nop: NopTinh | null; truoc_han_gio: number | null; co_tai_khoan: boolean }[] }[];
  /** chi tiết từng việc cần cho cột phải + lời AI (mã → tóm tắt) */
  viec: Record<string, { ten: string; don: string[]; phoi_hop: string[]; han: string | null; tre: number; diem: number; xong_ngay: string | null; du_an: string | null; nguon: string | null; tien_do?: string | null; ghi_chu?: string | null }>;
  chua_cham: number;
  /** ngưỡng đang dùng (Cài đặt) — chú giải vùng + cách tính hiện đúng số */
  nguong: { qua_tai: number; can_bang: number; tre: number; tre_1: number; tre_2: number };
}

const ngay = (s: string) => Date.parse(s.slice(0, 10) + "T00:00:00Z");
export const cachNgay = (a: string, b: string) => Math.round((ngay(b) - ngay(a)) / 864e5);
const laTest = (ten: string) => /test/i.test(ten) || /(^|[\s(])thử([\s:)]|$)/i.test(ten);

export function heSoTre(tre: number, ch: Pick<CauHinhTinh, "tre_muc_1" | "tre_muc_2">): number {
  return tre <= 0 ? 0 : tre <= ch.tre_muc_1 ? 1 : tre <= ch.tre_muc_2 ? 2 : 3;
}

export function vungCua(taiNguoi: number | null, coViec: boolean, ch: Pick<CauHinhTinh, "nguong_qua_tai" | "nguong_can_bang">): Vung {
  if (!coViec || taiNguoi === null) return "chua_du";
  return taiNguoi > ch.nguong_qua_tai ? "qua_tai" : taiNguoi >= ch.nguong_can_bang ? "can_bang" : "du_suc";
}

/** Tên vùng ghép (cách A, Mr. Đại chốt 30/09): "Quá tải, trễ nhiều" */
export function tenVung(r: Pick<DongDonVi, "vung" | "tre_nhieu" | "pt_tre">): string {
  const muc = { qua_tai: "Quá tải", can_bang: "Cân bằng", du_suc: "Dư sức", chua_du: "Chưa đủ dữ liệu", tap_the: "Tập thể" }[r.vung];
  if (r.vung === "chua_du" || r.vung === "tap_the" || r.pt_tre == null) return muc;
  return `${muc}, ${r.tre_nhieu ? "trễ nhiều" : "giữ nhịp"}`;
}

/** Hạn của việc = hạn sớm nhất của phần chủ trì chưa xong, không có thì hạn của việc (như Sơ đồ tổ chức). */
export function hanViec(v: ViecTinh): string | null {
  const ks = v.pt.filter((p) => p.vai === "chu_tri" && !p.xong && p.ket_thuc).map((p) => p.ket_thuc as string).sort();
  return ks[0] ?? v.ket_thuc ?? null;
}

const TU_QUYET = /quyết định|phê duyệt|chủ trương|trình (TGĐ|tổng giám đốc|HĐQT|lãnh đạo)|xin ý kiến|đàm phán|chốt phương án|lựa chọn|đấu thầu hay|gia hạn hoặc/i;

export function tinhBaoCaoTuan(dv: DauVaoTinh): KetQuaTinh {
  const { tuan, hom_nay, ch } = dv;
  const denTinh = tuan.den < hom_nay ? tuan.den : hom_nay;
  const loaiDv = new Map(dv.don_vi.map((d) => [d.id, d]));
  const laBld = (id: string) => ["ban_tgd", "chuc_danh"].includes(loaiDv.get(id)?.loai ?? "");
  const dvNguoi = new Map(dv.nguoi.map((n) => [n.id, n.don_vi_id]));
  /** phần việc → đơn vị tính điểm */
  const donCua = (p: PhanTinh): string => {
    const id = p.loai === "nguoi" ? (dvNguoi.get(p.id) ?? p.id) : p.id;
    return laBld(id) ? BLD : id;
  };
  const danhGia = [...dv.ch.don_vi_danh_gia.filter((id) => loaiDv.has(id)), BLD];
  const nhanSu: Record<string, number> = Object.fromEntries(danhGia.map((id) => [id, 0]));
  for (const n of dv.nguoi) {
    const ids = new Set((n.don_vi_ids.length ? n.don_vi_ids : [n.don_vi_id]).filter((x): x is string => !!x).map((x) => (laBld(x) ? BLD : x)));
    for (const id of ids) if (id in nhanSu) nhanSu[id]++;
  }

  const viecOut: KetQuaTinh["viec"] = {};
  const rows = new Map<string, DongDonVi & { diem_dung: number }>();
  for (const id of danhGia)
    rows.set(id, {
      ma: id,
      ten: id === BLD ? "Ban lãnh đạo" : (loaiDv.get(id)?.ten_ngan ?? id),
      nhan_su: nhanSu[id] ?? 0,
      tai: 0, so_mo: 0, tai_nguoi: null, san_luong: 0, so_xong: 0, dung_han: null, no: 0, so_qua_han: 0, diem_tre: 0, pt_tre: null, lam_ra_nguoi: null, tre_nhieu: false, moi: 0, phoi_hop: 0,
      vung: "chua_du", ds: { qua_han: [], trong_han: [], xong: [], moi: [] }, diem_dung: 0,
    });
  const the = { xong: 0, moi: 0, dang_mo: 0, qua_han: 0 };
  const dsThe: KetQuaTinh["ds_the"] = { xong: [], moi: [], qua_han: [], trong_han: [] };
  const nong: KetQuaTinh["nong"] = [];
  const ungVien: { ma: string; w: number }[] = [];
  const duAn = new Map<string, { mo: string[]; qua_han: string[] }>();
  let chuaCham = 0;

  for (const v of dv.viec) {
    // Tuần đã qua: số chốt TẠI ngày hom_nay — việc vào sổ sau đó chưa tồn tại, việc xong sau đó lúc ấy còn mở
    if (v.tao_ngay && v.tao_ngay > hom_nay) continue;
    const diem = v.diem ?? 2;
    if (v.diem == null) chuaCham++;
    const don = [...new Set(v.pt.filter((p) => p.vai === "chu_tri").map(donCua))];
    const ph = [...new Set(v.pt.filter((p) => p.vai === "phoi_hop").map(donCua))].filter((x) => !don.includes(x));
    const han = hanViec(v);
    const mo = v.trang_thai === "dang_mo" || (!!v.xong_ngay && v.xong_ngay > hom_nay);
    const tre = mo && !v.luon_mo && han ? Math.max(0, cachNgay(han, hom_nay)) : 0;
    const xongTuan = v.trang_thai === "hoan_thanh" && !!v.xong_ngay && v.xong_ngay >= tuan.tu && v.xong_ngay <= denTinh;
    const moiTuan = !!v.tao_ngay && v.tao_ngay >= tuan.tu && v.tao_ngay <= denTinh;
    viecOut[v.ma] = { ten: v.ten, don, phoi_hop: ph, han, tre, diem, xong_ngay: mo ? null : v.xong_ngay, du_an: v.du_an, nguon: v.nguon, ...(v.tien_do ? { tien_do: v.tien_do } : {}), ...(v.ghi_chu ? { ghi_chu: v.ghi_chu } : {}) };
    // ô số toàn công ty
    if (mo) {
      the.dang_mo++;
      if (tre > 0) (the.qua_han++, dsThe.qua_han.push(v.ma));
      else dsThe.trong_han.push(v.ma);
    }
    if (xongTuan) (the.xong++, dsThe.xong.push(v.ma));
    if (moiTuan) (the.moi++, dsThe.moi.push(v.ma));
    const test = laTest(v.ten);
    if (test) continue; // việc thử: không vào điểm đơn vị, điểm nóng, dự án
    // Thống kê dự án: CHỈ dự án SCI đầu tư (Mr. Đại 30/09); dự án chưa có việc tự không hiện
    if (mo && v.du_an_sci) {
      const d = duAn.get(v.du_an_sci) ?? { mo: [], qua_han: [] };
      d.mo.push(v.ma);
      if (tre > 0) d.qua_han.push(v.ma);
      duAn.set(v.du_an_sci, d);
    }
    if (mo) {
      if (tre > 0) nong.push({ ma: v.ma, no: diem * heSoTre(tre, ch), tre, diem });
      if (TU_QUYET.test(v.ten) || (tre > ch.tre_muc_2 && diem >= 8)) ungVien.push({ ma: v.ma, w: diem * 10 + Math.min(tre, 99) / 10 });
    }
    for (const k of don) {
      const r = rows.get(k);
      if (!r) continue;
      if (mo) {
        r.tai += diem;
        r.so_mo++;
        if (tre > 0) (r.so_qua_han++, (r.diem_tre += diem), (r.no += diem * heSoTre(tre, ch)), r.ds.qua_han.push(v.ma));
        else r.ds.trong_han.push(v.ma);
      }
      if (xongTuan) {
        r.san_luong += diem;
        r.so_xong++;
        r.ds.xong.push(v.ma);
        if (!v.ket_thuc || (v.xong_ngay as string) <= v.ket_thuc) r.diem_dung += diem;
      }
      if (moiTuan) (r.moi++, r.ds.moi.push(v.ma));
    }
    if (mo) for (const k of ph) { const r = rows.get(k); if (r) r.phoi_hop++; }
  }

  const donVi: DongDonVi[] = [...rows.values()].map(({ diem_dung, ...r }) => {
    const tai_nguoi = r.ma === BLD || !r.nhan_su ? null : Math.round((10 * r.tai) / r.nhan_su) / 10;
    const pt_tre = r.tai ? Math.round((100 * r.diem_tre) / r.tai) : null;
    return {
      ...r,
      tai_nguoi,
      pt_tre,
      lam_ra_nguoi: r.ma === BLD || !r.nhan_su ? null : Math.round((10 * r.san_luong) / r.nhan_su) / 10,
      tre_nhieu: pt_tre !== null && pt_tre >= ch.nguong_tre,
      dung_han: r.san_luong ? Math.round((100 * diem_dung) / r.san_luong) : null,
      vung: r.ma === BLD ? "tap_the" : vungCua(tai_nguoi, r.so_mo + r.so_xong > 0, ch),
    };
  });
  const coTai = donVi.filter((r) => r.tai_nguoi !== null && r.so_mo > 0).sort((a, b) => (b.tai_nguoi as number) - (a.tai_nguoi as number));
  const conLai = coTai.slice(1);
  const binhQuan = conLai.length ? Math.round((10 * conLai.reduce((n, r) => n + (r.tai_nguoi as number), 0)) / conLai.length) / 10 : null;

  // Nộp báo cáo theo cấp (đơn vị trên sơ đồ, không gồm chức danh)
  const nopCua = new Map(dv.nop.map((n) => [n.don_vi_id, n]));
  const nopCap: KetQuaTinh["nop"] = [];
  // Đơn vị chưa ai có tài khoản (vd. các BĐH 30/09) thì không thể nộp — báo cáo không được nhắc họ
  const coNguoi = new Set(dv.nguoi.flatMap((n) => [n.don_vi_id, ...n.don_vi_ids].filter(Boolean) as string[]));
  for (const cap of [1, 2, 3, 4]) {
    const ds = dv.don_vi.filter((d) => d.cap === cap && d.loai !== "chuc_danh");
    if (!ds.length) continue;
    const han = dv.han_nop[ds[0].id] ?? "";
    nopCap.push({
      cap,
      han,
      don_vi: ds.map((d) => {
        const n = nopCua.get(d.id) ?? null;
        const h = dv.han_nop[d.id] ?? han;
        return { id: d.id, ten: d.ten_ngan || d.ten, nop: n, truoc_han_gio: n && h ? Math.round((Date.parse(h + ":00Z") - Date.parse(n.luc + ":00Z")) / 36e5) : null, co_tai_khoan: coNguoi.has(d.id) };
      }),
    });
  }
  const tongDv = nopCap.reduce((a, c) => a + c.don_vi.length, 0);
  const daNop = nopCap.reduce((a, c) => a + c.don_vi.filter((d) => d.nop).length, 0);

  return {
    tuan,
    hom_nay,
    the: { ...the, nop: daNop, tong_don_vi: tongDv },
    ds_the: dsThe,
    don_vi: donVi,
    binh_quan_tai_nguoi_con_lai: binhQuan,
    nong: nong.sort((a, b) => b.no - a.no || b.tre - a.tre || a.ma.localeCompare(b.ma)).slice(0, 6),
    ung_vien_quyet: ungVien.sort((a, b) => b.w - a.w || a.ma.localeCompare(b.ma)).slice(0, 15).map((x) => x.ma),
    du_an: [...duAn.entries()].map(([ten, x]) => ({ ten, ...x })).sort((a, b) => b.mo.length - a.mo.length || a.ten.localeCompare(b.ten)),
    nop: nopCap,
    viec: viecOut,
    chua_cham: chuaCham,
    nguong: { qua_tai: ch.nguong_qua_tai, can_bang: ch.nguong_can_bang, tre: ch.nguong_tre, tre_1: ch.tre_muc_1, tre_2: ch.tre_muc_2 },
  };
}

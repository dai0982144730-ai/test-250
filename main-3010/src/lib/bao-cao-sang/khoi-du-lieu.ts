// ============================================================
// SỐ CỦA TỪNG KHỐI BÁO CÁO SÁNG — kiểu + bộ đọc câu trả lời agent  (file THUẦN — luật 10)
// MD: KE-HOACH/23 (Mr. Đại chốt 17/10/2026). Phần ĐI HỎI ở gom-khoi.ts; phần IN ở khoi-telegram.ts.
//
// ⛔ Main CHỈ ÁNH XẠ (phân vai 06/09): số ngày, số tiền, cờ đều lấy nguyên từ agent chủ. Bộ đọc ở đây chỉ đổi tên
//    trường + kiểu; thiếu / sai kiểu → null («chưa có số»), KHÔNG thay 0, KHÔNG đoán.
// Ngoại lệ có chủ đích (đã có tiền lệ, ghi rõ chỗ dùng): đếm dòng, cộng tiền các hợp đồng CÙNG dự án khi MỌI hợp đồng
// đều có số (luật gom.ts tienMotDuAn), lấy điểm cuối ngày của sổ mốc COD.
// ============================================================

import type { MaKhoi } from "./khoi";
import type { LechNgay } from "@/lib/scurve-kieu";

/** Một khối của một dự án: có số, hoặc câu vì sao chưa có */
export type KetKhoi<T> = { ok: true; so: T } | { ok: false; loi: string };

// ─────────────────────────────────────────────────────────────
// Kiểu số từng khối
// ─────────────────────────────────────────────────────────────

/** TQ-2 — mỗi ngày một điểm (điểm cuối ngày giờ VN — Tiến độ chọn, `tiendo.lich_su_du_bao` theo_ngay) */
export interface KhoiXuThe {
  diem: { ngay: string; cod: string }[];
  /** Số điểm lạ Tiến độ đã bỏ khỏi đường (chốt 4) + một dòng chú thích Tiến độ viết sẵn */
  soDiemLa: number;
  chuThichDiemLa: string | null;
  /** Số ngày có điểm ghi «cách cũ trước 24/09» — không vẽ (khác cách tính) */
  boCachCu: number;
  codMucTieu: string | null;
  codBaseline: string | null;
}

export interface HangMucTuLam {
  wbs: string;
  ten: string;
  duBaoXong: string | null;
  baselineXong: string | null;
  /** null = chưa có Baseline đã duyệt */
  tuLamCodCham: number | null;
  trongDoThoiTiet: number | null;
  soViecGang: number;
}

export interface ViecGangTre {
  wbs: string;
  ten: string;
  /** Ngày xong của hệ so sánh (Baseline đã duyệt; dự án chưa duyệt thì tiến độ đang lập — xem `heSo`) */
  heXong: string | null;
  duBaoXong: string | null;
  soNgayTre: number | null;
  lyDo: string | null;
}

/** TQ-3 · RQ-2 · DA-2 — một lượt `tiendo.duong_gang` */
export interface KhoiGang {
  codDuBao: string | null;
  codMucTieu: string | null;
  codBaseline: string | null;
  lechMucTieu: number | null;
  lechBaseline: number | null;
  /** Câu Tiến độ viết sẵn (TQ-3) */
  tachCau: string | null;
  /** Ba số của câu tách (Tiến độ tính) — null = cổng chưa trả / thiếu một hệ */
  tachSo: { tong: number; baselineSoMucTieu: number; thucHien: number } | null;
  hangMuc: HangMucTuLam[];
  soGangToiCod: number | null;
  soGangDangTre: number | null;
  gangTre: ViecGangTre[];
}

/** TQ-4 — tiền một dự án (đồng; null = chưa có số) */
export interface KhoiTien {
  giaTriHd: number | null;
  soHd: number | null;
  viSaoHd: string | null;
  daThanhToan: number | null;
  sanLuong: number | null;
  sanLuongToi: string | null;
  viSaoSanLuong: string | null;
  daLenPhieu: number | null;
  soPhieu: number | null;
  viSaoPhieu: string | null;
}

/** RQ-3 — một giả định */
export interface DongThuCod {
  /** «Riêng 6.1.4 Cung cấp Hub… về đúng Baseline» */
  nhan: string;
  codSau: string | null;
  /** Số ngày COD kéo về so với COD dự báo hôm nay: dương = sớm hơn (Tiến độ tính) */
  keoVe: number | null;
  chamMucTieuSau: number | null;
  giaiThich: string | null;
  /** COD không đổi thì vì sao (Tiến độ viết: việc không găng / có dự trữ / găng chuyển sang việc khác…) */
  lyDoKhongDoi: string | null;
  loi: string | null;
}

export interface KhoiThuCod {
  codNay: string | null;
  chamMucTieuNay: number | null;
  dong: DongThuCod[];
}

/** RQ-4 — một hợp đồng (agent Hợp đồng tính chênh — chốt 5) */
export interface DongPhieuSoSanLuong {
  ma: string;
  ten: string;
  nhaThau: string;
  soPhieuCho: number | null;
  soIssueMo: number | null;
  phieuLuyKe: number | null;
  sanLuong: number | null;
  sanLuongToi: string | null;
  chenh: number | null;
  /** Câu Hợp đồng viết sẵn (một dòng Telegram, mã kèm tên) */
  cau: string | null;
  cauNgayChot: string | null;
}

export interface KhoiPhieuSoSanLuong {
  tong: Omit<DongPhieuSoSanLuong, "ma" | "nhaThau" | "cauNgayChot"> & { soHopDong: number | null; viSaoChuaCo: string | null };
  hopDong: DongPhieuSoSanLuong[];
}

/** RQ-5 */
export interface DongHoSo {
  ma: string;
  ten: string;
  coQuan: string | null;
  han: string | null;
  /** «hạn phải có» … — tên hạn Pháp lý trả (luật 36) */
  soVoi: string | null;
  quaHan: number | null;
}

export interface KhoiHoSo {
  tongPhaiCo: number | null;
  soThieu: number | null;
  dong: DongHoSo[];
}

/** RQ-6 */
export interface DongTaiViec {
  ten: string;
  /** người · phòng · đơn vị · chức danh lãnh đạo (cổng 3004 từ 26/10; thiếu = chưa rõ) */
  loai?: string;
  dangMo: number;
  quaHan: number;
  viecGang: number | null;
  /** Việc quá hạn lâu nhất của người này (so với hạn giao việc) */
  treNhat: { ma: string; ten: string; han: string | null; quaHan: number } | null;
}

export interface KhoiTaiViec {
  soNguoi: number;
  /** false = cổng cắt bớt người — không cộng hàng tổng */
  du: boolean;
  nguoi: DongTaiViec[];
  chuaGiao: { dangMo: number; quaHan: number } | null;
}

/** DA-3 — số + bốn đường (điểm theo tuần + điểm đặc biệt, đã có ngày) */
export interface KhoiSCurve {
  duong: { muc: "muc-tieu" | "baseline" | "thuc-te" | "du-bao"; diem: { ngay: string; pct: number }[] }[];
  ngayCat: string | null;
  /** % khối lượng từng đường tại ngày cắt */
  tai: { mucTieu: number | null; baseline: number | null; thucTe: number | null };
  /** Thực tế tại ngày cắt lệch so với Tiến độ mục tiêu (Tiến độ tính, âm = chậm — scurve-kieu.ts) */
  lechThucTe: LechNgay;
  dat100: { mucTieu: string | null; baseline: string | null; duBao: string | null };
  cauTapViec: string | null;
}

/** DA-4 — dòng đang thi công (cach_du_bao = nang-suat-thuc) */
export interface DongThiCong {
  wbs: string;
  ten: string;
  thauPhu: string;
  donVi: string;
  nsBaseline: number | null;
  ns7: number | null;
  duBaoXong: string | null;
  baselineXong: string | null;
  /** Dương = chậm so với Baseline (Tiến độ tính); null = cổng chưa trả */
  treSoBaseline: number | null;
}

export interface KhoiThiCong {
  ngayDanhGia: string | null;
  dong: DongThiCong[];
}

/** NT-1 — lịch nghiệm thu hôm nay + ngày mai (Nghiệm thu nghiemthu.lich_nghiem_thu) */
export interface DongMoiNghiemThu {
  gioBd: string;
  gioKt: string;
  nhaThau: string | null;
  maBb: string;
  tenBb: string;
  viTri: string | null;
  trangThai: string;
}
export interface NgayMoiNghiemThu {
  ngay: string;
  nhan: string;
  moi: DongMoiNghiemThu[];
}
export interface KhoiLichNghiemThu {
  lich: NgayMoiNghiemThu[];
}

/** TQ-1 cột hạn chủ trương (Pháp lý) */
export interface KhoiHanChuTruong {
  /** 0 = còn trong hạn · null = chưa so được */
  soNgayVuot: number | null;
  soVoi: string | null;
  cau: string | null;
}

/** TQ-5 — câu 🤖 của Bảng điều hành (đã qua lưới luật 36) */
export interface KhoiCauAi {
  cau: string | null;
  loi: string | null;
}

/** NT-2 · NT-3 — một lượt `nghiemthu.so_lieu_sang` (Nghiệm thu tính; Main chỉ in) */
export interface KhoiSoLieuNghiemThu {
  /** Lúc Nghiệm thu tính số này (ISO) — cũ hơn 30 phút thì agent đang tính lại nền */
  tinhLuc: string | null;
  ngayThiCongMoiNhat: string | null;
  noQuaHan: { soThe: number; nguongNgay: number | null; cac: { tieuDe: string; muc: string }[] };
  phieuChoKy: { soThe: number; nguongGio: number | null; cac: { tieuDe: string; muc: string }[] };
}

/** CT-1 — một thầu phụ trong kỳ (`tiendo.nguon_luc_huy_dong`) */
export interface DongNguonLuc {
  thauPhu: string;
  soNgayCoBc: number | null;
  nhanCongBinhQuan: number | null;
  mayChinhBinhQuan: number | null;
}
export interface KhoiNguonLuc {
  tuNgay: string;
  denNgay: string;
  /** Kỳ kết thúc trước hôm qua vì chưa có báo cáo ngày mới hơn — số ngày cũ so với hôm qua (0 = kỳ tới hôm qua) */
  cuNgay: number;
  dong: DongNguonLuc[];
  /** Cam kết trong hợp đồng: có số hay chỉ bằng lời (hopdong.cam_ket_nha_thau). null = không hỏi được */
  camKet: { hopDong: string; nhaThau: string; nhanCong: number | null; may: number | null; lyDoChuaCo: string | null }[] | null;
}

/** CT-2 — báo cáo ngày gần nhất (`tiendo.nhat_ky_thi_cong`) */
export interface KhoiNhatKy {
  /** Ngày báo cáo được lấy (mới nhất có trong kỳ) */
  ngay: string;
  cuNgay: number;
  bao: {
    nhaThau: string;
    thoiTiet: string | null;
    anhHuongThoiTiet: string | null;
    soNhanCong: number;
    soMay: number;
    viec: { ten: string; kl: number | null; donVi: string | null; tinhTrang: string | null }[];
    ngoaiBoq: { ten: string; kl: number | null; donVi: string | null }[];
    vuongMac: { ten: string; vuongMac: string; giaiPhap: string | null }[];
  }[];
}

/** VS-1 — `tiendo.viec_trong_khoang`: việc sắp tới */
export interface KhoiViecSapToi {
  tuNgay: string;
  denNgay: string;
  /** Ngày Tiến độ đánh giá bộ số này (có thể cũ hơn hôm nay) */
  ngayDanhGia: string | null;
  tongSo: number;
  soGang: number;
  viec: {
    ten: string;
    nhom: string | null;
    nhaThau: string | null;
    gang: boolean;
    laMoc: boolean;
    duBaoBatDau: string | null;
    duBaoXong: string | null;
    chamBaseline: number | null;
    cauBaseline: string | null;
  }[];
}

/** PL-2 — `phaply.lich_ho_so`: hồ sơ sắp đến hạn */
export interface KhoiLichHoSo {
  khoang: string;
  quaHan: number | null;
  hoSo: { ten: string; thuMuc: string | null; coQuan: string | null; han: string | null; tinhHinh: string | null; trangThai: string | null; dangCho: string | null }[];
}

/** NT-3 dòng đầu — `nghiemthu.doi_chieu_khoi_luong`: thi công so với nghiệm thu toàn dự án (Nghiệm thu tính) */
export interface KhoiDoiChieuKl {
  ngaySoThiCong: string | null;
  ptThiCong: number | null;
  ptNghiemThu: number | null;
  ptConNo: number | null;
  bienBanXong: string | null;
  soHangMuc: number | null;
}

export interface DuLieuKhoiDuAn {
  viecSapToi?: KetKhoi<KhoiViecSapToi>;
  lichHoSo?: KetKhoi<KhoiLichHoSo>;
  doiChieuKl?: KetKhoi<KhoiDoiChieuKl>;
  soLieuNt?: KetKhoi<KhoiSoLieuNghiemThu>;
  nguonLuc?: KetKhoi<KhoiNguonLuc>;
  nhatKy?: KetKhoi<KhoiNhatKy>;
  xuThe?: KetKhoi<KhoiXuThe>;
  gang?: KetKhoi<KhoiGang>;
  tien?: KetKhoi<KhoiTien>;
  cauAi?: KhoiCauAi;
  thuCod?: KetKhoi<KhoiThuCod>;
  phieuGia?: KetKhoi<KhoiPhieuSoSanLuong>;
  hoSo?: KetKhoi<KhoiHoSo>;
  taiViec?: KetKhoi<KhoiTaiViec>;
  sCurve?: KetKhoi<KhoiSCurve>;
  thiCong?: KetKhoi<KhoiThiCong>;
  lichNt?: KetKhoi<KhoiLichNghiemThu>;
  hanChuTruong?: KetKhoi<KhoiHanChuTruong>;
}

/** Cột RQ-1 «xử lý riêng việc này kéo COD về được N ngày» (chốt 2) */
export interface KeoVeCod {
  /** Dương = COD sớm lên so với COD dự báo hôm nay (Tiến độ tính) */
  soNgay: number | null;
  codSau: string | null;
  /** COD không đổi thì vì sao — câu Tiến độ viết */
  lyDo?: string | null;
  loi: string | null;
}

/** Lưu cùng bản báo cáo (BaoCaoSang.khoi) — chỉ khối có người dùng mới được gom */
export interface DuLieuKhoi {
  /** Khối → các dự án đã gom (thiếu cặp nào thì gom bổ sung khi gửi — người kéo thêm khối sau 06:30) */
  daGom: Partial<Record<MaKhoi, string[]>>;
  theoDuAn: Record<string, DuLieuKhoiDuAn>;
  /** Khoá `${maDuAn}|${wbs}` */
  keoVe: Record<string, KeoVeCod>;
  gomLuc: string;
}

export const khoaKeoVe = (maDuAn: string, wbs: string): string => `${maDuAn}|${wbs}`;

// ─────────────────────────────────────────────────────────────
// Bộ đọc — đầu vào là `du_lieu` của câu trả lời MCP (đã ok)
// ─────────────────────────────────────────────────────────────

type O = Record<string, unknown>;
const laO = (v: unknown): v is O => typeof v === "object" && v !== null && !Array.isArray(v);
const so = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const chu = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const ngay = (v: unknown): string | null => {
  const s = chu(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const mang = (v: unknown): O[] => (Array.isArray(v) ? v.filter(laO) : []);

/**
 * TQ-2. Đọc `tiendo.lich_su_du_bao` gọi kèm `theo_ngay: true`: Tiến độ đã lấy điểm cuối ngày (giờ VN) và BỎ điểm lạ
 * (chốt 4 — luật điểm lạ ở agent Tiến độ, Main không tự đoán). Cổng cũ chưa có `theo_ngay` → lấy `moc`, bỏ điểm có cờ
 * `diem_la`, điểm cuối ngày theo `ngayVnCua`. Điểm ghi «cách cũ» không vẽ.
 */
export function docXuThe(
  du: unknown,
  ngayVnCua: (iso: string) => string,
  codMucTieu: string | null,
  codBaseline: string | null,
): KhoiXuThe {
  const d = laO(du) ? du : {};
  const cachCu = (x: O) => /^cách cũ/i.test(String(x.cach_tinh ?? ""));
  let diem: KhoiXuThe["diem"] = [];
  let boCachCu = 0;
  let soDiemLa = so(d.so_diem_la_da_bo) ?? 0;
  if (Array.isArray(d.theo_ngay)) {
    for (const x of mang(d.theo_ngay)) {
      const nd = ngay(x.ngay);
      const cod = ngay(x.cod_du_bao);
      if (!nd || !cod) continue;
      if (cachCu(x)) boCachCu += 1;
      else diem.push({ ngay: nd, cod });
    }
  } else {
    const theoNgay = new Map<string, { td: string; cod: string; cu: boolean }>();
    soDiemLa = 0;
    for (const x of mang(d.moc)) {
      const td = chu(x.thoi_diem);
      const cod = ngay(x.cod_du_bao);
      if (!td || !cod) continue;
      if (x.diem_la === true) {
        soDiemLa += 1;
        continue;
      }
      const nd = ngayVnCua(td);
      const cu = theoNgay.get(nd);
      if (!cu || td > cu.td) theoNgay.set(nd, { td, cod, cu: cachCu(x) });
    }
    for (const [nd, x] of Array.from(theoNgay.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      if (x.cu) boCachCu += 1;
      else diem.push({ ngay: nd, cod: x.cod });
    }
  }
  diem = diem.sort((a, b) => a.ngay.localeCompare(b.ngay));
  return { diem, soDiemLa, chuThichDiemLa: chu(d.chu_thich_diem_la), boCachCu, codMucTieu, codBaseline };
}

export function docGang(du: unknown): KhoiGang {
  const d = laO(du) ? du : {};
  const ts = laO(d.tach_cham_cod_so) ? d.tach_cham_cod_so : null;
  const tachSo =
    ts && so(ts.tong_ngay) !== null && so(ts.baseline_so_muc_tieu_ngay) !== null && so(ts.thuc_hien_so_baseline_ngay) !== null
      ? { tong: so(ts.tong_ngay)!, baselineSoMucTieu: so(ts.baseline_so_muc_tieu_ngay)!, thucHien: so(ts.thuc_hien_so_baseline_ngay)! }
      : null;
  return {
    codDuBao: ngay(d.cod_du_bao),
    codMucTieu: ngay(d.cod_muc_tieu),
    codBaseline: ngay(d.cod_baseline),
    lechMucTieu: so(d.lech_ngay_so_muc_tieu),
    lechBaseline: so(d.lech_ngay_so_baseline),
    tachCau: chu(d.tach_cham_cod),
    tachSo,
    // Cổng đã xếp tự làm COD chậm nhiều nhất lên đầu — giữ nguyên thứ tự
    hangMuc: mang(d.hang_muc_tu_lam_cod_cham).map((h) => ({
      wbs: chu(h.wbs) ?? "",
      ten: chu(h.ten) ?? "",
      duBaoXong: ngay(h.du_bao_xong),
      baselineXong: ngay(h.baseline_xong),
      tuLamCodCham: so(h.tu_lam_cod_cham_ngay),
      trongDoThoiTiet: so(h.trong_do_thoi_tiet_ngay),
      soViecGang: so(h.so_viec_gang) ?? 0,
    })),
    soGangToiCod: so(d.so_viec_gang_toi_cod) ?? so(d.so_viec_gang),
    soGangDangTre: so(d.so_viec_gang_dang_tre),
    gangTre: mang(d.viec_gang_dang_tre).map((v) => ({
      wbs: chu(v.wbs) ?? "",
      ten: chu(v.ten) ?? "",
      heXong: ngay(v.baseline_xong) ?? ngay(v.ke_hoach_xong),
      duBaoXong: ngay(v.du_bao_xong),
      soNgayTre: so(v.so_ngay_tre),
      lyDo: chu(v.ly_do_du_bao),
    })),
  };
}

/**
 * TQ-4. `luyKe` = hopdong.gia_tri_luy_ke · `chiPhi` = hopdong.chi_phi_theo_hop_dong · `sanLuong` = tiendo.san_luong_hop_dong.
 * Câu trả lời hỏng thì truyền chuỗi lỗi — ô đó «chưa có số» kèm lý do.
 */
export function docTien(luyKe: unknown | string, chiPhi: unknown | string, sanLuong: unknown | string): KhoiTien {
  const lk = typeof luyKe === "string" ? null : laO(luyKe) ? luyKe : {};
  const cp = typeof chiPhi === "string" ? null : laO(chiPhi) ? chiPhi : {};
  const sl = typeof sanLuong === "string" ? null : laO(sanLuong) ? sanLuong : {};
  // Đã lên phiếu giá: cộng các hợp đồng CHỈ khi mọi hợp đồng đều có số (luật gom.ts tienMotDuAn — không cộng thiếu)
  let daLenPhieu: number | null = null;
  let soPhieu: number | null = null;
  let viSaoPhieu: string | null = typeof chiPhi === "string" ? chiPhi : null;
  if (cp) {
    const hd = mang(cp.hop_dong);
    const coSo = hd.filter((h) => so(h.chi_phi_luy_ke) !== null);
    if (hd.length === 0) viSaoPhieu = "chưa có hợp đồng nào có phiếu giá";
    else if (coSo.length < hd.length) {
      const thieu = hd.filter((h) => so(h.chi_phi_luy_ke) === null);
      viSaoPhieu = `${thieu.length}/${hd.length} hợp đồng chưa có số — không cộng thiếu (${thieu.map((h) => chu(h.vi_sao_chua_co) ?? chu(h.ma) ?? "").filter(Boolean).slice(0, 2).join("; ")})`;
    } else {
      daLenPhieu = coSo.reduce((s, h) => s + (so(h.chi_phi_luy_ke) ?? 0), 0);
      soPhieu = hd.reduce((s, h) => s + (so(h.so_phieu_gia) ?? 0), 0);
    }
  }
  const tongSl = sl && laO(sl.tong_du_an) ? sl.tong_du_an : null;
  return {
    giaTriHd: lk ? so(lk.gia_tri_hop_dong) : null,
    soHd: lk ? so(lk.so_hop_dong) : null,
    viSaoHd: typeof luyKe === "string" ? luyKe : lk && so(lk.gia_tri_hop_dong) === null ? (chu(lk.vi_sao_chua_co_so) ?? "agent Hợp đồng chưa có số") : null,
    daThanhToan: lk ? so(lk.da_thanh_toan) : null,
    sanLuong: tongSl ? so(tongSl.luy_ke) : null,
    sanLuongToi: sl ? ngay(sl.ngay_cat) : null,
    viSaoSanLuong: typeof sanLuong === "string" ? sanLuong : tongSl && so(tongSl.luy_ke) !== null ? null : "agent Tiến độ chưa có sản lượng lũy kế",
    daLenPhieu,
    soPhieu,
    viSaoPhieu,
  };
}

/** RQ-3 / chốt 2 — một câu trả lời `tiendo.gia_dinh_cod` */
export function docGiaDinh(du: unknown, nhan: string): DongThuCod {
  const d = laO(du) ? du : {};
  const chenh = so(d.chenh_ngay);
  return {
    nhan,
    codSau: ngay(d.cod_sau),
    keoVe: so(d.cod_keo_ve_ngay) ?? (chenh === null ? null : -chenh),
    chamMucTieuSau: so(d.cham_muc_tieu_sau),
    giaiThich: chu(d.giai_thich),
    // Tiến độ trả `ly_do_khong_doi` là DANH SÁCH câu (mỗi việc một câu) — ghép lại; găng chuyển thì lấy câu của nó trước
    lyDoKhongDoi:
      (laO(d.gang_chuyen) ? chu(d.gang_chuyen.cau) : null) ??
      (Array.isArray(d.ly_do_khong_doi) ? chu(d.ly_do_khong_doi.filter((x): x is string => typeof x === "string").join("; ")) : chu(d.ly_do_khong_doi)),
    loi: null,
  };
}

export function docPhieuSoSanLuong(du: unknown): KhoiPhieuSoSanLuong {
  const d = laO(du) ? du : {};
  const t = laO(d.tong) ? d.tong : {};
  return {
    tong: {
      ten: chu(t.nhan) ?? "",
      soHopDong: so(t.so_hop_dong),
      soPhieuCho: so(t.so_phieu_dang_cho),
      soIssueMo: so(t.so_issue_dang_mo),
      phieuLuyKe: so(t.phieu_luy_ke),
      sanLuong: so(t.san_luong_luy_ke),
      sanLuongToi: ngay(t.san_luong_tinh_toi),
      chenh: so(t.chenh),
      cau: chu(t.cau),
      viSaoChuaCo: chu(t.vi_sao_chua_co),
    },
    hopDong: mang(d.hop_dong).map((h) => ({
      ma: chu(h.ma_hop_dong) ?? "",
      ten: chu(h.ten) ?? "",
      nhaThau: chu(h.nha_thau) ?? "",
      soPhieuCho: so(h.so_phieu_dang_cho),
      soIssueMo: so(h.so_issue_dang_mo),
      phieuLuyKe: so(h.phieu_luy_ke),
      sanLuong: so(h.san_luong_luy_ke),
      sanLuongToi: ngay(h.san_luong_tinh_toi),
      chenh: so(h.chenh),
      cau: chu(h.cau),
      cauNgayChot: chu(h.cau_ngay_chot),
    })),
  };
}

export function docHoSo(du: unknown): KhoiHoSo {
  const d = laO(du) ? du : {};
  return {
    tongPhaiCo: so(d.tong_ho_so_phai_co),
    soThieu: so(d.so_thieu),
    // Pháp lý đã xếp quá hạn nhiều nhất lên đầu
    dong: mang(d.ho_so_thieu).map((h) => ({
      ma: chu(h.ma_ho_so) ?? "",
      ten: chu(h.ten) ?? "",
      coQuan: chu(h.co_quan_dang_giu),
      han: ngay(h.han),
      soVoi: chu(h.so_voi),
      quaHan: so(h.so_ngay_qua_han),
    })),
  };
}

export function docTaiViec(du: unknown): KhoiTaiViec {
  const d = laO(du) ? du : {};
  const nguoi = mang(d.nguoi).map((n): DongTaiViec => {
    const nang = mang(n.viec_nang).filter((v) => (so(v.qua_han_ngay) ?? 0) > 0);
    const tre = nang.sort((a, b) => (so(b.qua_han_ngay) ?? 0) - (so(a.qua_han_ngay) ?? 0))[0];
    return {
      ten: chu(n.ho_ten) ?? chu(n.ma_base) ?? "chưa rõ tên",
      loai: chu(n.loai) ?? undefined,
      dangMo: so(n.dang_mo) ?? 0,
      quaHan: so(n.qua_han) ?? 0,
      viecGang: so(n.viec_gang),
      treNhat: tre ? { ma: chu(tre.ma_viec_base) ?? "", ten: chu(tre.ten_gon) ?? chu(tre.ten) ?? "", han: ngay(tre.han), quaHan: so(tre.qua_han_ngay) ?? 0 } : null,
    };
  });
  const soNguoi = so(d.so_nguoi) ?? nguoi.length;
  const cg = laO(d.chua_giao_cho_ai) ? d.chua_giao_cho_ai : null;
  return {
    soNguoi,
    du: soNguoi <= nguoi.length,
    nguoi,
    chuaGiao: cg ? { dangMo: so(cg.dang_mo) ?? 0, quaHan: so(cg.qua_han) ?? 0 } : null,
  };
}

export function docSCurve(du: unknown): KhoiSCurve {
  const d = laO(du) ? du : {};
  const diem = mang(d.diem);
  const duong: KhoiSCurve["duong"] = (
    [
      ["muc-tieu", "target"],
      ["baseline", "baseline"],
      ["thuc-te", "actual"],
      ["du-bao", "forecast"],
    ] as const
  ).map(([muc, k]) => ({
    muc,
    diem: diem
      .map((p) => ({ ngay: ngay(p.ngay) ?? ngay(p.ngayDauTuan), pct: so(p[k]) }))
      .filter((p): p is { ngay: string; pct: number } => p.ngay !== null && p.pct !== null)
      .sort((a, b) => a.ngay.localeCompare(b.ngay)),
  }));
  const ngayCat = ngay(d.ngayCatDuLieu);
  const tai = ngayCat ? diem.find((p) => ngay(p.ngay) === ngayCat && so(p.actual) !== null) : undefined;
  const lech = tai && laO(tai.lechNgay) ? (tai.lechNgay as O).thucTe : null;
  const d100 = laO(d.dat100) ? d.dat100 : {};
  const ngay100 = (k: string) => (laO(d100[k]) ? ngay((d100[k] as O).ngayDat100) : null);
  return {
    duong,
    ngayCat,
    tai: { mucTieu: tai ? so(tai.target) : null, baseline: tai ? so(tai.baseline) : null, thucTe: tai ? so(tai.actual) : null },
    lechThucTe: typeof lech === "number" || lech === "vuot" ? lech : null,
    dat100: { mucTieu: ngay100("mucTieu"), baseline: ngay100("baseline"), duBao: ngay100("duBao") },
    cauTapViec: chu(d.cauTapViec),
  };
}

export function docThiCong(du: unknown): KhoiThiCong {
  const d = laO(du) ? du : {};
  return {
    ngayDanhGia: ngay(d.ngay_danh_gia),
    dong: mang(d.dong)
      .filter((x) => x.cach_du_bao === "nang-suat-thuc")
      .map((x) => ({
        wbs: chu(x.ma_wbs) ?? "",
        ten: chu(x.ten) ?? "",
        thauPhu: chu(x.thau_phu) ?? "",
        donVi: chu(x.don_vi) ?? "",
        nsBaseline: so(x.ns_baseline),
        ns7: so(x.ns_7_ngay),
        duBaoXong: ngay(x.du_bao_xong),
        baselineXong: ngay(x.baseline_xong),
        treSoBaseline: so(x.tre_ngay_so_baseline),
      })),
  };
}

/** NT-1. Đọc `nghiemthu.lich_nghiem_thu`: `lich` = [{ ngay, nhan, moi: [{ gio_bat_dau, gio_ket_thuc, nha_thau, ma_bien_ban, ten_bien_ban, vi_tri, trang_thai }] }] */
export function docLichNghiemThu(du: unknown): KhoiLichNghiemThu {
  const d = laO(du) ? du : {};
  return {
    lich: mang(d.lich).map((n) => ({
      ngay: ngay(n.ngay) ?? "",
      nhan: chu(n.nhan) ?? "",
      moi: mang(n.moi).map((x) => ({
        gioBd: chu(x.gio_bat_dau) ?? "",
        gioKt: chu(x.gio_ket_thuc) ?? "",
        nhaThau: chu(x.nha_thau),
        maBb: chu(x.ma_bien_ban) ?? "",
        tenBb: chu(x.ten_bien_ban) ?? "",
        viTri: chu(x.vi_tri),
        trangThai: chu(x.trang_thai) ?? "",
      })),
    })),
  };
}

const cacThe = (o: unknown): { tieuDe: string; muc: string }[] =>
  mang(laO(o) ? o.cac_the : null).map((x) => ({ tieuDe: chu(x.tieu_de) ?? "", muc: chu(x.muc) ?? "" }));

/** NT-2 · NT-3. Đọc `nghiemthu.so_lieu_sang` */
export function docSoLieuNghiemThu(du: unknown): KhoiSoLieuNghiemThu {
  const d = laO(du) ? du : {};
  const no = laO(d.no_nghiem_thu_qua_han) ? d.no_nghiem_thu_qua_han : {};
  const ph = laO(d.phieu_cho_ky_qua_han) ? d.phieu_cho_ky_qua_han : {};
  return {
    tinhLuc: chu(d.tinh_luc),
    ngayThiCongMoiNhat: ngay(d.ngay_thi_cong_moi_nhat),
    noQuaHan: { soThe: so(no.so_the) ?? 0, nguongNgay: so(no.nguong_ngay), cac: cacThe(no) },
    phieuChoKy: { soThe: so(ph.so_the) ?? 0, nguongGio: so(ph.nguong_gio), cac: cacThe(ph) },
  };
}

/** CT-1. Đọc `tiendo.nguon_luc_huy_dong` (kỳ do bên gom chọn) */
export function docNguonLuc(du: unknown, cuNgay: number): KhoiNguonLuc {
  const d = laO(du) ? du : {};
  return {
    tuNgay: ngay(d.tu_ngay) ?? "",
    denNgay: ngay(d.den_ngay) ?? "",
    cuNgay,
    dong: mang(d.dong).map((x) => ({
      thauPhu: chu(x.thau_phu) ?? "thầu phụ chưa rõ tên",
      soNgayCoBc: so(x.so_ngay_co_bc),
      nhanCongBinhQuan: so(x.nhan_cong_binh_quan),
      mayChinhBinhQuan: so(x.may_chinh_binh_quan),
    })),
    camKet: null,
  };
}

/** CT-1. Đọc `hopdong.cam_ket_nha_thau` — `co_so` false = hợp đồng cam kết bằng lời, không có số để so */
export function docCamKet(du: unknown): NonNullable<KhoiNguonLuc["camKet"]> {
  const d = laO(du) ? du : {};
  return mang(d.hop_dong).map((x) => ({
    hopDong: chu(x.ten) ?? chu(x.ma_hop_dong) ?? "hợp đồng chưa rõ tên",
    nhaThau: chu(x.nha_thau) ?? "",
    nhanCong: x.co_so === true ? so(x.tong_nhan_cong) : null,
    may: x.co_so === true ? so(x.tong_may) : null,
    lyDoChuaCo: x.co_so === true ? null : chu(x.ly_do_chua_co),
  }));
}

/** CT-2. Đọc `tiendo.nhat_ky_thi_cong` — lấy NGÀY MỚI NHẤT có báo cáo trong kỳ */
export function docNhatKy(du: unknown, cuNgay: number): KhoiNhatKy | null {
  const d = laO(du) ? du : {};
  const cacNgay = mang(d.ngay)
    .filter((n) => mang(n.bao_cao).length > 0)
    .sort((a, b) => (ngay(b.ngay) ?? "").localeCompare(ngay(a.ngay) ?? ""));
  const n = cacNgay[0];
  if (!n) return null;
  return {
    ngay: ngay(n.ngay) ?? "",
    cuNgay,
    bao: mang(n.bao_cao).map((b) => {
      const tt = laO(b.thoi_tiet) ? b.thoi_tiet : {};
      return {
        nhaThau: chu(b.nha_thau) ?? "nhà thầu chưa rõ tên",
        thoiTiet: chu(tt.tinh_trang),
        anhHuongThoiTiet: chu(tt.anh_huong),
        soNhanCong: mang(b.nhan_cong).reduce((s, x) => s + (so(x.so) ?? 0), 0),
        soMay: mang(b.may).reduce((s, x) => s + (so(x.so) ?? 0), 0),
        viec: mang(b.cong_viec).map((x) => ({ ten: chu(x.ten) ?? "", kl: so(x.kl_ngay), donVi: chu(x.don_vi), tinhTrang: chu(x.tinh_trang) })),
        ngoaiBoq: mang(b.ngoai_boq).map((x) => ({ ten: chu(x.ten) ?? "", kl: so(x.kl), donVi: chu(x.don_vi) })),
        vuongMac: mang(b.vuong_mac).map((x) => ({ ten: chu(x.ten) ?? "", vuongMac: chu(x.vuong_mac) ?? "", giaiPhap: chu(x.giai_phap) })),
      };
    }),
  };
}

/** VS-1. Đọc `tiendo.viec_trong_khoang` — bỏ việc đã xong (đã xong thì không còn «sắp làm») */
export function docViecSapToi(du: unknown): KhoiViecSapToi {
  const d = laO(du) ? du : {};
  return {
    tuNgay: ngay(d.tu_ngay) ?? "",
    denNgay: ngay(d.den_ngay) ?? "",
    ngayDanhGia: ngay(d.ngay_danh_gia),
    tongSo: so(d.tong_so) ?? 0,
    soGang: so(d.so_viec_gang) ?? 0,
    viec: mang(d.viec)
      .filter((v) => v.da_xong !== true)
      .map((v) => ({
        ten: chu(v.ten) ?? chu(v.ma_va_ten) ?? "việc chưa rõ tên",
        nhom: chu(v.ten_nhom_cha),
        nhaThau: chu(v.nha_thau),
        gang: v.tren_duong_gang === true,
        laMoc: v.la_moc === true,
        duBaoBatDau: ngay(v.du_bao_bat_dau),
        duBaoXong: ngay(v.du_bao_xong),
        chamBaseline: so(v.cham_ngay_so_baseline),
        cauBaseline: chu(v.cau_so_baseline),
      })),
  };
}

/** PL-2. Đọc `phaply.lich_ho_so` */
export function docLichHoSo(du: unknown): KhoiLichHoSo {
  const d = laO(du) ? du : {};
  const dem = laO(d.dem) ? d.dem : {};
  return {
    khoang: chu(d.khoang) ?? "",
    quaHan: so(dem.qua_han),
    hoSo: mang(d.ho_so).map((h) => ({
      ten: chu(h.ho_so) ?? "hồ sơ chưa rõ tên",
      thuMuc: chu(h.thu_muc),
      coQuan: chu(h.co_quan),
      han: chu(h.han),
      tinhHinh: chu(h.tinh_hinh),
      trangThai: chu(h.trang_thai),
      dangCho: chu(h.dang_cho),
    })),
  };
}

/** NT-3. Đọc `nghiemthu.doi_chieu_khoi_luong` — chỉ lấy dòng tổng toàn dự án */
export function docDoiChieuKl(du: unknown): KhoiDoiChieuKl {
  const d = laO(du) ? du : {};
  const t = laO(d.tong) ? d.tong : {};
  return {
    ngaySoThiCong: chu(d.ngay_so_thi_cong),
    ptThiCong: so(t.pt_thi_cong_theo_gia_tri),
    ptNghiemThu: so(t.pt_nghiem_thu_theo_gia_tri),
    ptConNo: so(t.pt_con_no_theo_gia_tri),
    bienBanXong: chu(t.bien_ban_xong),
    soHangMuc: so(t.so_hang_muc),
  };
}

export function docHanChuTruong(du: unknown): KhoiHanChuTruong {
  const d = laO(du) ? du : {};
  return { soNgayVuot: so(d.so_ngay_vuot_han_chu_truong), soVoi: chu(d.so_voi), cau: chu(d.cau_so_sanh) };
}

/** Gộp số gom bổ sung vào số đã có của ngày (cùng dự án: trường mới đè trường cũ) */
export function gopDuLieuKhoi(cu: DuLieuKhoi | null, moi: DuLieuKhoi): DuLieuKhoi {
  if (!cu) return moi;
  const daGom: DuLieuKhoi["daGom"] = { ...cu.daGom };
  for (const [ma, ds] of Object.entries(moi.daGom) as [MaKhoi, string[]][]) {
    daGom[ma] = Array.from(new Set([...(daGom[ma] ?? []), ...ds]));
  }
  const theoDuAn: DuLieuKhoi["theoDuAn"] = { ...cu.theoDuAn };
  for (const [ma, x] of Object.entries(moi.theoDuAn)) theoDuAn[ma] = { ...(theoDuAn[ma] ?? {}), ...x };
  return { daGom, theoDuAn, keoVe: { ...cu.keoVe, ...moi.keoVe }, gomLuc: moi.gomLuc };
}

/** Phần còn thiếu: cặp khối–dự án cần mà chưa gom */
export function phanThieu(co: DuLieuKhoi | null, can: ReadonlyMap<MaKhoi, ReadonlySet<string>>): Map<MaKhoi, Set<string>> {
  const ra = new Map<MaKhoi, Set<string>>();
  can.forEach((ds, ma) => {
    const da = new Set(co?.daGom[ma] ?? []);
    const thieu = new Set(Array.from(ds).filter((m) => !da.has(m)));
    if (thieu.size > 0) ra.set(ma, thieu);
  });
  return ra;
}

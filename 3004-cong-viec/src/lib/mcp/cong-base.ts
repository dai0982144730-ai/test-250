// ============================================================
// CỔNG /api/mcp/base CỦA AGENT CÔNG VIỆC — bộ điều phối 15 công cụ (04/10/2026)
//
// Mr. Đại chốt 03/10: agent Công việc thay vai agent Base. Giữ MÃ "base" và đường /api/mcp/base (đổi mã = ~245 chỗ ở
// 5 agent), giữ ĐÚNG tên + khuôn trả lời của 1-agent-base/src/lib/mcp/cong-base.ts — chỉ đổi nguồn:
//
//   Công cụ                          Base cũ (Base.vn qua khoá API)        Agent Công việc (từ 04/10)
//   base.co_viec_cho_ma_khong        việc Base gắn mã WBS                  sổ cái · mã WBS ĐÃ DUYỆT (docflow.wbs_viec)
//   base.nguoi_phu_trach             người cầm việc Base                   người/đơn vị CHỦ TRÌ việc sổ cái
//   base.trang_thai_cong_viec        một việc Base                          một việc sổ cái CV-…
//   base.viec_qua_han · tai_viec…    việc Base                              việc sổ cái của dự án
//   base.viec_co_han_trong_khoang    (mới 18/10/2026 — Bảng 11 Main)         việc sổ cái của dự án có hạn trong khoảng ngày
//   base.thong_tin_nhan_su           danh bạ Base.vn                        người dùng agent Công việc (mã · tên · email)
//   base.danh_sach_issue             data/projects/<id>/issues.json         data/cay-viec/issue/<dự án>.json
//   base.de_xuat_lien_quan · quy_trinh_dang_tac   Base Request             KHÔNG CÓ NGUỒN → KHONG_CO_DU_LIEU nói rõ
//   3 cửa nhật ký                    sổ hỏi–đáp của Base                    sổ hỏi–đáp của agent Công việc
//
// Phần thuần (tra dự án, một mã, tải việc, cờ găng) ở cong-base-thuan.ts. CHỈ SERVER.
// ============================================================
// ⛔ BẢO MẬT TÀI CHÍNH (Mr. Đại chốt 07/10/2026): agent khác (Quan sát, Main, Tiến độ, Hợp đồng, Pháp lý, Nghiệm thu và agent
//   viết sau) KHÔNG BAO GIỜ nhận chương mật của báo cáo mẫu mật (Form 4 — I–III). Thêm công cụ trả nội dung tệp thì BẮT BUỘC
//   docPhienBan(q, id, phienBan, null) — bản đã cắt, chỗ cắt ghi sẵn câu "Không có số liệu…"; cấm docTep / MAY_DOC_TOAN_VAN.
import { tx, layQ } from "@/lib/db";
import { danhSachSoCai, viecDaXong } from "@/lib/so-cai/dich-vu";
import { boHienViec } from "@/lib/phong/viec-hien-ngoai";
import { idsViecGang } from "@/lib/phong/viec-gang";
import type { ViecApi } from "@/components/phong/viec";
import { napNguoiDung } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { thanhCong, thatBai, PHIEN_BAN_HOP_DONG, TRAN_BAN_GHI, type KhuonTra, type NguonMcp } from "@/lib/mcp/khuon";
import { KHUON_SO } from "@/lib/nhat-ky/khuon-so";
import { giuSoChoSucKhoe } from "@/lib/nhat-ky/don-so";
import { lyDoTheoViec } from "@/lib/nhat-ky/ly-do-viec";
import { chayCuaNhatKy } from "@/lib/nhat-ky/cua-nhat-ky";
import { danhMucCongCuNhatKy, danhMucCongCuThongKeAi } from "@/lib/nhat-ky/cua-quan-sat";
// 04/10 — Quản lý token AI Đợt 3 (phiên Quan sát): cửa đọc sổ dùng AI cho Agent quan sát
import { chayThongKeAi } from "@/lib/ai/cua-thong-ke-ai";
// 04/10 — Đợt 3: cửa GHI duy nhất Quan sát được gọi — chuông 08:00 cho quản trị (xét quyền riêng ở route.ts)
import { DONG_DANH_MUC_CHUONG, nhanThongBaoQuanSat } from "@/lib/mcp/cua-chuong-quan-sat";
import { DONG_DANH_MUC_CHUONG_NGHIEM_THU, nhanThongBaoNghiemThu } from "@/lib/mcp/cua-chuong-nghiem-thu";
import { DONG_DANH_MUC_CHUONG_PHAP_LY, nhanThongBaoPhapLy } from "@/lib/mcp/cua-chuong-phap-ly";
// 12/10 — câu 9: cửa CHỈ ĐỌC giao sơ đồ tổ chức cho Main (xét quyền riêng ở route.ts — đúng Main + khoá nội bộ)
import { CUA_SO_DO, DONG_DANH_MUC_SO_DO, dungSoDo, type HangDonVi, type HangKiemNhiem, type HangNguoi, type HangVai } from "@/lib/mcp/so-do-to-chuc-thuan";
import { gioVn } from "@/lib/chung/gio-vn";
import { viecSoCaiCuaDuAn } from "@/lib/cay-viec/doc-so-cai";
import { gomTheoWbs, laKhongThuocWbs, type GomViec, type ViecCay } from "@/lib/cay-viec/thuan";
import { docGanWbs, viecCuaDuAn } from "@/lib/gan-wbs/gan-wbs";
import { khoangNgay } from "@/lib/phong/tuan";
import { hopCuaToi } from "@/lib/phong-hop/dich-vu";
import { bayGioVN, congNgay, khoangGio, locChiTietCuoc, ngayVN, phongTheoId, tenThu, thuCua, trangThaiCuoc } from "@/lib/phong-hop/thuan";
import { docCauHoiTrung, type TraLoiTrung } from "@/lib/chung/hoi-trung-kieu";
import { traLoiHoiTrung } from "@/lib/cay-viec/hoi-trung";
import { docSo } from "@/lib/cay-viec/issue/so-issue";
import { KHAI_CONG_CU_VIEC_CHO_DUYET, chayCuaViecChoDuyet, laCongCuViecChoDuyet } from "@/lib/mcp/cua-viec-cho-duyet";
import { laCuaAgentNay, type TheCanhBao } from "@/lib/cay-viec/issue/model";
import { layHetDauViec, NHO_DAU_VIEC_MS } from "@/lib/tien-do-dau-viec";
// 27/10/2026 — Đợt 3a Main (KE-HOACH/31): 6 công cụ đọc mới + hai công cụ cũ hỏi không cần mã dự án
import { CONG_CU_THEM, DANH_MUC_THEM, chayCongCuThem, taiViecMoiDuAn, viecCoHanMoiDuAn } from "@/lib/mcp/cong-base-them";
import { boTienToDonVi } from "@/lib/mcp/cong-base-them-thuan";
import {
  TEN_AGENT,
  TEN_HIEN,
  chuoi,
  chanGioiHan,
  traDuAnTrongDanhSach,
  lietKeMaDangCo,
  gonMa,
  khopNguoi,
  truongNguoi,
  moiViec,
  phamVi,
  traMotMa,
  tongHopTaiTheoNguoi,
  SO_NGAY_SAP_HAN,
  laMaWbs,
  tapViecGangLa,
  trenDuongGangCuaThe,
  DINH_NGHIA_TREN_DUONG_GANG,
  DINH_NGHIA_VIEC_GANG_THEO_NGUOI,
  LY_DO_DONG_DANH_BA,
  LOAI_VIEC_TOI,
  locViecCuaToi,
  toiLocMay,
  docKhoangHoi,
  locViecCoHan,
  tinhTrangTheoHan,
  DINH_NGHIA_VIEC_CO_HAN,
  type DuAnDaTra,
  type ViecTai,
  type LoaiPhuTrach,
  NHAN_LOAI_PHU_TRACH,
} from "@/lib/mcp/cong-base-thuan";

export { TEN_AGENT };

const KHONG_CO_BASE_REQUEST =
  "Agent Công việc không có nguồn đề xuất/duyệt (Base Request) — công cụ giữ tên để bên gọi không vỡ, nhưng chưa có dữ liệu.";

// ─────────────────────────────────────────────────────────────
// Danh mục — cũng là câu trả lời của nang_luc()
// ─────────────────────────────────────────────────────────────

export const DANH_MUC = [
  { ten: "nang_luc", mo_ta: "Danh sách công cụ agent này cung cấp", tham_so: "—", san_sang: true },
  { ten: "suc_khoe", mo_ta: "Agent còn sống không, phiên bản hợp đồng nào", tham_so: "—", san_sang: true },
  { ten: "tim_theo_ma", mo_ta: "Tra một mã: mã WBS → đã có việc giao chưa; mã việc sổ cái CV-… → trạng thái việc", tham_so: "ma", san_sang: true },
  { ten: "base.nguoi_phu_trach", mo_ta: "Ai đang chủ trì việc · mã người/đơn vị kèm tên", tham_so: "ma_du_an, tu_khoa | ma_he_thong", san_sang: true },
  { ten: "base.trang_thai_cong_viec", mo_ta: "Trạng thái · hạn · quá hạn · nằm im bao nhiêu ngày của một việc sổ cái (mã CV-…)", tham_so: "ma_viec_base, ma_du_an?", san_sang: true },
  { ten: "base.de_xuat_lien_quan", mo_ta: `Đề xuất liên quan hạng mục — ${KHONG_CO_BASE_REQUEST}`, tham_so: "tu_khoa, ma_nhom?, chi_dang_chay?, gioi_han?", san_sang: false },
  { ten: "base.quy_trinh_dang_tac", mo_ta: `Hồ sơ dừng quá N ngày, đang ở bàn ai — ${KHONG_CO_BASE_REQUEST}`, tham_so: "so_ngay?, gioi_han?", san_sang: false },
  { ten: "base.viec_qua_han", mo_ta: "Việc quá hạn theo dự án hoặc theo người (sổ cái agent Công việc)", tham_so: "ma_du_an, nguoi?, gioi_han?", san_sang: true },
  {
    ten: "base.viec_co_han_trong_khoang",
    mo_ta:
      "Việc CÓ HẠN (ngày kết thúc) trong khoảng tu_ngay – den_ngay, tính cả hai đầu, của MỘT dự án (sổ cái agent Công việc) — cho Bảng 11 " +
      "«Kế hoạch tháng tới». Mặc định chỉ việc đang mở; con_mo_thoi=false lấy cả việc đã xong. Mỗi việc: mã + tên · hạn · người/đơn vị chủ trì · " +
      "trạng thái · đã quá hạn chưa, bao nhiêu NGÀY so với hạn · mã WBS kèm tên. Hạn sớm lên trước; cùng tập việc và cùng hạn với base.viec_qua_han. " +
      "BỎ TRỐNG ma_du_an = mọi việc trên sổ cái (mọi dự án + việc không thuộc dự án), lọc thêm được nguoi (email/tên — «tôi sắp hạn việc gì») hoặc don_vi",
    tham_so: "ma_du_an? (trống = mọi dự án), tu_ngay, den_ngay (yyyy-mm-dd), nguoi?, don_vi? (khi không gửi ma_du_an), con_mo_thoi? (mặc định true), gioi_han? (mặc định 100)",
    san_sang: true,
  },
  {
    ten: "base.tai_viec_theo_nguoi",
    mo_ta:
      "Tải việc từng người trong dự án: đang mở · quá hạn · sắp hạn 7 ngày · việc găng — người nặng nhất lên đầu. Việc găng = việc gắn mã WBS " +
      "đã duyệt là việc LÁ găng tới mốc COD (hỏi tiendo.tim_dau_viec · cờ critical, nhớ tạm 10 phút) HOẶC mã con của việc lá găng đó " +
      "(vd 6.1.4.2 dưới 6.1.4); mã nhóm cha (vd 6.1) không tính. Chờ Agent tiến độ tối đa 5 giây — quá thì viec_gang = null (chưa biết, không phải 0). " +
      "Mỗi dòng có `loai` (nguoi · phong · don_vi · chuc_danh_lanh_dao · chua_ro), `thuoc` (đơn vị cha / đơn vị chính); mỗi việc nặng có `ten_gon` (tên đã bỏ tiền tố dự án, rút gọn). " +
      "Lọc `nguoi` (tên người hoặc tên phòng/đơn vị) → `viec_nang` là ĐỦ mọi việc đang mở của dòng đó (việc của một người / một đơn vị). " +
      "BỎ TRỐNG ma_du_an = cả sổ cái mọi dự án (không có cột việc găng)",
    tham_so: "ma_du_an? (trống = mọi dự án), nguoi?, gioi_han?",
    san_sang: true,
  },
  { ten: "base.co_viec_cho_ma_khong", mo_ta: "Mã WBS này đã có việc giao chưa — chỉ tính mã ĐÃ DUYỆT (🤖 chờ duyệt không tính). ds_ma (≤ 100 mã) → { ket_qua: [{ ma, …các trường một mã }], so_ma }", tham_so: "ma_he_thong | ds_ma[], ma_du_an?", san_sang: true },
  { ten: "base.thong_tin_nhan_su", mo_ta: "Tra một người của agent Công việc — ma_base (mã người) · họ tên · chức vụ · đơn vị · email_sci. tat_ca=1 (cả danh bạ) TẠM ĐÓNG 04/10: kho danh bạ bên gọi đang dùng cho Base.vn", tham_so: "ma_base | ho_ten, gioi_han?", san_sang: true },
  { ten: "base.viec_cua_toi", mo_ta: "Việc của MỘT người theo 3 nút của agent Công việc — nhan (tôi chủ trì đích danh) · giao (tôi giao tay) · phoi_hop (phần phối hợp chưa xong của tôi / đơn vị tôi đứng đầu). Trả cả 3 danh sách việc đang mở + đường mở việc ở agent Công việc", tham_so: "nguoi (email), ma_du_an?, gioi_han?", san_sang: true },
  { ten: "base.hoi_trung_viec", mo_ta: "LUẬT 33 — trước khi soạn việc, agent khác hỏi: \"tôi định giao việc <nội dung> vì <lý do>\" có trùng việc đang mở trong sổ cái không. Máy lọc ứng viên (cùng dự án + mã WBS đã duyệt / chữ gần) → 🤖 AI phán. Không ứng viên = 0 token", tham_so: "noi_dung, ly_do, ma_du_an?, ma_wbs?, ma_ho_so?, han?, luc_giu_cho?", san_sang: true },
  { ten: "base.danh_sach_issue", mo_ta: "Sổ Issue của agent Công việc — mở cho Main gom về một chỗ. Chỉ ĐỌC. Không gửi ma_du_an → gom mọi dự án có sổ, mỗi thẻ ghi ma_du_an. Mỗi thẻ có tren_duong_gang (chờ Agent tiến độ tối đa 5 giây — quá thì null kèm cảnh báo, không phải false)", tham_so: "ma_du_an?, ca_da_dong?, gioi_han?", san_sang: true },
  // 26/10/2026 (Mr. Đại): trợ lý Main / Telegram hỏi «lịch họp gần nhất tôi cần tham dự» — đọc thẳng sổ Phòng họp
  { ten: "base.lich_hop", mo_ta: "Lịch họp MỘT người được mời dự (sổ Phòng họp của agent Công việc): cuộc chưa kết thúc từ bây giờ tới N ngày tới, gần nhất lên đầu — ngày · giờ · phòng · nội dung · người đặt · thành phần · đường dẫn họp trực tuyến", tham_so: "nguoi (email), so_ngay? (mặc định 14, tối đa 60), gioi_han? (mặc định 10 cuộc)", san_sang: true },
  // 27/10/2026 — Đợt 3a Main (KE-HOACH/31): báo cáo đã nộp · kiến nghị cần quyết · báo cáo tuần · lịch phòng · việc đã xong · chuông của tôi
  ...DANH_MUC_THEM,
  // ĐỢT ⑤ (06/10/2026): 3 cửa việc chờ duyệt cho bảng tổng ở Main — lib/mcp/cua-viec-cho-duyet.ts
  ...KHAI_CONG_CU_VIEC_CHO_DUYET,
  ...danhMucCongCuNhatKy(TEN_AGENT),
  ...danhMucCongCuThongKeAi(TEN_AGENT),
  DONG_DANH_MUC_CHUONG,
  DONG_DANH_MUC_CHUONG_NGHIEM_THU,
  DONG_DANH_MUC_CHUONG_PHAP_LY,
  DONG_DANH_MUC_SO_DO,
];

/** Công cụ không đọc việc theo dự án — vẫn phải từ chối mã dự án lạ (bài học 24/09 của Base) */
const CONG_CU_TOAN_CONG_TY = new Set(["base.de_xuat_lien_quan", "base.quy_trinh_dang_tac", "base.thong_tin_nhan_su"]);

export async function chayCongCu(congCu: string, thamSo: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  // ĐỢT ⑤ (06/10/2026): việc chờ duyệt — chạy thay NGƯỜI (ma_nguoi_dung trong thân lời gọi)
  if (laCongCuViecChoDuyet(congCu)) return chayCuaViecChoDuyet(congCu, thamSo, maNguoiDung);
  if (CONG_CU_TOAN_CONG_TY.has(congCu) && chuoi(thamSo.ma_du_an) !== "") {
    const da = traDuAnTrongDanhSach(chuoi(thamSo.ma_du_an), await dsDuAn());
    if (!da.ok) return da.loi;
  }
  switch (congCu) {
    case "nang_luc":
      return nangLuc();
    case "suc_khoe":
      return sucKhoe();
    case "tim_theo_ma":
      return timTheoMa(thamSo);
    case "base.nguoi_phu_trach":
      return nguoiPhuTrach(thamSo);
    case "base.trang_thai_cong_viec":
      return trangThaiCongViec(thamSo);
    case "base.viec_qua_han":
      return viecQuaHan(thamSo);
    case "base.viec_co_han_trong_khoang":
      return chuoi(thamSo.ma_du_an) === "" ? viecCoHanMoiDuAn(thamSo, maNguoiDung) : viecCoHanTrongKhoang(thamSo);
    case "base.tai_viec_theo_nguoi":
      return chuoi(thamSo.ma_du_an) === "" ? taiViecMoiDuAn(thamSo, maNguoiDung) : taiViecTheoNguoi(thamSo);
    case "base.co_viec_cho_ma_khong":
      return coViecChoMaKhong(thamSo);
    case "base.de_xuat_lien_quan":
    case "base.quy_trinh_dang_tac":
      return thatBai("KHONG_CO_DU_LIEU", `Công cụ ${congCu} chưa dùng được. ${KHONG_CO_BASE_REQUEST}`);
    case "base.thong_tin_nhan_su":
      return thongTinNhanSu(thamSo);
    case "base.danh_sach_issue":
      return danhSachIssue(thamSo);
    case "base.viec_cua_toi":
      return viecCuaToi(thamSo);
    case "base.lich_hop":
      return lichHop(thamSo, maNguoiDung);
    case "base.hoi_trung_viec":
      return hoiTrungViec(thamSo);
    case "base.nhat_ky_tong_hop":
      return chayCuaNhatKy("nhat_ky_tong_hop", thamSo, TEN_HIEN);
    case "base.nhat_ky_gan_day":
      return chayCuaNhatKy("nhat_ky_gan_day", thamSo, TEN_HIEN);
    case "base.hoi_thoai_gan_day":
      return chayCuaNhatKy("hoi_thoai_gan_day", thamSo, TEN_HIEN);
    case "base.thong_ke_ai":
      return chayThongKeAi(thamSo, TEN_HIEN);
    case "base.nhan_thong_bao_quan_sat":
      return nhanThongBaoQuanSat(thamSo);
    case "base.nhan_thong_bao_nghiem_thu":
      return nhanThongBaoNghiemThu(thamSo);
    case "base.nhan_thong_bao_phap_ly":
      return nhanThongBaoPhapLy(thamSo);
    case CUA_SO_DO:
      return soDoToChuc();
    default:
      if (CONG_CU_THEM.has(congCu)) return chayCongCuThem(congCu, thamSo, maNguoiDung);
      return thatBai("KHONG_HIEU_YEU_CAU", `${TEN_HIEN} (mã base) không có công cụ "${congCu}". Gọi nang_luc() để xem danh sách.`);
  }
}

// ─────────────────────────────────────────────────────────────
// Nạp dữ liệu
// ─────────────────────────────────────────────────────────────

async function dsDuAn(): Promise<CauHinh["du_an"]> {
  return tx((q) => layCauHinh(q, "du_an"));
}

function nguonSoCai(duAn: DuAnDaTra, viTri: string): NguonMcp[] {
  return [
    {
      loai: "so-cai-cong-viec",
      ma: duAn.id,
      file_goc: `Sổ cái agent Công việc · dự án ${duAn.id} ${duAn.ten}`,
      vi_tri: viTri,
      thoi_diem_trich: new Date().toISOString(),
      trang_thai: "Đọc trực tiếp sổ cái agent Công việc (việc · phần chủ trì · mã WBS đã duyệt)",
    },
  ];
}

type KetQuaNap = { ok: false; loi: KhuonTra } | { ok: true; duAn: DuAnDaTra; g: GomViec; viec: ViecCay[] };

async function napViec(ts: Record<string, unknown>): Promise<KetQuaNap> {
  const ds = await dsDuAn();
  const da = traDuAnTrongDanhSach(chuoi(ts.ma_du_an), ds);
  if (!da.ok) return da;
  const viec = await tx((q) => viecSoCaiCuaDuAn(q, ds, da.duAn.id, null));
  return { ok: true, duAn: da.duAn, g: gomTheoWbs(viec), viec };
}

// ─────────────────────────────────────────────────────────────
// Hai công cụ bắt buộc + tim_theo_ma
// ─────────────────────────────────────────────────────────────

function nangLuc(): KhuonTra {
  return thanhCong(
    {
      agent: TEN_AGENT,
      ten: TEN_HIEN,
      he_ma_so_huu: "mã việc sổ cái CV-… — gắn việc VÀO mã WBS của agent Tiến độ",
      phien_ban_hop_dong: PHIEN_BAN_HOP_DONG,
      cong_cu: DANH_MUC,
      so_cong_cu_san_sang: DANH_MUC.filter((c) => c.san_sang).length,
    },
    [{ loai: "khai-bao", ma: "nang_luc", file_goc: "src/lib/mcp/cong-base.ts", vi_tri: "DANH_MUC", thoi_diem_trich: new Date().toISOString() }],
  );
}

function sucKhoe(): KhuonTra {
  return thanhCong(
    {
      ok: true,
      agent: TEN_AGENT,
      ten: TEN_HIEN,
      phien_ban_hop_dong: PHIEN_BAN_HOP_DONG,
      khuon_so: KHUON_SO,
      giu_so: giuSoChoSucKhoe(),
      thoi_diem: new Date().toISOString(),
      // Agent Công việc không gọi Base.vn — mảng rỗng là thật, không phải "chưa kiểm"
      base_vn: [],
      base_vn_kiem_luc: null,
      nguon_viec: "sổ cái agent Công việc",
    },
    [{ loai: "suc-khoe", ma: TEN_AGENT, file_goc: "agent Công việc · cổng /api/mcp/base", thoi_diem_trich: new Date().toISOString() }],
  );
}

async function timTheoMa(ts: Record<string, unknown>): Promise<KhuonTra> {
  const ma = chuoi(ts.ma);
  if (ma === "") return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu tham số `ma`.");
  if (laMaWbs(ma.replace(/^[A-Za-z0-9]{2,5}\.(?=\d)/, ""))) return coViecChoMaKhong({ ...ts, ma_he_thong: ma });
  if (/^CV-/i.test(ma)) return trangThaiCongViec({ ...ts, ma_viec_base: ma.toUpperCase() });
  return thatBai(
    "KHONG_CO_DU_LIEU",
    `${TEN_HIEN} không tra được "${ma}". Đưa mã WBS (ví dụ 7.5.4.6) để hỏi "đã có việc giao chưa", hoặc mã việc sổ cái CV-….`,
  );
}

// ─────────────────────────────────────────────────────────────
// Công cụ đọc việc
// ─────────────────────────────────────────────────────────────

const TRAN_DS_MA = 100;

async function coViecChoMaKhong(ts: Record<string, unknown>): Promise<KhuonTra> {
  if (ts.ds_ma !== undefined) return coViecChoNhieuMa(ts);
  const maHeThong = chuoi(ts.ma_he_thong) || chuoi(ts.ma);
  if (maHeThong === "") return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `ma_he_thong` (ví dụ 7.5.4.6) hoặc `ds_ma` (mảng tối đa 100 mã).");
  const n = await napViec(ts);
  if (!n.ok) return n.loi;
  const r = traMotMa(n.g, maHeThong, ts.gioi_han);
  return thanhCong(r.duLieu, nguonSoCai(n.duAn, r.viTri), r.canhBao);
}

async function coViecChoNhieuMa(ts: Record<string, unknown>): Promise<KhuonTra> {
  if (!Array.isArray(ts.ds_ma)) return thatBai("KHONG_HIEU_YEU_CAU", '`ds_ma` phải là MẢNG mã hệ thống (tối đa 100), ví dụ ["7.5.4.6", "6.1.4"].');
  const ds = (ts.ds_ma as unknown[]).map(chuoi);
  if (ds.length === 0) return thatBai("KHONG_HIEU_YEU_CAU", "`ds_ma` rỗng — gửi ít nhất một mã.");
  if (ds.length > TRAN_DS_MA) {
    return thatBai("KHONG_HIEU_YEU_CAU", `\`ds_ma\` có ${ds.length} mã, trần ${TRAN_DS_MA} mã một lượt — chia thành ${Math.ceil(ds.length / TRAN_DS_MA)} lượt.`);
  }
  const n = await napViec(ts);
  if (!n.ok) return n.loi;
  const ketQua = ds.map((ma) =>
    ma === ""
      ? { ma, loi: { ma_loi: "KHONG_HIEU_YEU_CAU", thong_diep: "Phần tử không phải mã (chuỗi rỗng hoặc sai kiểu)." } }
      : { ma, ...traMotMa(n.g, ma, ts.gioi_han).duLieu },
  );
  const khongThay = ketQua.filter((k) => (k as { ket_luan?: string }).ket_luan === "KHONG_TIM_THAY_MA").length;
  return thanhCong(
    { ket_qua: ketQua, so_ma: ds.length },
    nguonSoCai(n.duAn, `tra ${ds.length} mã trên ${n.g.tongSoViec} việc — đọc sổ cái MỘT lần cho cả danh sách`),
    khongThay > 0 ? [`${khongThay}/${ds.length} mã KHÔNG TÌM THẤY trong sổ cái — các trường đếm của những mã đó khai null (chưa biết), KHÔNG phải 0.`] : [],
  );
}

async function nguoiPhuTrach(ts: Record<string, unknown>): Promise<KhuonTra> {
  const tuKhoa = chuoi(ts.tu_khoa);
  const maHeThong = chuoi(ts.ma_he_thong);
  if (tuKhoa === "" && maHeThong === "") return thatBai("KHONG_HIEU_YEU_CAU", "Cần `tu_khoa` hoặc `ma_he_thong`.");
  if (maHeThong !== "") return coViecChoMaKhong(ts);
  const n = await napViec(ts);
  if (!n.ok) return n.loi;
  const tim = gonMa(tuKhoa);
  const moi = moiViec(n.g);
  const gap = moi.filter((v) => gonMa(v.ten).includes(tim));
  if (gap.length === 0) {
    return thatBai(
      "KHONG_CO_DU_LIEU",
      `Không có việc nào trong sổ cái khớp từ khoá "${tuKhoa}". Đã soát ĐỦ ${moi.length}/${n.g.tongSoViec} việc của dự án ${n.duAn.id} ${n.duAn.ten} (kể cả ${n.g.chuaGan.length} việc chưa gắn được mã WBS) — đây là "tìm hết rồi, không có", không phải "chưa soát tới".`,
    );
  }
  return thanhCong(
    {
      tu_khoa: tuKhoa,
      so_khop: gap.length,
      so_khop_chua_co_nguoi_phu_trach: gap.filter((v) => v.nguoiPhuTrach === "").length,
      pham_vi_da_soat: phamVi(n.g),
      viec: gap.slice(0, chanGioiHan(ts.gioi_han)).map((v) => ({
        ma_viec_base: v.id,
        ten: v.ten,
        ...truongNguoi(v),
        nhom: null,
        da_xong: v.daXong,
      })),
    },
    nguonSoCai(n.duAn, `tìm "${tuKhoa}" trên ${moi.length} việc`),
  );
}

async function trangThaiCongViec(ts: Record<string, unknown>): Promise<KhuonTra> {
  const maViec = (chuoi(ts.ma_viec_base) || chuoi(ts.ma)).toUpperCase();
  if (maViec === "") return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `ma_viec_base` (mã việc sổ cái, ví dụ CV-2026-0074).");
  let thamSo = ts;
  if (chuoi(ts.ma_du_an) === "") {
    // Không gửi dự án → tự tìm dự án của việc (một việc chỉ thuộc một dự án theo luật duAnCuaViec)
    const ds = await dsDuAn();
    const thuoc = (await tx((q) => viecCuaDuAn(q, ds))).get(maViec);
    if (!thuoc) {
      return thatBai("KHONG_CO_DU_LIEU", `Không thấy việc "${maViec}" thuộc dự án nào trong sổ cái (việc không có, đã đóng, hoặc chưa gắn được dự án).`);
    }
    thamSo = { ...ts, ma_du_an: thuoc.du_an_id };
  }
  const n = await napViec(thamSo);
  if (!n.ok) return n.loi;
  const moi = moiViec(n.g);
  const thay = moi.find((v) => v.id.toUpperCase() === maViec);
  if (!thay) {
    return thatBai(
      "KHONG_CO_DU_LIEU",
      `Không thấy việc "${maViec}" trong dự án ${n.duAn.id} ${n.duAn.ten}. Đã soát ĐỦ ${moi.length}/${n.g.tongSoViec} việc, kể cả ${n.g.chuaGan.length} việc chưa gắn được mã WBS.`,
    );
  }
  return thanhCong(
    {
      ma_viec_base: thay.id,
      ten: thay.ten,
      ...truongNguoi(thay),
      da_xong: thay.daXong,
      han: thay.han,
      qua_han_ngay: thay.quaHanNgay,
      co_khai_han: thay.han !== null,
      nam_im_ngay: thay.namImNgay,
      do_duoc_nam_im: true,
      nhom: null,
      ma_wbs: thay.maWbs && !thay.aiGanChuaSoat ? thay.maWbs : null,
      ma_wbs_cho_duyet: thay.aiGanChuaSoat ? thay.maWbs : null,
      ma_du_an: n.duAn.id,
    },
    nguonSoCai(n.duAn, `việc ${maViec}`),
  );
}

async function viecQuaHan(ts: Record<string, unknown>): Promise<KhuonTra> {
  const nguoi = chuoi(ts.nguoi);
  const n = await napViec(ts);
  if (!n.ok) return n.loi;
  const dangMo = moiViec(n.g).filter((v) => !v.daXong && (nguoi === "" || khopNguoi(v, nguoi)));
  const khongDoDuoc = dangMo.filter((v) => v.quaHanNgay === null);
  const gap = dangMo.filter((v) => (v.quaHanNgay ?? 0) > 0);
  const doiChieu = {
    ...phamVi(n.g),
    so_viec_dang_mo_da_soat: dangMo.length,
    so_viec_do_duoc_han: dangMo.length - khongDoDuoc.length,
    so_viec_khong_khai_han_nen_khong_do_duoc: khongDoDuoc.length,
  };
  const cuaAi = nguoi === "" ? "" : ` của "${nguoi}"`;
  if (n.g.tongSoViec === 0) {
    return thatBai("KHONG_CO_DU_LIEU", `Dự án ${n.duAn.id} ${n.duAn.ten} chưa có việc nào trong sổ cái agent Công việc (0 việc) — số thật, không phải lỗi đọc.`);
  }
  if (gap.length === 0) {
    const dem =
      `Đã soát ${dangMo.length} việc đang mở${cuaAi}, trong đó ${dangMo.length - khongDoDuoc.length} việc CÓ hạn (đo được) ` +
      `và ${khongDoDuoc.length} việc KHÔNG có hạn nên KHÔNG đo được quá hạn.`;
    return thatBai(
      "KHONG_CO_DU_LIEU",
      khongDoDuoc.length === 0
        ? `Không có việc nào quá hạn${cuaAi}. ${dem} Con số 0 ở đây ĐÚNG NGHĨA: mọi việc đang mở đều có hạn và đều còn hạn.`
        : `Không có việc nào quá hạn${cuaAi} TRONG SỐ ĐO ĐƯỢC. ${dem} Vì thế "0 việc quá hạn" chỉ đúng với phần đo được — ${khongDoDuoc.length} việc kia là CHƯA BIẾT.`,
    );
  }
  gap.sort((a, b) => (b.quaHanNgay ?? 0) - (a.quaHanNgay ?? 0));
  return thanhCong(
    {
      so_viec_qua_han: gap.length,
      loc_theo_nguoi: nguoi || null,
      pham_vi_da_soat: doiChieu,
      viec: gap.slice(0, chanGioiHan(ts.gioi_han)).map((v) => ({
        ma_viec_base: v.id,
        ten: v.ten,
        ...truongNguoi(v),
        han: v.han,
        qua_han_ngay: v.quaHanNgay,
      })),
      ghi_chu:
        khongDoDuoc.length > 0
          ? `${khongDoDuoc.length} việc đang mở KHÔNG có hạn nên không nằm trong phép đo này — chúng CHƯA BIẾT có trễ hay không, không phải "không trễ".`
          : undefined,
    },
    nguonSoCai(n.duAn, `lọc việc quá hạn trên ${dangMo.length} việc đang mở`),
  );
}

// ─────────────────────────────────────────────────────────────
// base.viec_co_han_trong_khoang — việc CÓ HẠN trong khoảng ngày của MỘT dự án (18/10/2026 — Bảng 11 báo cáo tháng Main,
// KE-HOACH/22 mục 10.2 dòng c). Cùng tập việc với base.viec_qua_han (moiViec: việc thuộc dự án theo luật tra dự án, trừ
// việc đã kết luận «không thuộc đầu việc WBS nào» — số đó đếm riêng để nói rõ), cùng cửa xét quyền ở route.ts (ma trận Ai được
// gọi ai + khoá nội bộ + luật Agent quan sát chỉ đọc). Chỉ trả mã · tên · hạn · người chủ trì · mã WBS — KHÔNG trả nội dung tệp
// báo cáo nào, nên không chạm chương mật Form 4 (bảo mật tài chính 07/10/2026). Phần thuần ở cong-base-thuan.ts.
// ─────────────────────────────────────────────────────────────

async function viecCoHanTrongKhoang(ts: Record<string, unknown>): Promise<KhuonTra> {
  const kh = docKhoangHoi(ts);
  if (!kh.ok) return kh.loi;
  const k = kh.khoang;
  const n = await napViec(ts);
  if (!n.ok) return n.loi;
  const tenDa = `${n.duAn.id} ${n.duAn.ten}`;
  const khoang = khoangNgay(k.tu, k.den);
  if (n.g.tongSoViec === 0) {
    return thatBai("KHONG_CO_DU_LIEU", `Dự án ${tenDa} chưa có việc nào trong sổ cái agent Công việc (0 việc) — số thật, không phải lỗi đọc.`);
  }
  const homNay = gioVn(new Date()).ngay;
  const loai = k.conMoThoi ? "việc đang mở" : "việc (cả đang mở lẫn đã xong)";
  const xet = moiViec(n.g).filter((v) => !k.conMoThoi || !v.daXong);
  const khongHan = xet.filter((v) => v.han === null).length;
  const gap = locViecCoHan(xet, k);
  const ngoaiWbs = locViecCoHan(n.viec.filter(laKhongThuocWbs), k).length;
  const ghiChu: string[] = [];
  if (khongHan > 0) {
    ghiChu.push(`${khongHan} ${loai} KHÔNG khai hạn nên không xét được có rơi vào khoảng này không — CHƯA BIẾT, không phải "không có".`);
  }
  if (ngoaiWbs > 0) {
    ghiChu.push(
      `${ngoaiWbs} việc có hạn trong khoảng này đã được kết luận «không thuộc đầu việc WBS nào» (họp nội bộ, hành chính…) nên KHÔNG nằm trong danh sách — cùng luật base.viec_qua_han.`,
    );
  }
  if (gap.length === 0) {
    return thatBai(
      "KHONG_CO_DU_LIEU",
      `Không có ${loai} nào có hạn trong ${khoang} của dự án ${tenDa}. Đã soát ĐỦ ${xet.length} ${loai}. ${ghiChu.join(" ")}`.trim(),
    );
  }
  const tenWbs = new Map((await tx((q) => docGanWbs(q, n.duAn.id))).map((g) => [g.cong_viec_id, g.ten_wbs]));
  const tran = chanGioiHan(ts.gioi_han, TRAN_BAN_GHI);
  const dong = gap.map((v) => ({ v, tt: tinhTrangTheoHan(v, homNay) }));
  const viec = dong.slice(0, tran).map(({ v, tt }) => {
    const daDuyet = v.maWbs && !v.aiGanChuaSoat ? v.maWbs : null;
    const choDuyet = v.aiGanChuaSoat ? v.maWbs : null;
    return {
      ma_viec_base: v.id,
      ten: v.ten,
      han: v.han,
      ...truongNguoi(v),
      ...tt,
      xong_ngay: v.daXong ? (v.xongNgay ?? null) : null,
      ma_wbs: daDuyet,
      ma_wbs_cho_duyet: choDuyet,
      ten_wbs: daDuyet || choDuyet ? (tenWbs.get(v.id) ?? null) : null,
    };
  });
  const canhBao =
    gap.length > tran ? [`Còn ${gap.length - tran} việc chưa trả về vì chạm trần ${tran} bản ghi — gọi lại với khoảng ngày ngắn hơn (ví dụ từng nửa tháng).`] : [];
  return thanhCong(
    {
      ma_du_an: n.duAn.id,
      ten_du_an: n.duAn.ten,
      tu_ngay: k.tu,
      den_ngay: k.den,
      khoang,
      con_mo_thoi: k.conMoThoi,
      ngay_tinh: homNay,
      so_viec: gap.length,
      so_viec_da_qua_han: dong.filter((d) => d.tt.da_qua_han === true).length,
      pham_vi_da_soat: {
        ...phamVi(n.g),
        so_viec_da_soat: xet.length,
        so_viec_khong_khai_han: khongHan,
        so_viec_khong_thuoc_dau_viec_wbs_co_han_trong_khoang: ngoaiWbs,
      },
      dinh_nghia: DINH_NGHIA_VIEC_CO_HAN,
      viec,
      ghi_chu: ghiChu.length > 0 ? ghiChu.join(" ") : undefined,
    },
    nguonSoCai(n.duAn, `lọc ${loai} có hạn trong ${khoang} trên ${xet.length} ${loai}`),
    canhBao,
  );
}

// ─────────────────────────────────────────────────────────────
// Danh sách việc LÁ găng tới mốc COD của một dự án — MỘT cửa cho base.tai_viec_theo_nguoi và base.danh_sach_issue (17/10/2026)
//
// Nguồn: tiendo.tim_dau_viec · cờ critical (= găng tới mốc COD), qua layHetDauViec (nhớ 10 phút, một lượt bay — chung với màn
// Cây việc · Sơ đồ · Việc của tôi). KHÔNG dùng tiendo.duong_gang (đo 17/10/2026 22:25, Hướng Việt): `chuoi_gang` chỉ có 12 mắt
// xích dẫn COD, thiếu 9 việc lá găng (có 6.1.4 Cung cấp Hub, Nacelle) → base.tai_viec_theo_nguoi ra 0 việc găng cho cả 10
// người; `viec_gang_dang_tre` chỉ có việc găng ĐANG TRỄ (hôm nay 21/21 trùng, nhưng việc găng đúng hạn sẽ rơi mất).
// tim_dau_viec cho đủ 21 việc lá găng = so_viec_gang_toi_cod của duong_gang.
//
// HẠN CHỜ (đo sổ hỏi–đáp 17/10/2026): 08:36:51 — máy bật 08:32, cổng 3004 bật 08:33 — base.danh_sach_issue Hướng Việt mất
// 20,1 giây: 9,3 giây cả 15 lượt Main hỏi cùng đứng chờ trước khi vào việc (lần mở CSDL đầu tiên của tiến trình) + 9,0 giây trang
// 1 tiendo.tim_dau_viec (Tiến độ cũng vừa bật) + 1,8 giây 3 trang sau → Main hết hạn 10 giây, bản sáng thiếu phần Công việc.
// Nay chờ Agent tiến độ tối đa HAN_CHO_GANG_MS tính từ lúc công cụ bắt đầu; quá thì trả null (chưa biết) + lý do, lượt hỏi chạy
// tiếp và nạp bộ nhớ — lượt sau trong 10 phút có ngay. Số không đổi nghĩa: null = chưa biết, không bao giờ thành false / 0.
// ─────────────────────────────────────────────────────────────

/** Chờ danh sách việc găng tối đa 5 giây kể từ lúc công cụ bắt đầu — Main chờ cả lượt 10 giây, cổng còn có ≤ 3 giây kéo ma trận */
export const HAN_CHO_GANG_MS = 5_000;

type TapGangLa = { ma: Set<string> | null; loi?: string; tuNho: boolean };

async function tapGangLaCoHan(maTienDo: string | null, lyDo: string, hetLuc: number): Promise<TapGangLa> {
  if (!maTienDo) return { ma: null, loi: "dự án chưa có cây WBS bên agent Tiến độ", tuNho: false };
  const hoi: Promise<TapGangLa> = layHetDauViec(maTienDo, lyDo).then(
    (kq): TapGangLa => {
      if (!kq.ok) return { ma: null, loi: `${kq.ma_loi}: ${kq.thong_diep}`, tuNho: false };
      if (kq.du_lieu.tasks.length === 0) return { ma: null, loi: "Agent tiến độ trả danh sách đầu việc rỗng", tuNho: kq.tuNho };
      return { ma: tapViecGangLa(kq.du_lieu.tasks), tuNho: kq.tuNho };
    },
    (e: unknown): TapGangLa => ({ ma: null, loi: e instanceof Error ? e.message : String(e), tuNho: false }),
  );
  let hen: ReturnType<typeof setTimeout> | undefined;
  const het = new Promise<null>((xong) => {
    hen = setTimeout(() => xong(null), Math.max(0, hetLuc - Date.now()));
  });
  const kq = await Promise.race([hoi, het]);
  clearTimeout(hen);
  return (
    kq ?? {
      ma: null,
      loi: `Agent tiến độ chưa trả danh sách việc găng trong ${HAN_CHO_GANG_MS / 1000} giây — vẫn đang hỏi tiếp, lượt hỏi sau (trong 10 phút) có ngay`,
      tuNho: false,
    }
  );
}

// ─────────────────────────────────────────────────────────────
// base.tai_viec_theo_nguoi — việc găng = mã lá găng tới COD hoặc mã con (DINH_NGHIA_VIEC_GANG_THEO_NGUOI)
// ─────────────────────────────────────────────────────────────

async function taiViecTheoNguoi(ts: Record<string, unknown>): Promise<KhuonTra> {
  const batDau = Date.now();
  // 27/10: «phòng Kỹ thuật» → bỏ chữ «phòng» trước khi so tên (tên đơn vị trong sổ là «Phòng …» nhưng người hỏi hay viết thường)
  const locNguoi = boTienToDonVi(chuoi(ts.nguoi).replace(/^@/, ""));
  const n = await napViec(ts);
  if (!n.ok) return n.loi;
  const moi = moiViec(n.g);
  // Mã WBS chỉ lấy dòng ĐÃ DUYỆT (gomTheoWbs đã đẩy 🤖 chờ duyệt về tầng chưa gắn)
  const maCua = new Map<string, string[]>();
  n.g.theoWbs.forEach((ds, wbs) => ds.forEach((v) => maCua.set(v.id, [...(maCua.get(v.id) ?? []), wbs])));
  const viec: ViecTai[] = moi.map((v) => ({
    id: v.id,
    ten: v.ten,
    nguoiPhuTrach: v.nguoiPhuTrach,
    daXong: v.daXong,
    han: v.han,
    quaHanNgay: v.quaHanNgay,
    maWbs: maCua.get(v.id) ?? [],
  }));
  const gang = await tapGangLaCoHan(
    n.duAn.maTienDo,
    lyDoTheoViec(`cần danh sách việc lá găng tới COD để đếm việc găng của từng người (dự án ${n.duAn.id} ${n.duAn.ten})`, "Agent khác hỏi base.tai_viec_theo_nguoi"),
    batDau + HAN_CHO_GANG_MS,
  );
  const homNay = gioVn(new Date()).ngay;
  const tenCua = new Map(moi.map((v) => [v.nguoiPhuTrach, v.tenNguoi]));
  // 26/10/2026: ghi rõ dòng là người / phòng / đơn vị / chức danh lãnh đạo + thuộc đâu (bên hỏi từng gọi đơn vị là «phòng», gọi chức danh như người khác)
  const qL = await layQ();
  const dvL = new Map((await qL.query<{ id: string; ten_ngan: string; loai: string | null; cha_id: string | null }>("SELECT id, ten_ngan, loai, cha_id FROM identity.don_vi")).rows.map((r) => [r.id, r]));
  const ndL = new Map(
    (await qL.query<{ id: string; email: string; don_vi_id: string | null }>("SELECT id, email, don_vi_id FROM identity.nguoi_dung")).rows.flatMap((r) => [
      [r.id, r] as const,
      [r.email.toLowerCase(), r] as const,
    ]),
  );
  const phanLoai = (ma: string): { loai: LoaiPhuTrach; thuoc: string | null } => {
    const d = dvL.get(ma);
    if (d) return { loai: d.loai === "phong" ? "phong" : d.loai === "chuc_danh" ? "chuc_danh_lanh_dao" : "don_vi", thuoc: d.cha_id ? (dvL.get(d.cha_id)?.ten_ngan ?? null) : null };
    const nd = ndL.get(ma) ?? ndL.get(ma.toLowerCase());
    if (nd) return { loai: "nguoi", thuoc: nd.don_vi_id ? (dvL.get(nd.don_vi_id)?.ten_ngan ?? null) : null };
    return { loai: "chua_ro", thuoc: null };
  };
  // Lọc một người / đơn vị → trả ĐỦ việc đang mở của dòng đó (27/10 — «việc của một đơn vị / người»), không chỉ 5 việc nặng
  let ds = tongHopTaiTheoNguoi(viec, gang.ma ?? new Set<string>(), homNay, (m) => tenCua.get(m) || null, locNguoi !== "" ? TRAN_BAN_GHI : 5, phanLoai);
  if (locNguoi !== "")
    ds = ds.filter(
      (d) =>
        d.ma_base !== null &&
        (gonMa(d.ma_base).includes(gonMa(locNguoi)) || gonMa(d.ho_ten ?? "").includes(gonMa(locNguoi)) || gonMa(boTienToDonVi(d.ho_ten ?? "")).includes(gonMa(locNguoi))),
    );
  const dangMo = viec.filter((v) => !v.daXong).length;
  if (ds.length === 0) {
    return thatBai(
      "KHONG_CO_DU_LIEU",
      locNguoi !== ""
        ? `Không có ai khớp "${locNguoi}" đang chủ trì việc mở trong dự án ${n.duAn.id} ${n.duAn.ten}. Đã soát ${dangMo} việc đang mở / ${n.g.tongSoViec} việc.`
        : n.g.tongSoViec === 0
          ? `Dự án ${n.duAn.id} ${n.duAn.ten} chưa có việc nào trong sổ cái agent Công việc (0 việc) — số thật, không phải lỗi đọc.`
          : `Dự án ${n.duAn.id} ${n.duAn.ten} không có việc nào đang mở (${n.g.tongSoViec} việc, tất cả đã xong) — con số này là thật.`,
    );
  }
  const canhBao: string[] = [];
  if (gang.ma === null) {
    canhBao.push(
      `Không hỏi được danh sách việc găng của Agent tiến độ cho dự án ${n.duAn.id} ${n.duAn.ten} (${gang.loi ?? "không rõ"}) — cột viec_gang khai null cho mọi người, KHÔNG phải 0.`,
    );
  }
  const chuaGiao = ds.find((d) => d.ma_base === null);
  const coNguoi = ds.filter((d) => d.ma_base !== null);
  return thanhCong(
    {
      ma_du_an: n.duAn.id,
      ngay_tinh: homNay,
      loc_theo_nguoi: locNguoi || null,
      so_nguoi: coNguoi.length,
      xep_theo: "việc găng ↓ → quá hạn ↓ → sắp hạn 7 ngày ↓ → đang mở ↓ (lib/mcp/cong-base-thuan.ts)",
      so_ngay_sap_han: SO_NGAY_SAP_HAN,
      dinh_nghia_viec_gang: DINH_NGHIA_VIEC_GANG_THEO_NGUOI,
      dinh_nghia_loai: NHAN_LOAI_PHU_TRACH,
      luu_y:
        "Danh sách `nguoi` gồm cả phòng, đơn vị, chức danh lãnh đạo — xem cột `loai`. Hỏi «phòng nào» chỉ tính loai = phong. " +
        "Số của một phòng chỉ tính việc giao THẲNG cho phòng đó, CHƯA cộng việc của đơn vị con (BQLDA, BĐH, nhà máy…) — cột `thuoc` cho biết đơn vị thuộc đâu. " +
        "Dùng `ten_gon` khi nhắc tên việc.",
      viec_la_gang: gang.ma === null ? null : { so_ma: gang.ma.size, tu_nho_tam: gang.tuNho, nho_tam_phut: NHO_DAU_VIEC_MS / 60000 },
      pham_vi_da_soat: { ...phamVi(n.g), so_viec_dang_mo: dangMo },
      nguoi: coNguoi.slice(0, chanGioiHan(ts.gioi_han)).map((d) => ({ ...d, viec_gang: gang.ma === null ? null : d.viec_gang })),
      chua_giao_cho_ai: chuaGiao
        ? { dang_mo: chuaGiao.dang_mo, qua_han: chuaGiao.qua_han, sap_han_7_ngay: chuaGiao.sap_han_7_ngay, viec_gang: gang.ma === null ? null : chuaGiao.viec_gang }
        : null,
    },
    [
      ...nguonSoCai(n.duAn, `tải việc của ${coNguoi.length} người/đơn vị (+ nhóm chưa giao) trên ${dangMo} việc đang mở`),
      ...(gang.ma !== null
        ? [
            {
              loai: "tien-do",
              ma: n.duAn.maTienDo ?? n.duAn.id,
              file_goc: "Agent tiến độ · tiendo.tim_dau_viec (cờ critical = găng tới mốc COD)",
              vi_tri: `${gang.ma.size} việc lá găng tới COD${gang.tuNho ? " (nhớ tạm ≤ 10 phút)" : ""}`,
              thoi_diem_trich: new Date().toISOString(),
            } satisfies NguonMcp,
          ]
        : []),
    ],
    canhBao,
  );
}

// ─────────────────────────────────────────────────────────────
// base.thong_tin_nhan_su — người dùng của agent Công việc
// ─────────────────────────────────────────────────────────────

export interface DongNguoi {
  id: string;
  email: string;
  ten: string;
  chuc_vu: string | null;
  don_vi: string | null;
}

const goiNguoi = (n: DongNguoi) => ({
  ma_base: n.id,
  ho_ten: n.ten || null,
  chuc_danh: n.chuc_vu || null,
  anh: null,
  email_sci: n.email ? n.email.toLowerCase() : null,
  ban: n.don_vi || null,
  cong_ty: null,
});

/** Người đang hoạt động, sắp theo họ tên — một nguồn cho công cụ này và cửa GET /api/viec/danh-ba */
export async function docNguoiHoatDong(): Promise<DongNguoi[]> {
  const { rows } = await tx((q) =>
    q.query<DongNguoi>(
      `SELECT n.id, n.email, n.ten, n.chuc_vu, d.ten AS don_vi
         FROM identity.nguoi_dung n LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id
        WHERE n.active ORDER BY n.ten, n.id`,
    ),
  );
  return rows;
}

async function thongTinNhanSu(ts: Record<string, unknown>): Promise<KhuonTra> {
  const rows = await docNguoiHoatDong();
  const tong = rows.length;
  const nguon = (ma: string, viTri: string): NguonMcp[] => [
    {
      loai: "nguoi-dung-cong-viec",
      ma,
      file_goc: "agent Công việc · bảng người dùng (identity.nguoi_dung)",
      vi_tri: viTri,
      thoi_diem_trich: new Date().toISOString(),
      trang_thai: "ma_base = mã người trong agent Công việc; ảnh chưa có nguồn (null)",
    },
  ];
  const tatCa = ts.tat_ca === true || ts.tat_ca === 1 || ["1", "true"].includes(chuoi(ts.tat_ca));
  // 04/10: cả danh bạ TẠM ĐÓNG — xem LY_DO_DONG_DANH_BA (cong-base-thuan.ts)
  if (tatCa) return thatBai("KHONG_CO_DU_LIEU", LY_DO_DONG_DANH_BA);
  const hoi = chuoi(ts.ma_base) || chuoi(ts.ho_ten) || chuoi(ts.username) || chuoi(ts.ma) || chuoi(ts.tu_khoa);
  if (hoi === "") return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `ma_base` (mã người trong agent Công việc hoặc email) hoặc `ho_ten`.");
  if (tong === 0) return thatBai("KHONG_CO_DU_LIEU", "Bảng người dùng của agent Công việc đang rỗng.");
  const sach = hoi.replace(/^@/, "").trim().toLowerCase();
  const dung = rows.find((n) => n.id.toLowerCase() === sach || n.email.toLowerCase() === sach || n.email.toLowerCase().split("@")[0] === sach);
  const g = gonMa(sach);
  const gap = dung ? [dung] : g.length >= 2 ? rows.filter((n) => gonMa(n.ten).includes(g) || gonMa(n.id).includes(g)).slice(0, chanGioiHan(ts.gioi_han)) : [];
  if (gap.length === 0) return thatBai("KHONG_CO_DU_LIEU", `Không thấy ai tên/mã "${hoi}" trong ${tong} người đang hoạt động của agent Công việc.`);
  return thanhCong(
    {
      hoi,
      so_khop: gap.length,
      tong_danh_ba: tong,
      nhan_su: gap.map(goiNguoi),
      do_day_du: { co_ho_ten: gap.filter((n) => n.ten).length, thieu_ho_ten: gap.filter((n) => !n.ten).length, vi_sao_thieu: "Ảnh và công ty chưa có nguồn trong agent Công việc — khai null." },
    },
    nguon(sach, `tra "${hoi}" trên ${tong} người`),
  );
}

// ─────────────────────────────────────────────────────────────
// base.so_do_to_chuc — sơ đồ tổ chức giao cho Main (12/10/2026 — câu 9). CHỈ ĐỌC, KHÔNG có mật khẩu.
// Câu truy vấn kê ĐÍCH DANH từng cột: thêm cột mật khẩu vào đây là sai luật (xem so-do-to-chuc-thuan.ts).
// ─────────────────────────────────────────────────────────────

export async function soDoToChuc(): Promise<KhuonTra> {
  const nguon = await tx(async (q) => ({
    donVi: (
      await q.query<HangDonVi>(
        "SELECT id, ten, ten_ngan, cap, cha_id, loai, thu_tu, active, chuc_danh, chuc_danh_ngan, chuc_nang, uy_quyen_truong FROM identity.don_vi ORDER BY cap, thu_tu, id",
      )
    ).rows,
    kiemNhiem: (await q.query<HangKiemNhiem>("SELECT nguoi_dung_id, don_vi_id, chuc_vu FROM identity.kiem_nhiem ORDER BY nguoi_dung_id, don_vi_id")).rows,
    nguoi: (await q.query<HangNguoi>("SELECT id, email, ten, don_vi_id, chuc_vu, cap_chuc_vu, active FROM identity.nguoi_dung ORDER BY email")).rows,
    vai: (await q.query<HangVai>("SELECT nguoi_dung_id, vai_tro_id FROM identity.gan_vai_tro ORDER BY nguoi_dung_id, vai_tro_id")).rows,
  }));
  const soDo = dungSoDo(nguon);
  // Rỗng thì nói rỗng — Main không được coi "không có gì" là sơ đồ mới rồi xoá bản đang giữ
  if (soDo.so_don_vi === 0 || soDo.so_nguoi === 0) {
    return thatBai("KHONG_CO_DU_LIEU", `Sơ đồ tổ chức của agent Công việc đang rỗng (${soDo.so_don_vi} đơn vị · ${soDo.so_nguoi} người) — không giao.`);
  }
  return thanhCong(soDo, [
    {
      loai: "so-do-to-chuc-cong-viec",
      ma: "so-do-to-chuc",
      file_goc: "agent Công việc · Cài đặt › Tổ chức & người dùng (bảng identity.don_vi · kiem_nhiem · nguoi_dung · gan_vai_tro)",
      vi_tri: `${soDo.so_don_vi} đơn vị · ${soDo.so_kiem_nhiem} kiêm nhiệm · ${soDo.so_nguoi} người (${soDo.so_nguoi_dang_khoa} đang khoá)`,
      thoi_diem_trich: new Date().toISOString(),
      trang_thai: "Đọc trực tiếp lúc hỏi — không có mật khẩu, không có cờ quản trị",
    },
  ]);
}

// ─────────────────────────────────────────────────────────────
// base.danh_sach_issue — sổ issue của agent Công việc (data/cay-viec/issue/<dự án>.json)
// ─────────────────────────────────────────────────────────────

const ISSUE_MAC_DINH = 20;

function mucDoMain(t: TheCanhBao): "do" | "vang" | "xanh" {
  const m = String(t.mucDo);
  if (m === "red" || m === "do" || m === "cao") return "do";
  if (m === "green" || m === "xanh" || m === "thap") return "xanh";
  return "vang";
}

function dieuKienDong(t: TheCanhBao): string {
  return t.dieuKien === "het-vi-pham"
    ? "Điều kiện sinh ra issue đã hết vi phạm — đủ điều kiện đóng theo luật 8.4."
    : "Đóng khi điều kiện sinh ra issue hết vi phạm và giữ ổn định (luật 8.4). Sổ chưa có cột điều kiện đóng riêng nên câu này suy từ trạng thái, không phải người nhập.";
}

async function danhSachIssue(ts: Record<string, unknown>): Promise<KhuonTra> {
  const batDau = Date.now();
  const maDuAn = chuoi(ts.ma_du_an);
  const layCaDaDong = ts.ca_da_dong === true;
  const thoTran = Number(ts.gioi_han);
  const tran = Number.isFinite(thoTran) ? Math.min(Math.max(1, Math.floor(thoTran)), 100) : ISSUE_MAC_DINH;
  // Sổ issue mỗi dự án đọc MỘT lần trong lượt (trước 17/10 đọc + phân tích JSON 2–3 lần mỗi dự án)
  const soDaDoc = new Map<string, TheCanhBao[]>();
  const theCua = (id: string): TheCanhBao[] => {
    let the = soDaDoc.get(id);
    if (!the) soDaDoc.set(id, (the = docSo(id).the));
    return the;
  };
  const ds = await dsDuAn();
  let cacDuAn: DuAnDaTra[];
  const canhBao: string[] = [];
  if (maDuAn === "") {
    cacDuAn = ds.map((d) => ({ id: d.id, ten: d.ten, maTienDo: d.ma_tien_do?.trim() || null })).filter((d) => theCua(d.id).length > 0);
    if (cacDuAn.length === 0) return thatBai("KHONG_CO_DU_LIEU", `CHƯA CÓ SỔ ISSUE cho dự án nào (${lietKeMaDangCo(ds)}) — sổ chỉ sinh ra sau lần chạy sinh issue đầu tiên.`);
    canhBao.push(`Không truyền \`ma_du_an\` nên gom sổ issue của ${cacDuAn.length} dự án (${lietKeMaDangCo(cacDuAn)}); mỗi thẻ ghi ma_du_an.`);
  } else {
    const da = traDuAnTrongDanhSach(maDuAn, ds);
    if (!da.ok) return da.loi;
    cacDuAn = [da.duAn];
  }

  let tongThe = 0;
  const gom: { t: TheCanhBao; da: DuAnDaTra }[] = [];
  for (const da of cacDuAn) {
    const the = theCua(da.id).filter(laCuaAgentNay);
    tongThe += the.length;
    for (const t of the) if (layCaDaDong || t.dieuKien !== "da-dong") gom.push({ t, da });
  }
  const ten1 = cacDuAn.length === 1 ? `${cacDuAn[0]!.id} ${cacDuAn[0]!.ten}` : `${cacDuAn.length} dự án`;
  if (tongThe === 0 && cacDuAn.length === 1) {
    // Đo 04/10 (kiểm độc lập lần 3 #1): bộ sinh issue KHÔNG chạy cho dự án chưa có cây WBS (cay-viec/issue/chay.ts) — nói đúng
    // là "chưa soát", không phải "0 issue". Main xếp câu này vào "chưa hỏi được" (issue-main/model.ts) — ⏸ Mr. Đại chốt nghĩa.
    return thatBai(
      "KHONG_CO_DU_LIEU",
      cacDuAn[0]!.maTienDo
        ? `CHƯA CÓ SỔ ISSUE cho dự án ${ten1} — bộ sinh issue chưa chạy lần nào cho dự án này (chạy khi mở màn Issue của agent Công việc), nên CHƯA SOÁT, không phải 0 issue.`
        : `Dự án ${ten1} chưa có cây WBS bên agent Tiến độ nên bộ sinh issue của agent Công việc không chạy — CHƯA SOÁT, không phải 0 issue.`,
    );
  }
  if (gom.length === 0) return thatBai("KHONG_CO_DU_LIEU", `Sổ issue của ${ten1} có ${tongThe} thẻ nhưng KHÔNG thẻ nào đang mở.`);

  // Các dự án hỏi SONG SONG, chung một hạn chờ tính từ lúc công cụ bắt đầu (HAN_CHO_GANG_MS)
  const gangTheo = new Map<string, Set<string> | null>();
  const canHoi = cacDuAn.filter((da) => gom.some((x) => x.da.id === da.id));
  const lyDoGang = lyDoTheoViec("gắn cờ tren_duong_gang cho thẻ issue — cần danh sách việc găng tới COD", "base.danh_sach_issue");
  const kqGang = await Promise.all(canHoi.map((da) => tapGangLaCoHan(da.maTienDo, lyDoGang, batDau + HAN_CHO_GANG_MS)));
  canHoi.forEach((da, i) => {
    const g = kqGang[i]!;
    gangTheo.set(da.id, g.ma);
    if (g.ma === null) canhBao.push(`Dự án ${da.id} ${da.ten}: chưa hỏi được danh sách việc găng (${g.loi ?? "không rõ"}) — tren_duong_gang = null cho thẻ ngoài luật 3, KHÔNG phải false.`);
  });
  if (gom.length > tran) canhBao.push(`Còn ${gom.length - tran} thẻ chưa trả về vì chạm trần ${tran} bản ghi. Gọi lại với gioi_han lớn hơn (tối đa 100).`);

  const issue = gom.slice(0, tran).map(({ t, da }) => ({
    id: t.id,
    tieu_de: t.tieuDe,
    mo_ta: t.phanTich,
    nguon_du_lieu: t.nguonDuLieu,
    dieu_kien_dong: dieuKienDong(t),
    mucDo: mucDoMain(t),
    nhomChinh: null,
    doLlmSinh: t.nguon === "ai",
    doNguoiThem: t.nguon === "nguoi",
    so_ngay_anh_huong: typeof t.anhHuongCod === "number" && t.anhHuongCod > 0 ? t.anhHuongCod : null,
    tien_anh_huong_vnd: null,
    daDong: t.dieuKien === "da-dong",
    wbs: t.wbs ?? null,
    wbs_lien_quan: Array.isArray(t.wbsLienQuan) ? t.wbsLienQuan : [],
    tren_duong_gang: trenDuongGangCuaThe(t, gangTheo.get(da.id) ?? null),
    ngay_mo: t.ngayMo,
    ma_du_an: da.id,
  }));

  return thanhCong(
    {
      agent: TEN_AGENT,
      ten: TEN_HIEN,
      ma_du_an_hoi: maDuAn || null,
      ma_du_an: cacDuAn.length === 1 ? cacDuAn[0]!.id : null,
      ten_du_an: cacDuAn.length === 1 ? cacDuAn[0]!.ten : null,
      so_the_dang_mo: gom.filter((x) => x.t.dieuKien !== "da-dong").length,
      dinh_nghia_tren_duong_gang: DINH_NGHIA_TREN_DUONG_GANG,
      issue,
    },
    cacDuAn.map((da) => ({
      loai: "issue",
      ma: `sổ issue ${TEN_AGENT} · ${da.id}`,
      file_goc: `data/cay-viec/issue/${da.id}.json`,
      vi_tri: `${gom.filter((x) => x.da.id === da.id).length} thẻ trả về / ${theCua(da.id).filter(laCuaAgentNay).length} thẻ của agent này`,
      thoi_diem_trich: new Date().toISOString(),
    })),
    canhBao,
  );
}

// ─────────────────────────────────────────────────────────────
// base.viec_cua_toi — màn "Việc của tôi" (thu gọn) ở Main · Tiến độ · Hợp đồng (Mr. Đại chốt 04/10/2026, CHOT 6g.7 mục 3)
// ─────────────────────────────────────────────────────────────

/** LUẬT 33 (Mr. Đại chốt 04/10/2026) — trả lời "việc định giao có trùng việc đang mở trong sổ cái không" */
async function hoiTrungViec(ts: Record<string, unknown>): Promise<KhuonTra> {
  const cau = docCauHoiTrung(ts);
  if (typeof cau === "string") return thatBai("KHONG_HIEU_YEU_CAU", cau);
  const kq = await traLoiHoiTrung(cau);
  // Dự án lạ → thưa rõ "không có việc để so" (ok), KHÔNG trả lỗi: bên hỏi coi lỗi là không thưa và gọi lại 3 lần (kiểm lần 5 ⚪1)
  const tl: TraLoiTrung =
    "loi" in kq
      ? { trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0, ly_do: kq.loi || `Agent Công việc không có dự án mã ${cau.ma_du_an} — không có việc nào để so.` }
      : kq;
  return thanhCong(tl, [
    {
      loai: "so-cai-cong-viec",
      ma: cau.ma_du_an ?? "khong-du-an",
      file_goc: `Sổ cái agent Công việc · việc đang mở${cau.ma_du_an ? ` · dự án ${cau.ma_du_an}` : " · không thuộc dự án"}`,
      vi_tri: tl.trung && tl.viec ? `việc ${tl.viec.ma}` : `${tl.so_ung_vien} ứng viên`,
      thoi_diem_trich: new Date().toISOString(),
      trang_thai: tl.cach_phan === "khong_ung_vien" ? "Máy lọc: không việc nào gần — không gọi AI" : tl.cach_phan === "ai" ? "Máy lọc ứng viên → 🤖 AI phán" : "Có ứng viên nhưng 🤖 AI chưa phán được",
    },
  ]);
}

// ─────────────────────────────────────────────────────────────
// base.lich_hop — lịch họp của MỘT người (26/10/2026). Cùng hàm với dòng chữ đỏ ở thanh trên (hopCuaToi): cuộc chưa huỷ,
// chưa kết thúc, người đó có tên trong danh sách mời. Giờ là giờ Việt Nam.
// ─────────────────────────────────────────────────────────────
// Ghi chú · đường dẫn · khách ngoài chỉ NGƯỜI HỎI là người đặt / được mời / quản trị mới thấy (chốt 26/10, như GET /api/phong-hop).
// Người hỏi = `ma_nguoi_dung` của lời gọi; không gửi thì coi như người ngoài (kiểm lần 8 CT-421).
async function lichHop(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  const email = chuoi(ts.nguoi).toLowerCase();
  if (!email) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `nguoi` (email người cần xem lịch họp).");
  const soNgay = Math.min(60, Math.max(1, Math.round(Number(ts.so_ngay) || 14)));
  const q = await layQ();
  const nd = (await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE lower(email) = $1 AND active LIMIT 1", [email])).rows[0];
  if (!nd) return thatBai("KHONG_CO_DU_LIEU", `${email} không có tài khoản đang hoạt động ở agent Công việc — không tra được lịch họp.`);
  const bay = bayGioVN();
  const denNgay = congNgay(bay.ngay, soNgay);
  // Trần số cuộc (mặc định 10) — kiểm độc lập P-CV-6: không trần thì xấu nhất hàng chục KB tới Main
  const gioiHan = Math.min(30, Math.max(1, Math.round(Number(ts.gioi_han) || 10)));
  const nguoiHoi = maNguoiDung
    ? ((await q.query<{ id: string; la_quan_tri: boolean }>(
        // Main gửi phần trước @ của email (chat-tools `ma_nguoi_dung`); nhận cả email đủ hoặc mã tài khoản — như cua-viec-cho-duyet
        "SELECT id, la_quan_tri FROM identity.nguoi_dung WHERE active AND (id = $1 OR lower(email) = lower($1) OR split_part(lower(email), '@', 1) = lower($1)) ORDER BY id = $1 DESC, lower(email) = lower($1) DESC LIMIT 1",
        [maNguoiDung.trim()],
      )).rows[0] ?? { id: "", la_quan_tri: false })
    : { id: "", la_quan_tri: false };
  const tatCa = (await hopCuaToi(q, nd.id)).filter((c) => c.ngay <= denNgay).map((c) => locChiTietCuoc(c, nguoiHoi));
  const ds = tatCa.slice(0, gioiHan);
  const cuoc = ds.map((c) => {
    const phong = phongTheoId(c.phong)?.ten ?? c.phong;
    const ngay = `${tenThu(thuCua(c.ngay))} ${ngayVN(c.ngay)}`;
    return {
      ngay,
      gio: khoangGio(c.tu, c.den),
      phong,
      noi_dung: c.noi_dung,
      loai: c.loai === "giao_ban" ? "Họp giao ban tuần" : "Họp thường",
      trang_thai: trangThaiCuoc(c, bay) === "dang" ? "đang họp" : "sắp họp",
      nguoi_dat: c.nguoi_dat_ten,
      so_nguoi_du: c.moi.length,
      nguoi_du: c.moi.slice(0, 20).map((m) => m.ten),
      khach_ngoai: c.khach_ngoai,
      duong_dan_hop: c.duong_dan,
      ghi_chu: c.ghi_chu && c.ghi_chu.length > 200 ? `${c.ghi_chu.slice(0, 200).trimEnd()}…` : c.ghi_chu,
      cau: `${ngay} · ${khoangGio(c.tu, c.den)} · ${phong} — ${c.noi_dung}`,
    };
  });
  return thanhCong(
    {
      nguoi: { email, ten: nd.ten },
      khoang: `${soNgay + 1} ngày · ${ngayVN(bay.ngay)} – ${ngayVN(denNgay)}`,
      bay_gio: `${bay.gio} ${ngayVN(bay.ngay)} (giờ Việt Nam)`,
      so_cuoc: tatCa.length,
      ...(tatCa.length > cuoc.length ? { da_cat: `Hiện ${cuoc.length}/${tatCa.length} cuộc gần nhất.` } : {}),
      cuoc,
      ghi_chu: cuoc.length ? "Cuộc đầu danh sách là cuộc gần nhất." : `Không có cuộc họp nào mời ${nd.ten} từ bây giờ tới ${ngayVN(denNgay)}.`,
    },
    [
      {
        loai: "so-phong-hop",
        ma: nd.id,
        file_goc: "Sổ Phòng họp agent Công việc (docflow.phong_hop_cuoc · phong_hop_moi)",
        vi_tri: `người được mời: ${nd.ten}`,
        thoi_diem_trich: new Date().toISOString(),
      },
    ],
  );
}

async function viecCuaToi(ts: Record<string, unknown>): Promise<KhuonTra> {
  const email = chuoi(ts.nguoi).toLowerCase();
  if (!email) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `nguoi` (email người đang xem).");
  const q = await layQ();
  const ma = (await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE lower(email) = $1 AND active LIMIT 1", [email])).rows[0];
  const nd = ma ? await napNguoiDung(q, ma.id) : null;
  if (!nd) return thatBai("KHONG_CO_DU_LIEU", `${email} không có tài khoản đang hoạt động ở agent Công việc.`);
  const lanhDao = new Set((await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE loai = 'chuc_danh'")).rows.map((r) => r.id));
  let ds = await danhSachSoCai(q);
  let duAn: DuAnDaTra | null = null;
  if (chuoi(ts.ma_du_an) !== "") {
    const dsDa = await dsDuAn();
    const da = traDuAnTrongDanhSach(chuoi(ts.ma_du_an), dsDa);
    if (!da.ok) return da.loi;
    duAn = da.duAn;
    const thuoc = new Set((await viecSoCaiCuaDuAn(q, dsDa, da.duAn.id, null)).map((v) => v.id));
    ds = ds.filter((v) => thuoc.has(v.id));
  }
  const toi = toiLocMay(nd, lanhDao);
  // Tra tên theo mã người HOẶC email (người giao cũ đổi mã khi chuyển tài khoản vẫn ra tên — luật 30)
  const tenNguoi = new Map(
    (await q.query<{ id: string; email: string; ten: string }>("SELECT id, email, ten FROM identity.nguoi_dung")).rows.flatMap((r) => [
      [r.id, r.ten] as const,
      [r.email.toLowerCase(), r.ten] as const,
    ]),
  );
  const tenDv = new Map((await q.query<{ id: string; ten_ngan: string }>("SELECT id, ten_ngan FROM identity.don_vi")).rows.map((r) => [r.id, r.ten_ngan]));
  const homNay = gioVn(new Date()).ngay;
  const tran = chanGioiHan(ts.gioi_han, 100);
  // 07/10 (Mr. Đại chốt): khu phải Việc của tôi ở agent khác hiện Y HỆT khu phải Sơ đồ tổ chức — nhóm đơn vị · tình trạng · dấu "!"
  // găng · khối "Việc làm xong". Dựng bằng chính hàm của màn Sơ đồ (lib/phong/viec-hien-ngoai.ts). Găng hỏi agent Tiến độ (nhớ tạm
  // 10 phút) — hỏi không được thì thiếu dấu, danh sách vẫn trả.
  const hien = await boHienViec(q, homNay);
  const gang = await idsViecGang(await dsDuAn(), null, (ten) => `Việc của tôi ở agent khác — dấu "!" việc găng (dự án ${ten})`).catch(() => ({
    ids: new Set<string>(),
    thieu: [] as string[],
  }));
  const dong = (v: (typeof ds)[number]) => {
    const vo = hien.doi(v as unknown as ViecApi);
    const nhom = hien.nhomCua(vo);
    const ct = v.phan_viec.find((p) => p.vai !== "phoi_hop");
    const han = v.ket_thuc ? v.ket_thuc.slice(0, 10) : null;
    const quaHan = han && han < homNay ? Math.round((Date.parse(homNay) - Date.parse(han)) / 86_400_000) : null;
    return {
      ma_viec_base: v.id,
      ten: v.ten,
      du_an: v.du_an,
      han,
      qua_han_ngay: quaHan,
      chu_tri: ct ? (ct.phu_trach_ten ?? (ct.phu_trach_loai === "nguoi" ? tenNguoi.get(ct.phu_trach_id) : tenDv.get(ct.phu_trach_id)) ?? ct.phu_trach_id) : null,
      nguoi_giao: v.giao_boi ? (tenNguoi.get(v.giao_boi) ?? tenNguoi.get(v.giao_boi.toLowerCase()) ?? v.giao_boi) : null,
      // Đường mở việc trên giao diện agent Công việc (bên gọi ghép địa chỉ gốc trong danh bạ)
      duong_mo: `/so-do?viec=${encodeURIComponent(v.id)}`,
      tt: vo.tt,
      tt_chu: vo.ttChu,
      gang: !vo.xongNgay && gang.ids.has(v.id),
      nhom: nhom.ten,
      nhom_thu_tu: nhom.thu_tu,
    };
  };
  const theo = Object.fromEntries(LOAI_VIEC_TOI.map((l) => [l, locViecCuaToi(ds, l, toi)]));
  // Việc làm xong trong khoảng "Tuần N−1 và N" — cùng 3 nút (phối hợp: phần phối hợp của tôi đã xong vẫn tính), mới xong trước
  const k = hien.lamXong;
  let xongDs = (await viecDaXong(q, { tu: k.tu })).filter((v) => {
    const x = hien.doi(v as unknown as ViecApi).xongNgay;
    return !!x && x >= k.tu && x <= k.den;
  });
  if (duAn) xongDs = xongDs.filter((v) => v.du_an === duAn!.ten || v.du_an === duAn!.id);
  const xongNgay = (v: (typeof ds)[number]) => hien.doi(v as unknown as ViecApi).xongNgay ?? "";
  const xongTheo = (l: (typeof LOAI_VIEC_TOI)[number]) => {
    const coMa = new Set(
      locViecCuaToi(
        xongDs.map((v) => ({ ...v, phan_viec: v.phan_viec.map((p) => ({ ...p, trang_thai: "dang_lam" })) })),
        l,
        toi,
      ).map((v) => v.id),
    );
    return xongDs.filter((v) => coMa.has(v.id)).sort((a, b) => xongNgay(b).localeCompare(xongNgay(a)));
  };
  return thanhCong(
    {
      nguoi: { email: nd.email, ten: nd.ten },
      du_an: duAn ? { ma: duAn.id, ten: duAn.ten } : null,
      dem: Object.fromEntries(LOAI_VIEC_TOI.map((l) => [l, theo[l].length])),
      viec_nhan: theo.nhan.slice(0, tran).map(dong),
      viec_giao: theo.giao.slice(0, tran).map(dong),
      viec_phoi_hop: theo.phoi_hop.slice(0, tran).map(dong),
      lam_xong: {
        nhan: k.nhan,
        giai_thich: k.giai_thich,
        viec_nhan: xongTheo("nhan").slice(0, tran).map(dong),
        viec_giao: xongTheo("giao").slice(0, tran).map(dong),
        viec_phoi_hop: xongTheo("phoi_hop").slice(0, tran).map(dong),
      },
      gang_thieu: gang.thieu,
      dinh_nghia:
        "nhan = tôi chủ trì đích danh (tên tôi hoặc chức danh lãnh đạo tôi giữ) · giao = việc tôi giao tay (nút + Giao việc / quyết định TGĐ) · " +
        "phoi_hop = phần phối hợp chưa xong giao tôi, hoặc đơn vị tôi đứng đầu; việc tôi đã chủ trì không tính. Chỉ việc đang mở trong sổ cái.",
    },
    [
      {
        loai: "so-cai-cong-viec",
        ma: duAn?.id ?? "toan-cong-ty",
        file_goc: `Sổ cái agent Công việc${duAn ? ` · dự án ${duAn.id} ${duAn.ten}` : " · mọi dự án"}`,
        vi_tri: `3 nút lọc của ${nd.ten}`,
        thoi_diem_trich: new Date().toISOString(),
        trang_thai: "Đọc trực tiếp sổ cái agent Công việc, cùng định nghĩa 3 nút của màn Sơ đồ",
      },
    ],
  );
}


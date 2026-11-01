// ============================================================
// CỔNG /api/mcp/base — 6 công cụ ĐỌC «Đợt 3a Main» (KE-HOACH/31, 27/10/2026) + hai công cụ cũ hỏi không cần mã dự án
//
//   Công cụ                       Câu hỏi kiểm           Hàm của màn (luật 38)                       Quyền (như màn)
//   base.bao_cao_da_nop           CV-10 · CV-11          duLieuSoDo (màn Sơ đồ tổ chức)              mọi người đăng nhập
//   base.kien_nghi_can_quyet      CV-12                  dongCanQuyet + locChoBld + ganNhom           so_cai.xem
//                                                        (tab «Cần ra quyết định» của Báo cáo tuần)
//   base.bao_cao_tuan             CV-17                  docBan · cacBan (màn Báo cáo tuần)           so_cai.xem — KHÔNG trả điểm độ khó
//   base.lich_phong               CV-14                  cuocTheoNgay + locChiTietCuoc (Phòng họp)   mọi người; ghi chú / đường dẫn / khách
//                                                                                                     ngoài chỉ người đặt · được mời · quản trị
//   base.viec_da_xong             CV-18                  viecDaXong (nút «Xong 30 ngày» sổ cái)       so_cai.xem
//   base.thong_bao_cua_toi        CV-19                  danhSachThongBao + demChuaDoc (chuông)       CHỈ chính người hỏi; không đánh dấu đã đọc
//   base.viec_co_han_trong_khoang (không mã dự án)       danhSachSoCai / viecDaXong (sổ cái)          so_cai.xem
//   base.tai_viec_theo_nguoi      (không mã dự án)       danhSachSoCai (sổ cái)                       so_cai.xem
//
// Người hỏi = `ma_nguoi_dung` của lời gọi (Main gửi phần trước @ của email). Không gửi thì công cụ đọc sổ cái chạy như các công
// cụ cũ (agent gọi đã qua ma trận «Ai được gọi ai»); riêng chuông thông báo bắt buộc có người hỏi.
// Mọi số do CODE tính, không gọi AI (phần 🤖 chỉ là chữ AI đã viết sẵn ở màn, ghi rõ 🤖). Không trả đường dẫn / tên tệp.
// CHỈ SERVER.
// ============================================================
import { layQ, type Q } from "@/lib/db";
import { coQuyen } from "@sci/identity";
import { napNguoiDung } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { thanhCong, thatBai, TRAN_BAN_GHI, type KhuonTra, type NguonMcp } from "@/lib/mcp/khuon";
import { danhSachSoCai, viecDaXong, type DongSoCai } from "@/lib/so-cai/dich-vu";
import { duLieuSoDo } from "@/lib/phong/so-do";
import { bayGioVN as bayGioVnChu, cachNgay, congNgay, khoangNgay, ngayVN, tuanCua } from "@/lib/phong/tuan";
import { dongCanQuyet, locChoBld } from "@/lib/bao-cao-tuan/can-quyet";
import { ganNhom } from "@/lib/bao-cao-tuan/can-quyet-nhom-ai";
import { NHOM_CAN_QUYET } from "@/lib/bao-cao-tuan/can-quyet-nhom";
import { cacBan, docBan } from "@/lib/bao-cao-tuan/viet";
import { cuocTheoNgay } from "@/lib/phong-hop/dich-vu";
import { BUOI, bayGioVN, khoangGio, laNgayThat, locChiTietCuoc, phut, tenThu, thuCua, trangThaiCuoc } from "@/lib/phong-hop/thuan";
import { danhSachThongBao, demChuaDoc } from "@/lib/thong-bao";
import { NHAN_LOAI_THONG_BAO } from "@/lib/cau-hinh/bieu-mau";
import { viecCuaDuAn } from "@/lib/gan-wbs/gan-wbs";
import {
  chuoi,
  chanGioiHan,
  gonMa,
  traDuAnTrongDanhSach,
  tenGonViec,
  tongHopTaiTheoNguoi,
  docKhoangHoi,
  tinhTrangTheoHan,
  NHAN_LOAI_PHU_TRACH,
  SO_NGAY_SAP_HAN,
  type LoaiPhuTrach,
  type ViecTai,
} from "@/lib/mcp/cong-base-thuan";
import {
  boLienKet,
  boTienToDonVi,
  cauBuoi,
  chuGioVn,
  chuThoiLuong,
  docBuoi,
  docTuanHoi,
  DS_PHONG_HOP,
  khoangTrong,
  nhacDuAn,
  nhanTuan,
  phutGiua,
  tenBuoi,
  traDonVi,
  traPhongHop,
  type DonViTra,
} from "@/lib/mcp/cong-base-them-thuan";

// ─────────────────────────────────────────────────────────────
// Danh mục — ghép vào DANH_MUC của cong-base.ts
// ─────────────────────────────────────────────────────────────

export const DANH_MUC_THEM = [
  {
    ten: "base.bao_cao_da_nop",
    mo_ta:
      "Đơn vị nào ĐÃ / CHƯA nộp báo cáo tuần — đúng màn Sơ đồ tổ chức: mỗi đơn vị · nộp lúc nào · ai nộp · hạn nộp (theo cấp, Cài đặt) · " +
      "đúng hạn hay trễ bao lâu · chưa nộp thì đã quá hạn chưa, đã được nhắc chưa. Hỏi «phòng X nộp chưa» → don_vi; «tôi / đơn vị tôi nộp chưa» → nguoi",
    tham_so: "tuan? (số tuần, vd 43) | ngay? (yyyy-mm-dd; mặc định tuần này), nam?, don_vi? (tên đơn vị), nguoi? (email — đơn vị của người đó)",
    san_sang: true,
  },
  {
    ten: "base.kien_nghi_can_quyet",
    mo_ta:
      "Kiến nghị / dòng cần quyết định trong báo cáo các đơn vị nộp cho MỘT tuần — đúng tab «Cần ra quyết định» của Báo cáo tuần (đã lọc như màn: " +
      "bỏ dòng việc đã xong, việc dễ). cho_quyet = chưa có việc nào trên sổ cái → đang chờ lãnh đạo quyết; dang_chay = đã giao thành việc, đang làm. " +
      "Mỗi dòng: nội dung · kiến nghị · mức độ · nhóm · đơn vị nêu",
    tham_so: "tuan? | ngay? (mặc định tuần này; tuần này chưa có báo cáo nộp thì lấy tuần trước và ghi rõ), nam?, don_vi?, gioi_han? (mặc định 50)",
    san_sang: true,
  },
  {
    ten: "base.bao_cao_tuan",
    mo_ta:
      "Báo cáo tuần của công ty (màn Báo cáo tuần — code tính số, 🤖 AI viết nhận định): 4 ô số toàn công ty · 🤖 nhận định · 🤖 việc cần lãnh đạo quyết. " +
      "ma_du_an → phần của dự án đó (việc đang mở, quá hạn, xong trong tuần, mới trong tuần + câu nhận định có nhắc dự án). don_vi → dòng của đơn vị đó " +
      "(tải, xong, quá hạn, tên việc + 🤖 nhận xét). Không trả điểm độ khó",
    tham_so: "tuan? | ngay? (mặc định bản mới nhất đã viết xong), nam?, ma_du_an?, don_vi?, gioi_han? (mặc định 30 việc mỗi danh sách)",
    san_sang: true,
  },
  {
    ten: "base.lich_phong",
    mo_ta:
      `Lịch MỘT phòng họp theo ngày (sổ Phòng họp): mọi cuộc đã đặt phòng đó + giờ còn TRỐNG từng buổi (08:00–12:00, 13:30–17:00; hôm nay bỏ giờ đã qua). ` +
      `Ghi chú, đường dẫn họp, khách ngoài chỉ hiện khi người hỏi là người đặt / được mời / quản trị. Phòng: ${DS_PHONG_HOP}`,
    tham_so: "phong (01 | 03 | 09 | tên phòng), ngay? (yyyy-mm-dd, mặc định hôm nay) | tu_ngay + den_ngay (tối đa 14 ngày), buoi? (sang | chieu)",
    san_sang: true,
  },
  {
    ten: "base.viec_da_xong",
    mo_ta:
      "Việc ĐÃ XONG (hoàn thành, không tính việc huỷ) trong khoảng ngày, theo đơn vị / người / dự án — cùng nguồn nút «Xong 30 ngày» của sổ cái. " +
      "Mỗi việc: mã + tên gọn · ngày xong · hạn · xong đúng hạn hay trễ bao nhiêu NGÀY so với hạn của việc · chủ trì · dự án. Mới xong lên đầu",
    tham_so: "tu_ngay, den_ngay (yyyy-mm-dd), don_vi?, nguoi? (email hoặc tên), ma_du_an?, gioi_han? (mặc định 100)",
    san_sang: true,
  },
  {
    ten: "base.thong_bao_cua_toi",
    mo_ta:
      "Chuông thông báo CHƯA ĐỌC của chính người hỏi (ma_nguoi_dung của lời gọi): tổng số chưa đọc + từng tin (giờ · loại · nội dung), mới nhất lên đầu. " +
      "Chỉ đọc — KHÔNG đánh dấu đã đọc. Không xem được chuông của người khác",
    tham_so: "gioi_han? (mặc định 20, tối đa 50)",
    san_sang: true,
  },
];

export const CONG_CU_THEM = new Set(DANH_MUC_THEM.map((c) => c.ten));

export async function chayCongCuThem(congCu: string, ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  switch (congCu) {
    case "base.bao_cao_da_nop":
      return baoCaoDaNop(ts);
    case "base.kien_nghi_can_quyet":
      return kienNghiCanQuyet(ts, maNguoiDung);
    case "base.bao_cao_tuan":
      return baoCaoTuan(ts, maNguoiDung);
    case "base.lich_phong":
      return lichPhong(ts, maNguoiDung);
    case "base.viec_da_xong":
      return viecDaXongCongCu(ts, maNguoiDung);
    case "base.thong_bao_cua_toi":
      return thongBaoCuaToi(ts, maNguoiDung);
    default:
      return thatBai("KHONG_HIEU_YEU_CAU", `Agent Công việc không có công cụ "${congCu}".`);
  }
}

// ─────────────────────────────────────────────────────────────
// Người hỏi · quyền · tra người · tra đơn vị
// ─────────────────────────────────────────────────────────────

/** Người hỏi theo `ma_nguoi_dung` — mã tài khoản, email đủ, hoặc phần trước @ (cùng luật base.lich_hop) */
export async function napNguoiHoi(q: Q, ma: string | undefined): Promise<NguoiDungPhien | null> {
  if (!ma || ma.trim() === "") return null;
  const r = (
    await q.query<{ id: string }>(
      "SELECT id FROM identity.nguoi_dung WHERE active AND (id = $1 OR lower(email) = lower($1) OR split_part(lower(email), '@', 1) = lower($1)) ORDER BY id = $1 DESC, lower(email) = lower($1) DESC LIMIT 1",
      [ma.trim()],
    )
  ).rows[0];
  return r ? napNguoiDung(q, r.id) : null;
}

/** Màn sổ cái / báo cáo tuần đòi quyền «so_cai.xem» — người hỏi không có thì không trả (luật quyền của màn) */
async function chanSoCai(q: Q, maNguoiDung: string | undefined, viec: string): Promise<KhuonTra | null> {
  if (!maNguoiDung) return null;
  const nd = await napNguoiHoi(q, maNguoiDung);
  if (!nd) return thatBai("KHONG_CO_QUYEN", `Người hỏi "${maNguoiDung}" không có tài khoản đang hoạt động ở agent Công việc — không xem được ${viec}.`);
  if (!coQuyen(nd, "so_cai.xem")) return thatBai("KHONG_CO_QUYEN", `${nd.ten} không có quyền xem sổ cái công việc nên không xem được ${viec}.`);
  return null;
}

/** Tra một người: mã · email · phần trước @ · họ tên (bỏ dấu, khớp đúng một người) */
async function traNguoi(q: Q, tho: string): Promise<{ ok: true; id: string; ten: string; don_vi_ids: string[] } | { ok: false; loi: KhuonTra }> {
  const s = tho.replace(/^@/, "").trim().toLowerCase();
  const { rows } = await q.query<{ id: string; email: string; ten: string; don_vi_id: string | null; kn: string[] | null }>(
    `SELECT n.id, n.email, n.ten, n.don_vi_id, (SELECT array_agg(k.don_vi_id) FROM identity.kiem_nhiem k WHERE k.nguoi_dung_id = n.id) AS kn
       FROM identity.nguoi_dung n WHERE n.active`,
  );
  const dung = rows.find((r) => r.id.toLowerCase() === s || r.email.toLowerCase() === s || r.email.toLowerCase().split("@")[0] === s);
  const g = gonMa(s);
  const gap = dung ? [dung] : g.length >= 3 ? rows.filter((r) => gonMa(r.ten).includes(g)) : [];
  if (gap.length === 0) return { ok: false, loi: thatBai("KHONG_CO_DU_LIEU", `Không thấy ai tên/mã "${tho}" trong ${rows.length} người đang hoạt động của agent Công việc.`) };
  if (gap.length > 1) return { ok: false, loi: thatBai("KHONG_HIEU_YEU_CAU", `"${tho}" khớp ${gap.length} người (${gap.slice(0, 6).map((r) => r.ten).join(" · ")}) — ghi rõ email.`) };
  const r = gap[0]!;
  return { ok: true, id: r.id, ten: r.ten, don_vi_ids: [...(r.don_vi_id ? [r.don_vi_id] : []), ...(r.kn ?? [])] };
}

async function dsDonVi(q: Q): Promise<DonViTra[]> {
  return (await q.query<DonViTra>("SELECT id, ten, ten_ngan, loai FROM identity.don_vi WHERE active ORDER BY thu_tu, ten")).rows;
}

const nguon = (loai: string, ma: string, file: string, viTri: string): NguonMcp[] => [
  { loai, ma, file_goc: file, vi_tri: viTri, thoi_diem_trich: new Date().toISOString() },
];

const homNay = () => bayGioVnChu().slice(0, 10);

/** Chủ trì của một dòng sổ cái — tên kèm loại (luật 30) */
function chuTri(v: DongSoCai): { ten: string | null; loai: "nguoi" | "don_vi" | null; ma: string | null } {
  const p = v.phan_viec.find((x) => x.vai !== "phoi_hop") ?? v.phan_viec[0];
  return p ? { ten: p.phu_trach_ten ?? p.phu_trach_id, loai: p.phu_trach_loai, ma: p.phu_trach_id } : { ten: null, loai: null, ma: null };
}

/** Ngày xong (giờ VN) của việc đã xong — dong_luc + 7 giờ */
const ngayXong = (v: DongSoCai): string | null => (v.dong_luc ? bayGioVnChu(new Date(v.dong_luc)).slice(0, 10) : null);

// ─────────────────────────────────────────────────────────────
// base.bao_cao_da_nop — CV-10 «Tuần này phòng Kế hoạch nộp báo cáo chưa?» · CV-11 «Ai chưa nộp báo cáo tuần?»
// ─────────────────────────────────────────────────────────────

async function baoCaoDaNop(ts: Record<string, unknown>): Promise<KhuonTra> {
  const t = docTuanHoi(ts, homNay());
  if (!t.ok) return t.loi;
  const q = await layQ();
  const dl = await duLieuSoDo(q, t.tuan.tu);
  const bay = bayGioVnChu();
  let o = dl.o;
  let loc: string | null = null;
  if (chuoi(ts.don_vi) !== "") {
    const dv = traDonVi(chuoi(ts.don_vi), o.map((x) => ({ id: x.id, ten: x.ten, ten_ngan: x.ten_ngan, loai: x.loai })));
    if (!dv.ok) return dv.loi;
    o = o.filter((x) => x.id === dv.dv.id);
    loc = dv.dv.ten;
  } else if (chuoi(ts.nguoi) !== "") {
    const n = await traNguoi(q, chuoi(ts.nguoi));
    if (!n.ok) return n.loi;
    o = o.filter((x) => n.don_vi_ids.includes(x.id));
    loc = `đơn vị của ${n.ten}`;
    if (o.length === 0) return thatBai("KHONG_CO_DU_LIEU", `${n.ten} không thuộc đơn vị nào phải nộp báo cáo tuần trên sơ đồ tổ chức.`);
  }
  const daNop = [];
  const chuaNop = [];
  for (const x of o) {
    const han = dl.han_nop[x.id] ?? null;
    const bc = dl.bao_cao[x.id];
    if (bc) {
      const luc = bayGioVnChu(new Date(bc.luc));
      const tre = han ? phutGiua(han, luc) : null;
      daNop.push({
        don_vi: x.ten,
        nop_luc: chuGioVn(luc),
        nguoi_nop: bc.nguoi_nop,
        ky_bao_cao: bc.ky,
        han_nop: han ? chuGioVn(han) : null,
        dung_han: tre === null ? null : tre <= 0,
        tinh_trang: tre === null ? "Đã nộp" : tre <= 0 ? "Đã nộp đúng hạn" : `Đã nộp — trễ ${chuThoiLuong(tre)} so với hạn nộp`,
      });
    } else {
      const qua = han !== null && bay > han;
      const nhac = dl.nhac[x.id];
      chuaNop.push({
        don_vi: x.ten,
        han_nop: han ? chuGioVn(han) : null,
        da_qua_han: qua,
        tinh_trang: !han ? "Chưa nộp" : qua ? `Chưa nộp — đã quá hạn nộp ${chuThoiLuong(phutGiua(han, bay))}` : `Chưa nộp — còn ${chuThoiLuong(phutGiua(bay, han))} tới hạn nộp`,
        da_nhac: nhac ? `Đã nhắc lúc ${chuGioVn(bayGioVnChu(new Date(nhac.luc)))}` : null,
      });
    }
  }
  chuaNop.sort((a, b) => Number(b.da_qua_han) - Number(a.da_qua_han));
  return thanhCong(
    {
      tuan: nhanTuan(t.tuan),
      bay_gio: `${chuGioVn(bay)} (giờ Việt Nam)`,
      loc: loc,
      so_don_vi: o.length,
      so_da_nop: daNop.length,
      so_chua_nop: chuaNop.length,
      so_chua_nop_da_qua_han: chuaNop.filter((c) => c.da_qua_han).length,
      chua_nop: chuaNop,
      da_nop: daNop,
      dinh_nghia:
        "Đã nộp = đơn vị có báo cáo đã gửi mà kỳ báo cáo rơi vào tuần này (báo cáo tháng vừa qua cũng tính) — cùng luật màn Sơ đồ tổ chức. " +
        "Hạn nộp theo cấp đơn vị (Cài đặt → Kỳ báo cáo); nộp lúc = lần tải bản đang dùng.",
    },
    nguon("so-do-to-chuc", t.tuan.tu, "Màn Sơ đồ tổ chức agent Công việc · báo cáo tuần đã nộp", `${nhanTuan(t.tuan)} · ${o.length} đơn vị`),
  );
}

// ─────────────────────────────────────────────────────────────
// base.kien_nghi_can_quyet — CV-12 «Tuần này có kiến nghị gì cần lãnh đạo quyết?»
// ─────────────────────────────────────────────────────────────

async function kienNghiCanQuyet(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  const t = docTuanHoi(ts, homNay());
  if (!t.ok) return t.loi;
  const q = await layQ();
  const chan = await chanSoCai(q, maNguoiDung, "tab Cần ra quyết định");
  if (chan) return chan;
  let tuan = t.tuan;
  let kq = await locChoBld(q, await dongCanQuyet(q, tuan), []);
  let ghiChu: string | null = null;
  if (kq.dong.length === 0 && !t.coChi) {
    // «tuần này» mà các đơn vị chưa nộp → tab của tuần trước là cái lãnh đạo đang đọc
    const truoc = tuanCua(congNgay(tuan.tu, -7));
    const kqTruoc = await locChoBld(q, await dongCanQuyet(q, truoc), []);
    if (kqTruoc.dong.length > 0) {
      ghiChu = `${nhanTuan(tuan)} chưa có dòng kiến nghị nào (báo cáo các đơn vị chưa nộp hoặc không nêu) — dưới đây là ${nhanTuan(truoc)}.`;
      tuan = truoc;
      kq = kqTruoc;
    }
  }
  const nh = await ganNhom(q, kq.dong); // chỉ phần CODE xếp + lựa chọn đã lưu; không gọi AI
  let dong = nh.dong;
  if (chuoi(ts.don_vi) !== "") {
    const dv = traDonVi(chuoi(ts.don_vi), await dsDonVi(q));
    if (!dv.ok) return dv.loi;
    dong = dong.filter((d) => d.don_vi.some((x) => x.id === dv.dv.id));
  }
  const tran = chanGioiHan(ts.gioi_han, 50);
  const tenNhom = new Map(NHOM_CAN_QUYET.map((n) => [n.kieu, n.nhan]));
  const motDong = (d: (typeof dong)[number]) => ({
    loai: d.loai === "quyet_dinh" ? "Dòng cần quyết định (báo cáo Ban lãnh đạo)" : "Kiến nghị",
    noi_dung: d.noi_dung.length > 500 ? `${d.noi_dung.slice(0, 500).trimEnd()}…` : d.noi_dung,
    kien_nghi: d.kien_nghi || null,
    muc_do: d.muc_do || null,
    nhom: d.nhom ? `${d.nhom_boi === "ai" ? "🤖 " : ""}${tenNhom.get(d.nhom) ?? d.nhom}` : null,
    don_vi_neu: d.don_vi.map((x) => x.ten),
    viec: d.viec ? `${d.viec.ma} ${tenGonViec(d.viec.ten)} — đang làm` : null,
    co_the_la_viec: !d.viec && d.co_the ? `${d.co_the.ma} ${tenGonViec(d.co_the.ten)} (máy thấy gần giống, chưa chắc)` : null,
    ly_do_ai: d.ai_ly_do ? `🤖 ${d.ai_ly_do}` : null,
  });
  const choQuyet = dong.filter((d) => !d.viec);
  const dangChay = dong.filter((d) => d.viec);
  const canhBao = choQuyet.length + dangChay.length > tran ? [`Danh sách cắt ở ${tran} dòng mỗi nhóm — gọi lại với gioi_han lớn hơn.`] : [];
  return thanhCong(
    {
      tuan: nhanTuan(tuan),
      so_cho_quyet: choQuyet.length,
      so_dang_chay: dangChay.length,
      cho_quyet: choQuyet.slice(0, tran).map(motDong),
      dang_chay: dangChay.slice(0, tran).map(motDong),
      da_an: `Như màn: đã ẩn ${kq.an_xong} dòng mà việc đã xong và ${kq.an_de} dòng việc dễ / rất dễ.`,
      ghi_chu: ghiChu ?? undefined,
      dinh_nghia:
        "Nguồn = bảng kiến nghị trong báo cáo MỚI NHẤT mỗi đơn vị nộp cho tuần + dòng quyết định của báo cáo Ban lãnh đạo. cho_quyet = chưa có việc " +
        "trên sổ cái (lãnh đạo chưa quyết / chưa giao); dang_chay = đã thành việc đang làm. Nhiều đơn vị nêu cùng một ý thì gộp một dòng.",
    },
    nguon("bao-cao-tuan-can-quyet", tuan.tu, "Báo cáo tuần › tab Cần ra quyết định (agent Công việc)", `${nhanTuan(tuan)} · ${dong.length} dòng`),
    canhBao,
  );
}

// ─────────────────────────────────────────────────────────────
// base.bao_cao_tuan — CV-17 «Báo cáo tuần 43 nói gì về dự án HV?»
// ─────────────────────────────────────────────────────────────

async function baoCaoTuan(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  const t = docTuanHoi(ts, homNay());
  if (!t.ok) return t.loi;
  const q = await layQ();
  const chan = await chanSoCai(q, maNguoiDung, "Báo cáo tuần");
  if (chan) return chan;
  const cac = await cacBan(q);
  const id = t.coChi ? t.tuan.tu : (cac.find((b) => b.trang_thai === "xong")?.id ?? cac[0]?.id ?? "");
  const coSan = cac.filter((b) => b.trang_thai === "xong").slice(0, 8).map((b) => `tuần ${b.tuan_so}`).join(", ") || "chưa có tuần nào";
  const ban = id ? await docBan(q, id) : null;
  if (!ban) return thatBai("KHONG_CO_DU_LIEU", `${nhanTuan(t.tuan)} chưa có báo cáo tuần (báo cáo viết khi Ban Tổng Giám đốc nộp báo cáo, muộn nhất thứ Hai tuần sau). Tuần đã có: ${coSan}.`);
  const tuan = { so: ban.tuan_so, nam: Number(ban.tuan_tu.slice(0, 4)), tu: ban.tuan_tu.slice(0, 10), den: ban.tuan_den.slice(0, 10) };
  if (ban.trang_thai !== "xong" || !ban.so_lieu) {
    return thatBai("KHONG_CO_DU_LIEU", ban.trang_thai === "dang_viet" ? `Báo cáo ${nhanTuan(tuan)} đang viết — hỏi lại sau vài phút.` : `Báo cáo ${nhanTuan(tuan)} viết lỗi, chưa có bản đọc được. Tuần đã có: ${coSan}.`);
  }
  const sl = ban.so_lieu;
  const tran = chanGioiHan(ts.gioi_han, 30);
  const ai = ban.ai;
  // Số liệu lưu MÃ đơn vị chủ trì (tinh.ts) — đổi ra tên trước khi trả (luật 30); "bld" = tập thể Ban lãnh đạo
  const tenDv = new Map((await dsDonVi(q)).map((d) => [d.id, d.ten]));
  tenDv.set("bld", "Ban lãnh đạo");
  const tenViec = (ma: string) => {
    const v = sl.viec[ma];
    return v ? `${ma} ${tenGonViec(v.ten)}` : ma;
  };
  const dongViec = (ma: string) => {
    const v = sl.viec[ma];
    if (!v) return { ma_viec_base: ma, ten_gon: ma };
    return {
      ma_viec_base: ma,
      ten_gon: tenGonViec(v.ten),
      han: v.han ? ngayVN(v.han) : null,
      chu_tri: v.don.map((x) => tenDv.get(x) ?? x).join(", ") || null,
      tinh_trang: v.xong_ngay
        ? `Xong ngày ${ngayVN(v.xong_ngay)}`
        : v.tre > 0
          ? `Quá hạn ${v.tre} ngày so với hạn của việc`
          : v.han
            ? "Đang làm, còn trong hạn"
            : "Đang làm, chưa khai hạn",
      ...(v.tien_do ? { tien_do: v.tien_do } : {}),
      ...(v.ghi_chu ? { ghi_chu: v.ghi_chu } : {}),
    };
  };
  const cat = (ds: string[]) => ds.slice(0, tran).map(dongViec);
  const nhanDinh = (ai?.nhan_dinh ?? []).map(boLienKet).filter(Boolean);
  const duLieu: Record<string, unknown> = {
    tuan: nhanTuan(tuan),
    viet_luc: ban.xong_luc ? `${chuGioVn(bayGioVnChu(new Date(ban.xong_luc)))} (giờ Việt Nam)` : null,
    ban_tong_giam_doc_da_nop: ban.cap1_da_nop,
    so_lieu_toan_cong_ty: {
      viec_xong_trong_tuan: sl.the.xong,
      viec_moi_trong_tuan: sl.the.moi,
      viec_dang_mo: sl.the.dang_mo,
      viec_qua_han: sl.the.qua_han,
      don_vi_da_nop_bao_cao: `${sl.the.nop}/${sl.the.tong_don_vi}`,
      tinh_den_ngay: ngayVN(sl.hom_nay),
    },
  };
  const canhBao: string[] = [];
  if (chuoi(ts.ma_du_an) !== "") {
    const dsDa = await layCauHinh(q, "du_an");
    const da = traDuAnTrongDanhSach(chuoi(ts.ma_du_an), dsDa);
    if (!da.ok) return da.loi;
    const cfg = dsDa.find((d) => d.id === da.duAn.id)!;
    const laCua = (ma: string) => sl.viec[ma]?.du_an === cfg.ten;
    const phan = sl.du_an.find((d) => d.ten === cfg.ten);
    const xong = sl.ds_the.xong.filter(laCua);
    const moi = sl.ds_the.moi.filter(laCua);
    // 27/10 (Main đợt 3, CV-17): câu nhận định 🤖 viết cho CẢ công ty. Câu nêu «quá hạn N ngày» mà N không phải số ngày trễ của việc nào
    // trong dự án này là nói việc dự án khác (đo: «hồ sơ chuyển mục đích đất rừng quá hạn 719 ngày» là của Nậm săm 3A) → bỏ khỏi phần dự án.
    const treDuAn = new Set((phan?.qua_han ?? []).map((m) => sl.viec[m]?.tre));
    const soNgayCuaDuAn = (c: string) => [...c.matchAll(/(\d+)\s*ngày/g)].every((x) => Number(x[1]) < 30 || treDuAn.has(Number(x[1])));
    const lienQuan = nhanDinh.filter((c) => nhacDuAn(c, cfg) && soNgayCuaDuAn(c));
    duLieu.du_an = {
      ma: cfg.id,
      ten: cfg.ten,
      so_viec_dang_mo: phan?.mo.length ?? 0,
      so_viec_qua_han: phan?.qua_han.length ?? 0,
      so_viec_xong_trong_tuan: xong.length,
      so_viec_moi_trong_tuan: moi.length,
      viec_qua_han: cat([...(phan?.qua_han ?? [])].sort((a, b) => (sl.viec[b]?.tre ?? 0) - (sl.viec[a]?.tre ?? 0))),
      viec_xong_trong_tuan: cat(xong),
      viec_moi_trong_tuan: cat(moi),
      viec_dang_mo_con_trong_han: cat((phan?.mo ?? []).filter((m) => !(phan?.qua_han ?? []).includes(m))),
      nhan_dinh_nhac_du_an: lienQuan.map((c) => `🤖 ${c}`),
    };
    if (!phan && xong.length === 0 && moi.length === 0) {
      canhBao.push(`Báo cáo ${nhanTuan(tuan)} không có việc nào của dự án ${cfg.id} ${cfg.ten} (sổ cái không có việc thuộc dự án này lúc viết báo cáo).`);
    }
    if (lienQuan.length === 0) canhBao.push(`Phần 🤖 nhận định của báo cáo không có câu nào nhắc dự án ${cfg.id} ${cfg.ten} — chỉ có số việc ở trên.`);
  } else if (chuoi(ts.don_vi) !== "") {
    const dv = traDonVi(chuoi(ts.don_vi), await dsDonVi(q));
    if (!dv.ok) return dv.loi;
    const r = sl.don_vi.find((d) => d.ma === dv.dv.id) ?? sl.don_vi.find((d) => gonMa(d.ten) === gonMa(dv.dv.ten) || gonMa(d.ten) === gonMa(dv.dv.ten_ngan));
    if (!r) return thatBai("KHONG_CO_DU_LIEU", `Báo cáo ${nhanTuan(tuan)} không đánh giá riêng ${dv.dv.ten} (đơn vị không nằm trong danh sách đơn vị đánh giá ở Cài đặt).`);
    duLieu.don_vi = {
      ten: r.ten,
      nhan_su: r.nhan_su,
      viec_dang_mo: r.so_mo,
      viec_qua_han: r.so_qua_han,
      viec_xong_trong_tuan: r.so_xong,
      viec_moi_trong_tuan: r.moi,
      nhan_xet: ai?.nhan_xet?.[r.ma] ? `🤖 ${boLienKet(ai.nhan_xet[r.ma]!)}` : null,
      ds_qua_han: cat(r.ds.qua_han),
      ds_xong_trong_tuan: cat(r.ds.xong),
      ds_moi_trong_tuan: cat(r.ds.moi),
    };
  } else {
    duLieu.nhan_dinh = nhanDinh.map((c) => `🤖 ${c}`);
    duLieu.du_an = sl.du_an.map((d) => ({ ten: d.ten, viec_dang_mo: d.mo.length, viec_qua_han: d.qua_han.length }));
  }
  duLieu.can_lanh_dao_quyet = (ai?.can_quyet ?? []).map((c) => ({ viec: c.ma.map(tenViec), ly_do: `🤖 ${boLienKet(c.ly_do)}` }));
  duLieu.dinh_nghia =
    "Số do code tính từ sổ cái lúc viết báo cáo (tính đến ngày ghi ở tinh_den_ngay); dòng có 🤖 là chữ AI viết từ bảng số đó. " +
    "Quá hạn tính bằng NGÀY so với hạn của chính việc. Báo cáo đơn vị nộp lên xem ở base.bao_cao_da_nop; kiến nghị ở base.kien_nghi_can_quyet.";
  return thanhCong(duLieu, nguon("bao-cao-tuan", tuan.tu, "Màn Báo cáo tuần agent Công việc", nhanTuan(tuan)), canhBao);
}

// ─────────────────────────────────────────────────────────────
// base.lich_phong — CV-14 «Phòng họp 01 chiều nay có trống không?»
// ─────────────────────────────────────────────────────────────

const TRAN_NGAY_PHONG = 14;

async function lichPhong(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  const phong = traPhongHop(chuoi(ts.phong) || chuoi(ts.phong_hop));
  if (!phong) return thatBai("KHONG_HIEU_YEU_CAU", `Thiếu hoặc không hiểu \`phong\` "${chuoi(ts.phong)}". Phòng đang có: ${DS_PHONG_HOP}.`);
  const bay = bayGioVN();
  const tu = chuoi(ts.tu_ngay) || chuoi(ts.ngay) || bay.ngay;
  const den = chuoi(ts.den_ngay) || tu;
  if (!laNgayThat(tu) || !laNgayThat(den) || den < tu) return thatBai("KHONG_HIEU_YEU_CAU", "Ngày không hợp lệ — gửi yyyy-mm-dd có trên lịch, ngày cuối không trước ngày đầu.");
  if (cachNgay(tu, den) + 1 > TRAN_NGAY_PHONG) return thatBai("KHONG_HIEU_YEU_CAU", `Hỏi tối đa ${TRAN_NGAY_PHONG} ngày một lượt (đang hỏi ${khoangNgay(tu, den)}).`);
  const b = docBuoi(ts.buoi);
  if (!b.ok) return b.loi;
  const q = await layQ();
  const nd = await napNguoiHoi(q, maNguoiDung);
  const nguoiXem = nd ? { id: nd.id, la_quan_tri: nd.la_quan_tri } : { id: "" };
  const cuoc = (await cuocTheoNgay(q, tu, den)).filter((c) => c.phong === phong.id).map((c) => locChiTietCuoc(c, nguoiXem));
  const ngay: Record<string, unknown>[] = [];
  for (let d = tu; d <= den; d = congNgay(d, 1)) {
    const trongNgay = cuoc.filter((c) => c.ngay === d);
    const buoi = b.buoi.map((i) => {
      const [a, z] = BUOI[i]!;
      const cuaBuoi = trongNgay.filter((c) => phut(c.tu) < phut(z) && phut(a) < phut(c.den));
      const trong = khoangTrong(cuaBuoi, d, i, bay);
      const daQua = d < bay.ngay || (d === bay.ngay && bay.phut >= phut(z));
      return { buoi: tenBuoi(i), cau: cauBuoi(i, trong, cuaBuoi.length, daQua), gio_trong: trong.map((k) => khoangGio(k.tu, k.den)) };
    });
    const hien = trongNgay.filter((c) => b.buoi.some((i) => phut(c.tu) < phut(BUOI[i]![1]) && phut(BUOI[i]![0]) < phut(c.den)));
    ngay.push({
      ngay: `${tenThu(thuCua(d))} ${ngayVN(d)}`,
      tom_tat: buoi.map((x) => x.cau).join(" · "),
      buoi,
      cuoc: hien.map((c) => ({
        gio: khoangGio(c.tu, c.den),
        noi_dung: c.noi_dung,
        loai: c.loai === "giao_ban" ? "Họp giao ban tuần" : "Họp thường",
        trang_thai: { sap: "sắp họp", dang: "đang họp", xong: "đã xong" }[trangThaiCuoc(c, bay)],
        nguoi_dat: c.nguoi_dat_ten,
        so_nguoi_du: c.moi.length,
        nguoi_du: c.moi.slice(0, 20).map((m) => m.ten),
        ...(c.an_chi_tiet
          ? { chi_tiet: "Ghi chú, đường dẫn họp, khách ngoài chỉ người đặt, người được mời và quản trị xem được." }
          : { ghi_chu: c.ghi_chu && c.ghi_chu.length > 200 ? `${c.ghi_chu.slice(0, 200).trimEnd()}…` : c.ghi_chu, khach_ngoai: c.khach_ngoai, duong_dan_hop: c.duong_dan }),
      })),
    });
  }
  return thanhCong(
    {
      phong: `${phong.ten} (${phong.so_ghe} ghế)`,
      khoang: khoangNgay(tu, den),
      bay_gio: `${bay.gio} ${ngayVN(bay.ngay)} (giờ Việt Nam)`,
      gio_lam_viec: BUOI.map(([a, z]) => khoangGio(a, z)).join(" và "),
      so_cuoc: ngay.reduce((n, x) => n + (x.cuoc as unknown[]).length, 0),
      ngay,
    },
    nguon("so-phong-hop", phong.id, "Sổ Phòng họp agent Công việc", `${phong.ten} · ${khoangNgay(tu, den)}`),
  );
}

// ─────────────────────────────────────────────────────────────
// base.viec_da_xong — CV-18 «Tháng 10 phòng Kỹ thuật xong những việc gì?»
// ─────────────────────────────────────────────────────────────

/** Lọc đơn vị / người / dự án chung cho các công cụ đọc sổ cái không cần mã dự án */
type LocChung = { ok: true; loc: { don_vi_id?: string; nguoi?: string }; nhan: string[]; duAnId: string | null; dsDa: CauHinh["du_an"] } | { ok: false; loi: KhuonTra };

async function docLocChung(q: Q, ts: Record<string, unknown>): Promise<LocChung> {
  const loc: { don_vi_id?: string; nguoi?: string } = {};
  const nhan: string[] = [];
  if (chuoi(ts.don_vi) !== "") {
    const dv = traDonVi(chuoi(ts.don_vi), await dsDonVi(q));
    if (!dv.ok) return dv;
    loc.don_vi_id = dv.dv.id;
    nhan.push(dv.dv.ten);
  }
  if (chuoi(ts.nguoi) !== "") {
    const n = await traNguoi(q, chuoi(ts.nguoi));
    if (!n.ok) return n;
    loc.nguoi = n.id;
    nhan.push(n.ten);
  }
  const dsDa = await layCauHinh(q, "du_an");
  let duAnId: string | null = null;
  if (chuoi(ts.ma_du_an) !== "") {
    const da = traDuAnTrongDanhSach(chuoi(ts.ma_du_an), dsDa);
    if (!da.ok) return da;
    duAnId = da.duAn.id;
    nhan.push(`dự án ${da.duAn.id} ${da.duAn.ten}`);
  }
  return { ok: true, loc, nhan, duAnId, dsDa };
}

async function viecDaXongCongCu(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  const kh = docKhoangHoi({ ...ts, con_mo_thoi: undefined });
  if (!kh.ok) return kh.loi;
  const { tu, den } = kh.khoang;
  const q = await layQ();
  const chan = await chanSoCai(q, maNguoiDung, "việc đã xong");
  if (chan) return chan;
  const lc = await docLocChung(q, ts);
  if (!lc.ok) return lc.loi;
  let ds = (await viecDaXong(q, { ...lc.loc, tu, den })).filter((v) => v.trang_thai === "hoan_thanh");
  const daCua = await viecCuaDuAn(q, lc.dsDa);
  if (lc.duAnId) ds = ds.filter((v) => daCua.get(v.id)?.du_an_id === lc.duAnId);
  const tenDa = new Map(lc.dsDa.map((d) => [d.id, `${d.id} ${d.ten}`]));
  const khoang = khoangNgay(tu, den);
  const pham = lc.nhan.length ? ` của ${lc.nhan.join(" · ")}` : "";
  if (ds.length === 0) return thatBai("KHONG_CO_DU_LIEU", `Không có việc nào hoàn thành trong ${khoang}${pham} (đã soát sổ việc đã xong, không tính việc huỷ).`);
  const tran = chanGioiHan(ts.gioi_han, 100);
  const viec = ds.slice(0, tran).map((v) => {
    const xong = ngayXong(v);
    const han = v.ket_thuc ? v.ket_thuc.slice(0, 10) : null;
    const tre = han && xong ? cachNgay(han, xong) : null;
    const ct = chuTri(v);
    return {
      ma_viec_base: v.id,
      ten_gon: tenGonViec(v.ten),
      xong_ngay: xong ? ngayVN(xong) : null,
      han: han ? ngayVN(han) : null,
      dung_han: tre === null ? (han ? null : "Việc không khai hạn") : tre > 0 ? `Xong trễ ${tre} ngày so với hạn của việc` : "Xong đúng hạn",
      chu_tri: ct.ten,
      loai_chu_tri: ct.loai,
      du_an: tenDa.get(daCua.get(v.id)?.du_an_id ?? "") ?? v.du_an ?? null,
    };
  });
  const canhBao: string[] = [];
  if (ds.length > tran) canhBao.push(`Còn ${ds.length - tran} việc chưa trả về vì chạm trần ${tran} — gọi lại với gioi_han lớn hơn hoặc khoảng ngày ngắn hơn.`);
  if (ds.length >= 500) canhBao.push("Sổ việc đã xong chỉ đọc 500 việc mới nhất một lượt — hỏi khoảng ngày ngắn hơn để chắc đủ.");
  return thanhCong(
    {
      khoang,
      loc: lc.nhan.length ? lc.nhan.join(" · ") : null,
      so_viec: ds.length,
      so_xong_dung_han: viec.filter((v) => v.dung_han === "Xong đúng hạn").length,
      so_xong_tre: viec.filter((v) => typeof v.dung_han === "string" && v.dung_han.startsWith("Xong trễ")).length,
      viec,
      dinh_nghia:
        "Việc đã xong = việc hoàn thành có ngày xong (giờ Việt Nam) trong khoảng, tính cả hai đầu; không tính việc huỷ. Lọc đơn vị: việc đơn vị chủ trì / " +
        "phối hợp hoặc người có đơn vị chính ở đó làm — cùng bộ lọc của sổ cái. Trễ / đúng hạn tính bằng NGÀY: ngày xong − hạn của việc.",
    },
    nguon("so-cai-cong-viec", "da-xong", "Sổ cái agent Công việc · việc đã xong", `${khoang}${pham}`),
    canhBao,
  );
}

// ─────────────────────────────────────────────────────────────
// base.thong_bao_cua_toi — CV-19 «Tôi có thông báo gì chưa đọc?»
// ─────────────────────────────────────────────────────────────

async function thongBaoCuaToi(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  if (!maNguoiDung) return thatBai("KHONG_HIEU_YEU_CAU", "Chuông thông báo là của riêng từng người — lời gọi phải gửi người hỏi (ma_nguoi_dung).");
  const q = await layQ();
  const nd = await napNguoiHoi(q, maNguoiDung);
  if (!nd) return thatBai("KHONG_CO_DU_LIEU", `"${maNguoiDung}" không có tài khoản đang hoạt động ở agent Công việc — không có chuông thông báo.`);
  const hoiAi = chuoi(ts.nguoi).toLowerCase();
  if (hoiAi !== "" && hoiAi !== nd.id.toLowerCase() && hoiAi !== nd.email.toLowerCase() && hoiAi !== nd.email.toLowerCase().split("@")[0]) {
    return thatBai("KHONG_CO_QUYEN", "Chỉ xem được chuông thông báo của chính mình.");
  }
  const tran = Math.min(100, chanGioiHan(ts.gioi_han, 20)); // 27/10 (CV-19): 92 tin chưa đọc chỉ hiện 50 — nới 100
  const tong = await demChuaDoc(q, nd);
  const ds = await danhSachThongBao(q, nd, { chua_doc: true, gioi_han: tran });
  return thanhCong(
    {
      nguoi: nd.ten,
      so_chua_doc: tong,
      ...(tong > ds.length ? { da_cat: `Hiện ${ds.length}/${tong} tin mới nhất.` } : {}),
      thong_bao: ds.map((t) => ({
        luc: chuGioVn(bayGioVnChu(new Date(t.luc))),
        loai: NHAN_LOAI_THONG_BAO[t.loai] ?? "Thông báo",
        noi_dung: t.noi_dung,
        ...(t.tep?.length ? { tep_kem: t.tep.map((x) => x.ten) } : {}),
      })),
      ghi_chu: tong === 0 ? `${nd.ten} không có thông báo nào chưa đọc.` : "Chỉ đọc — các tin vẫn còn chưa đọc trên chuông của agent Công việc.",
    },
    nguon("chuong-thong-bao", nd.id, "Chuông thông báo agent Công việc", `${tong} tin chưa đọc của ${nd.ten}`),
  );
}

// ─────────────────────────────────────────────────────────────
// base.viec_co_han_trong_khoang KHÔNG mã dự án — mọi việc trên sổ cái (kể cả việc không thuộc dự án nào)
// ─────────────────────────────────────────────────────────────

export async function viecCoHanMoiDuAn(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  const kh = docKhoangHoi(ts);
  if (!kh.ok) return kh.loi;
  const k = kh.khoang;
  const q = await layQ();
  const chan = await chanSoCai(q, maNguoiDung, "sổ cái công việc");
  if (chan) return chan;
  const lc = await docLocChung(q, { ...ts, ma_du_an: undefined });
  if (!lc.ok) return lc.loi;
  const hn = homNay();
  let ds: DongSoCai[] = await danhSachSoCai(q, lc.loc);
  if (!k.conMoThoi) ds = [...ds, ...(await viecDaXong(q, lc.loc)).filter((v) => v.trang_thai === "hoan_thanh")];
  const khongHan = ds.filter((v) => !v.ket_thuc).length;
  const gap = ds
    .filter((v) => v.ket_thuc && v.ket_thuc.slice(0, 10) >= k.tu && v.ket_thuc.slice(0, 10) <= k.den)
    .sort((a, b) => a.ket_thuc!.localeCompare(b.ket_thuc!) || a.id.localeCompare(b.id));
  const khoang = khoangNgay(k.tu, k.den);
  const loai = k.conMoThoi ? "việc đang mở" : "việc (cả đang mở lẫn đã xong)";
  const pham = lc.nhan.length ? ` của ${lc.nhan.join(" · ")}` : "";
  if (gap.length === 0) {
    return thatBai("KHONG_CO_DU_LIEU", `Không có ${loai} nào${pham} có hạn trong ${khoang} (mọi dự án). Đã soát ${ds.length} ${loai}, ${khongHan} việc không khai hạn — CHƯA BIẾT, không phải "không có".`);
  }
  const daCua = await viecCuaDuAn(q, lc.dsDa);
  const tenDa = new Map(lc.dsDa.map((d) => [d.id, `${d.id} ${d.ten}`]));
  const tran = chanGioiHan(ts.gioi_han, TRAN_BAN_GHI);
  const viec = gap.slice(0, tran).map((v) => {
    const daXong = v.trang_thai !== "dang_mo";
    const tt = tinhTrangTheoHan({ daXong, han: v.ket_thuc!.slice(0, 10), xongNgay: daXong ? ngayXong(v) : null }, hn);
    const ct = chuTri(v);
    return {
      ma_viec_base: v.id,
      ten: v.ten,
      ten_gon: tenGonViec(v.ten),
      han: v.ket_thuc!.slice(0, 10),
      nguoi_phu_trach: ct.ma,
      ten_nguoi_phu_trach: ct.ten,
      loai_phu_trach: ct.loai,
      du_an: tenDa.get(daCua.get(v.id)?.du_an_id ?? "") ?? v.du_an ?? null,
      ...tt,
    };
  });
  return thanhCong(
    {
      ma_du_an: null,
      pham_vi: `Mọi dự án và việc không thuộc dự án nào${pham}`,
      tu_ngay: k.tu,
      den_ngay: k.den,
      khoang,
      con_mo_thoi: k.conMoThoi,
      ngay_tinh: hn,
      so_viec: gap.length,
      so_viec_da_qua_han: viec.filter((v) => v.da_qua_han === true).length,
      so_viec_khong_khai_han: khongHan,
      viec,
      dinh_nghia:
        "Hạn = ngày kết thúc của việc trong sổ cái; khoảng tính CẢ ngày đầu và ngày cuối. Lọc người: việc người đó chủ trì / phối hợp hoặc giao cho đơn vị " +
        "của người đó — cùng bộ lọc «người» của sổ cái. qua_han_ngay tính bằng NGÀY so với hạn của việc.",
    },
    nguon("so-cai-cong-viec", "moi-du-an", "Sổ cái agent Công việc · mọi dự án", `${loai} có hạn trong ${khoang}${pham}`),
    gap.length > tran ? [`Còn ${gap.length - tran} việc chưa trả về vì chạm trần ${tran} — gọi lại với khoảng ngày ngắn hơn.`] : [],
  );
}

// ─────────────────────────────────────────────────────────────
// base.tai_viec_theo_nguoi KHÔNG mã dự án — tải việc đang mở trên cả sổ cái (không có cột việc găng: găng tính theo dự án)
// ─────────────────────────────────────────────────────────────

export async function taiViecMoiDuAn(ts: Record<string, unknown>, maNguoiDung?: string): Promise<KhuonTra> {
  const q = await layQ();
  const chan = await chanSoCai(q, maNguoiDung, "sổ cái công việc");
  if (chan) return chan;
  const locNguoi = boTienToDonVi(chuoi(ts.nguoi).replace(/^@/, ""));
  const hn = homNay();
  const ds = await danhSachSoCai(q);
  const viec: ViecTai[] = ds.map((v) => {
    const han = v.ket_thuc ? v.ket_thuc.slice(0, 10) : null;
    return {
      id: v.id,
      ten: v.ten,
      nguoiPhuTrach: chuTri(v).ma ?? "",
      daXong: false,
      han,
      quaHanNgay: han && han < hn ? cachNgay(han, hn) : null,
      maWbs: [],
    };
  });
  const tenCua = new Map(ds.map((v) => [chuTri(v).ma ?? "", chuTri(v).ten]));
  const dvL = new Map((await q.query<{ id: string; ten_ngan: string; loai: string | null; cha_id: string | null }>("SELECT id, ten_ngan, loai, cha_id FROM identity.don_vi")).rows.map((r) => [r.id, r]));
  const ndL = new Map((await q.query<{ id: string; don_vi_id: string | null }>("SELECT id, don_vi_id FROM identity.nguoi_dung")).rows.map((r) => [r.id, r]));
  const phanLoai = (ma: string): { loai: LoaiPhuTrach; thuoc: string | null } => {
    const d = dvL.get(ma);
    if (d) return { loai: d.loai === "phong" ? "phong" : d.loai === "chuc_danh" ? "chuc_danh_lanh_dao" : "don_vi", thuoc: d.cha_id ? (dvL.get(d.cha_id)?.ten_ngan ?? null) : null };
    const nd = ndL.get(ma);
    if (nd) return { loai: "nguoi", thuoc: nd.don_vi_id ? (dvL.get(nd.don_vi_id)?.ten_ngan ?? null) : null };
    return { loai: "chua_ro", thuoc: null };
  };
  let tai = tongHopTaiTheoNguoi(viec, new Set<string>(), hn, (m) => tenCua.get(m) || null, locNguoi ? TRAN_BAN_GHI : 5, phanLoai);
  if (locNguoi !== "") {
    const g = gonMa(locNguoi);
    tai = tai.filter((d) => d.ma_base !== null && (gonMa(d.ma_base).includes(g) || gonMa(boTienToDonVi(d.ho_ten ?? "")).includes(g) || gonMa(d.ho_ten ?? "").includes(g)));
    if (tai.length === 0) return thatBai("KHONG_CO_DU_LIEU", `Không có ai khớp "${chuoi(ts.nguoi)}" đang chủ trì việc mở trên sổ cái (đã soát ${ds.length} việc đang mở, mọi dự án).`);
  }
  if (ds.length === 0) return thatBai("KHONG_CO_DU_LIEU", "Sổ cái agent Công việc không có việc nào đang mở.");
  const chuaGiao = tai.find((d) => d.ma_base === null);
  const coNguoi = tai.filter((d) => d.ma_base !== null);
  return thanhCong(
    {
      ma_du_an: null,
      pham_vi: "Mọi dự án và việc không thuộc dự án nào",
      ngay_tinh: hn,
      loc_theo_nguoi: locNguoi || null,
      so_nguoi: coNguoi.length,
      so_ngay_sap_han: SO_NGAY_SAP_HAN,
      dinh_nghia_loai: NHAN_LOAI_PHU_TRACH,
      luu_y:
        "Hỏi không theo dự án nên KHÔNG có cột việc găng (găng tính theo cây WBS từng dự án — hỏi kèm ma_du_an). Danh sách gồm cả phòng, đơn vị, chức danh lãnh đạo — " +
        "xem `loai`; số của một phòng chỉ tính việc giao THẲNG cho phòng đó. Khi lọc theo người / đơn vị, `viec_nang` là đủ mọi việc đang mở của dòng đó. Dùng `ten_gon` khi nhắc tên việc.",
      pham_vi_da_soat: { so_viec_dang_mo: ds.length },
      nguoi: coNguoi.slice(0, chanGioiHan(ts.gioi_han)).map((d) => ({ ...d, viec_gang: null })),
      chua_giao_cho_ai: chuaGiao ? { dang_mo: chuaGiao.dang_mo, qua_han: chuaGiao.qua_han, sap_han_7_ngay: chuaGiao.sap_han_7_ngay } : null,
    },
    nguon("so-cai-cong-viec", "moi-du-an", "Sổ cái agent Công việc · mọi dự án", `tải việc của ${coNguoi.length} người/đơn vị trên ${ds.length} việc đang mở`),
  );
}

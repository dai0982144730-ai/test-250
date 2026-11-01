// ============================================================
// kiem-tra/kiem-tra.ts — KIỂM TRA TRƯỚC KHI GỬI. Chủ module: kiem-tra (giai đoạn 3).
// Luật là DỮ LIỆU (bảng docflow.luat_kiem_tra, đồng bộ với cấu hình luat_kiem_tra) — bật/tắt, mức, áp dụng cho mẫu nào.
// Ô nào thuộc luật nào: trường `luat` của ô trong định nghĩa mẫu (mau_word.dinh_nghia), không viết cứng.
// Mỗi lỗi chỉ đúng ô (vi_tri: tag ô, hoặc bảng + dòng + cột).
// ============================================================
import type { Q } from "@/lib/db";
import type {
  DongCongViec,
  DuDoanDong,
  KetQuaKiemTra,
  KyBaoCao,
  LoiKiemTra,
  MocViec,
  MauWord,
  NguoiDungPhien,
  ONhapMau,
  PhuTrach,
} from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { xemTruocVaoSoCai } from "@/lib/so-cai/dich-vu";
import { docMocViec } from "@/lib/so-cai/moc-viec";
import { giaiMocBaoCao } from "@/lib/so-cai/phu-thuoc";
import { docWord, type NoiDungWord } from "./doc-word";
import { docExcel, laGoiExcel } from "@/lib/mau-excel/doc-excel";
import { thuNhanMauGoc } from "./nhan-mau-goc";
import { BANG_PHU_SINH_VIEC, dongViecTuBangPhu } from "./viec-tu-kien-nghi";
import { chuanHoaTieuDe, docKyBaoCao, docNgay, giaTri, laChuaDien, laDaXong, ngayVN, tachTen } from "./chuan-hoa";
import { anhXaBang, chuanHoaDongTheoNghia, tenCuCuaChuong, type AnhXaBang } from "./cau-truc";
import { napDanhBa, phanGiaiPhuTrach, timTen, type DanhBa } from "./phan-giai";
import { bayGioVN } from "@/lib/phong/tuan";
import { MAU_DUNG_CHUNG, thuocDonVi, xacDinhDonViLap, type NutDonVi } from "./don-vi-lap";

/** Ô thêm ở mẫu bản 5 — file theo mẫu cũ không có, không báo "mất ô nhập". */
const O_MOI_BAN_5 = new Set(["don_vi_lap", "du_an_ten", "du_an_chu_dau_tu", "du_an_thoi_gian_thi_cong", "du_an_ngay_phat_dien", "du_an_tinh_trang", "du_an_tien_do_luy_ke"]);
/** Ô mới của mẫu bản 9 (01/10/2026) theo từng mẫu: dòng "Gửi:" thêm vào đầu trang Form 0–4, 9 — file làm theo mẫu cũ không có thì
 *  không báo mất (nơi nhận lấy theo mặc định của mẫu như trước) */
const O_MOI_BAN_9: Record<string, string[]> = { gui_den: ["form-0", "form-1", "form-2", "form-3", "form-4", "form-9"] };
import { dungDauVao } from "./dau-vao";
import { viecKyTruocBiThieu } from "./chuoi-ky-truoc";
import { gopYBangAi, type GopYAi, type TuyChonGopYAi } from "./gop-y-ai";
import { apDungMau, danhSachLuat, rutGonDinhNghia, type LuatDaDung } from "@/lib/luat/kho-luat";
import { chayLuatCode } from "@/lib/luat/chay-luat";
import type { LuatKiemTra } from "@/lib/luat/types";

type Muc = LoiKiemTra["muc"];
/** Chương việc thống nhất (mẫu phiên bản 4, Mr. Đại chốt 29/09/2026) và tên chương của mẫu cũ — file cũ vẫn nhận. */
const CHUONG_VIEC_MOI = new Set(["KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI", "KẾT QUẢ VÀ KẾ HOẠCH VIỆC THÁNG TỚI"].map(chuanHoaTieuDe));
const CHUONG_VIEC_CU = ["CÔNG VIỆC", "KẾ HOẠCH CÔNG VIỆC THÁNG TỚI"].map(chuanHoaTieuDe);
const THU_TU_MUC: Muc[] = ["goi_y", "canh_bao", "chan"];
/** Hạ mức xuống tối đa `tran` (vd tự gán phụ trách không bao giờ chặn). */
const tranMuc = (m: Muc, tran: Muc): Muc => (THU_TU_MUC.indexOf(m) > THU_TU_MUC.indexOf(tran) ? tran : m);

/** Dòng việc đọc từ bảng, kèm thông tin thêm (không bắt buộc theo hợp đồng). */
export type DongCongViecMo = DongCongViec & {
  mo_ta?: string; // các dòng sau của ô "Công việc"
  han_quyet_dinh?: string; // Form 0: hạn TGĐ phải quyết định (ISO)
  cot_khac?: Record<string, string>; // cột khác của bảng: ưu tiên, tài liệu đã chuẩn bị...
};

/** Ô nhập kèm luật áp dụng (trường thêm trong định nghĩa mẫu). */
type ONhap = ONhapMau & { luat?: string };

export interface DuDoanCoChiSo extends DuDoanDong {
  chi_so: number; // chỉ số trong KetQuaKiemTra.cong_viec
}

export interface TuyChonKiemTra {
  don_vi_lap?: string | null; // mặc định = đơn vị của người gửi
  tai_lieu_id?: string | null; // để sổ cái nhận ra bản gửi lại của cùng tài liệu
  phien_ban?: number | null;
  nguoi_gui_that?: string | null; // văn thư nhập thay người ngoài: cấp "bên ngoài"
  bo_qua_so_cai?: boolean;
  /** Lúc nộp bản này (ISO). Mẫu bản 6 bỏ ô "Ngày lập": máy tự ghi ngày nộp và kiểm kỳ báo cáo theo ngày đó.
   *  Bỏ trống = bây giờ; kiểm lại một bản đã lưu thì truyền lúc tải lên của bản đó. */
  ngay_nop?: string | null;
  /** Bản NỘP MỚI (tải lên để gửi): chỉ nhận .xlsx (Mr. Đại chốt 22/10/2026). Không đặt = kiểm lại bản đã lưu — Word cũ vẫn đọc. */
  moi_nop?: boolean;
}

export interface KetQuaKiemTraDayDu extends KetQuaKiemTra {
  tu_do: boolean; // tài liệu không theo mẫu, gửi tự do không sinh việc
  mau: MauWord | null;
  don_vi_lap: string | null;
  du_doan: DuDoanCoChiSo[];
  so_cai_chua_san_sang?: string; // module sổ cái chưa trả lời được (không chặn)
  noi_dung?: NoiDungWord;
  luat_da_dung?: LuatDaDung[]; // bằng chứng: luật + phiên bản luật đã dùng (bảng docflow.luat_kiem_tra)
  ngay_nop?: string; // yyyy-mm-dd giờ VN — máy ghi (mẫu bản 6 không còn ô Ngày lập)
}

// ---------------- Mẫu ----------------

interface HangMau {
  ma: string;
  ten: string;
  don_vi_lap: string | null;
  gui_den_mac_dinh: string | null;
  loai_ky: MauWord["loai_ky"];
  dinh_nghia: MauWord["dinh_nghia"] | string;
  phien_ban: number;
  active: boolean;
  khoa_luu?: string | null;
  sua_luc?: string | Date;
}

export function hangThanhMau(r: HangMau): MauWord & { khoa_luu: string | null; sua_luc: string | null } {
  const dn = typeof r.dinh_nghia === "string" ? JSON.parse(r.dinh_nghia) : r.dinh_nghia;
  return {
    ma: r.ma,
    ten: r.ten,
    don_vi_lap: r.don_vi_lap,
    gui_den_mac_dinh: r.gui_den_mac_dinh,
    loai_ky: r.loai_ky,
    dinh_nghia: { o_nhap: [], bang_cong_viec: [], muc_bat_buoc: [], ...(dn ?? {}) },
    phien_ban: Number(r.phien_ban),
    active: r.active,
    khoa_luu: r.khoa_luu ?? null,
    sua_luc: r.sua_luc ? new Date(r.sua_luc).toISOString() : null,
  };
}

/** So thứ tự mẫu: form-2 trước form-10. */
function soMau(ma: string): number {
  const m = /(\d+)$/.exec(ma);
  return m ? Number(m[1]) : 9999;
}

export async function danhSachMau(q: Q): Promise<MauWord[]> {
  const { rows } = await q.query<HangMau>("SELECT * FROM docflow.mau_word");
  return rows.map(hangThanhMau).sort((a, b) => soMau(a.ma) - soMau(b.ma) || a.ma.localeCompare(b.ma));
}

export async function layMau(q: Q, ma: string): Promise<MauWord | null> {
  const { rows } = await q.query<HangMau>("SELECT * FROM docflow.mau_word WHERE ma = $1", [ma]);
  return rows[0] ? hangThanhMau(rows[0]) : null;
}

// ---------------- Luật ----------------

type CauHinhLuat = CauHinh["luat_kiem_tra"];

/** Luật hệ thống: bật/mức/áp dụng lấy từ bảng luật (luat/kho-luat.ts); bảng chưa có thì theo cấu hình như cũ. */
function boLuat(ch: CauHinhLuat, mauMa: string | null, bang: LuatKiemTra[] | null) {
  const heThong = (bang ?? []).filter((l) => l.he_thong);
  const nguon: { ma: string; ten: string; bat: boolean; muc: Muc; ap_dung: string[] | "tat_ca" }[] = heThong.length ? heThong : ch.luat;
  return (ma: string): { muc: Muc; ten: string } | null => {
    const l = nguon.find((x) => x.ma === ma);
    if (!l || !l.bat) return null;
    if (l.ap_dung !== "tat_ca" && (!mauMa || !l.ap_dung.includes(mauMa))) return null;
    return { muc: l.muc, ten: l.ten };
  };
}

/** Luật mặc định của một ô khi định nghĩa mẫu không ghi `luat`. */
function luatCuaO(o: ONhap): string {
  if (o.luat) return o.luat;
  if (/^ky_(loai|so|nam|tu|den)$/.test(o.tag)) return "ky_bao_cao";
  if (o.tag === "gui_den") return "gui_den";
  if (/^(nguoi_lap|nguoi_kiem_soat|ngay_lap)$/.test(o.tag)) return "nguoi_lap";
  return "dung_mau";
}

function loaiKy(v: string): KyBaoCao["loai"] | null {
  const s = v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (/^tuan/.test(s) || s === "week") return "tuan";
  if (/^thang/.test(s) || s === "month") return "thang";
  if (/^quy/.test(s)) return "quy";
  if (/tu do/.test(s)) return "tu_do";
  return null;
}

// ---------------- Kiểm tra ----------------

/** Kiểm tra đầy đủ: kết quả + dự đoán vào sổ cái + mẫu. Dùng cho màn Soạn và gửi. */
/** Đầu ý danh sách: "• " (danh sách của Word), "- ", "+ ", "1. ", "2) ", "a) ". */
const MUC_DS = /^(?:(?:•|[-–+*])\s*|(?:\d{1,2}|[a-zđ])[.)]\s+)/i;

export async function kiemTraDayDu(
  q: Q,
  nd: NguoiDungPhien,
  buf: Buffer,
  tenTep: string,
  tuyChon: TuyChonKiemTra = {},
): Promise<KetQuaKiemTraDayDu> {
  const loi: LoiKiemTra[] = [];
  const chLuat = await layCauHinh(q, "luat_kiem_tra");
  const chDe = await layCauHinh(q, "quy_tac_de");
  const chNgoai = await layCauHinh(q, "nguoi_ngoai");
  const chuaDien = chLuat.gia_tri_chua_dien;
  let donViLap = tuyChon.don_vi_lap !== undefined ? tuyChon.don_vi_lap : nd.don_vi_id;

  const ketQua = (x: Partial<KetQuaKiemTraDayDu>): KetQuaKiemTraDayDu => ({
    dat: !loi.some((l) => l.muc === "chan"),
    mau_ma: null,
    o_nhap: {},
    gui_den: [],
    cong_viec: [],
    loi,
    tu_do: false,
    mau: null,
    don_vi_lap: donViLap,
    du_doan: [],
    ...x,
  });

  // 1. Đọc file
  let noiDung: NoiDungWord;
  const laWord = /\.(docx|docm)$/i.test(tenTep);
  const laExcel = /\.xlsx$/i.test(tenTep) || (!laWord && laGoiExcel(buf));
  // DOCFLOW_CHO_NOP_WORD=1: công tắc khẩn cấp mở lại nộp Word (và bộ kịch bản kiểm cũ dùng báo cáo Word) — mặc định tắt
  if (laWord && tuyChon.moi_nop && process.env.DOCFLOW_CHO_NOP_WORD !== "1") {
    // Từ 22/10/2026 báo cáo tuần nộp bằng Excel. Báo cáo Word đã nộp trước đó vẫn đọc lại được (không đặt moi_nop).
    loi.push({
      luat: "dung_mau",
      muc: "chan",
      thong_diep: `File "${tenTep}" là Word — từ ngày 22/10/2026 báo cáo nộp bằng tệp Excel (.xlsx). Vào màn «Mẫu báo cáo» bấm «Tải mẫu», chép nội dung sang tờ «Mẫu trắng» rồi nộp tệp .xlsx.`,
      vi_tri: { tag: "mau_ma" },
    });
    return ketQua({});
  }
  if (laExcel) {
    try {
      noiDung = await docExcel(buf, async () => (await danhSachMau(q)).filter((m) => m.active));
    } catch (e) {
      loi.push({ luat: "dung_mau", muc: "chan", thong_diep: `Không đọc được tệp Excel: ${e instanceof Error ? e.message : String(e)}` });
      return ketQua({});
    }
    for (const c of noiDung.chan_doc ?? []) loi.push({ luat: "dung_mau", muc: "chan", thong_diep: c });
    for (const c of noiDung.canh_bao_doc ?? []) loi.push({ luat: "dung_mau", muc: "canh_bao", thong_diep: c });
  } else if (!laWord) {
    // Không phải Excel / Word: chỉ gửi tự do được (nếu cấu hình cho phép)
    noiDung = { mau_ma: null, o_nhap: {}, bang: {}, tieu_de: [], van_ban: "" };
  } else {
    try {
      noiDung = await docWord(buf);
    } catch (e) {
      loi.push({ luat: "dung_mau", muc: "chan", thong_diep: `Không đọc được file Word: ${e instanceof Error ? e.message : String(e)}` });
      return ketQua({});
    }
  }

  // File Word gốc của công ty (chưa có ô nhập gắn mã): tự nhận Form và gắn ô nhập, nội dung giữ nguyên
  const goc = laWord ? await thuNhanMauGoc(buf, tenTep, noiDung) : null;
  if (goc) {
    noiDung = goc.noi_dung;
    loi.push({
      luat: "dung_mau",
      muc: "goi_y",
      thong_diep: `File Word gốc (chưa có ô nhập): hệ thống tự nhận là ${goc.ten_mau} và tự gắn ô nhập. Lần sau dùng mẫu Excel ở màn «Mẫu báo cáo» (từ 22/10/2026 nộp mới chỉ nhận .xlsx).`,
    });
  }

  // Loại đơn vị của người gửi (cá nhân / đơn vị riêng được gửi tự do theo cấu hình)
  let loaiDonVi: string | null = null;
  if (donViLap) {
    const r = await q.query<{ loai: string }>("SELECT loai FROM identity.don_vi WHERE id = $1", [donViLap]);
    loaiDonVi = r.rows[0]?.loai ?? null;
  }
  const duocTuDo = chNgoai.ca_nhan_duoc_gui_tu_do && (loaiDonVi === "ca_nhan" || loaiDonVi === "rieng");

  // 2. Nhận ra mẫu
  const maMau = noiDung.mau_ma;
  const mau = maMau ? await layMau(q, maMau) : null;
  let bangLuat: LuatKiemTra[] | null = null;
  try {
    bangLuat = await danhSachLuat(q);
  } catch {
    bangLuat = null; // bảng luật chưa sẵn sàng: dùng cấu hình
  }
  const luat = boLuat(chLuat, mau?.ma ?? maMau, bangLuat);
  const bao = (ma: string, thong_diep: string, vi_tri?: LoiKiemTra["vi_tri"], tran?: Muc, epMuc?: Muc) => {
    const l = luat(ma);
    if (!l && !epMuc) return;
    const muc = epMuc ?? (tran ? tranMuc(l!.muc, tran) : l!.muc);
    loi.push({ luat: ma, muc, thong_diep, ...(vi_tri ? { vi_tri } : {}) });
  };

  if (!maMau || !mau || !mau.active) {
    if (!maMau && duocTuDo) {
      loi.push({ luat: "dung_mau", muc: "goi_y", thong_diep: "Tài liệu không theo mẫu: gửi tự do, không sinh việc vào sổ cái. Tự chọn nơi nhận." });
      return ketQua({ tu_do: true, o_nhap: noiDung.o_nhap, noi_dung: noiDung });
    }
    const thongDiep = !maMau
      ? !laExcel && !laWord
        ? `File "${tenTep}" không phải tệp Excel (.xlsx) — hệ thống chỉ đọc báo cáo làm trên mẫu Excel. Vào màn «Mẫu báo cáo» bấm «Tải mẫu», điền vào tờ «Mẫu trắng» rồi tải tệp .xlsx lên.`
        : laExcel
          ? `Không nhận ra mẫu: tệp "${tenTep}" không có dòng «Mã mẫu» ở đầu tờ và tên các chương không khớp mẫu nào. Vào màn «Mẫu báo cáo» tải đúng mẫu của đơn vị, chép nội dung sang rồi tải lên lại.`
          : Object.keys(noiDung.o_nhap).length === 0
            ? `Không nhận ra mẫu: file "${tenTep}" không có ô nhập nào — đây là bản Word thường, không phải mẫu của hệ thống. Vào màn «Mẫu báo cáo» tải mẫu Excel, chép nội dung sang rồi tải lên lại.`
            : `Không nhận ra mẫu: file "${tenTep}" không có ô mã mẫu (mau_ma). Vào màn «Mẫu báo cáo» tải mẫu và điền vào đúng mẫu.`
      : !mau
        ? `Mẫu "${maMau}" không có trong hệ thống.`
        : `Mẫu "${mau.ten}" đã ngừng dùng.`;
    // Không nhận ra mẫu thì không kiểm tra tiếp được: luôn chặn (kể cả khi tắt luật đúng mẫu)
    loi.push({ luat: "dung_mau", muc: "chan", thong_diep: thongDiep, vi_tri: { tag: "mau_ma" } });
    return ketQua({ mau_ma: maMau, o_nhap: noiDung.o_nhap, noi_dung: noiDung });
  }

  // Báo cáo của ĐƠN VỊ NÀO do NỘI DUNG FILE nói (Mr. Đại chốt 29/09/2026 — thay "đóng dấu theo mẫu" 28/09 và
  // "không rõ thì lấy đơn vị chính của người nộp"). Người nộp không thuộc đơn vị đó (chính / kiêm nhiệm) → CHẶN.
  // Văn bản đến từ bên ngoài (văn thư nhập, nguoi_gui_that) không xét.
  const danhBa: DanhBa = await napDanhBa(q);
  if (!tuyChon.nguoi_gui_that) {
    const cay = (await q.query<NutDonVi>("SELECT id, ten, cha_id, loai FROM identity.don_vi")).rows;
    const tenDv = (id: string) => cay.find((d) => d.id === id)?.ten ?? id;
    const x = xacDinhDonViLap(noiDung, mau, danhBa, cay, chuaDien);
    if (x.don_vi_id) {
      donViLap = x.don_vi_id;
      if (!thuocDonVi(nd.don_vi_ids, x.don_vi_id, cay))
        loi.push({
          luat: "dung_mau",
          muc: "chan",
          thong_diep: `Báo cáo này là của ${tenDv(x.don_vi_id)}${x.chu && x.cach !== "theo_mau" ? ` (đọc từ dòng "${x.chu}")` : ` (${mau.ten})`} — bạn không thuộc ${tenDv(x.don_vi_id)}. Nhờ người của đơn vị đó nộp, hoặc quản trị gán kiêm nhiệm cho bạn`,
          vi_tri: { tag: x.cach === "o_don_vi_lap" ? "don_vi_lap" : "mau_ma" },
        });
    } else if (MAU_DUNG_CHUNG.has(mau.ma) || !mau.don_vi_lap) {
      loi.push({
        luat: "dung_mau",
        muc: "chan",
        thong_diep: x.mo_ho?.length
          ? `Đầu báo cáo ghi ${x.mo_ho.length} đơn vị khác nhau (${x.mo_ho.map(tenDv).join(", ")}) — sửa cho đúng một đơn vị nộp báo cáo`
          : `Chưa nhận ra đơn vị nộp báo cáo: dòng dưới tiêu đề "BÁO CÁO …" ${x.chu ? `đang ghi "${x.chu}"` : "đang trống"} — ghi đúng tên đơn vị (vd "NM Hướng Linh 7"). ${mau.ten} dùng chung cho nhiều đơn vị nên máy cần tên này để biết báo cáo của ai`,
        vi_tri: { tag: "don_vi_lap" in noiDung.o_nhap ? "don_vi_lap" : "mau_ma" },
      });
    }
  }

  const dn = mau.dinh_nghia;
  // File làm theo mẫu cũ (trước phiên bản mẫu 4, 29/09/2026) vẫn nhận: Form 6 cũ gắn bảng việc là bang_ke_hoach
  if (!("bang_cong_viec" in noiDung.bang) && "bang_ke_hoach" in noiDung.bang && (dn.bang_cong_viec ?? []).some((b) => b.tag === "bang_cong_viec"))
    noiDung = { ...noiDung, bang: { ...noiDung.bang, bang_cong_viec: noiDung.bang.bang_ke_hoach } };
  const oNhap = (dn.o_nhap ?? []) as ONhap[];
  const oTheoTag = new Map(oNhap.map((o) => [o.tag, o]));
  const nhanO = (tag: string) => oTheoTag.get(tag)?.nhan ?? tag;
  const gt = (tag: string) => giaTri(noiDung.o_nhap[tag], chuaDien);

  // 3. Đúng mẫu: đủ mục, không mất ô nhập, đúng đơn vị lập
  const tieuDe = noiDung.tieu_de.map(chuanHoaTieuDe);
  const vanBan = chuanHoaTieuDe(noiDung.van_ban);
  for (const muc of dn.muc_bat_buoc ?? []) {
    const k = chuanHoaTieuDe(muc);
    // Chương việc: file theo mẫu cũ còn ghi "CÔNG VIỆC" / "KẾ HOẠCH CÔNG VIỆC THÁNG TỚI" — vẫn nhận
    const tenCu = [...(CHUONG_VIEC_MOI.has(k) ? CHUONG_VIEC_CU : []), ...tenCuCuaChuong(dn.cau_truc, muc, chuanHoaTieuDe)];
    const co =
      tieuDe.some((t) => t === k || t.includes(k) || tenCu.includes(t)) || (tieuDe.length === 0 && vanBan.includes(k));
    if (!co) bao("dung_mau", `Thiếu mục "${muc}" của mẫu ${mau.ten}`, { tag: `muc:${muc}` });
  }
  for (const o of oNhap) {
    if (o.tag in noiDung.o_nhap) continue;
    // Ô mới của mẫu bản 5 (29/09): file làm theo mẫu cũ không có — không báo mất (đơn vị lập: máy dò đầu file)
    if (O_MOI_BAN_5.has(o.tag)) continue;
    if (O_MOI_BAN_9[o.tag]?.includes(mau.ma)) continue;
    if (o.bat_buoc) bao("dung_mau", `Mất ô nhập "${o.nhan}" (${o.tag}): không xóa ô gắn mã của mẫu`, { tag: o.tag });
    else bao("dung_mau", `Mất ô nhập "${o.nhan}" (${o.tag})`, { tag: o.tag }, "canh_bao");
  }
  for (const b of dn.bang_cong_viec ?? []) {
    if (!(b.tag in noiDung.bang)) bao("dung_mau", `Mất bảng "${b.nhan}" (${b.tag}) của mẫu`, { bang: b.tag });
  }
  // 4. Ô bắt buộc phải điền (trừ kỳ báo cáo và nơi nhận: kiểm riêng bên dưới)
  for (const o of oNhap) {
    const l = luatCuaO(o);
    if (!o.bat_buoc || l === "ky_bao_cao" || l === "gui_den" || o.tag === "mau_ma") continue;
    if (!(o.tag in noiDung.o_nhap)) continue; // đã báo mất ô
    const v = noiDung.o_nhap[o.tag] ?? "";
    if (laChuaDien(v, chuaDien)) {
      const tho = v.trim();
      bao(l, tho ? `Ô "${o.nhan}" còn để "${tho}", cần điền` : `Ô "${o.nhan}" chưa điền`, { tag: o.tag });
    } else if (o.kieu === "ngay") {
      const d = docNgay(v);
      if (d.loi) bao(l, `Ô "${o.nhan}": ${d.loi}`, { tag: o.tag });
    } else if (o.kieu === "chon" && o.lua_chon?.length && !o.lua_chon.some((x) => x.toLowerCase() === v.trim().toLowerCase())) {
      bao(l, `Ô "${o.nhan}" phải là một trong: ${o.lua_chon.join(", ")}`, { tag: o.tag });
    }
  }

  // 5. Kỳ báo cáo
  let ky: KyBaoCao | undefined;
  const coKyGop = oTheoTag.has("ky_bao_cao") || "ky_bao_cao" in noiDung.o_nhap;
  const coKy = !coKyGop && ["ky_loai", "ky_so", "ky_tu", "ky_den"].some((t) => oTheoTag.has(t) || t in noiDung.o_nhap);
  if (coKyGop) {
    // Mẫu thật: một ô "☒ Tuần 29/2026 (14/07 – 20/07/2026) ☐ Tháng ......./2026"
    if (!("ky_bao_cao" in noiDung.o_nhap)) {
      /* đã báo "mất ô nhập" ở bước đúng mẫu */
    } else {
      const d = docKyBaoCao(noiDung.o_nhap["ky_bao_cao"] ?? "");
      for (const l of d.loi) bao("ky_bao_cao", l, { tag: "ky_bao_cao" });
      for (const g of d.goi_y) loi.push({ luat: "ky_bao_cao", muc: "goi_y", thong_diep: g, vi_tri: { tag: "ky_bao_cao" } });
      if (d.loai) {
        ky = {
          loai: d.loai,
          ...(d.so ? { so: d.so } : {}),
          ...(d.nam ? { nam: d.nam } : {}),
          ...(d.tu ? { tu: d.tu } : {}),
          ...(d.den ? { den: d.den } : {}),
        };
      }
    }
  }
  if (coKy) {
    const loaiV = gt("ky_loai");
    const loai = loaiV ? loaiKy(loaiV) : null;
    if (!loaiV) bao("ky_bao_cao", `Chưa chọn loại kỳ báo cáo (tuần hoặc tháng)`, { tag: "ky_loai" });
    else if (!loai) bao("ky_bao_cao", `Loại kỳ "${loaiV}" không hợp lệ (tuần, tháng, quý)`, { tag: "ky_loai" });
    const soV = gt("ky_so");
    const so = soV ? Number(soV.replace(/[^\d]/g, "")) : NaN;
    if (loai && loai !== "tu_do" && !soV) bao("ky_bao_cao", `Chưa ghi số ${loai === "thang" ? "tháng" : loai === "quy" ? "quý" : "tuần"} của kỳ báo cáo`, { tag: "ky_so" });
    else if (soV && (!Number.isFinite(so) || so <= 0)) bao("ky_bao_cao", `Số kỳ "${soV}" không hợp lệ`, { tag: "ky_so" });
    const namV = gt("ky_nam");
    let nam = namV ? Number(namV.replace(/[^\d]/g, "")) : undefined;
    const tu = docNgay(gt("ky_tu"), nam);
    const den = docNgay(gt("ky_den"), nam);
    if (!gt("ky_tu")) bao("ky_bao_cao", `Kỳ báo cáo chưa có "từ ngày"`, { tag: "ky_tu" });
    else if (tu.loi) bao("ky_bao_cao", `Kỳ báo cáo, từ ngày: ${tu.loi}`, { tag: "ky_tu" });
    if (!gt("ky_den")) bao("ky_bao_cao", `Kỳ báo cáo chưa có "đến ngày"`, { tag: "ky_den" });
    else if (den.loi) bao("ky_bao_cao", `Kỳ báo cáo, đến ngày: ${den.loi}`, { tag: "ky_den" });
    if (tu.iso && den.iso && tu.iso > den.iso) bao("ky_bao_cao", `Kỳ báo cáo: từ ngày ${ngayVN(tu.iso)} sau đến ngày ${ngayVN(den.iso)}`, { tag: "ky_den" });
    if (!nam && den.iso) nam = Number(den.iso.slice(0, 4));
    if (oTheoTag.get("ky_nam")?.bat_buoc && !namV) bao("ky_bao_cao", `Kỳ báo cáo chưa ghi năm`, { tag: "ky_nam" });
    ky = {
      loai: loai ?? mau.loai_ky,
      ...(Number.isFinite(so) && so > 0 ? { so } : {}),
      ...(nam ? { nam } : {}),
      ...(tu.iso ? { tu: tu.iso } : {}),
      ...(den.iso ? { den: den.iso } : {}),
    };
  }
  const namKy = ky?.nam ?? (ky?.den ? Number(ky.den.slice(0, 4)) : new Date().getFullYear());
  // Ngày bắt đầu mặc định của việc (ô Bắt đầu trống): ngày lập ghi trong báo cáo; mẫu không có ô ngày lập thì cuối kỳ
  // Mẫu bản 6 (Mr. Đại chốt 29/09/2026) bỏ ô Ngày lập, người lập, chữ ký: "gửi lên là đã ký" — máy tự ghi NGÀY NỘP.
  // File cũ còn ô Ngày lập thì vẫn đọc ô đó như trước.
  // NGAY_NOP_THU=dau-ky: chỉ bộ test đặt (vitest.config.ts) — file mẫu thử coi như nộp đúng ngày đầu kỳ
  const ngayNop =
    process.env.NGAY_NOP_THU === "dau-ky" && ky?.tu ? ky.tu : bayGioVN(new Date(tuyChon.ngay_nop || Date.now())).slice(0, 10);
  // Ngày báo cáo = ngày nộp cho MỌI file (cả file cũ còn ô Ngày lập). Kỳ ↔ ngày nộp kiểm bằng luật "chung-ky-*" trong kho luật.
  const ngayLap = ngayNop;

  // 6. Gửi đến: dòng "Gửi:" của mẫu → mặc định theo mẫu → luồng báo cáo
  let guiDen: string[] = [];
  const guiV = gt("gui_den");
  if (guiV) {
    for (const t of tachTen(guiV)) {
      const m = timTen(t, danhBa, true);
      if (m) guiDen.push(m.id);
      else bao("gui_den", `Không nhận ra nơi nhận "${t}" ở dòng "Gửi:"${mau.gui_den_mac_dinh ? ", dùng nơi nhận mặc định của mẫu" : ""}`, { tag: "gui_den" }, "canh_bao");
    }
  }
  if (guiDen.length === 0 && mau.gui_den_mac_dinh) guiDen = [mau.gui_den_mac_dinh];
  if (guiDen.length === 0 && donViLap) {
    const luong = await layCauHinh(q, "luong_bao_cao");
    guiDen = luong.filter((l) => l.tu === donViLap).map((l) => l.den);
  }
  guiDen = Array.from(new Set(guiDen));
  if (guiDen.length === 0) bao("gui_den", `Chưa có nơi nhận: ghi dòng "Gửi:" hoặc chọn nơi nhận`, { tag: "gui_den" });

  // 7. Công việc
  const tenDonViLap = donViLap ? (danhBa.don_vi.find((d) => d.id === donViLap)?.ten ?? donViLap) : null;
  const congViec: DongCongViecMo[] = [];
  // Việc CHỈ lấy từ các bảng mẫu khai "sinh việc" (Mr. Đại chốt 29/09/2026): chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN/THÁNG TỚI"
  // (+ Form 5 bảng "Tiến độ chi tiết công tác thiết kế"). Bỏ lấy việc từ bảng Kiến nghị / Sự cố / Cảnh báo / GPMB / An toàn:
  // đo 29/09 — 9/10 việc người nộp bấm Bỏ ở bước Duyệt đến từ các bảng đó (tên việc là mô tả vấn đề, không phải việc).
  // Bảng khai sinh việc nhưng có cấu trúc riêng (Tiến độ thiết kế: hạng mục + ngày kế hoạch + % HT) → đổi sang dòng việc chuẩn.
  // Mẫu khai cau_truc (Khai báo mẫu không cần sửa code, 01/10/2026): đổi dòng bảng sang khoá theo NGHĨA một lần ở đây —
  // phần tách việc bên dưới đọc ten / ket_thuc / tinh_trang… như cũ. Mẫu chưa khai: bangChuan = noiDung.bang, không đổi gì.
  const axBang = new Map<string, AnhXaBang>();
  const bangChuan: Record<string, Record<string, string>[]> = { ...noiDung.bang };
  for (const tag of Object.keys(noiDung.bang)) {
    const ax = anhXaBang(dn, tag);
    if (!ax) continue;
    axBang.set(tag, ax);
    bangChuan[tag] = noiDung.bang[tag].map((r) => chuanHoaDongTheoNghia(r, ax));
  }
  const khaiChuyen = (dn.bang_cong_viec ?? []).filter((b) => BANG_PHU_SINH_VIEC.some((x) => x.tag === b.tag));
  const phu =
    khaiChuyen.length > 0
      ? dongViecTuBangPhu(noiDung.bang, danhBa, ngayLap, namKy, {
          chiBang: khaiChuyen.map((b) => b.tag),
          viecChinh: (dn.bang_cong_viec ?? [])
            .filter((b) => !khaiChuyen.includes(b))
            .flatMap((b) =>
              (bangChuan[b.tag] ?? [])
                .map((r) => ({ ten: giaTri(r.ten, chuaDien).split("\n")[0].trim(), chu: `${giaTri(r.ten, chuaDien)} ${giaTri(r.ket_qua_can_co, chuaDien)}` }))
                .filter((x) => x.ten),
            ),
          donViLap: donViLap && tenDonViLap ? { id: donViLap, ten: tenDonViLap } : null,
        })
      : { bang: [], trung: [] };
  const bangPhu = phu.bang.map((b) => ({ ...b, nhan: khaiChuyen.find((x) => x.tag === b.tag)?.nhan ?? b.nhan }));
  for (const t of phu.trung) {
    loi.push({
      luat: "ten_viec",
      muc: "goi_y",
      thong_diep: `Bảng "${t.nhan}", dòng ${t.dong} ("${t.ten}"): cùng việc "${t.voi}" đã có trong báo cáo — không tạo việc thứ hai`,
      vi_tri: { bang: t.tag, dong: t.dong },
    });
  }
  /** Khoá dòng việc → cột thật của bảng phụ (bảng không có cột Kết thúc / Tình trạng). */
  const COT_THAT_BANG_PHU: Record<string, Record<string, string>> = { bang_tien_do_tk: { ten: "hang_muc", ket_thuc: "ngay_ke_hoach", da_xong: "pt_ht", tinh_trang: "pt_ht" } };
  const HUONG_SUA_HAN_QUA: Record<string, string> = { bang_tien_do_tk: 'ghi ngày mới vào cột "Ngày kế hoạch", hoặc ghi "% HT" 100% nếu hạng mục đã xong' };
  const dsBang: { tag: string; nhan: string; la_quyet_dinh?: boolean; dong?: Record<string, string>[] }[] = [
    ...(dn.bang_cong_viec ?? []).filter((b) => !khaiChuyen.includes(b)),
    ...bangPhu,
  ];
  // Dòng chỉ ghi mã việc (không ghi tên): lấy tên việc trong sổ cái
  const maKhongTen = dsBang.flatMap((b) =>
    (b.dong ?? bangChuan[b.tag] ?? []).filter((r) => !giaTri(r.ten, chuaDien) && giaTri(r.ma_viec, chuaDien)).map((r) => giaTri(r.ma_viec, chuaDien).toUpperCase()),
  );
  const tenTheoMa = new Map(
    maKhongTen.length
      ? (await q.query<{ id: string; ten: string }>("SELECT id, ten FROM docflow.cong_viec WHERE id = ANY($1::text[])", [maKhongTen])).rows.map((r) => [r.id, r.ten])
      : [],
  );
  for (const b of dsBang) {
    const dong = b.dong ?? bangChuan[b.tag] ?? [];
    const ax = axBang.get(b.tag);
    dong.forEach((row, i) => {
      const dongSo = i + 1;
      const v = (cot: string) => giaTri(row[cot], chuaDien);
      const coNoiDung = Object.keys(row).some((k) => v(k) !== "");
      if (!coNoiDung) return; // dòng trống của mẫu
      // Bảng phụ đổi thành dòng việc (Form 5 "Tiến độ thiết kế"): trỏ lỗi về CỘT THẬT của bảng đó (đo 30/09: báo "cột Kết thúc", "Tình trạng" — bảng không có)
      const cotThat = COT_THAT_BANG_PHU[b.tag] ?? {};
      const vt = (cot?: string) => ({ bang: b.tag, dong: dongSo, ...(cot ? { cot: cotThat[cot] ?? ax?.theoNghia.get((cot === "da_xong" ? "tinh_trang" : cot) as never) ?? cot } : {}) });
      // Ô "Công việc": dòng đầu là tên việc, các dòng sau là mô tả — TRỪ KHI mọi dòng đều là ý đánh số / gạch đầu dòng
      // (gõ tay "1. … 2. …" hoặc danh sách của Word): khi đó mỗi ý là MỘT việc, không để việc thứ 2, 3… lọt vào mô tả.
      const dongTen = v("ten").split("\n").map((x) => x.trim()).filter(Boolean);
      const laY = (x: string) => MUC_DS.test(x) && x.replace(MUC_DS, "").trim().length > 0;
      let cacY: { ten: string; moTa: string[] }[];
      if (!b.la_quyet_dinh && dongTen.length >= 2 && dongTen.every(laY)) {
        cacY = dongTen.map((x) => ({ ten: x.replace(MUC_DS, "").trim(), moTa: [] }));
        loi.push({ luat: "ten_viec", muc: "goi_y", thong_diep: `${b.nhan}, dòng ${dongSo}: ô Công việc có ${cacY.length} ý đánh số — tách thành ${cacY.length} việc`, vi_tri: vt("ten") });
      } else {
        const [dau = "", ...sau] = dongTen;
        cacY = [{ ten: dau.replace(MUC_DS, "").trim() || dau, moTa: sau.map((x) => x.replace(/^•\s*/, "")) }];
        const soY = sau.filter(laY).length;
        if (!b.la_quyet_dinh && soY >= 2)
          bao(
            "ten_viec",
            `"${cacY[0].ten}": phần mô tả có ${soY} ý gạch đầu dòng — nếu đó là ${soY} việc riêng, đánh số từng việc (1. 2. 3.) hoặc tách mỗi việc một dòng, không thì chỉ "${cacY[0].ten}" vào sổ cái`,
            vt("ten"),
            undefined,
            "canh_bao",
          );
      }
      if (!cacY[0].ten && v("ma_viec") && tenTheoMa.has(v("ma_viec").toUpperCase())) {
        cacY = [{ ten: tenTheoMa.get(v("ma_viec").toUpperCase())!, moTa: [] }];
        loi.push({ luat: "ten_viec", muc: "goi_y", thong_diep: `${b.nhan}, dòng ${dongSo}: chỉ ghi mã ${v("ma_viec")} — lấy tên việc trong sổ cái "${cacY[0].ten}"`, vi_tri: vt("ten") });
      }
      const ten = cacY[0].ten;
      if (!ten) {
        // Dòng có người làm / ngày / kết quả mà không có tên: CHẶN — không để việc lặng lẽ rơi khỏi sổ cái
        const coThongTin = ["du_an", "hang_muc", "phu_trach", "bat_dau", "ket_thuc", "ket_qua_can_co", "ma_viec", "han_quyet_dinh"].some(
          (k) => v(k) && !/^[☐□☑☒✓✔xX\s.-]*$/.test(v(k)),
        );
        if (coThongTin)
          bao("ten_viec", `${b.nhan}, dòng ${dongSo}: có người làm / ngày / kết quả nhưng chưa có tên công việc — ghi tên việc${v("ma_viec") ? ` (mã ${v("ma_viec")} không có trong sổ cái)` : ""} rồi tải lại`, vt("ten"), undefined, "chan");
        else bao("ten_viec", `${b.nhan}, dòng ${dongSo}: chưa có tên công việc (dòng này không vào sổ cái)`, vt("ten"));
        return;
      }
      // Người phụ trách
      let phuTrach: PhuTrach[] = [];
      let tuGan = false;
      const ptV = v("phu_trach");
      if (ptV) {
        const pg = phanGiaiPhuTrach(ptV, danhBa, ten);
        phuTrach = pg.phu_trach;
        for (const t of pg.khong_nhan_ra) {
          bao("ten_viec", `"${ten}": không nhận ra người/đơn vị phụ trách "${t}"${phuTrach.length === 0 && !b.la_quyet_dinh ? `, tạm gán ${tenDonViLap ?? nd.ten}` : ""}`, vt("phu_trach"), "canh_bao");
        }
      }
      if (phuTrach.length === 0 && !b.la_quyet_dinh) {
        tuGan = "phu_trach" in row;
        phuTrach = donViLap
          ? [{ loai: "don_vi", id: donViLap, ten: tenDonViLap ?? donViLap, noi_dung: ten }]
          : [{ loai: "nguoi", id: nd.id, ten: nd.ten, noi_dung: ten }];
        // Bảng không có cột phụ trách (mẫu từ phiên bản 4): việc của đơn vị lập báo cáo — đúng luật, không cảnh báo
        if (!ptV && "phu_trach" in row) bao("ten_viec", `"${ten}": chưa có người phụ trách, tự gán cho ${phuTrach[0].ten}`, vt("phu_trach"), "canh_bao");
      }
      if (phuTrach.length === 0 && b.la_quyet_dinh) {
        loi.push({ luat: "ten_viec", muc: "goi_y", thong_diep: `"${ten}": chưa có đơn vị thực hiện — TGĐ chọn khi quyết định`, vi_tri: vt("phu_trach") });
      }
      // Ngày
      let batDau: string | undefined;
      let ketThuc: string | undefined;
      let batDauSau: MocViec | undefined;
      let ketThucSau: MocViec | undefined;
      for (const cot of ["bat_dau", "ket_thuc"] as const) {
        const s = v(cot);
        if (!s) continue;
        const d = docNgay(s, namKy);
        // Không phải ngày: có thể là "sau khi xong X" / "2 ngày sau khi X" (ngày theo việc khác)
        const moc = d.loi ? docMocViec(s) : null;
        if (moc) {
          if (cot === "bat_dau") batDauSau = moc;
          else ketThucSau = moc;
        } else if (d.loi) bao("ngay_hop_le", `"${ten}", ${cot === "bat_dau" ? "bắt đầu" : "kết thúc"}: ${d.loi} (hoặc ghi "sau khi xong <mã/tên việc>")`, vt(cot));
        else {
          if (d.thieu_nam) loi.push({ luat: "ngay_hop_le", muc: "goi_y", thong_diep: `"${ten}": ngày "${s}" thiếu năm, hiểu là ${ngayVN(d.iso)}`, vi_tri: vt(cot) });
          if (cot === "bat_dau") batDau = d.iso;
          else ketThuc = d.iso;
        }
      }
      if (batDau && ketThuc && batDau > ketThuc) {
        bao("ngay_hop_le", `"${ten}": bắt đầu ${ngayVN(batDau)} sau kết thúc ${ngayVN(ketThuc)}`, vt("ket_thuc"));
      }
      // Dòng quyết định (Form 0): "Hạn quyết định" là hạn TGĐ quyết, không phải hạn việc — TGĐ đặt hạn khi giao
      let hanQuyetDinh: string | undefined;
      if (b.la_quyet_dinh && v("han_quyet_dinh")) {
        const d = docNgay(v("han_quyet_dinh"), namKy);
        if (d.loi) bao("ngay_hop_le", `"${ten}", hạn quyết định: ${d.loi}`, vt("han_quyet_dinh"));
        else hanQuyetDinh = d.iso;
      }
      // Ô Bắt đầu trống → ngày lập báo cáo
      const batDauKieu: DongCongViec["bat_dau_kieu"] = batDauSau ? "sau_viec" : batDau ? "ngay" : ngayLap ? "ngay_bao_cao" : undefined;
      if (!batDau && !batDauSau && ngayLap && !v("bat_dau")) batDau = ngayLap;
      // Mr. Đại bắt 29/09: 23 việc lọt sổ với hạn TRƯỚC ngày bắt đầu — phép kiểm ở trên chạy trước khi ô trống được điền
      // ngày lập. Kiểm lại sau khi điền: hạn đã qua trước ngày lập báo cáo mà chưa xong → phải sửa rồi mới gửi.
      if (batDauKieu === "ngay_bao_cao" && batDau && ketThuc && batDau > ketThuc && !laDaXong(v("da_xong") || v("tinh_trang"))) {
        bao(
          "ngay_hop_le",
          `"${ten}": hạn ${ngayVN(ketThuc)} đã qua trước ngày nộp báo cáo ${ngayVN(batDau)} — ${HUONG_SUA_HAN_QUA[b.tag] ?? 'ghi hạn mới vào cột Kết thúc, hoặc chọn Tình trạng "Đã xong" nếu việc đã xong'}`,
          vt("ket_thuc"),
        );
      }
      if (!v("ket_thuc") && !b.la_quyet_dinh) {
        if (chDe.viec_khong_ngay_luon_mo)
          bao("ngay_trong", `"${ten}": không có ngày kết thúc — vào sổ cái là việc TREO (luôn mở, cảnh báo cho đến khi có hạn). Ghi ngày cụ thể hoặc "N ngày sau khi xong <việc>"`, vt("ket_thuc"), undefined, "canh_bao");
        else
          bao(
            "ngay_trong",
            // bảng việc thật (không phải bảng phụ đổi sang) — theo loại bảng, không theo tên tag (bảng khai cau_truc có tag tuỳ ý)
            !b.dong
              ? `"${ten}": thiếu ngày kết thúc — mọi việc phải có ngày kết thúc. Ghi ngày cụ thể (dd/mm/yyyy) hoặc "N ngày sau khi xong <mã/tên việc>" vào cột Kết thúc rồi tải lại bản đã sửa`
              : `"${ten}": chưa có hạn — mọi việc phải có ngày kết thúc. Ghi hạn vào câu kiến nghị / biện pháp, vd "trước 15/08/2026" hoặc "trong T8", rồi tải lại bản đã sửa`,
            vt("ket_thuc"),
            undefined,
            "chan",
          );
      }
      const maViec = v("ma_viec");
      // Cột "Tình trạng" (ô chọn Chưa làm · Đang làm · Đã xong, mẫu phiên bản 4) hoặc cột "Đã xong" của mẫu cũ
      const daXongV = v("da_xong") || v("tinh_trang");
      // Cột khác của bảng (ưu tiên, tài liệu đã chuẩn bị, ...) giữ lại để hiển thị
      const DA_DUNG = new Set(["ma_viec", "ten", "du_an", "hang_muc", "phu_trach", "bat_dau", "ket_thuc", "ket_qua_can_co", "da_xong", "tinh_trang", "han_quyet_dinh", "stt"]);
      const cotKhac = Object.fromEntries(Object.keys(row).filter((k) => !DA_DUNG.has(k) && v(k)).map((k) => [k, v(k)]));
      cacY.forEach((y, yi) => congViec.push({
        ...(y.moTa.length ? { mo_ta: y.moTa.join("\n") } : {}),
        ...(hanQuyetDinh ? { han_quyet_dinh: hanQuyetDinh } : {}),
        ...(Object.keys(cotKhac).length ? { cot_khac: cotKhac } : {}),
        ...(maViec ? { ma_viec: maViec } : {}),
        ten: y.ten,
        ...(v("du_an") ? { du_an: v("du_an") } : {}),
        ...(v("hang_muc") ? { hang_muc: v("hang_muc") } : {}),
        phu_trach: yi === 0 ? phuTrach : phuTrach.map((p) => (p.noi_dung === ten ? { ...p, noi_dung: y.ten } : p)),
        ...(tuGan ? { phu_trach_tu_gan: true } : {}),
        ...(batDau ? { bat_dau: batDau } : {}),
        ...(ketThuc ? { ket_thuc: ketThuc } : {}),
        ...(batDauKieu ? { bat_dau_kieu: batDauKieu } : {}),
        ...(batDauSau ? { bat_dau_sau: batDauSau } : {}),
        ...(ketThucSau ? { ket_thuc_sau: ketThucSau } : {}),
        ...(v("ket_qua_can_co") ? { ket_qua_can_co: v("ket_qua_can_co") } : {}),
        ...(daXongV && laDaXong(daXongV) ? { da_xong: true } : {}),
        ...(daXongV ? { tinh_trang: daXongV.slice(0, 120) } : {}),
        nguon_bang: b.tag,
        dong_so: dongSo,
        ...(cacY.length > 1 ? { y_so: yi + 1 } : {}),
      }));
    });
  }

  // Dòng tên nhóm trong bảng việc ("SCI QUẢNG TRỊ", "KHÁC" — chỉ ô đầu có chữ): không phải việc, không chặn (Mr. Đại chốt
  // 10/10/2026). Ghi gợi ý để người nộp thấy máy đã hiểu thế nào — một việc quên điền hết các cột không lặng lẽ rơi khỏi sổ.
  for (const b of dn.bang_cong_viec ?? []) {
    const nhom = noiDung.dong_nhom?.[b.tag] ?? [];
    if (nhom.length)
      loi.push({
        luat: "ten_viec",
        muc: "goi_y",
        thong_diep: `Bảng "${b.nhan}": ${nhom.length} dòng chỉ có chữ ở cột đầu (${nhom.map((x) => `"${x.slice(0, 60)}"`).join(", ")}) — máy hiểu là tên nhóm, không đưa vào sổ cái. Nếu đó là một việc thì điền thêm ngày kết thúc`,
        vi_tri: { bang: b.tag },
      });
  }

  // 7a. K11 (Mr. Đại chốt 02/10): chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN/THÁNG TỚI" trống → CHẶN. Trước: vẫn gửi được, đơn vị tính
  // "đã nộp" mà sổ cái không nhận việc nào, việc kỳ trước không được báo tình hình. Bảng quyết định (Form 0) / bảng phụ không tính.
  const bangChinh = (dn.bang_cong_viec ?? []).filter((b) => !b.la_quyet_dinh && !khaiChuyen.includes(b));
  if (bangChinh.length && !congViec.some((c) => bangChinh.some((b) => b.tag === c.nguon_bang)) && bangChinh.some((b) => b.tag in noiDung.bang)) {
    const b0 = bangChinh.find((b) => b.tag in noiDung.bang)!;
    // Mặc định CHẶN; chỉ khi cấu hình luật có khai mã "bang_viec_trong" mới theo mức / bật-tắt đã khai
    const khaiK11 = (bangLuat ?? []).some((l) => l.he_thong && l.ma === "bang_viec_trong") || chLuat.luat.some((l) => l.ma === "bang_viec_trong");
    bao(
      "bang_viec_trong",
      `Bảng "${b0.nhan}" chưa có việc nào — báo cáo phải ghi việc đã làm trong kỳ (kèm tình hình) và kế hoạch kỳ tới. Ghi ít nhất một việc có tên rồi tải lại`,
      { bang: b0.tag },
      undefined,
      khaiK11 ? undefined : "chan",
    );
  }

  // 7b. Ngày theo việc khác: tìm việc mốc (mã / dòng khác cùng báo cáo / việc trong sổ cái)
  try {
    for (const m of await giaiMocBaoCao(q, congViec)) {
      const c = congViec[m.chi_so];
      const vt = { bang: c.nguon_bang, dong: c.dong_so, cot: m.loai };
      if (m.muc === "canh_bao") bao("ngay_hop_le", m.thong_diep, vt, "canh_bao");
      else loi.push({ luat: "ngay_hop_le", muc: "goi_y", thong_diep: m.thong_diep, vi_tri: vt });
    }
  } catch (e) {
    loi.push({ luat: "ngay_hop_le", muc: "goi_y", thong_diep: `Chưa tìm được việc mốc: ${e instanceof Error ? e.message : String(e)}` });
  }

  const kq: KetQuaKiemTraDayDu = ketQua({
    mau_ma: mau.ma,
    ...(ky ? { ky_bao_cao: ky } : {}),
    o_nhap: noiDung.o_nhap,
    gui_den: guiDen,
    cong_viec: congViec,
    mau,
    noi_dung: noiDung,
  });
  kq.ngay_nop = ngayNop;

  // 8. Việc trùng: hỏi sổ cái (không ghi) — báo trước việc sẽ bị đè / không được dùng
  if (!tuyChon.bo_qua_so_cai && !tuyChon.nguoi_gui_that && luat("viec_trung")) { // văn bản đến từ bên ngoài không sinh việc
    const capNguon = tuyChon.nguoi_gui_that ? chNgoai.cap_ben_ngoai : nd.cap;
    const { dau_vao, chi_so } = dungDauVao({
      kq,
      mau,
      tai_lieu_id: tuyChon.tai_lieu_id ?? null,
      phien_ban: tuyChon.phien_ban ?? null,
      ten_don_vi: tenDonViLap ?? tuyChon.nguoi_gui_that ?? nd.ten,
      don_vi_id: donViLap,
      cap: capNguon,
      nguoi_gui: nd.id,
    });
    if (dau_vao.cong_viec.length > 0) {
      try {
        const dd = await xemTruocVaoSoCai(q, dau_vao);
        kq.du_doan = dd.map((d) => ({ ...d, chi_so: chi_so[d.dong] ?? -1 }));
        for (const d of kq.du_doan) {
          const c = kq.cong_viec[d.chi_so];
          if (!c) continue;
          const vt = { bang: c.nguon_bang, dong: c.dong_so };
          if (d.hanh_dong === "de") bao("viec_trung", `"${c.ten}" trùng việc đang mở ${d.cong_viec_id ?? ""}: bản này sẽ đè${d.ly_do ? ` (${d.ly_do})` : ""}, bản cũ vào lịch sử`, vt);
          // Dòng báo đã xong mà sổ chưa có việc đó (chốt 02/10): không vào sổ — chỉ là thông tin, không phải "trùng"
          else if (d.hanh_dong === "khong_dung" && !d.cong_viec_id) bao("viec_trung", `"${c.ten}": ${d.ly_do ?? "không vào sổ cái"}`, vt, "goi_y");
          else if (d.hanh_dong === "khong_dung") bao("viec_trung", `"${c.ten}" trùng ${d.cong_viec_id}: bản này không được dùng${d.ly_do ? ` (${d.ly_do})` : ""}`, vt);
          else if (d.hanh_dong === "goi_y_trung") {
            const g = d.goi_y?.[0];
            bao("viec_trung", `"${c.ten}" có vẻ trùng ${g ? `${g.cong_viec_id} "${g.ten}"` : "việc đang mở"}: xác nhận hoặc bỏ qua`, vt);
          } else if (d.hanh_dong === "dong_viec") bao("viec_trung", `"${c.ten}" báo đã xong: sẽ đóng ${d.cong_viec_id ?? "việc"} trong sổ cái`, vt, "goi_y");
          // Lần nạp đầu của đơn vị lập + mẫu (18/10/2026): dòng đã xong vào sổ ở trạng thái đã xong — chỉ là thông tin
          else if (d.hanh_dong === "vao_so_xong") bao("viec_trung", `"${c.ten}": ${d.ly_do ?? "vào sổ ở trạng thái đã xong (lần nạp đầu)"}`, vt, "goi_y");
        }
      } catch (e) {
        kq.so_cai_chua_san_sang = e instanceof Error ? e.message : String(e);
      }
    }
  }

  // 8b. Chuỗi theo dõi việc (Mr. Đại chốt 02/10: nộp tay mà thiếu việc của kỳ trước → CHẶN) — lib/kiem-tra/chuoi-ky-truoc.ts
  // TAT_CHUOI_KY_TRUOC=1: chỉ bộ test đặt (vitest.config.ts) — các kịch bản thử dựng chuỗi báo cáo không theo luật này;
  // luật có test riêng tests/unit/chuoi-ky-truoc.test.ts
  if (!tuyChon.nguoi_gui_that && donViLap && ky?.tu && bangChinh.length && process.env.TAT_CHUOI_KY_TRUOC !== "1") {
    try {
      const maSoCai = new Map<number, string>();
      for (const d of kq.du_doan ?? []) if (d.cong_viec_id && d.chi_so >= 0) maSoCai.set(d.chi_so, d.cong_viec_id);
      for (const d of kq.du_doan ?? []) for (const g of d.goi_y ?? []) if (d.chi_so >= 0 && !maSoCai.has(d.chi_so)) maSoCai.set(d.chi_so, g.cong_viec_id);
      const ch = await viecKyTruocBiThieu(q, (ma) => layMau(q, ma), {
        don_vi_id: donViLap,
        ky: { loai: ky.loai, tu: ky.tu },
        viec: congViec.map((c, i) => ({ ten: c.ten, ma: [c.ma_viec?.trim().toUpperCase(), maSoCai.get(i)].filter((x): x is string => !!x) })),
        tai_lieu_id: tuyChon.tai_lieu_id ?? null,
      });
      if (ch?.thieu.length) {
        const b0 = bangChinh.find((b) => b.tag in noiDung.bang) ?? bangChinh[0];
        const ds = ch.thieu.slice(0, 8).map((t) => `"${t.ma ? `${t.ma} ` : ""}${t.ten.slice(0, 80)}"`).join(", ");
        bao(
          "ten_viec",
          `Thiếu ${ch.thieu.length} việc của báo cáo ${ch.ky_truoc}: ${ds}${ch.thieu.length > 8 ? ` và ${ch.thieu.length - 8} việc khác` : ""}. Báo cáo kỳ này phải ghi lại đủ các việc kỳ trước kèm tình hình (Đã xong / Đang làm / Dừng: lý do) — thêm vào bảng "${b0.nhan}" rồi tải lại`,
          { bang: b0.tag },
          undefined,
          "chan",
        );
      }
    } catch (e) {
      loi.push({ luat: "ten_viec", muc: "goi_y", thong_diep: `Chưa đối chiếu được với báo cáo kỳ trước: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  // 9. Góp ý nội dung — không bao giờ chặn. Ở đây chỉ dò nhanh mục trống / "......" (không gọi AI để tải lên
  // không phải chờ); AI góp ý chạy SAU, bất đồng bộ: gop-y-luu.ts + /api/kiem-tra/gop-y.
  const chAi = await layCauHinh(q, "ai");
  if (chAi.bat_gop_y && luat("noi_dung_ai")) {
    for (const g of await gopYNoiDung(noiDung, mau, chuaDien)) bao("noi_dung_ai", g.thong_diep, g.vi_tri, "canh_bao");
  }

  // 10. Luật người dùng (bảng luật): luật code chạy ngay — mức 'chan' làm dat=false. Luật AI KHÔNG chạy ở đây
  // (chạy nền, agent luat-ai); lúc gửi mới đọc kết quả (luat/chay-luat.ts kiemLuatAiKhiGui).
  if (bangLuat) {
    const apDung = bangLuat.filter((l) => l.bat && !l.da_xoa && apDungMau(l, mau.ma));
    const luatCode = apDung.filter((l) => !l.he_thong && (l.cach_kiem === "code" || l.cach_kiem === "ca_hai"));
    if (luatCode.length > 0) {
      const danhBaTen = (ten: string) => !!timTen(ten, danhBa);
      // Một vấn đề một nơi (Mr. Đại chốt 29/09): ô mà máy kiểm đã báo chặn / cảnh báo thì luật đơn vị không báo lại
      // (đo file P.CĐ: 2/3 dòng luật "Hạn việc không trước ngày lập" trùng đúng lỗi ngày máy đã báo).
      const oDaBao = new Set(
        loi.filter((l) => (l.muc === "chan" || l.muc === "canh_bao") && l.vi_tri?.bang && l.vi_tri.dong && l.vi_tri.cot).map((l) => `${l.vi_tri!.bang}|${l.vi_tri!.dong}|${l.vi_tri!.cot}`),
      );
      const khongTrung = (l: LoiKiemTra) => !(l.vi_tri?.bang && l.vi_tri.dong && l.vi_tri.cot && oDaBao.has(`${l.vi_tri.bang}|${l.vi_tri.dong}|${l.vi_tri.cot}`));
      loi.push(
        ...chayLuatCode(
          luatCode,
          { o_nhap: noiDung.o_nhap, bang: noiDung.bang, tieu_de: noiDung.tieu_de, ...(noiDung.muc ? { muc: noiDung.muc } : {}) },
          {
            mau_ma: mau.ma,
            dinh_nghia_mau: rutGonDinhNghia(mau.ma, mau.ten, mau.dinh_nghia),
            ky_bao_cao: { ...(ky ? { tu: ky.tu, den: ky.den } : {}), nop: ngayNop },
            gia_tri_chua_dien: chuaDien,
            phan_giai_ten: danhBaTen,
          },
        ).filter(khongTrung),
      );
    }
    kq.luat_da_dung = apDung.map((l) => ({ id: l.id, ma: l.ma, phien_ban: l.phien_ban, cach_kiem: l.cach_kiem, muc: l.muc }));
  }

  kq.dat = !loi.some((l) => l.muc === "chan");
  return kq;
}

/**
 * MÓC NỐI góp ý nội dung. Luôn dò bằng quy tắc: mục nội dung còn trống hoặc còn "......".
 * Truyền `ai` thì CHỜ thêm AI góp ý (kỹ năng /kiem-tra-mau, gop-y-ai.ts): mức goi_y, AI lỗi/sai JSON/quá giờ → bỏ qua.
 * kiemTraDayDu KHÔNG truyền `ai` (tải lên không chờ AI) — góp ý AI chạy nền qua gop-y-luu.ts.
 */
export async function gopYNoiDung(
  noiDung: NoiDungWord,
  mau: MauWord,
  chuaDien: string[],
  ai?: TuyChonGopYAi,
): Promise<{ thong_diep: string; vi_tri?: LoiKiemTra["vi_tri"]; muc?: "goi_y"; loai?: GopYAi["loai"] }[]> {
  const kq: { thong_diep: string; vi_tri?: LoiKiemTra["vi_tri"]; muc?: "goi_y"; loai?: GopYAi["loai"] }[] = [];
  if (ai) {
    try {
      for (const g of await gopYBangAi(noiDung, mau, ai)) kq.push({ thong_diep: g.thong_diep, ...(g.vi_tri ? { vi_tri: g.vi_tri } : {}), muc: "goi_y", loai: g.loai });
    } catch {
      /* AI lỗi: bỏ qua, không làm hỏng kiểm tra */
    }
  }
  for (const o of mau.dinh_nghia.o_nhap as ONhap[]) {
    if (luatCuaO(o) !== "noi_dung_ai" || !(o.tag in noiDung.o_nhap)) continue;
    const v = noiDung.o_nhap[o.tag] ?? "";
    if (laChuaDien(v, chuaDien)) kq.push({ thong_diep: `${o.nhan}: mục còn trống`, vi_tri: { tag: o.tag } });
    else if (chuaDien.some((x) => x.length >= 3 && v.includes(x))) kq.push({ thong_diep: `${o.nhan}: còn chỗ "......" chưa điền`, vi_tri: { tag: o.tag } });
  }
  // Mẫu thật: nội dung mục viết tự do (bảng số liệu, đoạn văn) — mục trống hoặc còn "......"
  const dauCham = chuaDien.filter((x) => x.trim().length >= 5);
  for (const m of noiDung.muc ?? []) {
    const ten = m.tieu_de.replace(/^\s*(?:[IVX]+|[A-Z]\d{0,2})\.\s*/, "");
    const vt = { tag: `muc:${ten}` };
    if (!m.van_ban.trim()) {
      // mục chỉ có bảng gắn mã (vd Công việc) thì không coi là trống
      continue;
    }
    if (dauCham.some((x) => m.van_ban.includes(x))) kq.push({ thong_diep: `Mục "${m.tieu_de}": còn chỗ "......" chưa điền số liệu`, vi_tri: vt });
  }
  return kq;
}

/** Kiểm tra một file Word theo mẫu. Có gọi so-cai.xemTruocVaoSoCai để báo việc trùng / sẽ bị đè. */
export async function kiemTraTaiLieu(
  q: Q,
  nd: NguoiDungPhien,
  buf: Buffer,
  tenTep: string,
  tuyChon?: TuyChonKiemTra,
): Promise<KetQuaKiemTra> {
  return rutGon(await kiemTraDayDu(q, nd, buf, tenTep, tuyChon));
}

/** Phần lưu vào phien_ban_tep.ket_qua_kiem_tra (bỏ nội dung file và dự đoán đã cũ). */
export function rutGon(kq: KetQuaKiemTraDayDu): KetQuaKiemTra & { tu_do?: boolean; luat_da_dung?: LuatDaDung[]; ngay_nop?: string } {
  return {
    dat: kq.dat,
    mau_ma: kq.mau_ma,
    ...(kq.ky_bao_cao ? { ky_bao_cao: kq.ky_bao_cao } : {}),
    o_nhap: kq.o_nhap,
    gui_den: kq.gui_den,
    cong_viec: kq.cong_viec,
    loi: kq.loi,
    ...(kq.tu_do ? { tu_do: true } : {}),
    ...(kq.luat_da_dung ? { luat_da_dung: kq.luat_da_dung } : {}),
    ...(kq.ngay_nop ? { ngay_nop: kq.ngay_nop } : {}),
  };
}

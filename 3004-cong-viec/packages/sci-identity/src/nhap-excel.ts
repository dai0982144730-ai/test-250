// ============================================================
// nhap-excel.ts — NHẬP NGƯỜI DÙNG TỪ EXCEL (CHỈ SERVER). Thư viện `xlsx`.
// Cột: Họ tên · Email · Mã đơn vị hoặc tên đơn vị · Chức vụ · Vai trò (nhiều vai trò cách nhau dấu phẩy).
// Hai bước: kiemTraNhap (xem trước, báo lỗi từng dòng) → nhapNguoiDungExcel (ghi các dòng hợp lệ).
// ============================================================
import * as XLSX from "xlsx";
import type { Q } from "@/lib/db";
import type { DonVi } from "@/lib/types";
import { layCayDonVi } from "./don-vi";
import { danhSachVaiTro } from "./vai-tro";
import { danhSachNguoiDung, suaNguoiDung, themNguoiDung } from "./nguoi-dung";
import { ghi, LoiIdentity, type NguCanh, type NguoiChuaGan } from "./moi-truong";
import { boDau, chuanHoaEmail, laEmail } from "./chu";

export const COT_EXCEL = ["Họ tên", "Email", "Mã đơn vị hoặc tên đơn vị", "Chức vụ", "Vai trò"] as const;

type TenCot = "ho_ten" | "email" | "don_vi" | "chuc_vu" | "vai_tro";

/** Tên cột chấp nhận (đã bỏ dấu, chữ thường). */
const BI_DANH: Record<TenCot, string[]> = {
  ho_ten: ["ho ten", "ho va ten", "ten", "ten nguoi dung", "full name", "name"],
  email: ["email", "e-mail", "thu dien tu", "mail"],
  don_vi: ["ma don vi hoac ten don vi", "don vi", "ma don vi", "ten don vi", "phong ban", "phong"],
  chuc_vu: ["chuc vu", "chuc danh"],
  vai_tro: ["vai tro", "quyen", "nhom quyen"],
};

export interface DongNhap {
  dong: number; // số dòng trong file Excel (1-based, kể cả dòng tiêu đề)
  ho_ten: string;
  email: string;
  don_vi_nhap: string;
  don_vi_id: string | null;
  chuc_vu: string;
  vai_tro: string[];
  loi: string[];
  canh_bao: string[];
  hanh_dong: "tao_moi" | "cap_nhat" | "bo_qua";
  /** Mã tài khoản đã có (có thể khác email — tài khoản đổi sang email thật giữ mã cũ) */
  ma_co?: string;
}

export interface KetQuaNhap {
  tong: number;
  tao_moi: number;
  cap_nhat: number;
  bo_qua: number;
  dong: DongNhap[];
  mat_khau: { email: string; mat_khau: string }[]; // mật khẩu tự sinh cho tài khoản mới — chỉ trả một lần
}

export interface TuyChonNhap {
  cap_nhat_nguoi_da_co?: boolean; // mặc định true: email đã có thì cập nhật tên, đơn vị, chức vụ, vai trò
  vai_tro_mac_dinh?: string[]; // dòng không ghi vai trò
  mat_khau_ban_dau?: string; // trống = mật khẩu lần đầu của mỗi người là chính email của họ (chốt 02/10)
  do_dai_mat_khau?: number;
}

function oChu(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Đọc sheet đầu tiên: tìm dòng tiêu đề (dòng có cột Email), ánh xạ cột. */
export function docFileExcel(duLieu: ArrayBuffer | Uint8Array): { cot: Partial<Record<TenCot, number>>; dong_tieu_de: number; dong: string[][] } {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(duLieu instanceof Uint8Array ? duLieu : new Uint8Array(duLieu), { type: "array" });
  } catch {
    throw new LoiIdentity(400, "Không đọc được file. Hãy dùng file Excel .xlsx (tải file mẫu để xem cách điền)");
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new LoiIdentity(400, "File Excel không có trang tính nào");
  const bang = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false }).map((d) => d.map(oChu));
  for (let i = 0; i < Math.min(bang.length, 20); i++) {
    const cot: Partial<Record<TenCot, number>> = {};
    bang[i].forEach((o, j) => {
      const t = boDau(o).replace(/[*:()]/g, "").trim();
      for (const [k, ds] of Object.entries(BI_DANH) as [TenCot, string[]][]) {
        if (cot[k] === undefined && ds.includes(t)) cot[k] = j;
      }
    });
    if (cot.email !== undefined) {
      if (cot.ho_ten === undefined) throw new LoiIdentity(400, "File thiếu cột \"Họ tên\"");
      return { cot, dong_tieu_de: i, dong: bang.slice(i + 1) };
    }
  }
  throw new LoiIdentity(400, `Không tìm thấy dòng tiêu đề có cột "Email". Các cột cần có: ${COT_EXCEL.join(", ")}`);
}

function timDonVi(ds: DonVi[], giaTri: string): DonVi | undefined {
  const g = boDau(giaTri);
  return (
    ds.find((d) => d.id === giaTri.toLowerCase()) ??
    ds.find((d) => boDau(d.ten) === g) ??
    ds.find((d) => boDau(d.ten_ngan) === g)
  );
}

/** Xem trước: đọc file, đối chiếu đơn vị/vai trò/email, báo lỗi từng dòng. Không ghi gì. */
export async function kiemTraNhap(q: Q, duLieu: ArrayBuffer | Uint8Array, tuyChon: TuyChonNhap = {}): Promise<DongNhap[]> {
  const f = docFileExcel(duLieu);
  const donVi = await layCayDonVi(q, true);
  const vaiTro = await danhSachVaiTro(q);
  // email / mã → mã tài khoản đã có (mã cũ có thể khác email)
  const daCo = new Map<string, string>();
  for (const n of await danhSachNguoiDung(q, { ca_bi_khoa: true })) {
    daCo.set(n.id, n.id);
    daCo.set(chuanHoaEmail(n.email), n.id);
  }
  const capNhat = tuyChon.cap_nhat_nguoi_da_co !== false;
  const trongFile = new Map<string, number>();
  const kq: DongNhap[] = [];
  f.dong.forEach((d, i) => {
    const lay = (k: TenCot) => (f.cot[k] !== undefined ? oChu(d[f.cot[k]!]) : "");
    const hoTen = lay("ho_ten");
    const emailGoc = lay("email");
    const dvNhap = lay("don_vi");
    const vtNhap = lay("vai_tro");
    if (!hoTen && !emailGoc && !dvNhap && !vtNhap && !lay("chuc_vu")) return; // dòng trống
    const soDong = f.dong_tieu_de + 2 + i;
    const email = chuanHoaEmail(emailGoc);
    const loi: string[] = [];
    const canhBao: string[] = [];
    if (!hoTen) loi.push("Thiếu họ tên");
    if (!email) loi.push("Thiếu email");
    else if (!laEmail(email)) loi.push(`Email không hợp lệ: ${emailGoc}`);
    else if (trongFile.has(email)) loi.push(`Email trùng với dòng ${trongFile.get(email)}`);
    if (email) trongFile.set(email, soDong);
    let donViId: string | null = null;
    if (dvNhap) {
      const dv = timDonVi(donVi, dvNhap);
      if (!dv) loi.push(`Không có đơn vị "${dvNhap}" (ghi mã, tên hoặc tên ngắn của đơn vị)`);
      else if (!dv.active) loi.push(`Đơn vị "${dv.ten}" đã ngừng hoạt động`);
      else donViId = dv.id;
    } else canhBao.push("Chưa gán đơn vị — quản trị viên sẽ được nhắc");
    const vt: string[] = [];
    for (const t of vtNhap.split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean)) {
      const v = vaiTro.find((x) => x.id === t.toLowerCase() || boDau(x.ten) === boDau(t));
      if (!v) loi.push(`Không có vai trò "${t}"`);
      else if (!vt.includes(v.id)) vt.push(v.id);
    }
    const coRoi = daCo.has(email);
    if (!vtNhap && !coRoi && tuyChon.vai_tro_mac_dinh?.length) {
      vt.push(...tuyChon.vai_tro_mac_dinh.filter((x) => vaiTro.some((v) => v.id === x)));
      canhBao.push(`Không ghi vai trò — dùng mặc định: ${vt.join(", ") || "(không có)"}`);
    }
    if (coRoi && !capNhat) canhBao.push("Email đã có tài khoản — bỏ qua");
    kq.push({
      dong: soDong,
      ho_ten: hoTen,
      email,
      don_vi_nhap: dvNhap,
      don_vi_id: donViId,
      chuc_vu: lay("chuc_vu"),
      vai_tro: vt,
      loi,
      canh_bao: canhBao,
      hanh_dong: loi.length || (coRoi && !capNhat) ? "bo_qua" : coRoi ? "cap_nhat" : "tao_moi",
      ...(coRoi ? { ma_co: daCo.get(email) } : {}),
    });
  });
  if (kq.length === 0) throw new LoiIdentity(400, "File không có dòng người dùng nào dưới dòng tiêu đề");
  return kq;
}

/** Nhập: ghi các dòng hợp lệ (dòng lỗi bỏ qua, vẫn trả về để báo). Chạy trong giao dịch của người gọi. */
export async function nhapNguoiDungExcel(q: Q, ng: NguCanh, duLieu: ArrayBuffer | Uint8Array, tuyChon: TuyChonNhap = {}): Promise<KetQuaNhap> {
  const ds = await kiemTraNhap(q, duLieu, tuyChon);
  const kq: KetQuaNhap = { tong: ds.length, tao_moi: 0, cap_nhat: 0, bo_qua: 0, dong: ds, mat_khau: [] };
  const chuaGan: NguoiChuaGan[] = [];
  for (const d of ds) {
    if (d.hanh_dong === "bo_qua") {
      kq.bo_qua++;
      continue;
    }
    if (d.hanh_dong === "tao_moi") {
      const r = await themNguoiDung(
        q,
        ng,
        { email: d.email, ten: d.ho_ten, don_vi_id: d.don_vi_id, chuc_vu: d.chuc_vu || null, vai_tro: d.vai_tro, mat_khau: tuyChon.mat_khau_ban_dau || undefined },
        { khong_bao_chua_gan: true, do_dai_mat_khau: tuyChon.do_dai_mat_khau },
      );
      if (r.mat_khau_tu_sinh) kq.mat_khau.push({ email: d.email, mat_khau: r.mat_khau });
      if (!d.don_vi_id) chuaGan.push({ id: d.email, email: d.email, ten: d.ho_ten });
      kq.tao_moi++;
    } else {
      const moi = await suaNguoiDung(q, { ...ng, baoChuaGanDonVi: undefined }, d.ma_co ?? d.email, {
        ten: d.ho_ten,
        ...(d.don_vi_nhap ? { don_vi_id: d.don_vi_id } : {}),
        ...(d.chuc_vu ? { chuc_vu: d.chuc_vu } : {}),
        ...(d.vai_tro.length ? { vai_tro: d.vai_tro } : {}),
      });
      if (!moi.don_vi_id && moi.active) chuaGan.push({ id: moi.id, email: moi.email, ten: moi.ten });
      kq.cap_nhat++;
    }
  }
  await ghi(q, ng, {
    loai: "nguoi_dung",
    id: "nhap-excel",
    thao_tac: "nhap_excel",
    chi_tiet: { tong: kq.tong, tao_moi: kq.tao_moi, cap_nhat: kq.cap_nhat, bo_qua: kq.bo_qua },
  });
  if (chuaGan.length && ng.baoChuaGanDonVi) await ng.baoChuaGanDonVi(q, chuaGan);
  return kq;
}

/** File Excel mẫu: trang "Người dùng" (tiêu đề + 2 dòng ví dụ) và trang "Danh mục" (mã đơn vị, vai trò). */
export function taoFileExcelMau(donVi: Pick<DonVi, "id" | "ten" | "ten_ngan" | "cap">[], vaiTro: { id: string; ten: string }[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  const dv1 = donVi[1] ?? donVi[0];
  const ws = XLSX.utils.aoa_to_sheet([
    [...COT_EXCEL],
    ["Nguyễn Văn A", "nguyenvana@scigroup.vn", dv1?.id ?? "", "Nhân viên", vaiTro.find((v) => v.id === "nhan-vien")?.id ?? vaiTro[0]?.id ?? ""],
    ["Trần Thị B", "tranthib@scigroup.vn", dv1?.ten ?? "", "Trưởng phòng", vaiTro.find((v) => v.id === "truong-don-vi")?.ten ?? ""],
  ]);
  ws["!cols"] = [{ wch: 26 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws, "Người dùng");
  const dm = XLSX.utils.aoa_to_sheet([
    ["Mã đơn vị", "Tên đơn vị", "Tên ngắn", "Cấp", "", "Mã vai trò", "Tên vai trò"],
    ...Array.from({ length: Math.max(donVi.length, vaiTro.length) }, (_, i) => [
      donVi[i]?.id ?? "",
      donVi[i]?.ten ?? "",
      donVi[i]?.ten_ngan ?? "",
      donVi[i]?.cap ?? "",
      "",
      vaiTro[i]?.id ?? "",
      vaiTro[i]?.ten ?? "",
    ]),
  ]);
  dm["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 6 }, { wch: 3 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, dm, "Danh mục");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

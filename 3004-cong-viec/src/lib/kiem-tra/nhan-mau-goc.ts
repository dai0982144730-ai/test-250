// ============================================================
// kiem-tra/nhan-mau-goc.ts — NHẬN FILE WORD GỐC (bản anh Đại, chưa có ô nhập gắn mã) và tự gắn ô nhập.
// Người dùng hay tải lên đúng file Word công ty đang dùng (OK_FormN_…docx) thay vì mẫu tải từ hệ thống.
// Nhận ra là Form mấy (theo tên file "FormN", không có thì so phần đầu văn bản với 9 file gốc trong mau-word/goc/)
// rồi chạy đúng bộ chuyển của scripts/chuyen-mau-that.mjs — chỉ bọc ô, không đổi nội dung người dùng đã viết.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { chuyenMau, MAU_THAT } from "../../../scripts/chuyen-mau-that.mjs";
import { doGiongChuoi } from "@/lib/so-cai/tien-ich";
import { docWord, type NoiDungWord } from "./doc-word";
import { laGoiExcel } from "@/lib/mau-excel/doc-excel";

type MauThat = (typeof MAU_THAT)[number];

/** Cùng thư mục mẫu với hat-giong.ts (không import để tránh vòng phụ thuộc). */
const thuMucMauWord = () => process.env.DOCFLOW_MAU_WORD_DIR || path.join(process.cwd(), "mau-word");

const DAU = 400; // số ký tự đầu văn bản dùng để so

let dauGoc: Promise<{ m: MauThat; dau: string }[]> | null = null;
function napDauGoc() {
  if (!dauGoc)
    dauGoc = Promise.all(
      MAU_THAT.map(async (m) => {
        const p = path.join(thuMucMauWord(), "goc", m.tep);
        if (!fs.existsSync(p)) return { m, dau: "" };
        return { m, dau: (await docWord(fs.readFileSync(p))).van_ban.slice(0, DAU) };
      }),
    ).catch((e) => ((dauGoc = null), Promise.reject(e)));
  return dauGoc;
}

/** Đoán Form của file Word gốc: tên file "Form5"/"form-5", không có thì theo phần đầu văn bản. */
async function doanMau(tenTep: string, noiDung: NoiDungWord): Promise<MauThat | null> {
  const so = /form\s*[-_ ]?(\d+)/i.exec(tenTep);
  if (so) {
    const m = MAU_THAT.find((x) => x.so === Number(so[1]));
    if (m) return m;
  }
  // Mã biểu mẫu công ty trong tên file, vd "SCI-160_V01_…Phòng Cơ điện.docx"
  const theoMa = MAU_THAT.find((x) => "ma_so_file" in x && x.ma_so_file && tenTep.toUpperCase().includes(String(x.ma_so_file).toUpperCase()));
  if (theoMa) return theoMa;
  const dau = noiDung.van_ban.slice(0, DAU);
  let tot: MauThat | null = null;
  let diem = 0.6;
  for (const g of await napDauGoc()) {
    const d = g.dau ? doGiongChuoi(dau, g.dau) : 0;
    if (d >= diem) [tot, diem] = [g.m, d];
  }
  return tot;
}

/**
 * File không có ô nhập nào: thử nhận là file Word gốc của một Form và gắn ô nhập.
 * Trả nội dung đọc từ bản đã gắn + tên mẫu; không nhận ra / chuyển lỗi → null (giữ báo "không nhận ra mẫu").
 */
export async function thuNhanMauGoc(buf: Buffer, tenTep: string, noiDung: NoiDungWord): Promise<{ noi_dung: NoiDungWord; ten_mau: string; buf: Buffer } | null> {
  if (noiDung.mau_ma || Object.keys(noiDung.o_nhap).length > 0) return null;
  if (laGoiExcel(buf)) return null; // bản gốc chỉ có ở dạng Word
  try {
    const m = await doanMau(tenTep, noiDung);
    if (!m) return null;
    const kq = await chuyenMau(buf, m);
    const moi = await docWord(kq.buf);
    return moi.mau_ma ? { noi_dung: moi, ten_mau: m.ten, buf: kq.buf } : null;
  } catch {
    return null; // cấu trúc khác bản gốc quá nhiều: không tự gắn được
  }
}

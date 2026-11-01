// ============================================================
// dinh-kem.ts — BÓC CHỮ FILE ĐÍNH KÈM TRONG CHAT (B1, lấy từ agent tiến độ)
//
// Người dùng kẹp file vào ô chat → server bóc chữ → chữ đi kèm câu hỏi cho AI.
// docx qua mammoth · xlsx/xls/csv qua SheetJS · pptx bóc <a:t> bằng adm-zip.
// SCI công việc thêm: file Word theo mẫu → đọc ô nhập gắn mã (docWord) và kiểm tra
// theo mẫu (kiemTraTaiLieu) để /kiem-tra-mau, /trich-cong-viec có đủ căn cứ.
// Server-only (Buffer + thư viện node). Phần dùng chung với client ở `dinh-kem-chung.ts`.
// ============================================================

import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import type { Q } from "@/lib/db";
import type { KetQuaKiemTra, NguoiDungPhien } from "@/lib/types";
import { docWord, type NoiDungWord } from "@/lib/kiem-tra/doc-word";
import { docBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { kiemTraTaiLieu } from "@/lib/kiem-tra/kiem-tra";
import { TRAN_CHU_TEP, duoiCuaTen, type TepDinhKem } from "./dinh-kem-chung";
import { oSoRaChuVN } from "@/lib/chung/o-so-excel";

const HANG_TOI_DA = 300;
const COT_TOI_DA = 30;

/** Bảng xlsx → chữ: mỗi sheet một khối, ô ngăn bằng " | " */
export function bangSangChu(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: "buffer" });
  return wb.SheetNames.map((ten) => {
    const ws = wb.Sheets[ten]!;
    // chốt 130: ô SỐ đưa cho trợ lý theo chuẩn số Việt Nam («1.234,5»), cùng một kiểu với báo cáo Word — thư viện tự viết kiểu Anh («1,234.5»)
    oSoRaChuVN(ws);
    const tho = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" });
    const biCat = tho.length > HANG_TOI_DA || tho.some((r) => r.length > COT_TOI_DA);
    const hang = tho
      .slice(0, HANG_TOI_DA)
      .map((r) => r.slice(0, COT_TOI_DA).map((c) => String(c ?? "")))
      .filter((r) => r.some((c) => c.trim() !== ""))
      .map((r) => r.join(" | "))
      .join("\n");
    return `— Sheet: ${ten}${biCat ? " (đã cắt còn 300 dòng × 30 cột)" : ""} —\n${hang || "(sheet trống)"}`;
  }).join("\n\n");
}

/** Bóc chữ pptx: mỗi slide một khối (ppt/slides/slideN.xml → mọi <a:t>) */
export function bocChuPptx(buf: Buffer): string {
  const zip = new AdmZip(buf);
  const slides = zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => Number(/slide(\d+)/.exec(a.entryName)?.[1] ?? 0) - Number(/slide(\d+)/.exec(b.entryName)?.[1] ?? 0));
  return slides
    .map((e, i) => {
      const xml = e.getData().toString("utf8");
      const chu = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g))
        .map((m) => m[1])
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return `— Slide ${i + 1} —\n${chu || "(slide không có chữ)"}`;
    })
    .join("\n\n");
}

export async function chuDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const kq = await mammoth.extractRawText({ buffer: buf });
  return kq.value;
}

/**
 * Bóc chữ một file. KHÔNG throw — hỏng thì trả chữ rỗng kèm ghi chú tiếng Việt
 * để người dùng biết vì sao trợ lý không đọc được.
 */
export async function bocChuTep(ten: string, buf: Buffer): Promise<{ chu: string; ghiChu?: string }> {
  const duoi = duoiCuaTen(ten);
  try {
    if (duoi === ".xlsx" || duoi === ".xls" || duoi === ".csv") return { chu: bangSangChu(buf) };
    if (duoi === ".docx") return { chu: await chuDocx(buf) };
    if (duoi === ".pptx") {
      return { chu: bocChuPptx(buf), ghiChu: "Chỉ bóc được CHỮ trên slide — hình và biểu đồ không đọc được." };
    }
    if (duoi === ".txt" || duoi === ".md" || duoi === ".json") return { chu: buf.toString("utf8") };
    if (duoi === ".pdf") {
      return { chu: "", ghiChu: "Máy chủ SCI công việc chưa có bộ đọc PDF — anh/chị lưu lại thành .docx rồi kẹp giúp em." };
    }
    return { chu: "", ghiChu: `Chưa đọc được đuôi ${duoi || "(không rõ)"} — dùng file docx/xlsx/csv/txt/md/json/pptx.` };
  } catch (err) {
    return {
      chu: "",
      ghiChu: `Không đọc được file: ${err instanceof Error ? err.message.slice(0, 140) : "lỗi không rõ"}.`,
    };
  }
}

/** Ô nhập gắn mã + bảng của Word theo mẫu → khối chữ ngắn cho AI (bỏ qua nếu module đọc Word chưa xong) */
export function khoiONhap(nd: NoiDungWord): string {
  const dong: string[] = [];
  dong.push(`Mẫu nhận ra: ${nd.mau_ma ?? "(không nhận ra mẫu)"}`);
  const o = Object.entries(nd.o_nhap);
  if (o.length > 0) dong.push("Ô nhập gắn mã:", ...o.map(([k, v]) => `- ${k}: ${v === "" ? "(trống)" : v}`));
  for (const [tag, hang] of Object.entries(nd.bang)) {
    dong.push(`Bảng ${tag} (${hang.length} dòng):`);
    hang.slice(0, 60).forEach((h, i) => {
      dong.push(`  ${i + 1}. ` + Object.entries(h).map(([k, v]) => `${k}=${v === "" ? "(trống)" : v}`).join(" · "));
    });
  }
  return dong.join("\n");
}

/** Kết quả kiểm tra theo mẫu → khối chữ ngắn cho AI */
export function khoiKiemTra(kq: KetQuaKiemTra): string {
  const dong = [`Kết quả kiểm tra của hệ thống: ${kq.dat ? "ĐẠT (được gửi)" : "KHÔNG ĐẠT (nút Gửi bị khóa)"} · mẫu ${kq.mau_ma ?? "?"}`];
  for (const l of kq.loi) {
    const muc = l.muc === "chan" ? "CHẶN" : l.muc === "canh_bao" ? "cảnh báo" : "gợi ý";
    const vt = l.vi_tri ? ` [${[l.vi_tri.tag, l.vi_tri.bang, l.vi_tri.dong ? `dòng ${l.vi_tri.dong}` : "", l.vi_tri.cot].filter(Boolean).join(" · ")}]` : "";
    dong.push(`- ${muc} · ${l.luat}: ${l.thong_diep}${vt}`);
  }
  if (kq.cong_viec.length > 0) {
    dong.push(`Công việc đọc được (${kq.cong_viec.length}):`);
    kq.cong_viec.slice(0, 40).forEach((c) => {
      dong.push(
        `  ${c.dong_so}. ${c.ten}${c.ma_viec ? ` [${c.ma_viec}]` : ""} · phụ trách: ${c.phu_trach.map((p) => p.ten).join(", ") || "(trống)"}${c.phu_trach_tu_gan ? " (tự gán đơn vị lập)" : ""} · ${c.bat_dau ?? "—"} → ${c.ket_thuc ?? "—"}${!c.bat_dau && !c.ket_thuc ? " (luôn mở)" : ""}`,
      );
    });
  }
  return dong.join("\n");
}

/**
 * Bóc + cắt + (Word theo mẫu) đọc ô nhập và kiểm tra — một file thành một `TepDinhKem`.
 * Phần đọc ô nhập / kiểm tra do module kiem-tra viết: chưa xong hoặc lỗi thì bỏ qua, không chặn.
 */
export async function chuanBiTep(ten: string, buf: Buffer, q?: Q, nd?: NguoiDungPhien): Promise<TepDinhKem> {
  const { chu, ghiChu } = await bocChuTep(ten, buf);
  let gon = chu.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  let kiemTra: TepDinhKem["kiemTra"];
  // Excel kẹp vào chat chỉ đọc ô nhập + kiểm khi đúng là báo cáo theo mẫu (bảng tính thường thì chỉ lấy chữ)
  let ndExcel: NoiDungWord | null = null;
  if (duoiCuaTen(ten) === ".xlsx") ndExcel = await docBaoCao(buf).catch(() => null);
  if (duoiCuaTen(ten) === ".docx" || ndExcel?.mau_ma) {
    const phu: string[] = [];
    try {
      phu.push(khoiONhap(ndExcel ?? (await docWord(buf))));
    } catch {
      /* module đọc Word chưa xong — chỉ còn chữ thuần */
    }
    if (q && nd) {
      try {
        const kq = await kiemTraTaiLieu(q, nd, buf, ten);
        phu.push(khoiKiemTra(kq));
        kiemTra = {
          dat: kq.dat,
          mau: kq.mau_ma,
          soChan: kq.loi.filter((l) => l.muc === "chan").length,
          soCanhBao: kq.loi.filter((l) => l.muc === "canh_bao").length,
          soViec: kq.cong_viec.length,
        };
      } catch {
        /* module kiểm tra chưa xong — AI tự soát theo kỹ năng /kiem-tra-mau */
      }
    }
    // Phần cấu trúc đặt TRƯỚC chữ thuần để không bị cắt mất khi file dài
    if (phu.length > 0) gon = `${phu.join("\n\n")}\n\n--- CHỮ TRONG FILE ---\n${gon}`;
  }
  const biCat = gon.length > TRAN_CHU_TEP;
  return {
    ten,
    co: buf.length,
    chu: biCat ? gon.slice(0, TRAN_CHU_TEP) : gon,
    biCat,
    ghiChu,
    ...(kiemTra ? { kiemTra } : {}),
  };
}

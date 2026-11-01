// ============================================================
// XUẤT FILE THEO YÊU CẦU — AI SINH RUỘT FILE (lấy nguyên từ agent tiến độ)
//
// Người chọn nút định dạng (hoặc AI tự phát hiện từ câu hỏi) → 1 lượt LLM
// sinh nội dung theo marker → build file thật (xuat-bao-cao.ts) → lưu
// data/xuat-chat/ → câu trả lời kèm link tải. Dựng hỏng thì đưa lỗi cho AI
// sửa tối đa 2 lần ("làm thử — nhìn kết quả — sửa").
//
// SCI công việc bỏ so với bản gốc: sổ nhật ký gọi agent (goiCoGhi — riêng agent tiến độ).
// PDF: máy chủ chưa cài playwright → trả bản HTML in được (nói rõ trong câu trả lời).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { runAIGan } from "@/lib/ai/providers";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import type { ChatMessage } from "@/lib/ai/chat-types";
import {
  buildDocx,
  buildDxf,
  buildHtml,
  buildKml,
  buildPdf,
  buildPptx,
  buildVanBan,
  buildXlsx,
  heThongPromptKeHoach,
  heThongPromptXuat,
  tachKeHoach,
  tachTieuDe,
  tenFileBaoCao,
  trichKhoiXuat,
  type DinhDangChu,
  type DinhDangXuat,
  type KetQuaBaoCao,
} from "./xuat-bao-cao";

export { DANH_SACH_DINH_DANG, canDuyetKeHoach, phatHienYDinhXuat, type DinhDangXuat } from "./xuat-bao-cao";

/** File xuất nằm trong thư mục RIÊNG của người yêu cầu — người khác có mã cũng không tải được */
const THU_MUC = (chu: string) => thuMucDuLieu("xuat-chat", chu.toLowerCase().replace(/[^a-z0-9._-]+/g, "_").replace(/^\.+/, "") || "_khach");

/**
 * ⭐ Tệp AI tự tạo trong lúc chat GIỮ 7 NGÀY kể từ lúc tạo rồi xoá — có tải hay chưa cũng xoá; KHÔNG xoá ngay khi tải
 * (Mr. Đại chốt 12/10/2026 sau lần rà dữ liệu phình: «7 ngày không tải hoặc có tải đều cũng xoá. Không xoá ngay khi tải»).
 * Trước đó không có lệnh xoá nào: tệp tạo từ 03/09 vẫn nằm lại.
 */
export const SO_NGAY_GIU_TEP_XUAT = 7;

/**
 * Xoá tệp đã quá hạn giữ ở thư mục xuất của MỌI người. Gọi mỗi lần tạo tệp mới, mỗi lần tra tệp để tải, và mỗi ngày một lần ở
 * bộ hẹn giờ (so-cai/hen-gio.ts — thêm 17/10/2026: chỉ hai chỗ trên thì không ai dùng chat là tệp nằm mãi, đo 27 tệp quá hạn).
 * Trả số tệp đã xoá. Tuổi tính theo giờ ghi tệp (tệp chỉ ghi một lần lúc tạo).
 */
export function donTepXuatQuaHan(bayGio: number = Date.now()): number {
  const goc = thuMucDuLieu("xuat-chat");
  const quaHan = (p: string): boolean => {
    try {
      const st = fs.statSync(p);
      return st.isFile() && bayGio - st.mtimeMs > SO_NGAY_GIU_TEP_XUAT * 86_400_000;
    } catch {
      return false;
    }
  };
  let soXoa = 0;
  let ds: string[] = [];
  try {
    ds = fs.readdirSync(goc);
  } catch {
    return 0; // chưa ai xuất tệp nào
  }
  for (const ten of ds) {
    const p = path.join(goc, ten);
    let con: string[] = [];
    try {
      con = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((f) => path.join(p, f)) : [p];
    } catch {
      continue;
    }
    for (const f of con) {
      if (!quaHan(f)) continue;
      try {
        fs.rmSync(f, { force: true });
        soXoa++;
      } catch {
        // tệp vừa bị lượt khác xoá — bỏ qua
      }
    }
  }
  return soXoa;
}

/** PPTX: chưa có bộ tìm ảnh → đổi mọi thành phần ảnh chưa có dữ liệu thành "bo-qua" */
function boAnhPptx(khoiJson: string): { khoi: string; soAnhBo: number } {
  try {
    const data = JSON.parse(khoiJson) as { slides?: { thanhPhan?: { loai?: string; duLieu?: string }[] }[] };
    let soAnhBo = 0;
    for (const s of data.slides ?? []) {
      for (const tp of s.thanhPhan ?? []) {
        if (tp.loai === "anh" && !tp.duLieu) {
          tp.loai = "bo-qua";
          soAnhBo++;
        }
      }
    }
    return { khoi: JSON.stringify(data), soAnhBo };
  } catch {
    return { khoi: khoiJson, soAnhBo: 0 };
  }
}

/** Chèn nút/tự mở hộp In vào HTML — bản thay PDF khi máy chủ chưa có bộ in */
function htmlInDuoc(html: string): string {
  const them =
    '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>' +
    '<style>@media print{.khong-in{display:none}}</style>' +
    '<div class="khong-in" style="position:fixed;top:8px;right:8px;background:#fffbe6;border:1px solid #d4a017;padding:6px 10px;font:13px sans-serif;border-radius:6px">Bấm Ctrl+P → chọn "Lưu dưới dạng PDF"</div>';
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${them}</body>`) : html + them;
}

async function dungFile(traLoi: string, dd: DinhDangXuat): Promise<{ kq: KetQuaBaoCao; ghiChu: string[] }> {
  const ghiChu: string[] = [];
  const { tieuDe, conLai: sauTieuDe } = tachTieuDe(traLoi);
  const khoi = trichKhoiXuat(tachKeHoach(sauTieuDe).conLai, dd);
  if (!khoi) {
    return {
      kq: {
        loi: `Không tìm thấy khối ${dd.toUpperCase()} hợp lệ. Bạn phải bọc nội dung trong đúng cặp dấu @@@XUAT_BAOCAO:${dd}@@@ ... @@@HET_XUAT_BAOCAO@@@`,
      },
      ghiChu,
    };
  }
  const ten = tenFileBaoCao(tieuDe, dd);
  switch (dd) {
    case "html":
      return { kq: await buildHtml(khoi, ten), ghiChu };
    case "pdf": {
      const pdf = await buildPdf(khoi, ten);
      if ("loi" in pdf && /playwright/i.test(pdf.loi)) {
        const h = await buildHtml(khoi, ten);
        if ("loi" in h) return { kq: h, ghiChu };
        ghiChu.push("Máy chủ chưa có bộ in PDF — gửi bản HTML tự mở hộp In: chọn «Lưu dưới dạng PDF» là ra file PDF.");
        return { kq: { ...h, buffer: Buffer.from(htmlInDuoc(h.buffer.toString("utf-8")), "utf-8") }, ghiChu };
      }
      return { kq: pdf, ghiChu };
    }
    case "docx":
      return { kq: await buildDocx(khoi, ten), ghiChu };
    case "xlsx":
      return { kq: await buildXlsx(khoi, ten), ghiChu };
    case "pptx": {
      const { khoi: k2, soAnhBo } = boAnhPptx(khoi);
      if (soAnhBo > 0) ghiChu.push(`${soAnhBo} chỗ ảnh minh hoạ bị bỏ (bộ tìm ảnh chưa cấu hình) — slide vẫn đủ chữ.`);
      return { kq: await buildPptx(k2, ten), ghiChu };
    }
    case "kml":
      return { kq: await buildKml(khoi, ten), ghiChu };
    case "dxf":
      return { kq: await buildDxf(khoi, ten), ghiChu };
    default:
      return { kq: await buildVanBan(khoi, ten, dd as DinhDangChu), ghiChu };
  }
}

function goiLichSu(history: ChatMessage[], cauHoi: string): string {
  const gan = history.slice(-10);
  const phan = gan
    .map((m) => `${m.role === "user" ? "NGƯỜI DÙNG" : "TRỢ LÝ"}: ${m.content}`)
    .join("\n\n")
    .slice(-12000);
  return (
    // Bỏ trống chỗ này thì Claude CLI đi tìm file trên đĩa rồi viết kế hoạch kiểu "bị từ chối quyền". Chặn thẳng.
    `NGUỒN DỮ LIỆU: CHỈ dùng dữ liệu trong phần hội thoại dưới đây và trong chính yêu cầu. ` +
    `TUYỆT ĐỐI KHÔNG đi tìm file trên đĩa, không gọi công cụ nào, không nhắc tới ` +
    `việc thiếu quyền truy cập. Thiếu số liệu cho mục nào thì ghi "Chưa có thông tin" ở mục đó.\n\n` +
    (phan ? `HỘI THOẠI GẦN ĐÂY (ngữ cảnh — nội dung file thường nằm ở đây):\n${phan}\n\n` : "") +
    `YÊU CẦU HIỆN TẠI CỦA NGƯỜI DÙNG:\n${cauHoi}`
  );
}

export interface KetQuaXuatTheoYeuCau {
  reply: string;
  ok: boolean;
}

/** BƯỚC LẬP KẾ HOẠCH: yêu cầu phức tạp → lượt đầu AI chỉ trình bày SẼ LÀM GÌ để người duyệt. */
export async function lapKeHoachXuat(
  dd: DinhDangXuat,
  cauHoi: string,
  history: ChatMessage[],
  model?: string,
): Promise<{ ok: boolean; keHoach: string }> {
  try {
    // Tắt nghĩ dài: lượt trả nội dung theo khuôn (test đêm 02/10: bật nghĩ dài 138 giây, 14.656 chữ ra cho một file Excel)
    const traLoi = await runAIGan("lib/tro-ly/xuat-theo-yeu-cau", goiLichSu(history, cauHoi), heThongPromptKeHoach(dd), undefined, model, undefined, true);
    const { keHoach } = tachKeHoach(traLoi);
    const noiDung = (keHoach ?? traLoi).trim();
    if (noiDung === "") return { ok: false, keHoach: "" };
    return { ok: true, keHoach: noiDung };
  } catch (e) {
    return { ok: false, keHoach: e instanceof Error ? e.message : "?" };
  }
}

/** Chạy trọn luồng xuất theo yêu cầu. Trả `reply` (markdown, kèm link tải khi thành công). */
export async function xuatTheoYeuCau(
  dd: DinhDangXuat,
  cauHoi: string,
  history: ChatMessage[],
  /** Kế hoạch NGƯỜI ĐÃ DUYỆT (có thể đã sửa tay) — có thì AI bám đúng theo */
  keHoachDaDuyet: string | undefined,
  model: string | undefined,
  /** id người yêu cầu — file lưu vào thư mục riêng của người này */
  chuSoHuu: string,
): Promise<KetQuaXuatTheoYeuCau> {
  const heThong = heThongPromptXuat(
    dd,
    "",
    keHoachDaDuyet?.trim()
      ? keHoachDaDuyet.trim()
      : "Xuất thẳng theo yêu cầu của người dùng — tự chọn bố cục hợp lý, số liệu chỉ lấy từ hội thoại/dữ liệu được cung cấp, thiếu thì ghi «Chưa có thông tin».",
  );
  const noiDungGui = goiLichSu(history, cauHoi);
  // Tắt nghĩ dài — như lập kế hoạch ở trên
  const goiAi = (them?: string) => runAIGan("lib/tro-ly/xuat-theo-yeu-cau", them ? `${noiDungGui}\n\n${them}` : noiDungGui, heThong, undefined, model, undefined, true);

  let traLoi: string;
  try {
    traLoi = await goiAi();
  } catch (e) {
    return { ok: false, reply: `Gọi AI sinh file thất bại: ${e instanceof Error ? e.message : "?"}` };
  }

  let { kq, ghiChu } = await dungFile(traLoi, dd).catch((e) => ({
    kq: { loi: e instanceof Error ? e.message : "lỗi không rõ" } as KetQuaBaoCao,
    ghiChu: [] as string[],
  }));

  for (let lan = 1; lan <= 2 && "loi" in kq; lan++) {
    try {
      traLoi = await goiAi(
        `Nội dung bạn vừa trả về KHÔNG dựng được thành file. Lỗi cụ thể:\n\n${kq.loi}\n\nHãy trả lời LẠI TỪ ĐẦU cho đúng yêu cầu định dạng, sửa đúng lỗi nêu trên. Chỉ trả về đúng 1 khối theo cấu trúc đã quy định, không giải thích gì thêm.`,
      );
      const lai = await dungFile(traLoi, dd);
      kq = lai.kq;
      ghiChu = [...ghiChu, ...lai.ghiChu];
    } catch (e) {
      kq = { loi: e instanceof Error ? e.message : "lỗi không rõ" };
    }
  }

  if ("loi" in kq) {
    return {
      ok: false,
      reply: `Em không dựng được file ${dd.toUpperCase()} sau 3 lần thử — lỗi cuối: ${kq.loi}. Anh/chị nói rõ hơn nội dung cần xuất, hoặc chọn định dạng khác giúp em.`,
    };
  }

  const ma = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  donTepXuatQuaHan();
  fs.mkdirSync(THU_MUC(chuSoHuu), { recursive: true });
  fs.writeFileSync(path.join(THU_MUC(chuSoHuu), `${ma}__${kq.tenFile}`), kq.buffer);

  const kb = Math.max(1, Math.round(kq.buffer.length / 1024));
  return {
    ok: true,
    reply:
      `Đã tạo file **${kq.tenFile}** (${kb} KB).\n\n` +
      `[⬇ Tải file về](/api/tro-ly/xuat/tai?ma=${ma})` +
      `\n\nTệp này giữ ${SO_NGAY_GIU_TEP_XUAT} ngày rồi tự xoá, có tải hay chưa cũng vậy.` +
      (ghiChu.length > 0 ? `\n\n${ghiChu.map((g) => `⚠ ${g}`).join("\n")}` : ""),
  };
}

/** Lưu một file do code dựng (vd /lam-bao-cao) vào thư mục xuất của người hỏi → mã tải (/api/tro-ly/xuat/tai?ma=) */
export function luuFileXuatChat(chuSoHuu: string, tenFile: string, buf: Buffer): string {
  const ma = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  donTepXuatQuaHan();
  fs.mkdirSync(THU_MUC(chuSoHuu), { recursive: true });
  fs.writeFileSync(path.join(THU_MUC(chuSoHuu), `${ma}__${tenFile}`), buf);
  return ma;
}

/** Tìm file đã xuất theo mã trong thư mục của CHÍNH người hỏi — cho route tải về */
export function timFileDaXuat(ma: string, chuSoHuu: string): { duongDan: string; tenFile: string } | null {
  if (!/^[a-z0-9]{6,20}$/.test(ma)) return null;
  donTepXuatQuaHan(); // tệp quá 7 ngày coi như không còn
  try {
    const f = fs.readdirSync(THU_MUC(chuSoHuu)).find((x) => x.startsWith(`${ma}__`));
    if (!f) return null;
    return { duongDan: path.join(THU_MUC(chuSoHuu), f), tenFile: f.slice(ma.length + 2) };
  } catch {
    return null;
  }
}

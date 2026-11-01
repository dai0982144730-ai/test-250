// ============================================================
// XUẤT FILE THEO YÊU CẦU — AI SINH RUỘT FILE (S8 tầng 2, lệnh Mr. Đại 05/09)
//
// PORT từ bộ chạy thật của Web Pháp lý (`SCIPhaply-github/phaply/lib/
// xuat-bao-cao.ts` — đã copy nguyên sang ./xuat-bao-cao.ts, giữ tối đa).
// File này là phần NỐI vào luồng chat của agent tiến độ:
//   người chọn nút định dạng (hoặc AI tự phát hiện từ câu hỏi) → 1 lượt LLM
//   sinh nội dung theo marker → build file thật → lưu data/xuat-chat/ →
//   câu trả lời kèm link tải. Dựng hỏng thì đưa lỗi cho AI sửa tối đa 2 lần
//   (mẹo "làm thử — nhìn kết quả — sửa" của bản pháp lý).
//
// KHÁC bản pháp lý (ghi thẳng, không giấu):
// - Chưa port bước DUYỆT KẾ HOẠCH (pháp lý cho người duyệt kế hoạch trước với
//   định dạng phức tạp) — v1 xuất thẳng; cần thì port sau.
// - PPTX chưa có bộ tìm ảnh (Brave Search chưa cấu hình) — thành phần ảnh bị
//   bỏ qua, có ghi chú trong câu trả lời.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { runAI } from "@/lib/ai/providers";
import { goiCoGhi } from "@/lib/nhat-ky/so";
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
  canDuyetKeHoach,
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
import { ganTenLlm } from "@/lib/chung/tu-dien-ma-du-an";

export {
  DANH_SACH_DINH_DANG,
  canDuyetKeHoach,
  phatHienYDinhXuat,
  type DinhDangXuat,
} from "./xuat-bao-cao";

const THU_MUC = () => path.join(gocDuLieu(), "xuat-chat");

/**
 * ⭐ Tệp AI tự tạo trong lúc chat GIỮ 7 NGÀY kể từ lúc tạo rồi xoá — có tải hay chưa cũng xoá; KHÔNG xoá ngay khi tải
 * (Mr. Đại chốt 12/10/2026 sau lần rà dữ liệu phình: «7 ngày không tải hoặc có tải đều cũng xoá. Không xoá ngay khi tải»).
 * Trước đó không có lệnh xoá nào: tệp tạo từ 03/09 vẫn nằm lại.
 */
export const SO_NGAY_GIU_TEP_XUAT = 7;

/**
 * Xoá tệp đã quá hạn giữ. Gọi mỗi lần tạo tệp mới và mỗi lần tra tệp để tải — không cần vòng hẹn giờ. Trả số tệp đã xoá.
 * Tuổi tính theo giờ ghi tệp (tệp chỉ ghi một lần lúc tạo).
 */
export function donTepXuatQuaHan(bayGio: number = Date.now()): number {
  let soXoa = 0;
  let ds: string[] = [];
  try {
    ds = fs.readdirSync(THU_MUC());
  } catch {
    return 0; // thư mục chưa có — chưa từng xuất tệp nào
  }
  for (const f of ds) {
    const p = path.join(THU_MUC(), f);
    try {
      const st = fs.statSync(p);
      if (st.isFile() && bayGio - st.mtimeMs > SO_NGAY_GIU_TEP_XUAT * 86_400_000) {
        fs.rmSync(p, { force: true });
        soXoa++;
      }
    } catch {
      // tệp vừa bị lượt khác xoá — bỏ qua
    }
  }
  return soXoa;
}

/** PPTX: chưa có bộ tìm ảnh → đổi mọi thành phần ảnh chưa có dữ liệu thành
 *  "bo-qua" để file vẫn dựng được (bản pháp lý tải ảnh qua Brave Search). */
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

async function dungFile(
  traLoi: string,
  dd: DinhDangXuat
): Promise<{ kq: KetQuaBaoCao; ghiChu: string[] }> {
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
    case "pdf":
      return { kq: await buildPdf(khoi, ten), ghiChu };
    case "docx":
      return { kq: await buildDocx(khoi, ten), ghiChu };
    case "xlsx":
      return { kq: await buildXlsx(khoi, ten), ghiChu };
    case "pptx": {
      const { khoi: k2, soAnhBo } = boAnhPptx(khoi);
      if (soAnhBo > 0) {
        ghiChu.push(`${soAnhBo} chỗ ảnh minh hoạ bị bỏ (bộ tìm ảnh chưa cấu hình) — slide vẫn đủ chữ.`);
      }
      return { kq: await buildPptx(k2, ten), ghiChu };
    }
    case "kml":
      return { kq: await buildKml(khoi, ten), ghiChu };
    case "dxf":
      return { kq: await buildDxf(khoi, ten), ghiChu };
    default:
      // md / svg / mmd / dot — định dạng chữ, AI viết thẳng nội dung
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
    // ĐO 05/09: bỏ trống chỗ này thì Claude CLI đi tìm file trên đĩa/Drive rồi
    // viết kế hoạch kiểu "bị từ chối quyền" — vô nghĩa với người dùng. Chặn thẳng.
    `NGUỒN DỮ LIỆU: CHỈ dùng dữ liệu trong phần hội thoại dưới đây và trong chính yêu cầu. ` +
    `TUYỆT ĐỐI KHÔNG đi tìm file trên đĩa/Google Drive, không gọi công cụ nào, không nhắc tới ` +
    `việc thiếu quyền truy cập. Thiếu số liệu cho mục nào thì ghi "Chưa có thông tin" ở mục đó.\n\n` +
    (phan ? `HỘI THOẠI GẦN ĐÂY (ngữ cảnh — nội dung file thường nằm ở đây):\n${phan}\n\n` : "") +
    `YÊU CẦU HIỆN TẠI CỦA NGƯỜI DÙNG:\n${cauHoi}`
  );
}

export interface KetQuaXuatTheoYeuCau {
  reply: string;
  ok: boolean;
}

/**
 * BƯỚC LẬP KẾ HOẠCH (port bản pháp lý — kiểu Deep Research): với yêu cầu phức
 * tạp (`canDuyetKeHoach`), lượt đầu AI chỉ trình bày SẼ LÀM GÌ để người duyệt
 * hoặc sửa, chưa sinh file. Tốn vài dòng token nhưng tránh cả một lượt dựng
 * file sai ý (XLSX công thức, PPTX bố cục, DXF kích thước…).
 */
export async function lapKeHoachXuat(
  dd: DinhDangXuat,
  cauHoi: string,
  history: ChatMessage[],
  projectId: string,
  email: string
): Promise<{ ok: boolean; keHoach: string }> {
  const noiDungGui = goiLichSu(history, cauHoi);
  try {
    const traLoi = await goiCoGhi(
      {
        agentTraLoi: "llm",
        congCu: "troly.lap_ke_hoach_xuat",
        thamSo: { dinh_dang: dd },
        lyDoGoi: `Lập kế hoạch trước khi sinh file ${dd.toUpperCase()} (yêu cầu phức tạp — người duyệt rồi mới chạy)`,
        duong: "tay",
        duAn: projectId,
        nguoi: email,
      },
      () => runAI(noiDungGui, heThongPromptKeHoach(dd))
    );
    const { keHoach } = tachKeHoach(traLoi);
    const noiDung = (keHoach ?? traLoi).trim();
    if (noiDung === "") return { ok: false, keHoach: "" };
    // Lưới an toàn "mã kèm tên" (26/09): kế hoạch là chữ người đọc — mã trơn thì chèn tên
    return { ok: true, keHoach: await ganTenLlm(noiDung, projectId) };
  } catch (e) {
    return { ok: false, keHoach: e instanceof Error ? e.message : "?" };
  }
}

/**
 * Chạy trọn luồng xuất theo yêu cầu. Trả về `reply` (markdown, kèm link tải
 * khi thành công) để route chat lưu vào phiên như một câu trả lời thường.
 */
export async function xuatTheoYeuCau(
  dd: DinhDangXuat,
  cauHoi: string,
  history: ChatMessage[],
  projectId: string,
  email: string,
  /** Kế hoạch NGƯỜI ĐÃ DUYỆT (có thể đã sửa tay) — có thì AI bám đúng theo */
  keHoachDaDuyet?: string
): Promise<KetQuaXuatTheoYeuCau> {
  const heThong = heThongPromptXuat(
    dd,
    "",
    keHoachDaDuyet?.trim()
      ? keHoachDaDuyet.trim()
      : "Xuất thẳng theo yêu cầu của người dùng — tự chọn bố cục hợp lý, số liệu chỉ lấy từ hội thoại/dữ liệu được cung cấp, thiếu thì ghi «Chưa có thông tin»."
  );
  const noiDungGui = goiLichSu(history, cauHoi);

  const goiAi0 = (them?: string) =>
    goiCoGhi(
      {
        agentTraLoi: "llm",
        congCu: "troly.xuat_file_ai",
        thamSo: { dinh_dang: dd, do_dai_cau_hoi: cauHoi.length },
        lyDoGoi: `Người dùng yêu cầu xuất file ${dd.toUpperCase()} từ chat (S8 tầng 2)`,
        duong: "tay",
        duAn: projectId,
        nguoi: email,
      },
      () => runAI(them ? `${noiDungGui}\n\n${them}` : noiDungGui, heThong)
    );
  // Lưới an toàn "mã kèm tên" (26/09) — tên chèn đã bỏ ký tự phá khuôn JSON/HTML (choFile)
  const goiAi = async (them?: string) =>
    ganTenLlm(String(await goiAi0(them)), projectId, undefined, "Xuất file theo yêu cầu — luật mã kèm tên (26/09)", {
      choFile: true,
    });

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

  // "Làm thử — nhìn kết quả — sửa": dựng hỏng thì đưa lỗi cho AI sửa, tối đa 2 lần
  for (let lan = 1; lan <= 2 && "loi" in kq; lan++) {
    try {
      traLoi = await goiAi(
        `Nội dung bạn vừa trả về KHÔNG dựng được thành file. Lỗi cụ thể:\n\n${kq.loi}\n\nHãy trả lời LẠI TỪ ĐẦU cho đúng yêu cầu định dạng, sửa đúng lỗi nêu trên. Chỉ trả về đúng 1 khối theo cấu trúc đã quy định, không giải thích gì thêm.`
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
      reply: `Mình không dựng được file ${dd.toUpperCase()} sau 3 lần thử — lỗi cuối: ${kq.loi}. Bạn thử nói rõ hơn nội dung cần xuất, hoặc chọn định dạng khác.`,
    };
  }

  // Lưu file để tải: data/xuat-chat/<ma>__<tên>.<ext>
  const ma = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  donTepXuatQuaHan();
  fs.mkdirSync(THU_MUC(), { recursive: true });
  fs.writeFileSync(path.join(THU_MUC(), `${ma}__${kq.tenFile}`), kq.buffer);

  const kb = Math.max(1, Math.round(kq.buffer.length / 1024));
  return {
    ok: true,
    reply:
      `Đã tạo file **${kq.tenFile}** (${kb.toLocaleString("vi-VN")} KB).\n\n` +
      `[⬇ Tải file về](/api/tro-ly/xuat/tai?ma=${ma})` +
      `\n\nTệp này giữ ${SO_NGAY_GIU_TEP_XUAT} ngày rồi tự xoá, có tải hay chưa cũng vậy.` +
      (ghiChu.length > 0 ? `\n\n${ghiChu.map((g) => `⚠ ${g}`).join("\n")}` : ""),
  };
}

/** Tìm file đã xuất theo mã — cho route tải về */
export function timFileDaXuat(ma: string): { duongDan: string; tenFile: string } | null {
  if (!/^[a-z0-9]{6,20}$/.test(ma)) return null;
  donTepXuatQuaHan(); // tệp quá 7 ngày coi như không còn — tải được hay không đều theo đúng một luật
  try {
    const f = fs.readdirSync(THU_MUC()).find((x) => x.startsWith(`${ma}__`));
    if (!f) return null;
    return { duongDan: path.join(THU_MUC(), f), tenFile: f.slice(ma.length + 2) };
  } catch {
    return null;
  }
}

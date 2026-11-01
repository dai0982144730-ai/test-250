// /api/ai/ket-noi — CẤU HÌNH KẾT NỐI AI (quyền cau_hinh.sua). Thẻ "Kết nối AI" ở Cài đặt → AI và trang Kỹ năng AI.
//   GET  → { ok, mode, provider, model, modelCli, baseUrl, keyMasked, coKhoaWeb, nhaCungCap: {<ncc>: {coKhoa, keyMasked, model}} }
//   POST { mode?, provider?, nccKhoa?, apiKey?, model?, modelCli?, baseUrl?, braveKey? } → ghi data/ai-ket-noi.json
// Như HptStart: khóa + model lưu RIÊNG theo nhà cung cấp — `apiKey`/`model` thuộc `provider` gửi kèm
// (không gửi provider = nhà cung cấp đang lưu). Khóa không bao giờ trả về client (chỉ dạng che sk-…abcd).
// apiKey rỗng = giữ nguyên, "-" = xóa khóa của nhà cung cấp đó. Mỗi lần lưu ghi lịch sử (không ghi khóa).
import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { PROVIDERS, getAIConfig, maskApiKey, type AIProvider } from "@/lib/ai/providers";
import { ghiKetNoi, layKetNoi, layKhoaNcc, layModelCli, layModelNcc, type KhoaKetNoi, type RiengNcc } from "@/lib/ai/ket-noi";
import { batBuocQuyen, docJson, ghiDoiKetNoi } from "@/lib/ai/route-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_HOP_LE = /^[\w.\-:/]{1,100}$/;

function hienTai() {
  const cfg = getAIConfig();
  const nhaCungCap: Record<string, { coKhoa: boolean; keyMasked: string; model: string }> = {};
  for (const p of PROVIDERS) {
    const khoa = layKhoaNcc(p) ?? "";
    nhaCungCap[p] = { coKhoa: khoa !== "", keyMasked: maskApiKey(khoa), model: layModelNcc(p) ?? "" };
  }
  return {
    ok: true,
    mode: cfg.mode,
    provider: cfg.provider,
    model: layModelNcc(cfg.provider) ?? "",
    modelCli: layModelCli() ?? "",
    baseUrl: cfg.baseUrl,
    keyMasked: maskApiKey(layKhoaNcc(cfg.provider) ?? ""),
    coKhoaWeb: (layKetNoi("braveSearchKey") ?? "") !== "",
    nhaCungCap,
  };
}

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới xem kết nối AI.");
    return hienTai();
  });
}

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới đổi kết nối AI.");
    const b = await docJson(req);
    const phan: Partial<Record<KhoaKetNoi, string>> = {};
    if (b.mode !== undefined) {
      if (b.mode !== "claude-cli" && b.mode !== "api" && b.mode !== "off") throw new LoiHttp(400, "Chế độ phải là claude-cli, api hoặc off.");
      phan.aiMode = String(b.mode);
    }
    if (b.provider !== undefined) {
      if (!(PROVIDERS as string[]).includes(String(b.provider))) throw new LoiHttp(400, "Nhà cung cấp không hợp lệ.");
      phan.aiProvider = String(b.provider);
    }
    // Khóa/model gửi kèm thuộc: nccKhoa (sửa khóa một hãng mà KHÔNG đổi hãng đang dùng)
    // → provider trong body → nhà cung cấp đang lưu
    if (b.nccKhoa !== undefined && !(PROVIDERS as string[]).includes(String(b.nccKhoa))) throw new LoiHttp(400, "Nhà cung cấp không hợp lệ.");
    const ncc = (b.nccKhoa !== undefined ? String(b.nccKhoa) : phan.aiProvider ?? getAIConfig().provider) as AIProvider;
    const rieng: RiengNcc = {};
    if (typeof b.model === "string") {
      if (b.model !== "" && !MODEL_HOP_LE.test(b.model)) throw new LoiHttp(400, "Tên model không hợp lệ.");
      rieng.model = b.model;
    }
    if (typeof b.modelCli === "string") {
      if (b.modelCli !== "" && !MODEL_HOP_LE.test(b.modelCli)) throw new LoiHttp(400, "Tên model không hợp lệ.");
      phan.aiModelCli = b.modelCli;
    }
    if (typeof b.baseUrl === "string") {
      if (b.baseUrl !== "" && !/^https?:\/\/[^\s]+$/.test(b.baseUrl)) throw new LoiHttp(400, "Base URL phải bắt đầu bằng http(s)://");
      phan.aiBaseUrl = b.baseUrl;
    }
    let doiKhoa: "" | "dat" | "xoa" = "";
    if (typeof b.apiKey === "string" && b.apiKey.trim() !== "") {
      const k = b.apiKey.trim();
      if (k !== "-" && (k.length < 8 || /\s/.test(k))) throw new LoiHttp(400, "API key không đúng dạng (quá ngắn hoặc có khoảng trắng).");
      rieng.khoa = k === "-" ? "" : k;
      doiKhoa = k === "-" ? "xoa" : "dat";
    }
    if (typeof b.braveKey === "string" && b.braveKey.trim() !== "") phan.braveSearchKey = b.braveKey.trim() === "-" ? "" : b.braveKey.trim();
    const coRieng = rieng.khoa !== undefined || rieng.model !== undefined;
    ghiKetNoi(phan, coRieng ? { [ncc]: rieng } : undefined);
    // Đổi cài đặt nào cũng vào lịch sử (ai đổi, lúc nào, đổi gì) — KHÔNG ghi giá trị khóa
    await ghiDoiKetNoi(nd, {
      doi: [...Object.keys(phan).filter((k) => k !== "braveSearchKey"), ...(rieng.model !== undefined ? ["model"] : [])],
      ...(phan.aiMode !== undefined ? { mode: phan.aiMode } : {}),
      ...(phan.aiProvider !== undefined ? { provider: phan.aiProvider } : {}),
      ...(rieng.model !== undefined ? { model: rieng.model, model_cua: ncc } : {}),
      ...(phan.aiModelCli !== undefined ? { model_cli: phan.aiModelCli } : {}),
      ...(doiKhoa ? { api_key: [doiKhoa === "dat" ? "đặt khóa mới" : "xóa khóa", ncc] } : {}),
      ...(phan.braveSearchKey !== undefined ? { brave_search: [phan.braveSearchKey === "" ? "xóa khóa" : "đặt khóa mới"] } : {}),
    });
    return { ...hienTai(), message: "Đã lưu kết nối AI — áp dụng từ câu chat sau." };
  });
}

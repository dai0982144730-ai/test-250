// /api/tro-ly/model — chip chọn MODEL của trợ lý (lấy từ agent tiến độ).
// GET  : { ok, mode, hienTai, dangChon, macDinh, danhSach: [{id, nhan}], ghiChu }
// POST : { model } — chọn RIÊNG cho người đang đăng nhập ("" = về mặc định cấu hình ai.model_mac_dinh).
// Khác bản gốc: bản gốc ghi một model chung (chỉ PM đổi); SCI công việc mặc định theo cấu hình,
// mỗi người đè cho riêng mình — áp dụng NGAY câu chat sau.
import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { layQ } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { getAIConfig } from "@/lib/ai/providers";
import { docModelRieng, ghiModelRieng, modelTroLyMacDinh } from "@/lib/ai/model-rieng";
import { docJson } from "@/lib/ai/route-chung";
import { tenModel } from "@/lib/ai/danh-muc-model";
import { banCliHienTai, conHieuLuc, dangDoModel, danhMucDayDu, docKetQuaDo, doModelThat, modelChuaChay } from "@/lib/ai/model-that";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Model không cho chọn ở khung chat (Mr. Đại chốt 01/10: gỡ Fable "kẻo người không biết bấm vào"). Việc AI nền vẫn dùng được. */
const laModelAn = (id: string) => /fable/i.test(id);

interface MotModel {
  id: string;
  nhan: string;
}

const GOC_OPENAI: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  grok: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
};

/**
 * Danh sách model chọn được = BẢN CỐ ĐỊNH (luôn đủ, tự cập nhật khi dò thấy model mới) + LOAD THẬT:
 *  • Claude CLI: chạy thử từng model (ai/model-that.ts) để đánh dấu model nào đang chạy được; không chạy được Claude
 *    thì vẫn hiện đủ bản cố định;
 *  • khóa API: hỏi thẳng hãng /models (đủ mọi model, không cắt) gộp với bản cố định.
 * Chọn "Model khác…" để gõ mã bất kỳ.
 */
async function danhSachModel(macDinh: string, them: string[]): Promise<{ danhSach: MotModel[]; ghiChu: string; dangDo?: boolean }> {
  const cfg = getAIConfig();
  const dau = { id: "", nhan: `Mặc định (${macDinh ? tenModel(macDinh) : "theo kết nối"})` };
  if (cfg.mode === "claude-cli") {
    const coDinh = danhMucDayDu(them);
    const ban = await banCliHienTai();
    if (!ban) {
      return {
        danhSach: [dau, ...coDinh.map((m) => ({ id: m.id, nhan: m.ten }))],
        ghiChu: `Chưa chạy được Claude CLI trên máy chủ — hiện đủ ${coDinh.length} model của bản cố định.`,
      };
    }
    const kq = docKetQuaDo();
    if (conHieuLuc(kq, ban, them)) {
      const hong = modelChuaChay(kq, them);
      // Model dò thật KHÔNG chạy được thì ẨN hẳn (Mr. Đại 01/10: "kẻo người không biết bấm vào") — trước hiện kèm chữ
      // "CLI chưa chạy được" mà vẫn bấm được, chọn vào là mọi câu chat lỗi.
      return {
        danhSach: [dau, ...coDinh.filter((m) => !hong.includes(m.id)).map((m) => ({ id: m.id, nhan: m.ten }))],
        ghiChu:
          `${coDinh.length} model (bản cố định, tự cập nhật). Đã chạy thử thật với Claude CLI ${kq.phien_ban_cli} lúc ` +
          `${new Date(kq.luc).toLocaleString("vi-VN")}: ${coDinh.length - hong.length} model chạy được.` +
          (hong.length ? ` Đã ẩn ${hong.length} model chưa chạy được (${hong.join(", ")}) — cập nhật Claude (claude update) rồi bấm Dò lại.` : ""),
      };
    }
    void doModelThat(them).catch(() => undefined); // dò nền, lần mở sau có đánh dấu thật
    return {
      danhSach: [dau, ...coDinh.map((m) => ({ id: m.id, nhan: m.ten }))],
      ghiChu: `${coDinh.length} model (bản cố định). Đang chạy thử từng model với Claude CLI (khoảng 1 phút)…`,
      dangDo: true,
    };
  }
  if (cfg.mode === "off") return { danhSach: [dau], ghiChu: "Kết nối AI đang tắt." };
  try {
    let url: string;
    let headers: Record<string, string>;
    if (cfg.provider === "anthropic") {
      url = "https://api.anthropic.com/v1/models";
      headers = { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" };
    } else {
      url = `${cfg.provider === "custom" ? cfg.baseUrl : GOC_OPENAI[cfg.provider]}/models`;
      headers = { authorization: `Bearer ${cfg.apiKey}` };
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { data?: { id?: string }[] };
    const ids = (j.data ?? []).map((m) => m.id ?? "").filter((id) => id !== "");
    const coDinh = cfg.provider === "anthropic" ? danhMucDayDu(them).map((m) => m.id) : them;
    for (const id of coDinh) if (!ids.includes(id)) ids.push(id);
    const ds = ids.map((id) => ({ id, nhan: tenModel(id) }));
    return { danhSach: [dau, ...ds], ghiChu: `Danh sách lấy thật từ ${cfg.provider} (${ids.length} model).` };
  } catch (e) {
    const du = cfg.provider === "anthropic" ? danhMucDayDu(them).map((m) => ({ id: m.id, nhan: m.ten })) : them.map((id) => ({ id, nhan: id }));
    return { danhSach: [dau, ...du], ghiChu: `Không hỏi được hãng (${e instanceof Error ? e.message : "?"}) — dùng bản cố định.` };
  }
}

// ?tat_ca=1: ô chọn model ở Cài đặt (việc AI nền dùng được cả model khung chat ẩn, vd Fable)
export async function GET(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const tatCa = new URL(req.url).searchParams.get("tat_ca") === "1";
    const cfg = getAIConfig();
    const cfgAi = await layCauHinh(await layQ(), "ai");
    const macDinh = modelTroLyMacDinh(cfgAi);
    const dangChon = docModelRieng(nd.id);
    const kq = await danhSachModel(macDinh, cfgAi.model_them ?? []);
    const { ghiChu, dangDo } = kq;
    const danhSach = kq.danhSach.filter((m) => tatCa || !laModelAn(m.id));
    return {
      dangDo: dangDo || dangDoModel(),
      ok: true,
      mode: cfg.mode,
      daCauHinh: cfg.mode !== "off",
      dangChon,
      macDinh,
      hienTai: dangChon || macDinh || "Mặc định",
      danhSach,
      ghiChu,
    };
  });
}

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = await docJson(req);
    if (body.do_lai === true) {
      // "Dò lại model thật": chạy thử lại mọi model (sau khi cập nhật CLI / hãng ra model mới)
      if (getAIConfig().mode !== "claude-cli") return { ok: true };
      await doModelThat((await layCauHinh(await layQ(), "ai")).model_them ?? [], true);
      return { ok: true };
    }
    const model = typeof body.model === "string" ? body.model.trim() : null;
    if (model === null || (model !== "" && !/^[\w.\-:/]{1,100}$/.test(model))) throw new LoiHttp(400, "Tên model không hợp lệ.");
    if (laModelAn(model)) throw new LoiHttp(400, "Model Fable không dùng cho trợ lý chat (chậm nhất: đo 01/10 mất 20 giây cho câu một chữ). Chọn Sonnet 5 hoặc Opus 5.");
    ghiModelRieng(nd.id, model);
    const macDinh = modelTroLyMacDinh(await layCauHinh(await layQ(), "ai"));
    return { ok: true, hienTai: model || macDinh || "Mặc định", dangChon: model };
  });
}

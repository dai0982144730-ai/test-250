// ============================================================
// ai/model-that.ts — DÒ MODEL THẬT cho Claude CLI (không tin danh sách cố định).
// Claude CLI không có lệnh liệt kê model → chạy thử THẬT một câu ngắn với từng ứng viên:
//   • bí danh fable/opus/sonnet/haiku → CLI trả về mã model mới nhất thật (modelUsage) → tự phát hiện model mới;
//   • mã trong danh mục (danh-muc-model.ts) + "Model bổ sung" của quản trị → biết mã nào CLI đang cài chạy được.
// Kết quả lưu data/ai-model-cli.json theo phiên bản CLI; đổi phiên bản CLI / thêm model bổ sung → tự dò lại.
// Model mới dò thấy được GHI THÊM vào bản cố định (data/ai-danh-muc-model.json) → khung chọn luôn đủ model,
// kể cả khi sau này Claude không chạy được. Dò chạy nền; lỗi dò không chặn gì.
// Server-only.
// ============================================================

import fs from "node:fs";
import { thuMucDuLieu } from "./duong-dan";
import { phienBanCli, thuModelCli } from "./providers";
import { MODEL_CLAUDE, danhSachModelClaude, tenTuMa, type ModelDanhMuc } from "./danh-muc-model";

export interface KetQuaDoModel {
  phien_ban_cli: string;
  luc: string;
  /** mã đã thử → kết quả */
  thu: Record<string, { ok: boolean; thucTe?: string; loi?: string }>;
}

const BI_DANH = ["fable", "opus", "sonnet", "haiku"];
const tep = () => thuMucDuLieu("ai-model-cli.json");
const tepHoc = () => thuMucDuLieu("ai-danh-muc-model.json");

/** Model hệ thống tự học được (mới nhất trước) — phần tự cập nhật của bản cố định. */
export function docModelHoc(): ModelDanhMuc[] {
  try {
    const j = JSON.parse(fs.readFileSync(tepHoc(), "utf8")) as { model?: ModelDanhMuc[] };
    return (j.model ?? []).filter((m) => typeof m?.id === "string" && m.id.trim() !== "");
  } catch {
    return [];
  }
}

/** BẢN CỐ ĐỊNH đầy đủ: model tự học + danh mục trong code + model bổ sung của quản trị. */
export function danhMucDayDu(them: string[]): ModelDanhMuc[] {
  return danhSachModelClaude(them, docModelHoc());
}

/** Ghi thêm vào bản cố định các mã chạy được mà bản cố định chưa có (vd bí danh "opus" trỏ sang mã mới). */
function hocModelMoi(kq: KetQuaDoModel): void {
  const hoc = docModelHoc();
  const co = new Set([...MODEL_CLAUDE.map((m) => m.id), ...hoc.map((m) => m.id)]);
  const moi: ModelDanhMuc[] = [];
  for (const r of Object.values(kq.thu)) {
    const id = r.ok ? r.thucTe?.trim() : "";
    if (id && /^[\w.\-:/]{1,100}$/.test(id) && !co.has(id)) {
      co.add(id);
      moi.push({ id, ten: tenTuMa(id) });
    }
  }
  if (!moi.length) return;
  fs.writeFileSync(tepHoc(), JSON.stringify({ cap_nhat: kq.luc, model: [...moi, ...hoc] }, null, 2), "utf8");
}

export function docKetQuaDo(): KetQuaDoModel | null {
  try {
    return JSON.parse(fs.readFileSync(tep(), "utf8")) as KetQuaDoModel;
  } catch {
    return null;
  }
}

/** Các mã cần thử: bí danh (để phát hiện model mới nhất) + bản cố định đầy đủ (kể cả model tự học, model bổ sung). */
export function ungVien(them: string[]): string[] {
  return [...new Set([...BI_DANH, ...danhMucDayDu(them).map((m) => m.id)])];
}

let dangDo: Promise<KetQuaDoModel> | null = null;
let banCli: { v: string; luc: number } | null = null;

/** Phiên bản CLI (nhớ 10 phút — khỏi gọi CLI mỗi lần mở khung chọn). */
export async function banCliHienTai(): Promise<string> {
  if (banCli && Date.now() - banCli.luc < 600_000) return banCli.v;
  banCli = { v: await phienBanCli(), luc: Date.now() };
  return banCli.v;
}

/** Kết quả dò còn dùng được không (cùng phiên bản CLI, đã thử đủ ứng viên). */
export function conHieuLuc(kq: KetQuaDoModel | null, ban: string, them: string[]): kq is KetQuaDoModel {
  return !!kq && kq.phien_ban_cli === ban && ungVien(them).every((id) => id in kq.thu);
}

/** Dò thật (tuần tự, một lượt dò tại một thời điểm). `batBuoc` = thử lại hết kể cả mã đã thử. */
export function doModelThat(them: string[], batBuoc = false): Promise<KetQuaDoModel> {
  if (dangDo) return dangDo;
  dangDo = (async () => {
    const ban = await phienBanCli();
    banCli = { v: ban, luc: Date.now() };
    const cu = docKetQuaDo();
    const giu = !batBuoc && cu && cu.phien_ban_cli === ban ? cu.thu : {};
    const kq: KetQuaDoModel = { phien_ban_cli: ban, luc: new Date().toISOString(), thu: { ...giu } };
    for (const id of ungVien(them)) {
      if (id in kq.thu) continue;
      kq.thu[id] = await thuModelCli(id);
    }
    try {
      fs.mkdirSync(thuMucDuLieu(), { recursive: true });
      fs.writeFileSync(tep(), JSON.stringify(kq, null, 2), "utf8");
      hocModelMoi(kq);
    } catch {
      // không ghi được thì lần sau dò lại — không chặn
    }
    return kq;
  })().finally(() => {
    dangDo = null;
  });
  return dangDo;
}

export const dangDoModel = () => dangDo !== null;

/** Mã trong bản cố định đã thử mà Claude CLI chưa chạy được (vd CLI cũ chưa biết claude-opus-5-5). */
export function modelChuaChay(kq: KetQuaDoModel, them: string[]): string[] {
  return danhMucDayDu(them)
    .map((m) => m.id)
    .filter((id) => kq.thu[id] && !kq.thu[id]!.ok);
}

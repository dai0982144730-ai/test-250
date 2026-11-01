// ============================================================
// ai/danh-muc-model.ts — DANH MỤC MODEL CLAUDE CỐ ĐỊNH dùng chung (khung chọn model, Kết nối AI, dự phòng).
// Hai lớp, luôn đủ model kể cả khi không chạy được Claude:
//   1. BẢN CỐ ĐỊNH = danh mục này + model hệ thống tự học được (data/ai-danh-muc-model.json, ai/model-that.ts):
//      mỗi lần dò thấy model mới (vd bí danh "opus" trỏ sang mã mới) là tự thêm vào → bản cố định luôn được cập nhật;
//   2. DÒ THẬT: chạy thử từng model để đánh dấu model nào đang dùng được với Claude CLI trên máy.
// Quản trị thêm tay ở Cài đặt → AI → Model bổ sung. Tên đầy đủ (vd claude-opus-5-5) truyền thẳng cho Claude CLI.
// ============================================================

export interface ModelDanhMuc {
  id: string;
  ten: string;
}

/** Model Claude hiện có (mới nhất trước). Cập nhật khi Anthropic ra model mới — hoặc thêm ở Cài đặt → AI → Model bổ sung. */
export const MODEL_CLAUDE: ModelDanhMuc[] = [
  { id: "claude-fable-5-1", ten: "Claude Fable 5.1 (mới nhất)" },
  { id: "claude-opus-5-5", ten: "Claude Opus 5.5 (rất mạnh)" },
  { id: "claude-opus-5", ten: "Claude Opus 5" },
  { id: "claude-sonnet-5", ten: "Claude Sonnet 5 (cân bằng — nên dùng)" },
  { id: "claude-sonnet-4-5", ten: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", ten: "Claude Haiku 4.5 (nhanh, nhẹ)" },
];

/** Tên đẹp từ mã model Claude chưa có trong danh mục: claude-opus-5-5 → "Claude Opus 5.5"; mã hãng khác giữ nguyên. */
export function tenTuMa(id: string): string {
  const m = id.trim().match(/^claude-([a-z]+)-(\d+(?:-\d{1,2})*)(?:-\d{8})?$/i);
  if (!m) return id;
  return `Claude ${m[1]!.charAt(0).toUpperCase()}${m[1]!.slice(1)} ${m[2]!.replace(/-/g, ".")}`;
}

/** Tên hiển thị của một mã model (có trong danh mục thì lấy tên đẹp, không thì tự đặt từ mã). */
export function tenModel(id: string): string {
  return MODEL_CLAUDE.find((m) => m.id === id)?.ten ?? tenTuMa(id);
}

/** Model tự học (mới nhất trước) + danh mục + model bổ sung của quản trị (bỏ trùng, giữ thứ tự). */
export function danhSachModelClaude(them: string[] = [], hoc: ModelDanhMuc[] = []): ModelDanhMuc[] {
  const kq: ModelDanhMuc[] = [];
  for (const m of [...hoc, ...MODEL_CLAUDE]) if (!kq.some((x) => x.id === m.id)) kq.push(m);
  for (const id of them.map((x) => x.trim()).filter(Boolean)) if (!kq.some((m) => m.id === id)) kq.push({ id, ten: `${tenTuMa(id)} (bổ sung)` });
  return kq;
}

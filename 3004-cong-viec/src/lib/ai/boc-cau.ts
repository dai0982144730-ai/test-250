// boc-cau.ts — bóc trả lời LLM dạng {"<khóa>":["câu 1","câu 2"]} (THUẦN, luật 7:
// một định nghĩa cho mọi món "AI viết vài câu" — nhận xét năng suất, giải thích COD…)

/** Trả mảng câu đã lọc (bỏ câu < 10 ký tự, cắt còn `toiDa`) — hỏng khuôn → null */
export function bocMangCau(raw: string, khoa: string, toiDa = 6): string[] | null {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const dau = s.indexOf("{");
  const cuoi = s.lastIndexOf("}");
  if (dau < 0 || cuoi <= dau) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(s.slice(dau, cuoi + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!Array.isArray(o[khoa])) return null;
  const cau = (o[khoa] as unknown[]).map((x) => String(x).trim()).filter((x) => x.length >= 10);
  return cau.length > 0 ? cau.slice(0, toiDa) : null;
}

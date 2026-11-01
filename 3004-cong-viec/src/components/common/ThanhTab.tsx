"use client";
// THANH TAB DÙNG CHUNG — cùng khuôn ThanhTab của agent Tiến độ / Nghiệm thu / Hợp đồng (Mr. Đại 25/10/2026): số vàng = việc còn lại cần xem xét,
// ✔ xanh = sạch. `viec` do CODE đếm cùng hàm với danh sách bên dưới (0 = ✔, không hiện «0»). Chữ thuần không viền (luật 28) chỉ ở số / dấu ✔;
// chính tab là nút nên có viền. Bản này đặt gam màu theo màn sáng của agent Công việc (3004).
export interface MucTab<M extends string = string> {
  ma: M;
  /** số thứ tự tròn: ① ② … */
  so: string;
  ten: string;
  /** số việc còn lại cần xem xét; 0 = sạch (hiện ✔); undefined = không đếm (không hiện ✔ lẫn số) */
  viec?: number;
}

export function ThanhTab<M extends string>({
  tabs,
  chon,
  onChon,
  nhan = "Các tab",
  lenh,
  gt,
}: {
  tabs: MucTab<M>[];
  chon: M;
  onChon: (ma: M) => void;
  nhan?: string;
  /** data-lenh của mỗi tab (cho bài kiểm tự động) */
  lenh?: string;
  /** data-gt của mỗi tab */
  gt?: (ma: M) => string;
}) {
  return (
    <div role="tablist" aria-label={nhan} className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <button
          key={t.ma}
          type="button"
          role="tab"
          aria-selected={chon === t.ma}
          onClick={() => onChon(t.ma)}
          data-lenh={lenh}
          data-gt={gt?.(t.ma)}
          className={`rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
            chon === t.ma ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text-secondary hover:border-accent hover:text-text"
          }`}
        >
          {t.so} {t.ten} {t.viec === undefined ? null : t.viec > 0 ? <b className="text-yellow">· {t.viec.toLocaleString("vi-VN")}</b> : <span className="text-green">✔</span>}
        </button>
      ))}
    </div>
  );
}

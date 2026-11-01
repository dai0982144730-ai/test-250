// ============================================================
// KHO NHỚ TẠM DÙNG CHUNG — một khuôn cho mọi bộ nhớ tạm cấp tiến trình
// (lô sửa 16 thẻ Sổ phát hiện, Mr. Đại duyệt 27/09/2026 — QS-080/081/075/076)
//
// Ba luật cứng của phần chung (chung-16.md):
//   ① ĐẶT TRÊN `globalThis` — `next dev` nạp lại route thì biến cấp module mất
//     (đo 23/09: nhoGang mất giữa hai lượt gọi, lượt hai vẫn hỏi 3003);
//   ② MỘT LƯỢT BAY — hai lượt cùng khoá cùng lúc dùng chung MỘT Promise. Thiếu
//     cái này thì bộ nhớ tạm vô dụng đúng lúc cần nhất: Main mở bảng điều hành
//     bắn 21 lượt cùng một giây, cả 21 lượt đều thấy "chưa có trong bộ nhớ";
//   ③ CHỈ NHỚ câu trả lời `ok` — lỗi thì lượt sau hỏi lại ngay.
//
// File THUẦN (không node:fs, không mạng) — bài kiểm gọi thẳng được.
// ============================================================

interface MucNho<T> {
  luc: number;
  giaTri: T;
}

interface KhoTho<T> {
  du: Map<string, MucNho<T>>;
  bay: Map<string, Promise<T>>;
}

export interface KetQuaNho<T> {
  giaTri: T;
  /**
   * true = lượt này KHÔNG tự gọi ra ngoài (lấy từ bộ nhớ, hoặc đi nhờ lượt
   * đang bay của người khác) → không ghi sổ như một lượt gọi.
   */
  tuNho: boolean;
  /** Mốc lúc giá trị được lấy thật (ms) — để câu trả lời nói "số lấy lúc…" */
  luc: number;
}

export interface KhoNhoTam<T> {
  /**
   * Lấy theo khoá: còn hạn → trả ngay; đang có lượt bay cùng khoá → đi nhờ;
   * còn lại → gọi `lay()` MỘT lần, nhớ nếu `laOk`.
   * `boQua: true` = bỏ qua bộ nhớ (người bấm "kiểm tra ngay") — vẫn gọi thật,
   * vẫn cập nhật bộ nhớ nếu ok.
   */
  lay(khoa: string, lay: () => Promise<T>, laOk: (v: T) => boolean, o?: { boQua?: boolean }): Promise<KetQuaNho<T>>;
  /** Xem không gọi — trả mục còn hạn hoặc undefined */
  xem(khoa: string): MucNho<T> | undefined;
  /** Đặt tay một giá trị (ví dụ nạp từ một lượt kéo khác) */
  dat(khoa: string, giaTri: T, luc?: number): void;
  /** Xoá một khoá, các khoá thoả điều kiện, hoặc cả kho (bài kiểm dùng) */
  xoa(dieuKien?: string | ((khoa: string) => boolean)): void;
  /** Số mục đang nhớ (bài kiểm dùng) */
  soMuc(): number;
}

/**
 * Tạo (hoặc lấy lại) một kho trên `globalThis[tenToanCuc]`.
 * Gọi lại nhiều lần với cùng tên → cùng một kho (sống qua lần nạp lại route).
 */
export function taoKhoNhoTam<T>(tenToanCuc: string, hanMs: number): KhoNhoTam<T> {
  const g = globalThis as unknown as Record<string, KhoTho<T> | undefined>;
  const kho: KhoTho<T> = (g[tenToanCuc] ??= { du: new Map(), bay: new Map() });

  const conHan = (m: MucNho<T> | undefined): m is MucNho<T> => m !== undefined && Date.now() - m.luc < hanMs;

  return {
    async lay(khoa, lay, laOk, o = {}) {
      if (!o.boQua) {
        const cu = kho.du.get(khoa);
        if (conHan(cu)) return { giaTri: cu.giaTri, tuNho: true, luc: cu.luc };
        const dangBay = kho.bay.get(khoa);
        if (dangBay) {
          const v = await dangBay;
          return { giaTri: v, tuNho: true, luc: kho.du.get(khoa)?.luc ?? Date.now() };
        }
      }
      const p = (async () => {
        const v = await lay();
        if (laOk(v)) kho.du.set(khoa, { luc: Date.now(), giaTri: v });
        return v;
      })();
      // Lượt bỏ qua bộ nhớ không chiếm chỗ lượt bay — không bắt người khác chờ nó
      if (!o.boQua) kho.bay.set(khoa, p);
      try {
        const v = await p;
        return { giaTri: v, tuNho: false, luc: Date.now() };
      } finally {
        if (kho.bay.get(khoa) === p) kho.bay.delete(khoa);
      }
    },
    xem(khoa) {
      const m = kho.du.get(khoa);
      return conHan(m) ? m : undefined;
    },
    dat(khoa, giaTri, luc = Date.now()) {
      kho.du.set(khoa, { luc, giaTri });
    },
    xoa(dieuKien) {
      if (dieuKien === undefined) {
        kho.du.clear();
        kho.bay.clear();
        return;
      }
      const khop = typeof dieuKien === "string" ? (k: string) => k === dieuKien : dieuKien;
      for (const k of Array.from(kho.du.keys())) if (khop(k)) kho.du.delete(k);
    },
    soMuc() {
      return kho.du.size;
    },
  };
}

/** Khoá ổn định cho một bộ tham số: sắp khoá, bỏ giá trị rỗng/undefined */
export function khoaThamSo(ts: Record<string, unknown>): string {
  const sach: Record<string, unknown> = {};
  for (const k of Object.keys(ts).sort()) {
    const v = ts[k];
    if (v === undefined || v === null || v === "") continue;
    sach[k] = v;
  }
  return JSON.stringify(sach);
}

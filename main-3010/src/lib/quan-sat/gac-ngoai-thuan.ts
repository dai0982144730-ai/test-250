// ============================================================
// SỔ GÁC NGOÀI — phần THUẦN (không node:fs) cho công cụ MCP `main.so_gac`
//
// J13 (Mr. Đại chốt 22/09/2026): script `GAC-5-AGENT.ps1` ở gốc thư mục SCI
// Tiến độ ghi sự kiện vào `data/gac-5-agent.jsonl` của Main. Main CHỈ ĐỌC.
// 26/09/2026: màn Sức khoẻ ở Main đã bỏ — Agent quan sát đọc sổ này qua cửa
// MCP chỉ đọc `main.so_gac`, để biết khoảng nào agent nào ĐANG BẢO TRÌ (chết /
// tự bật lại) mà không tính lỗi trong khoảng đó là lỗi nghiệp vụ.
//
// Giá trị `su_kien` script ghi (grep GAC-5-AGENT.ps1, 26/09):
//   khoi_dong · dung (cổng 0 — chính script) · treo · bat_lai · bat_lai_loi ·
//   song_lai · bo_cuoc · het_nghi · telegram · mat_trang (18/10: cửa MCP 404 dù "/" trả lời —
//   bộ đệm dev hỏng; tới ngưỡng thì script tắt cổng, xoá bộ đệm, ghi tiếp bat_lai)
//   26/10/2026: dang_dung (cổng 3004 chết mà chưa có bản build = có phiên đang dựng lại — KHÔNG
//   tính lần bật lại, mở khoảng bảo trì) · dung_xong (có bản build, gác bật ngay) · dung_qua_lau
//   (quá 20 phút vẫn chưa có bản build — script nhắn Telegram). Đóng khoảng vẫn ở song_lai.
// Đo sổ thật 26/09: bat_lai 15 · song_lai 15 · treo 7 · khoi_dong 2.
// Script KHÔNG ghi sự kiện "chet" — cổng chết được bật lại ngay trong nhịp đo
// nên lúc `bat_lai` ≈ lúc phát hiện chết.
// ============================================================

/** Một dòng sổ — đúng khuôn script ghi */
export interface SuKienGac {
  luc: string;
  /** 0 = sự kiện của chính script (khởi động / dừng) */
  cong: number;
  ten: string;
  su_kien: string;
  lan: number;
  mo_ta: string;
}

/** Nhãn tiếng Việt cho mã sự kiện script ghi */
export const NHAN_SU_KIEN: Record<string, string> = {
  khoi_dong: "bắt đầu gác",
  dung: "dừng gác",
  treo: "treo",
  bat_lai: "tự bật lại",
  bat_lai_loi: "bật lại lỗi",
  song_lai: "đã sống lại",
  bo_cuoc: "thôi bật 30 phút",
  het_nghi: "hết nghỉ, gác lại",
  telegram: "Telegram",
  mat_trang: "mất trang (404)",
  dang_dung: "đang dựng lại bản mới",
  dung_xong: "dựng xong, bật lại",
  dung_qua_lau: "dựng lại quá 20 phút",
};

/** Bóc sổ JSONL — dòng hỏng bỏ qua đúng dòng đó */
export function bocSo(noi: string): SuKienGac[] {
  const ra: SuKienGac[] = [];
  for (const dong of noi.split(/\r?\n/)) {
    const d = dong.replace(/^﻿/, "").trim();
    if (d === "") continue;
    try {
      const o = JSON.parse(d) as Partial<SuKienGac>;
      if (typeof o.luc !== "string" || typeof o.su_kien !== "string") continue;
      ra.push({
        luc: o.luc,
        cong: Number(o.cong) || 0,
        ten: String(o.ten ?? ""),
        su_kien: o.su_kien,
        lan: Number(o.lan) || 0,
        mo_ta: String(o.mo_ta ?? ""),
      });
    } catch {
      /* dòng hỏng */
    }
  }
  return ra;
}

// ─────────────────────────────────────────────────────────────
// Khoảng bảo trì — code dựng sẵn, bên đọc không phải tự ghép cặp
// ─────────────────────────────────────────────────────────────

/**
 * Biên an toàn SAU lúc sống lại. Đo 26/09: Main sống lại 22:33:12 (giờ VN) mà
 * các agent khác kéo cấu hình ngay sau đó vẫn quá hạn tới 22:34:02 — lỗi trong
 * ~50 giây đó vẫn là hệ quả bảo trì. Lấy tròn 2 phút.
 */
export const BIEN_SAU_MS = 2 * 60 * 1000;

/**
 * `treo` đứng NGAY trước `bat_lai` của cùng cổng trong vòng này thì khoảng tính
 * từ lúc treo (script treo 2 nhịp mới bật lại; chu kỳ 60 giây + hạn ping 15 giây).
 */
const TREO_TRUOC_TOI_DA_MS = 5 * 60 * 1000;

/** Sự kiện MỞ khoảng: agent bị bật lại / không bật được / thôi bật / đang dựng lại bản mới (26/10) */
const MO_KHOANG = new Set(["bat_lai", "bat_lai_loi", "bo_cuoc", "dang_dung"]);

/** Sự kiện mở khoảng mà KHÔNG phải một lần bật lại */
const KHONG_DEM_BAT_LAI = new Set(["bo_cuoc", "dang_dung"]);

export interface KhoangBaoTri {
  cong: number;
  /** Tra từ danh bạ theo cổng — null khi danh bạ không có cổng này */
  ma_agent: string | null;
  ten: string;
  /** ISO — lúc chết / bắt đầu bật lại (hoặc lúc treo ngay trước đó) */
  tu: string;
  /** ISO — lúc sống lại; null = chưa thấy sống lại */
  den: string | null;
  /** ISO — `den` + biên an toàn; null khi `den` null */
  den_ca_bien: string | null;
  /** Số lần tự bật lại trong khoảng */
  so_lan_bat_lai: number;
  /** Sự kiện mở khoảng + đóng khoảng, theo thứ tự */
  su_kien: string[];
  /**
   * ISO — lúc script gác KHỞI ĐỘNG LẠI khi khoảng còn mở (script quên đếm cũ nên
   * không bao giờ ghi `song_lai` cho khoảng này): `den` null nhưng KHÔNG có nghĩa
   * là còn chết. null = khoảng không bị cắt.
   */
  cat_boi_script_luc: string | null;
}

/**
 * Dựng khoảng bảo trì từ TOÀN BỘ sổ (thứ tự thời gian tăng dần).
 * `tra` tra mã agent theo cổng từ danh bạ.
 */
export function dungKhoangBaoTri(suKien: SuKienGac[], tra: (cong: number) => string | null): KhoangBaoTri[] {
  const ds = [...suKien].sort((a, b) => a.luc.localeCompare(b.luc));
  const ra: KhoangBaoTri[] = [];
  const dangMo = new Map<number, KhoangBaoTri>();
  const treoCuoi = new Map<number, SuKienGac>();

  for (const s of ds) {
    if (s.cong === 0) {
      // Script khởi động lại: mọi khoảng còn mở sẽ không bao giờ có song_lai
      if (s.su_kien === "khoi_dong") {
        dangMo.forEach((k) => (k.cat_boi_script_luc = s.luc));
        dangMo.clear();
        treoCuoi.clear();
      }
      continue;
    }
    if (s.su_kien === "treo") {
      treoCuoi.set(s.cong, s);
      continue;
    }
    if (MO_KHOANG.has(s.su_kien)) {
      const k = dangMo.get(s.cong);
      if (k) {
        if (!KHONG_DEM_BAT_LAI.has(s.su_kien)) k.so_lan_bat_lai += 1;
        k.su_kien.push(s.su_kien);
        continue;
      }
      const treo = treoCuoi.get(s.cong);
      const tu =
        treo && Date.parse(s.luc) - Date.parse(treo.luc) <= TREO_TRUOC_TOI_DA_MS && treo.luc <= s.luc ? treo.luc : s.luc;
      const moi: KhoangBaoTri = {
        cong: s.cong,
        ma_agent: tra(s.cong),
        ten: s.ten,
        tu,
        den: null,
        den_ca_bien: null,
        so_lan_bat_lai: KHONG_DEM_BAT_LAI.has(s.su_kien) ? 0 : 1,
        su_kien: tu === s.luc ? [s.su_kien] : ["treo", s.su_kien],
        cat_boi_script_luc: null,
      };
      treoCuoi.delete(s.cong);
      dangMo.set(s.cong, moi);
      ra.push(moi);
      continue;
    }
    if (s.su_kien === "song_lai") {
      const k = dangMo.get(s.cong);
      if (!k) continue;
      k.den = s.luc;
      k.den_ca_bien = new Date(Date.parse(s.luc) + BIEN_SAU_MS).toISOString();
      k.su_kien.push("song_lai");
      dangMo.delete(s.cong);
      treoCuoi.delete(s.cong);
    }
    // het_nghi · telegram · dung_xong · dung_qua_lau: không đổi trạng thái khoảng
  }
  return ra;
}

/** Khoảng có chạm [tuLuc, denLuc] không (tính cả biên sau). Mốc null = không chặn phía đó */
export function khoangCham(k: KhoangBaoTri, tuLuc: string | null, denLuc: string | null): boolean {
  const cuoi = k.den_ca_bien ?? k.cat_boi_script_luc;
  if (tuLuc !== null && cuoi !== null && Date.parse(cuoi) < Date.parse(tuLuc)) return false;
  if (denLuc !== null && Date.parse(k.tu) > Date.parse(denLuc)) return false;
  return true;
}

/** Lấy cổng từ địa chỉ danh bạ ("http://127.0.0.1:3014" → 3014) */
export function congTuDiaChi(diaChi: string): number | null {
  try {
    const u = new URL(diaChi);
    if (u.port !== "") return Number(u.port);
    return u.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

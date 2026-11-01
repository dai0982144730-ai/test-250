// ============================================================
// BÁO CÁO THÁNG — CHUYỂN KHUÔN TRẢ LỜI CỦA TỪNG CÔNG CỤ  (file THUẦN — luật 10)
//
// Mr. Đại chốt 13/10/2026 (KE-HOACH/22): "Rà soát vì sao chưa có hay chưa cập nhật theo hệ thống
// hiện tại đã có nhiều thay đổi."
//
// ĐO 13/10: 126/152 lượt hỏi hỏng, 93 ô "agent CÓ trả lời mà ô vẫn —". Gốc: `bocBanGhi()` lấy
// "mảng vật thể đầu tiên gặp trong du_lieu" làm bản ghi rồi dò tên trường theo danh sách ĐOÁN —
// agent đổi khuôn là trượt hết mà không đỏ ở đâu.
//
// CÁCH MỚI: mỗi công cụ MỘT hàm đổi `du_lieu` THẬT thành bản ghi mang đúng tên `khoa` của cột trong
// `model.ts` (mục 5 KHAI). Công cụ chưa có hàm ở đây thì vẫn rơi về `bocBanGhi()` như cũ.
//
// Ba khoá đặc biệt của một bản ghi:
//   `__tong: true`  — số CỘNG của cả dự án, in ở HÀNG TÊN DỰ ÁN (luật 34)
//   `__dem: true`   — dòng đếm phần còn lại, in một hàng chữ
//   `__ly_do: {<khoa>: "…"}` — vì sao ô đó trống, câu cho NGƯỜI ĐỌC (không phải tên trường)
//
// Khuôn trả lời thật của từng công cụ ghi ở KE-HOACH/22 mục 8 — agent đổi khuôn thì sửa ĐÚNG hàm ở đây.
// CODE tính, không LLM: mọi câu chữ ở đây ghép từ số agent trả, không số nào tự nghĩ ra.
// ============================================================

import { daysBetween, fmtSo, khoangNgay } from "@/lib/format";
import { cauChamHe, chuNgay, CHU_THIEU_HE, TEN_DANG_LAP, TEN_HE } from "@/lib/chung/luat-nhanh-cham";

export type BanGhi = Record<string, unknown>;
type ThamSo = Record<string, string | number | boolean>;

export const DONG_TONG = "Toàn dự án";

function vt(v: unknown): v is BanGhi {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function mang(v: unknown): BanGhi[] {
  return Array.isArray(v) ? v.filter(vt) : [];
}
function so(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function chu(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function tron(n: number, soLe = 1): number {
  const k = 10 ** soLe;
  return Math.round(n * k) / k;
}

/** "2026-10-28" hoặc "2026-10-28T…" → "28/10/2026"; không phải ngày ISO thì trả nguyên văn */
export function ngayVn(iso: unknown): string {
  const s = chu(iso);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** đồng → tỷ đồng, giữ 3 số lẻ (1 triệu) — báo cáo tháng in tiền bằng tỷ */
export function tyDong(dong: unknown): number | null {
  const n = so(dong);
  return n === null ? null : Math.round(n / 1e6) / 1000;
}

// ─────────────────────────────────────────────────────────────
// Agent Tiến độ
// ─────────────────────────────────────────────────────────────

/**
 * `tiendo.tom_tat_du_an` → bảng 3 (ô Tiến độ) + bảng 4 (hàng dự án = % toàn dự án, các hàng = hạng mục cấp trên cùng).
 * Luật 35 + 36 (14/10/2026): BỎ cột «Lệch» (điểm %) — nhanh/chậm chỉ nói bằng NGÀY, ghi rõ hệ. % chỉ để nói khối lượng.
 */
function tomTatDuAn(d: BanGhi): BanGhi[] {
  const th = so(d.pctTotal);
  const kh = so(d.pctBaselineNgayCat);
  const cod = chu(d.cod_du_bao) || chu(d.cod);
  const mucTieu = chu(d.cod_muc_tieu) || chu(d.codMucTieu);
  const cham = so(d.cham_ngay_so_muc_tieu) ?? so(d.chamNgaySoMucTieu);
  // null = chưa có Baseline đã duyệt (agent Tiến độ không rơi về kế hoạch nội bộ)
  const chamBl = so(d.cham_ngay_so_baseline);
  const gangTre = so(d.so_viec_gang_dang_tre) ?? so(d.soViecGangDangTre);
  const ngayCat = chu(d.ngay_cat_du_lieu) || chu(d.ngayCatDuLieu);
  // Việc găng «dự báo chậm» agent Tiến độ so với Baseline ĐÃ DUYỆT; chưa duyệt thì tạm so với bảng đang lập — nói đúng tên
  const heGang = chamBl === null ? TEN_DANG_LAP : TEN_HE.baseline;

  // ⭐ 18/10/2026 (9d23288): hàng TỔNG bảng 4 VÀ câu «Hoàn thành X% (theo Baseline Y%)» ở bảng 3 dùng `tong_hang_muc` — CÙNG cơ sở
  // với các hàng hạng mục (mọi việc lá; HV 14,3% / 14,0%), thay pctTotal / pctBaselineNgayCat chỉ tính việc tới mốc COD
  // (HV 4,5% / 15,2%): một con số chỉ một nghĩa trong cùng báo cáo. Cổng cũ chưa có → số cũ.
  const tongHm = vt(d.tong_hang_muc) ? d.tong_hang_muc : null;
  const lyDoTongHm: BanGhi = tongHm && vt(tongHm.ly_do_chua_co) ? tongHm.ly_do_chua_co : {};
  const thTong = tongHm ? so(tongHm.pct_thuc_te) : th;
  const khTong = tongHm ? so(tongHm.pct_ke_hoach_baseline) : kh;

  const p: string[] = [];
  if (thTong !== null) p.push(`Hoàn thành ${fmtSo(thTong, 1)}%${khTong !== null ? ` (theo Baseline ${fmtSo(khTong, 1)}%)` : ""}`);
  if (cod) p.push(`COD dự báo ${ngayVn(cod)}`);
  if (mucTieu && cham !== null) p.push(`${cauChamHe(cham, "muc-tieu")} (${ngayVn(mucTieu)})`);
  else if (!mucTieu) p.push(CHU_THIEU_HE["muc-tieu"]);
  if (cod) p.push(cauChamHe(chamBl, "baseline"));
  if (gangTre !== null && gangTre > 0) p.push(`${fmtSo(gangTre)} việc găng dự báo chậm so với ${heGang}`);

  const lyDoKh = "Agent Tiến độ chưa tính được % khối lượng theo Baseline (dự án chưa khoá baseline hoặc chưa có báo cáo mang ngày).";
  const tong: BanGhi = {
    __tong: true,
    hang_muc: DONG_TONG,
    kh_luy_ke: khTong,
    th_luy_ke: thTong,
    cham_muc_tieu: mucTieu && cham !== null ? chuNgay(cham) : null,
    cham_baseline: chamBl !== null ? chuNgay(chamBl) : null,
    tinh_trang: ngayCat ? `số liệu đến ${ngayVn(ngayCat)}` : "chưa có báo cáo mang ngày",
    tien_do: p.join(" · "),
    __ly_do: {
      kh_luy_ke: chu(lyDoTongHm.pct_ke_hoach_baseline) || lyDoKh,
      th_luy_ke: chu(lyDoTongHm.pct_thuc_te) || "Agent Tiến độ chưa tính được % thực tế của dự án.",
      cham_muc_tieu: mucTieu ? "Agent Tiến độ chưa tính được COD dự báo." : "Dự án chưa có ngày Tiến độ mục tiêu.",
      cham_baseline: cod ? "Chưa có Baseline đã duyệt." : "Agent Tiến độ chưa tính được COD dự báo.",
    },
  };

  const tre = mang(d.viecGangDangTre).length > 0 ? mang(d.viecGangDangTre) : mang(d.viec_gang_dang_tre);
  /** «việc găng chậm nhất: 7.2.3 … — chậm 8 ngày so với Baseline» của một nhóm WBS cấp 1 */
  const gangChamNhat = (wbs: string): string => {
    const t = tre
      .filter((x) => chu(x.wbs) === wbs || chu(x.wbs).startsWith(`${wbs}.`))
      .map((x) => ({ x, ngay: so(x.treNgay) ?? so(x.so_ngay_tre) ?? 0 }))
      .sort((a, b) => b.ngay - a.ngay)[0];
    return t && t.ngay > 0 ? `việc găng chậm nhất: ${chu(t.x.wbs)} ${chu(t.x.ten)} — ${chuNgay(t.ngay)} so với ${heGang}` : "";
  };
  // ⭐ 18/10/2026 (9d23288): `hang_muc_cap_1[]` — MỌI nhóm WBS cấp 1 (HV 9 nhóm; pctNhom cũ chỉ 5 nhóm nối tới COD), mỗi
  // hàng có câu so với TỪNG hệ (agent Tiến độ ghi rõ hệ — luật 36). Cổng cũ chưa có → đọc pctNhom như trước.
  const cap1 = mang(d.hang_muc_cap_1);
  if (cap1.length > 0) {
    const hang = cap1.map((n): BanGhi => {
      const wbs = chu(n.wbs);
      const ly: BanGhi = vt(n.ly_do_chua_co) ? n.ly_do_chua_co : {};
      const soViec = so(n.so_viec_la);
      const ghi = [soViec !== null ? `${fmtSo(soViec)} việc` : "", gangChamNhat(wbs)].filter((x) => x !== "");
      return {
        hang_muc: chu(n.ma_va_ten) || `${wbs} ${chu(n.ten)}`.trim(),
        kh_luy_ke: so(n.pct_ke_hoach_baseline),
        th_luy_ke: so(n.pct_thuc_te),
        cham_muc_tieu: chu(n.cau_so_muc_tieu) || null,
        cham_baseline: chu(n.cau_so_baseline) || null,
        tinh_trang: ghi.join(" · "),
        __ly_do: {
          kh_luy_ke: chu(ly.pct_ke_hoach_baseline) || "Agent Tiến độ chưa trả % khối lượng theo Baseline của hạng mục.",
          th_luy_ke: chu(ly.pct_thuc_te) || "Agent Tiến độ chưa trả % thực tế của hạng mục.",
          cham_muc_tieu: "Agent Tiến độ chưa đánh giá được hạng mục này so với Tiến độ mục tiêu.",
          cham_baseline: "Agent Tiến độ chưa đánh giá được hạng mục này so với Baseline.",
        },
      };
    });
    return [tong, ...hang];
  }
  const nhom = mang(d.pctNhom).map((n): BanGhi => {
    const wbs = chu(n.wbs);
    const khN = so(n.pctBaseline);
    const thN = so(n.pct);
    const treNhom = tre
      .filter((t) => chu(t.wbs) === wbs || chu(t.wbs).startsWith(`${wbs}.`))
      .map((t) => ({ t, ngay: so(t.treNgay) ?? so(t.so_ngay_tre) ?? 0 }))
      .sort((a, b) => b.ngay - a.ngay);
    const ghi: string[] = [];
    const soViec = so(n.soViec);
    if (soViec !== null) ghi.push(`${fmtSo(soViec)} việc`);
    if (treNhom.length > 0 && treNhom[0].ngay > 0) {
      ghi.push(
        `việc găng chậm nhất: ${chu(treNhom[0].t.wbs)} ${chu(treNhom[0].t.ten)} — ${chuNgay(treNhom[0].ngay)} so với ${heGang}`,
      );
    }
    return {
      hang_muc: `${wbs} ${chu(n.ten)}`.trim(),
      kh_luy_ke: khN,
      th_luy_ke: thN,
      cham_muc_tieu: null,
      cham_baseline: null,
      tinh_trang: ghi.join(" · "),
      __ly_do: {
        kh_luy_ke: "Agent Tiến độ chưa trả % khối lượng theo Baseline của hạng mục.",
        cham_muc_tieu: "Agent Tiến độ chỉ tính số ngày chậm cho COD cả dự án, chưa tính theo từng hạng mục.",
        cham_baseline: "Agent Tiến độ chỉ tính số ngày chậm cho COD cả dự án, chưa tính theo từng hạng mục — xem việc găng chậm nhất ở cột Ghi chú.",
      },
    };
  });
  return [tong, ...nhom];
}

/**
 * `tiendo.khoi_luong_hang_muc` → bảng 5.
 * ⭐ 18/10/2026 (9d23288): mỗi dòng có `kl_thiet_ke` · `phan_tram_dat` · `kh_thang_sau` (agent Tiến độ tính — Main không tính lại),
 * ô null kèm câu `ly_do_chua_co`. Cấp trên có `thang_sau` {tu, den, so_ngay} → hàng dự án nói KH tháng sau là khoảng nào (luật 31).
 */
function khoiLuongHangMuc(d: BanGhi): BanGhi[] {
  const dong = mang(d.dong).map((x): BanGhi => {
    const ngay = chu(x.ngay_luy_ke);
    const ly: BanGhi = vt(x.ly_do_chua_co) ? x.ly_do_chua_co : {};
    return {
      hang_muc: `${chu(x.ma_wbs)} ${chu(x.ten)}`.trim(),
      nha_thau: [chu(x.ma_thau_phu), chu(x.thau_phu)].filter((s) => s !== "").join(" "),
      dvt: chu(x.don_vi),
      kl_thiet_ke: so(x.kl_thiet_ke),
      kl_trong_ky: so(x.kl_trong_ky),
      th_luy_ke: so(x.kl_luy_ke),
      kh_thang_sau: so(x.kh_thang_sau),
      phan_tram_dat: so(x.phan_tram_dat),
      ghi_chu: ngay ? `lũy kế đến ${ngayVn(ngay)}` : "",
      __ly_do: {
        kl_thiet_ke: chu(ly.kl_thiet_ke) || "Agent Tiến độ chưa trả khối lượng thiết kế của hạng mục.",
        kh_thang_sau: chu(ly.kh_thang_sau) || "Agent Tiến độ chưa trả kế hoạch khối lượng tháng sau.",
        phan_tram_dat: chu(ly.phan_tram_dat) || "Chưa có khối lượng thiết kế nên chưa tính được % đạt.",
      },
    };
  });
  const ts = vt(d.thang_sau) ? d.thang_sau : null;
  if (!ts || !chu(ts.tu) || !chu(ts.den) || dong.length === 0) return dong;
  return [
    {
      __tong: true,
      hang_muc: DONG_TONG,
      ghi_chu: `KH tháng sau: ${khoangNgay(chu(ts.tu), chu(ts.den))} — khối lượng thiết kế rải đều theo ngày trên khoảng Baseline đã duyệt của từng việc`,
    },
    ...dong,
  ];
}

/** `tiendo.nguon_luc_huy_dong` → bảng 9 (cột thực tế) */
function nguonLucHuyDong(d: BanGhi): BanGhi[] {
  return mang(d.dong).map(
    (x): BanGhi => ({
      nha_thau: [chu(x.ma_thau_phu), chu(x.thau_phu)].filter((s) => s !== "").join(" "),
      nhan_luc_thuc_te: so(x.nhan_cong_binh_quan),
      thiet_bi_thuc_te: so(x.may_chinh_binh_quan),
    }),
  );
}

/** Tháng LIỀN SAU kỳ báo cáo, tính từ `den_ngay` (ISO) của tham số hỏi */
export function thangToi(denNgayKy: unknown): { tu: string; den: string } | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(chu(denNgayKy));
  if (!m) return null;
  let nam = Number(m[1]);
  let thang = Number(m[2]) + 1;
  if (thang > 12) {
    thang = 1;
    nam += 1;
  }
  const hai = (n: number) => String(n).padStart(2, "0");
  const cuoi = new Date(Date.UTC(nam, thang, 0)).getUTCDate();
  return { tu: `${nam}-${hai(thang)}-01`, den: `${nam}-${hai(thang)}-${hai(cuoi)}` };
}

/**
 * `tiendo.duong_gang` → bảng 11: việc GĂNG chưa xong có thời gian làm chạm vào THÁNG TỚI
 * (bắt đầu ≤ cuối tháng tới VÀ ngày xong dự báo ≥ đầu tháng tới).
 */
function viecGangThangToi(d: BanGhi, ts: ThamSo): BanGhi[] {
  const k = thangToi(ts.den_ngay);
  if (!k) return [];
  const ra: BanGhi[] = [];
  for (const x of mang(d.chuoi_gang)) {
    const pct = so(x.pct) ?? 0;
    if (pct >= 100) continue;
    const batDau = chu(x.batDau) || chu(x.bat_dau);
    const xong = chu(x.du_bao_xong) || chu(x.ketThuc) || chu(x.ket_thuc);
    if (!batDau || !xong || batDau > k.den || xong < k.tu) continue;
    // Luật 35 + 36 (14/10/2026): số ngày dự báo chậm so với Baseline ĐÃ DUYỆT = du_bao_xong − baseline_xong (ghi rõ hệ).
    // Chưa duyệt Baseline thì nói thẳng, không lấy «kế hoạch» không tên làm hệ so sánh.
    const blXong = chu(x.baseline_xong);
    const duBao = chu(x.du_bao_xong);
    const ghi: string[] = [];
    if (blXong && duBao) {
      const n = daysBetween(blXong.slice(0, 10), duBao.slice(0, 10));
      if (n !== 0) ghi.push(`dự báo xong ${chuNgay(n)} so với Baseline (${ngayVn(blXong)})`);
    } else if (!blXong && (so(x.tre_so_ke_hoach) ?? so(x.so_ngay_tre) ?? 0) > 0) {
      ghi.push(CHU_THIEU_HE.baseline);
    }
    if (pct > 0) ghi.push(`đã làm ${fmtSo(pct, 1)}%`);
    ra.push({
      ...(chu(x.wbs) ? { __khoa_dong: `wbs:${chu(x.wbs)}` } : {}),
      cong_viec: `${chu(x.wbs)} ${chu(x.ten)}`.trim(),
      loai_viec: "Việc găng",
      nguoi_phu_trach: chu(x.nhaThau) || chu(x.nha_thau),
      han_ht: ngayVn(xong),
      ghi_chu: ghi.join(" · "),
    });
  }
  return ra;
}

/** Ngày nào của việc rơi vào tháng tới — chữ cho cột Ghi chú */
const NHAN_ROI_VAO: Record<string, string> = {
  bat_dau_du_bao: "bắt đầu (dự báo)",
  xong_du_bao: "xong (dự báo)",
  bat_dau_baseline: "bắt đầu theo Baseline",
  xong_baseline: "xong theo Baseline",
};

/**
 * ⭐ 18/10/2026 — `tiendo.viec_trong_khoang` (9d23288, tham số tháng tới) → bảng 11 phần MỐC TIẾN ĐỘ: việc / mốc có ngày bắt đầu
 * hoặc xong (dự báo hoặc Baseline) rơi vào tháng tới. Bỏ việc đã xong. Khoá dòng = mã WBS → việc găng `tiendo.duong_gang` cũng
 * trả thì gộp MỘT dòng (không lặp). Việc của agent Công việc là bản ghi khác (việc giao người) — dòng riêng, khoá mã việc.
 */
function viecTrongKhoang(d: BanGhi): BanGhi[] {
  return mang(d.viec)
    .filter((x) => x.da_xong !== true)
    .map((x): BanGhi => {
      const wbs = chu(x.ma_wbs);
      const pct = so(x.pct_thuc_te) ?? 0;
      const roi = (Array.isArray(x.roi_vao) ? x.roi_vao : []).map((r) => NHAN_ROI_VAO[chu(r)] ?? "").filter((t) => t !== "");
      const ghi = [
        roi.length > 0 ? `tháng tới: ${roi.join(", ")}` : "",
        chu(x.cau_so_baseline),
        pct > 0 ? `đã làm ${fmtSo(pct, 1)}%` : "",
      ].filter((t) => t !== "");
      const xong = chu(x.du_bao_xong) || chu(x.baseline_xong);
      return {
        ...(wbs ? { __khoa_dong: `wbs:${wbs}` } : {}),
        cong_viec: chu(x.ma_va_ten) || `${wbs} ${chu(x.ten)}`.trim(),
        loai_viec: x.tren_duong_gang === true ? "Việc găng" : x.la_moc === true ? "Mốc tiến độ" : "Việc theo tiến độ",
        nguoi_phu_trach: chu(x.nha_thau),
        han_ht: ngayVn(xong),
        ghi_chu: ghi.join(" · "),
        __ly_do: { han_ht: "Agent Tiến độ chưa có ngày xong dự báo của việc này." },
      };
    });
}

/** `tiendo.lich_su_du_bao` → khối ◆ xu thế: mỗi THÁNG một điểm = lần dự báo CUỐI của tháng, tối đa 6 tháng */
function lichSuDuBao(d: BanGhi): BanGhi[] {
  const cuoiThang = new Map<string, { luc: string; cod: string }>();
  for (const m of mang(d.moc)) {
    const luc = chu(m.thoi_diem);
    const cod = chu(m.cod_du_bao);
    if (!/^\d{4}-\d{2}/.test(luc) || !/^\d{4}-\d{2}-\d{2}/.test(cod)) continue;
    const thang = luc.slice(0, 7);
    const cu = cuoiThang.get(thang);
    if (!cu || luc > cu.luc) cuoiThang.set(thang, { luc, cod: cod.slice(0, 10) });
  }
  const ds = Array.from(cuoiThang.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);
  if (ds.length === 0) return [];
  const goc = Date.parse(`${ds[0][1].cod}T00:00:00Z`);
  return ds.map(([thang, v]): BanGhi => {
    const lui = Math.round((Date.parse(`${v.cod}T00:00:00Z`) - goc) / 86400000);
    return {
      nhan: `T${thang.slice(5, 7)}/${thang.slice(0, 4)}`,
      gia_tri: lui,
      chu: `COD dự báo ${ngayVn(v.cod)}`,
    };
  });
}

/** `tiendo.san_luong_hop_dong` → bảng 8 (hai cột sản lượng) */
function sanLuongHopDong(d: BanGhi, ts: ThamSo): BanGhi[] {
  const viTri = mang(d.thang).findIndex((t) => chu(t.thang) === chu(ts.ky));
  const cuaThang = (v: unknown): number | null =>
    viTri >= 0 && Array.isArray(v) ? tyDong((v as unknown[])[viTri]) : null;
  const lyDoThang = viTri < 0 ? "Agent Tiến độ chưa có sản lượng của tháng báo cáo này." : "";
  const dong = (x: BanGhi, khoa: string, tong: boolean): BanGhi => ({
    ...(tong ? { __tong: true } : {}),
    hop_dong: khoa,
    san_luong_thang: cuaThang(x.thang),
    san_luong_luy_ke: tyDong(x.luy_ke),
    __ly_do: lyDoThang ? { san_luong_thang: lyDoThang } : {},
  });
  const ra = mang(d.hop_dong).map((x) => dong(x, chu(x.ma), false));
  if (vt(d.tong_du_an)) ra.unshift(dong(d.tong_du_an, DONG_TONG, true));
  return ra;
}

// ─────────────────────────────────────────────────────────────
// Agent Công việc (mã `base` trong Danh bạ)
// ─────────────────────────────────────────────────────────────

/** Tên việc mang sẵn "[Tên dự án] …" ở đầu — bảng đã có hàng tên dự án nên bỏ, khỏi lặp */
function congViecKemMa(x: BanGhi): string {
  const ten = chu(x.ten).replace(/^\[[^\]]*\]\s*/, "");
  // Mr. Đại chốt 27/10 (BD-4): báo cáo THÁNG / TUẦN KHÔNG áp luật «không ghi mã» (chỉ báo cáo sáng) → giữ «mã + tên» (luật 30).
  // Trả lại như trước đợt 2 (7849298 đã bỏ mã — sai chốt)
  return `${chu(x.ma_viec_base)} ${chu(x.ten_gon) || ten}`.trim();
}

/** Khoá dòng bảng 11 = MÃ VIỆC (18/10/2026): hai công cụ agent Công việc trả cùng một việc thì gộp một dòng */
function khoaViec(x: BanGhi): BanGhi {
  const ma = chu(x.ma_viec_base);
  return ma !== "" ? { __khoa_dong: `viec:${ma}` } : {};
}

/** `base.viec_qua_han` → bảng 11: việc quá hạn còn mở phải xử lý trong tháng tới */
function viecQuaHan(d: BanGhi): BanGhi[] {
  return mang(d.viec).map((x): BanGhi => {
    const qua = so(x.qua_han_ngay);
    return {
      ...khoaViec(x),
      cong_viec: congViecKemMa(x),
      loai_viec: "Việc quá hạn còn mở",
      nguoi_phu_trach: chu(x.ten_nguoi_phu_trach) || chu(x.nguoi_phu_trach),
      han_ht: ngayVn(x.han),
      ghi_chu: qua !== null && qua > 0 ? `quá hạn ${fmtSo(qua)} ngày` : "",
    };
  });
}

/**
 * ⭐ 18/10/2026 — `base.viec_co_han_trong_khoang` (agent Công việc 180c198) → bảng 11: việc có hạn trong THÁNG TỚI
 * (tham số `tu_ngay` · `den_ngay` = tháng tới, model.ts `khoangThangToi`). Cùng bảng với `base.viec_qua_han` (việc quá hạn
 * từ trước còn mở) — gộp, bỏ trùng theo mã việc. Ghi chú = chữ trạng thái agent Công việc viết (`trang_thai_chu`).
 */
function viecCoHanTrongKhoang(d: BanGhi): BanGhi[] {
  return mang(d.viec).map((x): BanGhi => {
    const qua = so(x.qua_han_ngay);
    const ghi = [chu(x.trang_thai_chu), qua !== null && qua > 0 ? `quá hạn ${fmtSo(qua)} ngày` : ""].filter((t) => t !== "");
    return {
      ...khoaViec(x),
      cong_viec: congViecKemMa(x),
      loai_viec: "Việc có hạn trong tháng tới",
      nguoi_phu_trach: chu(x.ten_nguoi_phu_trach) || chu(x.nguoi_phu_trach),
      han_ht: ngayVn(x.han),
      ghi_chu: ghi.join(" · "),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Agent Pháp lý
// ─────────────────────────────────────────────────────────────

/** 11 giai đoạn hồ sơ của agent Pháp lý (`enums-phap-ly.ts`) → chữ cho cột Loại */
const NHAN_GIAI_DOAN: Record<string, string> = {
  chuan_bi_dau_tu: "Chuẩn bị đầu tư",
  phap_ly_chu_truong: "Pháp lý – chủ trương",
  dat_dai_gpmb: "Đất đai – GPMB",
  moi_truong_giay_phep: "Môi trường – giấy phép",
  thoa_thuan_ky_thuat: "Thoả thuận kỹ thuật",
  thiet_ke_tham_dinh: "Thiết kế – thẩm định",
  dau_thau_hop_dong: "Đấu thầu – hợp đồng",
  thi_cong_giam_sat: "Thi công – giám sát",
  tai_chinh_quyet_toan: "Tài chính – quyết toán",
  nghiem_thu_ban_giao: "Nghiệm thu – bàn giao",
  van_hanh_cod: "Vận hành – COD",
};

/** Trạng thái ĐO của bộ dò hồ sơ (`TRANG_THAI_PHAT_HIEN`) → chữ cho người đọc */
const NHAN_TRANG_THAI_DO: Record<string, string> = {
  chua_thay: "Chưa thấy văn bản kết quả",
  nghi_ngo: "Có văn bản nghi khớp — chờ người xác nhận",
  nguoi_bac_bo: "Văn bản tìm được không đúng — vẫn thiếu",
  chua_do: "Chưa dò",
};

/** Chữ cho bốn giá trị `trang_thai_nop` (Pháp lý b5898b6) khi agent không gửi kèm `trang_thai_nop_chu` */
const NHAN_TRANG_THAI_NOP: Record<string, string> = {
  chua_nop: "chưa nộp",
  da_nop_cho_ket_qua: "đã nộp chờ kết quả",
  da_co_ket_qua: "đã có kết quả",
  chua_ro: "chưa rõ",
};

/**
 * `phaply.ho_so_thieu` → bảng 6 (dự án chuẩn bị đầu tư) và bảng 7 (các dự án còn lại).
 * ⭐ 18/10/2026: Main gửi `theo_ket_qua: true` — mỗi hồ sơ có `trang_thai_nop` (chua_nop · da_nop_cho_ket_qua · da_co_ket_qua ·
 * chua_ro) → cột Trạng thái tách 🔴 / 🟡 (model.ts docTrangThaiHoSo). Đầu `du_lieu` có `dem_trang_thai_nop` → hàng tổng.
 * Pháp lý bản cũ chưa có trường này → in trạng thái ĐO như trước 18/10.
 */
function hoSoThieu(d: BanGhi): BanGhi[] {
  const ds = mang(d.ho_so_thieu)
    .map((h) => ({ h, qua: so(h.so_ngay_qua_han) ?? -1 }))
    .sort((a, b) => b.qua - a.qua);
  const thieu = so(d.so_thieu);
  const phaiCo = so(d.tong_ho_so_phai_co);
  const dem = vt(d.dem_trang_thai_nop) ? d.dem_trang_thai_nop : null;
  const chuDem = dem
    ? Object.keys(NHAN_TRANG_THAI_NOP)
        .map((k) => ({ k, n: so(dem[k]) }))
        .filter((x) => x.n !== null && x.n > 0)
        .map((x) => `${NHAN_TRANG_THAI_NOP[x.k]} ${fmtSo(x.n!)}`)
        .join(" · ")
    : "";
  const tong: BanGhi = {
    __tong: true,
    ho_so: DONG_TONG,
    ghi_chu:
      thieu !== null && phaiCo !== null
        ? `Thiếu ${fmtSo(thieu)}/${fmtSo(phaiCo)} hồ sơ phải có` +
          (chuDem ? ` (${chuDem})` : "") +
          (ds.length > 0 && ds.length < thieu ? ` — in ${fmtSo(ds.length)} hồ sơ gấp nhất` : "")
        : "",
  };
  const dong = ds.map(({ h, qua }): BanGhi => {
    const conLai = so(h.con_lai_bao_nhieu_ngay);
    const ghi: string[] = [];
    if (qua > 0) ghi.push(`quá hạn ${fmtSo(qua)} ngày`);
    else if (conLai !== null) ghi.push(`còn ${fmtSo(conLai)} ngày`);
    else if (chu(h.ly_do_khong_tinh_duoc_han)) ghi.push("chưa tính được hạn");
    if (chu(h.co_quan_dang_giu)) ghi.push(`nơi giữ: ${chu(h.co_quan_dang_giu)}`);
    const gd = chu(h.giai_doan);
    const tt = chu(h.trang_thai_do);
    // 18/10/2026: trạng thái NỘP (theo_ket_qua) thắng trạng thái ĐO; kèm ngày nộp và lý do khi «chưa rõ»
    const nop = chu(h.trang_thai_nop);
    if (nop !== "" && chu(h.ngay_nop)) ghi.push(`nộp ngày ${ngayVn(h.ngay_nop)}`);
    if (nop === "chua_ro" && chu(h.ly_do_trang_thai_nop)) ghi.push(chu(h.ly_do_trang_thai_nop));
    return {
      ho_so: `${chu(h.ma_ho_so)} ${chu(h.ten)}`.trim(),
      loai: NHAN_GIAI_DOAN[gd] ?? gd,
      han_baseline: ngayVn(h.han),
      trang_thai: nop !== "" ? nop : tt,
      trang_thai_chu: nop !== "" ? chu(h.trang_thai_nop_chu) || NHAN_TRANG_THAI_NOP[nop] || "" : (NHAN_TRANG_THAI_DO[tt] ?? ""),
      ghi_chu: ghi.join(" · "),
      __ly_do: { han_baseline: chu(h.ly_do_khong_tinh_duoc_han) || "Agent Pháp lý chưa tính được hạn của hồ sơ này." },
    };
  });
  return [tong, ...dong];
}

// ─────────────────────────────────────────────────────────────
// Agent Hợp đồng
// ─────────────────────────────────────────────────────────────

/**
 * Câu cảnh báo của MỘT hợp đồng trong `canh_bao` — agent Hợp đồng viết «<mã> <tên>: …» (vênh giá trị phiếu ↔ hợp đồng, nạp trùng…).
 * Trả phần sau dấu «:» để in vào Ghi chú của đúng dòng hợp đồng đó.
 */
function canhBaoCuaHopDong(canhBao: readonly string[], ma: string, ten: string): string[] {
  if (ma === "") return [];
  const dau = ten ? `${ma} ${ten}:` : `${ma} `;
  return canhBao.filter((c) => c.startsWith(dau) || c.startsWith(`${ma}:`)).map((c) => c.slice(c.indexOf(":") + 1).trim());
}

/**
 * `hopdong.chi_phi_theo_hop_dong` → bảng 8: mỗi hợp đồng một dòng, khoá = MÃ hợp đồng (ghép được với Tiến độ).
 * ⭐ 18/10/2026 (agent Hợp đồng debb181): `gia_tri_hop_dong` nay có cả số máy bóc từ chữ hợp đồng; `da_thanh_toan` = lũy kế phiếu
 * mới nhất đã được Giám đốc dự án ký (luật «ký = đã thanh toán» — chưa phải chứng từ chi tiền); ô trống mang câu `vi_sao_…`;
 * câu cảnh báo của từng hợp đồng trong `canh_bao` (vênh giá trị…) vào cột Ghi chú.
 */
function chiPhiTheoHopDong(d: BanGhi, _ts: ThamSo, canhBao: readonly string[] = []): BanGhi[] {
  let tongGiaTri = 0;
  let coGiaTri = false;
  let tongPhieu = 0;
  let coPhieu = false;
  let tongTt = 0;
  let coTt = false;
  const dong = mang(d.hop_dong).map((x): BanGhi => {
    const giaTri = so(x.gia_tri_hop_dong);
    const luyKe = so(x.chi_phi_luy_ke);
    const daTt = so(x.da_thanh_toan);
    if (giaTri !== null) {
      tongGiaTri += giaTri;
      coGiaTri = true;
    }
    if (luyKe !== null) {
      tongPhieu += luyKe;
      coPhieu = true;
    }
    if (daTt !== null) {
      tongTt += daTt;
      coTt = true;
    }
    const ten = chu(x.ten);
    const soHieu = chu(x.so_hieu);
    return {
      hop_dong: chu(x.ma),
      nha_thau: `${chu(x.nha_thau)}${ten ? ` — ${ten}` : ""}${soHieu ? ` (${soHieu})` : ""}`.trim(),
      gia_tri_hd: tyDong(giaTri),
      da_thanh_toan_lk: tyDong(luyKe),
      da_thanh_toan: tyDong(daTt),
      phan_tram_hd: giaTri !== null && giaTri > 0 && luyKe !== null ? tron((luyKe / giaTri) * 100) : null,
      ghi_chu: canhBaoCuaHopDong(canhBao, chu(x.ma), ten).join(" · "),
      __ly_do: {
        gia_tri_hd: chu(x.vi_sao_chua_co_gia_tri_hop_dong) || "Agent Hợp đồng chưa có giá trị của hợp đồng này.",
        da_thanh_toan: chu(x.vi_sao_chua_co_da_thanh_toan) || "Agent Hợp đồng chưa có số đã thanh toán (chưa phiếu giá nào được Giám đốc dự án ký).",
        ghi_chu: "Agent Hợp đồng không có cảnh báo nào cho hợp đồng này.",
        da_thanh_toan_lk: chu(x.vi_sao_chua_co)
          ? `Chưa có số lũy kế phiếu giá: ${chu(x.vi_sao_chua_co)}.`
          : "Chưa có số lũy kế phiếu giá.",
        phan_tram_hd: "Thiếu giá trị hợp đồng hoặc lũy kế phiếu giá nên chưa tính được %.",
      },
    };
  });
  if (dong.length === 0) return [];
  const tong: BanGhi = {
    __tong: true,
    hop_dong: DONG_TONG,
    nha_thau: `${fmtSo(dong.length)} hợp đồng`,
    gia_tri_hd: coGiaTri ? tyDong(tongGiaTri) : null,
    da_thanh_toan_lk: coPhieu ? tyDong(tongPhieu) : null,
    da_thanh_toan: coTt ? tyDong(tongTt) : null,
    phan_tram_hd: coGiaTri && coPhieu && tongGiaTri > 0 ? tron((tongPhieu / tongGiaTri) * 100) : null,
  };
  return [tong, ...dong];
}

/**
 * ⭐ 18/10/2026 (agent Hợp đồng bcdf19c) — `hopdong.cam_ket_nha_thau` hỏi theo dự án → bảng 9: đọc mảng `hop_dong[]` (MỌI hợp đồng
 * của dự án — N3A: HD-548 + HD-TVGS-15; các trường cũ chỉ là hợp đồng đầu). Khoá dòng = tên nhà thầu (ghép với số thực tế
 * `tiendo.nguon_luc_huy_dong`). `co_so: false` → ô cam kết trống mang câu `ly_do_chua_co`.
 * Cổng cũ chưa có mảng → `null`, bên gọi rơi về bộ bóc chung như trước.
 */
function camKetNhaThau(d: BanGhi): BanGhi[] | null {
  if (!Array.isArray(d.hop_dong)) return null;
  return mang(d.hop_dong).map((x): BanGhi => {
    const coSo = x.co_so === true;
    const lyDo = chu(x.ly_do_chua_co) || "Agent Hợp đồng chưa bóc được cam kết nhân lực, thiết bị của hợp đồng này.";
    const ma = chu(x.ma_hop_dong);
    return {
      nha_thau: chu(x.nha_thau) || `${ma} ${chu(x.ten)}`.trim(),
      nhan_luc_cam_ket: coSo ? so(x.tong_nhan_cong) : null,
      thiet_bi_cam_ket: coSo ? so(x.tong_may) : null,
      __ly_do: {
        nhan_luc_cam_ket: coSo ? `Hợp đồng ${ma} không ghi số người cam kết.` : `${ma}: ${lyDo}`,
        thiet_bi_cam_ket: coSo ? `Hợp đồng ${ma} không ghi số máy cam kết.` : `${ma}: ${lyDo}`,
      },
    };
  });
}

function nhanKhau(khau: string): string {
  const BANG: Record<string, string> = {
    "cho-dua-vao-ho-so": "chờ đưa vào hồ sơ",
    "cho-soat": "chờ soát",
    "cho-ky": "chờ ký",
  };
  return BANG[khau] ?? khau.replace(/-/g, " ");
}

/** `hopdong.phieu_gia_dang_cho` → bảng 8: gom phiếu giá đang chờ theo hợp đồng — số phiếu · phiếu chờ lâu nhất đang ở khâu nào */
function phieuGiaDangCho(d: BanGhi): BanGhi[] {
  const theoHd = new Map<string, BanGhi[]>();
  for (const p of mang(d.phieu_gia)) {
    const hd = chu(p.ma_hop_dong);
    if (hd === "") continue;
    theoHd.set(hd, [...(theoHd.get(hd) ?? []), p]);
  }
  let tongPhieu = 0;
  let lauNhat = -1;
  const dong: BanGhi[] = [];
  for (const [hd, ds] of Array.from(theoHd.entries())) {
    const xep = ds.slice().sort((a, b) => (so(b.so_ngay_cho) ?? 0) - (so(a.so_ngay_cho) ?? 0));
    const dau = xep[0];
    const cho = so(dau.so_ngay_cho);
    tongPhieu += ds.length;
    if (cho !== null && cho > lauNhat) lauNhat = cho;
    const vuong = chu(dau.vuong);
    dong.push({
      hop_dong: hd,
      phieu_gia_cho_duyet: ds.length,
      so_ngay_cho: cho,
      dang_o_ban: `${chu(dau.ma_phieu_gia)}: ${nhanKhau(chu(dau.khau))}${vuong ? ` — ${vuong}` : ""}`,
    });
  }
  if (dong.length === 0) return [];
  return [{ __tong: true, hop_dong: DONG_TONG, phieu_gia_cho_duyet: tongPhieu, so_ngay_cho: lauNhat >= 0 ? lauNhat : null }, ...dong];
}

// ─────────────────────────────────────────────────────────────
// Cửa chung
// ─────────────────────────────────────────────────────────────

/** `null` = hàm không đọc được khuôn này (cổng cũ) → bên gọi rơi về `bocBanGhi()` */
const BO_CHUYEN: Record<string, (d: BanGhi, ts: ThamSo, canhBao: readonly string[]) => BanGhi[] | null> = {
  "tiendo.tom_tat_du_an": tomTatDuAn,
  "tiendo.khoi_luong_hang_muc": khoiLuongHangMuc,
  "tiendo.nguon_luc_huy_dong": nguonLucHuyDong,
  "tiendo.duong_gang": viecGangThangToi,
  "tiendo.viec_trong_khoang": viecTrongKhoang,
  "tiendo.lich_su_du_bao": lichSuDuBao,
  "tiendo.san_luong_hop_dong": sanLuongHopDong,
  "base.viec_qua_han": viecQuaHan,
  "base.viec_co_han_trong_khoang": viecCoHanTrongKhoang,
  "phaply.ho_so_thieu": hoSoThieu,
  "hopdong.chi_phi_theo_hop_dong": chiPhiTheoHopDong,
  "hopdong.cam_ket_nha_thau": camKetNhaThau,
  "hopdong.phieu_gia_dang_cho": phieuGiaDangCho,
};

/** Công cụ này đã có hàm chuyển khuôn riêng chưa */
export function coBoChuyen(congCu: string): boolean {
  return congCu in BO_CHUYEN;
}

/**
 * Đổi `du_lieu` thật của một công cụ thành bản ghi theo đúng khoá cột của báo cáo tháng.
 * `null` = công cụ chưa có hàm riêng HOẶC `du_lieu` không phải vật thể — bên gọi rơi về `bocBanGhi()`.
 * Mảng rỗng = agent trả lời hợp lệ nhưng không có dòng nào cho bảng này.
 */
export function chuyenKhuon(congCu: string, duLieu: unknown, thamSo: ThamSo, canhBao: readonly string[] = []): BanGhi[] | null {
  const ham = BO_CHUYEN[congCu];
  if (!ham || !vt(duLieu)) return null;
  return ham(duLieu, thamSo, canhBao);
}

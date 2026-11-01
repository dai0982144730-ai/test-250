// ============================================================
// cay-viec/issue/sinh.ts — BỘ SINH ISSUE của agent Công việc: 4 luật (chép lib/canh-bao/sinh-base.ts + xong-tren-giay.ts +
// lib/gang/nut-gang.ts của agent Base — Mr. Đại chốt 03/10/2026: Y HỆT luật, chỉ khác NGUỒN VIỆC).
//   Base:      việc trên Base.vn (không gian Wework, khoá API)
//   Công việc: việc trong SỔ CÁI của chính agent này (docflow.cong_viec — sinh từ báo cáo tuần + giao tay), mã WBS ở
//              docflow.wbs_viec — CHỈ dòng ĐÃ DUYỆT (Mr. Đại chốt 03/10; Base tính cả việc "ai_gan" chưa soát)
//
//   ⭕ Luật 3 — đầu việc LÁ trên đường găng, ĐẾN LÚC GIAO (bắt đầu ≤ hôm nay + cửa sổ N ngày — Mr. Đại chốt 04/10, Cài đặt › Gắn việc vào WBS), chưa xong, không trong sổ "không cần giao", và sổ việc KHÔNG có
//      việc nào gắn mã đó ĐÃ DUYỆT (kể cả việc đã xong — đã từng có người làm thì không tính; việc 🤖 chờ duyệt KHÔNG tính)
//      → 🔴 ngay, không ngưỡng ngày.
//   ⏰ Luật 1 — việc đang mở, quá hạn ≥ N ngày VÀ gắn được mã WBS. GỘP THEO NGƯỜI CHỦ TRÌ (một thẻ mỗi người + một thẻ
//      "chưa giao cho ai"); đỏ khi có việc trên găng.
//   🧱 Luật 2 — Base đọc đề xuất Base Request; agent Công việc KHÔNG có luồng đề xuất (Mr. Đại chốt: trả "chưa có dữ liệu")
//      → 0 thẻ, ghi chú nói thẳng. Không bịa.
//   📄 Luật 4 — "xong trên giấy": việc HOÀN THÀNH gắn mã mà agent Tiến độ trả % = 0/null VÀ trong ±K ngày quanh ngày xong không
//      có BC ngày nào ghi khối lượng mã đó (tiendo.khoi_luong_hang_muc). GỘP THEO NGƯỜI, đỏ nếu có mã găng. Chiều ngược: WBS
//      100% mà việc còn mở → vàng "nhắc đóng việc".
// Thước = ảnh hưởng COD — HỎI agent Tiến độ (so_ngay_tre của mắt xích găng), KHÔNG tự ước; không có số → "chưa lấy được".
// Mọi thẻ do CODE dựng, không LLM. File THUẦN — hàm hỏi BC ngày tiêm vào (test offline).
// ============================================================
import { khoangNgay } from "@/lib/phong/tuan";
import { fmtSo } from "@/lib/format";
import { locGangDenNgay, locNutGangChuaAiNhan, tapMaCoCon, type DauViecCay, type ViecCay } from "@/lib/cay-viec/thuan";
import { maWbsLienQuan, type DauViecNho, type TheCanhBao } from "./model";
import type { NhacDong } from "./nhac-dong";

/** Việc sổ cái của màn + ngày hoàn thành (luật 4) */
export interface ViecIssue extends ViecCay {
  /** yyyy-mm-dd — ngày việc được đánh dấu hoàn thành (cong_viec.dong_luc, giờ VN). null = chưa xong */
  ngayXong: string | null;
}

export interface MatXichGang {
  wbs: string;
  so_ngay_tre?: number;
}

export interface DoDuocIssue {
  gangDenNgay: number;
  gangKhongViec: number;
  viecGanMaQuaHan: number;
  deXuatTac: number;
  viecXongGanMa: number;
  ungVienXongGiay: number;
  xongTrenGiay: number;
  maDaHoiBcNgay: number;
  maNgoaiVungPhu: number;
  viecNgoaiVungPhu: number;
  wbsXongViecConMo: number;
}

export interface DauVaoSinh {
  homNay: string;
  /** Cửa sổ giao việc găng (ngày) — Cài đặt › Gắn việc vào WBS, mặc định 7 (Mr. Đại chốt 04/10). Thiếu = 0 (đã đến ngày bắt đầu) */
  cuaSoGiao?: number;
  N: number;
  K: number;
  tenDuAn: string;
  viec: ViecIssue[];
  /** Cây đầu việc (tiendo.tim_dau_viec) — rỗng khi agent Tiến độ không trả */
  tasks: DauViecCay[];
  cayOk: boolean;
  /** Chuỗi găng chốt COD (tiendo.duong_gang) — null khi không lấy được */
  chuoiGang: MatXichGang[] | null;
  boQua: Set<string>;
  nguonSoViec: string;
  nguonTienDo: string;
  /** Vùng phủ BC ngày của kho tiến độ (đầu → cuối) — null = không đọc được */
  hoiVungPhu: () => Promise<{ tu: string; den: string } | null>;
  /** true = có BC ngày · false = không có · null = chưa hỏi được */
  hoiBcNgay: (ma: string, tu: string, den: string) => Promise<boolean | null>;
}

export interface KetQuaSinh {
  the: TheCanhBao[];
  /** Việc còn mở dù mã WBS đã 100% → chuông nhắc chủ trì bấm Xong (không phải thẻ issue — 07/10) */
  nhacDong: NhacDong[];
  deXuat: TheCanhBao[];
  ghiChu: string[];
  doDuoc: DoDuocIssue;
  dauViec: Record<string, DauViecNho>;
}

const TOI_DA_DONG = 12;
const MS = 86_400_000;

export const ngayVN = (iso?: string | null): string => {
  if (!iso) return "?";
  const [n, t, ng] = iso.slice(0, 10).split("-");
  return ng && t && n ? `${ng}/${t}/${n}` : iso;
};
const tenNgan = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
/** Luật 30: mã luôn kèm tên ngắn */
const maKemTen = (ma: string, ten?: string) => (ten ? `${ma} ${tenNgan(ten)}` : ma);

/** Nhãn người: tên thật (không email trần); không có người → "chưa giao cho ai" */
export function nhanNguoi(v: Pick<ViecCay, "nguoiPhuTrach" | "tenNguoi">): string {
  if (!v.nguoiPhuTrach) return "chưa giao cho ai";
  return v.tenNguoi || v.nguoiPhuTrach;
}

/** Cửa sổ ±K ngày quanh ngày xong */
export function cuaSoQuanhNgayXong(ngayXong: string, K: number): { tu: string; den: string } {
  const goc = Date.parse(ngayXong + "T00:00:00Z");
  return { tu: new Date(goc - K * MS).toISOString().slice(0, 10), den: new Date(goc + K * MS).toISOString().slice(0, 10) };
}

/** % "chưa báo": 0, null, không phải số */
export function chuaBaoPhanTram(pct: unknown): boolean {
  return typeof pct !== "number" || !Number.isFinite(pct) || pct <= 0;
}

// tapMaCoCon · locGangDenNgay · locNutGangChuaAiNhan: định nghĩa MỘT chỗ ở cay-viec/thuan.ts (cửa sổ giao 04/10), xuất lại để code cũ dùng
export { tapMaCoCon, locGangDenNgay, locNutGangChuaAiNhan };

/** Gộp theo người chủ trì — "" = chưa giao cho ai; người nhiều việc lên trước */
export function gomTheoNguoi<T extends { v: ViecCay }>(ds: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const d of ds) {
    const k = d.v.nguoiPhuTrach || "";
    const cu = m.get(k) ?? [];
    cu.push(d);
    m.set(k, cu);
  }
  return new Map(Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length));
}

/** Việc có mã WBS ĐÃ DUYỆT (aiGanChuaSoat = trang_thai 'cho_duyet' trong docflow.wbs_viec — chưa duyệt thì không tính) */
export function daDuyetMa(v: Pick<ViecCay, "maWbs" | "aiGanChuaSoat">): v is Pick<ViecCay, "aiGanChuaSoat"> & { maWbs: string } {
  return !!v.maWbs && v.aiGanChuaSoat !== true;
}

const khoaNguoi = (tienTo: string, nguoi: string) => `${tienTo}:${nguoi || "chưa-giao"}`;

export async function sinhLuat(d: DauVaoSinh): Promise<KetQuaSinh> {
  const ghiChu: string[] = [];
  const the: TheCanhBao[] = [];
  const deXuat: TheCanhBao[] = [];
  const nhacDong: NhacDong[] = [];
  const { homNay, N, K, tenDuAn } = d;
  const cay = new Map(d.tasks.filter((t) => t.wbs).map((t) => [t.wbs, t]));
  const dauViec: Record<string, DauViecNho> = {};
  const ghiDau = (ma: string) => {
    const t = cay.get(ma);
    if (t && !dauViec[ma]) dauViec[ma] = { ten: String(t.name ?? ""), ...(t.end ? { end: String(t.end).slice(0, 10) } : {}), gang: t.critical === true };
  };
  const tenMa = (ma: string) => maKemTen(ma, cay.get(ma)?.name);

  // Việc gắn mã, gom theo mã — ⭐ Mr. Đại chốt 03/10 (KHÁC Base): CHỈ mã ĐÃ DUYỆT (wbs_viec.trang_thai = 'da_duyet').
  // Dòng 🤖 còn chờ duyệt KHÔNG tính là "đã gắn mã" cho mọi luật: luật 1 không gom, luật 3 nút có việc chờ duyệt vẫn coi là
  // CHƯA có việc, luật 4 không xét; khuôn thẻ (wbs, wbsLienQuan) cũng chỉ mang mã đã duyệt.
  const theoWbs = new Map<string, ViecIssue[]>();
  for (const v of d.viec) {
    if (!daDuyetMa(v)) continue;
    const cu = theoWbs.get(v.maWbs) ?? [];
    cu.push(v);
    theoWbs.set(v.maWbs, cu);
  }

  if (!d.cayOk) ghiChu.push("Agent tiến độ không trả cây đầu việc — luật 3 (⭕) và luật 4 (📄) không chạy được lượt này.");
  if (!d.chuoiGang) ghiChu.push("Agent tiến độ không trả chuỗi găng — ảnh hưởng COD ghi \"chưa lấy được\".");
  const chuoi = new Map((d.chuoiGang ?? []).map((m) => [m.wbs, m]));
  const anhHuongCua = (wbs: string): { so: number; thieu?: string } => {
    const m = chuoi.get(wbs);
    if (m && typeof m.so_ngay_tre === "number") return { so: m.so_ngay_tre };
    return {
      so: 0,
      thieu: "Ảnh hưởng COD: chưa lấy được — Agent tiến độ chỉ trả số ngày trễ cho các mắt xích chốt COD; đầu việc này trên găng nhưng ngoài chuỗi đó.",
    };
  };
  const nguonCaHai = `${d.nguonTienDo} · ${d.nguonSoViec}`;

  // ── ⭕ Luật 3 ──────────────────────────────────────────────
  const gangDenNgay = locGangDenNgay(d.tasks, homNay);
  const nutChuaAi = locNutGangChuaAiNhan(d.tasks, theoWbs, d.boQua, homNay, d.cuaSoGiao ?? 0);
  for (const t of nutChuaAi) {
    ghiDau(t.wbs);
    const ah = anhHuongCua(t.wbs);
    const ten = String(t.name ?? "");
    const han = t.end ? ` — đến hạn ${ngayVN(t.end)}` : "";
    the.push({
      id: "",
      nguon: "gang",
      mucDo: "red",
      tieuDe: `WBS ${t.wbs} ${ten} — trên đường găng, sổ việc không có việc nào gắn mã này`,
      phanTich:
        `"${ten}"${han}, bắt đầu ${ngayVN(t.start)}, trên đường găng, ${fmtSo(t.pct ?? 0)}% (baseline${t.contractor ? ` · ${t.contractor}` : ""}). ` +
        `Tra sổ việc của dự án ${tenDuAn} — không việc nào gắn mã ${t.wbs}. ` +
        "Sổ việc chỉ chứa việc ghi trong báo cáo tuần và việc giao tay: nghĩa là CHƯA AI ĐƯỢC GIAO TRONG AGENT CÔNG VIỆC, không kết luận không ai làm.",
      wbs: t.wbs,
      anhHuongCod: ah.so,
      nguonDuLieu: nguonCaHai,
      deXuat: `Giao việc ${maKemTen(t.wbs, ten)} cho người thường nhận loại việc này — ở khối giao việc ngay dưới thẻ (🤖 AI chọn sẵn người nhận); hạn = ngày xong theo tiến độ${t.end ? ` ${ngayVN(t.end)}` : ""}. Người bấm mới tạo việc, có ghi lịch sử.`,
      ...(ah.thieu ? { thieuDuLieu: ah.thieu } : {}),
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      trenDuongGang: true,
      ngayMo: homNay,
      ...(t.end ? { hanXuLy: String(t.end).slice(0, 10) } : {}),
    });
    deXuat.push({
      id: "",
      nguon: "ai",
      mucDo: "red",
      tieuDe: `Luật 3 — găng, chưa ai nhận: ${t.wbs} ${ten}`,
      phanTich: `Đầu việc ${t.wbs} ${ten} trên đường găng${han}, bắt đầu ${ngayVN(t.start)} (trong cửa sổ giao ${d.cuaSoGiao ?? 0} ngày), tra sổ việc của dự án ${tenDuAn} không có việc nào gắn mã này.`,
      wbs: t.wbs,
      anhHuongCod: ah.so,
      nguonDuLieu: nguonCaHai,
      deXuat: `Duyệt → thành issue rồi giao việc cho người thường nhận loại việc này (Cây việc → nút ${maKemTen(t.wbs, ten)}).`,
      trichNguyenVan: `criticalWbs — Agent tiến độ · ${t.wbs} "${ten}" · sổ việc agent Công việc (${tenDuAn}) · 0 việc gắn mã`,
      ...(ah.thieu ? { thieuDuLieu: ah.thieu } : {}),
      chuaVaoSo: true,
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      ngayMo: homNay,
    });
  }

  // ── ⏰ Luật 1 — GỘP THEO NGƯỜI ──────────────────────────────
  interface QuaHan {
    v: ViecIssue;
    wbs: string;
    gang: boolean;
    ah: { so: number; thieu?: string };
  }
  const theoNguoi = new Map<string, QuaHan[]>();
  let viecGanMaQuaHan = 0;
  theoWbs.forEach((ds, wbs) => {
    for (const v of ds) {
      if (v.daXong) continue;
      if (v.quaHanNgay === null || v.quaHanNgay < N) continue;
      viecGanMaQuaHan += 1;
      const gang = cay.get(wbs)?.critical === true;
      const k = v.nguoiPhuTrach || "";
      const cu = theoNguoi.get(k) ?? [];
      cu.push({ v, wbs, gang, ah: gang ? anhHuongCua(wbs) : { so: 0 } });
      theoNguoi.set(k, cu);
    }
  });
  for (const [nick, ds] of Array.from(theoNguoi.entries())) {
    ds.sort((a, b) => (b.v.quaHanNgay ?? 0) - (a.v.quaHanNgay ?? 0));
    const dau = ds[0];
    const nguoi = nhanNguoi(dau.v);
    const soGang = ds.filter((x) => x.gang).length;
    const anhHuong = ds.reduce((m, x) => Math.max(m, x.ah.so), 0);
    const thieuCod = soGang > 0 && ds.every((x) => !x.gang || x.ah.thieu) ? ds.find((x) => x.gang)?.ah.thieu : undefined;
    const lauNhat = dau.v.quaHanNgay ?? 0;
    ds.forEach((x) => ghiDau(x.wbs));
    const dongViec = ds
      .slice(0, TOI_DA_DONG)
      .map(
        (x) =>
          `• ${x.v.id} "${x.v.ten}" — quá hạn ${x.v.quaHanNgay} ngày · hạn ${ngayVN(x.v.han)} · mã ${tenMa(x.wbs)}${x.gang ? " (găng)" : ""}${x.v.namImNgay !== null ? ` · nằm im ${x.v.namImNgay} ngày` : ""}`,
      )
      .join("\n");
    const themNua = ds.length > TOI_DA_DONG ? `\n… và ${ds.length - TOI_DA_DONG} việc nữa (xem Cây việc, lọc theo người).` : "";
    const khoa = khoaNguoi("người", nick);
    const lienQuan = maWbsLienQuan(ds);
    const duoiGang = soGang > 0 ? ` · ${soGang} việc trên găng` : "";
    const tieuDe = nick
      ? `${nguoi} tồn ${ds.length} việc quá hạn ≥ ${N} ngày — lâu nhất ${lauNhat} ngày${duoiGang}`
      : `${ds.length} việc quá hạn ≥ ${N} ngày CHƯA GIAO CHO AI — lâu nhất ${lauNhat} ngày${duoiGang}`;
    the.push({
      id: "",
      nguon: "nang-suat",
      mucDo: soGang > 0 ? "red" : "yellow",
      tieuDe,
      phanTich:
        `${ds.length} việc gắn mã WBS của dự án ${tenDuAn}, quá hạn ≥ ${N} ngày, ${nick ? `đang ở bàn ${nguoi} (chủ trì)` : "chưa có người chủ trì trong sổ việc"}.\n` +
        (soGang > 0 ? `${soGang} việc nằm trên đường găng → thẻ đỏ.\n` : "Không việc nào trên đường găng → ảnh hưởng COD 0 ngày.\n") +
        dongViec +
        themNua,
      wbs: khoa,
      wbsLienQuan: lienQuan,
      anhHuongCod: anhHuong,
      nguonDuLieu: d.nguonSoViec,
      deXuat: nick
        ? `Hỏi ${nguoi} một lượt cho cả ${ds.length} việc — bắt đầu từ việc lâu nhất; việc nào chờ hồ sơ bên khác thì ghi đích danh chỗ tắc vào bình luận việc, việc xong thật thì bấm Xong.`
        : `Giao chủ trì cho ${ds.length} việc này — mở việc, bấm ✏ sửa việc chọn người chủ trì; hoặc "✎ Soạn việc giao" ở khung bên phải.`,
      ...(thieuCod ? { thieuDuLieu: thieuCod } : {}),
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      trenDuongGang: soGang > 0,
      ngayMo: homNay,
    });
    deXuat.push({
      id: "",
      nguon: "ai",
      mucDo: soGang > 0 ? "red" : "yellow",
      tieuDe: `Luật 1 — ${nguoi}: ${ds.length} việc quá hạn ≥ ${N} ngày, lâu nhất ${lauNhat} ngày`,
      phanTich: `${nick ? nguoi : "Chưa giao cho ai"} — ${ds.length} việc gắn mã dự án ${tenDuAn} quá hạn ≥ ${N} ngày${soGang > 0 ? `, ${soGang} trên găng` : ""}.\n${dongViec}${themNua}`,
      wbs: khoa,
      wbsLienQuan: lienQuan,
      anhHuongCod: anhHuong,
      nguonDuLieu: d.nguonSoViec,
      deXuat: nick ? `Duyệt → thành issue; nhắc ${nguoi} một lượt cho cả ${ds.length} việc.` : `Duyệt → thành issue; giao chủ trì cho ${ds.length} việc.`,
      trichNguyenVan: `Sổ việc agent Công việc · ${tenDuAn} · ${ds.length} việc · lâu nhất ${dau.v.id} "${dau.v.ten}" hạn ${ngayVN(dau.v.han)}`,
      ...(thieuCod ? { thieuDuLieu: thieuCod } : {}),
      chuaVaoSo: true,
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      ngayMo: homNay,
    });
  }

  // ── 🧱 Luật 2 — không có nguồn ─────────────────────────────
  // Luật 2 (🧱) — tab đã bỏ 07/10 (đợt 2): không có nguồn dữ liệu, không ghi chú nữa

  // ── 📄 Luật 4 ──────────────────────────────────────────────
  let doLuat4 = { viecXongGanMa: 0, ungVienXongGiay: 0, xongTrenGiay: 0, maDaHoiBcNgay: 0, maNgoaiVungPhu: 0, viecNgoaiVungPhu: 0, wbsXongViecConMo: 0 };
  if (d.cayOk) {
    doLuat4 = await sinhLuat4(d, theoWbs, cay, anhHuongCua, tenMa, ghiDau, the, deXuat, ghiChu, nhacDong);
  }

  return {
    the,
    nhacDong,
    deXuat,
    ghiChu,
    dauViec,
    doDuoc: { gangDenNgay: gangDenNgay.length, gangKhongViec: nutChuaAi.length, viecGanMaQuaHan, deXuatTac: 0, ...doLuat4 },
  };
}

async function sinhLuat4(
  d: DauVaoSinh,
  theoWbs: Map<string, ViecIssue[]>,
  cay: Map<string, DauViecCay>,
  anhHuongCua: (wbs: string) => { so: number; thieu?: string },
  tenMa: (ma: string) => string,
  ghiDau: (ma: string) => void,
  the: TheCanhBao[],
  deXuat: TheCanhBao[],
  ghiChu: string[],
  nhacDong: NhacDong[],
) {
  const { homNay, K } = d;
  let viecXongGanMa = 0;
  theoWbs.forEach((ds) => ds.forEach((v) => v.daXong && (viecXongGanMa += 1)));

  // Ứng viên: việc XONG có ngày xong, gắn mã mà cây ghi % chưa báo (mã không có trong cây → không biết % → bỏ)
  const ungVien: { v: ViecIssue; wbs: string; dv: DauViecCay }[] = [];
  theoWbs.forEach((ds, wbs) => {
    const dv = cay.get(wbs);
    if (!dv || !chuaBaoPhanTram(dv.pct)) return;
    for (const v of ds) if (v.daXong && v.ngayXong) ungVien.push({ v, wbs, dv });
  });
  const TRAN_MA = 40;
  const cuaSoTheoMa = new Map<string, { tu: string; den: string }>();
  for (const u of ungVien) {
    const cs = cuaSoQuanhNgayXong(u.v.ngayXong ?? homNay, K);
    const cu = cuaSoTheoMa.get(u.wbs);
    cuaSoTheoMa.set(u.wbs, cu ? { tu: cu.tu < cs.tu ? cu.tu : cs.tu, den: cu.den > cs.den ? cu.den : cs.den } : cs);
  }
  const cacMa = Array.from(cuaSoTheoMa.keys()).slice(0, TRAN_MA);
  if (cuaSoTheoMa.size > TRAN_MA) ghiChu.push(`Luật 4 (📄): ${cuaSoTheoMa.size} mã ứng viên, lượt này chỉ hỏi BC ngày ${TRAN_MA} mã đầu — lượt sau hỏi tiếp.`);

  const coBc = new Map<string, boolean | null>();
  let vungPhu: { tu: string; den: string } | null = null;
  if (cacMa.length > 0) {
    vungPhu = await d.hoiVungPhu();
    if (!vungPhu) ghiChu.push("Luật 4 (📄): không đọc được vùng phủ BC ngày của kho tiến độ — không kết luận mã nào lượt này.");
  }
  let ngoaiVungPhu = 0;
  for (const ma of cacMa) {
    const cs = cuaSoTheoMa.get(ma)!;
    if (!vungPhu) {
      coBc.set(ma, null);
      continue;
    }
    if (cs.den < vungPhu.tu || cs.tu > vungPhu.den) {
      coBc.set(ma, null);
      ngoaiVungPhu += 1;
      continue;
    }
    coBc.set(ma, await d.hoiBcNgay(ma, cs.tu, cs.den));
  }
  const chuaHoiDuoc = cacMa.filter((m) => coBc.get(m) === null).length - ngoaiVungPhu;
  if (ngoaiVungPhu > 0 && vungPhu)
    ghiChu.push(`Luật 4 (📄): ${ngoaiVungPhu}/${cacMa.length} mã có ngày xong ±${K} ngày nằm NGOÀI vùng phủ BC ngày của kho tiến độ (${khoangNgay(vungPhu.tu, vungPhu.den)}) — kho chưa có số, chưa biết, không kết luận.`);
  if (vungPhu && chuaHoiDuoc > 0) ghiChu.push(`Luật 4 (📄): ${chuaHoiDuoc}/${cacMa.length} mã chưa hỏi được BC ngày (agent tiến độ lỗi/hết giờ) — không kết luận cho các mã đó.`);

  const trongVungPhu = (ngay: string | null): boolean => {
    if (!vungPhu || !ngay) return false;
    const cs = cuaSoQuanhNgayXong(ngay, K);
    return !(cs.den < vungPhu.tu || cs.tu > vungPhu.den);
  };
  const dinh = ungVien.filter((u) => coBc.get(u.wbs) === false && trongVungPhu(u.v.ngayXong));
  const viecNgoaiVungPhu = ungVien.filter((u) => coBc.get(u.wbs) !== true && !trongVungPhu(u.v.ngayXong)).length;
  if (vungPhu && viecNgoaiVungPhu > 0)
    ghiChu.push(`Luật 4 (📄): ${viecNgoaiVungPhu}/${ungVien.length} việc ứng viên xong ngoài vùng phủ BC ngày (${khoangNgay(vungPhu.tu, vungPhu.den)}) — chưa biết, không lên thẻ.`);

  const cuaSo = (ma: string) => cuaSoTheoMa.get(ma);
  const chuCuaSo = (ma: string) => {
    const c = cuaSo(ma);
    return c ? khoangNgay(c.tu, c.den) : "?";
  };
  for (const [nick, ds] of Array.from(gomTheoNguoi(dinh).entries())) {
    const dau = ds[0];
    const nguoi = nhanNguoi(dau.v);
    const cacMaDinh = Array.from(new Set(ds.map((x) => x.wbs)));
    cacMaDinh.forEach(ghiDau);
    const maGang = cacMaDinh.filter((m) => cay.get(m)?.critical === true);
    const anhHuong = maGang.reduce((mx, m) => Math.max(mx, anhHuongCua(m).so), 0);
    const thieuCod = maGang.length > 0 && maGang.every((m) => anhHuongCua(m).thieu) ? anhHuongCua(maGang[0]).thieu : undefined;
    const dong = ds
      .slice(0, TOI_DA_DONG)
      .map(
        (x) =>
          `• ${x.v.id} "${x.v.ten}" — báo xong ${ngayVN(x.v.ngayXong)} · mã ${tenMa(x.wbs)}${x.dv.critical ? " (găng)" : ""} · % tiến độ ${typeof x.dv.pct === "number" ? x.dv.pct : "chưa có"} · BC ngày ${chuCuaSo(x.wbs)}: không có`,
      )
      .join("\n");
    const themNua = ds.length > TOI_DA_DONG ? `\n… và ${ds.length - TOI_DA_DONG} việc nữa.` : "";
    const khoa = khoaNguoi("xong-giấy", nick);
    const lienQuan = maWbsLienQuan(ds);
    const tieuDe = `${nguoi} — ${ds.length} việc báo XONG trong sổ việc nhưng ${cacMaDinh.length} mã WBS chưa báo khối lượng${maGang.length > 0 ? ` · ${maGang.length} mã trên găng` : ""}`;
    const phanTich =
      `${ds.length} việc trong sổ ở trạng thái HOÀN THÀNH${nick ? ` (chủ trì ${nguoi})` : " (chưa giao cho ai)"} gắn mã WBS của dự án, nhưng Agent tiến độ ghi % của mã đó = 0 ` +
      `và trong ±${K} ngày quanh ngày xong KHÔNG có báo cáo ngày nào ghi khối lượng cho mã đó — "xong trên giấy" (luật 4).\n` +
      (maGang.length > 0 ? `${maGang.length} mã trên đường găng → thẻ đỏ.\n` : "Không mã nào trên đường găng → ảnh hưởng COD 0 ngày.\n") +
      dong +
      themNua;
    const nguonDl = `${d.nguonTienDo} · ${d.nguonSoViec} · tiendo.khoi_luong_hang_muc theo mã`;
    const dsMa = cacMaDinh.slice(0, 5).map(tenMa).join(", ") + (cacMaDinh.length > 5 ? "…" : "");
    the.push({
      id: "",
      nguon: "xong-giay",
      mucDo: maGang.length > 0 ? "red" : "yellow",
      tieuDe,
      phanTich,
      wbs: khoa,
      wbsLienQuan: lienQuan,
      anhHuongCod: anhHuong,
      nguonDuLieu: nguonDl,
      deXuat: nick
        ? `Hỏi ${nguoi}: việc đã xong thật thì gửi BC ngày/khối lượng cho ${cacMaDinh.length} mã (${dsMa}) để Agent tiến độ cập nhật %; chưa xong thì mở lại việc trong sổ.`
        : `Tìm người đã đóng ${ds.length} việc này rồi hỏi khối lượng thật của ${cacMaDinh.length} mã.`,
      ...(thieuCod ? { thieuDuLieu: thieuCod } : {}),
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      trenDuongGang: maGang.length > 0,
      ngayMo: homNay,
    });
    deXuat.push({
      id: "",
      nguon: "ai",
      mucDo: maGang.length > 0 ? "red" : "yellow",
      tieuDe: `Luật 4 — ${nguoi}: ${ds.length} việc xong trên giấy, ${cacMaDinh.length} mã WBS chưa báo khối lượng`,
      phanTich,
      wbs: khoa,
      wbsLienQuan: lienQuan,
      anhHuongCod: anhHuong,
      nguonDuLieu: nguonDl,
      deXuat: `Duyệt → thành issue; nhắc ${nick ? nguoi : "người đã đóng việc"} nộp BC ngày cho ${cacMaDinh.length} mã.`,
      trichNguyenVan: `Sổ việc · ${dau.v.id} "${dau.v.ten}" xong ${ngayVN(dau.v.ngayXong)} · mã ${tenMa(dau.wbs)} % = ${typeof dau.dv.pct === "number" ? dau.dv.pct : "chưa có"} · khoi_luong_hang_muc ${chuCuaSo(dau.wbs)}: KHONG_CO_DU_LIEU`,
      ...(thieuCod ? { thieuDuLieu: thieuCod } : {}),
      chuaVaoSo: true,
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      ngayMo: homNay,
    });
  }

  // ↩ Chiều ngược — WBS 100% mà việc gắn mã còn mở
  const conMo: { v: ViecIssue; wbs: string; dv: DauViecCay }[] = [];
  theoWbs.forEach((ds, wbs) => {
    const dv = cay.get(wbs);
    if (!dv || typeof dv.pct !== "number" || dv.pct < 100) return;
    for (const v of ds) if (!v.daXong) conMo.push({ v, wbs, dv });
  });
  // 07/10 (Mr. Đại chốt, đợt 2): "nhắc đóng việc" KHÔNG còn là thẻ issue — gom danh sách, bộ chạy gửi CHUÔNG cho người chủ trì
  for (const x of conMo) nhacDong.push({ viecId: x.v.id, ten: x.v.ten, maWbs: tenMa(x.wbs) });

  if (ungVien.length === 0)
    ghiChu.push(`Luật 4 (📄): ${viecXongGanMa} việc xong có gắn mã, 0 mã có % = 0 → không có ứng viên xong trên giấy — kết quả thật, không phải thiếu dữ liệu.`);
  else if (dinh.length === 0) ghiChu.push(`Luật 4 (📄): ${ungVien.length} việc ứng viên (WBS % = 0) — không mã nào kết luận được là thiếu BC ngày → 0 thẻ.`);

  return {
    viecXongGanMa,
    ungVienXongGiay: ungVien.length,
    xongTrenGiay: dinh.length,
    maDaHoiBcNgay: cacMa.length - ngoaiVungPhu,
    maNgoaiVungPhu: ngoaiVungPhu,
    viecNgoaiVungPhu,
    wbsXongViecConMo: conMo.length,
  };
}

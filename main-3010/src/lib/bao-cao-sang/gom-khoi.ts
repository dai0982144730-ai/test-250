// ============================================================
// GOM SỐ CHO CÁC KHỐI BÁO CÁO SÁNG  (server-only — đi hỏi agent)
// MD: KE-HOACH/23 (Mr. Đại chốt 17/10/2026). Kiểu + bộ đọc: khoi-du-lieu.ts · in: khoi-telegram.ts
//
// ⛔ CHỈ hỏi khối có người nhận đang dùng, CHỈ cho dự án nằm trong phạm vi của người đó — 16 dự án × 15 khối là lãng phí.
// ⛔ Mọi lượt đi qua `hoiAgent` (luật 29 — có vết sổ, lý do gọi nói rõ khối nào). Công cụ đọc được nhớ 10 phút (bo-nho-hoi).
// ⛔ Không ném lỗi: một khối / một dự án hỏng thì ô đó «chưa có số» kèm lý do — báo cáo vẫn gửi (luật cứng 5).
// ============================================================

import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { gioVn } from "@/lib/gio-vn";
import { addDays, daysBetween } from "@/lib/format";
import type { KhuonTra } from "@/lib/mcp/khuon";
import { songSongGioiHan, gomBangDieuHanh } from "@/lib/bang-dieu-hanh/gom";
import { dungPrompt, layTomTatAi } from "@/lib/bang-dieu-hanh/tom-tat-ai";
import { ghepHeTheoKhung, ghepSoVoiChoQuaHan, quaLuoiLuat36, tenKhoi, type MaKhoi } from "./khoi";
import type { DauDuAn, VanDeSang } from "./luat-cod";
import {
  docGang,
  docCamKet,
  docDoiChieuKl,
  docLichHoSo,
  docViecSapToi,
  docGiaDinh,
  docNguonLuc,
  docNhatKy,
  docSoLieuNghiemThu,
  docHanChuTruong,
  docHoSo,
  docPhieuSoSanLuong,
  docSCurve,
  docTaiViec,
  docThiCong,
  docLichNghiemThu,
  docTien,
  docXuThe,
  khoaKeoVe,
  type DuLieuKhoi,
  type DuLieuKhoiDuAn,
  type DongThuCod,
  type KetKhoi,
  type KeoVeCod,
} from "./khoi-du-lieu";

export interface YeuCauGomKhoi {
  ngay: string;
  duAn: readonly DauDuAn[];
  /** Vấn đề RQ-1 đã gộp + xếp (giả định RQ-3 ① và cột kéo về lấy việc từ đây) */
  vanDe: readonly VanDeSang[];
  /** Khối → các dự án cần số (đã cắt theo phạm vi từng người nhận) */
  can: ReadonlyMap<MaKhoi, ReadonlySet<string>>;
  /** RQ-1 cột «kéo COD về» (chốt 2): mỗi dự án lấy bao nhiêu việc đầu */
  soKeoVe: ReadonlyMap<string, number>;
  /** TQ-5: được gọi AI viết câu mới khi bộ số đổi (false = tài khoản Người xem mở màn — chỉ dùng câu đã có) */
  duocGoiAi?: boolean;
}

/** Trần cột «kéo COD về» mỗi dự án — mỗi việc một lượt chạy lại bộ dự báo (~1 giây) */
export const TRAN_KEO_VE_MOI_DU_AN = 10;

const ngayVnCua = (iso: string): string => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso.slice(0, 10) : gioVn(t).ngay;
};

const lyDo = (ngay: string, ma: MaKhoi | "RQ-1 cột kéo COD về") =>
  `dựng báo cáo sáng ${ngay} — khối ${ma === "RQ-1 cột kéo COD về" ? "RQ-1 Việc làm chậm COD, cột «xử lý riêng việc này kéo COD về được N ngày»" : tenKhoi(ma)} (KE-HOACH/23)`;

/** Câu trả lời → số; hỏng → câu lỗi nguyên văn của agent kèm tên agent */
function ket<T>(kq: KhuonTra, tenAgent: string, doc: (du: unknown) => T): KetKhoi<T> {
  if (!kq.ok) return { ok: false, loi: `${tenAgent}: ${kq.thong_diep}` };
  try {
    return { ok: true, so: doc(kq.du_lieu) };
  } catch (e) {
    return { ok: false, loi: `${tenAgent} trả khuôn lạ — ${e instanceof Error ? e.message : "không đọc được"}` };
  }
}

const canKhoi = (y: YeuCauGomKhoi, ma: MaKhoi, maDuAn: string): boolean => y.can.get(ma)?.has(maDuAn) === true;

/** Câu 🤖 của Bảng điều hành cho một dự án — dùng lại câu đã viết khi bộ số không đổi (nhớ 24 giờ, tom-tat-ai.ts) */
async function cauAiMotDuAn(maDuAn: string, duocGoiAi: boolean): Promise<{ cau: string | null; loi: string | null }> {
  try {
    const b = await gomBangDieuHanh(maDuAn);
    if (!b.dangChon) return { cau: null, loi: "dự án chưa có trên dàn ngang Bảng điều hành — chưa có câu 🤖" };
    const kq = await layTomTatAi(b, undefined, duocGoiAi, 150_000);
    if (!kq.ok || !kq.cau) return { cau: null, loi: kq.loi ?? "AI chưa viết được câu" };
    // Thiếu «so với …» sau «quá hạn N ngày» thì code ghép «so với hạn đã đặt»; còn sót (chậm/trễ không rõ hệ) mới bỏ câu
    // 28/10/2026 (anh duyệt A): thiếu «so với …» thì code ghép — «quá hạn» → hạn đã đặt; «chậm / lùi N ngày» → hệ ghi trong KHUNG SỐ AI được đưa
    // (đúng con số N, một hệ duy nhất). Còn sót mới bỏ câu.
    const cauDu = quaLuoiLuat36(kq.cau) ? kq.cau : ghepHeTheoKhung(ghepSoVoiChoQuaHan(kq.cau), dungPrompt(b));
    if (!quaLuoiLuat36(cauDu)) {
      return { cau: null, loi: "câu 🤖 hôm nay nói nhanh/chậm mà không ghi «so với Tiến độ mục tiêu / Baseline / hạn …» — bị loại (luật 36)" };
    }
    return { cau: cauDu, loi: null };
  } catch (e) {
    return { cau: null, loi: e instanceof Error ? e.message : "lỗi không rõ khi lấy câu 🤖" };
  }
}

async function giaDinh(maDuAn: string, wbs: string, nhan: string, ngay: string, ma: MaKhoi | "RQ-1 cột kéo COD về"): Promise<DongThuCod> {
  const kq = await hoiAgent("tiendo", "tiendo.gia_dinh_cod", lyDo(ngay, ma), { tham_so: { ma_du_an: maDuAn, ve_baseline: wbs } });
  if (!kq.ok) return { nhan, codSau: null, keoVe: null, chamMucTieuSau: null, giaiThich: null, lyDoKhongDoi: null, loi: `Agent Tiến độ: ${kq.thong_diep}` };
  return docGiaDinh(kq.du_lieu, nhan);
}

const tenViec = (v: { wbs: string | null; tenWbs?: string | null; tieuDe: string }): string =>
  v.wbs ? `${v.wbs}${v.tenWbs ? ` ${v.tenWbs}` : ""}` : v.tieuDe;

/**
 * CT-1 · CT-2 (28/10): kỳ 7 ngày kết thúc HÔM QUA. Chưa có báo cáo ngày trong kỳ thì hỏi `tiendo.bao_cao_ngay_boq` lấy ngày báo cáo
 * mới nhất rồi hỏi lại kỳ kết thúc ở đó — khối ghi rõ «cũ N ngày», không giả vờ là số của hôm qua. Hết cách thì trả lỗi nguyên văn.
 */
async function hoiTheoKy<T>(
  ma: string,
  ngayBc: string,
  congCu: "tiendo.nguon_luc_huy_dong" | "tiendo.nhat_ky_thi_cong",
  soNgayKy: number,
  khoi: "CT-1" | "CT-2",
  doc: (du: unknown, cuNgay: number) => T | null,
): Promise<KetKhoi<T>> {
  const homQua = addDays(ngayBc, -1);
  const hoi = (den: string) => hoiAgent("tiendo", congCu, lyDo(ngayBc, khoi), { tham_so: { ma_du_an: ma, tu_ngay: addDays(den, -(soNgayKy - 1)), den_ngay: den } });
  const doKy = (kq: KhuonTra, den: string): KetKhoi<T> | null => {
    if (!kq.ok) return null;
    try {
      const x = doc(kq.du_lieu, daysBetween(den, homQua));
      return x === null ? null : { ok: true, so: x };
    } catch {
      return null;
    }
  };
  const kq1 = await hoi(homQua);
  const a = doKy(kq1, homQua);
  if (a) return a;
  if (!kq1.ok && kq1.ma_loi !== "KHONG_CO_DU_LIEU") return { ok: false, loi: `Agent Tiến độ: ${kq1.thong_diep}` };
  const moiNhat = await hoiAgent("tiendo", "tiendo.bao_cao_ngay_boq", lyDo(ngayBc, khoi), { tham_so: { ma_du_an: ma } });
  const ngayCuoi = moiNhat.ok && typeof (moiNhat.du_lieu as { ngay_cuoi?: unknown })?.ngay_cuoi === "string" ? ((moiNhat.du_lieu as { ngay_cuoi: string }).ngay_cuoi) : null;
  if (!ngayCuoi || ngayCuoi >= homQua) {
    return { ok: false, loi: ngayCuoi ? "Agent Tiến độ trả khuôn lạ — kỳ có báo cáo nhưng không đọc được" : "dự án chưa có báo cáo ngày nào được nạp ở agent Tiến độ" };
  }
  const kq2 = await hoi(ngayCuoi);
  return doKy(kq2, ngayCuoi) ?? { ok: false, loi: kq2.ok ? "Agent Tiến độ trả khuôn lạ" : `Agent Tiến độ: ${kq2.thong_diep}` };
}

async function gomMotDuAn(y: YeuCauGomKhoi, d: DauDuAn): Promise<{ so: DuLieuKhoiDuAn; keoVe: Record<string, KeoVeCod> }> {
  const ma = d.maDuAn;
  const so: DuLieuKhoiDuAn = {};
  const keoVe: Record<string, KeoVeCod> = {};
  const ts = { ma_du_an: ma };
  const viec: Promise<void>[] = [];

  // Tiến độ — chỉ dự án đã có tiến độ (dự án chưa có thì các khối này không có gì để hỏi)
  const canGang = d.coTienDo && (["TQ-1", "RQ-2", "RQ-3", "DA-2"] as MaKhoi[]).some((k) => canKhoi(y, k, ma));
  const gangP = canGang
    ? hoiAgent("tiendo", "tiendo.duong_gang", lyDo(y.ngay, "RQ-2"), { tham_so: ts }).then((kq) => ket(kq, "Agent Tiến độ", docGang))
    : null;
  if (gangP) viec.push(gangP.then((g) => void (so.gang = g)));

  if (d.coTienDo && canKhoi(y, "TQ-2", ma)) {
    viec.push(
      hoiAgent("tiendo", "tiendo.lich_su_du_bao", lyDo(y.ngay, "TQ-2"), { tham_so: { ma_du_an: ma, so_thang: 2, theo_ngay: true } }).then(
        (kq) => void (so.xuThe = ket(kq, "Agent Tiến độ", (du) => docXuThe(du, ngayVnCua, d.codMucTieu, d.codBaseline ?? null))),
      ),
    );
  }
  if (d.coTienDo && canKhoi(y, "DA-3", ma)) {
    viec.push(hoiAgent("tiendo", "tiendo.s_curve", lyDo(y.ngay, "DA-3"), { tham_so: ts }).then((kq) => void (so.sCurve = ket(kq, "Agent Tiến độ", docSCurve))));
  }
  if (d.coTienDo && canKhoi(y, "DA-4", ma)) {
    viec.push(hoiAgent("tiendo", "tiendo.nang_suat", lyDo(y.ngay, "DA-4"), { tham_so: ts }).then((kq) => void (so.thiCong = ket(kq, "Agent Tiến độ", docThiCong))));
  }
  // NT-1 — lịch nghiệm thu hôm nay + ngày mai: hỏi agent Nghiệm thu (không cần dự án có tiến độ)
  if (d.coTienDo && canKhoi(y, "VS-1", ma)) {
    // 7 ngày: hôm nay + 6 ngày tới; tối đa 100 việc (không cắt — T10)
    viec.push(
      hoiAgent("tiendo", "tiendo.viec_trong_khoang", lyDo(y.ngay, "VS-1"), { tham_so: { ma_du_an: ma, tu_ngay: y.ngay, den_ngay: addDays(y.ngay, 6), gioi_han: 100 } }).then(
        (kq) => void (so.viecSapToi = ket(kq, "Agent Tiến độ", docViecSapToi)),
      ),
    );
  }
  if (canKhoi(y, "PL-2", ma)) {
    viec.push(hoiAgent("phaply", "phaply.lich_ho_so", lyDo(y.ngay, "PL-2"), { tham_so: ts }).then((kq) => void (so.lichHoSo = ket(kq, "Agent Pháp lý", docLichHoSo))));
  }
  if (canKhoi(y, "NT-3", ma)) {
    viec.push(hoiAgent("nghiemthu", "nghiemthu.doi_chieu_khoi_luong", lyDo(y.ngay, "NT-3"), { tham_so: ts }).then((kq) => void (so.doiChieuKl = ket(kq, "Agent Nghiệm thu", docDoiChieuKl))));
  }
  if (canKhoi(y, "NT-2", ma) || canKhoi(y, "NT-3", ma)) {
    const khoiNt = canKhoi(y, "NT-3", ma) ? "NT-3" : "NT-2";
    viec.push(hoiAgent("nghiemthu", "nghiemthu.so_lieu_sang", lyDo(y.ngay, khoiNt), { tham_so: ts }).then((kq) => void (so.soLieuNt = ket(kq, "Agent Nghiệm thu", docSoLieuNghiemThu))));
  }
  if (d.coTienDo && canKhoi(y, "CT-1", ma)) {
    viec.push(
      Promise.all([
        hoiTheoKy(ma, y.ngay, "tiendo.nguon_luc_huy_dong", 7, "CT-1", docNguonLuc),
        hoiAgent("hopdong", "hopdong.cam_ket_nha_thau", lyDo(y.ngay, "CT-1"), { tham_so: ts }),
      ]).then(([nl, ck]) => {
        // Cam kết: hỏi hỏng / không có số thì vẫn in nguồn lực thực tế, kèm lý do chưa so được
        if (nl.ok) {
          nl.so.camKet = ck.ok ? docCamKet(ck.du_lieu) : ck.ma_loi === "KHONG_CO_DU_LIEU" ? [{ hopDong: "", nhaThau: "", nhanCong: null, may: null, lyDoChuaCo: ck.thong_diep }] : null;
        }
        so.nguonLuc = nl;
      }),
    );
  }
  if (d.coTienDo && canKhoi(y, "CT-2", ma)) {
    viec.push(hoiTheoKy(ma, y.ngay, "tiendo.nhat_ky_thi_cong", 7, "CT-2", docNhatKy).then((r) => void (so.nhatKy = r)));
  }
  if (canKhoi(y, "NT-1", ma)) {
    viec.push(hoiAgent("nghiemthu", "nghiemthu.lich_nghiem_thu", lyDo(y.ngay, "NT-1"), { tham_so: ts }).then((kq) => void (so.lichNt = ket(kq, "Agent Nghiệm thu", docLichNghiemThu))));
  }
  if (d.coTienDo && canKhoi(y, "TQ-1", ma)) {
    viec.push(
      hoiAgent("phaply", "phaply.han_chu_truong", lyDo(y.ngay, "TQ-1"), { tham_so: ts }).then(
        (kq) => void (so.hanChuTruong = ket(kq, "Agent Pháp lý", docHanChuTruong)),
      ),
    );
  }
  if (canKhoi(y, "TQ-4", ma)) {
    viec.push(
      Promise.all([
        hoiAgent("hopdong", "hopdong.gia_tri_luy_ke", lyDo(y.ngay, "TQ-4"), { tham_so: ts }),
        hoiAgent("hopdong", "hopdong.chi_phi_theo_hop_dong", lyDo(y.ngay, "TQ-4"), { tham_so: ts }),
        hoiAgent("tiendo", "tiendo.san_luong_hop_dong", lyDo(y.ngay, "TQ-4"), { tham_so: ts }),
      ]).then(([lk, cp, sl]) => {
        const loi = (k: KhuonTra, ten: string) => (k.ok ? k.du_lieu : `${ten}: ${k.thong_diep}`);
        so.tien =
          !lk.ok && !cp.ok && !sl.ok
            ? { ok: false, loi: `Agent Hợp đồng: ${lk.thong_diep}` }
            : { ok: true, so: docTien(loi(lk, "Agent Hợp đồng"), loi(cp, "Agent Hợp đồng"), loi(sl, "Agent Tiến độ")) };
      }),
    );
  }
  if (canKhoi(y, "RQ-4", ma)) {
    viec.push(
      hoiAgent("hopdong", "hopdong.phieu_gia_so_san_luong", lyDo(y.ngay, "RQ-4"), { tham_so: ts }).then(
        (kq) => void (so.phieuGia = ket(kq, "Agent Hợp đồng", docPhieuSoSanLuong)),
      ),
    );
  }
  if (canKhoi(y, "RQ-5", ma)) {
    viec.push(hoiAgent("phaply", "phaply.ho_so_thieu", lyDo(y.ngay, "RQ-5"), { tham_so: ts }).then((kq) => void (so.hoSo = ket(kq, "Agent Pháp lý", docHoSo))));
  }
  if (canKhoi(y, "RQ-6", ma)) {
    viec.push(
      hoiAgent("base", "base.tai_viec_theo_nguoi", lyDo(y.ngay, "RQ-6"), { tham_so: { ma_du_an: ma, gioi_han: 50 } }).then(
        (kq) => void (so.taiViec = ket(kq, "Agent Công việc", docTaiViec)),
      ),
    );
  }
  if (canKhoi(y, "TQ-5", ma)) viec.push(cauAiMotDuAn(ma, y.duocGoiAi !== false).then((c) => void (so.cauAi = c)));

  await Promise.all(viec);

  // ── Giả định COD (chạy lại bộ dự báo bên Tiến độ — lần lượt, không dồn cổng). Cần số đường găng trước (RQ-3 ②).
  if (d.coTienDo) {
    const vanDe = y.vanDe.filter((v) => v.maDuAn === ma && v.wbs);
    const canThu = canKhoi(y, "RQ-3", ma);
    const k = canKhoi(y, "RQ-1", ma) ? Math.min(y.soKeoVe.get(ma) ?? 0, TRAN_KEO_VE_MOI_DU_AN) : 0;
    const daHoi = new Map<string, DongThuCod>();
    for (const v of vanDe.slice(0, k)) {
      const wbs = v.wbs as string;
      if (daHoi.has(wbs)) continue;
      const dong = await giaDinh(ma, wbs, `Riêng ${tenViec(v)} về đúng Baseline`, y.ngay, k > 0 ? "RQ-1 cột kéo COD về" : "RQ-3");
      daHoi.set(wbs, dong);
      keoVe[khoaKeoVe(ma, wbs)] = { soNgay: dong.keoVe, codSau: dong.codSau, lyDo: dong.lyDoKhongDoi, loi: dong.loi };
    }
    if (canThu) {
      const g = so.gang;
      const dong: DongThuCod[] = [];
      // 27/10 (KE-HOACH/33 mục 4): bỏ giả định ① «riêng việc đầu» (trùng cột «Kéo về» của RQ-1); thêm «mọi việc làm chậm COD về Baseline»
      // — Tiến độ nhận danh sách mã trong một lượt (ve_baseline, tối đa 20), bên này không tự cộng trừ ngày
      const mayWbs = Array.from(new Set(vanDe.map((v) => v.wbs as string))).slice(0, 20);
      if (mayWbs.length >= 2) dong.push(await giaDinh(ma, mayWbs.join(", "), `Mọi ${mayWbs.length} việc làm chậm COD về đúng Baseline`, y.ngay, "RQ-3"));
      const hm = g?.ok ? g.so.hangMuc.find((h) => (h.tuLamCodCham ?? 0) > 0 && h.wbs) : undefined;
      if (hm) dong.push(await giaDinh(ma, hm.wbs, `Cả hạng mục ${hm.wbs} ${hm.ten} về đúng Baseline`, y.ngay, "RQ-3"));
      so.thuCod = g && !g.ok && dong.length === 0
        ? { ok: false, loi: g.loi }
        : { ok: true, so: { codNay: g?.ok ? g.so.codDuBao : d.codDuBao, chamMucTieuNay: d.chamNgay, dong } };
    }
  }
  return { so, keoVe };
}

/**
 * Gom số cho mọi khối có người dùng. Dự án hỏi song song tối đa 2 (cổng Tiến độ tính lịch lần lượt — gom.ts).
 */
export async function gomKhoi(y: YeuCauGomKhoi): Promise<DuLieuKhoi> {
  const maCan = new Set<string>();
  y.can.forEach((ds) => ds.forEach((m) => maCan.add(m)));
  const duAn = y.duAn.filter((d) => maCan.has(d.maDuAn));
  const ket = await songSongGioiHan(duAn, 2, (d) =>
    gomMotDuAn(y, d).catch((e) => ({ so: {} as DuLieuKhoiDuAn, keoVe: {}, loi: e instanceof Error ? e.message : String(e) })),
  );
  const theoDuAn: Record<string, DuLieuKhoiDuAn> = {};
  const keoVe: Record<string, KeoVeCod> = {};
  duAn.forEach((d, i) => {
    theoDuAn[d.maDuAn] = ket[i]!.so;
    Object.assign(keoVe, ket[i]!.keoVe);
  });
  const daGom: DuLieuKhoi["daGom"] = {};
  y.can.forEach((ds, ma) => (daGom[ma] = Array.from(ds)));
  return { daGom, theoDuAn, keoVe, gomLuc: new Date().toISOString() };
}

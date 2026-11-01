"use client";
// ============================================================
// KHỐI GIAO VIỆC NGAY DƯỚI MỖI THẺ ISSUE ở danh sách trái (Mr. Đại chốt 04/10/2026 tối) — khuôn chung mọi màn giao việc theo gợi ý:
// ô trình bày MỘT khối chữ (Tên việc · Giao cho · Thuộc dự án · Hạn · Kết quả cần có · Nguồn) — bên ngoài ô: chọn người nhận +
// Giao việc · Sửa · Bỏ qua.
//   · Người nhận: MÁY điền người đang giữ việc (thẻ gom theo người) · issue găng (nút WBS) → 🤖 AI chọn theo lịch sử, 1 lượt/issue
//     mỗi lần mở trang · còn lại để trống. Chỉ điền nơi mình GIAO ĐƯỢC (danh sách ô Giao cho đã lọc theo quyền).
//   · Sửa → ô giống dấu + (OGiaoSua) ở KHU PHẢI, cùng một bản nháp với khối trái (sửa bên phải, khối trái thấy ngay)
//   · Bỏ qua → nhớ "không cần giao việc" trong sổ issue; khối thay bằng một dòng + "Bỏ đánh dấu"
//   · Issue đã giao việc → khối thay bằng "✓ Đã giao việc CV-…"
// Nút giao việc ở chi tiết bên phải đã bỏ — một vấn đề một nơi.
// ⭐ 05/10 Luật 33: bấm Giao việc → máy chủ hỏi 4 agent kia trước; trùng thì hiện "🤖 Việc này đã được agent … soạn…" + nút
// "Vẫn giao việc riêng" (gửi lại kèm van_soan). Issue găng: 🤖 AI chọn người cũng đi qua cửa soạn có hỏi trùng.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { khoangNgay } from "@/lib/phong/tuan";
import { dangBoQua, type TheCanhBao } from "@/lib/cay-viec/issue/model";
import { lyDoChanGhi } from "@/lib/cay-viec/issue/quyen";
import { laNutGang, laTheNhac, nhapMacDinh, tenWbsCua, viecCuCuaThe } from "@/lib/cay-viec/issue/nhap-thuan";
import { useCaiDatDinhKem, useKepTep } from "@/components/dinh-kem/DinhKem";
import { OGiaoSua } from "../OGiaoSua";
import { OChonNoiNhan, type NguoiNhanCV } from "../OChonNoiNhan";
import { NUT_CHINH, NUT_VIEN, ngayVN, type DuLieuIssue, type GoiIssue } from "./chung";

type Tep = { id: string; ten: string; kich_thuoc: number };
export interface NhapViecIssue {
  /** "nguoi|id" | "don_vi|id" | "" */
  giaoCho: string;
  /** 🤖 căn cứ AI chọn người (rỗng = máy điền hoặc người chọn) */
  canCu: string;
  ten: string;
  han: string;
  kq: string;
  tep: Tep[];
}
export type DatNhap = (id: string, f: (n: NhapViecIssue) => Partial<NhapViecIssue>) => void;

const tenNgan = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
// Đợt ⑤ (06/10): nháp mặc định + nhận dạng thẻ nhắc chuyển về lib/cay-viec/issue/nhap-thuan.ts — MỘT chỗ cho màn lẫn máy chủ
const tenWbsCuaDu = (t: TheCanhBao, du: DuLieuIssue) => tenWbsCua(t, du.so.dauViec);

/** Thẻ nào có khối giao việc: không phải đề xuất 🤖, của agent này và chưa đóng, người xem có quyền Giao việc */
// 07/10 (đợt 2): thẻ 🤖 AI đề xuất cũng có khối giao việc — Duyệt/Bác bỏ đã bỏ (khuôn Issue hai loại)
export const coKhoiViec = (t: TheCanhBao, du: DuLieuIssue) => !lyDoChanGhi(t) && du.quyen.giao;

/** Mã việc đã giao từ issue — đọc ở lịch sử ghi nhận */
export const maViecDaGiao = (t: TheCanhBao) => [...t.ghiNhan].reverse().map((g) => /CV-\d{4}-\d+/.exec(g.viecDaLam)?.[0]).find(Boolean) ?? null;

/** Mình giao được tới nơi này không — theo danh sách ô Giao cho (đã lọc quyền) */
function giaoDuoc(ds: NguoiNhanCV, loai: string, ma: string): boolean {
  const n = ds.nhom;
  if (!n) return loai === "nguoi" ? ds.nguoi.some((x) => x.id === ma) : ds.don_vi.some((x) => x.id === ma);
  return loai === "nguoi" ? n.ca_nhan.includes(ma) : n.lanh_dao.includes(ma) || n.cay.some((c) => c.id === ma);
}

/** Bản nháp từng issue + danh sách nơi nhận — giữ ở màn Issue để khối trái và ô Sửa bên phải dùng chung */
export function useNhapViecIssue(du: DuLieuIssue | null, dsThe: TheCanhBao[]) {
  const [ds, setDs] = useState<NguoiNhanCV | null>(null);
  const [loiDs, setLoiDs] = useState("");
  const [nhap, setNhap] = useState<Record<string, NhapViecIssue>>({});
  const [aiDang, setAiDang] = useState<string | null>(null);
  const [aiTin, setAiTin] = useState<Record<string, string>>({});
  const daHoiAi = useRef(new Set<string>());
  const duAnId = du?.duAn.id;

  useEffect(() => {
    if (!duAnId || !du?.quyen.giao) return;
    let huy = false;
    goiApi<NguoiNhanCV>("/api/cay-viec/soan-giao", { body: { du_an: duAnId, ds_nguoi: true } })
      .then((d) => !huy && setDs(d))
      .catch((e) => !huy && setLoiDs(e instanceof Error ? e.message : String(e)));
    return () => {
      huy = true;
    };
  }, [duAnId, du?.quyen.giao]);

  // Bản nháp mặc định cho thẻ mới hiện — máy điền người đang giữ việc (code, không AI)
  useEffect(() => {
    if (!du || !ds) return;
    setNhap((cu) => {
      let doi = false;
      const ra = { ...cu };
      for (const t of dsThe) {
        // Thẻ nhắc (Q4) không có nháp — khối của nó là Mở việc cũ / Nhắc người giữ việc
        if (ra[t.id] || !coKhoiViec(t, du) || laTheNhac(t)) continue;
        // Cùng hàm với máy chủ (bảng tổng ở Main đọc đúng bản nháp này)
        const m = nhapMacDinh(t, { duAnTen: du.duAn.ten, homNay: du.homNay, dauViec: du.so.dauViec });
        ra[t.id] = { giaoCho: "", canCu: "", ten: m.ten, han: m.han, kq: m.kq, tep: [] };
        doi = true;
      }
      return doi ? ra : cu;
    });
  }, [du, ds, dsThe]);

  // Issue găng chưa có người nhận → 🤖 AI chọn theo lịch sử, LẦN LƯỢT từng thẻ. Đợt ⑤ (06/10): máy chủ NHỚ kết quả —
  // lần mở trang sau đọc lại, không gọi AI (route soan-giao trả `tu_bo_nho`)
  useEffect(() => {
    if (!du || !ds || aiDang) return;
    const t = dsThe.find((x) => laNutGang(x) && coKhoiViec(x, du) && x.xuLy !== "da-giao-viec" && !dangBoQua(x) && !daHoiAi.current.has(x.id) && nhap[x.id] && !nhap[x.id].giaoCho);
    if (!t) return;
    daHoiAi.current.add(t.id);
    setAiDang(t.id);
    const dv = du.so.dauViec?.[t.wbs!];
    goiApi<{ ok: boolean; de_xuat?: { giao_cho: string; loai: "nguoi" | "don_vi"; ten_day_du: string; can_cu: string }; thong_diep?: string; trung?: string }>("/api/cay-viec/soan-giao", {
      body: { du_an: du.duAn.id, soan: { ma_wbs: t.wbs, ten: tenWbsCuaDu(t, du), han: dv?.end ?? t.hanXuLy ?? null } },
    })
      .then((j) => {
        const d = j.de_xuat;
        if (j.ok && d && giaoDuoc(ds, d.loai, d.giao_cho)) {
          setNhap((cu) => (cu[t.id] && !cu[t.id].giaoCho ? { ...cu, [t.id]: { ...cu[t.id], giaoCho: `${d.loai}|${d.giao_cho}`, canCu: d.can_cu } } : cu));
        } else if (j.ok && d) {
          setAiTin((x) => ({ ...x, [t.id]: `🤖 AI gợi ý ${d.ten_day_du} — bạn không giao thẳng được, chọn nơi nhận ở ô bên dưới.` }));
        } else if (j.trung) setAiTin((x) => ({ ...x, [t.id]: `🤖 ${j.trung}` }));
        else setAiTin((x) => ({ ...x, [t.id]: j.thong_diep ?? "AI chưa chọn được người nhận — chọn ở ô bên dưới." }));
      })
      .catch((e) => setAiTin((x) => ({ ...x, [t.id]: e instanceof Error ? e.message : "Không gọi được máy chủ." })))
      .finally(() => setAiDang(null));
  }, [du, ds, dsThe, nhap, aiDang]);

  const datNhap: DatNhap = useCallback((id, f) => setNhap((cu) => (cu[id] ? { ...cu, [id]: { ...cu[id], ...f(cu[id]) } } : cu)), []);
  return { ds, loiDs, nhap, datNhap, aiDang, aiTin };
}
export type NhapIssue = ReturnType<typeof useNhapViecIssue>;

/** Tên nơi nhận đang chọn */
function tenNhanCua(ds: NguoiNhanCV | null, giaoCho: string): string {
  const [loai, ma] = giaoCho.split("|");
  if (!ma) return "";
  return (loai === "don_vi" ? ds?.don_vi.find((x) => x.id === ma)?.ten : ds?.nguoi.find((x) => x.id === ma)?.ten) ?? ma;
}
// Không gửi việc có hạn đã qua (Mr. Đại chốt 04/10 tối)
const thieuCua = (n: NhapViecIssue, homNay: string) =>
  !n.ten.trim() ? "Chưa có nội dung việc" : !n.giaoCho ? "Chưa chọn người nhận" : !n.han ? "Chưa có hạn" : n.han < homNay ? "Hạn đã qua — bấm Sửa chọn hạn mới" : "";

/** Gửi Giao việc — NGƯỜI bấm mới tạo việc trong sổ cái (AI không tự ghi) */
async function giaoTuNhap(t: TheCanhBao, du: DuLieuIssue, n: NhapViecIssue, goi: GoiIssue, vanSoan = false) {
  return goi({ id: t.id, hanhDong: "giao-viec", giao_cho: n.giaoCho, han: n.han, ten: n.ten, ket_qua_can_co: n.kq, ten_wbs: tenWbsCuaDu(t, du), can_cu: n.canCu || undefined, dinh_kem: n.tep.map((x) => x.id), ...(vanSoan ? { van_soan: true } : {}) });
}

/** Câu trùng (Luật 33) + nút gửi lại kèm van_soan — chữ thuần, chỉ nút có viền (luật 28) */
function DongTrung({ chu, dang, lamLai }: { chu: string; dang: boolean; lamLai: () => void }) {
  return (
    <div className="mt-1 text-text-secondary" data-gt="iss:trung-viec">
      🤖 {chu}
      <div className="mt-1">
        <button type="button" disabled={dang} data-lenh="issue.van-giao-rieng" onClick={lamLai} className={NUT_VIEN}>
          Vẫn giao việc riêng
        </button>
      </div>
    </div>
  );
}

/** Khối dưới thẻ ở danh sách trái */
export function KhoiViecIssue({ t, du, goi, nh, moSua }: { t: TheCanhBao; du: DuLieuIssue; goi: GoiIssue; nh: NhapIssue; moSua: () => void }) {
  const [dang, setDang] = useState(false);
  const [tin, setTin] = useState<{ ok: boolean; chu: string } | null>(null);
  const [trung, setTrung] = useState<string | null>(null);
  const n = nh.nhap[t.id];
  const giaoKhoi = async (vanSoan: boolean) => {
    setTrung(null);
    const r = await giaoTuNhap(t, du, n!, goi, vanSoan);
    if (r?.trung) setTrung(r.trung);
  };

  const lam = async (f: () => Promise<unknown>) => {
    setDang(true);
    setTin(null);
    try {
      await f();
    } catch (e) {
      setTin({ ok: false, chu: e instanceof Error ? e.message : "Không gọi được máy chủ." });
    } finally {
      setDang(false);
    }
  };

  if (t.xuLy === "da-giao-viec") {
    const ma = maViecDaGiao(t);
    return (
      <div className="mt-1.5 px-1 text-[11.5px] font-semibold text-green" data-gt="iss:khoi-da-giao">
        {/* Loại 1 "đã là việc": bấm mở việc ở Sơ đồ (thẻ việc đầy đủ) */}
        {ma ? (
          <a href={`/so-do?viec=${encodeURIComponent(ma)}`} className="hover:underline" data-lenh="issue.mo-viec-da-giao">
            ✓ Đã giao việc {ma}
          </a>
        ) : (
          "✓ Đã giao việc"
        )}
      </div>
    );
  }
  if (t.khongCanGiao && dangBoQua(t)) {
    return (
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 px-1 text-[11px] text-text-muted" data-gt="iss:khoi-khong-can-giao">
        {/* 07/10 khuôn Issue hai loại: thẻ bỏ qua chỉ thấy ở "Hiện lại bỏ qua" — một dòng + nút Hiện lại */}
        <span>
          Đã bỏ qua — {t.khongCanGiao.nguoi}, {ngayVN(t.khongCanGiao.luc.slice(0, 10))}
        </span>
        <button type="button" disabled={dang} data-lenh="issue.bo-khong-can-giao" data-gt="iss:bo-khong-can-giao" onClick={() => void lam(() => goi({ id: t.id, hanhDong: "khong-can-giao", bo: true }))} className="font-semibold text-accent hover:text-accent-hover disabled:opacity-50">
          Hiện lại
        </button>
        {tin && <span className="text-red">{tin.chu}</span>}
      </div>
    );
  }
  if (laTheNhac(t)) return <KhoiNhacViecCu t={t} goi={goi} />;
  if (!n) return <div className="mt-1.5 px-1 text-[11px] text-text-muted">{nh.loiDs || "Đang soạn sẵn việc giao…"}</div>;

  const tenNhan = tenNhanCua(nh.ds, n.giaoCho);
  const thieu = thieuCua(n, du.homNay);
  const gang = laNutGang(t);
  const aiTin = nh.aiTin[t.id];
  return (
    <div className="mt-1.5 text-[11.5px]" data-gt="iss:khoi-viec">
      {/* Ô trình bày — một khối chữ, không chia cột */}
      <div className="rounded-sm border border-border bg-bg px-3 py-2.5 leading-relaxed">
        <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-accent">
          {gang ? "🤖 AI soạn sẵn" : "✎ Soạn sẵn từ issue"} — chưa gửi đi đâu cả
        </div>
        <div>
          <b className="text-text">Tên việc:</b> <span className="text-text-secondary">{n.ten}</span>
        </div>
        <div>
          <b className="text-text">Giao cho:</b>{" "}
          {tenNhan ? <b className="text-text">{tenNhan}</b> : <span className="text-text-muted">{nh.aiDang === t.id ? "🤖 AI đang chọn…" : "chưa chọn — chọn ở ô bên dưới"}</span>}
          {n.canCu && <i className="text-text-secondary"> — 🤖 {n.canCu}</i>}
        </div>
        <div>
          <b className="text-text">Thuộc dự án:</b> <span className="text-text-secondary">{du.duAn.ten}</span>
        </div>
        <div>
          <b className="text-text">Hạn:</b> <span className="text-text-secondary">{n.han ? khoangNgay(du.homNay, n.han) : "chưa có"}</span>
        </div>
        <div className="line-clamp-3">
          <b className="text-text">Kết quả cần có:</b> <span className="text-text-secondary">{n.kq || "—"}</span>
        </div>
        {n.tep.length > 0 && <div className="text-text-secondary">📎 {n.tep.length} file kẹp</div>}
        <div className="text-text-muted">
          Nguồn: issue {t.id}
          {gang ? ` · việc găng ${t.wbs} ${tenNgan(tenWbsCuaDu(t, du))}` : ""}
        </div>
      </div>
      {/* Ngoài ô: chọn người nhận + Giao việc · Sửa · Bỏ qua */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <OChonNoiNhan className="flex-1" ds={nh.ds} loiDs={nh.ds ? null : nh.loiDs || "Đang tải danh sách…"} value={n.giaoCho} onChange={(v) => nh.datNhap(t.id, () => ({ giaoCho: v, canCu: "" }))} giaTri="loai|id" />
        <button type="button" disabled={dang || !!thieu} data-lenh="issue.giao-viec" data-gt="iss:khoi-giao" onClick={() => void lam(() => giaoKhoi(false))} className={NUT_CHINH} title={thieu || "Tạo việc thật trong sổ cái"}>
          {dang ? "Đang giao…" : "Giao việc"}
        </button>
        <button type="button" disabled={dang} data-gt="iss:khoi-sua" onClick={moSua} className={NUT_VIEN} title="Sửa ở khung bên phải">
          Sửa
        </button>
        <button type="button" disabled={dang} data-lenh="issue.khong-can-giao" data-gt="iss:khoi-bo-qua" onClick={() => void lam(() => goi({ id: t.id, hanhDong: "khong-can-giao" }))} className={NUT_VIEN} title='Nhớ "không cần giao việc" cho issue này — bỏ đánh dấu được'>
          Bỏ qua
        </button>
      </div>
      {aiTin && !n.giaoCho && <div className="mt-1 text-text-secondary">{aiTin}</div>}
      {trung && <DongTrung chu={trung} dang={dang} lamLai={() => void lam(() => giaoKhoi(true))} />}
      {tin && <div className={`mt-1 ${tin.ok ? "text-text-secondary" : "text-red"}`}>{tin.chu}</div>}
    </div>
  );
}

/**
 * Q4 (Mr. Đại chốt 04/10 23:00) + 06/10: thẻ NHẮC (nhắc đóng việc · tồn việc quá hạn) KHÔNG giao việc mới — việc cũ đã có.
 * Mở việc cũ (nhắc bằng ý kiến @ trong thẻ việc) · Bỏ qua. Nút "Nhắc người giữ việc" bỏ 07/10 theo khuôn hai loại.
 */
function KhoiNhacViecCu({ t, goi }: { t: TheCanhBao; goi: GoiIssue }) {
  const [dang, setDang] = useState(false);
  const [tin, setTin] = useState<{ ok: boolean; chu: string } | null>(null);
  const viec = viecCuCuaThe(t);
  const lam = async (payload: Record<string, unknown>) => {
    setDang(true);
    setTin(null);
    try {
      const r = await goi(payload);
      if (r?.thong_diep) setTin({ ok: true, chu: r.thong_diep });
    } catch (e) {
      setTin({ ok: false, chu: e instanceof Error ? e.message : "Không gọi được máy chủ." });
    } finally {
      setDang(false);
    }
  };
  return (
    <div className="mt-1.5 text-[11.5px]" data-gt="iss:khoi-nhac">
      {/* Khuôn Issue hai loại (06/10): loại 1 "đã là việc" chỉ còn nút của THẺ VIỆC — nhắc = ý kiến @ trong việc; khối "Nhắc người
          giữ việc" BỎ (07/10, đợt 2) */}
      <div className="text-text-secondary">Issue nhắc — việc đã có trong sổ cái, không giao thêm. Mở thẻ việc để nhắc bằng ý kiến @ ngay trong việc.</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {viec.map((cv) => (
          <a key={cv} href={`/so-do?viec=${cv}`} target="_blank" rel="noreferrer" data-lenh="issue.mo-viec-cu" className={NUT_VIEN} title={`Mở thẻ việc ${cv} (tab mới)`}>
            Mở việc cũ {cv}
          </a>
        ))}
        <button type="button" disabled={dang} data-lenh="issue.khong-can-giao" data-gt="iss:khoi-bo-qua" onClick={() => void lam({ id: t.id, hanhDong: "khong-can-giao" })} className={NUT_VIEN} title='Nhớ "không cần xử lý" cho issue này — bỏ đánh dấu được'>
          Bỏ qua
        </button>
      </div>
      {tin && <div className={`mt-1 ${tin.ok ? "text-text-secondary" : "text-red"}`}>{tin.chu}</div>}
    </div>
  );
}

/** Ô Sửa ở khu phải — cùng bản nháp với khối dưới thẻ */
export function KhungSuaGiao({ t, du, goi, nh, xong, huy }: { t: TheCanhBao; du: DuLieuIssue; goi: GoiIssue; nh: NhapIssue; xong: () => void; huy: () => void }) {
  const n = nh.nhap[t.id];
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState("");
  const [trung, setTrung] = useState<string | null>(null);
  const [dangTaiTep, setDangTaiTep] = useState(false);
  const cdDk = useCaiDatDinhKem();
  const kep = useKepTep({ noi: "giao_viec", cd: cdDk, tep: n?.tep ?? [], setTep: (f) => nh.datNhap(t.id, (x) => ({ tep: f(x.tep) })), dangTai: setDangTaiTep });
  if (!coKhoiViec(t, du) || t.xuLy === "da-giao-viec" || dangBoQua(t) || laTheNhac(t)) return <div className="p-4 text-[12px] text-text-muted">Issue {t.id} không còn việc chờ giao.</div>;
  if (!n) return <div className="p-4 text-[12px] text-text-muted">{nh.loiDs || "Đang soạn sẵn việc giao…"}</div>;
  const dat = (k: keyof NhapViecIssue) => (v: string) => nh.datNhap(t.id, () => (k === "giaoCho" ? { giaoCho: v, canCu: "" } : { [k]: v }));
  const giao = async (vanSoan = false) => {
    setDang(true);
    setLoi("");
    setTrung(null);
    try {
      const r = await giaoTuNhap(t, du, n, goi, vanSoan);
      if (r?.trung) {
        setTrung(r.trung);
        setDang(false);
        return;
      }
      xong();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Chưa giao được.");
      setDang(false);
    }
  };
  return (
    <div className="p-4 text-[12px]" data-gt="iss:phai-sua-giao">
      <div className="mb-2 text-[10.5px] uppercase tracking-wider text-text-muted">
        Issue · {t.id} · {t.tieuDe}
      </div>
      <OGiaoSua
        tieuDe={laNutGang(t) ? "🤖 AI đã điền sẵn — sửa rồi bấm Giao việc" : "Đã điền sẵn từ issue — sửa rồi bấm Giao việc"}
        ds={nh.ds}
        tenGoiY={tenNhanCua(nh.ds, n.giaoCho)}
        fGiao={n.giaoCho}
        setFGiao={dat("giaoCho")}
        duAnTen={du.duAn.ten}
        fTen={n.ten}
        setFTen={dat("ten")}
        fKq={n.kq}
        setFKq={dat("kq")}
        fHan={n.han}
        setFHan={dat("han")}
        kep={kep}
        homNay={du.homNay}
        thieu={thieuCua(n, du.homNay)}
        dangGui={dang}
        dangTaiTep={dangTaiTep}
        onGiao={() => void giao()}
        onHuy={huy}
        lenh="issue.giao-viec"
        gt="iss"
      />
      {loi && <div className="mt-2 text-[11.5px] text-red">{loi}</div>}
      {trung && <div className="text-[11.5px]"><DongTrung chu={trung} dang={dang} lamLai={() => void giao(true)} /></div>}
      <div className="mt-2 text-[10px] text-text-muted">
        Chốt an toàn: <b>AI không tự ghi</b> — chỉ cú bấm Giao việc của người mới tạo việc trong sổ cái (có ghi lịch sử ai bấm, lúc nào) và ghi nhận issue sang “Đã giao việc”.
      </div>
    </div>
  );
}

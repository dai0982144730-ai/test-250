"use client";

// ============================================================
// MÀN CẢNH BÁO CỦA MAIN AGENT — PLAN-MAIN-AGENT mục 8b
//
// ⭐ 01/11/2026 (Mr. Đại duyệt demo bản 3 — KE-HOACH/40 mục 6; demo `public/demo/canh-bao-moi.html`):
//   trình bày theo khuôn «Việc của tôi». Bỏ 11 tab có số khoanh + emoji, thay bằng
//   · tầng 1 (ngoài cùng) = CHIP CHỦ ĐỀ — chỉ đếm nhóm chính nên các chip cộng lại đúng «Tất cả»
//     (tab cũ đặt «⭐ Cần anh xem» đếm trùng ngang hàng các nhóm → 60 issue mà cộng ra 62)
//   · tầng 2 = ô xổ AGENT + ô xổ MỨC ĐỘ QUAN TRỌNG (gộp lọc + xếp, 5 lựa chọn theo thứ tự anh chốt)
//   · thẻ gọn 3–4 dòng, «Chi tiết ▾» bung mô tả · nguồn · điều kiện đóng · nút của Main TẠI CHỖ
//   · đoạn giải thích dài, khối nguyên tắc, câu chú thích lặp ở mọi thẻ → nút «? Hướng dẫn»
// AI xếp chủ đề + chọn «cần anh xem» tự chạy mỗi đêm 02:30 (lib/issue-main/nhip-dem.ts); nút tay giữ lại.
// Chế độ «xếp theo WBS» (A10a) và «đã đóng — xem lại» giữ nguyên chức năng, chuyển thành link nhỏ ở chân.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { DONG_MOT_TRANG, PhanTrang, usePhanTrang } from "@/components/common/PhanTrang";
import { TheIssueCard } from "@/components/tabs/issue-main/TheIssueCard";
import {
  MOI_NHOM,
  MO_TA_NHOM,
  NHAN_NHOM,
  locIssue,
  nhomChinhCuaIssue,
  cauThieuThe,
  demKhoiWbs,
  neoTheWbs,
  xepTheoWbs,
  tieuDeNgan,
  MA_MAIN,
  type IssueMain,
  type KhoiWbs,
  type ThieuThe,
} from "@/lib/issue-main/model";
import { chuaPhanLoai } from "@/lib/issue-main/phan-loai";
import {
  BO_LOC_DAU,
  QUAN_TRONG,
  cacAgent,
  dsHien,
  nenLoc,
  quaLoc,
  trenGang,
  type BoLoc,
  type MaQuanTrong,
} from "@/lib/issue-main/loc-man";
import { LY_DO_CHAN } from "@/lib/quyen";
import { ngayGioVN, ngayTrongChu } from "@/lib/ngay-hien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import { TheNhap } from "@/components/tabs/viec/TheNhap";
import "@/components/tabs/viec/phai-viec.css";
import { maNhanTuGoiY, type NguoiNhanCV, type NhapHien } from "@/lib/chung/viec-cong-viec-kieu";

/** Nhãn chủ đề không emoji (01/11: «icon rườm rà») — NHAN_NHOM luôn là «<emoji> <chữ>», bỏ cụm đầu tới khoảng trắng */
const tenChuDe = (n: (typeof MOI_NHOM)[number]): string => NHAN_NHOM[n].slice(NHAN_NHOM[n].indexOf(" ") + 1).trim();

const CHIP = "rounded-lg border px-1.5 py-1 text-[12px] transition disabled:cursor-default disabled:opacity-40";
const CHIP_CHON = "border-accent bg-accent-soft font-semibold text-accent";
const CHIP_THUONG = "border-border bg-surface text-text hover:border-accent/50";
const O_XO = "w-full rounded-lg border border-border bg-surface px-2 py-1 text-[12px] text-text";
const LINK = "font-semibold text-accent hover:underline disabled:opacity-50";

export function IssueMainView({
  issue,
  chuaGom,
  thieuThe = [],
  khongCoIssue = [],
  lanPhanLoaiCuoi,
  lanChonCuoi,
  choPhepChay,
  lyDoChanCanXem = null,
  tenWbs = {},
  loiTenWbs = null,
  lienKetAgent = {},
}: {
  issue: IssueMain[];
  chuaGom: { ma: string; ten: string; lyDo: string }[];
  /** Con nào còn thẻ chưa lấy về vì chạm trần cổng (lỗi đo 25/09) */
  thieuThe?: ThieuThe[];
  /** Con nào đã trả lời mà sổ không có thẻ đang mở — chữ thường, không ô vàng */
  khongCoIssue?: { ma: string; ten: string }[];
  lanPhanLoaiCuoi: string;
  lanChonCuoi: string;
  /** Chạy LLM tốn token — cửa "ghi" (quyen.ts); không qua thì nút MỜ kèm lý do */
  choPhepChay: boolean;
  /** 18/10/2026: «Cần anh xem» lưu chung cả dự án — người chưa thấy hết thẻ thì nút MỜ kèm câu này (luật 17) */
  lyDoChanCanXem?: string | null;
  /** A10a — tên việc theo mã WBS, lấy từ Agent Tiến độ */
  tenWbs?: Record<string, string>;
  loiTenWbs?: string | null;
  /** Địa chỉ màn Cảnh báo của từng agent (Danh bạ agent) — cho nút «Mở ở agent →» */
  lienKetAgent?: Record<string, string>;
}) {
  const [bo, setBo] = useState<BoLoc>(BO_LOC_DAU);
  const [xemDaDong, setXemDaDong] = useState(false);
  const [theoWbs, setTheoWbs] = useState(false);
  /** 👁 Hiện tất cả (6e.3) — thẻ ẩn chỉ rời mắt, không rời sổ */
  const [hienAn, setHienAn] = useState(false);
  const [dangChay, setDangChay] = useState(false);
  const [bao, setBao] = useState<{ ok: boolean; loi: string } | null>(null);
  const [duLieu, setDuLieu] = useState<IssueMain[]>(issue);
  const [ganNhat, setGanNhat] = useState({ phanLoai: lanPhanLoaiCuoi, chon: lanChonCuoi });
  // 01/11/2026 (Mr. Đại): issue đã có nháp giao việc («Agent AI đề xuất giao việc» ở Việc của tôi) → nút «Giao việc ▾»
  // BUNG ĐÚNG THẺ NHÁP ĐÓ TẠI CHỖ (TheNhap dùng chung), không phải chuyển màn; chưa có nháp → «Mở ở agent gốc».
  // Đọc sau khi màn hiện (gom nháp phải hỏi các agent — không bắt màn chờ).
  const [nhapTheoIssue, setNhapTheoIssue] = useState<Record<string, NhapHien>>({});
  const [nguoiNhan, setNguoiNhan] = useState<NguoiNhanCV | null>(null);
  const [loiNguoiNhan, setLoiNguoiNhan] = useState<string | null>(null);
  const [chonNhan, setChonNhan] = useState<Record<string, string>>({});
  const [dangGuiNhap, setDangGuiNhap] = useState<string | null>(null);
  async function taiNhap(): Promise<void> {
    try {
      const j = (await (await fetch("/api/viec", { cache: "no-store" })).json()) as { ok: boolean; nhapAi?: NhapHien[] };
      if (!j.ok) return;
      const m: Record<string, NhapHien> = {};
      for (const n of j.nhapAi ?? []) if (n.tuIssue && !m[n.tuIssue]) m[n.tuIssue] = n;
      setNhapTheoIssue(m);
    } catch {
      /* không đọc được nháp — thẻ vẫn trỏ agent gốc */
    }
  }
  useEffect(() => {
    let con = true;
    void (async () => {
      await taiNhap();
      try {
        const k = (await (await fetch("/api/viec/nguoi-nhan", { cache: "no-store" })).json()) as { ok: boolean; ds?: NguoiNhanCV; message?: string };
        if (!con) return;
        if (k.ok && k.ds) setNguoiNhan(k.ds);
        else setLoiNguoiNhan(k.message ?? "Không lấy được danh sách người nhận");
      } catch {
        if (con) setLoiNguoiNhan("Không gọi được máy chủ app");
      }
    })();
    return () => {
      con = false;
    };
  }, []);

  /** Giao / Bỏ qua một nháp ngay trên màn Cảnh báo — cùng cửa POST /api/viec với Việc của tôi */
  async function xuLyNhap(n: NhapHien, payload: Record<string, unknown>, xongThi: string): Promise<void> {
    setDangGuiNhap(n.id);
    setBao(null);
    try {
      const j = (await (await fetch("/api/viec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json()) as {
        ok: boolean;
        message?: string;
        maViec?: string;
      };
      if (j.ok) {
        setNhapTheoIssue((m) => {
          const moi = { ...m };
          if (n.tuIssue) delete moi[n.tuIssue];
          return moi;
        });
        setBao({ ok: true, loi: `${xongThi}${j.maViec ? ` — việc ${j.maViec} ở agent Công việc` : ""}` });
      } else setBao({ ok: false, loi: j.message ?? "Có lỗi, thử lại." });
    } catch {
      setBao({ ok: false, loi: "Không gọi được máy chủ app — thử lại sau vài giây." });
    } finally {
      setDangGuiNhap(null);
    }
  }
  // 01/11/2026 đợt 2: «✎ AI soạn việc giao» · «Bỏ qua» trên issue của agent khác — Main gọi cổng agent gốc chạy thay người bấm
  const [dangIssue, setDangIssue] = useState<string | null>(null);
  /** Câu «đã có agent soạn việc trùng» (luật 33) theo issue — hiện dưới thẻ kèm nút «Vẫn soạn việc riêng» */
  const [trungTheoIssue, setTrungTheoIssue] = useState<Record<string, string>>({});
  async function lenhIssue(i: IssueMain, hanhDong: "soan-viec-issue" | "bo-qua-issue", vanSoan = false): Promise<void> {
    setDangIssue(i.id);
    setBao(null);
    try {
      const j = (await (
        await fetch("/api/issue-main", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong, agent: i.agentChu, id: i.id, vanSoan }),
        })
      ).json()) as { ok: boolean; message?: string; trung?: string | null };
      if (j.ok && hanhDong === "bo-qua-issue") setDuLieu((d) => d.filter((x) => !(x.id === i.id && x.agentChu === i.agentChu)));
      if (j.ok && hanhDong === "soan-viec-issue") {
        setTrungTheoIssue((t) => {
          const moi = { ...t };
          if (j.trung) moi[i.id] = j.trung;
          else delete moi[i.id];
          return moi;
        });
        if (!j.trung) await taiNhap();
      }
      setBao({ ok: j.ok, loi: j.message ?? (j.ok ? "Xong." : "Có lỗi, thử lại.") });
    } catch {
      setBao({ ok: false, loi: "Không gọi được máy chủ app — thử lại sau vài giây." });
    } finally {
      setDangIssue(null);
    }
  }
  const tenNhanCua = (ma: string) => nguoiNhan?.don_vi.find((d) => d.id === ma)?.ten ?? nguoiNhan?.nguoi.find((x) => x.id === ma)?.ten ?? "";
  function veNhap(n: NhapHien): React.ReactNode {
    const maNhan = chonNhan[n.id] ?? maNhanTuGoiY(nguoiNhan, n.giaoCho);
    return (
      <div className="trai-viec mt-2 p-1">
        <TheNhap
          n={n}
          ds={nguoiNhan}
          loiDs={loiNguoiNhan}
          maNhan={maNhan}
          onChonNhan={(x) => setChonNhan((c) => ({ ...c, [n.id]: x }))}
          duocGhi={choPhepChay}
          dang={dangGuiNhap === n.id}
          onGiao={(han) => void xuLyNhap(n, { action: "gui-nhap", id: n.id, agent: n.agent, giaoCho: maNhan, tenNhan: tenNhanCua(maNhan), ...(han ? { han } : {}) }, `✓ Đã giao cho ${tenNhanCua(maNhan) || "người đã chọn"}`)}
          // Ô Sửa (đổi tên, hạn, tệp…) nằm ở Việc của tôi — mở thẳng nháp đó và bật ô Sửa
          onSua={() => {
            window.location.href = `/viec-cua-toi?nhap=${encodeURIComponent(n.id)}&sua=1`;
          }}
          onBo={() => void xuLyNhap(n, { action: "bo-nhap", id: n.id, agent: n.agent }, "Đã bỏ qua nháp này")}
        />
      </div>
    );
  }

  const loc = useMemo(() => locIssue(duLieu), [duLieu]);
  const nen = useMemo(() => nenLoc(duLieu, xemDaDong, hienAn), [duLieu, xemDaDong, hienAn]);
  const soAn = useMemo(() => duLieu.filter((i) => i.an && !i.daDong).length, [duLieu]);
  const chuaXep = useMemo(() => chuaPhanLoai(duLieu), [duLieu]);
  const agent = useMemo(() => cacAgent(nen), [nen]);
  const ds = useMemo(() => dsHien(nen, bo), [nen, bo]);
  const pt = usePhanTrang(ds, JSON.stringify([bo, xemDaDong, hienAn]));
  const khoiWbs = useMemo(() => (theoWbs ? xepTheoWbs(duLieu.filter((i) => hienAn || !i.an), tenWbs, xemDaDong) : []), [theoWbs, duLieu, hienAn, tenWbs, xemDaDong]);

  const dsChuDe = quaLoc(nen, bo, "chuDe");
  const dsAgent = quaLoc(nen, bo, "agent");
  const dsQuanTrong = quaLoc(nen, bo, "quanTrong");
  const doi = (p: Partial<BoLoc>) => setBo((b) => ({ ...b, ...p }));

  async function chay(lenh: "phan-loai-lai" | "can-anh-xem" | Record<string, unknown>): Promise<void> {
    const hanhDong = typeof lenh === "string" ? { hanhDong: lenh } : lenh;
    setDangChay(true);
    setBao(null);
    try {
      const r = await fetch("/api/issue-main", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hanhDong),
      });
      const j = (await r.json()) as { ok: boolean; message?: string; issue?: IssueMain[]; lanPhanLoaiCuoi?: string; lanChonCuoi?: string };
      setBao({ ok: j.ok, loi: j.message ?? "" });
      if (Array.isArray(j.issue)) setDuLieu(j.issue);
      setGanNhat({ phanLoai: j.lanPhanLoaiCuoi ?? ganNhat.phanLoai, chon: j.lanChonCuoi ?? ganNhat.chon });
    } catch {
      setBao({ ok: false, loi: "Không gọi được máy chủ." });
    } finally {
      setDangChay(false);
    }
  }
  const nutThe: NutThe = { choPhepGhi: choPhepChay, dangGui: dangChay, goi: chay };

  return (
    <div className="space-y-3">
      <KhaiHuongDan ma={theoWbs ? "issue-wbs" : "issue-canh-bao"} />

      {!theoWbs && (
        <SectionCard title="">
          <div className="space-y-2">
            {/* ===== TẦNG 1 — CHỦ ĐỀ (ngoài cùng). Chỉ nhóm chính: các chip cộng lại đúng «Tất cả» ===== */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="group" aria-label="Lọc theo chủ đề">
              {(["", ...MOI_NHOM] as const).map((n) => {
                const so = n === "" ? dsChuDe.length : dsChuDe.filter((i) => nhomChinhCuaIssue(i) === n).length;
                return (
                  <button
                    key={n || "tat-ca"}
                    type="button"
                    disabled={n !== "" && so === 0 && bo.chuDe !== n}
                    onClick={() => doi({ chuDe: n })}
                    data-lenh="alerts.chu-de"
                    data-gia-tri={n === "" ? "Tất cả" : tenChuDe(n)}
                    title={n === "" ? "Mọi chủ đề" : MO_TA_NHOM[n]}
                    className={`${CHIP} ${bo.chuDe === n ? CHIP_CHON : CHIP_THUONG}`}
                  >
                    {n === "" ? "Tất cả" : tenChuDe(n)} ({so})
                  </button>
                );
              })}
            </div>

            {/* ===== TẦNG 2 — AGENT · MỨC ĐỘ QUAN TRỌNG. Chọn là áp, không nút xác nhận (quy tắc 4) ===== */}
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={bo.agent}
                onChange={(e) => doi({ agent: e.target.value })}
                data-lenh="alerts.agent"
                aria-label="Lọc theo agent"
                className={O_XO}
              >
                <option value="">Mọi agent ({dsAgent.length})</option>
                {agent.map((a) => (
                  <option key={a.ma} value={a.ma}>
                    {a.ten} ({dsAgent.filter((i) => i.agentChu === a.ma).length})
                  </option>
                ))}
              </select>
              <select
                value={bo.quanTrong}
                onChange={(e) => doi({ quanTrong: e.target.value as MaQuanTrong })}
                data-lenh="alerts.muc-do-quan-trong"
                aria-label="Mức độ quan trọng"
                className={O_XO}
              >
                {QUAN_TRONG.map((q) => (
                  <option key={q.ma} value={q.ma}>
                    {q.nhan} ({dsQuanTrong.filter(q.loc).length})
                  </option>
                ))}
              </select>
            </div>

            {/* ===== DÒNG SỐ — một dòng, đếm trên đúng danh sách đang hiện ===== */}
            <div className="text-[12.5px] text-text">
              <b>{ds.length}</b> issue {xemDaDong ? "đã đóng" : "đang mở"} ·{" "}
              <b className="text-red">{ds.filter((i) => i.mucDo === "do").length} nghiêm trọng</b> ·{" "}
              {ds.filter(trenGang).length} trên đường găng
              {soAn > 0 && !xemDaDong && (
                <>
                  {" · "}
                  <button type="button" onClick={() => setHienAn(!hienAn)} data-lenh="issue-main.hien-tat-ca" className={LINK}
                    title="Ẩn không trừ vào tổng — ẩn để đỡ rối mắt, không phải để tự lừa mình là hết việc (6e.3)">
                    {hienAn ? "thu lại thẻ ẩn" : `hiện ${soAn} thẻ đang ẩn`}
                  </button>
                </>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ===== NÓI THẲNG: chưa gom được · còn thẻ chưa lấy về · bị giữ lại ===== */}
      {chuaGom.length > 0 && (
        <div className="rounded-sm border border-yellow/30 bg-yellow-soft px-3 py-2 text-[11px] leading-relaxed text-text-secondary">
          <b className="text-text">Danh sách thiếu phần của:</b> {chuaGom.map((c) => c.lyDo).join(" · ")}
        </div>
      )}
      {thieuThe.length > 0 && (
        <div className="rounded-sm border border-yellow/30 bg-yellow-soft px-3 py-2 text-[11px] leading-relaxed text-text-secondary">
          {thieuThe.map((t) => (
            <div key={t.ma}>
              {cauThieuThe(t)}
              {t.lienKet ? (
                <>
                  {" "}— <a href={t.lienKet} target="_blank" rel="noreferrer" className={LINK}>xem đủ ở màn Cảnh báo của {t.ten}</a>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {loc.loai.length > 0 && (
        <div className="text-[11px] text-text-muted" title={loc.loai.map((l) => `${l.issue.id}: ${l.lyDo}`).join("\n")}>
          {loc.loai.length} issue bị giữ lại, không hiện: thiếu nguồn hoặc thiếu điều kiện đóng (luật A.4.1 · A.4.5).
        </div>
      )}
      {bao && <div className={`text-[11.5px] ${bao.ok ? "text-green" : "text-red"}`}>{bao.loi}</div>}

      {/* ===== DANH SÁCH THẺ ===== */}
      {theoWbs ? (
        <CheDoWbs khoi={khoiWbs} loiTenWbs={loiTenWbs} xemDaDong={xemDaDong} nutThe={nutThe} />
      ) : (
        <div className="space-y-2" data-khoi-trang>
          {pt.phan.length === 0 && (
            <div className="text-[12px] text-text-muted">
              {nen.length === 0 && !xemDaDong ? "Không có issue nào đang mở." : "Không có issue nào khớp bộ lọc."}
            </div>
          )}
          {pt.phan.map((i) => (
            <TheGon key={`${i.agentChu}-${i.id}`} i={i} lienKet={lienKetAgent[i.agentChu]} nhap={nhapTheoIssue[i.id] ? veNhap(nhapTheoIssue[i.id]!) : undefined} nutThe={nutThe}
              nutIssue={{ duocGhi: choPhepChay, dang: dangIssue === i.id, trung: trungTheoIssue[i.id], goi: (hd, van) => void lenhIssue(i, hd, van) }} />
          ))}
          <PhanTrang trang={pt.trang} soTrang={pt.soTrang} tong={pt.tong} onDoi={pt.doiTrang} donVi="issue" />
        </div>
      )}

      {khongCoIssue.length > 0 && (
        <div className="text-[11px] text-text-muted">{khongCoIssue.map((k) => `${k.ten}: không có issue đang mở`).join(" · ")}</div>
      )}

      {/* ===== CHÂN MÀN — AI xếp chủ đề (tự chạy đêm) · nút tay · đã đóng · WBS ===== */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-light pt-2 text-[11px] text-text-muted">
        <span>
          🤖 Chủ đề AI xếp lúc {ganNhat.phanLoai ? ngayGioVN(ganNhat.phanLoai) : "— chưa chạy"}
          {chuaXep.length > 0 ? ` · ${chuaXep.length} issue chưa xếp (đang ở «Khác»)` : ""} · tự chạy mỗi đêm 02:30
        </span>
        <button type="button" disabled={dangChay || !choPhepChay} onClick={() => void chay("phan-loai-lai")} data-lenh="issue-main.phan-loai-lai"
          title={choPhepChay ? "AI xếp lại chủ đề ngay bây giờ" : LY_DO_CHAN.ghi} className={LINK}>
          {dangChay ? "Đang chạy…" : "Xếp lại ngay"}
        </button>
        <span>
          🤖 «Cần anh xem» AI chọn lúc {ganNhat.chon ? ngayGioVN(ganNhat.chon) : "— chưa chạy"}
        </span>
        <button type="button" disabled={dangChay || !choPhepChay || lyDoChanCanXem !== null} onClick={() => void chay("can-anh-xem")}
          data-lenh="issue-main.chon-can-xem" title={!choPhepChay ? LY_DO_CHAN.ghi : (lyDoChanCanXem ?? "AI chọn lại việc cần anh xem ngay bây giờ")} className={LINK}>
          Chọn lại ngay
        </button>
        <span className="ml-auto flex gap-3">
          <button type="button" onClick={() => setXemDaDong(!xemDaDong)} data-lenh="issue-main.pham-vi" className={LINK}>
            {xemDaDong ? "← Về issue đang mở" : "Xem issue đã đóng"}
          </button>
          <button type="button" onClick={() => setTheoWbs(!theoWbs)} data-lenh="issue-main.xep-theo" className={LINK}
            title="Mỗi mã WBS một khối, issue của từng agent đặt cạnh nhau">
            {theoWbs ? "← Về lọc theo chủ đề" : "Xem theo WBS"}
          </button>
        </span>
      </div>
    </div>
  );
}

// ==========================================================
// THẺ GỌN — khuôn thẻ «Việc của tôi» (01/11/2026)
// Dòng nhãn (mức độ · chủ đề · agent) → tên → số ảnh hưởng · găng · WBS → 🤖 lý do nếu AI chọn
// → nút. «Chi tiết ▾» bung thẻ đủ (mô tả, nguồn, điều kiện đóng, nút của Main) TẠI CHỖ.
// ==========================================================
/** Agent đã mở hai cổng issue (đợt 2, 01/11/2026). Nghiệm thu · Pháp lý · Công việc chưa có — nút mờ kèm lý do */
const AGENT_CO_CONG_ISSUE = new Set(["tiendo", "hopdong"]);
type NutIssue = { duocGhi: boolean; dang: boolean; trung?: string; goi: (hanhDong: "soan-viec-issue" | "bo-qua-issue", vanSoan?: boolean) => void };

function TheGon({ i, lienKet, nhap, nutThe, nutIssue }: { i: IssueMain; lienKet?: string; nhap?: React.ReactNode; nutThe: NutThe; nutIssue: NutIssue }) {
  // Đề xuất AI chờ duyệt (DX-, Main giữ sổ) bung sẵn — nút Duyệt/Bác phải thấy ngay, trợ lý AI cũng bấm được (G7 · G8)
  const [mo, setMo] = useState(i.agentChu === MA_MAIN && i.id.startsWith("DX-") && !i.daDong);
  // 01/11/2026 (Mr. Đại duyệt): thẻ issue Main theo ĐÚNG khuôn «Issue hai loại» của agent (chốt 06/10, KhoiGiaoViecThe ở
  // agent Tiến độ) — có nháp máy soạn thì khối nháp hiện LUÔN dưới thẻ; chưa có thì «✎ AI soạn việc giao» + «Bỏ qua».
  // Hai nút gọi cổng agent gốc (đợt 2) — agent chưa có cổng thì MỜ kèm lý do bằng chữ (luật 17).
  // Đã giao việc (agent gốc trả ma_viec) → chỉ hiện «✓ Đã giao việc …», không soạn lại.
  const laCuaAgentKhac = i.agentChu !== MA_MAIN && !i.daDong && !i.maViec;
  const coCong = AGENT_CO_CONG_ISSUE.has(i.agentChu);
  const lyDoMo = !coCong
    ? `Hai nút này chưa chạy từ Main — tạm làm ở ${i.tenAgentChu}.`
    : !nutIssue.duocGhi
      ? LY_DO_CHAN.ghi
      : nutIssue.dang
        ? "🤖 AI đang soạn — có thể mất tới một phút."
        : "";
  const ttin = [
    i.soNgayAnhHuong ? `Kéo lùi COD ${i.soNgayAnhHuong} ngày so với Baseline` : "",
    trenGang(i) ? "trên đường găng" : "",
    i.wbs ? `WBS ${i.wbs}` : "",
    i.doNguoiThem ? "người thêm" : i.doLlmSinh ? "🤖 AI phát hiện" : "",
    i.an ? "đang ẩn — vẫn đếm" : "",
  ].filter(Boolean);
  return (
    <div className="rounded-lg border border-border-light bg-surface px-3 py-2" data-wbs={i.id}>
      {/* 01/11/2026 (Mr. Đại: «quá nhiều màu sắc»): chỉ «Nghiêm trọng» đỏ (luật 18) và link xanh; còn lại chữ xám */}
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-text-muted">
        {i.mucDo === "do" ? <span className="text-red">Nghiêm trọng</span> : "Cần lưu ý"} · {tenChuDe(nhomChinhCuaIssue(i))} · {i.tenAgentChu}
        {i.daDong ? " · đã đóng" : ""}
      </div>
      <div className="my-0.5 text-[13px] font-semibold text-text">{ngayTrongChu(i.tieuDe.replace(/^⛓\s*/, ""))}</div>
      {ttin.length > 0 && <div className="text-[12px] text-text-muted">{ttin.join(" · ")}</div>}
      {i.lyDoChon && <div className="mt-0.5 text-[12px] text-text-muted">🤖 Vì sao cần anh xem: {i.lyDoChon}</div>}
      {/* Có nháp máy soạn sẵn → khối nháp hiện luôn (TheNhap — cùng thẻ với Việc của tôi): Giao việc · Sửa · Bỏ qua */}
      {nhap}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {i.maViec && <span className="text-[12px] font-semibold text-text">✓ Đã giao việc {i.maViec}</span>}
        {!nhap && laCuaAgentKhac && !nutIssue.trung && (
          <>
            <button type="button" disabled={!!lyDoMo} onClick={() => nutIssue.goi("soan-viec-issue")} data-lenh="issue-main.ai-soan-viec" data-wbs={i.id}
              title={lyDoMo || "AI ở agent gốc soạn nháp giao việc từ issue này — nháp hiện ngay dưới thẻ"}
              className="rounded-md border border-border px-2.5 py-0.5 text-[12px] text-text disabled:cursor-not-allowed disabled:opacity-50">
              {nutIssue.dang ? "Đang soạn…" : "✎ AI soạn việc giao"}
            </button>
            <button type="button" disabled={!!lyDoMo} onClick={() => nutIssue.goi("bo-qua-issue")} data-lenh="issue-main.bo-qua" data-wbs={i.id}
              title={lyDoMo || "Không hiện, không đếm issue này nữa ở mọi nơi; xem lại được 30 ngày"}
              className="rounded-md border border-border px-2.5 py-0.5 text-[12px] text-text disabled:cursor-not-allowed disabled:opacity-50">
              Bỏ qua
            </button>
          </>
        )}
        {lienKet && (
          <a href={lienKet} target="_blank" rel="noreferrer" data-lenh="issue-main.mo-o-agent" className="text-[12px] text-accent hover:underline">
            Mở ở {i.tenAgentChu} →
          </a>
        )}
        <button type="button" onClick={() => setMo(!mo)} data-lenh="issue-main.chi-tiet" data-wbs={i.id}
          className="ml-auto text-[12px] text-accent hover:underline" title={tieuDeNgan(i.tieuDe)}>
          {mo ? "Thu gọn ▴" : "Chi tiết ▾"}
        </button>
      </div>
      {!nhap && laCuaAgentKhac && lyDoMo && <div className="mt-1 text-[11px] text-text-muted">{lyDoMo}</div>}
      {/* Luật 33: agent khác đã soạn việc trùng — không soạn bản thứ hai, trừ khi người bấm muốn việc riêng */}
      {!nhap && laCuaAgentKhac && nutIssue.trung && (
        <div className="mt-1 text-[12px] text-text-muted">
          🤖 {nutIssue.trung}{" "}
          <button type="button" disabled={nutIssue.dang} onClick={() => nutIssue.goi("soan-viec-issue", true)} data-lenh="issue-main.van-soan" data-wbs={i.id}
            className="text-accent hover:underline disabled:opacity-50">
            Vẫn soạn việc riêng
          </button>
        </div>
      )}
      {mo && (
        <div className="mt-2">
          <TheIssueCard i={i} nutThe={nutThe} trongChiTiet />
        </div>
      )}
    </div>
  );
}

// ==========================================================
// CHẾ ĐỘ XẾP THEO WBS — A10a (Mr. Đại chốt 25/09, gốc J07)
// Mỗi mã WBS một khối; trong khối, issue của từng agent đứng CẠNH NHAU có nhãn
// agent. Không gộp, không "issue gốc" — mỗi agent giữ issue theo tiêu chí riêng.
// Thẻ dùng lại TheIssueCard, không vẽ thẻ mới.
// ==========================================================
function CheDoWbs({
  khoi,
  loiTenWbs,
  xemDaDong,
  nutThe,
}: {
  khoi: KhoiWbs[];
  loiTenWbs: string | null;
  xemDaDong: boolean;
  nutThe: NutThe;
}) {
  const dem = demKhoiWbs(khoi);
  const [sang, setSang] = useState<string | null>(null);
  // 30 khối WBS một trang (E40 — Mr. Đại 04/10)
  const pt = usePhanTrang(khoi, xemDaDong);
  /** Dòng trỏ → cuộn tới thẻ gom ở khối "… — gom theo người", viền sáng 2 giây.
   *  Khối gom nằm ở trang khác → sang trang đó trước rồi mới cuộn. */
  function toiThe(neo: string): void {
    const cuon = () => {
      const el = document.getElementById(neo);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setSang(neo);
      window.setTimeout(() => setSang((x) => (x === neo ? null : x)), 2000);
    };
    if (document.getElementById(neo)) return cuon();
    const viTri = khoi.findIndex((k) => k.loai === "gom" && k.theoAgent.some((a) => a.issue.some((i) => neoTheWbs(i.agentChu, i.id) === neo)));
    if (viTri < 0) return;
    pt.doiTrang(Math.floor(viTri / DONG_MOT_TRANG));
    window.setTimeout(cuon, 80);
  }
  return (
    <div className="space-y-4">
      {/* Chữ thuần — không khoanh (luật 28) */}
      <div className="text-[11.5px] leading-relaxed text-text-secondary">
        <b className="text-text">{dem.soKhoi}</b> mã WBS có issue ·{" "}
        <b className="text-text">{dem.soKhoiNhieuAgent}</b> mã có góc nhìn từ 2 agent trở lên (xếp
        lên đầu, tính cả dòng trỏ thẻ agent Công việc) ·{" "}
        {dem.soTheGom > 0 && (
          <>
            <b className="text-text">{dem.soTheGom}</b> thẻ agent Công việc gom theo người ·{" "}
          </>
        )}
        <b className="text-text">{dem.soChuaGan}</b> issue chưa gắn WBS (khối cuối).
        <span className="text-text-muted">
          {" "}Mỗi agent giữ issue theo tiêu chí riêng — khối chỉ đặt chúng cạnh nhau, không gộp.
        </span>
        {loiTenWbs && <div className="text-text-muted">{loiTenWbs}. Khối chỉ hiện mã WBS.</div>}
      </div>

      {khoi.length === 0 && (
        <SectionCard title="">
          <div className="py-6 text-[12px] text-text-muted">
            {xemDaDong ? "Chưa có issue đã đóng nào." : "Không có issue nào đang mở."}
          </div>
        </SectionCard>
      )}

      {pt.phan.map((k) => (
        <section key={k.ma ?? k.loai} className="space-y-2">
          <div className="border-b border-border pb-1 text-[12.5px]">
            {k.loai === "wbs" ? (
              <>
                <b className="font-mono text-text">WBS {k.ma}</b>{" "}
                <b className="text-text">{k.ten ?? ""}</b>
                {k.ten === null && !loiTenWbs && (
                  <span className="text-[11px] text-text-muted">(Agent Tiến độ không có tên việc cho mã này)</span>
                )}
              </>
            ) : (
              <b className="text-text">{k.loai === "gom" ? k.ten : "Chưa gắn WBS"}</b>
            )}
            <span className="text-[11px] text-text-muted">
              {" "}· {k.soIssue} issue{k.theoAgent.length > 0 ? ` · ${k.theoAgent.map((a) => a.ten).join(" · ")}` : ""}
            </span>
            {k.loai === "gom" && (
              <div className="text-[11px] text-text-muted">
                Mỗi thẻ gom nhiều việc của một người nên không nằm dưới một mã. Các thẻ này chứa việc
                của {dem.soMaTrongTheGom} mã WBS — {dem.soMaTrongTheGomCoKhoi} mã có khối riêng ở trên
                (dòng “Có trong thẻ …”), mã còn lại chưa có issue nào khác nên không mở khối.
              </div>
            )}
            {k.loai === "chua-gan" && (
              <div className="text-[11px] text-text-muted">
                Agent chủ không trả mã WBS cho các thẻ này (kể cả danh sách mã liên quan). Main
                không đoán mã từ tiêu đề.
              </div>
            )}
          </div>
          {k.theoAgent.length > 0 && (
            <div
              className={`grid gap-3 ${
                k.theoAgent.length >= 3
                  ? "lg:grid-cols-2 2xl:grid-cols-3"
                  : k.theoAgent.length === 2
                    ? "lg:grid-cols-2"
                    : ""
              }`}
            >
              {k.theoAgent.map((a) => (
                <div key={a.ma} className="min-w-0 space-y-2">
                  <div className="text-[11px] font-semibold text-text-secondary">
                    {a.ten} <span className="font-normal text-text-muted">({a.issue.length})</span>
                  </div>
                  {a.issue.map((i) => {
                    const neo = neoTheWbs(i.agentChu, i.id);
                    return (
                      <div
                        key={i.id}
                        id={k.loai === "gom" ? neo : undefined}
                        className={`scroll-mt-4 rounded-sm transition ${sang === neo ? "ring-2 ring-accent" : ""}`}
                      >
                        <TheIssueCard i={i} nutThe={nutThe} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          {/* Phương án a (25/09): dòng CHỮ trỏ tới thẻ gom — không khoanh viền (luật 28),
              chỉ phần tiêu đề là link bấm được. Thẻ gom KHÔNG nhân bản vào đây. */}
          {k.troGom.length > 0 && (
            <div className="space-y-0.5 text-[11.5px] text-text-secondary">
              {k.troGom.map((t) => {
                const neo = neoTheWbs(t.agentChu, t.id);
                return (
                  <div key={`${t.agentChu}-${t.id}`}>
                    Có trong thẻ {t.tenAgent}:{" "}
                    <a
                      href={`#${neo}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toiThe(neo);
                      }}
                      data-lenh="issue-main.toi-the-gom"
                      data-gia-tri={t.id}
                      className="text-accent hover:underline"
                    >
                      {t.tieuDeNgan} →
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
      <PhanTrang trang={pt.trang} soTrang={pt.soTrang} tong={pt.tong} onDoi={pt.doiTrang} donVi="khối WBS" />
    </div>
  );
}

// ==========================================================
// TAB ⭐ CẦN ANH XEM — 5 việc, KHÔNG điểm số (8b.3b)
// ==========================================================
/** Bộ điều khiển nút 🙈/🗑/Duyệt/Bác trên thẻ — chốt AQ 6e.3, chỉ thẻ Main giữ sổ */
export interface NutThe {
  choPhepGhi: boolean;
  dangGui: boolean;
  goi: (p: Record<string, unknown>) => Promise<void>;
}

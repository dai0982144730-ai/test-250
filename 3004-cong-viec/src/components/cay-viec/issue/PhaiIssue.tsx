"use client";
// ============================================================
// CỘT PHẢI của màn Cảnh báo (agent Công việc) — LUÔN HIỆN (Mr. Đại chốt 03/10/2026). Mọi chỗ bấm ở cột trái mở nội dung ở đây —
// không chuyển trang, không tab mới, không modal, không window.prompt/confirm/alert.
//   · chưa chọn gì → câu tổng + số đo lượt sinh + hướng dẫn bấm + nguyên tắc màn (Base: hộp 📐 dưới trang)
//   · một thẻ → chi tiết (07/10: nút Ghi nhận · Đóng · Ẩn · Xoá · Duyệt/Bác bỏ đã BỎ — khuôn Issue hai loại).
//     Giao việc nằm ở KHỐI DƯỚI THẺ bên trái (chốt 04/10 tối) — "Sửa" mở ô giao ở đây
//   · "+ Thêm issue" → form (Base: form dưới danh sách) · ngưỡng của tab → sửa tại chỗ + vết (Base: sang Cài đặt)
// Nút không có quyền thì ẨN (luật riêng 3004).
// ============================================================
import { useState } from "react";
import { LOP_O_NHAP } from "@/components/layout/giao-dien";
import { docSoNguoiGo } from "@/lib/chung/doc-so";
import {
  CAC_TAB_MAN_ISSUE,
  NHAN_DIEU_KIEN,
  NHAN_XU_LY,
  laNguonMay,
  nhanTab,
  type NguonIssue,
  type TheCanhBao,
} from "@/lib/cay-viec/issue/model";
import { NHAN_NGUONG, type NguongIssue } from "@/lib/cay-viec/issue/nguong";
import { lyDoChanGhi } from "@/lib/cay-viec/issue/quyen";
import { KhungSuaGiao, type NhapIssue } from "./KhoiViecIssue";
import { NUT_CHINH, NUT_VIEN, gioPhut, laChuLlm, mauMuc, ngayVN, nhanMuc, type ChonIssue, type DuLieuIssue, type GoiIssue } from "./chung";
import ONhapNgay from "@/components/common/ONhapNgay";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const tenNgan = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 8).join(" ");

interface Props {
  chon: ChonIssue;
  mo: (c: ChonIssue) => void;
  du: DuLieuIssue | null;
  the: TheCanhBao | undefined;
  goi: GoiIssue;
  dem: Record<NguonIssue, number>;
  chonTab: (t: NguonIssue) => void;
  dangChay: boolean;
  loiTai: string | null;
  nh: NhapIssue;
}

export function PhaiIssue(p: Props) {
  const c = p.chon;
  if (!p.du) return <div className="p-4 text-[12px] text-text-muted">{p.loiTai ?? "Đang đọc sổ issue…"}</div>;
  if (c.loai === "the") {
    if (!p.the) return <div className="p-4 text-[12px] text-text-muted">Issue {c.id} không còn trong danh sách đang xem (đã xoá, đã đổi mã khi duyệt, hoặc đổi phạm vi).</div>;
    return <KhungThe t={p.the} du={p.du} goi={p.goi} mo={p.mo} />;
  }
  if (c.loai === "sua-giao") {
    if (!p.the) return <div className="p-4 text-[12px] text-text-muted">Issue {c.id} không còn trong danh sách đang xem.</div>;
    const veThe = () => p.mo({ loai: "the", id: c.id });
    return <KhungSuaGiao t={p.the} du={p.du} goi={p.goi} nh={p.nh} xong={veThe} huy={veThe} />;
  }
  if (c.loai === "them") return <KhungThem goi={p.goi} mo={p.mo} />;
  if (c.loai === "nguong") return <KhungNguong tab={c.tab} du={p.du} goi={p.goi} />;
  if (c.loai === "ket-qua")
    return (
      <div className="p-4 text-[12px]" data-gt="iss:phai-ket-qua">
        <div className="text-[15px] font-bold text-text">{c.tieuDe}</div>
        <div className={`mt-2 text-[12px] leading-relaxed ${c.loi ? "text-yellow" : "text-text"}`}>{c.tin}</div>
        <div className="mt-2 text-[11px] text-text-muted">Đề xuất mới nằm ở tab 🤖 — đáng làm thì Giao việc, không thì Bỏ qua (khối dưới thẻ).</div>
      </div>
    );
  return <KhungTong {...p} />;
}

// ─────────────── Chưa chọn gì ───────────────
function KhungTong({ du, dem, chonTab, dangChay }: Props) {
  if (!du) return null;
  const d = du.so.doDuoc ?? {};
  const dong = (nhan: string, gia: React.ReactNode) => (
    <tr className="border-b border-border-light">
      <td className="py-1 pr-2 text-text-secondary">{nhan}</td>
      <td className="py-1 text-right font-bold text-text">{gia}</td>
    </tr>
  );
  return (
    <div className="p-4 text-[12px] leading-relaxed text-text-secondary" data-gt="iss:phai-tong">
      <div className="text-[15px] font-bold text-text">Issue · dự án {du.duAn.ten}</div>
      <div className="mt-0.5 text-[11px] text-text-muted">
        {dangChay ? "Bộ sinh đang chạy — hỏi agent Tiến độ…" : du.so.lanChayCuoi ? `Bộ sinh chạy lần cuối ${ngayVN(du.so.lanChayCuoi)}` : "Bộ sinh chưa chạy lần nào"}
      </div>
      <div className="mt-2 text-[11.5px] font-semibold text-text">Đang mở theo tab</div>
      {CAC_TAB_MAN_ISSUE.map((k) => (
        <button key={k} type="button" onClick={() => chonTab(k)} data-gt="iss:phai-dem-tab" className="flex w-full items-baseline justify-between py-0.5 text-left text-[11.5px] hover:text-accent">
          <span>{nhanTab(k, du.nguong)}</span>
          <b className={dem[k] > 0 && k !== "nguoi" && k !== "ai" ? "text-red" : "text-text"}>{dem[k]}</b>
        </button>
      ))}
      {Object.keys(d).length > 0 && (
        <>
          <div className="mt-3 text-[11.5px] font-semibold text-text">Số đo lượt sinh gần nhất</div>
          <table className="mt-1 w-full text-[11.5px]" data-gt="iss:so-do-luot-sinh">
            <tbody>
              {dong("⭕ Nút găng lá đã đến ngày bắt đầu", d.gangDenNgay ?? 0)}
              {dong("— trong đó sổ việc chưa có việc nào gắn mã", d.gangKhongViec ?? 0)}
              {dong(`⏰ Việc gắn mã quá hạn ≥ ${du.nguong.N} ngày`, d.viecGanMaQuaHan ?? 0)}
              {dong("📄 Việc hoàn thành có gắn mã", d.viecXongGanMa ?? 0)}
              {dong("— ứng viên (WBS % = 0)", d.ungVienXongGiay ?? 0)}
              {dong(`— dính thật (không BC ngày ±${du.nguong.K} ngày)`, d.xongTrenGiay ?? 0)}
              {dong("↩ Việc còn mở dù WBS đã 100%", d.wbsXongViecConMo ?? 0)}
            </tbody>
          </table>
        </>
      )}
      <div className="mt-3 border-t border-border-light pt-2 text-[11px]">
        <div className="font-semibold text-text">Bấm vào đâu</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Một thẻ issue → chi tiết ở đây; xử lý ở khối dưới thẻ: Giao việc · Sửa · Bỏ qua (chưa là việc) hoặc Mở việc cũ · Nhắc (đã là việc)</li>
          <li>Khối dưới mỗi thẻ → việc soạn sẵn: chọn người nhận rồi Giao việc · Sửa (mở ở đây) · Bỏ qua (nhớ “không cần giao việc”)</li>
          <li>+ Thêm issue → form ghi thẳng vào sổ, hiệu lực ngay</li>
          <li>“Sửa ngưỡng của tab này” → sửa N · M · K ngay tại đây, có ghi vết ai sửa</li>
          <li>Tab 🤖 → “🤖 Chạy AI đề xuất”: AI đọc bảng Sự cố · Cảnh báo của báo cáo đã nộp</li>
        </ul>
      </div>
      {/* 26/10/2026 (Mr. Đại): bảng nguyên tắc mặc định ĐÓNG — cần thì bấm mới bung */}
      <details className="mt-3 border-t border-border-light pt-2 text-[11px] leading-relaxed">
        <summary className="cursor-pointer select-none font-semibold text-text">Nguyên tắc màn Cảnh báo</summary>
        <p className="mt-1">
          <b className="text-text">Bốn tab trên màn này</b> (găng chưa giao nằm ở Cây việc & đường găng). Hai tab máy do máy sinh theo ngưỡng và <b className="text-text">chỉ máy đóng được</b> — hết
          vi phạm thì máy tự hạ qua các bậc “Hết vi phạm → Chờ ổn định 2 tuần → Đã đóng”. Issue người thêm <b className="text-text">vào sổ ngay</b>; đã giao việc thì việc xong máy tự đóng.
          Đề xuất 🤖 đáng làm thì Giao việc, không thì Bỏ qua.
        </p>
        <p className="mt-1">
          <b className="text-text">Hai loại issue:</b> chưa là việc → Giao việc · Sửa · Bỏ qua; đã là việc (đã giao, hoặc nhắc việc cũ quá hạn / xong trên giấy) → Mở việc · Nhắc. Bỏ qua thì thẻ không đếm, xem lại 30 ngày ở “Hiện lại bỏ qua”.
        </p>
        <p className="mt-1">
          <b className="text-text">Luật chặn:</b> thẻ thiếu “Ảnh hưởng COD” hoặc “🤖 Đề xuất” thì không được hiện. <b className="text-text">Luật vận hành:</b> không mở trùng
          · vàng mở 3 tuần chưa ai động thì tự lên đỏ · không cộng dồn ảnh hưởng COD của hai việc trên cùng một chuỗi.
        </p>
        <p className="mt-1 text-text-muted">Màn này chỉ hiện issue của Agent Công việc. Toàn cảnh issue cả 5 agent xem ở màn Cảnh báo của Main Agent.</p>
      </details>
    </div>
  );
}

// ─────────────── Một thẻ: chi tiết + nút ───────────────
function KhungThe({ t, du, goi, mo }: { t: TheCanhBao; du: DuLieuIssue; goi: GoiIssue; mo: (c: ChonIssue) => void }) {
  const chanGhi = lyDoChanGhi(t);
  const moSua = !chanGhi; // thẻ của agent này, chưa đóng

  const tenMa = (ma: string) => {
    const dv = du.so.dauViec?.[ma];
    return dv ? `${ma} ${tenNgan(dv.ten)}` : ma;
  };

  return (
    <div className="p-4 text-[12px]" data-gt="iss:phai-the">
      <div className="text-[10.5px] uppercase tracking-wider text-text-muted">
        Issue · {t.id} · {nhanTab(t.nguon, du.nguong)}
      </div>
      <div className="text-[15px] font-bold leading-snug text-text">
        {laChuLlm(t) ? "🤖 " : ""}
        {t.tieuDe}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px]">
        <span className={`font-bold ${mauMuc(t.mucDo)}`}>{nhanMuc(t.mucDo)}</span>
        {t.chuaVaoSo && <span className="font-semibold text-yellow">Chờ duyệt — chưa vào sổ</span>}
        {t.khongCanGiao && <span className="text-text-muted">Đã bỏ qua — {t.khongCanGiao.nguoi}</span>}
      </div>
      <table className="mt-2 w-full text-[11.5px]">
        <tbody>
          <tr className="border-b border-border-light">
            <td className="py-1 pr-2 text-text-secondary">Điều kiện</td>
            <td className="py-1 text-right text-text">
              {NHAN_DIEU_KIEN[t.dieuKien]} {laNguonMay(t.nguon) ? "(máy giữ)" : "(người giữ)"}
            </td>
          </tr>
          <tr className="border-b border-border-light">
            <td className="py-1 pr-2 text-text-secondary">Xử lý</td>
            <td className={`py-1 text-right ${t.xuLy === "chua-ai-dong" ? "text-text" : "font-semibold text-blue"}`}>{NHAN_XU_LY[t.xuLy]}</td>
          </tr>
          <tr className="border-b border-border-light">
            <td className="py-1 pr-2 text-text-secondary">Ảnh hưởng COD</td>
            <td className="py-1 text-right font-semibold text-text">{t.thieuDuLieu?.startsWith("Ảnh hưởng COD") ? "chưa lấy được" : `${t.anhHuongCod > 0 ? "+" : ""}${t.anhHuongCod} ngày`}</td>
          </tr>
          <tr className="border-b border-border-light">
            <td className="py-1 pr-2 text-text-secondary">Mở từ</td>
            <td className="py-1 text-right text-text">
              {ngayVN(t.ngayMo)}
              {t.soTuanMo ? ` · ${t.soTuanMo} tuần` : ""}
            </td>
          </tr>
          {t.nguoiMo && (
            <tr className="border-b border-border-light">
              <td className="py-1 pr-2 text-text-secondary">Người mở</td>
              <td className="py-1 text-right text-text">{t.nguoiMo}</td>
            </tr>
          )}
          {(t.nguoiTheoDoi || t.hanXuLy) && (
            <tr className="border-b border-border-light">
              <td className="py-1 pr-2 text-text-secondary">{t.nguoiTheoDoi ? "Người theo dõi · hạn" : "Hạn"}</td>
              <td className="py-1 text-right text-text">
                {t.nguoiTheoDoi ?? ""}
                {t.nguoiTheoDoi && t.hanXuLy ? " · " : ""}
                {t.hanXuLy ? ngayVN(t.hanXuLy) : ""}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {(t.wbsLienQuan?.length ?? 0) > 0 && (
        <div className="mt-2 text-[11px] text-text-secondary">
          <span className="font-semibold text-text">Mã WBS trong thẻ: </span>
          {t.wbsLienQuan!.map(tenMa).join(" · ")}
        </div>
      )}
      {t.wbs && /^\d/.test(t.wbs) && (
        <div className="mt-2 text-[11px] text-text-secondary">
          <span className="font-semibold text-text">Đầu việc: </span>
          {tenMa(t.wbs)}
        </div>
      )}
      <div className="mt-2 text-[10.5px] text-text-muted">Nguồn: {t.nguonDuLieu}</div>

      {chanGhi && <div className="mt-2 text-[11px] text-text-muted">{chanGhi}</div>}

      {/* 07/10 (đợt 2, khuôn Issue hai loại — Mr. Đại chốt): BỎ Ghi nhận xử lý · Đóng issue · Ẩn · Xoá · Duyệt/Bác bỏ. Xử lý một issue chỉ
          còn ở KHỐI DƯỚI THẺ bên trái: Giao việc · Sửa · Bỏ qua (chưa là việc) hoặc Mở việc cũ · Nhắc (đã là việc). Issue người thêm
          đã giao việc → việc xong máy tự đóng. */}
      {moSua && !chanGhi && <div className="mt-3 border-t border-border pt-3 text-[11px] text-text-muted">Giao việc · Sửa · Bỏ qua ở khối ngay dưới thẻ bên trái.</div>}

      {/* ── Phân tích + đề xuất đầy đủ (đọc tiếp) ── */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="text-[11.5px] font-semibold text-text">Phân tích</div>
        <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-text-secondary">
          {laChuLlm(t) ? "🤖 " : ""}
          {t.phanTich}
        </p>
        {t.trichNguyenVan && <p className="mt-2 border-l-2 border-border pl-2 text-[11.5px] italic text-text-secondary">“{t.trichNguyenVan}”</p>}
        <p className="mt-2 text-[11.5px] leading-relaxed text-text">
          <b>🤖 Đề xuất:</b> {t.deXuat}
        </p>
        {t.thieuDuLieu && <p className="mt-2 rounded-sm border border-yellow/30 bg-yellow-soft px-2.5 py-1.5 text-[11px] text-text-secondary">⚠ {t.thieuDuLieu}</p>}
        {t.lyDoBacBo && <p className="mt-2 text-[11px] text-text-secondary">Lý do bác bỏ: {t.lyDoBacBo}</p>}
      </div>
      {t.ghiNhan.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-[11.5px] font-semibold text-text">Lịch sử ghi nhận</div>
          <ul className="mt-1 space-y-0.5 text-[11px] text-text-secondary">
            {t.ghiNhan.map((g, i) => (
              <li key={i}>
                ✍ {gioPhut(g.luc)} · <b className="text-text">{g.nguoi}</b> → {NHAN_XU_LY[g.chuyenSang]}: {g.viecDaLam}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KhungThem({ goi, mo }: { goi: GoiIssue; mo: (c: ChonIssue) => void }) {
  const [f, setF] = useState({ wbs: "", mucDo: "yellow", tieuDe: "", phanTich: "", deXuat: "", anhHuongCod: "", nguoiTheoDoi: "", hanXuLy: "" });
  const [tin, setTin] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const ghi = async () => {
    setDang(true);
    setTin(null);
    try {
      const j = await goi({ hanhDong: "them", ...f });
      if (j?.id) mo({ loai: "the", id: j.id });
    } catch (e) {
      setTin(e instanceof Error ? e.message : "Không gọi được máy chủ.");
    } finally {
      setDang(false);
    }
  };
  return (
    <div className="space-y-2 p-4 text-[12px]" data-gt="iss:phai-them">
      <KhaiHuongDan ma="issue-them" uuTien={2} />
      <div className="text-[15px] font-bold text-text">👤 Thêm issue — người thêm</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input data-gt="iss:them-wbs" value={f.wbs} onChange={dat("wbs")} placeholder="Đối tượng: mã WBS (vd 7.2.3)" className={LOP_O_NHAP} />
        <select data-gt="iss:them-muc" value={f.mucDo} onChange={dat("mucDo")} className={LOP_O_NHAP}>
          <option value="yellow">Mức: 🟡 Cần xem</option>
          <option value="red">Mức: 🔴 Nghiêm trọng</option>
        </select>
      </div>
      <input data-gt="iss:them-tieu-de" value={f.tieuDe} onChange={dat("tieuDe")} placeholder="Tiêu đề vấn đề *" className={LOP_O_NHAP} />
      <textarea data-gt="iss:them-mo-ta" value={f.phanTich} onChange={dat("phanTich")} placeholder="Mô tả vấn đề *" rows={3} className={LOP_O_NHAP} />
      <textarea data-gt="iss:them-de-xuat" value={f.deXuat} onChange={dat("deXuat")} placeholder="Đề xuất xử lý * — thẻ không nói nên làm gì thì không được hiện" rows={2} className={LOP_O_NHAP} />
      <div className="grid gap-2 sm:grid-cols-3">
        <input data-gt="iss:them-cod" value={f.anhHuongCod} onChange={dat("anhHuongCod")} inputMode="numeric" placeholder="Ước ảnh hưởng COD (ngày)" className={LOP_O_NHAP} />
        <input data-gt="iss:them-theo-doi" value={f.nguoiTheoDoi} onChange={dat("nguoiTheoDoi")} placeholder="👤 Người theo dõi" className={LOP_O_NHAP} />
        <span data-gt="iss:them-han"><ONhapNgay value={f.hanXuLy} onChange={(x) => setF({ ...f, hanXuLy: x })} title="Hạn xử lý" className={LOP_O_NHAP} /></span>
      </div>
      <div className="text-[10.5px] text-text-muted">
        Ghi thẳng vào sổ issue — <b>hiệu lực ngay, không cần ai duyệt</b>. Hệ tự điền: dự án, người mở, mã issue, thời điểm.
      </div>
      {tin && <div className="text-[11.5px] text-red">{tin}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={() => mo({ loai: "tong" })} data-gt="iss:them-huy" className={NUT_VIEN}>
          Huỷ
        </button>
        <button type="button" disabled={dang} data-lenh="issue.ghi-vao-so" data-gt="iss:them-ghi" onClick={() => void ghi()} className={NUT_CHINH}>
          Ghi vào sổ
        </button>
      </div>
    </div>
  );
}

// ─────────────── Ngưỡng của tab — sửa tại chỗ + vết ───────────────
const NGUONG_CUA_TAB: Partial<Record<NguonIssue, keyof NguongIssue>> = { "nang-suat": "N", "su-kien": "M", "xong-giay": "K" };

function KhungNguong({ tab, du, goi }: { tab: NguonIssue; du: DuLieuIssue; goi: GoiIssue }) {
  const [f, setF] = useState({ N: String(du.nguong.N), M: String(du.nguong.M), K: String(du.nguong.K) });
  const [tin, setTin] = useState<{ ok: boolean; chu: string } | null>(null);
  const [dang, setDang] = useState(false);
  const cua = NGUONG_CUA_TAB[tab];
  const luu = async () => {
    setDang(true);
    setTin({ ok: true, chu: "Đang lưu và chạy lại bộ sinh…" });
    try {
      // ô chữ người gõ → MỘT bộ đọc số theo chuẩn Việt Nam (lib/chung/doc-so, chốt 130); không phải số → máy chủ từ chối như cũ
      const so = (chu: string) => docSoNguoiGo(chu) ?? NaN;
      const j = await goi({ hanhDong: "nguong", N: so(f.N), M: so(f.M), K: so(f.K) });
      setTin({ ok: true, chu: j?.thong_diep ?? "Đã lưu." });
    } catch (e) {
      setTin({ ok: false, chu: e instanceof Error ? e.message : "Không gọi được máy chủ." });
    } finally {
      setDang(false);
    }
  };
  const vet = [...du.nguong.vet].reverse().slice(0, 20);
  return (
    <div className="p-4 text-[12px]" data-gt="iss:phai-nguong">
      <KhaiHuongDan ma="issue-nguong" uuTien={2} />
      <div className="text-[10.5px] uppercase tracking-wider text-text-muted">Ngưỡng bộ sinh issue · dùng chung mọi dự án</div>
      <div className="text-[15px] font-bold text-text">{nhanTab(tab, du.nguong)}</div>
      {tab === "gang" && <p className="mt-1 text-[11.5px] text-text-secondary">Tab này không có ngưỡng ngày — găng đã đến ngày bắt đầu mà chưa ai nhận là đỏ ngay. Ba ngưỡng của các tab khác ở dưới.</p>}
      <table className="mt-2 w-full text-[11.5px]">
        <tbody>
          {(["N", "M", "K"] as const).map((k) => (
            <tr key={k} data-gt={`iss:nguong-${k}`} className={`border-b border-border-light ${cua === k ? "font-semibold" : ""}`}>
              <td className="py-1.5 pr-2 text-text-secondary">
                {NHAN_NGUONG[k]}
                {cua === k && <span className="ml-1 text-accent">← tab này</span>}
              </td>
              <td className="py-1.5 text-right">
                {du.quyen.duyet ? (
                  <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} inputMode="numeric" className={`${LOP_O_NHAP} !w-20 text-right`} />
                ) : (
                  <b className="text-text">{du.nguong[k]}</b>
                )}{" "}
                <span className="text-text-muted">ngày</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {du.quyen.duyet && (
        <div className="mt-2 flex items-center gap-2">
          <button type="button" disabled={dang} data-lenh="issue.luu-nguong" data-gt="iss:luu-nguong" onClick={() => void luu()} className={NUT_CHINH}>
            Lưu và chạy lại bộ sinh
          </button>
          <span className="text-[10.5px] text-text-muted">Mặc định Base: N 7 · M 5 · K 7</span>
        </div>
      )}
      {tin && <div className={`mt-2 text-[11.5px] ${tin.ok ? "text-text-secondary" : "text-red"}`}>{tin.chu}</div>}
      <div className="mt-3 border-t border-border-light pt-2" data-gt="iss:vet-nguong">
        <div className="text-[11.5px] font-semibold text-text">Vết sửa ngưỡng</div>
        {vet.length === 0 ? (
          <div className="mt-1 text-[11px] text-text-muted">Chưa ai sửa — đang chạy bằng mặc định.</div>
        ) : (
          <ul className="mt-1 space-y-0.5 text-[11px] text-text-secondary">
            {vet.map((v, i) => (
              <li key={i}>
                {gioPhut(v.luc)} · <b className="text-text">{v.nguoi}</b> · {v.truong}: {v.tu} → {v.sang} ngày
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

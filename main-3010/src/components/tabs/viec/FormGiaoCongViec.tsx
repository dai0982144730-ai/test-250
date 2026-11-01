"use client";

// ============================================================
// Ô GIAO VIỆC SANG AGENT CÔNG VIỆC — giống ô "+" giao việc của agent Công việc (Mr. Đại chốt 04/10/2026 chiều):
//   Giao cho (người / đơn vị — thêm ở đầu) · Thuộc dự án · không bắt buộc · Nội dung việc + 📎 · Kết quả cần có · Hạn ·
//   nút "Giao việc" + chữ lý do khi chưa đủ ("Chưa có nội dung việc"…).
// Dùng chung (luật 7): ô Sửa của nháp AI ở màn Việc của tôi · nút Giao việc / Nhắc ở Bảng điều hành.
// Danh sách người/đơn vị/dự án + cài đặt kẹp tệp lấy từ agent Công việc (/api/viec/nguoi-nhan). Tệp chuyển qua /api/viec/tep.
// Chọn là áp dụng luôn, không nút xác nhận (bớt cú bấm). Không quyền ghi → nút MỜ kèm lý do (luật 17 — Main).
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import type { NguoiNhanCV, TepCV } from "@/lib/chung/viec-cong-viec-kieu";
import { fmtNum, khoangNgay } from "@/lib/format";
import { LY_DO_CHAN } from "@/lib/quyen";
import ONhapNgay from "@/components/common/ONhapNgay";
import { OChonNoiNhan } from "./OChonNoiNhan";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export interface BanDauGiao {
  giaoCho?: string;
  maDuAn?: string;
  ten: string;
  ketQua?: string;
  /** dd/mm/yyyy hoặc yyyy-mm-dd */
  han?: string | null;
}

export interface GuiGiaoCV {
  giaoCho: string;
  tenNhan: string;
  maDuAn: string;
  ten: string;
  ketQua: string;
  han: string;
  dinhKem: string[];
}

/** "dd/mm/yyyy" | "yyyy-mm-dd" → "yyyy-mm-dd" cho ô ngày */
function chuoiNgay(han?: string | null): string {
  const s = (han ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
}

function coTep(b: number): string {
  return b >= 1024 * 1024 ? `${fmtNum(b / 1024 / 1024, 1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

const NHAN = "flex flex-col gap-1 text-[12.5px] text-text-secondary";
const O = "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-accent";

export function FormGiaoCongViec({
  tieuDe,
  banDau,
  laAi,
  ds,
  loiDs,
  duocGiao,
  dangGui,
  loi,
  onGui,
  onDong,
  lenhGui,
}: {
  tieuDe: string;
  banDau: BanDauGiao;
  /** Nội dung do LLM soạn → nhãn 🤖 (luật 19) */
  laAi: boolean;
  ds: NguoiNhanCV | null;
  loiDs?: string | null;
  duocGiao: boolean;
  dangGui: boolean;
  loi?: string | null;
  onGui: (g: GuiGiaoCV) => void;
  onDong: () => void;
  /** data-lenh nút Giao việc — chữ nguyên văn ở chỗ gọi (sổ lệnh trợ lý tìm móc bằng chữ) */
  lenhGui: "viec.giao-sua" | "bdh.gui-giao";
}) {
  const [giaoCho, setGiaoCho] = useState(banDau.giaoCho ?? "");
  const [maDuAn, setMaDuAn] = useState(banDau.maDuAn ?? "");
  const [ten, setTen] = useState(banDau.ten);
  const [ketQua, setKetQua] = useState(banDau.ketQua ?? "");
  const [han, setHan] = useState(chuoiNgay(banDau.han));
  const [tep, setTep] = useState<TepCV[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loiTep, setLoiTep] = useState<string | null>(null);
  const chonTep = useRef<HTMLInputElement>(null);

  // Gợi ý người nhận về sau khi danh sách tới → chọn sẵn lúc đó
  useEffect(() => {
    if (!giaoCho && banDau.giaoCho) setGiaoCho(banDau.giaoCho);
  }, [banDau.giaoCho, giaoCho]);

  const homNay = useMemo(() => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }), []);
  const duAnCo = (ds?.du_an ?? []).some((d) => d.id === maDuAn);
  const tenNhan = ds?.don_vi.find((d) => d.id === giaoCho)?.ten ?? ds?.nguoi.find((n) => n.id === giaoCho)?.ten ?? "";
  const dk = ds?.dinh_kem;
  const thieu = !ten.trim()
    ? "Chưa có nội dung việc"
    : !giaoCho
      ? "Chưa chọn người nhận"
      : han && han < homNay
        ? "Hạn trước hôm nay"
        : "";

  async function taiLen(ds_: FileList | null) {
    if (!ds_ || !ds_.length) return;
    setLoiTep(null);
    const toiDa = dk?.so_file_toi_da ?? 20;
    const mb = dk?.toi_da_mb ?? 50;
    const chon = Array.from(ds_).slice(0, Math.max(0, toiDa - tep.length));
    if (chon.length < ds_.length) setLoiTep(`Mỗi lần kẹp tối đa ${toiDa} file`);
    setDangTai(true);
    try {
      for (const f of chon) {
        if (f.size > mb * 1024 * 1024) {
          setLoiTep(`File "${f.name}" vượt ${mb} MB`);
          continue;
        }
        const fd = new FormData();
        fd.set("tep", f, f.name);
        const r = await fetch("/api/viec/tep", { method: "POST", body: fd });
        const j = (await r.json().catch(() => ({ ok: false, message: `Máy chủ trả mã ${r.status}` }))) as { ok: boolean; tep?: TepCV; message?: string };
        if (j.ok && j.tep) setTep((x) => [...x, j.tep!]);
        else setLoiTep(j.message ?? `Không gửi được file "${f.name}"`);
      }
    } finally {
      setDangTai(false);
      if (chonTep.current) chonTep.current.value = "";
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-gt="viec:form-giao">
      <KhaiHuongDan ma="giao-viec" uuTien={2} />
      <div className="flex items-center justify-between border-b border-border pb-2">
        <b className="text-[14px] text-accent">{tieuDe}</b>
        <button type="button" onClick={onDong} className="text-[13px] text-text-muted hover:text-text" title="Đóng, quay lại danh sách">
          ✕
        </button>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {laAi && <div className="text-[11px] text-text-muted">🤖 AI đã điền sẵn — sửa chỗ chưa đúng rồi bấm Giao việc.</div>}
        <label className={NHAN}>
          Giao cho
          {/* Ô 2 trong 1 (Mr. Đại chốt 04/10 tối): bấm = Ban lãnh đạo + đơn vị · gõ @ gợi ý liên quan · @@ chọn cá nhân */}
          <OChonNoiNhan ds={ds} loiDs={loiDs} value={giaoCho} onChange={setGiaoCho} />
        </label>
        <label className={NHAN}>
          <span>
            Thuộc dự án <span className="text-text-muted">· không bắt buộc</span>
          </span>
          <select className={O} value={duAnCo ? maDuAn : ""} onChange={(e) => setMaDuAn(e.target.value)}>
            <option value="">— Không thuộc dự án nào —</option>
            {(ds?.du_an ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten}
                {d.nhom ? ` · ${d.nhom === "sci" ? "SCI đầu tư" : "loại khác"}` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className={NHAN}>
          <label htmlFor="viec-giao-noi-dung">Nội dung việc</label>
          <div className="flex items-stretch gap-1.5">
            <textarea
              id="viec-giao-noi-dung"
              className={`${O} min-h-[64px] flex-1 resize-y`}
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder="Việc cần làm…"
            />
            {/* 📎 bên phải ô nội dung việc (giống ô "+" — Mr. Đại chốt 29/09) */}
            <button
              type="button"
              className="w-11 shrink-0 rounded-md border border-border bg-surface text-[15px] hover:border-accent disabled:opacity-40"
              disabled={!dk?.bat || dangTai || !duocGiao}
              title={
                !duocGiao
                  ? LY_DO_CHAN.ghi
                  : dk && !dk.bat
                    ? "Kẹp file khi giao việc đang tắt trong Cài đặt của agent Công việc"
                    : `Kẹp file (tối đa ${dk?.so_file_toi_da ?? 20} file, mỗi file ≤ ${dk?.toi_da_mb ?? 50} MB; lưu ${dk?.luu_thang ?? 6} tháng)`
              }
              onClick={() => chonTep.current?.click()}
            >
              📎
            </button>
            <input ref={chonTep} type="file" multiple hidden onChange={(e) => void taiLen(e.target.files)} />
          </div>
          {(tep.length > 0 || dangTai || loiTep) && (
            <div className="space-y-0.5 text-[11.5px]">
              {tep.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-text-secondary">
                  📎 {t.ten} <span className="text-text-muted">{coTep(t.kich_thuoc)}</span>
                  <button type="button" className="text-text-muted hover:text-red" title="Bỏ file này" onClick={() => setTep((x) => x.filter((y) => y.id !== t.id))}>
                    ✕
                  </button>
                </div>
              ))}
              {dangTai && <div className="text-text-muted">Đang gửi file…</div>}
              {loiTep && <div className="text-red">{loiTep}</div>}
            </div>
          )}
        </div>
        <label className={NHAN}>
          Kết quả cần có
          <textarea className={`${O} min-h-[64px] resize-y`} value={ketQua} onChange={(e) => setKetQua(e.target.value)} placeholder="Ví dụ: tờ trình gửi TGĐ" />
        </label>
        <label className={NHAN}>
          Hạn
          {/* Ô ngày dd/mm/yyyy tiếng Việt — ô gốc type="date" hiện theo ngôn ngữ máy ("04/30/2027") — Mr. Đại chốt 04/10 */}
          <ONhapNgay className={O} min={homNay} value={han} onChange={setHan} aria-label="Hạn" />
        </label>
        {han && han >= homNay && <div className="text-[12px] text-text-secondary">{khoangNgay(homNay, han)}</div>}
        {loi && <div className="text-[12px] text-red">{loi}</div>}
        <div className="flex flex-wrap items-center gap-2">
          {lenhGui === "viec.giao-sua" ? (
            <button
              type="button"
              data-lenh="viec.giao-sua"
              className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
              disabled={!duocGiao || !!thieu || dangGui || dangTai}
              title={duocGiao ? undefined : LY_DO_CHAN.ghi}
              onClick={() => onGui({ giaoCho, tenNhan, maDuAn: duAnCo ? maDuAn : "", ten: ten.trim(), ketQua: ketQua.trim(), han, dinhKem: tep.map((t) => t.id) })}
            >
              {dangGui ? "Đang giao…" : "Giao việc"}
            </button>
          ) : (
            <button
              type="button"
              data-lenh="bdh.gui-giao"
              className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
              disabled={!duocGiao || !!thieu || dangGui || dangTai}
              title={duocGiao ? undefined : LY_DO_CHAN.ghi}
              onClick={() => onGui({ giaoCho, tenNhan, maDuAn: duAnCo ? maDuAn : "", ten: ten.trim(), ketQua: ketQua.trim(), han, dinhKem: tep.map((t) => t.id) })}
            >
              {dangGui ? "Đang giao…" : "Giao việc"}
            </button>
          )}
          <span className="text-[12px] text-text-muted">{!duocGiao ? LY_DO_CHAN.ghi : thieu || (dangTai ? "Đang gửi file…" : "")}</span>
        </div>
      </div>
    </div>
  );
}

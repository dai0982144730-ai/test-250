"use client";
// KHAI BÁO MẪU KHÔNG CẦN SỬA CODE — khung cấu hình trên /mau-word (Đợt D, 01/10/2026).
// MD 0 Tài liệu thiết kế/DE-XUAT-KHAI-BAO-MAU-BAO-CAO-v0.1 mục 4.1 (6 bước) + 4.2 (bảng duyệt):
//   chọn file Word → 🤖 đọc (tự chạy ngay khi chọn file) → người duyệt (chọn là áp dụng) → Kiểm tra (code gắn nhãn, đọc lại) → Lưu bản mới.
// Bảng duyệt tính lại TẠI CHỖ bằng de-xuat-cau-truc-thuan.ts mỗi lần người chọn nghĩa (không gọi lại AI).
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { CauTrucMau } from "@/lib/types";
import type { KhungVanBan } from "@/lib/kiem-tra/gan-nhan";
import { ghepDeXuat, type HangDuyet } from "@/lib/kiem-tra/de-xuat-cau-truc-thuan";
import { NutChinh, NutPhu, ThongDiep, goiForm } from "@/components/gui/chung";

export type CheDoKhaiBao = { loai: "moi" } | { loai: "cap_nhat"; ma: string; ten: string };

interface DeXuat {
  ai: unknown;
  khung: KhungVanBan;
  cu: CauTrucMau | null;
}
interface KetQuaKiem {
  dat: boolean;
  loi: string[];
  bao_cao: string[];
  luat_tat: { ma: string; ten: string; ly_do: string; chi_mau_nay: boolean }[];
}

const BUOC = ["Chọn file Word", "🤖 Đọc file", "Duyệt nghĩa", "Kiểm tra", "Lưu bản mới"];

export function KhaiBaoMau({ cheDo, maGoiY, onXong, onThoi }: { cheDo: CheDoKhaiBao; maGoiY: string; onXong: (thongBao: string) => void; onThoi: () => void }) {
  const capNhat = cheDo.loai === "cap_nhat";
  const [ma, setMa] = useState(capNhat ? cheDo.ma : maGoiY);
  const [ten, setTen] = useState(capNhat ? cheDo.ten : "");
  const [tep, setTep] = useState<File | null>(null);
  const [dx, setDx] = useState<DeXuat | null>(null);
  const [chon, setChon] = useState<Record<string, string>>({});
  const [kiem, setKiem] = useState<KetQuaKiem | null>(null);
  const [dang, setDang] = useState<"doc" | "kiem" | "luu" | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [giay, setGiay] = useState(0);
  const oTep = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dang !== "doc") return;
    setGiay(0);
    const t = setInterval(() => setGiay((g) => g + 1), 1000);
    return () => clearInterval(t);
  }, [dang]);

  const ghep = useMemo(() => (dx ? ghepDeXuat(dx.ai, dx.khung, dx.cu, chon) : null), [dx, chon]);
  const buoc = dang === "doc" ? 1 : !dx ? 0 : !kiem ? 2 : kiem.dat ? 4 : 3;

  async function docFile(f: File) {
    setTep(f);
    setDx(null);
    setChon({});
    setKiem(null);
    setLoi(null);
    setDang("doc");
    try {
      const fd = new FormData();
      fd.append("tep", f);
      if (capNhat) fd.append("ma", cheDo.ma);
      setDx(await goiForm<DeXuat>("/api/mau-word/khai-bao/de-xuat", fd));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(null);
    }
  }

  const formGui = () => {
    const fd = new FormData();
    fd.append("tep", tep!);
    fd.append("ma", ma.trim());
    fd.append("ten", ten.trim());
    fd.append("moi", capNhat ? "0" : "1");
    fd.append("cau_truc", JSON.stringify(ghep!.cau_truc));
    return fd;
  };

  async function kiemTra() {
    setLoi(null);
    setDang("kiem");
    try {
      setKiem(await goiForm<KetQuaKiem>("/api/mau-word/khai-bao/kiem", formGui()));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(null);
    }
  }

  async function luu() {
    setLoi(null);
    setDang("luu");
    try {
      const r = await goiForm<{ ma: string; phien_ban: number; luat_tat: KetQuaKiem["luat_tat"] }>("/api/mau-word/khai-bao/luu", formGui());
      onXong(
        `Đã lưu mẫu "${ten.trim()}" — bản ${r.phien_ban}. Từ giờ người tải mẫu nhận file mới.` +
          (r.luat_tat.length ? ` Đã xử lý ${r.luat_tat.length} luật kiểm tra trỏ vào bảng/cột đã bỏ.` : ""),
      );
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(null);
    }
  }

  const doiNghia = (khoa: string, gt: string) => {
    setChon((c) => ({ ...c, [khoa]: gt }));
    setKiem(null);
  };

  return (
    <div className="space-y-4">
      {/* thanh tiến trình */}
      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {BUOC.map((b, i) => (
          <li key={b} className={i < buoc ? "text-green" : i === buoc ? "font-semibold text-accent" : "text-text-muted"}>
            {i < buoc ? "✓" : `${i + 1}.`} {b}
          </li>
        ))}
      </ol>

      {loi ? <ThongDiep loai="loi" onDong={() => setLoi(null)}>{loi}</ThongDiep> : null}

      {/* Bước 1 — chọn file */}
      <div className="flex flex-wrap items-end gap-3">
        {!capNhat ? (
          <>
            <label className="text-xs text-text-muted">
              Mã mẫu
              <input value={ma} onChange={(e) => { setMa(e.target.value); setKiem(null); }} className="mt-1 block w-32 rounded-sm border border-border bg-bg px-2 py-1 font-mono text-sm text-text" />
            </label>
            <label className="min-w-[220px] flex-1 text-xs text-text-muted">
              Tên mẫu
              <input value={ten} onChange={(e) => { setTen(e.target.value); setKiem(null); }} placeholder="vd Báo cáo Văn phòng HĐQT" className="mt-1 block w-full rounded-sm border border-border bg-bg px-2 py-1 text-sm text-text" />
            </label>
          </>
        ) : null}
        <input ref={oTep} type="file" accept=".docx" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void docFile(f); }} />
        <NutChinh onClick={() => oTep.current?.click()} disabled={!!dang}>
          {tep ? "Chọn file khác" : "Chọn file Word (.docx)"}
        </NutChinh>
        {tep ? <span className="text-sm text-text-secondary">{tep.name}</span> : null}
      </div>
      {capNhat ? (
        <p className="text-xs text-text-muted">
          Nên{" "}
          <a href={`/api/mau-word/${encodeURIComponent(cheDo.ma)}/tep`} className="inline-flex items-center gap-1 text-accent hover:underline">
            <Download size={12} /> tải mẫu hiện hành về
          </a>
          , sửa trên đó bằng Word rồi chọn lại ở đây — máy giữ được nhãn các bảng số liệu mà luật kiểm tra đang dùng. File Word gõ lại từ đầu thì các bảng đó mất nhãn và máy sẽ không cho lưu.
        </p>
      ) : (
        <p className="text-xs text-text-muted">Soạn mẫu bằng Word như mọi ngày: tiêu đề chương in đậm, đánh số I., II., …; bảng việc có hàng tiêu đề cột. Không cần gắn nhãn.</p>
      )}

      {/* Bước 2 — AI đọc */}
      {dang === "doc" ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 size={14} className="animate-spin" /> 🤖 Đang đọc file… {giay} giây (thường 15–20 giây)
        </p>
      ) : null}

      {/* Bước 3 — bảng duyệt (MD mục 4.2) */}
      {ghep ? (
        <>
          <div className="scroll-thin overflow-x-auto">
            <table className="tbl" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Trong file</th>
                  <th>🤖 AI hiểu là</th>
                  <th>Nghĩa (chọn lại được)</th>
                  <th>Ai nhặt việc</th>
                  {capNhat ? <th>So với bản trước</th> : null}
                  <th>Bắt buộc</th>
                </tr>
              </thead>
              <tbody>
                {ghep.hang.map((h) => (
                  <DongDuyet key={h.khoa} h={h} capNhat={capNhat} onDoi={doiNghia} />
                ))}
              </tbody>
            </table>
          </div>
          {ghep.canh_bao.length ? (
            <div className="text-xs text-text-muted">
              Máy đã sửa đề xuất của 🤖:
              <ul className="ml-4 list-disc">
                {ghep.canh_bao.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {ghep.loi_cau_truc.length ? (
            <ThongDiep loai="loi">
              Chưa kiểm tra được — sửa nghĩa ở bảng trên:
              <ul className="ml-4 list-disc">
                {ghep.loi_cau_truc.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </ThongDiep>
          ) : null}

          {/* Bước 4–5 — kiểm tra, lưu */}
          <div className="flex flex-wrap items-center gap-2">
            <NutChinh onClick={() => void kiemTra()} disabled={!!dang || ghep.loi_cau_truc.length > 0 || (!capNhat && (!ma.trim() || !ten.trim()))}>
              {dang === "kiem" ? <Loader2 size={14} className="animate-spin" /> : null} Kiểm tra
            </NutChinh>
            {kiem?.dat ? (
              <NutChinh onClick={() => void luu()} disabled={!!dang}>
                {dang === "luu" ? <Loader2 size={14} className="animate-spin" /> : null} Lưu phiên bản mới
              </NutChinh>
            ) : null}
            <NutPhu onClick={onThoi} disabled={dang === "luu"}>Thôi</NutPhu>
            {!capNhat && (!ma.trim() || !ten.trim()) ? <span className="text-xs text-text-muted">Điền mã và tên mẫu để kiểm tra</span> : null}
          </div>
          {kiem ? (
            kiem.dat ? (
              <ThongDiep loai="ok">
                ✅ Đạt — máy đã gắn nhãn và đọc lại được file bằng bộ đọc báo cáo thật.
                <ul className="ml-4 list-disc text-xs">
                  {kiem.bao_cao.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                {kiem.luat_tat.length ? (
                  <div className="mt-2 text-xs text-text">
                    Khi lưu, {kiem.luat_tat.length} luật kiểm tra trỏ vào bảng/cột đã bỏ sẽ được xử lý:
                    <ul className="ml-4 list-disc">
                      {kiem.luat_tat.map((l) => (
                        <li key={l.ma}>
                          {l.ten} — {l.chi_mau_nay ? "tắt" : "bỏ mẫu này khỏi phần Áp dụng"} ({l.ly_do})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </ThongDiep>
            ) : (
              <ThongDiep loai="loi">
                Chưa lưu được:
                <ul className="ml-4 list-disc">
                  {kiem.loi.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </ThongDiep>
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function DongDuyet({ h, capNhat, onDoi }: { h: HangDuyet; capNhat: boolean; onDoi: (khoa: string, gt: string) => void }) {
  const lui = h.cap === "chuong" ? "" : h.cap === "bang" ? "pl-4" : "pl-8";
  const bo = h.so_voi_truoc === "Bỏ";
  const mo = !h.chac && !h.nguoi_chon && !bo;
  return (
    <tr className={mo ? "opacity-60" : ""}>
      <td className={`${lui} ${h.cap === "chuong" ? "font-semibold text-text" : "text-text-secondary"} ${bo ? "line-through" : ""}`}>{h.trong_file}</td>
      <td className="text-text-secondary">
        {h.ai_hieu ?? (bo ? "" : "—")}
        {h.ly_do ? <div className="text-[11px] text-text-muted">🤖 {h.ly_do}</div> : null}
      </td>
      <td>
        {h.lua_chon.length ? (
          <select value={h.nghia} onChange={(e) => onDoi(h.khoa, e.target.value)} className="rounded-sm border border-border bg-bg px-1.5 py-1 text-sm text-text">
            {h.lua_chon.map((l) => (
              <option key={l.gia_tri} value={l.gia_tri}>
                {l.nhan}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-text-secondary">{h.nhan_nghia}</span>
        )}
        {h.nguoi_chon ? <div className="text-[11px] text-text-muted">người duyệt chọn</div> : null}
      </td>
      <td className="text-text-secondary">{h.ai_nhat}</td>
      {capNhat ? <td className={h.so_voi_truoc === "Giữ nguyên" ? "text-text-muted" : "font-medium text-text"}>{h.so_voi_truoc ?? ""}</td> : null}
      <td>
        {h.cap === "chuong" && !bo ? (
          <input type="checkbox" checked={!!h.bat_buoc} onChange={(e) => onDoi(`${h.khoa}.bb`, e.target.checked ? "1" : "0")} aria-label="Chương bắt buộc" />
        ) : null}
      </td>
    </tr>
  );
}

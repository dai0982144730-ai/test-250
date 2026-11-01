"use client";
// Mảnh giao diện dùng chung của module so-cai: gọi API, tiến độ, hạn, phần việc, hộp Kết thúc, chọn phụ trách.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Clock, Loader2, Paperclip, X } from "lucide-react";
import type { NguonCongViec, PhanViec, PhuTrach } from "@/lib/types";
import { ngayNgan } from "@/lib/so-cai/tien-ich";
import { fetchCoLoiViet, loiTheoMa } from "@/lib/loi-mang";

/** Một việc mốc (như API trả về — lib/so-cai/phu-thuoc.ts). */
export interface PhuThuocUi {
  loai: "bat_dau" | "ket_thuc";
  viec_truoc_id: string | null;
  ten: string;
  ten_viec_truoc: string | null;
  xong: boolean;
  ngay_xong: string | null;
  so_ngay: number;
  goc: string | null;
  da_tinh: string | null;
}

/** "sau CV-2026-0012, CV-2026-0013 + 2 ngày" (chỉ các mốc chưa tính xong) */
export function moTaCho(ds: PhuThuocUi[] | undefined, loai: PhuThuocUi["loai"]): string | null {
  const cua = (ds ?? []).filter((p) => p.loai === loai);
  if (!cua.length || cua.every((p) => p.da_tinh)) return null;
  const so = cua[0].so_ngay;
  return `sau ${cua.map((p) => (p.xong ? `${p.viec_truoc_id} ✓` : p.viec_truoc_id ?? `"${p.ten}" (chưa rõ việc)`)).join(", ")}${so ? ` + ${so} ngày` : ""}`;
}

export async function goiApi<T = unknown>(url: string, body?: unknown): Promise<T> {
  const r = await fetchCoLoiViet(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { loi?: string }).loi || loiTheoMa(r.status));
  return j as T;
}

/** Một dòng sổ cái như API trả về (DongSoCai + phần việc người xem bấm được). */
export interface DongViecUi {
  id: string;
  ten: string;
  du_an: string | null;
  hang_muc: string | null;
  ket_qua_can_co: string | null;
  luon_mo: boolean;
  bat_dau: string | null;
  ket_thuc: string | null;
  trang_thai: "dang_mo" | "hoan_thanh" | "da_dong";
  cho_sua: boolean;
  giao_boi: string | null;
  don_vi_giao: string | null;
  tao_luc: string;
  dong_luc: string | null;
  ly_do_dong: string | null;
  phan_viec: (PhanViec & { tep_ket_qua?: { tai_lieu_id: string }[] })[];
  tien_do: string;
  canh_bao: "qua_han" | "sap_den_han" | null;
  /** Đang mở, không có hạn và không chờ mốc: việc treo (cảnh báo) */
  treo?: boolean;
  /** Ngày theo việc khác */
  phu_thuoc?: PhuThuocUi[];
  nguon_hien_hanh: NguonCongViec | null;
  so_ban_da_de: number;
  co_the_ket_thuc?: string[];
}

export function TienDo({ tienDo, rong = 72 }: { tienDo: string; rong?: number }) {
  const [a, b] = tienDo.split("/").map(Number);
  const pt = b ? Math.round((a / b) * 100) : 0;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-text">
      <span className="relative h-1.5 overflow-hidden rounded-full bg-border" style={{ width: rong }}>
        <span className={`absolute inset-y-0 left-0 rounded-full ${pt === 100 ? "bg-green" : "bg-accent"}`} style={{ width: `${pt}%` }} />
      </span>
      <span className="font-mono text-xs">{tienDo}</span>
    </span>
  );
}

export function NhanCanhBao({ v }: { v: Pick<DongViecUi, "luon_mo" | "canh_bao" | "trang_thai" | "treo" | "phu_thuoc" | "ket_thuc"> }) {
  if (v.trang_thai === "hoan_thanh" || v.trang_thai === "da_dong") return <span className="rounded-full border border-green px-2 py-0.5 text-[11px] text-green">Đã xong</span>;
  // Không có hạn: chờ mốc (hạn tự tính) hoặc TREO (giữ nguyên nhưng luôn cảnh báo)
  if (!v.ket_thuc && moTaCho(v.phu_thuoc, "ket_thuc"))
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue px-2 py-0.5 text-[11px] text-blue" title="Hạn tự tính khi việc mốc xong">
        <Clock size={11} /> Chờ mốc
      </span>
    );
  if (v.treo || v.luon_mo)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-yellow px-2 py-0.5 text-[11px] text-yellow" title="Mọi việc phải có ngày kết thúc: bấm Gia hạn để đặt hạn">
        <AlertTriangle size={11} /> Thiếu ngày kết thúc
      </span>
    );
  // Ba tình trạng: Chưa đến hạn / Đến hạn chưa xong / Đã xong
  if (v.canh_bao === "qua_han") return <span className="rounded-full border border-red px-2 py-0.5 text-[11px] text-red">Đến hạn chưa xong</span>;
  if (v.canh_bao === "sap_den_han") return <span className="rounded-full border border-yellow px-2 py-0.5 text-[11px] text-yellow">Chưa đến hạn · sắp đến</span>;
  return <span className="rounded-full border border-green px-2 py-0.5 text-[11px] text-green">Chưa đến hạn</span>;
}

export function Han({ v }: { v: Pick<DongViecUi, "luon_mo" | "canh_bao" | "trang_thai" | "ket_thuc" | "treo" | "phu_thuoc"> }) {
  const choKt = !v.ket_thuc ? moTaCho(v.phu_thuoc, "ket_thuc") : null;
  const choBd = v.trang_thai === "dang_mo" ? moTaCho(v.phu_thuoc, "bat_dau") : null;
  return (
    <div className="space-y-1">
      <div className={`font-mono text-sm ${v.canh_bao === "qua_han" && v.trang_thai === "dang_mo" ? "text-red" : "text-text"}`}>
        {v.luon_mo || !v.ket_thuc ? "—" : ngayNgan(v.ket_thuc, true)}
      </div>
      {choKt ? <div className="text-[11px] text-text-muted">hạn: {choKt}</div> : null}
      {choBd ? <div className="text-[11px] text-text-muted">bắt đầu: {choBd}</div> : null}
      <NhanCanhBao v={v} />
    </div>
  );
}

/** Chip một phần việc: tên phụ trách · nội dung · ✓ hoặc nút Kết thúc. */
export function ChipPhanViec({
  p,
  homNay,
  coTheKetThuc,
  onKetThuc,
}: {
  p: PhanViec;
  homNay: string;
  coTheKetThuc: boolean;
  onKetThuc?: () => void;
}) {
  const xong = p.trang_thai === "da_ket_thuc";
  const phoiHop = p.vai === "phoi_hop";
  const qua = !phoiHop && !xong && !p.luon_mo && !!p.ket_thuc && p.ket_thuc < homNay;
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm border px-2 py-1 text-sm ${xong ? "border-border text-text-secondary" : qua ? "border-red" : "border-border"}`}>
      <AnhDaiDien ten={p.phu_trach_ten ?? p.phu_trach_id} />
      {/* Vai: chữ trần (luật 28) — chủ trì giữ hạn, phối hợp chỉ để biết */}
      <span className={`text-[11px] ${phoiHop ? "text-text-muted" : "font-semibold text-text-secondary"}`}>{phoiHop ? "phối hợp" : "chủ trì"}</span>
      <span className={xong ? "text-text-secondary" : "text-text"}>{p.phu_trach_ten ?? p.phu_trach_id}</span>
      <span className="text-text-muted">· {p.noi_dung}</span>
      {p.ket_thuc && !xong ? <span className={`font-mono text-[11px] ${qua ? "text-red" : "text-text-muted"}`}>hạn {ngayNgan(p.ket_thuc)}</span> : null}
      {xong ? (
        <Check size={14} className="text-green" aria-label="Đã kết thúc" />
      ) : coTheKetThuc && onKetThuc && !phoiHop ? (
        <button type="button" onClick={onKetThuc} className="rounded-sm border border-accent px-2 py-0.5 text-xs text-accent hover:bg-accent hover:text-white">
          Xong việc
        </button>
      ) : null}
    </div>
  );
}

export function AnhDaiDien({ ten, co = 20 }: { ten: string; co?: number }) {
  const chu = ten
    .replace(/^(Phòng|Nhà máy thủy điện|Nhà máy)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  let h = 0;
  for (const c of ten) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
      style={{ width: co, height: co, background: `hsl(${h} 45% 38%)` }}
      aria-hidden
    >
      {chu}
    </span>
  );
}

/** Khung hộp thoại đơn giản. */
export function HopThoai({ tieuDe, onDong, children }: { tieuDe: string; onDong: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onDong();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onDong]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onDong()}>
      <div className="w-full max-w-lg rounded border border-border bg-surface shadow-card" role="dialog" aria-label={tieuDe}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="font-semibold text-text">{tieuDe}</div>
          <button type="button" onClick={onDong} className="text-text-muted hover:text-text" aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/** Hộp Kết thúc phần việc: ghi kết quả + đính kèm file (tải vào thư mục Đi của đơn vị mình). */
export function HopKetThuc({
  congViecId,
  phan,
  thuMucKetQua,
  onDong,
  onXong,
}: {
  congViecId: string;
  phan: PhanViec;
  thuMucKetQua?: string | null;
  onDong: () => void;
  onXong: (kq: { tien_do: string; hoan_thanh: boolean }) => void;
}) {
  const [ghiChu, setGhiChu] = useState("");
  const [tep, setTep] = useState<File[]>([]);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const oTep = useRef<HTMLInputElement>(null);

  async function gui() {
    setDang(true);
    setLoi(null);
    try {
      const tepKq: { tai_lieu_id: string }[] = [];
      if (tep.length) {
        let thuMuc = thuMucKetQua;
        if (thuMuc === undefined) {
          const ct = await goiApi<{ thu_muc_ket_qua: string | null }>(`/api/cong-viec/${encodeURIComponent(congViecId)}`);
          thuMuc = ct.thu_muc_ket_qua;
        }
        if (!thuMuc) throw new Error("Không tìm thấy thư mục của đơn vị bạn để lưu file kết quả");
        const f = new FormData();
        f.set("thu_muc_id", thuMuc);
        f.set("phan_viec_id", phan.id); // file kết quả: không cần quyền tải thẳng lên thư mục
        for (const t of tep) f.append("tep", t);
        const r = await fetchCoLoiViet("/api/tai-lieu", { method: "POST", body: f });
        const j = (await r.json().catch(() => ({}))) as { da_tai?: { tai_lieu_id: string }[]; loi?: string };
        if (!r.ok) throw new Error(j.loi || "Tải file kết quả không được");
        for (const d of j.da_tai ?? []) tepKq.push({ tai_lieu_id: d.tai_lieu_id });
      }
      const kq = await goiApi<{ tien_do: string; hoan_thanh: boolean }>(`/api/cong-viec/${encodeURIComponent(congViecId)}`, {
        hanh_dong: "ket_thuc",
        phan_viec_id: phan.id,
        ghi_chu: ghiChu,
        tep_ket_qua: tepKq,
      });
      onXong(kq);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  return (
    <HopThoai tieuDe="Xong việc — báo cáo cho người giao việc" onDong={onDong}>
      <div className="space-y-3 text-sm">
        <div className="rounded-sm border border-border px-3 py-2">
          <div className="text-text">{phan.noi_dung}</div>
          <div className="text-xs text-text-muted">
            {congViecId} · {phan.phu_trach_ten}
            {phan.phu_trach_loai === "don_vi" ? " · bạn bấm thay đơn vị, lịch sử ghi tên bạn" : ""}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-text-secondary">Báo cáo ngắn gọn cho người giao việc</span>
          <textarea
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            rows={3}
            placeholder="Ví dụ: đã ký biên bản với 3 hộ"
            className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>
        <div>
          <input ref={oTep} type="file" multiple hidden onChange={(e) => setTep(Array.from(e.target.files ?? []))} />
          <button type="button" onClick={() => oTep.current?.click()} className="inline-flex items-center gap-1 text-text-secondary hover:text-text">
            <Paperclip size={14} /> Đính kèm file
          </button>
          {tep.length ? <div className="mt-1 text-xs text-text-muted">{tep.map((t) => t.name).join(", ")}</div> : null}
        </div>
        {loi ? <div className="text-red">{loi}</div> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onDong} className="rounded-sm border border-border px-3 py-1.5 text-text-secondary hover:text-text">
            Hủy
          </button>
          <button
            type="button"
            disabled={dang}
            onClick={gui}
            className="inline-flex items-center gap-1 rounded-sm bg-accent px-3 py-1.5 text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {dang ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Gửi báo cáo & xong việc
          </button>
        </div>
      </div>
    </HopThoai>
  );
}

export interface DanhMuc {
  don_vi: { id: string; ten: string; ten_ngan: string; cap: number; loai?: string; cha_id?: string | null }[];
  nguoi_dung: { id: string; ten: string; don_vi_id: string | null }[];
  du_an: string[];
  toi?: { id: string; ten: string; don_vi_ids: string[]; co_the_giao: boolean };
}

let boNhoDanhMuc: Promise<DanhMuc> | null = null;
export function napDanhMuc(): Promise<DanhMuc> {
  if (!boNhoDanhMuc) boNhoDanhMuc = goiApi<DanhMuc>("/api/so-cai/danh-muc").catch((e) => ((boNhoDanhMuc = null), Promise.reject(e)));
  return boNhoDanhMuc;
}

/** Ô chọn người hoặc đơn vị phụ trách (giá trị dạng 'don_vi:p-dtpc' / 'nguoi:hung.tv@...'). */
export function ChonPhuTrach({
  dm,
  giaTri,
  onDoi,
  className = "",
}: {
  dm: DanhMuc | null;
  giaTri: PhuTrach | null;
  onDoi: (p: PhuTrach | null) => void;
  className?: string;
}) {
  const v = giaTri ? `${giaTri.loai}:${giaTri.id}` : "";
  return (
    <select
      value={v}
      onChange={(e) => {
        const [loai, ...con] = e.target.value.split(":");
        const id = con.join(":");
        if (!id) return onDoi(null);
        const ten = loai === "don_vi" ? dm?.don_vi.find((d) => d.id === id)?.ten : dm?.nguoi_dung.find((n) => n.id === id)?.ten;
        onDoi({ loai: loai as PhuTrach["loai"], id, ten: ten ?? id, noi_dung: giaTri?.noi_dung });
      }}
      className={`rounded-sm border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent ${className}`}
    >
      <option value="">— Chọn người / đơn vị —</option>
      <optgroup label="Đơn vị">
        {dm?.don_vi.map((d) => (
          <option key={d.id} value={`don_vi:${d.id}`}>
            {d.ten}
          </option>
        ))}
      </optgroup>
      <optgroup label="Người">
        {dm?.nguoi_dung.map((n) => (
          <option key={n.id} value={`nguoi:${n.id}`}>
            {n.ten} ({dm.don_vi.find((d) => d.id === n.don_vi_id)?.ten_ngan ?? "chưa gán đơn vị"})
          </option>
        ))}
      </optgroup>
    </select>
  );
}

export function Thong({ thongDiep, onTat }: { thongDiep: string | null; onTat: () => void }) {
  useEffect(() => {
    if (!thongDiep) return;
    const t = setTimeout(onTat, 4000);
    return () => clearTimeout(t);
  }, [thongDiep, onTat]);
  if (!thongDiep) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded border border-border bg-surface px-4 py-2 text-sm text-text shadow-card" role="status">
      {thongDiep}
    </div>
  );
}

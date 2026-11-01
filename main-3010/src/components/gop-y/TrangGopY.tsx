"use client";

// /gop-y — GÓP Ý, PHẢN ÁNH (Mr. Đại chốt 03/10/2026: mọi agent đều có, giống agent Công việc 3004 /gop-y).
// Ai đăng nhập cũng gửi + XEM MỌI góp ý. Quản trị (PM/Admin) đặt trạng thái (chọn là lưu ngay) + câu trả lời.
// Mỗi agent MỘT sổ riêng (data/gop-y). Chưa có chuông báo vì app này chưa có tính năng thông báo.
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { CAC_TT, NHAN_TT, TOI_DA_ANH, type GopY, type TrangThai } from "@/lib/gop-y/loai";
import { DONG_MOT_TRANG, PhanTrang, usePhanTrang } from "@/components/common/PhanTrang";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const o = "w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
const nutChinh =
  "inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const nutPhu =
  "inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-sm text-text-secondary transition hover:border-accent hover:text-text disabled:opacity-50";

const ngayGio = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

async function goi<T>(url: string, opt?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  const r = await fetch(url, {
    method: opt?.method ?? (opt?.form || opt?.body ? "POST" : "GET"),
    headers: opt?.body ? { "content-type": "application/json" } : undefined,
    body: opt?.form ?? (opt?.body ? JSON.stringify(opt.body) : undefined),
    cache: "no-store",
  });
  const j = (await r.json().catch(() => null)) as ({ ok?: boolean; message?: string } & T) | null;
  if (!r.ok || !j || j.ok === false) throw new Error(j?.message ?? `Lỗi ${r.status}`);
  return j;
}

export default function TrangGopY() {
  return (
    <Suspense fallback={null}>
      <NoiDung />
    </Suspense>
  );
}

function NoiDung() {
  const sp = useSearchParams();
  const [dl, setDl] = useState<{ gop_y: GopY[]; toi: string; la_quan_tri: boolean } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [thong, setThong] = useState<string | null>(null);
  const [loc, setLoc] = useState<TrangThai | "">("");
  const [mo, setMo] = useState<string | null>(sp.get("id"));

  const tai = useCallback(async () => {
    try {
      setDl(await goi("/api/gop-y"));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);

  const ds = (dl?.gop_y ?? []).filter((g) => !loc || g.trang_thai === loc);
  // 30 góp ý một trang (E40 — Mr. Đại 04/10); đổi bộ lọc thì về trang 1
  const pt = usePhanTrang(ds, loc);
  // Mở sẵn một góp ý (?id= hoặc vừa gửi) nằm ở trang sau → nhảy tới đúng trang đó
  const viTriMo = mo ? ds.findIndex((g) => g.id === mo) : -1;
  const { doiTrang } = pt;
  useEffect(() => {
    if (viTriMo >= 0) doiTrang(Math.floor(viTriMo / DONG_MOT_TRANG));
  }, [viTriMo, doiTrang]);
  // Nút X (Mr. Đại 04/10): quay về trang vừa rời — nút Góp ý trên thanh trên gửi kèm ?tu=<trang>; thiếu thì về trang chủ
  const tu = sp.get("tu") ?? "";
  const quayVe = tu.startsWith("/") && !tu.startsWith("//") ? tu : "/";
  const dem = (k: TrangThai) => dl?.gop_y.filter((g) => g.trang_thai === k).length ?? 0;

  return (
    // data-gop-y: nền trắng (chế độ sáng) thì mọi chữ đen, trừ tiêu đề "Góp ý, phản ánh" (Mr. Đại 04/10 — globals.css)
    <div className="mx-auto max-w-4xl space-y-4 p-5" data-gt="Góp ý, phản ánh" data-gop-y>
      <KhaiHuongDan ma="gop-y" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <b className="text-[15px] text-text">Góp ý, phản ánh</b>
          <p className="mt-1 text-sm text-text-secondary">
            Gặp chỗ bất tiện, số liệu khó hiểu, lỗi, hay có ý tưởng cho phần mềm tốt hơn — viết vào đây, dán kèm ảnh chụp màn hình nếu có. Mọi người đều đọc được góp ý của nhau; người quản trị sẽ đặt trạng thái và trả lời ngay tại đây.
          </p>
        </div>
        <Link
          href={quayVe}
          aria-label="Đóng góp ý"
          title="Đóng — quay lại trang trước"
          data-gt="Đóng góp ý"
          className="shrink-0 rounded-sm border border-border p-1 text-text-secondary transition hover:border-accent hover:text-text"
        >
          <X size={16} />
        </Link>
      </div>
      {loi ? (
        <div className="flex items-start justify-between gap-2 rounded-sm border border-red/40 px-3 py-2 text-sm text-red">
          <span>{loi}</span>
          <button type="button" onClick={() => setLoi(null)} aria-label="Đóng"><X size={14} /></button>
        </div>
      ) : null}
      {thong ? (
        <div className="flex items-start justify-between gap-2 rounded-sm border border-green/40 px-3 py-2 text-sm text-green">
          <span>{thong}</span>
          <button type="button" onClick={() => setThong(null)} aria-label="Đóng"><X size={14} /></button>
        </div>
      ) : null}

      <OGui
        trang={sp.get("tu")}
        daGui={(id) => {
          setThong(`Đã gửi góp ý ${id}. Cảm ơn bạn — người quản trị sẽ trả lời ở đây.`);
          setLoc("");
          setMo(id);
          void tai();
        }}
        loi={setLoi}
      />

      <section className="rounded border border-border bg-surface" data-khoi-trang>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <b className="text-sm text-text">Các góp ý ({dl?.gop_y.length ?? 0})</b>
          <div className="flex flex-wrap gap-1.5 text-xs" data-gt="Lọc góp ý theo trạng thái">
            {([["", "Tất cả", dl?.gop_y.length ?? 0], ...CAC_TT.map((k) => [k, NHAN_TT[k], dem(k)] as const)] as const).map(([k, nhan, n]) => (
              <button
                key={k}
                type="button"
                aria-pressed={loc === k}
                onClick={() => setLoc(k as TrangThai | "")}
                className={`rounded-sm border px-2 py-0.5 ${loc === k ? "border-accent text-accent" : "border-border text-text-secondary hover:border-accent"}`}
              >
                {nhan} · {n}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-2">
          {!dl ? (
            <Loader2 className="animate-spin text-text-muted" size={16} />
          ) : ds.length === 0 ? (
            <p className="py-2 text-sm text-text-muted">Chưa có góp ý nào{loc ? " ở mục này" : ""}.</p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {pt.phan.map((g) => (
                  <DongGopY key={g.id} g={g} mo={mo === g.id} bat={() => setMo(mo === g.id ? null : g.id)} toi={dl.toi} laQuanTri={dl.la_quan_tri} sauKhiDoi={tai} loi={setLoi} />
                ))}
              </ul>
              <PhanTrang trang={pt.trang} soTrang={pt.soTrang} tong={pt.tong} onDoi={pt.doiTrang} donVi="góp ý" className="mb-1" />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/** Ô viết góp ý: tên + mô tả + ảnh (dán Ctrl+V ở bất kỳ đâu trong khung, bấm chọn file, hoặc kéo thả) */
function OGui({ trang, daGui, loi }: { trang: string | null; daGui: (id: string) => void; loi: (s: string) => void }) {
  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [anh, setAnh] = useState<{ f: File; url: string }[]>([]);
  const [dang, setDang] = useState(false);
  const oTep = useRef<HTMLInputElement>(null);
  const them = (fs: File[]) => {
    const moi = fs.filter((f) => f.type.startsWith("image/"));
    if (!moi.length) return;
    setAnh((a) =>
      [...a, ...moi.map((f, i) => ({ f: f.name ? f : new File([f], `anh-dan-${Date.now()}-${i}.png`, { type: f.type }), url: URL.createObjectURL(f) }))].slice(0, TOI_DA_ANH),
    );
  };
  const bo = () => {
    anh.forEach((a) => URL.revokeObjectURL(a.url));
    setTieuDe("");
    setNoiDung("");
    setAnh([]);
  };
  async function gui() {
    setDang(true);
    try {
      const fd = new FormData();
      fd.set("tieu_de", tieuDe);
      fd.set("noi_dung", noiDung);
      if (trang) fd.set("trang", trang);
      anh.forEach((a) => fd.append("anh", a.f));
      const r = await goi<{ id: string }>("/api/gop-y", { form: fd });
      bo();
      daGui(r.id);
    } catch (e) {
      loi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }
  return (
    <div
      className="space-y-2 rounded border border-border bg-surface p-4"
      onPaste={(e) => {
        const fs = Array.from(e.clipboardData.files);
        if (fs.some((f) => f.type.startsWith("image/"))) {
          e.preventDefault();
          them(fs);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        them(Array.from(e.dataTransfer.files));
      }}
    >
      <input value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} maxLength={200} placeholder="Tên góp ý — ngắn gọn, sau còn tìm lại" className={o} />
      <textarea value={noiDung} onChange={(e) => setNoiDung(e.target.value)} rows={4} placeholder="Mô tả: bạn đang làm gì, ở màn nào, thấy gì, mong muốn thế nào…" className={o} />
      <input ref={oTep} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { them(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <button
        type="button"
        onClick={() => oTep.current?.click()}
        data-gt="Dán ảnh chụp màn hình"
        className="flex w-full items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-left text-xs text-text-muted hover:text-text"
      >
        <ImagePlus size={14} /> <b className="text-text-secondary">Ctrl+V</b> để dán ảnh chụp màn hình (dán ở bất kỳ đâu trong khung này đều được) — hoặc bấm vào đây để chọn file, tối đa {TOI_DA_ANH} ảnh.
      </button>
      {anh.length ? (
        <div className="flex flex-wrap gap-2">
          {anh.map((a, i) => (
            <span key={a.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.f.name} className="h-20 w-auto rounded-sm border border-border" />
              <button
                type="button"
                onClick={() => (URL.revokeObjectURL(a.url), setAnh((x) => x.filter((_, j) => j !== i)))}
                className="absolute -right-2 -top-2 rounded-full border border-border bg-surface p-0.5"
                aria-label="Bỏ ảnh này"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <button type="button" className={nutChinh} onClick={() => void gui()} disabled={dang || !tieuDe.trim()} data-gt="Gửi góp ý">
          {dang ? <Loader2 size={14} className="animate-spin" /> : null} Gửi góp ý
        </button>
        {tieuDe || noiDung || anh.length ? <button type="button" className={nutPhu} onClick={bo} disabled={dang}>Bỏ</button> : null}
      </div>
    </div>
  );
}

function DongGopY({ g, mo, bat, toi, laQuanTri, sauKhiDoi, loi }: { g: GopY; mo: boolean; bat: () => void; toi: string; laQuanTri: boolean; sauKhiDoi: () => Promise<void>; loi: (s: string) => void }) {
  const [traLoi, setTraLoi] = useState(g.tra_loi ?? "");
  const [dang, setDang] = useState(false);
  const [xemAnh, setXemAnh] = useState<number | null>(null);
  useEffect(() => setTraLoi(g.tra_loi ?? ""), [g.tra_loi]);
  async function luu(trangThai: TrangThai) {
    setDang(true);
    try {
      await goi(`/api/gop-y/${encodeURIComponent(g.id)}`, { method: "PUT", body: { trang_thai: trangThai, tra_loi: traLoi } });
      await sauKhiDoi();
    } catch (e) {
      loi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }
  async function xoa() {
    setDang(true);
    try {
      await goi(`/api/gop-y/${encodeURIComponent(g.id)}`, { method: "DELETE" });
      await sauKhiDoi();
    } catch (e) {
      loi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }
  const duocXoa = laQuanTri || (g.nguoi === toi && g.trang_thai === "moi");
  return (
    <li id={`gy-${g.id}`} className="py-2">
      <button type="button" onClick={bat} className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left" data-gt="Một góp ý">
        <span className="font-mono text-[11px] text-text-muted">{g.id}</span>
        <span className="font-medium text-text">{g.tieu_de}</span>
        {g.anh.length ? <span className="text-xs text-text-muted">· {g.anh.length} ảnh</span> : null}
        <span className={`ml-auto text-xs ${g.trang_thai === "moi" ? "font-semibold text-text" : "text-text-secondary"}`}>{NHAN_TT[g.trang_thai]}</span>
        <span className="w-full text-[11px] text-text-muted">
          {g.ten_nguoi} · {ngayGio(g.tao_luc)}{g.trang ? ` · từ màn ${g.trang}` : ""}
        </span>
      </button>
      {mo ? (
        <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
          {g.noi_dung ? <p className="whitespace-pre-wrap text-sm text-text-secondary">{g.noi_dung}</p> : null}
          {g.anh.length ? (
            <div className="flex flex-wrap gap-2">
              {g.anh.map((a, i) => (
                <button key={i} type="button" onClick={() => setXemAnh(i)} title={`${a.ten} — bấm để xem to`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/gop-y/${encodeURIComponent(g.id)}/anh/${i}`} alt={a.ten} className="h-24 w-auto rounded-sm border border-border" />
                </button>
              ))}
            </div>
          ) : null}
          {g.tra_loi && !laQuanTri ? (
            <p className="text-sm text-text">
              <b>Trả lời</b>{g.ten_tra_loi ? ` của ${g.ten_tra_loi}` : ""}{g.tra_loi_luc ? ` (${ngayGio(g.tra_loi_luc)})` : ""}: {g.tra_loi}
            </p>
          ) : null}
          {laQuanTri ? (
            <div className="space-y-1.5">
              <textarea value={traLoi} onChange={(e) => setTraLoi(e.target.value)} rows={2} placeholder="Câu trả lời cho người góp ý (không bắt buộc)" className={o} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                Trạng thái
                <select value={g.trang_thai} onChange={(e) => void luu(e.target.value as TrangThai)} disabled={dang} data-gt="Trạng thái góp ý" className="rounded-sm border border-border bg-bg px-2 py-1 text-sm text-text">
                  {CAC_TT.map((k) => (
                    <option key={k} value={k}>{NHAN_TT[k]}</option>
                  ))}
                </select>
                {traLoi !== (g.tra_loi ?? "") ? (
                  <button type="button" className={nutChinh} onClick={() => void luu(g.trang_thai === "moi" ? "da_tiep_nhan" : g.trang_thai)} disabled={dang} data-gt="Gửi trả lời góp ý">Gửi trả lời</button>
                ) : null}
                <span>— chọn trạng thái là lưu ngay</span>
              </div>
            </div>
          ) : null}
          {duocXoa ? (
            <button type="button" className={`${nutPhu} hover:!border-red hover:!text-red`} onClick={() => void xoa()} disabled={dang} data-gt="Xoá góp ý">
              <Trash2 size={13} /> Xoá góp ý
            </button>
          ) : null}
        </div>
      ) : null}
      {xemAnh !== null ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={() => setXemAnh(null)} role="dialog" aria-label="Xem ảnh">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/gop-y/${encodeURIComponent(g.id)}/anh/${xemAnh}`} alt={g.anh[xemAnh]?.ten ?? ""} className="max-h-full max-w-full rounded bg-white" />
        </div>
      ) : null}
    </li>
  );
}

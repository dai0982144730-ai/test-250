"use client";
// /gop-y — GÓP Ý, PHẢN ÁNH (Mr. Đại chốt 01/10/2026; khuôn "Vấn đề phát sinh" của agent Tiến độ 3003 /kich-ban-test).
// Người dùng góp ý bất cập gặp phải / đề xuất cho app tốt hơn — anh dùng để nâng cấp, sửa app khi chạy thật.
// Ai đăng nhập cũng gửi + XEM MỌI góp ý. Quản trị đặt trạng thái (chọn là lưu ngay) + câu trả lời → người góp ý nhận chuông.
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { NutChinh, NutPhu, The, ThongDiep, goiApi, goiForm, ngayGio } from "@/components/gui/chung";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

type TrangThai = "moi" | "da_tiep_nhan" | "da_sua" | "khong_lam";
const NHAN_TT: Record<TrangThai, string> = { moi: "Mới", da_tiep_nhan: "Đã tiếp nhận", da_sua: "Đã sửa", khong_lam: "Không làm" };
interface GopY {
  id: string;
  tieu_de: string;
  noi_dung: string;
  trang: string | null;
  anh: { ten: string; kich_thuoc: number }[];
  nguoi: string;
  ten_nguoi: string;
  don_vi: string | null;
  trang_thai: TrangThai;
  tra_loi: string | null;
  ten_tra_loi: string | null;
  tra_loi_luc: string | null;
  tao_luc: string;
}
const TOI_DA_ANH = 6;
const o = "w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";

export default function TrangGopY() {
  return (
    <>
      <KhaiHuongDan ma="gop-y" />
      <Suspense fallback={null}>
        <NoiDung />
      </Suspense>
    </>
  );
}

function NoiDung() {
  const sp = useSearchParams();
  const [dl, setDl] = useState<{ gop_y: GopY[]; toi: string; la_quan_tri: boolean } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [thong, setThong] = useState<string | null>(null);
  const [loc, setLoc] = useState<TrangThai | "" | "cua_toi">("");
  const [mo, setMo] = useState<string | null>(sp.get("id"));

  const tai = useCallback(async () => {
    try {
      setDl(await goiApi("/api/gop-y"));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);
  // link từ chuông (/gop-y?id=GY-…): mở đúng góp ý đó
  useEffect(() => {
    const id = sp.get("id");
    if (!id || !dl) return;
    setMo(id);
    window.setTimeout(() => document.getElementById(`gy-${id}`)?.scrollIntoView({ block: "center" }), 50);
  }, [sp, dl]);

  const ds = (dl?.gop_y ?? []).filter((g) => (!loc ? true : loc === "cua_toi" ? g.nguoi === dl?.toi : g.trang_thai === loc));
  const dem = (k: TrangThai) => dl?.gop_y.filter((g) => g.trang_thai === k).length ?? 0;
  // Nút X (Mr. Đại 04/10): quay về trang vừa rời — nút Góp ý trên thanh trên gửi kèm ?tu=<trang>; thiếu thì về trang chủ
  const tu = sp.get("tu") ?? "";
  const quayVe = tu.startsWith("/") && !tu.startsWith("//") ? tu : "/";

  return (
    // Nền sáng cùng bộ màu màn Báo cáo (Mr. Đại chốt 01/10) — khối .trang-gui định nghĩa lại token màu, cả 3D lẫn 2D
    <div className="trang-trong">
    {/* data-gop-y: nền trắng nên mọi chữ đen, trừ tiêu đề "Góp ý, phản ánh" (Mr. Đại 04/10 — phong.css) */}
    <div className="trang-gui space-y-4" data-gop-y>
      <div className="tg-dau" style={{ alignItems: "flex-start" }}>
        <div>
          <b>Góp ý, phản ánh</b>
          <p className="phu" style={{ marginTop: 4 }}>
            Gặp chỗ bất tiện, số liệu khó hiểu, lỗi, hay có ý tưởng cho phần mềm tốt hơn — viết vào đây, dán kèm ảnh chụp màn hình nếu có. Mọi người đều đọc được góp ý; người quản trị trả lời và bạn sẽ nhận thông báo ở chuông.
          </p>
        </div>
        <Link href={quayVe} className="nut-dong-gy" aria-label="Đóng góp ý" title="Đóng — quay lại trang trước" data-gt="Đóng góp ý">
          <X size={16} />
        </Link>
      </div>
      {loi ? <ThongDiep loai="loi" onDong={() => setLoi(null)}>{loi}</ThongDiep> : null}
      {thong ? <ThongDiep loai="ok" onDong={() => setThong(null)}>{thong}</ThongDiep> : null}

      <OGui
        trang={sp.get("tu")}
        daGui={(id) => {
          setThong(`Đã gửi góp ý ${id}. Cảm ơn bạn — người quản trị sẽ trả lời ở đây và báo bạn qua chuông.`);
          setLoc("");
          setMo(id);
          void tai();
        }}
        loi={setLoi}
      />

      <The
        tieuDe={`Các góp ý (${dl?.gop_y.length ?? 0})`}
        phai={
          <div className="flex flex-wrap gap-1.5 text-xs">
            {([["", "Tất cả", dl?.gop_y.length ?? 0], ["moi", "Mới", dem("moi")], ["da_tiep_nhan", "Đã tiếp nhận", dem("da_tiep_nhan")], ["da_sua", "Đã sửa", dem("da_sua")], ["khong_lam", "Không làm", dem("khong_lam")], ["cua_toi", "Của tôi", dl?.gop_y.filter((g) => g.nguoi === dl.toi).length ?? 0]] as const).map(([k, nhan, n]) => (
              <button key={k} type="button" aria-pressed={loc === k} onClick={() => setLoc(k)} className={`rounded-sm border px-2 py-0.5 ${loc === k ? "border-accent text-accent" : "border-border text-text-secondary hover:text-text"}`}>
                {nhan} · {n}
              </button>
            ))}
          </div>
        }
      >
        {!dl ? (
          <Loader2 className="animate-spin text-text-muted" size={16} />
        ) : ds.length === 0 ? (
          <p className="text-sm text-text-muted">Chưa có góp ý nào{loc ? " ở mục này" : ""}.</p>
        ) : (
          <ul className="divide-y divide-border">
            {ds.map((g) => (
              <DongGopY key={g.id} g={g} mo={mo === g.id} bat={() => setMo(mo === g.id ? null : g.id)} toi={dl.toi} laQuanTri={dl.la_quan_tri} sauKhiDoi={tai} loi={setLoi} />
            ))}
          </ul>
        )}
      </The>
    </div>
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
    setAnh((a) => [...a, ...moi.map((f, i) => ({ f: f.name ? f : new File([f], `anh-dan-${Date.now()}-${i}.png`, { type: f.type }), url: URL.createObjectURL(f) }))].slice(0, TOI_DA_ANH));
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
      const r = await goiForm<{ id: string }>("/api/gop-y", fd);
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
      <input value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} maxLength={200} placeholder="Tên góp ý — ngắn gọn, sau còn tìm lại (vd: Số việc trên ô Phòng TCKT không khớp danh sách)" className={o} />
      <textarea value={noiDung} onChange={(e) => setNoiDung(e.target.value)} rows={4} placeholder="Mô tả: bạn đang làm gì, ở màn nào, thấy gì, mong muốn thế nào…" className={o} />
      <input ref={oTep} type="file" accept="image/*" multiple hidden onChange={(e) => { them(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <button type="button" onClick={() => oTep.current?.click()} className="flex w-full items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-left text-xs text-text-muted hover:text-text">
        <ImagePlus size={14} /> <b className="text-text-secondary">Ctrl+V</b> để dán ảnh chụp màn hình (dán ở bất kỳ đâu trong khung này đều được) — hoặc bấm vào đây để chọn ảnh, hoặc kéo thả ảnh vào. Tối đa {TOI_DA_ANH} ảnh.
      </button>
      {anh.length ? (
        <div className="flex flex-wrap gap-2">
          {anh.map((a, i) => (
            <span key={a.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.f.name} className="h-20 w-auto rounded-sm border border-border" />
              <button type="button" onClick={() => (URL.revokeObjectURL(a.url), setAnh((x) => x.filter((_, j) => j !== i)))} className="absolute -right-2 -top-2 rounded-full border border-border bg-surface p-0.5 text-text-muted hover:text-red" aria-label="Bỏ ảnh này">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <NutChinh onClick={() => void gui()} disabled={dang || !tieuDe.trim()}>
          {dang ? <Loader2 size={14} className="animate-spin" /> : null} Gửi góp ý
        </NutChinh>
        {tieuDe || noiDung || anh.length ? <NutPhu onClick={bo} disabled={dang}>Bỏ</NutPhu> : null}
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
      await goiApi(`/api/gop-y/${encodeURIComponent(g.id)}`, { trang_thai: trangThai, tra_loi: traLoi }, "PUT");
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
      await goiApi(`/api/gop-y/${encodeURIComponent(g.id)}`, undefined, "DELETE");
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
      <button type="button" onClick={bat} className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left">
        <span className="font-mono text-[11px] text-text-muted">{g.id}</span>
        <span className="font-medium text-text">{g.tieu_de}</span>
        {g.anh.length ? <span className="text-xs text-text-muted">· {g.anh.length} ảnh</span> : null}
        <span className={`ml-auto text-xs ${g.trang_thai === "moi" ? "font-semibold text-text" : "text-text-secondary"}`}>{NHAN_TT[g.trang_thai]}</span>
        <span className="w-full text-[11px] text-text-muted">
          {g.ten_nguoi}{g.don_vi ? ` · ${g.don_vi}` : ""} · {ngayGio(g.tao_luc, true)}{g.trang ? ` · từ màn ${g.trang}` : ""}
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
              <b>Trả lời</b>{g.ten_tra_loi ? ` của ${g.ten_tra_loi}` : ""}{g.tra_loi_luc ? ` (${ngayGio(g.tra_loi_luc, true)})` : ""}: {g.tra_loi}
            </p>
          ) : null}
          {laQuanTri ? (
            <div className="space-y-1.5">
              <textarea value={traLoi} onChange={(e) => setTraLoi(e.target.value)} rows={2} placeholder="Câu trả lời cho người góp ý (không bắt buộc)" className={o} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                Trạng thái
                <select value={g.trang_thai} onChange={(e) => void luu(e.target.value as TrangThai)} disabled={dang} className="rounded-sm border border-border bg-bg px-2 py-1 text-sm text-text">
                  {(Object.keys(NHAN_TT) as TrangThai[]).map((k) => (
                    <option key={k} value={k}>{NHAN_TT[k]}</option>
                  ))}
                </select>
                {traLoi !== (g.tra_loi ?? "") ? <NutChinh onClick={() => void luu(g.trang_thai === "moi" ? "da_tiep_nhan" : g.trang_thai)} disabled={dang}>Gửi trả lời</NutChinh> : null}
                <span>— chọn trạng thái là lưu ngay và báo người góp ý</span>
              </div>
            </div>
          ) : null}
          {duocXoa ? (
            <NutPhu nguyHiem onClick={() => void xoa()} disabled={dang}>
              <Trash2 size={13} /> Xoá góp ý
            </NutPhu>
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

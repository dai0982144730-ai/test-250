"use client";
// ============================================================
// DinhKem — TỆP ĐÍNH KÈM VIỆC phía màn (Mr. Đại chốt 29/09/2026):
//   · <ChonTep>  nút 📎 kẹp file (giao việc / báo xong / bình luận): chọn là tải lên ngay từng file, hiện tên + ✕ bỏ;
//                tối đa N file, mỗi file ≤ M MB theo Cài đặt → trả danh sách mã để gửi kèm khi bấm Giao / Xong / Gửi.
//   · <DsTep>    danh sách file: tên · cỡ · Xem (cửa sổ nổi) · Tải về; file hết hạn lưu hiện chữ mờ "đã xóa…".
//   · <CuaSoXemTep> cửa sổ nổi GIỮA màn, đè lên app — docx/xlsx (HTML), pdf, ảnh; ✕ / Esc / bấm nền là đóng. Gắn MỘT lần ở
//                khung app; chỗ khác gọi moXemTep(id, ten).
//                Mở từ MỘT dòng cụ thể thì truyền `tim` (câu của dòng đó): cửa sổ khoanh cam đúng dòng và cuộn tới (Mr. Đại chốt
//                02/10: "người xem không thể đọc mấy trang A4 chỉ để tìm một hai dòng") — hàm khoanh chung dinh-kem/khoanh.ts.
// ============================================================
import { useEffect, useRef, useState, type ReactNode } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { khoanhDong } from "./khoanh";
import { coTep, duongTai, xemDuoc, type NoiDinhKem, type TepDinhKem } from "@/lib/dinh-kem/chung";

const SU_KIEN = "sci-xem-tep";

/** Mở cửa sổ xem file ở giữa màn (cần <CuaSoXemTep/> đã gắn ở khung app). `tim`: câu của (các) dòng cần khoanh cam. */
export function moXemTep(id: string, ten: string, loai: LoaiNguon = "dinh_kem", tim?: (string | null | undefined)[]): void {
  window.dispatchEvent(new CustomEvent(SU_KIEN, { detail: { id, ten, loai, tim: (tim ?? []).filter((x): x is string => !!x?.trim()) } }));
}

/** dinh_kem = file kẹp ở việc; tai_lieu = báo cáo / tài liệu trong Thư mục (tin "nhận tài liệu") */
type LoaiNguon = "dinh_kem" | "tai_lieu";
type TepNho = { id: string; ten: string; xoa?: boolean; loai?: LoaiNguon };
const duongTaiNguon = (t: { id: string; loai?: LoaiNguon }) =>
  t.loai === "tai_lieu" ? `/api/tai-lieu/${encodeURIComponent(t.id)}/tep` : duongTai(t.id);

/** Nút Xem + Tải về cho một file (dùng ở chuông, danh sách file). Nút là nút thật nên có viền (luật 28). */
export function NutTep({ t, gon }: { t: TepNho; gon?: boolean }) {
  if (t.xoa) return <span className="text-[11px] text-text-muted">{t.ten} · đã xóa do hết hạn lưu</span>;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-[11.5px]">
      <span className="truncate text-text-secondary" title={t.ten}>
        📎 {t.ten}
      </span>
      {(t.loai === "tai_lieu" || xemDuoc(t.ten)) && (
        <button
          type="button"
          className="shrink-0 rounded-sm border border-border px-1.5 leading-5 text-accent hover:bg-bg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            moXemTep(t.id, t.ten, t.loai);
          }}
        >
          Xem
        </button>
      )}
      <a
        href={duongTaiNguon(t)}
        className="shrink-0 rounded-sm border border-border px-1.5 leading-5 text-accent hover:bg-bg"
        onClick={(e) => e.stopPropagation()}
        title={gon ? "Tải file về máy" : undefined}
      >
        Tải về
      </a>
    </span>
  );
}

export function DsTep({ tep, tieuDe }: { tep: TepDinhKem[]; tieuDe?: string }) {
  if (!tep.length) return null;
  return (
    <div className="ds-tep">
      {tieuDe && <div className="text-[11px] text-text-muted">{tieuDe}</div>}
      {tep.map((t) => (
        <div key={t.id} className="flex items-center gap-2">
          <NutTep t={{ id: t.id, ten: t.ten_tep, xoa: !!t.xoa_luc }} />
          {!t.xoa_luc && <span className="text-[10.5px] text-text-muted">{coTep(t.kich_thuoc)}</span>}
        </div>
      ))}
    </div>
  );
}

export interface CaiDatDinhKem {
  giao_viec: boolean;
  bao_xong: boolean;
  binh_luan: boolean;
  toi_da_mb: number;
  so_file_toi_da: number;
  luu_thang: number;
}

/**
 * Nút 📎 kẹp file. `tep` / `setTep`: danh sách đã tải lên (giữ ở màn cha để gửi mã kèm). Tắt trong Cài đặt → nút mờ + lý do
 * (luật 17). Tải lên từng file một (file lớn, tránh vượt giới hạn một lượt gửi).
 */
type ThamSoKep = {
  noi: NoiDinhKem;
  cd: CaiDatDinhKem | null;
  tep: { id: string; ten: string; kich_thuoc: number }[];
  setTep: (f: (x: { id: string; ten: string; kich_thuoc: number }[]) => { id: string; ten: string; kich_thuoc: number }[]) => void;
  dangTai?: (b: boolean) => void;
};

export function ChonTep(ts: ThamSoKep) {
  const k = useKepTep(ts);
  return (
    <div className="chon-tep">
      {k.nut}
      {k.ds}
    </div>
  );
}

/**
 * Tách hai phần (Mr. Đại chốt 29/09): `nut` đặt CÙNG HÀNG với ô nội dung + nút Gửi; `ds` (file đã kẹp, tiến độ tải, lỗi)
 * hiện ở hàng dưới CHỈ khi có — không kẹp gì thì không tốn thêm hàng.
 */
export function useKepTep({ noi, cd, tep, setTep, dangTai }: ThamSoKep): { nut: ReactNode; ds: ReactNode } {
  const input = useRef<HTMLInputElement>(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState("");
  const bat = !!cd?.[noi];
  const toiDa = cd?.so_file_toi_da ?? 20;
  const mb = cd?.toi_da_mb ?? 50;

  const chon = async (ds: FileList | null) => {
    if (!ds?.length) return;
    setLoi("");
    const files = Array.from(ds);
    const conCho = toiDa - tep.length;
    if (files.length > conCho) {
      setLoi(`Mỗi lần kẹp tối đa ${toiDa} file — còn chọn được ${Math.max(conCho, 0)}`);
      return;
    }
    const qua = files.find((f) => f.size > mb * 1024 * 1024);
    if (qua) {
      setLoi(`File "${qua.name}" ${coTep(qua.size)} vượt ${mb} MB`);
      return;
    }
    dangTai?.(true);
    try {
      for (let i = 0; i < files.length; i++) {
        setDang(`Đang tải ${i + 1}/${files.length}: ${files[i].name}`);
        const fd = new FormData();
        fd.set("noi", noi);
        fd.set("tep", files[i]);
        const r = await goiApi<{ tep: { id: string; ten_tep: string; kich_thuoc: number } }>("/api/dinh-kem", { form: fd });
        setTep((x) => [...x, { id: r.tep.id, ten: r.tep.ten_tep, kich_thuoc: r.tep.kich_thuoc }]);
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang("");
      dangTai?.(false);
      if (input.current) input.current.value = "";
    }
  };

  // Tắt trong Cài đặt → ẨN nút (Mr. Đại chốt 29/09, riêng 3004: không bấm được thì không hiện)
  const nut = cd && !bat ? null : (
    <>
      <button
        type="button"
        className="nut-kep"
        disabled={!bat || !!dang || tep.length >= toiDa}
        title={
          !cd
            ? "Đang tải cài đặt…"
            : !bat
              ? "Kẹp file ở chỗ này đang tắt trong Cài đặt → Tệp đính kèm việc"
              : `Kẹp file (tối đa ${toiDa} file, mỗi file ≤ ${mb} MB; lưu ${cd.luu_thang} tháng)`
        }
        onClick={() => input.current?.click()}
        aria-label="Kẹp file"
      >
        {/* Chỉ hình ghim, không chữ (Mr. Đại chốt 30/09); đã kẹp thì kèm số file */}
        📎{tep.length ? ` ${tep.length}/${toiDa}` : ""}
      </button>
      <input ref={input} type="file" multiple hidden onChange={(e) => void chon(e.target.files)} />
    </>
  );
  const co = !!dang || !!loi || tep.length > 0;
  const ds = !co ? null : (
    <div className="chon-tep">
      {dang && <span className="text-[11px] text-text-muted">{dang}</span>}
      {tep.map((t) => (
        <span key={t.id} className="tep-da-kep">
          📎 {t.ten} <span className="text-text-muted">{coTep(t.kich_thuoc)}</span>
          <button type="button" title="Bỏ file này" onClick={() => setTep((x) => x.filter((y) => y.id !== t.id))}>
            ✕
          </button>
        </span>
      ))}
      {loi && <span className="text-[11px] text-red">{loi}</span>}
    </div>
  );
  return { nut, ds };
}

type BanXem = {
  ten_tep?: string;
  thong_tin?: { ten_tep: string };
  loai: "html" | "pdf" | "anh" | "chu" | "khong_ho_tro";
  html?: string;
  chu?: string;
  ghi_chu?: string;
  ban_pdf?: boolean;
};

/** Cửa sổ xem nổi giữa màn. Gắn một lần ở khung app. */
export function CuaSoXemTep() {
  const [mo, setMo] = useState<{ id: string; ten: string; loai?: LoaiNguon; tim?: string[] } | null>(null);
  const [ban, setBan] = useState<BanXem | null>(null);
  const [loi, setLoi] = useState("");
  // số dòng khoanh được (null = không cần khoanh / chưa vẽ xong)
  const [soKhoanh, setSoKhoanh] = useState<number | null>(null);
  const thanRef = useRef<HTMLDivElement>(null);
  const htmlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nghe = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; ten: string; loai?: LoaiNguon; tim?: string[] }>).detail;
      setMo(d);
      setBan(null);
      setLoi("");
      setSoKhoanh(null);
      const url = d.loai === "tai_lieu" ? `/api/tai-lieu/${encodeURIComponent(d.id)}/xem-truoc` : `/api/dinh-kem/${encodeURIComponent(d.id)}/xem`;
      goiApi<BanXem>(url)
        .then((b) => {
          setBan(b);
          const ten = b.thong_tin?.ten_tep ?? b.ten_tep;
          if (ten) setMo((m) => (m ? { ...m, ten } : m));
        })
        .catch((er) => setLoi(er instanceof Error ? er.message : String(er)));
    };
    window.addEventListener(SU_KIEN, nghe);
    return () => window.removeEventListener(SU_KIEN, nghe);
  }, []);
  // Bản xem HTML tự đặt vào khung (không qua dangerouslySetInnerHTML: React vẽ lại khung là mất lớp khoanh — đo 02/10),
  // rồi khoanh cam dòng cần xem
  const tim = mo?.tim;
  useEffect(() => {
    if (!ban || !thanRef.current) return;
    if (ban.loai === "html" && htmlRef.current) htmlRef.current.innerHTML = ban.html ?? "";
    if (tim?.length && (ban.loai === "html" || ban.loai === "chu")) setSoKhoanh(khoanhDong(thanRef.current, tim));
  }, [ban, tim]);
  useEffect(() => {
    if (!mo) return;
    const phim = (e: KeyboardEvent) => e.key === "Escape" && setMo(null);
    window.addEventListener("keydown", phim);
    return () => window.removeEventListener("keydown", phim);
  }, [mo]);

  if (!mo) return null;
  const nguon =
    mo.loai === "tai_lieu"
      ? `/api/tai-lieu/${encodeURIComponent(mo.id)}/tep?inline=1${ban?.ban_pdf ? "&ban=pdf" : ""}`
      : `/api/dinh-kem/${encodeURIComponent(mo.id)}`;
  return (
    <div className="cua-so-xem-nen" onMouseDown={(e) => e.target === e.currentTarget && setMo(null)}>
      <div className="cua-so-xem" role="dialog" aria-label={`Xem ${mo.ten}`}>
        <div className="cua-so-xem-dau">
          <b className="truncate" title={mo.ten}>
            {mo.ten}
            {mo.tim?.length ? (
              <span className="ghi-khoanh">
                {" "}
                ·{" "}
                {ban && ban.loai !== "html" && ban.loai !== "chu"
                  ? `bản này không khoanh được — tìm (Ctrl+F): “${mo.tim[0].slice(0, 40)}”`
                  : soKhoanh === null
                    ? ""
                    : soKhoanh > 0
                      ? `khung cam là ${soKhoanh > 1 ? `${soKhoanh} dòng` : "dòng"} cần xem`
                      : "không tìm thấy đúng dòng trong bản xem nhanh — đọc cả bản"}
              </span>
            ) : null}
          </b>
          <a href={duongTaiNguon(mo)} className="rounded-sm border border-border px-2 py-0.5 text-[12px] text-accent hover:bg-bg">
            Tải về
          </a>
          <button type="button" className="rounded-sm border border-border px-2 py-0.5 text-[12px] hover:bg-bg" onClick={() => setMo(null)} title="Đóng (Esc)">
            ✕ Đóng
          </button>
        </div>
        <div className="cua-so-xem-than" ref={thanRef}>
          {loi && <p className="p-4 text-[13px] text-red">{loi}</p>}
          {!loi && !ban && <p className="p-4 text-[13px] text-text-muted">Đang mở file…</p>}
          {ban?.loai === "pdf" && <iframe src={nguon} title={mo.ten} className="h-full w-full border-0" />}
          {ban?.loai === "anh" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nguon} alt={mo.ten} className="mx-auto max-h-full max-w-full object-contain" />
          )}
          {ban?.loai === "html" && (
            <>
              {ban.ghi_chu && <p className="px-4 pt-3 text-[11px] text-text-muted">{ban.ghi_chu}</p>}
              <div className="ban-xem-html p-4" ref={htmlRef} />
            </>
          )}
          {ban?.loai === "chu" && (
            <div className="ban-xem-chu p-4 text-[12px]">
              {(ban.chu ?? "").split(/\r?\n/).map((d, i) => (
                <div key={i} className="dong-chu">
                  {d || "\u00a0"}
                </div>
              ))}
            </div>
          )}
          {ban?.loai === "khong_ho_tro" && <p className="p-4 text-[13px] text-text-muted">{ban.ghi_chu ?? "Chưa xem trực tiếp được loại file này — bấm Tải về."}</p>}
        </div>
      </div>
    </div>
  );
}

let hua: Promise<CaiDatDinhKem> | null = null;
/** Đọc cài đặt kẹp file — chỉ gọi khi `can` (vd mở ô Xong việc), dùng chung một lượt tải cho cả màn (60 giây). */
export function useCaiDatDinhKem(can = true): CaiDatDinhKem | null {
  const [cd, setCd] = useState<CaiDatDinhKem | null>(null);
  useEffect(() => {
    if (!can) return;
    if (!hua) {
      hua = goiApi<CaiDatDinhKem>("/api/dinh-kem/cai-dat");
      window.setTimeout(() => (hua = null), 60_000);
    }
    hua.then(setCd).catch(() => {
      hua = null;
      setCd(null);
    });
  }, [can]);
  return cd;
}

/** Cài đặt → Tệp đính kèm việc: dung lượng kho + chỗ trống ổ đĩa. */
export function DungLuongDinhKem() {
  const [d, setD] = useState<{ so_tep: number; tong_byte: number; da_xoa: number; o_trong_byte: number | null } | null>(null);
  useEffect(() => {
    goiApi<typeof d>("/api/dinh-kem/dung-luong").then(setD).catch(() => setD(null));
  }, []);
  if (!d) return null;
  return (
    <div className="mb-4 rounded border border-border bg-surface px-4 py-3 text-[12.5px] text-text-secondary">
      Kho file đính kèm đang dùng <b className="text-text">{coTep(d.tong_byte)}</b> · {d.so_tep} file
      {d.da_xoa ? ` · ${d.da_xoa} file đã xóa do hết hạn lưu` : ""}
      {d.o_trong_byte !== null && (
        <>
          {" "}· ổ đĩa máy chủ còn trống <b className={d.o_trong_byte < 30 * 1024 ** 3 ? "text-red" : "text-text"}>{coTep(d.o_trong_byte)}</b>
        </>
      )}
      <div className="mt-1 text-[11px] text-text-muted">File lưu kho riêng, tách Thư mục tài liệu — trợ lý AI không đọc được file đính kèm.</div>
    </div>
  );
}

"use client";
// BinhLuanViec — bình luận một việc (Đợt 2). Dùng chung giao diện căn phòng (chi tiết việc trên sơ đồ) và cổ điển
// (/cong-viec/[id]). Thước demo PA2 vòng 5: tên đậm · giờ mờ · nội dung nghiêng chữ nhạt, @tên màu cam; không tiêu đề
// "Bình luận", không "Chưa có bình luận", không ảnh đại diện; ô viết + nút Gửi cùng hàng cùng cao; gõ @ hiện danh sách,
// bấm một phát là chèn; đang gõ thì hiện "Sẽ báo cho: … (lý do)". Ctrl+Enter = Gửi.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { taiLaiToi } from "@/components/layout/dung-toi";
import { DsTep, useKepTep, type CaiDatDinhKem } from "@/components/dinh-kem/DinhKem";
import type { TepDinhKem } from "@/lib/dinh-kem/chung";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface BL {
  id: number;
  nguoi: string;
  ten: string;
  noi_dung: string;
  nhac: { id: string; ten: string }[];
  luc: string;
  tep?: TepDinhKem[];
}
interface NguoiGoiY {
  id: string;
  ten: string;
  chuc_vu: string | null;
  don_vi: string | null;
  /** người trong việc — máy chủ xếp lên đầu (Mr. Đại chốt 29/09) */
  trong_viec?: boolean;
}
interface DuLieu {
  binh_luan: BL[];
  se_bao: { id: string; ten: string; ly: string[] }[];
  /** gõ "@": người liên quan việc */
  nguoi: NguoiGoiY[];
  /** gõ "@@": mở rộng theo quyền "Tag tên" (không có quyền = rỗng) */
  nguoi_rong?: NguoiGoiY[];
  /** false → ẩn ô viết + 📎, chỉ đọc (Mr. Đại chốt 29/09) */
  co_the_binh_luan?: boolean;
  toi: string;
  /** File kẹp khi giao việc / báo xong (Mr. Đại chốt 29/09) */
  dinh_kem?: TepDinhKem[];
  cai_dat_dinh_kem?: CaiDatDinhKem;
}

/** Ô ý kiến đang có gì — đưa cho nút đứng cạnh Gửi (Nhắc gửi kèm lời nhắn, Mr. Đại chốt 02/10) */
export interface KemNutThem {
  chu: string;
  nhac: string[];
  dinh_kem: string[];
  /** đang gửi / đang tải file lên — chưa bấm được */
  ban: boolean;
  /** gọi sau khi đã gửi: xoá ô viết + tải lại danh sách ý kiến */
  xong: () => void;
}

/** Báo cho các ô cùng việc (chế độ "ds" ↔ "viet" tách hai nơi) tải lại sau khi gửi */
const SU_KIEN_BL = "sci-binh-luan-moi";

const boDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

function gioBl(luc: string): string {
  const d = new Date(luc);
  const vn = new Date(d.getTime() + 7 * 3600_000).toISOString();
  const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const g = vn.slice(11, 16);
  return vn.slice(0, 10) === homNay ? `hôm nay ${g}` : `${vn.slice(8, 10)}/${vn.slice(5, 7)} ${g}`;
}

/** Nội dung có @tên tô cam (chỉ những người thật sự được @). */
function NoiDung({ b }: { b: BL }) {
  if (!b.nhac.length) return <>{b.noi_dung}</>;
  const ten = b.nhac.map((n) => "@" + n.ten).sort((a, c) => c.length - a.length);
  const re = new RegExp(`(${ten.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return (
    <>
      {b.noi_dung.split(re).map((p, i) =>
        ten.includes(p) ? (
          <span key={i} className="at">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function BinhLuanViec({
  maViec,
  sauKhiGui,
  chiDoc,
  che,
  nutThem,
}: {
  maViec: string;
  sauKhiGui?: (chu: string) => void;
  /** việc đã xong: chỉ đọc bình luận */
  chiDoc?: boolean;
  /** Tách hai nơi (tab Cần BLĐ ra quyết định / Điểm nóng, Mr. Đại chốt 02/10): "ds" chỉ danh sách ý kiến + file (khối nội dung),
   *  "viet" chỉ ô viết: chữ trên, hàng dưới 📎 · Gửi · nutThem cùng cỡ (cột phải). Bỏ trống = đủ cả như cũ. */
  che?: "ds" | "viet";
  /** nút đứng cạnh Gửi ở chế độ "viet" (vd Nhắc). Dạng hàm: nhận chữ đang gõ + file đã kẹp để gửi kèm, gọi xong() khi đã gửi */
  nutThem?: React.ReactNode | ((v: KemNutThem) => React.ReactNode);
}) {
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState("");
  const [nd, setNd] = useState("");
  const [nhac, setNhac] = useState<NguoiGoiY[]>([]);
  const [goiY, setGoiY] = useState<{ ds: NguoiGoiY[]; dau: number } | null>(null);
  // Danh sách tên khi gõ @ / @@ (Mr. Đại giao 01/10): việc đang xem ở đầu cột phải thì phía trên ô viết bị thanh menu che →
  // đo chỗ trống trên / dưới trong cột phải: không đủ chỗ phía trên thì MỞ XUỐNG; cao tối đa theo chỗ trống, dài hơn thì có thanh trượt riêng
  const [huongGoiY, setHuongGoiY] = useState<{ xuong: boolean; cao: number }>({ xuong: false, cao: 300 });
  const [dang, setDang] = useState(false);
  const [tepKep, setTepKep] = useState<{ id: string; ten: string; kich_thuoc: number }[]>([]);
  const [dangTaiTep, setDangTaiTep] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  // 📎 cùng hàng với ô viết + nút Gửi; danh sách file đã kẹp chỉ hiện ở hàng dưới khi có (Mr. Đại chốt 29/09)
  const kep = useKepTep({ noi: "binh_luan", cd: dl?.cai_dat_dinh_kem ?? null, tep: tepKep, setTep: setTepKep, dangTai: setDangTaiTep });

  const tai = useCallback(() => {
    // Thẻ việc đầy đủ (không phải khối cắt ở báo cáo tuần) = người đang xem việc → chuông về việc này của họ thành đã đọc (3c, 08/10)
    goiApi<DuLieu>(`/api/cong-viec/${encodeURIComponent(maViec)}/binh-luan${che ? "" : "?da_xem=1"}`)
      .then((d) => {
        setDl(d);
        if (!che) void taiLaiToi(); // số chuông trên thanh trên giảm ngay
      })
      .catch((e) => setLoi(e instanceof Error ? e.message : String(e)));
  }, [maViec, che]);
  useEffect(() => tai(), [tai]);
  useEffect(() => {
    const nghe = (e: Event) => (e as CustomEvent<string>).detail === maViec && tai();
    window.addEventListener(SU_KIEN_BL, nghe);
    return () => window.removeEventListener(SU_KIEN_BL, nghe);
  }, [maViec, tai]);

  // Ai sẽ được báo: người làm + người giao + người đã bình luận (máy chủ tính) + người được @ còn trong nội dung
  const seBao = useMemo(() => {
    const m = new Map<string, { ten: string; ly: string[] }>((dl?.se_bao ?? []).map((x) => [x.id, { ten: x.ten, ly: [...x.ly] }]));
    for (const n of nhac) {
      if (n.id === dl?.toi || !nd.includes("@" + n.ten)) continue;
      const x = m.get(n.id) ?? { ten: n.ten, ly: [] };
      if (!x.ly.includes("được @")) x.ly.push("được @");
      m.set(n.id, x);
    }
    return [...m.values()];
  }, [dl, nhac, nd]);

  useLayoutEffect(() => {
    const el = ta.current;
    if (!goiY || !el) return;
    const r = el.getBoundingClientRect();
    const khung = (el.closest(".phai") as HTMLElement | null)?.getBoundingClientRect();
    const tren = r.top - Math.max(khung?.top ?? 56, 56) - 8;
    const duoi = Math.min(khung?.bottom ?? window.innerHeight, window.innerHeight) - r.bottom - 8;
    const can = Math.min(goiY.ds.length * 46 + 10, 300);
    const xuong = tren < can && duoi > tren;
    setHuongGoiY({ xuong, cao: Math.max(120, Math.min(300, xuong ? duoi : tren)) });
  }, [goiY]);

  const timGoiY = (gt: string, viTri: number) => {
    const truoc = gt.slice(0, viTri);
    // "@" = người liên quan việc · "@@" = mở rộng theo quyền "Tag tên" (Mr. Đại chốt 29/09)
    const m = truoc.match(/(@@?)([^\s@]*(?:\s[^\s@]*){0,2})$/);
    if (!m || !dl) return setGoiY(null);
    const k = boDau(m[2]);
    const nguon = m[1] === "@@" ? (dl.nguoi_rong ?? []) : dl.nguoi;
    const ds = nguon.filter((n) => n.id !== dl.toi && boDau(n.ten).includes(k)).slice(0, m[1] === "@@" ? 8 : 12);
    setGoiY(ds.length ? { ds, dau: truoc.length - m[0].length } : null);
  };
  const chen = (n: NguoiGoiY) => {
    const el = ta.current;
    if (!el || !goiY) return;
    const sau = nd.slice(el.selectionStart);
    const moi = nd.slice(0, goiY.dau) + "@" + n.ten + " " + sau;
    setNd(moi);
    setNhac((x) => (x.some((y) => y.id === n.id) ? x : [...x, n]));
    setGoiY(null);
    window.setTimeout(() => {
      el.focus();
      const p = goiY.dau + n.ten.length + 2;
      el.setSelectionRange(p, p);
    }, 0);
  };
  const gui = async () => {
    if ((!nd.trim() && !tepKep.length) || dang || dangTaiTep) return;
    setDang(true);
    setLoi("");
    try {
      const r = await goiApi<{ binh_luan: BL[]; da_bao: { ten: string }[] }>(`/api/cong-viec/${encodeURIComponent(maViec)}/binh-luan`, {
        body: { noi_dung: nd, nhac: nhac.map((n) => n.id), dinh_kem: tepKep.map((t) => t.id) },
      });
      setNd("");
      setTepKep([]);
      setNhac([]);
      tai();
      setDl((d) => (d ? { ...d, binh_luan: r.binh_luan } : d));
      window.dispatchEvent(new CustomEvent(SU_KIEN_BL, { detail: maViec }));
      sauKhiGui?.(r.da_bao.length ? `Đã báo ${r.da_bao.length} người: ${r.da_bao.map((x) => x.ten).join(", ")}` : "Đã lưu bình luận");
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  };

  const kem: KemNutThem = {
    chu: nd.trim(),
    nhac: nhac.filter((n) => nd.includes("@" + n.ten)).map((n) => n.id),
    dinh_kem: tepKep.map((t) => t.id),
    ban: dang || dangTaiTep,
    xong: () => {
      setNd("");
      setTepKep([]);
      setNhac([]);
      tai();
      window.dispatchEvent(new CustomEvent(SU_KIEN_BL, { detail: maViec }));
    },
  };
  const nutPhu = typeof nutThem === "function" ? nutThem(kem) : nutThem;

  return (
    <div className={`khung-bl ${nd.trim() ? "dang-viet" : ""} ${che ? `che-${che}` : ""}`}>
      {!che && <KhaiHuongDan ma="viec-binh-luan" uuTien={0} />}
      {/* File kèm của việc: lúc giao + lúc báo xong — Xem (cửa sổ nổi) / Tải về */}
      {che !== "viet" && (
        <>
          <DsTep tep={(dl?.dinh_kem ?? []).filter((t) => t.noi === "giao_viec")} tieuDe="File kèm khi giao việc" />
          <DsTep tep={(dl?.dinh_kem ?? []).filter((t) => t.noi === "bao_xong")} tieuDe="File kèm khi báo xong" />
        </>
      )}
      {che !== "viet" && !!dl?.binh_luan.length && (
        <ul className="bl-ds" data-gt="bl-ds">
          {dl.binh_luan.map((b) => (
            <li key={b.id}>
              <b>{b.ten}</b> <span className="gio">{gioBl(b.luc)}</span> —{" "}
              <span className="nd-bl">
                <NoiDung b={b} />
              </span>
              {!!b.tep?.length && <DsTep tep={b.tep} />}
            </li>
          ))}
        </ul>
      )}
      {/* Không được bình luận (ngoài người liên quan + ngoài phạm vi "Giao việc") → ẩn ô viết + 📎, chỉ đọc (Mr. Đại chốt 29/09) */}
      {che === "viet" && !dl?.co_the_binh_luan && nutPhu ? <div className="hang-nut-bl">{nutPhu}</div> : null}
      {che !== "ds" && dl?.co_the_binh_luan && !chiDoc && (
      <>
      <div className={che === "viet" ? "o-viet-doc" : "o-viet-gon"} data-gt="bl-o-viet">
        <textarea
          ref={ta}
          rows={2}
          value={nd}
          placeholder="Viết ý kiến… gõ @ gọi người liên quan, @@ tìm thêm người"
          onChange={(e) => {
            setNd(e.target.value);
            timGoiY(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void gui();
            if (e.key === "Escape") setGoiY(null);
          }}
        />
        {/* 📎 bên PHẢI ô viết, trước nút Gửi (Mr. Đại chốt 29/09); chế độ "viet": 📎 · Gửi · Nhắc một hàng dưới ô chữ */}
        {che === "viet" ? (
          <div className="hang-nut-bl">
            {kep.nut}
            <button className="nut-gui" disabled={(!nd.trim() && !tepKep.length) || dang || dangTaiTep} onClick={() => void gui()}>
              Gửi
            </button>
            {nutPhu}
          </div>
        ) : (
          <>
            {kep.nut}
            <button className="nut-gui" disabled={(!nd.trim() && !tepKep.length) || dang || dangTaiTep} onClick={() => void gui()}>
              Gửi
            </button>
          </>
        )}
        {goiY && (
          <div className={`goi-y ${huongGoiY.xuong ? "xuong" : ""}`} style={{ maxHeight: huongGoiY.cao }}>
            {goiY.ds.map((n) => (
              <button key={n.id} type="button" onMouseDown={(e) => (e.preventDefault(), chen(n))}>
                <b>{n.ten}</b>
                <small>{[n.trong_viec ? "trong việc" : "", n.chuc_vu, n.don_vi].filter(Boolean).join(" · ")}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {kep.ds}
      <div className="se-bao">
        {seBao.length ? (
          <>
            Sẽ báo cho:{" "}
            {seBao.map((x, i) => (
              <span key={x.ten}>
                {i ? " · " : ""}
                <b>{x.ten}</b> <span className="mo">({x.ly.join(", ")})</span>
              </span>
            ))}
          </>
        ) : (
          "Chưa có ai để báo"
        )}
      </div>
      </>
      )}
      {loi && <div className="loi-bl">{loi}</div>}
    </div>
  );
}

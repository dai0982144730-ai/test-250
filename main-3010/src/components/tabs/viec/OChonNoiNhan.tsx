"use client";

// ============================================================
// Ô "GIAO CHO" — mọi hộp giao việc. Bản GỌN Mr. Đại chốt 04/10/2026 tối (bản 4 nhóm @/@@ trước đó "khó dùng"):
//   · BẤM vào ô: Ban lãnh đạo (trừ trợ lý) → đơn vị theo sơ đồ, thụt lề theo cấp. Gõ chữ = lọc trong danh sách đó.
//   · Gõ "@": danh sách TÊN NGƯỜI, gõ tiếp tên ai thì lọc người đó (không dấu cũng khớp).
//   · Cả hai chỉ hiện nơi người bấm GIAO ĐƯỢC (agent Công việc lọc sẵn theo quyền Giao việc + luật giao đích danh 30/09):
//     lãnh đạo / quản trị thấy cả công ty, trưởng đơn vị thấy đơn vị mình + cấp dưới và người trong đơn vị mình.
//   · Người đang chọn (vd AI chọn một cá nhân) luôn hiện trong ô. Bấm một dòng là chọn xong và đóng (bớt cú bấm).
// Danh sách do agent Công việc dựng (ds.nhom — lib/cay-viec/noi-nhan-thuan.ts bên đó). Thiếu `nhom` → quay về danh sách đủ như cũ.
// `giaTri`: "id" (mã người/đơn vị — Main · Tiến độ · Hợp đồng) | "loai|id" (ô nội bộ agent Công việc).
// BẢN GỐC ở Main — chép nguyên sang Tiến độ · Hợp đồng · agent Công việc (luật 7); Pháp lý giữ cùng logic bằng style.
// ============================================================

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { NguoiNhanCV } from "@/lib/chung/viec-cong-viec-kieu";

type Dong = { id: string; loai: "nguoi" | "don_vi"; nhan: string; ten: string; thut?: number };
type Nhom = { ten: string; ds: Dong[] };

/** Bỏ dấu tiếng Việt + chữ thường — gõ "@dai" vẫn ra "Nguyễn Chính Đại" */
function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Bỏ dấu, dấu câu thành dấu cách, đệm một dấu cách đầu — để so theo đầu từ */
function tuDem(s: string): string {
  return ` ${boDau(s).replace(/[^a-z0-9]+/g, " ").trim()}`;
}

export function OChonNoiNhan({
  ds,
  loiDs,
  value,
  onChange,
  disabled,
  giaTri = "id",
  className = "",
  title,
}: {
  ds: NguoiNhanCV | null;
  loiDs?: string | null;
  /** "id" hoặc "loai|id" theo `giaTri`; "" = chưa chọn */
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  giaTri?: "id" | "loai|id";
  className?: string;
  title?: string;
}) {
  const [mo, setMo] = useState(false);
  const [go, setGo] = useState("");
  const hop = useRef<HTMLDivElement>(null);
  const o = useRef<HTMLInputElement>(null);
  const ds_ = useRef<HTMLDivElement>(null);
  // Danh sách NỔI (portal ra body, vị trí cố định theo ô): khung thẻ / vùng trái chặn tràn thì danh sách vẫn hiện đủ;
  // phía dưới thiếu chỗ thì mở lên trên (đo 04/10: thẻ cuối vùng trái bị cắt mất danh sách)
  const [viTri, setViTri] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!mo) return;
    const dong = (e: MouseEvent) => {
      const t = e.target as Node;
      if (hop.current?.contains(t) || ds_.current?.contains(t)) return;
      setMo(false);
    };
    document.addEventListener("mousedown", dong);
    return () => document.removeEventListener("mousedown", dong);
  }, [mo]);

  useLayoutEffect(() => {
    if (!mo) return;
    const tinh = () => {
      const r = o.current?.getBoundingClientRect();
      if (!r) return;
      const duoi = window.innerHeight - r.bottom;
      const len = r.top;
      const cao = Math.min(300, Math.max(duoi, len) - 12);
      const rong = Math.max(r.width, 280);
      const trai = Math.min(r.left, window.innerWidth - rong - 8);
      setViTri(
        duoi >= 220 || duoi >= len
          ? { position: "fixed", left: trai, top: r.bottom + 4, width: rong, maxHeight: cao }
          : { position: "fixed", left: trai, bottom: window.innerHeight - r.top + 4, width: rong, maxHeight: cao },
      );
    };
    tinh();
    window.addEventListener("resize", tinh);
    window.addEventListener("scroll", tinh, true);
    return () => {
      window.removeEventListener("resize", tinh);
      window.removeEventListener("scroll", tinh, true);
    };
  }, [mo]);

  const maCua = (v: string) => (giaTri === "loai|id" ? (v.split("|")[1] ?? "") : v);
  const maDangChon = maCua(value);

  const dong = useMemo(() => {
    const m = new Map<string, Dong>();
    if (!ds) return m;
    for (const d of ds.don_vi) m.set(d.id, { id: d.id, loai: "don_vi", nhan: d.ten, ten: d.ten });
    for (const n of ds.nguoi) m.set(n.id, { id: n.id, loai: "nguoi", nhan: `${n.ten}${n.dv ? ` · ${n.dv}` : ""}`, ten: n.ten });
    return m;
  }, [ds]);

  const theoTen = go.startsWith("@");
  const nhom: Nhom[] = useMemo(() => {
    if (!ds) return [];
    const lay = (ids: string[], thut?: Map<string, number>) =>
      Array.from(new Set(ids))
        .map((id) => dong.get(id))
        .filter((x): x is Dong => !!x)
        .map((x) => (thut?.has(x.id) ? { ...x, thut: thut.get(x.id) } : x));
    // Lọc theo ĐẦU TỪ, không dấu: "@huong" ra "Lan Hương" mà không ra "Thường"; gõ nhiều từ được ("@lan huong")
    const tu = tuDem(go.replace(/^@/, "")).trim();
    // Gõ @ → lọc theo TÊN người; không @ → lọc theo cả nhãn đơn vị
    const khop = (x: Dong) => !tu || tuDem(theoTen ? x.ten : x.nhan).includes(` ${tu}`);
    const n = ds.nhom;
    let ra: Nhom[];
    if (theoTen) {
      ra = [{ ten: "Người", ds: lay(n ? n.ca_nhan : ds.nguoi.map((x) => x.id)) }];
    } else if (!n) {
      // agent Công việc bản cũ chưa trả nhóm → danh sách đơn vị đủ như trước
      ra = [{ ten: "Đơn vị", ds: lay(ds.don_vi.map((d) => d.id)) }];
    } else {
      ra = [
        { ten: "Ban lãnh đạo", ds: lay(n.lanh_dao) },
        { ten: "Đơn vị", ds: lay(n.cay.map((c) => c.id), new Map(n.cay.map((c) => [c.id, c.thut]))) },
      ];
      // Người/đơn vị đang chọn (vd AI chọn một cá nhân) mà không có trong danh sách → hiện đầu danh sách
      const coSan = ra.some((g) => g.ds.some((x) => x.id === maDangChon));
      if (maDangChon && !coSan && dong.has(maDangChon)) ra = [{ ten: "Đang chọn", ds: [dong.get(maDangChon)!] }, ...ra];
    }
    return ra.map((g) => ({ ...g, ds: g.ds.filter(khop) })).filter((g) => g.ds.length);
  }, [ds, dong, go, theoTen, maDangChon]);

  const chon = (x: Dong) => {
    onChange(giaTri === "loai|id" ? `${x.loai}|${x.id}` : x.id);
    setMo(false);
    setGo("");
    o.current?.blur();
  };

  const tenDangChon = maDangChon ? (dong.get(maDangChon)?.nhan ?? maDangChon) : "";
  const goiY = ds ? "— chọn người hoặc đơn vị nhận —" : (loiDs ?? "Đang lấy danh sách…");

  return (
    <div ref={hop} className={`relative min-w-0 ${className}`} data-gt="viec:o-giao-cho">
      <input
        ref={o}
        value={mo ? go : tenDangChon}
        placeholder={mo ? (tenDangChon || "Gõ để lọc · gõ @ để chọn theo tên người") : goiY}
        disabled={disabled || !ds}
        title={title ?? "Bấm để chọn Ban lãnh đạo hoặc đơn vị · gõ @ rồi tên để chọn một người"}
        onFocus={() => {
          setMo(true);
          setGo("");
        }}
        onChange={(e) => {
          setGo(e.target.value);
          setMo(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setMo(false);
            o.current?.blur();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const dau = nhom[0]?.ds[0];
            if (dau) chon(dau);
          }
        }}
        className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 pr-7 text-[12.5px] text-text outline-none focus:border-accent disabled:opacity-50"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">▾</span>
      {mo && ds && viTri && typeof document !== "undefined" && createPortal(
        <div ref={ds_} style={viTri} className="z-[70] overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg" data-gt="viec:o-giao-cho-ds">
          {nhom.length === 0 && <div className="px-3 py-2 text-[12px] text-text-muted">{theoTen && !go.slice(1).trim() ? "Bạn chưa giao đích danh được cho ai." : "Không có ai khớp."}</div>}
          {nhom.map((g) => (
            <div key={g.ten}>
              <div className="px-3 pb-0.5 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">{g.ten}</div>
              {g.ds.map((x) => (
                <button
                  key={`${g.ten}:${x.id}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => chon(x)}
                  className={`block w-full truncate px-3 py-1 text-left text-[12.5px] hover:bg-bg2 ${x.id === maDangChon ? "font-semibold text-accent" : "text-text"}`}
                  style={x.thut ? { paddingLeft: 12 + x.thut * 14 } : undefined}
                >
                  {x.nhan}
                </button>
              ))}
            </div>
          ))}
          {!theoTen && <div className="px-3 pb-1 pt-1.5 text-[11px] text-text-muted">Gõ @ rồi tên để chọn một người</div>}
        </div>,
        document.body,
      )}
    </div>
  );
}

"use client";

// ============================================================
// Ô "Đơn vị" của một dự án ở màn Quản lý dự án (LOI-DUNG-CHUNG 6g.6 Đợt 2 bước E — Mr. Đại chốt 03/10/2026 "2a").
//   Ban QLDA đứng đầu · đơn vị làm · Ban điều hành — CHỌN LÀ LƯU (luật bớt cú bấm), không qua nút Đổi tên → Lưu.
//   Cách chọn chép theo agent Công việc (Cài đặt › Sơ đồ tổ chức dự án) — nơi sửa cũ, nay chỉ hiện.
//   Luật kiểm ở máy chủ: lib/du-an-don-vi.ts. Chữ nhãn là chữ trần (luật 28) — chỉ ô chọn và nút × mới bấm được.
// ============================================================

export interface DonViLuaChon {
  tinhTrang: "chua_co" | "hong" | "ok";
  ds: { id: string; ten: string; tenNgan: string; cap: number; loai: string }[];
}

const O_CHON =
  "min-w-0 max-w-[200px] rounded-sm border border-border bg-bg2 px-1.5 py-1 text-[11.5px] text-text outline-none transition-colors focus:border-accent disabled:opacity-50";

export function DonViDuAn({
  nhom,
  donVi,
  banDieuHanh,
  luaChon,
  ban,
  luu,
}: {
  nhom?: "sci" | "khac";
  donVi?: string[];
  banDieuHanh?: string | null;
  luaChon: DonViLuaChon | null;
  ban: boolean;
  luu: (donVi: string[], banDieuHanh: string | null) => void;
}) {
  if (!luaChon) return <span className="text-[11px] text-text-muted">…</span>;
  if (luaChon.tinhTrang !== "ok")
    return <span className="text-[11px] text-text-muted">Main chưa có tổ chức — chạy bộ chuyển người trước</span>;
  if (!nhom) return <span className="text-[11px] text-text-muted">Chọn nhóm dự án trước</span>;

  const ds = donVi ?? [];
  const bdh = banDieuHanh ?? null;
  const ten = new Map(luaChon.ds.map((d) => [d.id, d.tenNgan]));
  // Đơn vị làm được chọn: phòng / đơn vị từ cấp 2 trở xuống, không phải chức danh lãnh đạo
  const coThe = luaChon.ds.filter((d) => d.cap >= 2 && d.loai !== "chuc_danh" && d.loai !== "ban_tgd");
  const dsBdh = luaChon.ds.filter((d) => d.cap >= 4);
  const banQlda = nhom === "sci" ? (ds[0] ?? "") : "";
  const lam = nhom === "sci" ? ds.slice(1) : ds;
  const ghepLam = (moi: string[]) => (nhom === "sci" ? [banQlda, ...moi] : moi);

  return (
    <div className="space-y-1 text-[11.5px]">
      {nhom === "sci" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-text-muted">Ban QLDA</span>
          <select
            className={O_CHON}
            disabled={ban}
            value={banQlda}
            onChange={(e) => e.target.value && luu([e.target.value, ...lam.filter((x) => x !== e.target.value)], bdh)}
            title="Ban QLDA đứng đầu dự án — chọn là lưu"
          >
            {!banQlda && <option value="">— chọn Ban QLDA —</option>}
            {coThe.map((d) => (
              <option key={d.id} value={d.id}>
                {d.tenNgan}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-text-muted">Đơn vị làm</span>
        {lam.map((x) => (
          <span key={x} className="inline-flex items-center gap-0.5 text-text">
            {ten.get(x) ?? x}
            <button
              type="button"
              disabled={ban}
              className="px-0.5 text-text-muted hover:text-red disabled:opacity-50"
              title={`Bỏ ${ten.get(x) ?? x} khỏi dự án`}
              onClick={() => luu(ghepLam(lam.filter((y) => y !== x)), bdh)}
            >
              ×
            </button>
          </span>
        ))}
        {nhom === "sci" && !banQlda ? (
          <span className="text-text-muted">— chọn Ban QLDA trước</span>
        ) : (
          <select
            className={O_CHON}
            disabled={ban}
            value=""
            onChange={(e) => e.target.value && luu(ghepLam([...lam, e.target.value]), bdh)}
            title="Thêm đơn vị làm (PMC thiết kế, E&C thi công…) — chọn là lưu"
          >
            <option value="">+ thêm</option>
            {coThe
              .filter((d) => !ds.includes(d.id))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.tenNgan}
                </option>
              ))}
          </select>
        )}
      </div>
      {nhom === "sci" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-text-muted">Ban điều hành</span>
          <select
            className={O_CHON}
            disabled={ban}
            value={bdh ?? ""}
            onChange={(e) => luu(ds, e.target.value || null)}
            title="Ban điều hành tổng thầu của dự án — chọn là lưu"
          >
            <option value="">— không có —</option>
            {dsBdh.map((d) => (
              <option key={d.id} value={d.id}>
                {d.tenNgan}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

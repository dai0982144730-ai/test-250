// ============================================================
// luat/ai/mau.ts — ĐỊNH NGHĨA MẪU RÚT GỌN cho phần AI của bộ luật (ô nhập, bảng có cột, mục). CHỈ SERVER.
// Bảng có cột lấy từ `dinh_nghia.bang` (mau-word/dinh-nghia.json); bảng sinh việc chưa khai cột thì cột rỗng.
// ============================================================
import type { Q } from "@/lib/db";
import type { MauWord } from "@/lib/types";
import { danhSachMau, layMau } from "@/lib/kiem-tra/kiem-tra";
import type { DinhNghiaMauRutGon } from "../types-them";

type BangCoCot = { tag: string; nhan: string; cot?: { tag: string; nhan: string }[] };

/** MauWord → định nghĩa rút gọn mà dạng luật code cần. */
export function mauRutGon(mau: Pick<MauWord, "ma" | "ten" | "dinh_nghia">): DinhNghiaMauRutGon {
  const dn = mau.dinh_nghia as MauWord["dinh_nghia"] & { bang?: BangCoCot[] };
  const bang: DinhNghiaMauRutGon["bang"] = (dn.bang ?? []).map((b) => ({ tag: b.tag, nhan: b.nhan, cot: (b.cot ?? []).map((c) => ({ tag: c.tag, nhan: c.nhan })) }));
  for (const b of dn.bang_cong_viec ?? []) if (!bang.some((x) => x.tag === b.tag)) bang.push({ tag: b.tag, nhan: b.nhan, cot: [] });
  return {
    ma: mau.ma,
    ten: mau.ten,
    o_nhap: (dn.o_nhap ?? []).filter((o) => o.tag !== "mau_ma").map((o) => ({ tag: o.tag, nhan: o.nhan, kieu: o.kieu })),
    bang,
    muc_bat_buoc: [...(dn.muc_bat_buoc ?? [])],
  };
}

/** Rút gọn → dạng MauWord tối thiểu (cho ganViTri / dungNoiDungBaoCao của góp ý AI). */
export function mauGia(rg: DinhNghiaMauRutGon | null | undefined, ma?: string | null): MauWord {
  return {
    ma: rg?.ma ?? ma ?? "",
    ten: rg?.ten ?? ma ?? "",
    don_vi_lap: null,
    gui_den_mac_dinh: null,
    loai_ky: "tu_do",
    dinh_nghia: {
      o_nhap: (rg?.o_nhap ?? []).map((o) => ({ tag: o.tag, nhan: o.nhan, bat_buoc: false, kieu: "chu" as const })),
      bang_cong_viec: (rg?.bang ?? []).map((b) => ({ tag: b.tag, nhan: b.nhan })),
      muc_bat_buoc: rg?.muc_bat_buoc ?? [],
    },
    phien_ban: 1,
    active: true,
  };
}

/** Nạp các mẫu mà luật áp dụng ('tat_ca' = mọi mẫu đang dùng). Mã không có thì bỏ qua. */
export async function napMauApDung(q: Q, apDung: string[] | "tat_ca"): Promise<DinhNghiaMauRutGon[]> {
  if (apDung === "tat_ca") return (await danhSachMau(q)).filter((m) => m.active).map(mauRutGon);
  const kq: DinhNghiaMauRutGon[] = [];
  for (const ma of Array.from(new Set(apDung))) {
    const m = await layMau(q, ma);
    if (m) kq.push(mauRutGon(m));
  }
  return kq;
}

/** Một mẫu thành vài dòng chữ cho AI: ô (tag="nhãn"), bảng + cột, mục. */
export function dongMau(m: DinhNghiaMauRutGon): string {
  const o = m.o_nhap.map((x) => `${x.tag}="${x.nhan}"${x.kieu ? ` (${x.kieu})` : ""}`).join("; ");
  const bang = m.bang
    .map((b) => `  - ${b.tag}="${b.nhan}" — cột: ${b.cot.length ? b.cot.map((c) => `${c.tag}="${c.nhan}"`).join("; ") : "(chưa khai cột)"}`)
    .join("\n");
  const muc = m.muc_bat_buoc.map((t) => `"${t}"`).join("; ");
  return [`MẪU ${m.ma} — ${m.ten}`, `  Ô nhập gắn mã: ${o || "(không có)"}`, `  Bảng gắn mã:\n${bang || "  (không có)"}`, `  Tiêu đề mục: ${muc || "(không có)"}`].join("\n");
}

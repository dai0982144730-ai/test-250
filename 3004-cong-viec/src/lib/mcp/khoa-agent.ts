// ============================================================
// khoa-agent.ts — KHÓA RIÊNG CHO AGENT KHÁC ĐỌC SỔ CÁI (bảng docflow.khoa_agent của nền).
//
// - Khóa gốc dạng "dfk_<ngẫu nhiên>" chỉ hiện MỘT lần lúc cấp; CSDL chỉ giữ sha256.
// - Xác thực: header `Authorization: Bearer <khóa>` → sha256 → dòng chưa thu hồi.
// - Mỗi khóa chỉ gọi được công cụ trong `cong_cu` (nhận mẫu "socai.*", "lichsu.*").
// - Lịch sử: cap_khoa_agent / thu_hoi_khoa_agent (người thật) · agent_doc (GỘP:
//   chỉ lượt đầu mỗi ngày của mỗi khóa; số lượt đếm ở docflow.khoa_agent_dung).
// Server-only.
// ============================================================

import { createHash, randomBytes } from "node:crypto";
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { taoMa } from "@/lib/ma";

/** Công cụ nghiệp vụ của cổng socai (không tính nang_luc / suc_khoe — khóa hợp lệ nào cũng gọi được) */
export const CONG_CU_NGHIEP_VU = [
  "socai.danh_sach_viec",
  "socai.chi_tiet_viec",
  "socai.viec_cua_don_vi",
  "lichsu.tra_cuu_viec",
] as const;

/** Giá trị hợp lệ cho cột cong_cu: tên công cụ hoặc mẫu nhóm */
export const MAU_CONG_CU = ["socai.*", "lichsu.*", ...CONG_CU_NGHIEP_VU] as const;

/** Công cụ luôn mở cho khóa hợp lệ (HOP-DONG-KET-NOI mục 4: công cụ bắt buộc) */
export const CONG_CU_LUON_MO = ["nang_luc", "suc_khoe", "tim_theo_ma"] as const;

export function bamKhoa(khoa: string): string {
  return createHash("sha256").update(khoa.trim(), "utf8").digest("hex");
}

export function taoKhoaGoc(): string {
  return `dfk_${randomBytes(24).toString("base64url")}`;
}

/** Công cụ `ten` có nằm trong danh sách được phép (hỗ trợ "nhom.*" và "*") không */
export function duocDungCongCu(duocPhep: string[], ten: string): boolean {
  if ((CONG_CU_LUON_MO as readonly string[]).includes(ten)) return true;
  // tim_theo_ma của cổng socai đọc một việc → cần quyền chi tiết việc
  const can = ten === "tim_theo_ma" ? "socai.chi_tiet_viec" : ten;
  return duocPhep.some((p) => p === "*" || p === can || (p.endsWith(".*") && can.startsWith(p.slice(0, -1))));
}

export interface KhoaAgent {
  id: string;
  ten: string;
  cong_cu: string[];
  tao_boi: string;
  tao_luc: string;
  thu_hoi: boolean;
}

export type KetQuaXacThuc = { ok: true; khoa: KhoaAgent } | { ok: false; ly_do: string };

/** Lấy khóa từ header Authorization (Bearer) hoặc x-api-key */
export function khoaTuHeader(authorization: string | null, xApiKey?: string | null): string {
  const a = (authorization ?? "").trim();
  const m = /^Bearer\s+(.+)$/i.exec(a);
  if (m) return m[1]!.trim();
  return (xApiKey ?? "").trim();
}

export async function xacThucKhoa(q: Q, khoaGoc: string): Promise<KetQuaXacThuc> {
  if (khoaGoc === "") return { ok: false, ly_do: "Thiếu khóa agent — gửi header Authorization: Bearer <khóa>." };
  const { rows } = await q.query<KhoaAgent>(
    "SELECT id, ten, cong_cu, tao_boi, tao_luc, thu_hoi FROM docflow.khoa_agent WHERE khoa_hash = $1",
    [bamKhoa(khoaGoc)],
  );
  const k = rows[0];
  if (!k) return { ok: false, ly_do: "Khóa agent không đúng." };
  if (k.thu_hoi) return { ok: false, ly_do: "Khóa agent này đã bị thu hồi." };
  return { ok: true, khoa: { ...k, cong_cu: Array.isArray(k.cong_cu) ? k.cong_cu : [] } };
}

function chuanCongCu(v: unknown): string[] {
  if (!Array.isArray(v)) throw new Error("Danh sách công cụ phải là mảng.");
  const ds = Array.from(new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim())));
  const la = ds.filter((x) => !(MAU_CONG_CU as readonly string[]).includes(x));
  if (la.length > 0) throw new Error(`Công cụ không có: ${la.join(", ")}.`);
  if (ds.length === 0) throw new Error("Chọn ít nhất một công cụ cho khóa.");
  return ds;
}

/** Cấp khóa mới. Trả khóa GỐC (chỉ lần này) — gọi trong tx() cùng lịch sử. */
export async function capKhoa(
  q: Q,
  nd: NguoiDungPhien,
  v: { ten: string; cong_cu: unknown },
  thietBi?: string | null,
): Promise<{ id: string; khoa: string }> {
  const ten = String(v.ten ?? "").trim();
  if (ten.length < 2 || ten.length > 100) throw new Error("Tên agent phải từ 2 đến 100 ký tự (vd «Agent tiến độ»).");
  const congCu = chuanCongCu(v.cong_cu);
  const id = taoMa("ka");
  const khoa = taoKhoaGoc();
  await q.query(
    "INSERT INTO docflow.khoa_agent (id, ten, khoa_hash, cong_cu, tao_boi) VALUES ($1,$2,$3,$4,$5)",
    [id, ten, bamKhoa(khoa), JSON.stringify(congCu), nd.id],
  );
  await ghiLichSu(q, {
    nguoi: nd.id,
    doi_tuong_loai: "agent",
    doi_tuong_id: id,
    hanh_dong: "cap_khoa_agent",
    don_vi_id: nd.don_vi_id,
    thiet_bi: thietBi ?? null,
    // KHÔNG ghi khóa gốc — chỉ 6 ký tự cuối của mã băm để đối chiếu
    chi_tiet: { ten, cong_cu: congCu, dau_bam: bamKhoa(khoa).slice(-6) },
  });
  return { id, khoa };
}

export async function thuHoiKhoa(q: Q, nd: NguoiDungPhien, id: string, lyDo?: string | null, thietBi?: string | null): Promise<void> {
  const { rows } = await q.query<{ ten: string; thu_hoi: boolean }>("SELECT ten, thu_hoi FROM docflow.khoa_agent WHERE id = $1", [id]);
  const k = rows[0];
  if (!k) throw new Error("Không có khóa này.");
  if (k.thu_hoi) throw new Error("Khóa này đã thu hồi từ trước.");
  await q.query("UPDATE docflow.khoa_agent SET thu_hoi = true WHERE id = $1", [id]);
  await ghiLichSu(q, {
    nguoi: nd.id,
    doi_tuong_loai: "agent",
    doi_tuong_id: id,
    hanh_dong: "thu_hoi_khoa_agent",
    don_vi_id: nd.don_vi_id,
    thiet_bi: thietBi ?? null,
    chi_tiet: { ten: k.ten, ...(lyDo ? { ly_do: lyDo } : {}) },
  });
}

export interface KhoaAgentHienThi extends KhoaAgent {
  tao_boi_ten: string | null;
  so_lan_7_ngay: number;
  lan_cuoi: string | null;
}

export async function danhSachKhoa(q: Q): Promise<KhoaAgentHienThi[]> {
  const { rows } = await q.query<KhoaAgentHienThi>(
    `SELECT k.id, k.ten, k.cong_cu, k.tao_boi, k.tao_luc, k.thu_hoi, n.ten AS tao_boi_ten,
            COALESCE((SELECT sum(d.so_lan) FROM docflow.khoa_agent_dung d
                      WHERE d.khoa_id = k.id AND d.ngay >= current_date - 6), 0)::int AS so_lan_7_ngay,
            (SELECT max(d.lan_cuoi) FROM docflow.khoa_agent_dung d WHERE d.khoa_id = k.id) AS lan_cuoi
     FROM docflow.khoa_agent k LEFT JOIN identity.nguoi_dung n ON n.id = k.tao_boi
     ORDER BY k.thu_hoi, k.tao_luc DESC`,
  );
  return rows;
}

/**
 * Ghi MỘT lượt agent đọc: cộng đếm theo ngày; lượt ĐẦU TIÊN trong ngày của khóa
 * thì ghi thêm một dòng lịch sử 'agent_doc' (gộp — không ghi mỗi lần gọi).
 * Hỏng ghi không được làm hỏng câu trả lời → caller bọc try/catch.
 */
export async function ghiLuotDoc(q: Q, khoa: Pick<KhoaAgent, "id" | "ten">, congCu: string, ngay?: string): Promise<{ luot_dau_ngay: boolean }> {
  const hom = ngay ?? new Date().toISOString().slice(0, 10);
  const { rows } = await q.query<{ so_lan: number }>(
    `INSERT INTO docflow.khoa_agent_dung (khoa_id, ngay, so_lan, cong_cu, lan_cuoi)
     VALUES ($1, $2, 1, jsonb_build_object($3::text, 1), now())
     ON CONFLICT (khoa_id, ngay) DO UPDATE SET
       so_lan = docflow.khoa_agent_dung.so_lan + 1,
       cong_cu = docflow.khoa_agent_dung.cong_cu || jsonb_build_object($3::text,
                 COALESCE((docflow.khoa_agent_dung.cong_cu ->> $3::text)::int, 0) + 1),
       lan_cuoi = now()
     RETURNING so_lan`,
    [khoa.id, hom, congCu],
  );
  const dau = Number(rows[0]?.so_lan ?? 0) === 1;
  if (dau) {
    await ghiLichSu(q, {
      nguoi: `agent:${khoa.id}`,
      doi_tuong_loai: "agent",
      doi_tuong_id: khoa.id,
      hanh_dong: "agent_doc",
      chi_tiet: {
        ten: khoa.ten,
        ngay: hom,
        cong_cu: congCu,
        ghi_chu: "Lượt đầu trong ngày; các lượt sau đếm ở màn Khóa cho agent",
      },
    });
  }
  return { luot_dau_ngay: dau };
}

// Tiện ích phía client cho thư mục + lịch sử: gọi API, định dạng ngày, cỡ file, nhãn hành động.
import { HANH_DONG_LICH_SU } from "@/lib/types";
import { fetchCoLoiViet, loiTheoMa } from "@/lib/loi-mang";
import { fmtNum } from "@/lib/format";

export async function goiApi<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetchCoLoiViet(url, { cache: "no-store", ...init });
  const j = (await r.json().catch(() => ({}))) as T & { loi?: string };
  if (!r.ok) throw new Error(j.loi || loiTheoMa(r.status));
  return j;
}

export async function guiJson<T>(url: string, body: unknown): Promise<T> {
  return goiApi<T>(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

const p2 = (x: number) => String(x).padStart(2, "0");

/** 21/07/2026 10:05 */
export function ngayGio(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** 21/07 */
export function ngayNgan(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const nam = d.getFullYear() === new Date().getFullYear() ? "" : `/${d.getFullYear()}`;
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}${nam}`;
}

export function kichThuoc(n?: number | null): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  // số theo chuẩn Việt Nam (chốt 130): «2,5 MB» · «1.023,9 MB» — bản cũ hiện thẳng toFixed ra «2.5 MB»
  if (n < 1024 ** 2) return `${fmtNum(Math.round(n / 1024))} KB`;
  return `${fmtNum(n / 1024 ** 2, 1)} MB`;
}

const NHAN_THEM: Record<string, string> = { tao_thu_muc: "Tạo thư mục" };

export function nhanHanhDong(ma: string): string {
  return (HANH_DONG_LICH_SU as Record<string, string>)[ma] ?? NHAN_THEM[ma] ?? ma;
}

export const NHAN_LOAI_DOI_TUONG: Record<string, string> = {
  tai_lieu: "Tài liệu",
  cong_viec: "Công việc",
  thu_muc: "Thư mục",
  cau_hinh: "Cài đặt",
  nguoi_dung: "Người dùng",
  don_vi: "Đơn vị",
  mau: "Mẫu báo cáo",
  ky_nang: "Kỹ năng AI",
  agent: "Agent",
};

export const NHAN_VI_TRI: Record<string, string> = { bi_tra_lai: "Bị trả lại" };

/** Đuôi file → nhãn biểu tượng + màu viền. */
export function kieuTep(ten: string): { nhan: string; mau: string } {
  const d = ten.slice(ten.lastIndexOf(".") + 1).toLowerCase();
  if (d === "doc" || d === "docx") return { nhan: "DOC", mau: "#2b579a" };
  if (d === "xls" || d === "xlsx" || d === "csv") return { nhan: "XLS", mau: "#217346" };
  if (d === "pdf") return { nhan: "PDF", mau: "#c4302b" };
  if (d === "ppt" || d === "pptx") return { nhan: "PPT", mau: "#d24726" };
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(d)) return { nhan: "IMG", mau: "#7c5cbf" };
  return { nhan: (d || "FILE").slice(0, 4).toUpperCase(), mau: "#555" };
}

/** Tóm tắt chi tiết một dòng lịch sử thành câu ngắn. */
export function tomTatChiTiet(ct: Record<string, unknown>, ten?: { don_vi?: Record<string, string> }): string {
  const phan: string[] = [];
  const s = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
  if (ct.phien_ban !== undefined) phan.push(`bản ${s(ct.phien_ban)}`);
  if (ct.ten_tep) phan.push(s(ct.ten_tep));
  if (ct.thu_muc) {
    const dv = typeof ct.thu_muc_don_vi === "string" ? ten?.don_vi?.[ct.thu_muc_don_vi] ?? ct.thu_muc_don_vi : "";
    phan.push(`thư mục ${dv ? dv + " › " : ""}${s(ct.thu_muc)}`);
  }
  if (ct.kiem_tra_dat !== undefined) phan.push(ct.kiem_tra_dat ? "kiểm tra đạt" : "kiểm tra chưa đạt");
  if (ct.ly_do) phan.push(`lý do: ${s(ct.ly_do)}`);
  if (ct.ghi_chu) phan.push(`ghi chú: ${s(ct.ghi_chu)}`);
  if (ct.ten && !ct.ten_tep) phan.push(s(ct.ten));
  if (Array.isArray(ct.den)) {
    // `den` có thể là mã đơn vị ("p-dtpc") hoặc đối tượng nơi nhận { don_vi_id, nguoi_id, ten }
    const tenNoi = (x: unknown): string => {
      if (x && typeof x === "object") {
        const o = x as { ten?: unknown; don_vi_id?: unknown; nguoi_id?: unknown };
        const ma = s(o.don_vi_id) || s(o.nguoi_id);
        return s(o.ten) || (ma ? ten?.don_vi?.[ma] ?? ma : "");
      }
      const ma = String(x);
      return ten?.don_vi?.[ma] ?? ma.replace(/^nguoi:/, "");
    };
    const ds = ct.den.map(tenNoi).filter(Boolean);
    if (ds.length) phan.push(`đến ${ds.join(", ")}`);
  }
  if (typeof ct.kem_theo_ten === "string") phan.push(`kèm ${ct.kem_theo_ten}`);
  if (ct.tu && typeof ct.tu === "string") phan.push(`từ ${ct.tu}`);
  if (ct.han_cu || ct.han_moi) phan.push(`hạn ${s(ct.han_cu)} → ${s(ct.han_moi)}`);
  return phan.join(" · ");
}

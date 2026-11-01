// ============================================================
// BA CỬA "VIỆC CHỜ DUYỆT" của agent Công việc cho bảng tổng ở Main (đợt ⑤, 06/10/2026 — CHOT HOP-DONG-KET-NOI 4.3,
// cùng khuôn với Tiến độ · Hợp đồng `lib/chung/viec-cho-duyet-cua.ts`). Mã agent trên đường dây vẫn là "base".
//
//   base.viec_cho_duyet         ĐỌC — issue cần giao việc MỚI (bỏ thẻ nhắc — Q4) mà người này giao được, nháp tính ở MÁY CHỦ
//   base.giao_viec_cho_duyet    GIAO — đúng lõi nút Giao việc dưới thẻ Issue (giaoTuIssue: quyền · hạn · hỏi trùng Luật 33)
//   base.bo_qua_viec_cho_duyet  BỎ  — nhớ "không cần giao việc" trên issue (y như nút Bỏ qua dưới thẻ)
//
// Bắt buộc `ma_nguoi_dung` (thân lời gọi): chạy thay đúng người đó — tài khoản đang hoạt động ở agent này + quyền Giao việc.
// Mã nháp = "<dự án>|<mã issue>". CHỈ SERVER.
// ============================================================
import { tx } from "@/lib/db";
import { LoiHttp, napNguoiDung } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { dsNoiNhan } from "@/lib/cay-viec/noi-nhan";
import { docSo } from "@/lib/cay-viec/issue/so-issue";
import { nhapMacDinh } from "@/lib/cay-viec/issue/nhap-thuan";
import { homNayVN } from "@/lib/cay-viec/doc-so-cai";
import { boQuaIssue, chuanNoiNhan, docChonNguoiAi, giaoTuIssue, nhapChoDuyet, tachMaNhap, tenWbsCuaThe } from "@/lib/cay-viec/issue/viec-cho-duyet";
import { thanhCong, thatBai, type KhuonTra } from "@/lib/mcp/khuon";

export const CONG_CU_VIEC_CHO_DUYET = {
  doc: "base.viec_cho_duyet",
  giao: "base.giao_viec_cho_duyet",
  boQua: "base.bo_qua_viec_cho_duyet",
} as const;

export const KHAI_CONG_CU_VIEC_CHO_DUYET = [
  {
    ten: CONG_CU_VIEC_CHO_DUYET.doc,
    mo_ta: "ĐỢT ⑤ — Main gom bảng tổng: issue cần giao việc MỚI (thẻ nhắc không tính — Q4) mà NGƯỜI (ma_nguoi_dung, bắt buộc) giao được; nháp máy soạn ở máy chủ, 🤖 người nhận nút găng đọc từ bộ nhớ (không gọi AI). Khuôn chung THIET-KE mục 2; mã nháp \"<dự án>|<mã issue>\"",
    tham_so: "ma_du_an?",
    san_sang: true,
  },
  {
    ten: CONG_CU_VIEC_CHO_DUYET.giao,
    mo_ta: "ĐỢT ⑤ — giao một issue thành việc thật thay người (ma_nguoi_dung bắt buộc): đúng lõi nút Giao việc dưới thẻ Issue — quyền Giao việc · phạm vi nơi nhận · hạn chưa qua · hỏi trùng Luật 33 (trùng → ok:false kèm câu trùng)",
    tham_so: "id, giao_cho (mã người/đơn vị), ten_nhan?, ten?, ket_qua?, han? (yyyy-mm-dd), dinh_kem?",
    san_sang: true,
  },
  {
    ten: CONG_CU_VIEC_CHO_DUYET.boQua,
    mo_ta: "ĐỢT ⑤ — Bỏ qua thay người (ma_nguoi_dung bắt buộc): issue nhớ \"không cần giao việc\" (bỏ đánh dấu được ở màn Issue)",
    tham_so: "id",
    san_sang: true,
  },
];

export function laCongCuViecChoDuyet(congCu: string): boolean {
  return (Object.values(CONG_CU_VIEC_CHO_DUYET) as string[]).includes(congCu);
}

const NGUON = (vi_tri: string) => [
  { loai: "issue-cho-giao", ma: "base", file_goc: "data/cay-viec/issue/<dự án>.json — sổ issue agent Công việc", vi_tri, thoi_diem_trich: new Date().toISOString() },
];

const chuoi = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** "dd/mm/yyyy" | "yyyy-mm-dd" → "yyyy-mm-dd"; rỗng/lạ → "" */
function hanIso(s: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
}

async function nguoiTuMa(maNguoiDung: string | undefined): Promise<NguoiDungPhien | string> {
  const e = (maNguoiDung ?? "").trim().toLowerCase();
  if (!e) return "Thiếu `ma_nguoi_dung` — cửa việc chờ duyệt chạy thay một người cụ thể, không chạy máy–máy.";
  const nd = await tx(async (q) => {
    const r = await q.query<{ id: string }>(
      "SELECT id FROM identity.nguoi_dung WHERE active AND (lower(email) = $1 OR split_part(lower(email), '@', 1) = $1) ORDER BY lower(email) = $1 DESC LIMIT 1",
      [e],
    );
    return r.rows[0] ? napNguoiDung(q, r.rows[0].id) : null;
  });
  if (!nd) return `${e} không có tài khoản đang hoạt động ở agent Công việc.`;
  if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) return `${nd.ten} không có quyền Giao việc ở agent Công việc (Cài đặt › Vai trò và quyền).`;
  return nd;
}

export async function chayCuaViecChoDuyet(congCu: string, thamSo: Record<string, unknown>, maNguoiDung: string | undefined): Promise<KhuonTra> {
  const nd = await nguoiTuMa(maNguoiDung);
  if (typeof nd === "string") return thatBai("KHONG_CO_QUYEN", nd);
  try {
    if (congCu === CONG_CU_VIEC_CHO_DUYET.doc) {
      const loc = chuoi(thamSo.ma_du_an).toUpperCase();
      const ds = (await nhapChoDuyet(nd)).filter((d) => !loc || d.du_an.id.toUpperCase() === loc);
      return thanhCong({ nguoi: nd.email, viec: ds }, NGUON(`${ds.length} issue cần giao việc mới · người ${nd.email}`));
    }

    const ma = tachMaNhap(chuoi(thamSo.id));
    if (!ma) return thatBai("KHONG_HIEU_YEU_CAU", "Mã nháp phải dạng \"<dự án>|<mã issue>\" (lấy từ base.viec_cho_duyet).");
    const dsDuAn = await tx((q) => layCauHinh(q, "du_an"));
    const da = dsDuAn.find((d) => d.id === ma.duAn);
    if (!da) return thatBai("KHONG_CO_DU_LIEU", `Không có dự án "${ma.duAn}" trong Cài đặt › Sơ đồ tổ chức dự án.`);
    const the = docSo(da.id).the.find((t) => t.id === ma.theId);
    if (!the) return thatBai("KHONG_CO_DU_LIEU", `Không tìm thấy issue ${ma.theId} ở dự án ${da.ten}.`);

    if (congCu === CONG_CU_VIEC_CHO_DUYET.boQua) {
      const kq = boQuaIssue(da.id, the.id, false, nd);
      if (!kq.ok) return thatBai("KHONG_HIEU_YEU_CAU", kq.loi);
      return thanhCong({ id: chuoi(thamSo.id), da_bo: true }, NGUON(`bỏ qua issue ${the.id} — ${nd.email}`));
    }

    if (congCu === CONG_CU_VIEC_CHO_DUYET.giao) {
      const ds = await tx((q) => dsNoiNhan(q, nd));
      const giaoCho = chuanNoiNhan(ds, chuoi(thamSo.giao_cho));
      if (!giaoCho) return thatBai("KHONG_HIEU_YEU_CAU", `Nơi nhận "${chuoi(thamSo.giao_cho)}" không nằm trong phạm vi ${nd.ten} giao được.`);
      // Trường nào người gửi kèm (ô Sửa ở Main) thì thắng bản nháp máy soạn
      const m = nhapMacDinh(the, { duAnTen: da.ten, homNay: homNayVN(), dauViec: docSo(da.id).dauViec });
      const co = (k: string) => typeof thamSo[k] === "string";
      const ai = the.wbs ? docChonNguoiAi(da.id, the.wbs) : null;
      const kq = await giaoTuIssue(nd, { id: da.id, ten: da.ten }, the.id, {
        giao_cho: giaoCho,
        han: co("han") ? hanIso(chuoi(thamSo.han)) : m.han,
        ten: co("ten") ? chuoi(thamSo.ten) : m.ten,
        ket_qua_can_co: co("ket_qua") ? chuoi(thamSo.ket_qua) : m.kq,
        ten_wbs: tenWbsCuaThe(da.id, the.id),
        ...(ai && giaoCho === `${ai.loai}|${ai.giao_cho}` ? { can_cu: ai.can_cu } : {}),
        dinh_kem: Array.isArray(thamSo.dinh_kem) ? thamSo.dinh_kem.filter((x): x is string => typeof x === "string") : undefined,
      });
      if (!kq.ok) return thatBai("KHONG_HIEU_YEU_CAU", `🤖 ${kq.trung} — mở màn Issue ở agent Công việc nếu vẫn muốn giao việc riêng.`);
      return thanhCong({ id: chuoi(thamSo.id), ma_viec: kq.maViec, ten_nhan: kq.tenNhan }, NGUON(`giao issue ${the.id} → việc ${kq.maViec} — ${nd.email}`));
    }
    return thatBai("KHONG_HIEU_YEU_CAU", `Công cụ "${congCu}" không thuộc nhóm việc chờ duyệt.`);
  } catch (e) {
    // LoiHttp của lõi giao (quyền · hạn · nơi nhận) → câu tiếng Việt cho bên gọi, không ném ra biên MCP
    if (e instanceof LoiHttp) return thatBai(e.status === 403 ? "KHONG_CO_QUYEN" : e.status === 404 ? "KHONG_CO_DU_LIEU" : "KHONG_HIEU_YEU_CAU", e.message);
    throw e;
  }
}

// ============================================================
// POST /api/cay-viec/soan-giao/tep — NHẬN MỘT TỆP KẸP do agent khác gửi hộ người bấm (Mr. Đại chốt 04/10/2026 chiều:
// ô giao việc ở Main · Tiến độ · Hợp đồng "giống ô +" phải kẹp 📎 gửi được tệp).
// Trình duyệt ở agent kia không có phiên agent này → agent kia nhận tệp trước rồi chuyển sang đây (máy-máy):
//   · chỉ nghe localhost · bắt buộc khoá nội bộ `x-sci-noi-bo` · form: agent_goi, nguoi_bam (email), tep;
//   · người bấm phải ĐANG HOẠT ĐỘNG + có quyền Giao việc — tệp đứng tên người đó (ganDinhKem chỉ gắn tệp của chính người giao);
//   · lưu đúng kho đính kèm "giao_viec" (giới hạn dung lượng / tắt-mở theo Cài đặt › Tệp đính kèm việc).
// Middleware chừa đường này (cùng tiền tố /api/cay-viec/soan-giao) — route tự kiểm. Mọi lượt ghi sổ nhận (luật 29).
// ============================================================
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { LoiHttp, napNguoiDung } from "@/lib/phien";
import { coKhoaNoiBo } from "@/lib/mcp/khoa-chung";
import { taiLenDinhKem } from "@/lib/dinh-kem/kho";
import { ghiLuotNhan } from "@/lib/nhat-ky/so";
import { docHeaderChuoi, MA_AGENT_SO } from "@/lib/nhat-ky/chuoi";
import { sinhMa } from "@/lib/nhat-ky/khuon-so";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";

export const dynamic = "force-dynamic";

const AGENT_GUI = ["phaply", "tiendo", "hopdong", "main", "nghiemthu"];

type Khuon = { ok: true; du_lieu: Record<string, unknown> } | { ok: false; ma_loi: string; thong_diep: string };

function noiBo(req: Request): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("[::1]");
}

export async function POST(req: Request) {
  const bd = Date.now();
  const form = await req.formData().catch(() => null);
  const maAgent = chuanHoaMaAgent(String(form?.get("agent_goi") ?? "").trim());
  const nguoiBam = String(form?.get("nguoi_bam") ?? "").trim().toLowerCase();
  const f = form?.get("tep");
  const tenTep = f && typeof f === "object" && "name" in f ? String((f as File).name) : "";
  let kq: Khuon;
  try {
    if (!noiBo(req)) throw new LoiHttp(403, "Cửa nhận tệp chỉ nghe trên mạng nội bộ — gọi bằng localhost hoặc 127.0.0.1.");
    if (!coKhoaNoiBo(req)) throw new LoiHttp(403, "Thiếu hoặc sai khoá nội bộ.");
    if (!AGENT_GUI.includes(maAgent)) throw new LoiHttp(403, `Mã agent "${maAgent || "trống"}" không được gửi tệp sang agent Công việc.`);
    if (!nguoiBam) throw new LoiHttp(400, "Thiếu email người bấm (`nguoi_bam`).");
    if (!f || typeof f !== "object" || !("arrayBuffer" in f)) throw new LoiHttp(400, "Chưa chọn file");
    const tep = f as File;
    const buf = Buffer.from(await tep.arrayBuffer());
    const ra = await tx(async (q) => {
      const r = await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE lower(email) = $1 AND active LIMIT 1", [nguoiBam]);
      const nd = r.rows[0] ? await napNguoiDung(q, r.rows[0].id) : null;
      if (!nd) throw new LoiHttp(403, `${nguoiBam} không có tài khoản đang hoạt động ở agent Công việc.`);
      if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) throw new LoiHttp(403, `${nd.ten} không có quyền Giao việc ở agent Công việc.`);
      return taiLenDinhKem(q, nd, "giao_viec", { ten: tep.name, mime: tep.type, buf });
    });
    kq = { ok: true, du_lieu: { tep: { id: ra.id, ten_tep: ra.ten_tep, kich_thuoc: ra.kich_thuoc } } };
  } catch (e) {
    kq =
      e instanceof LoiHttp
        ? { ok: false, ma_loi: e.status === 403 ? "KHONG_CO_QUYEN" : "KHONG_HIEU_YEU_CAU", thong_diep: e.message }
        : { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: `Lỗi bên trong agent Công việc: ${e instanceof Error ? e.message : String(e)}` };
  }
  const hc = docHeaderChuoi(req);
  ghiLuotNhan(
    {
      thoiDiem: new Date(bd).toISOString(),
      agentHoi: maAgent || "khong-ro",
      agentTraLoi: "base",
      // Tên KHÔNG chứa "/": chuanHoaBen coi "base" + "/" là gọi thẳng Base.vn (đo 04/10)
      congCu: "base.tai_tep_giao_viec (cửa soan-giao)",
      thamSo: { nguoi_bam: nguoiBam, ten_tep: tenTep },
      lyDoGoi: `Người bấm kẹp tệp ở ô giao việc của ${maAgent || "agent khác"}`,
      duong: "A",
      nguoi: nguoiBam || undefined,
    },
    { maLuot: hc.maLuot ?? sinhMa(MA_AGENT_SO), maChuoi: hc.maChuoi ?? sinhMa(MA_AGENT_SO), kiemDinh: hc.kiemDinh },
    bd,
    kq,
    { traLoiGon: kq.ok ? `đã nhận tệp ${tenTep} · ${String((kq.du_lieu.tep as { id: string }).id)}` : kq.thong_diep.slice(0, 160) },
  );
  return NextResponse.json(kq.ok ? { ok: true, ...kq.du_lieu } : kq);
}

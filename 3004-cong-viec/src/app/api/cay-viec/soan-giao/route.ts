// POST /api/cay-viec/soan-giao — nút găng chưa ai được giao (chép route cùng tên của agent Base, Mr. Đại chốt 10/09)
//   { du_an, soan: { ma_wbs, ten, han } }                         → 🤖 LLM đề xuất người nhận từ lịch sử sổ cái
//   { du_an, giao: { ma_wbs, ten, han, giao_cho, can_cu } }       → NGƯỜI đã bấm — tạo việc thật trong sổ cái + gắn mã WBS
// Quyền "Giao việc" (cong_viec.giao). AI không tự ghi — nhánh giao chỉ chạy sau cú bấm của người.
// ⭐ 05/10 LUẬT 33 (hỏi trùng trước khi soạn): nhánh soạn hỏi 4 agent kia trước khi 🤖 chọn người; nhánh giao dùng lại kết quả
// đã hỏi (nhớ 10 phút, gồm trùng muộn) — trùng thì trả { ok:false, trung } kèm câu "đã được agent … soạn". `van_soan: true` =
// người đã đọc câu trùng và bấm "Vẫn soạn việc riêng" → bỏ qua kiểm.
// ⭐ 04/10 (CHOT 6g.7 mục 2 — duyệt tại chỗ): agent khác gửi việc AI đề xuất mà NGƯỜI đã duyệt ở agent đó — không cookie,
// có khoá nội bộ x-sci-noi-bo + email người bấm → lib/cay-viec/nhan-tu-agent.ts. Middleware chừa đường này, route tự kiểm.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { layCayThat } from "@/lib/gan-wbs/gan-wbs";
import { giaoTuCay, soanDeXuat, tenPhuTrach } from "@/lib/cay-viec/soan-giao";
import { chonDuAn } from "@/lib/cay-viec/dung-man";
import { SESSION_COOKIE } from "@/lib/auth-token";
import { coKhoaNoiBo } from "@/lib/mcp/khoa-chung";
import { nhanTuAgent } from "@/lib/cay-viec/nhan-tu-agent";
import { dsNoiNhan } from "@/lib/cay-viec/noi-nhan";
import { docChonNguoiAi, ghiChonNguoiAi } from "@/lib/cay-viec/issue/viec-cho-duyet";
import { hoiTrungCoNho, khoaHoiTrung, quenHoiTrung } from "@/lib/cay-viec/hoi-trung-hoi";
import { chuanHanHoiTrung, tomTatHoiTrung, type CauHoiTrung } from "@/lib/chung/hoi-trung-kieu";

/** Câu hỏi trùng cho một nút găng — nội dung đúng tên việc sẽ giao (luật 30: mã kèm tên) */
function cauHoiGang(duAn: { id: string; ten: string }, g: { ma_wbs: string; ten?: string; han?: string | null; ten_day_du?: string }): CauHoiTrung {
  return {
    noi_dung: g.ten_day_du?.trim() || `[${duAn.ten}] Xử lý ${g.ma_wbs} — ${g.ten ?? ""}`,
    ly_do: `Nút ${g.ma_wbs} ${g.ten ?? ""} trên đường găng chưa ai được giao (Cây việc agent Công việc)`.trim(),
    ma_du_an: duAn.id,
    ma_wbs: g.ma_wbs,
    han: chuanHanHoiTrung(g.han?.slice(0, 10)) ?? null,
  };
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const tho = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const coPhien = (req.headers.get("cookie") ?? "").includes(`${SESSION_COOKIE}=`);
  if (!coPhien && coKhoaNoiBo(req)) return nhanTuAgent(req, tho ?? {});
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) throw new LoiHttp(403, "Bạn không có quyền giao việc");
    const b = tho as {
      du_an?: string;
      soan?: { ma_wbs?: string; ten?: string; han?: string | null; van_soan?: boolean };
      giao?: { ma_wbs?: string; ten?: string; han?: string | null; giao_cho?: string; can_cu?: string; ten_day_du?: string; ket_qua?: string; dinh_kem?: string[]; van_soan?: boolean };
      tra_ten?: string;
      ds_nguoi?: boolean;
    } | null;
    if (!b) throw new LoiHttp(400, "Thiếu nội dung");
    const ds = await tx((q) => layCauHinh(q, "du_an"));
    const da = chonDuAn(ds, b.du_an);
    if (!da) throw new LoiHttp(404, "Không tìm thấy dự án trong Cài đặt › Sơ đồ tổ chức dự án");
    const duAn = { id: da.id, ten: da.ten };

    // Người bấm "Sửa" người nhận → ô chọn bên phải: danh sách người (tên thật) + đơn vị
    if (b.ds_nguoi) {
      // Ô "Giao cho" 2 trong 1 (Mr. Đại chốt 04/10 tối) — cùng một hàm với cửa agent khác
      return tx((q) => dsNoiNhan(q, nd));
    }
    // Tra tên thật của một mã người/đơn vị (mã lạ thì báo)
    if (b.tra_ten !== undefined) {
      const pt = await tx((q) => tenPhuTrach(q, String(b.tra_ten).replace(/^@/, "").trim()));
      if (!pt) throw new LoiHttp(400, `Không có người hay đơn vị "${b.tra_ten}" trong danh bạ — gõ email tài khoản hoặc mã đơn vị`);
      return { ok: true, ...pt };
    }

    if (b.giao?.ma_wbs && b.giao.giao_cho) {
      const g = b.giao;
      // Luật 33: kết quả hỏi lúc soạn (nhớ 10 phút, gồm trùng muộn) — chưa hỏi thì hỏi bây giờ
      const khoa = khoaHoiTrung(da.id, { maWbs: g.ma_wbs });
      if (g.van_soan !== true) {
        const kq = await hoiTrungCoNho(khoa, cauHoiGang(duAn, { ...g, ma_wbs: g.ma_wbs! }), { duong: "tay", duAn: da.id, nguoi: nd.email });
        if (kq.trung) return { ok: false, trung: tomTatHoiTrung(kq), thong_diep: tomTatHoiTrung(kq) };
      }
      const ma = await tx((q) =>
        giaoTuCay(q, nd, duAn, {
          ma_wbs: g.ma_wbs!,
          ten: g.ten ?? "",
          han: g.han ?? null,
          giao_cho: g.giao_cho!,
          can_cu: g.can_cu,
          // Bản người đã Sửa (Mr. Đại chốt 04/10) — không có thì máy ghép câu mặc định như cũ
          ten_day_du: typeof g.ten_day_du === "string" ? g.ten_day_du : undefined,
          ket_qua: typeof g.ket_qua === "string" ? g.ket_qua : undefined,
          dinh_kem: Array.isArray(g.dinh_kem) ? g.dinh_kem.filter((x): x is string => typeof x === "string") : undefined,
        }),
      );
      quenHoiTrung(khoa);
      return { ok: true, ma_viec: ma };
    }

    if (!b.soan?.ma_wbs) throw new LoiHttp(400, "Thiếu lệnh — cần soạn hoặc giao");
    // ĐỢT ⑤ (06/10/2026): 🤖 đã chọn người cho nút găng này → đọc lại bộ nhớ, KHÔNG gọi AI mỗi lần mở trang
    // (bước Giao vẫn hỏi trùng Luật 33 lại). Người bấm "Vẫn soạn việc riêng" thì soạn mới.
    const nho = b.soan.van_soan !== true ? docChonNguoiAi(da.id, b.soan.ma_wbs) : null;
    if (nho) {
      return { ok: true, de_xuat: { giao_cho: nho.giao_cho, loai: nho.loai, ten_day_du: nho.ten_day_du, du_an_ten: da.ten, can_cu: nho.can_cu }, tu_bo_nho: true };
    }
    const { getAIConfig, isAIConfigured, runAIGan } = await import("@/lib/ai/providers");
    if (!isAIConfigured(getAIConfig())) return { ok: false, thong_diep: "Chưa kết nối AI — vào Cài đặt › Kết nối › AI rồi thử lại." };
    // Tên đầu việc để "mã kèm tên" (luật 30) — cây nhớ 10 phút, thường không hỏi mạng lại
    const cay = da.ma_tien_do ? await layCayThat(da.ma_tien_do, `Soạn giao việc găng ${b.soan.ma_wbs} — tên giai đoạn và tên đầu việc (luật mã kèm tên)`) : null;
    const tenTheoMa = new Map(cay?.ok ? cay.tasks.map((t) => [t.wbs, t.name]) : []);
    const model = (await tx((q) => layCauHinh(q, "ai"))).model_mac_dinh || undefined;
    const s = b.soan;
    // Luật 33: hỏi 4 agent kia TRƯỚC khi 🤖 soạn — trùng thì không soạn (đỡ cả lượt AI chọn người)
    let hoiTrung: string | null = null;
    if (s.van_soan !== true) {
      const kq = await hoiTrungCoNho(khoaHoiTrung(da.id, { maWbs: s.ma_wbs }), cauHoiGang(duAn, { ...s, ma_wbs: s.ma_wbs! }), { duong: "tay", duAn: da.id, nguoi: nd.email });
      hoiTrung = tomTatHoiTrung(kq);
      if (kq.trung) return { ok: false, trung: hoiTrung, thong_diep: hoiTrung };
    }
    // ⛔ KHÔNG bọc lượt AI trong tx(): PGlite khoá cả CSDL suốt giao dịch, mà runAI tự đọc Cài đặt bằng layQ() (chọn tài khoản
    // Claude) → chờ chính giao dịch này → treo VĨNH VIỄN cả app (đo 03/10: bấm "🤖 Soạn giao việc" làm mọi trang 3004 đứng).
    // Lượt soạn chỉ ĐỌC — dùng layQ(), từng câu truy vấn riêng, không giữ khoá trong lúc chờ AI.
    const q = await layQ();
    const kq = await soanDeXuat(q, ds, duAn, { ma_wbs: s.ma_wbs!, ten: s.ten ?? "", han: s.han ?? null }, tenTheoMa, (p, sys) => runAIGan("app/api/cay-viec/soan-giao/route", p, sys, undefined, model, 180_000, true));
    if (kq.ok) ghiChonNguoiAi(da.id, s.ma_wbs!, { giao_cho: kq.de_xuat.giao_cho, loai: kq.de_xuat.loai, ten_day_du: kq.de_xuat.ten_day_du, can_cu: kq.de_xuat.can_cu });
    return { ...kq, hoi_trung: hoiTrung };
  });
}

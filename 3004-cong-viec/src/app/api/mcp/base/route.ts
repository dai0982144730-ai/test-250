// ============================================================
// /api/mcp/base — CỔNG cho các agent hỏi AGENT CÔNG VIỆC dưới mã "base" (04/10/2026)
//
// Mr. Đại chốt 03/10: agent Công việc thay vai agent Base (1-agent-base đóng ở Đợt 3). Giữ mã "base" và đường dẫn này
// để 5 agent đang gọi không phải sửa; danh bạ Main trỏ "base" sang cổng agent Công việc.
//
// POST { cong_cu, tham_so?, agent_goi, ma_nguoi_dung?, ly_do_goi, do_sau? }
//   → khuôn HOP-DONG-KET-NOI mục 3, LUÔN HTTP 200 (kể cả ok:false — không ném ngoại lệ ra ngoài biên MCP).
// Chép nguyên luật cổng của 1-agent-base/src/app/api/mcp/base/route.ts:
//   · chỉ mạng nội bộ (localhost / 127. / [::1]) — mục 10
//   · `agent_goi` + `ly_do_goi` (≥ 3 ký tự) bắt buộc — mục 7, 10
//   · chặn chuỗi gọi sâu > 2 — mục 6.2
//   · cửa "Ai được gọi ai" (cột goi_toi kéo từ Main) + luật Agent quan sát chỉ đọc (cua-ma-tran.ts)
//   · khuôn sổ bản 2: cùng mã lượt/mã chuỗi bên gọi gửi sang; ghi lượt NHẬN, trừ khi quansat đọc sổ / gọi hạ tầng (7.1)
// Khác Base: khoá nội bộ x-sci-noi-bo kiểm bằng KHOÁ CHUNG (AUTH_SECRET_CHUNG), vì agent Công việc ký phiên bằng khoá riêng.
// Middleware bỏ qua /api/mcp/* nên đường này không cần cookie.
// ============================================================
import { NextResponse } from "next/server";
import { chayCongCu, DANH_MUC, TEN_AGENT } from "@/lib/mcp/cong-base";
import { thatBai, type KhuonTra } from "@/lib/mcp/khuon";
import { CONG_CU_KHONG_QUA_MA_TRAN, xetQuyenGoi } from "@/lib/mcp/cua-ma-tran";
import { layBanMaTran } from "@/lib/mcp/ma-tran-cong";
import { coKhoaNoiBo } from "@/lib/mcp/khoa-chung";
import { chayVoiLyDoViec, lyDoChaMcp } from "@/lib/nhat-ky/ly-do-viec";
import { ghiLuotNhan, traLoiGonTuKhuon } from "@/lib/nhat-ky/so";
import { chayTrongChuoi, docHeaderChuoi, MA_AGENT_SO } from "@/lib/nhat-ky/chuoi";
import { boQuaGhiNhan, sinhMa } from "@/lib/nhat-ky/khuon-so";
import { khoiDongDonSo } from "@/lib/nhat-ky/don-so";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";
import { CUA_CHUONG_QUAN_SAT, xetCuaChuong } from "@/lib/mcp/cua-chuong-quan-sat";
import { CUA_CHUONG_NGHIEM_THU, xetCuaChuongNghiemThu } from "@/lib/mcp/cua-chuong-nghiem-thu";
import { CUA_CHUONG_PHAP_LY, xetCuaChuongPhapLy } from "@/lib/mcp/cua-chuong-phap-ly";
import { CUA_SO_DO, xetCuaSoDo } from "@/lib/mcp/so-do-to-chuc-thuan";
import { moSanCsdlNen } from "@/lib/so-cai/hen-gio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nhịp dọn sổ hỏi–đáp (HOP-DONG-KET-NOI 7.1) — cổng MCP được hỏi suc_khoe liên tục nên bật ở đây như Base
khoiDongDonSo();
// 17/10/2026: mở sẵn CSDL ngay lượt đầu (thường là suc_khoe / nang_luc) — sáng 17/10 lượt nghiệp vụ đầu tiên sau khi bật máy
// phải gánh lần mở CSDL, 15 lượt Main cùng chờ 9,3 giây (lib/so-cai/hen-gio.ts moSanCsdlNen)
moSanCsdlNen();

function noiBo(req: Request): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("[::1]");
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!noiBo(req)) {
    return NextResponse.json(
      thatBai("KHONG_CO_QUYEN", "Cổng MCP chỉ nghe trên mạng nội bộ (HOP-DONG-KET-NOI mục 10). Gọi bằng localhost hoặc 127.0.0.1."),
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(thatBai("KHONG_HIEU_YEU_CAU", "Body phải là JSON."));
  }

  const congCu = typeof body.cong_cu === "string" ? body.cong_cu.trim() : "";
  const agentGoi = typeof body.agent_goi === "string" ? body.agent_goi.trim() : "";
  const lyDoGoi = typeof body.ly_do_goi === "string" ? body.ly_do_goi.trim() : "";
  const maNguoiDung = typeof body.ma_nguoi_dung === "string" && body.ma_nguoi_dung.trim() !== "" ? body.ma_nguoi_dung.trim() : undefined;
  const thamSo =
    body.tham_so !== null && typeof body.tham_so === "object" && !Array.isArray(body.tham_so) ? (body.tham_so as Record<string, unknown>) : {};
  const doSau = typeof body.do_sau === "number" ? body.do_sau : 1;

  if (congCu === "") return NextResponse.json(thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `cong_cu`."));
  if (agentGoi === "") return NextResponse.json(thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `agent_goi` (mục 10 điều 2)."));
  if (lyDoGoi.length < 3) return NextResponse.json(thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `ly_do_goi` (mục 7 — không cho gọi vu vơ)."));
  if (doSau > 2) {
    return NextResponse.json(
      thatBai("KHONG_CO_QUYEN", `Chuỗi gọi đã sâu ${doSau} — chặn ở độ sâu 2 để không khoá chết (HOP-DONG-KET-NOI 6.2).`),
    );
  }

  const bd = Date.now();
  const hc = docHeaderChuoi(req);
  const luot = { maLuot: hc.maLuot ?? sinhMa(MA_AGENT_SO), maChuoi: hc.maChuoi ?? sinhMa(MA_AGENT_SO), kiemDinh: hc.kiemDinh };
  const { kq, xet } = await chayTrongChuoi(
    luot.maChuoi,
    async () => {
      const cuaRieng = congCu === CUA_CHUONG_QUAN_SAT || congCu === CUA_CHUONG_NGHIEM_THU || congCu === CUA_CHUONG_PHAP_LY || congCu === CUA_SO_DO;
      const { ban, banCu } = cuaRieng || CONG_CU_KHONG_QUA_MA_TRAN.includes(congCu) ? { ban: null, banCu: false } : await layBanMaTran();
      // Cửa chuông của Quan sát (04/10): đúng quansat + khoá nội bộ — chặt hơn ma trận theo cặp, nên xét riêng
      const xet =
        congCu === CUA_CHUONG_QUAN_SAT
          ? xetCuaChuong(agentGoi, coKhoaNoiBo(req))
          : congCu === CUA_CHUONG_NGHIEM_THU // 18/10 — chuông theo người của Agent nghiệm thu, đúng nghiemthu + khoá nội bộ
            ? xetCuaChuongNghiemThu(agentGoi, coKhoaNoiBo(req))
          : congCu === CUA_CHUONG_PHAP_LY // 20/10 — chuông trả lời góp ý của Agent pháp lý, đúng phaply + khoá nội bộ
            ? xetCuaChuongPhapLy(agentGoi, coKhoaNoiBo(req))
          : congCu === CUA_SO_DO // 12/10 — câu 9: sơ đồ tổ chức chỉ giao cho Main, kèm khoá nội bộ
            ? xetCuaSoDo(agentGoi, coKhoaNoiBo(req))
            : xetQuyenGoi({ agentGoi, maNay: TEN_AGENT, congCu, coKhoaNoiBo: coKhoaNoiBo(req), ban, banCu });
      let kq: KhuonTra;
      if (!xet.duoc) {
        kq = thatBai("KHONG_CO_QUYEN", xet.lyDo);
      } else {
        try {
          const moTa = DANH_MUC.find((c) => c.ten === congCu)?.mo_ta;
          kq = await chayVoiLyDoViec(lyDoChaMcp(agentGoi, congCu, moTa, lyDoGoi), () => chayCongCu(congCu, thamSo, maNguoiDung));
        } catch (e) {
          kq = thatBai("LOI_NOI_BO", `Lỗi bên trong agent Công việc khi chạy ${congCu}: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (xet.canhBao && kq.ok) kq = { ...kq, canh_bao: [...(kq.canh_bao ?? []), xet.canhBao] };
      }
      return { kq, xet };
    },
    { kiemDinh: luot.kiemDinh },
  );

  const gon = traLoiGonTuKhuon(kq);
  if (!boQuaGhiNhan(chuanHoaMaAgent(agentGoi), congCu)) {
    ghiLuotNhan(
      {
        thoiDiem: new Date(bd).toISOString(),
        agentHoi: agentGoi,
        agentTraLoi: TEN_AGENT,
        congCu,
        thamSo,
        lyDoGoi,
        duong: agentGoi.startsWith("man-hinh") ? "tay" : "A",
        duAn: typeof thamSo.ma_du_an === "string" ? thamSo.ma_du_an : undefined,
        nguoi: maNguoiDung,
      },
      luot,
      bd,
      kq,
      { traLoiGon: xet.duoc && xet.canhBao ? `${gon} · ⚠ ${xet.canhBao}` : gon },
    );
  }

  return NextResponse.json(kq);
}

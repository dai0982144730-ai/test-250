// ============================================================
// /api/mcp/main — CỔNG MCP CỦA MAIN AGENT
//
// POST { cong_cu, tham_so?, agent_goi, ma_nguoi_dung?, ly_do_goi }
//   → khuôn HOP-DONG-KET-NOI mục 3. LUÔN HTTP 200, kể cả khi ok:false —
//     *"không bao giờ ném ngoại lệ ra ngoài biên MCP"* (mục 3.2).
//
// Ba điều tối thiểu của mục 10 (xác thực giai đoạn mở):
//   1. CHỈ nghe mạng nội bộ. Qua tên miền công khai / tunnel → KHONG_CO_QUYEN.
//      (Trước 26/09 `main.cau_hinh_chung` giao khoá thật qua cổng này — đã gỡ;
//      `main.du_lieu_dung_chung` vẫn mang danh sách người dùng nên luật giữ nguyên.)
//   2. `agent_goi` bắt buộc — không có thì không ghi sổ được, và không tra
//      được ma trận.
//   3. `ma_nguoi_dung` tuỳ chọn, mang theo nếu lượt hỏi bắt nguồn từ người.
//   `ly_do_goi` bắt buộc (mục 7 — "không cho gọi vu vơ").
//
// ⭐ CỬA CHẶN THEO MA TRẬN: mọi lời gọi đi qua `duocGoiKhongTuKho()` TRƯỚC khi
// chạm vào công cụ. Đây là chỗ làm bảng "Ai được gọi ai" (Cài đặt → 🔌) có hiệu lực thật chứ
// không phải bảng trang trí.
// ============================================================

import { NextResponse } from "next/server";
import { chayCongCu, DANH_MUC_CONG_CU, MAIN_CHO_QUAN_SAT_DOC, TEN_AGENT } from "@/lib/cau-hinh-chung/cong-mcp";
import { xetLuatQuanSat } from "@/lib/nhat-ky/cua-quan-sat";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";
import { duocGoiKhongTuKho } from "@/lib/ma-tran-goi/kho";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { coKhoaNoiBo } from "@/lib/day-sang-agent";
import { xetMaLa } from "@/lib/mcp/cua-ma-la";
import { thatBai, type KhuonTra } from "@/lib/mcp/khuon";
import { ghiLuotNhan, traLoiGonTuKhuon } from "@/lib/nhat-ky/so";
import { chayTrongChuoi, docHeaderChuoi, MA_AGENT_SO } from "@/lib/nhat-ky/chuoi";
import { boQuaGhiNhan, sinhMa } from "@/lib/nhat-ky/khuon-so";
import { khoiDongDonSo } from "@/lib/nhat-ky/don-so";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 26/09 — nhịp dọn sổ hỏi–đáp (HOP-DONG-KET-NOI 7.1) bật cả ở đây: gác ngoài ping "/" không
// theo chuyển hướng nên layout có khi chưa nạp; cổng MCP thì các agent hỏi suc_khoe liên tục.
khoiDongDonSo();

function noiBo(req: Request): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("[::1]");
}

/**
 * Hai công cụ bắt buộc của mục 4 KHÔNG đi qua ma trận.
 *
 * Vì sao: `suc_khoe` là thứ bộ ngắt mạch gọi để biết agent còn sống. Chặn nó
 * theo ma trận thì một ô tắt sẽ hoá thành "Main chết", và cả hệ hiểu sai tình
 * trạng. `nang_luc` cũng vậy — nó chỉ trả danh mục công cụ, không lộ gì.
 */
const KHONG_QUA_MA_TRAN = ["suc_khoe", "nang_luc"];

export async function POST(req: Request): Promise<NextResponse> {
  if (!noiBo(req)) {
    return NextResponse.json(
      thatBai(
        "KHONG_CO_QUYEN",
        "Cổng MCP của Main chỉ nghe trên mạng nội bộ (HOP-DONG-KET-NOI mục 10). Cổng này giao khoá dùng chung nên không bao giờ mở ra internet."
      )
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
  const maNguoiDung =
    typeof body.ma_nguoi_dung === "string" && body.ma_nguoi_dung.trim() !== ""
      ? body.ma_nguoi_dung.trim()
      : undefined;
  const thamSo =
    body.tham_so !== null && typeof body.tham_so === "object" && !Array.isArray(body.tham_so)
      ? (body.tham_so as Record<string, unknown>)
      : {};
  const doSau = typeof body.do_sau === "number" ? body.do_sau : 1;

  if (congCu === "") {
    return NextResponse.json(
      thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `cong_cu`. Gọi `nang_luc` để xem danh sách.")
    );
  }
  if (agentGoi === "") {
    return NextResponse.json(
      thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `agent_goi` (HOP-DONG-KET-NOI mục 10 điều 2).")
    );
  }
  if (lyDoGoi.length < 3) {
    return NextResponse.json(
      thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `ly_do_goi` (mục 7 — không cho gọi vu vơ).")
    );
  }
  if (doSau > 2) {
    return NextResponse.json(
      thatBai(
        "KHONG_CO_QUYEN",
        `Chuỗi gọi đã sâu ${doSau} — chặn ở độ sâu 2 để không khoá chết nhau (HOP-DONG-KET-NOI 6.2).`
      )
    );
  }

  const bd = Date.now();
  let kq: KhuonTra;
  // ⭐ Khuôn sổ bản 2 (26/09): cùng mã lượt bên gọi gửi sang (không có thì sinh),
  // chạy công cụ TRONG chuỗi của bên gọi để lượt Main hỏi tiếp mang cùng mã chuỗi.
  const hc = docHeaderChuoi(req);
  const luot = {
    maLuot: hc.maLuot ?? sinhMa(MA_AGENT_SO),
    maChuoi: hc.maChuoi ?? sinhMa(MA_AGENT_SO),
    kiemDinh: hc.kiemDinh,
  };

  // ⭐ Cửa chặn theo ma trận — trước cả khi biết công cụ có tồn tại hay không
  // ⭐ 26/09: luật theo CÔNG CỤ cho Agent quan sát (chỉ đọc) — ma trận theo cặp không diễn đạt được
  // ⭐ 04/10: MÃ LẠ (nhãn bài đo) xử như agent con — có khoá nội bộ thì cho qua kèm cảnh báo (lib/mcp/cua-ma-la.ts)
  const coKhoa = coKhoaNoiBo(req);
  const luatQs = xetLuatQuanSat(chuanHoaMaAgent(agentGoi), congCu, "Main Agent", coKhoa, MAIN_CHO_QUAN_SAT_DOC);
  const maLa = KHONG_QUA_MA_TRAN.includes(congCu) ? null : xetMaLa(agentGoi, coKhoa, docDanhBaAgent());
  const chan: { duoc: boolean; lyDo: string; canhBao?: string } = !luatQs.duoc
    ? { duoc: false, lyDo: luatQs.lyDo }
    : KHONG_QUA_MA_TRAN.includes(congCu)
      ? { duoc: true, lyDo: "Công cụ bắt buộc của mục 4, không đi qua ma trận." }
      : maLa
        ? maLa.duoc
          ? { duoc: true, lyDo: "Mã lạ có khoá nội bộ (bài đo).", canhBao: maLa.canhBao }
          : { duoc: false, lyDo: maLa.lyDo }
        : duocGoiKhongTuKho(agentGoi, TEN_AGENT);

  if (!chan.duoc) {
    kq = thatBai("KHONG_CO_QUYEN", chan.lyDo);
  } else {
    try {
      kq = await chayTrongChuoi(luot.maChuoi, () => chayCongCu(congCu, thamSo, { agentGoi, lyDoGoi }), {
        kiemDinh: luot.kiemDinh,
      });
      if (chan.canhBao && kq.ok) kq = { ...kq, canh_bao: [...(kq.canh_bao ?? []), chan.canhBao] };
    } catch (e) {
      kq = thatBai(
        "LOI_NOI_BO",
        `Lỗi bên trong Main Agent khi chạy ${congCu}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  // Ghi sổ — hỏng sổ KHÔNG được làm hỏng câu trả lời.
  // (26/09: `main.cau_hinh_chung` đã gỡ, không còn tự ghi vết riêng → mọi công cụ ghi ở đây.)
  // ⭐ 26/09 (7.1): Agent quan sát đọc sổ / gọi hạ tầng → KHÔNG ghi (59% sổ là nó đọc).
  // ketQua · maLoi · dấu vân · nội dung trả lời · nguồn do `dungTruongV2` tự quyết.
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
        nguoi: maNguoiDung,
      },
      luot,
      bd,
      kq,
      { traLoiGon: traLoiGonTuKhuon(kq) },
    );
  }

  return NextResponse.json(kq);
}

/** GET để người vận hành mở trình duyệt xem cổng có sống không */
export function GET(): NextResponse {
  return NextResponse.json({
    ok: true,
    agent: TEN_AGENT,
    ghi_chu: "Cổng MCP của Main Agent. Dùng POST theo khuôn HOP-DONG-KET-NOI mục 3.",
    cong_cu: DANH_MUC_CONG_CU.map((c) => c.ten),
  });
}

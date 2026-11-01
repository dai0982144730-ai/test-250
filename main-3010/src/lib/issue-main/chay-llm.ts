// ============================================================
// HAI LƯỢT GỌI LLM CỦA MÀN ISSUE MAIN  (server-only)
//   ① PHÂN LOẠI LẠI  — xếp đống issue lẫn lộn vào 8 nhóm chủ đề (8b.1 · 8b.3)
//   ② CẦN ANH XEM     — chọn 5 việc kèm MỘT CÂU lý do, KHÔNG chấm điểm (8b.3b)
//
// Cả hai đều là NGƯỜI BẤM NÚT mới chạy (đường "tay" trong sổ nhật ký): tốn
// token, và kết quả phải để người đọc kiểm được rồi mới tin.
//
// Không ném ngoại lệ ra ngoài: LLM chưa cấu hình / mạng hỏng đều thành câu
// tiếng Việt nói rõ vướng gì, vì màn Cảnh báo phải mở được kể cả khi không có AI.
// ============================================================

import { runAI } from "@/lib/ai/providers";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import type { DuongGoi } from "@/lib/nhat-ky/model";
import { locIssue, type IssueMain } from "./model";
import {
  HE_THONG_CAN_XEM,
  HE_THONG_PHAN_LOAI,
  docTraLoiCanAnhXem,
  docTraLoiPhanLoai,
  dungPromptCanAnhXem,
  dungPromptPhanLoai,
  type DongCanXem,
  type DongPhanLoai,
} from "./phan-loai";
import { luuCanXem, luuPhanLoai } from "./luu";
import { taoTuDien } from "@/lib/chung/ma-kem-ten";
import { ganTenLlm } from "@/lib/chung/tu-dien-ma-du-an";

export interface KetQuaChay {
  ok: boolean;
  /** Câu tiếng Việt hiện thẳng lên màn — thành công hay thất bại đều có */
  message: string;
  soIssue: number;
  soDong: number;
}

function loiThanhCau(e: unknown): string {
  return e instanceof Error ? e.message : "Lỗi không rõ khi gọi LLM.";
}

/** ① Phân loại lại — LLM xếp nhóm, code chỉ dựng câu hỏi và bóc câu trả lời */
export async function chayPhanLoaiLai(
  ds: IssueMain[],
  projectId?: string,
  nguoi?: string,
  /** 18/10/2026: mã thẻ người bấm KHÔNG được thấy (không đưa AI) — giữ nguyên nhóm cũ của chúng khi lưu */
  giuIdAn: readonly string[] = [],
  /** 01/11/2026: "B" = lượt đêm 02:30 (nhip-dem.ts) — sổ nhật ký ghi đúng ai sinh lượt gọi */
  duong: DuongGoi = "tay",
): Promise<KetQuaChay & { dong: DongPhanLoai[] }> {
  const hienDuoc = locIssue(ds).nhan;
  if (hienDuoc.length === 0) {
    return {
      ok: false,
      message:
        "Chưa gom được issue nào hiện được nên không có gì để phân loại — xem lý do ở khối “Chưa gom được từ con nào”.",
      soIssue: 0,
      soDong: 0,
      dong: [],
    };
  }
  let raw = "";
  try {
    raw = String(
      await goiCoGhi(
        {
          agentHoi: "main",
          agentTraLoi: "llm",
          congCu: "issuemain.phan_loai_lai",
          thamSo: { soIssue: hienDuoc.length },
          lyDoGoi:
            `Màn Cảnh báo của Main: xếp đống issue lẫn lộn của các agent vào 8 nhóm chủ đề (${duong === "B" ? "lượt đêm 02:30, chỉ issue chưa có chủ đề" : "người bấm nút"})`,
          duong,
          duAn: projectId,
          nguoi,
        },
        () => runAI(dungPromptPhanLoai(hienDuoc), HE_THONG_PHAN_LOAI)
      )
    );
  } catch (e) {
    return {
      ok: false,
      message: `Chưa phân loại được — ${loiThanhCau(e)}`,
      soIssue: hienDuoc.length,
      soDong: 0,
      dong: [],
    };
  }

  // Lưới an toàn "mã kèm tên" (26/09): mã issue → tiêu đề, mã WBS → tên việc
  const tdIssue = taoTuDien(hienDuoc.map((i) => [i.id, i.tieuDe]));
  const dong = await Promise.all(
    docTraLoiPhanLoai(raw).map(async (d) => ({ ...d, ghiChu: await ganTenLlm(d.ghiChu, projectId, tdIssue) })),
  );
  if (dong.length === 0) {
    return {
      ok: false,
      message: "LLM trả về câu không đọc được thành phân loại — giữ nguyên nhóm cũ, chưa đổi gì.",
      soIssue: hienDuoc.length,
      soDong: 0,
      dong: [],
    };
  }
  luuPhanLoai(dong, projectId, giuIdAn);
  return {
    ok: true,
    message: `🤖 Đã xếp ${dong.length}/${hienDuoc.length} issue vào các nhóm chủ đề. Issue LLM không nhắc tới thì giữ nguyên nhóm cũ.`,
    soIssue: hienDuoc.length,
    soDong: dong.length,
    dong,
  };
}

/** ② Chọn 5 việc "Cần anh xem" — KHÔNG điểm, KHÔNG hạng, chỉ lý do */
export async function chayChonCanAnhXem(
  ds: IssueMain[],
  projectId?: string,
  nguoi?: string,
  duong: DuongGoi = "tay",
): Promise<KetQuaChay & { dong: DongCanXem[] }> {
  const hienDuoc = locIssue(ds).nhan.filter((i) => !i.daDong);
  if (hienDuoc.length === 0) {
    return {
      ok: false,
      message: "Không có issue nào đang mở nên chưa chọn được việc nào.",
      soIssue: 0,
      soDong: 0,
      dong: [],
    };
  }
  let raw = "";
  try {
    raw = String(
      await goiCoGhi(
        {
          agentHoi: "main",
          agentTraLoi: "llm",
          congCu: "issuemain.can_anh_xem",
          thamSo: { soIssue: hienDuoc.length },
          lyDoGoi:
            `Màn Cảnh báo của Main: chọn 5 việc Giám đốc Ban cần tự xem, kèm lý do, không chấm điểm (${duong === "B" ? "lượt đêm 02:30, issue đang mở đã đổi" : "người bấm nút"})`,
          duong,
          duAn: projectId,
          nguoi,
        },
        () => runAI(dungPromptCanAnhXem(hienDuoc), HE_THONG_CAN_XEM)
      )
    );
  } catch (e) {
    return {
      ok: false,
      message: `Chưa chọn được — ${loiThanhCau(e)}`,
      soIssue: hienDuoc.length,
      soDong: 0,
      dong: [],
    };
  }

  const tdIssue = taoTuDien(hienDuoc.map((i) => [i.id, i.tieuDe]));
  const dong = await Promise.all(
    docTraLoiCanAnhXem(raw).map(async (d) => ({ ...d, lyDo: await ganTenLlm(d.lyDo, projectId, tdIssue) })),
  );
  if (dong.length === 0) {
    return {
      ok: false,
      message: "AI không trả về việc nào có lý do đi kèm — chưa có việc «cần anh xem» nào.",
      soIssue: hienDuoc.length,
      soDong: 0,
      dong: [],
    };
  }
  luuCanXem(dong, projectId);
  return {
    ok: true,
    message: `🤖 Đã chọn ${dong.length} việc, mỗi việc kèm một câu lý do. Cố ý không chấm điểm — con số kiểu “87/100” là máy bịa, không truy được về nguồn nào.`,
    soIssue: hienDuoc.length,
    soDong: dong.length,
    dong,
  };
}

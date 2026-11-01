// ============================================================
// GOM ISSUE VỀ CHO MAIN  (server-only — đụng mạng và node:fs)
// Nguồn: PLAN-MAIN-AGENT 8b.1 (Main nhận "một đống issue lẫn lộn" của các
//        agent kia) · 8b.4 (đầu vào = kết quả cổng MCP + sổ core.issue)
//
// ⛔ LUẬT SỐ MỘT: Main KHÔNG GIỮ DỮ LIỆU NGHIỆP VỤ (mục 1). Issue của bốn
//    agent kia được ĐI HỎI qua cửa duy nhất `hoiAgent`, KHÔNG chép về bảng
//    riêng — chép về là có hai bản số liệu cãi nhau.
//
// ⛔ KHÔNG GẮN CỨNG SỐ AGENT. Chạy qua đúng những con ĐANG BẬT trong Danh bạ
//    agent; hôm nay 4 con, mai 6 con, mốt 2 con — file này không phải sửa.
//    Con nào tắt / chưa khai địa chỉ thì GHI RÕ "chưa gom được từ con này",
//    không im lặng bỏ qua (im lặng thì lãnh đạo tưởng con đó sạch issue).
// ============================================================

import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { cacAgentDangBat, type KhaiAgent } from "@/lib/danh-ba-agent";
import { docSo } from "@/lib/canh-bao/so-issue";
import { laNguonMay, type TheCanhBao } from "@/lib/canh-bao/model";
import {
  GIOI_HAN_XIN_ISSUE,
  docIssueTuKhuon,
  maWbsHopLe,
  gopKetQuaGom,
  type IssueMain,
  type KetQuaGom,
  type KetQuaGomMotAgent,
} from "./model";

import { MA_MAIN } from "./model";
import { laAgentNghiepVu } from "@/lib/chung/ma-agent";
export { MA_MAIN };

/**
 * Tên công cụ hỏi issue của một agent.
 *
 * Hợp đồng kết nối v1.1 CHƯA có công cụ này trong danh mục của agent nào —
 * bốn con kia mở nó khi nào là việc của chúng. Gọi mà con đó chưa mở thì cổng
 * trả `KHONG_HIEU_YEU_CAU`, và Main hiện đúng câu "chưa gom được từ con này"
 * kèm lý do. Đó là cách trung thực duy nhất: KHÔNG bịa issue thay cho nó.
 */
export function congCuIssue(ma: string): string {
  return `${ma}.danh_sach_issue`;
}

/**
 * Điều kiện đóng của một thẻ trong sổ nội bộ.
 *
 * A.4.5 cấm nút "đóng cho xong": thẻ phải nói rõ KHI NÀO thì hết vi phạm.
 * Sổ `core.issue` bản này chưa có cột riêng cho câu đó, nên câu dưới đây suy
 * ra từ LUẬT VẬN HÀNH của chính nguồn sinh (PLAN-TONG-THE 8.2c) — là quy tắc
 * hệ thống, không phải số liệu Main bịa.
 */
export function dieuKienDongCuaThe(t: TheCanhBao): string {
  if (laNguonMay(t.nguon)) {
    return "Máy đóng, người không đóng tay được: lứa sinh sau không còn thấy vi phạm ngưỡng thì hạ dần Hết vi phạm → Chờ ổn định 2 tuần → Đã đóng.";
  }
  if (t.nguon === "ai") {
    return "Đề xuất chưa vào sổ: người duyệt thì thành issue chính thức, bác bỏ thì bắt ghi lý do và vào sổ đã bác.";
  }
  const han = (t.hanXuLy ?? "").trim();
  return `Người mở đóng khi việc đã xử lý xong đúng đề xuất trên thẻ${han !== "" ? `, hạn ${han}` : ""}.`;
}

/**
 * Đổi một thẻ trong sổ nội bộ thành issue trên màn của Main.
 *
 * Đây là NGOẠI LỆ DUY NHẤT về dữ liệu của Main (mục 8b.2): nó được sinh issue
 * từ phân tích tổng hợp, và dùng chung mã `ISS-` của `core.issue` — không đẻ
 * hệ mã riêng.
 */
export function theThanhIssue(t: TheCanhBao, tenMain: string): IssueMain {
  return {
    id: t.id,
    agentChu: MA_MAIN,
    tenAgentChu: tenMain,
    tieuDe: t.tieuDe,
    moTa: t.phanTich,
    nguonDuLieu: t.nguonDuLieu ?? "",
    dieuKienDong: dieuKienDongCuaThe(t),
    mucDo: t.mucDo === "red" ? "do" : t.mucDo === "yellow" ? "vang" : "xanh",
    // Sổ nội bộ chưa lưu nhóm chủ đề — LLM xếp ở bước Phân loại lại
    nhomChinh: null,
    nhomPhu: [],
    // 🤖 đứng trước mọi nội dung do LLM sinh (luật 19) — nguồn "ai" là LLM viết
    doLlmSinh: t.nguon === "ai",
    doNguoiThem: t.nguon === "nguoi",
    // A.4.3: thẻ không nói ảnh hưởng thì để trống, KHÔNG quy 0 thành "không ảnh hưởng"
    soNgayAnhHuong: typeof t.anhHuongCod === "number" && t.anhHuongCod > 0 ? t.anhHuongCod : null,
    tienAnhHuongVnd: null,
    daDong: t.dieuKien === "da-dong",
    an: t.an === true,
    // A10a: chỉ nhận mã WBS thật — khoá gom thẻ không phải mã thì về "Chưa gắn WBS"
    wbs: maWbsHopLe(t.wbs),
  };
}

/** Issue do CHÍNH Main sinh / người thêm ở đây — đọc từ sổ nội bộ */
export function gomTuSoNoiBo(projectId?: string, tenMain = "Main Agent"): KetQuaGomMotAgent {
  try {
    const so = docSo(projectId);
    return {
      ma: MA_MAIN,
      ten: tenMain,
      issue: so.the.map((t) => theThanhIssue(t, tenMain)),
      chuaGomVi: null,
    };
  } catch (e) {
    const chi = e instanceof Error ? e.message : "lỗi không rõ";
    return {
      ma: MA_MAIN,
      ten: tenMain,
      issue: [],
      chuaGomVi: `Chưa gom được từ ${tenMain} — không đọc được sổ issue nội bộ (${chi}).`,
    };
  }
}

/** Những con Main sẽ đi hỏi: đang bật, có địa chỉ, và không phải chính nó */
export function cacConDiHoi(danhBa: KhaiAgent[]): KhaiAgent[] {
  // 26/09: bỏ agent chỉ quan sát (quansat) — nó không có sổ issue
  return cacAgentDangBat(danhBa).filter((a) => a.ma !== MA_MAIN && laAgentNghiepVu(a.ma));
}

/**
 * Đường dẫn màn Cảnh báo trên web của từng agent — để dòng "còn N thẻ chưa lấy về"
 * bấm sang đúng chỗ xem đủ. Bốn app Next dùng chung khuôn lõi `/alerts`; riêng
 * pháp lý là app khác khuôn, màn Cảnh báo ở `/so-issue` (app/(site)/so-issue).
 * Agent mới không có trong bảng thì rơi về `/alerts` — không phải sửa file này.
 */
const DUONG_MAN_ISSUE: Record<string, string> = { phaply: "/so-issue" };

/**
 * Không gắn `?project=`: trang của các agent chọn dự án theo cookie
 * `sci_project`, mà cookie không phân biệt cổng — cùng máy thì bên kia mở đúng
 * dự án đang xem ở Main. Query chỉ API đọc, trang thì không.
 */
export function lienKetManIssue(a: KhaiAgent | undefined): string | null {
  if (!a || a.diaChi.trim() === "") return null;
  const duong = DUONG_MAN_ISSUE[a.ma] ?? "/alerts";
  return `${a.diaChi.replace(/\/+$/, "")}${duong}`;
}

/** 01/11/2026: địa chỉ màn Cảnh báo của mọi agent đang bật — nút «Mở ở agent →» trên thẻ gọn màn Cảnh báo Main */
export function lienKetCacManIssue(): Record<string, string> {
  let danhBa: KhaiAgent[] = [];
  try {
    danhBa = docDanhBaAgent();
  } catch {
    return {};
  }
  const ra: Record<string, string> = {};
  for (const a of cacConDiHoi(danhBa)) {
    const l = lienKetManIssue(a);
    if (l) ra[a.ma] = l;
  }
  return ra;
}

const LY_DO_GOI =
  "Màn Cảnh báo của Main: gom issue đang mở của agent này để phân loại lại vào 8 nhóm chủ đề (PLAN-MAIN-AGENT 8b.3)";

/**
 * GOM TOÀN BỘ — sổ nội bộ + mọi agent đang bật.
 *
 * Hỏi song song: một con chậm không được kéo cả màn chờ theo. `hoiAgent` không
 * bao giờ ném ngoại lệ nên ở đây không cần try/catch quanh từng lời gọi.
 */
export async function gomIssue(
  projectId?: string,
  /** ⭐ QS-082 (27/09): danh_sach_issue nhớ 10 phút (bo-nho-hoi.ts) — `boQuaNho` khi người bấm lấy số mới */
  tuyChon: { boQuaNho?: boolean } = {},
): Promise<KetQuaGom> {
  let danhBa: KhaiAgent[] = [];
  try {
    danhBa = docDanhBaAgent();
  } catch {
    danhBa = [];
  }
  const tenMain = danhBa.find((a) => a.ma === MA_MAIN)?.ten ?? "Main Agent";
  const con = cacConDiHoi(danhBa);

  const tuXa = await Promise.all(
    con.map(async (a): Promise<KetQuaGomMotAgent> => {
      // Truyền cả `ma_du_an` khi màn đang xem một dự án: Agent Tiến độ bắt
      // buộc tham số này và trả "Thiếu ma_du_an" nếu không có — đo thật 05/09.
      // Agent nào không cần thì bỏ qua tham số thừa, không hỏng gì.
      const kq = await hoiAgent(a.ma, congCuIssue(a.ma), LY_DO_GOI, {
        ...tuyChon,
        // gioi_han: xin đủ trần 100 — thiếu nó thì cổng trả mặc định 20 (lỗi 25/09)
        tham_so: projectId
          ? { chi_dang_mo: true, ma_du_an: projectId, gioi_han: GIOI_HAN_XIN_ISSUE }
          : { chi_dang_mo: true, gioi_han: GIOI_HAN_XIN_ISSUE },
      });
      return docIssueTuKhuon(a.ma, a.ten, kq);
    })
  );

  const chuaKhai =
    con.length === 0
      ? [
          {
            ma: "",
            ten: "Danh bạ agent",
            lyDo:
              "Chưa bật con nào trong Danh bạ agent nên chưa gom được issue của agent nào — vào Cài đặt khai địa chỉ và bật lên.",
          },
        ]
      : [];

  const gop = gopKetQuaGom([gomTuSoNoiBo(projectId, tenMain), ...tuXa], (ma) =>
    lienKetManIssue(con.find((a) => a.ma === ma)),
  );
  return {
    issue: gop.issue,
    chuaGom: [...gop.chuaGom, ...chuaKhai],
    thieuThe: gop.thieuThe,
    khongCoIssue: gop.khongCoIssue,
  };
}

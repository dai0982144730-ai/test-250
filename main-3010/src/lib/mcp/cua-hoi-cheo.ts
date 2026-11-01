// ============================================================
// CỬA HỎI CHÉO QUA MAIN — công cụ `main.tra_loi_cau_hoi` (KE-HOACH/31 đợt 5, Mr. Đại duyệt 26/10/2026)
//
// «Các agent không tự hỏi nhau là hợp lý. Nó hỏi Main, Main hỏi các agent liên quan việc đó rồi trả lời lại agent hỏi nó.»
//
// Trợ lý chat trong agent con gọi công cụ `hoi_main` → cổng này → CÙNG bộ máy chat của Main (`runChatAgent`, cùng đường
// với web và Telegram) → Main tự chọn agent liên quan, hỏi qua sổ nhật ký (luật 29) → trả một câu.
//
// Quyền: theo NGƯỜI HỎI (`nguoi_hoi`), không theo agent hỏi. Người xem không dùng trợ lý AI (Mr. Đại chốt 04/10) → chặn.
// Việc GHI không chạy ở đường này: công cụ ghi chỉ dồn vào «chờ duyệt» của lượt chat — ở đây bỏ đi và nói rõ.
// ============================================================

import { runChatAgent } from "@/lib/ai/chat-agent";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { chayUuTien } from "@/lib/ai/uu-tien";
import { canAccessProjectByEmail, listProjects } from "@/lib/projects";
import { duocCaiDat, duocGhi, NHAN_LOAI } from "@/lib/quyen";
import { getUserByEmail } from "@/lib/users";
import { thanhCong, thatBai, type KhuonTra } from "@/lib/mcp/khuon";

/** Tên các agent con được phép hỏi Main — mã chuẩn hoá ở `chuanHoaMaAgent`, ở đây chỉ để dặn Main không hỏi ngược */
const TEN_AGENT_HOI: Record<string, string> = {
  "tien-do": "agent Tiến độ",
  "hop-dong": "agent Hợp đồng",
  "phap-ly": "agent Pháp lý",
  "nghiem-thu": "agent Nghiệm thu",
  base: "agent Công việc",
};

export const MO_TA_TRA_LOI_CAU_HOI = {
  ten: "main.tra_loi_cau_hoi",
  mo_ta:
    "Trợ lý của một agent con hỏi Main một câu cần dữ liệu của agent KHÁC. Main tự chọn agent liên quan, hỏi qua sổ nhật ký, trả MỘT câu trả lời " +
    "(đúng bộ máy chat của Main, quyền theo người hỏi). Không thực hiện việc ghi.",
  tham_so: "cau_hoi, nguoi_hoi (email), ma_du_an?",
  san_sang: true,
} as const;

/** Người hỏi + dự án để Main chạy THAY họ: dùng chung cho `main.tra_loi_cau_hoi` và `main.chuyen_cong_cu` (luật 7) */
export function giaiNguoiVaDuAn(
  thamSo: Record<string, unknown>,
  viecDeNoi: string,
): { ok: true; email: string; nguoi: NonNullable<ReturnType<typeof getUserByEmail>>; duAn: { id: string; name: string }; canhBao: string[] } | { ok: false; kq: KhuonTra } {
  const email = typeof thamSo.nguoi_hoi === "string" ? thamSo.nguoi_hoi.trim().toLowerCase() : "";
  if (email === "") return { ok: false, kq: thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `nguoi_hoi` (email người đang hỏi) — Main chạy theo quyền của người đó.") };
  const nguoi = getUserByEmail(email);
  if (!nguoi) return { ok: false, kq: thatBai("KHONG_CO_QUYEN", `Không có tài khoản ${email} trong Main.`) };
  if (!duocGhi(nguoi.role)) {
    return { ok: false, kq: thatBai("KHONG_CO_QUYEN", `Tài khoản loại «${NHAN_LOAI[nguoi.role]}» không dùng trợ lý AI nên Main không ${viecDeNoi}.`) };
  }
  const maDuAn = typeof thamSo.ma_du_an === "string" ? thamSo.ma_du_an.trim() : "";
  // Mã dự án của agent con có thể khác mã của Main → khớp không ra thì dùng dự án đầu tiên người này vào được (và báo)
  const duocVao = listProjects().filter((p) => canAccessProjectByEmail(email, nguoi.role, p.id));
  const khop = maDuAn === "" ? undefined : duocVao.find((p) => p.id === maDuAn);
  const duAn = khop ?? duocVao[0];
  if (!duAn) return { ok: false, kq: thatBai("KHONG_CO_QUYEN", `${email} chưa thuộc dự án nào ở Main.`) };
  const canhBao = maDuAn !== "" && !khop ? [`Main không có dự án «${maDuAn}» cho người này — đã dùng dự án «${duAn.name}».`] : [];
  return { ok: true, email, nguoi, duAn, canhBao };
}

export async function traLoiCauHoiCheo(thamSo: Record<string, unknown>, agentGoi: string): Promise<KhuonTra> {
  const cau = typeof thamSo.cau_hoi === "string" ? thamSo.cau_hoi.trim() : "";
  if (cau.length < 5) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `cau_hoi` (ít nhất vài chữ).");
  const nd = giaiNguoiVaDuAn(thamSo, "trả lời câu hỏi chéo");
  if (!nd.ok) return nd.kq;
  const { email, nguoi, duAn } = nd;
  const canhBaoDuAn = nd.canhBao;

  const tenAgent = TEN_AGENT_HOI[agentGoi.trim().toLowerCase()] ?? `agent ${agentGoi}`;
  const bd = Date.now();
  let kq: Awaited<ReturnType<typeof runChatAgent>>;
  try {
    kq = await chayVoiNguoiGoiAi(email, () =>
      chayUuTien(() =>
        runChatAgent({
          projectId: duAn.id,
          email,
          role: duocCaiDat(nguoi.role) ? "pm" : "engineer",
          loai: nguoi.role,
          tenLoai: NHAN_LOAI[nguoi.role],
          // Dặn Main: câu do trợ lý của agent khác chuyển sang, không hỏi ngược chính agent đó, trả gọn một đoạn cho trợ lý đó dùng lại
          message:
            `[Câu do trợ lý của ${tenAgent} chuyển sang, thay mặt người dùng. KHÔNG hỏi ngược ${tenAgent}; chỉ hỏi các agent còn lại. ` +
            `Trả lời gọn bằng số liệu thật kèm hệ so sánh, để trợ lý đó đọc lại cho người dùng.]\n${cau}`,
          history: [],
          timWebBat: false,
          kenh: "web",
        }),
      ),
    );
  } catch (e) {
    return thatBai("LOI_NOI_BO", `Main không trả lời được câu hỏi chéo: ${e instanceof Error ? e.message : String(e)}`);
  }

  const daGoi = kq.actions.map((a) => a.name);
  const canhBao: string[] = [...canhBaoDuAn];
  if (kq.choDuyet.length > 0) canhBao.push("Câu hỏi có việc GHI (giao việc, sửa…) — Main không thực hiện qua đường hỏi chéo; người dùng làm trực tiếp ở Main.");
  const loiCongCu = kq.actions.filter((a) => !a.ok).map((a) => a.name);
  if (loiCongCu.length > 0) canhBao.push(`Có công cụ không trả được số: ${loiCongCu.join(", ")}.`);

  return thanhCong(
    {
      tra_loi: kq.reply,
      cong_cu_main_da_goi: daGoi,
      mat_bao_nhieu_giay: Math.round((Date.now() - bd) / 1000),
      ghi_chu: "Câu trả lời do 🤖 Main viết từ dữ liệu các agent; trợ lý hỏi nên giữ 🤖 đầu câu khi đọc lại cho người dùng.",
    },
    [
      {
        loai: "main-chat",
        ma: `hoi-cheo-${agentGoi}`,
        file_goc: "trợ lý chat Main (bộ máy dùng chung với web và Telegram)",
        thoi_diem_trich: new Date().toISOString(),
      },
    ],
    canhBao,
  );
}

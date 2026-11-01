// ============================================================
// CỔNG MCP CỦA MAIN — bộ chạy công cụ cho `/api/mcp/main`
//
// HOP-DONG-KET-NOI 5.5: *"Main Agent chỉ gọi, không mở cổng nghiệp vụ. Nó chỉ
// có nang_luc() và suc_khoe() như mọi agent."* Hai công cụ thêm ở đây KHÔNG
// phải công cụ nghiệp vụ mà là công cụ HẠ TẦNG của chính hệ:
//   · (`main.cau_hinh_chung` — GỠ HẲN 26/09: màn "Khai một lần" 0 lần lưu, sổ
//     nhật ký 469/469 lượt kéo đều rỗng; Base · Hợp đồng · Pháp lý gỡ đường
//     kéo cùng ngày, grep 0 ở cả 5 repo. Gọi tên cũ nay rơi vào nhánh default.)
//   · `main.ma_tran_goi`    — hỏi xem mình đang được phép gọi những ai
//   · `main.danh_ba`        — hệ đang nối MẤY con, con nào, ở địa chỉ nào
//
// Vì sao danh bạ cũng phải kéo từ đây: trước ngày 06/09 mỗi app giữ một bản
// `data/cai-dat-base.json` riêng. Tắt một con ở Base mà quên tắt ở Main thì
// con quan sát thôi soi nó nhưng Main vẫn hỏi nó — HAI BẢN LỆCH NHAU MÀ
// KHÔNG AI BÁO. Đúng tinh thần "khai một lần được tất cả agent", danh bạ là
// thứ đáng dùng chung nhất vì nó quyết định CẢ HỆ CÓ MẤY CON.
//
// Danh bạ KHÔNG chứa bí mật (chỉ mã · tên · địa chỉ · bật/tắt) nên ai hỏi cũng
// giao. Đổi lại nó vẫn đi đúng cổng MCP để mỗi lượt kéo đều để lại vết.
//
// Ba luật của mục 5 vẫn giữ nguyên: trả về bắt buộc kèm `nguon` không rỗng,
// có trần bản ghi, và không bao giờ ném ngoại lệ ra ngoài biên MCP.
//
// Server-only — kéo kho đĩa (`node:fs`).
// ============================================================

import { PHIEN_BAN_HOP_DONG, thanhCong, thatBai, type KhuonTra, type NguonMcp } from "@/lib/mcp/khuon";
import { KHUON_SO } from "@/lib/nhat-ky/khuon-so";
import { giuSoChoSucKhoe } from "@/lib/nhat-ky/don-so";
import { bangHienTai, docMaTran, duocGoiKhongTuKho } from "@/lib/ma-tran-goi/kho";
import { duocGoiKhong } from "@/lib/ma-tran-goi/model";
import type { BenDuocHoi } from "@/lib/nhat-ky/model";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { banDungChung } from "@/lib/he-thong-dung-chung";
import { duocVaoAgent } from "@/lib/quyen";
import { changePassword, normalizeEmail } from "@/lib/users";
import { dayChoCacAgent } from "@/lib/day-sang-agent";
import { chayCuaNhatKy } from "@/lib/mcp/cua-nhat-ky";
import { MO_TA_TRA_LOI_CAU_HOI, traLoiCauHoiCheo } from "@/lib/mcp/cua-hoi-cheo";
import { MO_TA_CHUYEN_CONG_CU, chuyenCongCu } from "@/lib/mcp/cua-chuyen-cong-cu";
import { danhMucCongCuNhatKy, danhMucCongCuThongKeAi } from "@/lib/nhat-ky/cua-quan-sat";
// 04/10 — Quản lý token AI Đợt 3: cửa đọc sổ dùng AI cho Agent quan sát
import { chayThongKeAi } from "@/lib/ai/cua-thong-ke-ai";
import { docSoGac, TEP_SO_GAC } from "@/lib/quan-sat/gac-ngoai";
import { docCauHoiTrung } from "@/lib/chung/hoi-trung-kieu";
import { traLoiHoiTrung } from "@/lib/chung/hoi-trung";

/** Tên agent này trong sổ nhật ký */
export const TEN_AGENT: BenDuocHoi = "main";

export interface MoTaCongCu {
  ten: string;
  mo_ta: string;
  tham_so: string;
  san_sang: boolean;
}

export const DANH_MUC_CONG_CU: MoTaCongCu[] = [
  { ten: "nang_luc", mo_ta: "Danh sách công cụ Main Agent cung cấp", tham_so: "—", san_sang: true },
  {
    ten: "suc_khoe",
    mo_ta: "Main còn sống không, đang theo phiên bản hợp đồng nào",
    tham_so: "—",
    san_sang: true,
  },
  {
    ten: "tim_theo_ma",
    mo_ta: "Tra một mã thuộc hệ mã sở hữu. Main KHÔNG sở hữu hệ mã nào (HOP-DONG 5.5)",
    tham_so: "ma",
    san_sang: false,
  },
  {
    ten: "main.du_lieu_dung_chung",
    mo_ta:
      "Dự án (mã ngắn · Giám đốc dự án) · Người dùng & quyền · Kết nối (AI, Drive) · hai mốc giữ sổ hỏi–đáp (giu_so) · tổ chức (to_chuc) — bản gốc DUY NHẤT của cả hệ, 4 agent kia kéo về chỉ đọc (Mr. Đại chốt 11/09). Trường anh_xa_base và ket_noi.base giữ khuôn nhưng luôn rỗng từ 04/10/2026 (đã thôi nối Base.vn)",
    tham_so: "—",
    san_sang: true,
  },
  {
    // 18/10/2026 — thiết kế chốt 04/10 «đổi mật khẩu ở mọi agent đi qua Main»: agent con đổi tại chỗ thì ≤10 phút sau Main đè lại
    ten: "main.doi_mat_khau",
    mo_ta:
      "Người đang đăng nhập ở agent con tự đổi mật khẩu — Main (gốc người dùng) kiểm mật khẩu cũ, ghi mật khẩu mới, đẩy sang các agent. Trả ok hoặc câu lỗi tiếng Việt. Sổ nhật ký che các trường mat_khau_*",
    tham_so: "email, mat_khau_cu, mat_khau_moi",
    san_sang: true,
  },
  MO_TA_TRA_LOI_CAU_HOI,
  MO_TA_CHUYEN_CONG_CU,
  {
    ten: "main.ma_tran_goi",
    mo_ta: "Agent gọi đang được phép gọi những con nào — đọc từ bảng Ai được gọi ai (Main → Cài đặt → 🔌 Kết nối)",
    tham_so: "—",
    san_sang: true,
  },
  { ten: "main.hoi_trung_viec", mo_ta: "LUẬT 33 — agent khác hỏi trước khi soạn: \"tôi định giao việc <nội dung> vì <lý do>\" có trùng nháp việc chờ duyệt của Main (nháp trợ lý chat) không. Máy lọc ứng viên (cùng dự án + mã WBS / chữ gần) → 🤖 AI phán. Không ứng viên = 0 token", tham_so: "noi_dung, ly_do, ma_du_an?, ma_wbs?, ma_ho_so?, han?, luc_giu_cho?, agent_hoi?", san_sang: true },
  {
    ten: "main.danh_ba",
    mo_ta:
      "Hệ đang nối mấy con, con nào, ở địa chỉ nào. Khai một lần ở Main, 4 con kia kéo về — không con nào tự giữ một bản riêng nữa",
    tham_so: "chi_dang_bat? (true = chỉ trả con đang bật, mặc định trả hết)",
    san_sang: true,
  },
  {
    // 26/09 (Mr. Đại chốt): màn Sức khoẻ ở Main đã bỏ — Agent quan sát đọc sổ gác qua đây
    ten: "main.so_gac",
    mo_ta:
      "Sổ script gác ngoài GAC-5-AGENT.ps1 (data/gac-5-agent.jsonl): các dòng sự kiện (treo · bat_lai · song_lai · bo_cuoc…) + khoang_bao_tri code dựng sẵn — agent nào, cổng nào, từ lúc chết/bật lại tới lúc sống lại, kèm biên an toàn bien_sau_ms sau lúc sống lại. Chỉ đọc — mở cho Agent quan sát",
    tham_so: "tu_luc?, den_luc? (ISO), gioi_han? (≤100, mặc định 100)",
    san_sang: true,
  },
  // 26/09: ba cửa ĐỌC sổ hỏi–đáp mở cho Agent quan sát (lib/nhat-ky/cua-quan-sat.ts)
  ...danhMucCongCuNhatKy("main"),
  ...danhMucCongCuThongKeAi("main"),
];

/**
 * Công cụ ĐỌC hạ tầng của Main mà Agent quan sát cần (ngoài ba cửa nhật ký +
 * suc_khoe/nang_luc): kéo danh bạ, cột ma trận, dữ liệu dùng chung — đo 26/09
 * trong `0-agent-quan-sat/src/lib/keo-cau-hinh.ts` + `du-lieu-chung.ts`.
 */
export const MAIN_CHO_QUAN_SAT_DOC: readonly string[] = [
  "main.danh_ba",
  "main.ma_tran_goi",
  "main.du_lieu_dung_chung",
  // 26/09: sổ gác ngoài — khoảng bảo trì (HOP-DONG-KET-NOI 4.1 luật 1)
  "main.so_gac",
];

export interface NguCanhGoiMcp {
  agentGoi: string;
  lyDoGoi: string;
}

function nguonHopDong(): NguonMcp[] {
  return [
    {
      loai: "hop-dong",
      ma: `HOP-DONG-KET-NOI v${PHIEN_BAN_HOP_DONG}`,
      file_goc: "TAI-LIEU-CHUNG/CHOT/HOP-DONG-KET-NOI-v1.0.md",
      vi_tri: "mục 4 · 5.5",
      thoi_diem_trich: new Date().toISOString(),
    },
  ];
}

/**
 * Chạy một công cụ. KHÔNG ném ngoại lệ — mọi nhánh trả về khuôn của mục 3.
 * Việc chặn theo ma trận nằm ở route (chặn TRƯỚC khi tới đây, cho mọi công cụ).
 */
export async function chayCongCu(
  congCu: string,
  thamSo: Record<string, unknown>,
  nc: NguCanhGoiMcp
): Promise<KhuonTra> {
  switch (congCu) {
    case "nang_luc":
      return thanhCong(
        {
          ma_agent: TEN_AGENT,
          ten: "Main Agent",
          he_ma_so_huu: [],
          ghi_chu:
            "Main không mở công cụ nghiệp vụ (HOP-DONG-KET-NOI 5.5). Hai công cụ main.* là hạ tầng dùng chung của cả hệ.",
          cong_cu: DANH_MUC_CONG_CU,
        },
        nguonHopDong()
      );

    case "suc_khoe":
      return thanhCong(
        {
          ok: true,
          phien_ban_hop_dong: PHIEN_BAN_HOP_DONG,
          // Khuôn sổ bản 2 (7.1) — Agent quan sát so chuỗi này giữa 5 agent
          khuon_so: KHUON_SO,
          // Giữ sổ theo tuổi (7.1): hai mốc đang áp + lần dọn cuối — Agent quan sát hiện lại
          giu_so: giuSoChoSucKhoe(),
          thoi_diem: new Date().toISOString(),
        },
        nguonHopDong()
      );

    case "tim_theo_ma":
      return thatBai(
        "KHONG_CO_DU_LIEU",
        "Main Agent không sở hữu hệ mã nào nên không tra được mã (HOP-DONG-KET-NOI 5.5). Hỏi Agent tiến độ (mã WBS), Pháp lý (PL-), Hợp đồng (HD-) hoặc agent Công việc."
      );

    case "main.doi_mat_khau": {
      const email = normalizeEmail(String(thamSo.email ?? ""));
      const cu = String(thamSo.mat_khau_cu ?? "");
      const moi = String(thamSo.mat_khau_moi ?? "");
      if (!email || !cu || !moi) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu email, mật khẩu cũ hoặc mật khẩu mới.");
      try {
        changePassword(email, cu, moi);
      } catch (e) {
        return thatBai("KHONG_CO_QUYEN", e instanceof Error ? e.message : "Đổi mật khẩu thất bại.");
      }
      void dayChoCacAgent(`${email} đổi mật khẩu (qua ${nc.agentGoi})`);
      return thanhCong({ ok: true, email }, [{ loai: "cau-hinh", ma: "users", file_goc: "data/users.json", thoi_diem_trich: new Date().toISOString() }]);
    }

    // Đợt 5 (KE-HOACH/31): trợ lý agent con hỏi chéo — Main chạy bộ máy chat rồi trả một câu
    case "main.tra_loi_cau_hoi":
      return traLoiCauHoiCheo(thamSo, nc.agentGoi);
    // Đường «lai» (28/10): công cụ rõ thì Main chạy bằng code, không AI
    case "main.chuyen_cong_cu":
      return chuyenCongCu(thamSo, nc.agentGoi);

    case "main.du_lieu_dung_chung": {
      const b = banDungChung();
      // ⭐ 18/10/2026 (Mr. Đại chốt): tài khoản Nhà thầu CHỈ gửi cho agent nó được vào (Tiến độ · Nghiệm thu). Agent khác không
      // nhận → không có người đó trong sổ → coi như chưa được cấp. Đo 18/10: Pháp lý đọc mã loại lạ thành Người xem — không lọc ở
      // đây thì nhà thầu xem được thư viện luật.
      b.nguoiDung = b.nguoiDung.filter((u) => duocVaoAgent(u.role, nc.agentGoi.trim().toLowerCase()));
      return thanhCong(
        {
          luc: b.luc,
          du_an: b.duAn,
          nguoi_dung: b.nguoiDung,
          ket_noi: b.ketNoi,
          tu_dien_ngu_canh: b.tuDienNguCanh,
          // E15 (23/09): email người dùng hệ thống ↔ username Base (nguồn Agent Base)
          anh_xa_base: b.anhXaBase.map((x) => ({ email: x.email, username_base: x.usernameBase, ho_ten: x.hoTen ?? null })),
          // 26/09 — hai mốc giữ sổ hỏi–đáp (HOP-DONG-KET-NOI 7.1), agent kéo về để tự dọn sổ mỗi đêm
          giu_so: { day_du: b.giuSo.dayDu, gon: b.giuSo.gon },
          // 6g.6 Đợt 2 (03/10): email cũ → email mới — Pháp lý đổi email hàng cũ; Hợp đồng chỉ hiện tên (chữ ký giữ nguyên, A11)
          bi_danh_tai_khoan: b.biDanhTaiKhoan,
          // Soát vòng 2 (03/10): số bản ghi người Main lọc bỏ vì lệch khuôn — > 0 thì agent nhận không khoá người vắng mặt
          nguoi_dung_bi_loc: b.soNguoiBiLoc,
          // 6g.6 A9 (Đợt 2): tổ chức — agent Công việc kéo về từ Đợt 3; tinh_trang "chua_co"/"hong" = KHÔNG phải tổ chức rỗng
          to_chuc: { don_vi: b.toChuc.don_vi, kiem_nhiem: b.toChuc.kiem_nhiem, uy_quyen_ky: b.toChuc.uy_quyen_ky, cap_nhat: b.toChuc.cap_nhat, tinh_trang: b.toChuc.tinhTrang },
          nhac:
            "Main là nơi DUY NHẤT tạo dự án, người dùng, kết nối. Agent nhận về chỉ ĐỌC — sửa ở Main rồi kéo lại.",
        },
        [
          {
            loai: "cau-hinh",
            ma: "du-lieu-dung-chung",
            file_goc: "data/projects.json · data/users.json · data/settings.json · data/drive.enc",
            vi_tri: `${b.duAn.length} dự án · ${b.nguoiDung.length} người dùng`,
            thoi_diem_trich: b.luc,
          },
        ],
        b.duAn.some((d) => !d.ma) ? [`${b.duAn.filter((d) => !d.ma).length} dự án chưa có MÃ NGẮN — khai ở Cài đặt → 📁 Quản lý dự án.`] : []
      );
    }

    case "main.ma_tran_goi": {
      const bang = bangHienTai();
      if (bang.canh === 0) {
        return thatBai(
          "KHONG_CO_DU_LIEU",
          "Danh bạ agent chưa bật con nào nên ma trận rỗng. Vào Cài đặt → Danh bạ agent khai và bật lên."
        );
      }
      // Chỉ trả HÀNG của agent đang hỏi — nó cần biết mình gọi được ai, không
      // cần biết chuyện giữa hai con khác.
      const duocGoi = bang.hang
        .flat()
        .filter((o) => o.agentGoi === nc.agentGoi.trim().toLowerCase() && o.bat)
        .map((o) => ({ ma: o.agentDuocGoi, ten: o.tenDuocGoi }));
      // ⭐ 24/09 — CỘT của agent đang hỏi: AI được gọi TỚI nó. Trước ngày này chỉ
      // Main thi hành ma trận; cổng hợp đồng/pháp lý vẫn trả lời agent bị tắt vì
      // không biết cột của mình. Nay mỗi cổng kéo `goi_toi` về (nhớ tạm 10 phút)
      // và tự từ chối bằng đúng câu `duocGoiKhong` — một định nghĩa, không chép.
      // Duyệt CẢ con đang tắt trong danh bạ để cổng nói được vì sao chặn.
      const danhBa = docDanhBaAgent();
      const maTran = docMaTran();
      const goiToi = danhBa
        .filter((a) => a.ma.trim().toLowerCase() !== nc.agentGoi.trim().toLowerCase())
        .map((a) => {
          const kq = duocGoiKhong(a.ma, nc.agentGoi, maTran, danhBa);
          return { ma: a.ma, ten: a.ten, duoc: kq.duoc, ly_do: kq.lyDo };
        });
      return thanhCong(
        {
          agent_hoi: nc.agentGoi,
          so_agent_trong_ma_tran: bang.canh,
          duoc_goi: duocGoi,
          goi_toi: goiToi,
          ghi_chu:
            duocGoi.length === 0
              ? "Agent này chưa được phép gọi con nào — mở Main → Cài đặt → 🔌 Kết nối → Ai được gọi ai để tích ô."
              : undefined,
        },
        [
          {
            loai: "cau-hinh",
            ma: "ma-tran-goi",
            file_goc: "data/ma-tran-goi.json",
            vi_tri: `${bang.canh}×${bang.canh}`,
            thoi_diem_trich: new Date().toISOString(),
          },
        ]
      );
    }

    // LUẬT 33 (Mr. Đại chốt 04/10/2026): hỏi trùng trước khi soạn
    case "main.hoi_trung_viec": {
      const cau = docCauHoiTrung(thamSo);
      if (typeof cau === "string") return thatBai("KHONG_HIEU_YEU_CAU", cau);
      const tl = await traLoiHoiTrung(cau, nc.agentGoi);
      return thanhCong(tl, [
        {
          loai: "nhap-viec-cho-duyet",
          ma: cau.ma_du_an ?? "khong-du-an",
          file_goc: "data/viec/viec-ai-soan.json — nháp việc chờ duyệt của Main",
          vi_tri: tl.trung && tl.viec ? `nháp ${tl.viec.ma}` : `${tl.so_ung_vien} ứng viên`,
          thoi_diem_trich: new Date().toISOString(),
          trang_thai: tl.cach_phan === "khong_ung_vien" ? "Máy lọc: không nháp nào gần — không gọi AI" : tl.cach_phan === "ai" ? "Máy lọc ứng viên → 🤖 AI phán" : "Có ứng viên nhưng 🤖 AI chưa phán được",
        },
      ]);
    }

    case "main.danh_ba": {
      const chiDangBat = thamSo.chi_dang_bat === true;
      const tatCa = docDanhBaAgent();
      const ds = chiDangBat ? tatCa.filter((a) => a.dangBat) : tatCa;

      // Danh bạ rỗng KHÔNG phải lỗi hạ tầng — là người dùng chưa khai. Nói
      // đúng chỗ phải vào sửa thay vì để agent đoán.
      if (tatCa.length === 0) {
        return thatBai(
          "KHONG_CO_DU_LIEU",
          "Danh bạ ở Main đang rỗng — chưa khai con nào. Vào Main → Cài đặt → Danh bạ agent khai rồi bật lên."
        );
      }

      return thanhCong(
        {
          // `thuMucCode` CỐ Ý không giao: nó là đường dẫn trên máy chạy Main,
          // sang máy khác là sai. Con quan sát tự đọc bản của chính nó.
          danh_ba: ds.map((a) => ({
            ma: a.ma,
            ten: a.ten,
            dia_chi: a.diaChi,
            duong_dan_mcp: a.duongDanMcp,
            dang_bat: a.dangBat,
            ghi_chu: a.ghiChu,
          })),
          so_khai: tatCa.length,
          so_dang_bat: tatCa.filter((a) => a.dangBat).length,
          nhac:
            "Đây là bản DUY NHẤT. Đừng sửa danh bạ trong app của mình — sửa ở Main, các con kéo về.",
        },
        [
          {
            loai: "cau-hinh",
            ma: "danh-ba-agent",
            file_goc: "data/cai-dat-base.json",
            vi_tri: `${tatCa.length} dòng · ${tatCa.filter((a) => a.dangBat).length} đang bật`,
            thoi_diem_trich: new Date().toISOString(),
          },
        ],
        ds.length === 0 ? ["Có khai agent nhưng không con nào đang bật."] : []
      );
    }

    case "main.so_gac":
      return chaySoGac(thamSo);

    case "main.nhat_ky_tong_hop":
      return chayCuaNhatKy("nhat_ky_tong_hop", thamSo, "Main Agent");
    case "main.nhat_ky_gan_day":
      return chayCuaNhatKy("nhat_ky_gan_day", thamSo, "Main Agent");
    case "main.hoi_thoai_gan_day":
      return chayCuaNhatKy("hoi_thoai_gan_day", thamSo, "Main Agent");
    case "main.thong_ke_ai":
      return chayThongKeAi(thamSo, "Main Agent");

    default:
      return thatBai(
        "KHONG_HIEU_YEU_CAU",
        `Main Agent không có công cụ "${congCu}". Gọi nang_luc() để xem danh sách công cụ.`
      );
  }
}

/** Mốc ISO tuỳ chọn: bỏ trống → null; sai khuôn → lỗi tiếng Việt */
function mocTuyChon(v: unknown, ten: string): { ok: true; moc: string | null } | { ok: false; loi: string } {
  if (v === undefined || v === null || v === "") return { ok: true, moc: null };
  if (typeof v !== "string" || Number.isNaN(Date.parse(v))) {
    return { ok: false, loi: `\`${ten}\` phải là thời điểm ISO, ví dụ 2026-09-26T14:00:00Z.` };
  }
  return { ok: true, moc: new Date(Date.parse(v)).toISOString() };
}

/** `main.so_gac` — CHỈ ĐỌC sổ gác ngoài; khoảng bảo trì do code dựng (gac-ngoai-thuan.ts) */
function chaySoGac(thamSo: Record<string, unknown>): KhuonTra {
  const tu = mocTuyChon(thamSo.tu_luc, "tu_luc");
  if (!tu.ok) return thatBai("KHONG_HIEU_YEU_CAU", tu.loi);
  const den = mocTuyChon(thamSo.den_luc, "den_luc");
  if (!den.ok) return thatBai("KHONG_HIEU_YEU_CAU", den.loi);
  if (tu.moc !== null && den.moc !== null && tu.moc > den.moc) {
    return thatBai("KHONG_HIEU_YEU_CAU", "`tu_luc` đứng sau `den_luc`.");
  }
  const soGioiHan = Number(thamSo.gioi_han);
  const gioiHan = Number.isFinite(soGioiHan) && soGioiHan >= 1 ? Math.min(Math.floor(soGioiHan), 100) : 100;

  const kq = docSoGac(tu.moc, den.moc, gioiHan);
  if (!kq.coTep) {
    return thatBai(
      "KHONG_CO_DU_LIEU",
      `Chưa có sổ gác (${TEP_SO_GAC}) — script GAC-5-AGENT.ps1 chưa chạy lần nào trên máy này.`
    );
  }
  const canhBao: string[] = [];
  if (kq.biCatDong) canhBao.push(`Khung có hơn ${gioiHan} dòng — chỉ trả ${gioiHan} dòng MỚI NHẤT; thu hẹp tu_luc/den_luc để xem phần cũ.`);
  if (kq.biCatKhoang) canhBao.push(`Khung có hơn ${gioiHan} khoảng bảo trì — chỉ trả ${gioiHan} khoảng mới nhất.`);
  return thanhCong(
    {
      tu_luc: tu.moc,
      den_luc: den.moc,
      dong: kq.dong,
      khoang_bao_tri: kq.khoang,
      bien_sau_ms: kq.bienSauMs,
      ghi_chu:
        "Khoảng mở ở bat_lai/bat_lai_loi/bo_cuoc/dang_dung (lùi về lúc treo nếu treo ngay trước ≤5 phút), đóng ở song_lai. " +
        "dang_dung = cổng 3004 chết vì đang dựng lại bản mới (không tính lần bật lại). " +
        "den = lúc sống lại; den_ca_bien = den + bien_sau_ms (agent khác kéo cấu hình ngay sau đó còn quá hạn — đo 26/09). " +
        "den null + cat_boi_script_luc có giá trị = script gác khởi động lại khi khoảng còn mở, không rõ lúc sống lại. " +
        "Giờ ghi UTC.",
    },
    [
      {
        loai: "so-gac",
        ma: "gac-5-agent",
        file_goc: TEP_SO_GAC,
        vi_tri: `${kq.dong.length}/${kq.tongDong.toLocaleString("vi-VN")} dòng · ${kq.khoang.length} khoảng bảo trì`,
        thoi_diem_trich: new Date().toISOString(),
      },
    ],
    canhBao
  );
}

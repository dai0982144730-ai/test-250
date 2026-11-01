// ============================================================
// NHẬN VIỆC DO AI AGENT KHÁC ĐỀ XUẤT MÀ NGƯỜI ĐÃ DUYỆT Ở AGENT ĐÓ (Mr. Đại chốt 04/10/2026 — CHOT LOI-DUNG-CHUNG 6g.7 mục 2)
//
// "Duyệt tại chỗ": người bấm Gửi ở màn duyệt của agent đề xuất (Pháp lý: Duyệt giao việc) → thành VIỆC THẬT trong sổ cái
// agent này. Không có hàng chờ chung, không có quyền "Duyệt việc AI đề xuất".
// Lời gửi máy-máy không mang cookie agent Công việc, nên cửa /api/cay-viec/soan-giao nhận thêm đường này:
//   · chỉ nghe localhost · bắt buộc khoá nội bộ `x-sci-noi-bo` (route kiểm trước khi gọi vào đây);
//   · `nguoi_bam` = email người bấm → phải là người ĐANG HOẠT ĐỘNG ở agent Công việc và có quyền Giao việc (`cong_viec.giao`)
//     — giaoViec() còn kiểm phạm vi giao (người/đơn vị nhận phải trong phạm vi người bấm được giao);
//   · hai lệnh: `ds_nguoi` (danh sách người/đơn vị cho ô chọn người nhận) · `giao` (tạo việc). Không có lệnh 🤖 soạn —
//     agent đề xuất đã tự soạn, ở đây không tốn lượt AI.
// Mọi lượt ghi sổ nhận (luật 29). Trả HTTP 200 + { ok, … } như khuôn cổng MCP.
// ============================================================
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { LoiHttp, napNguoiDung } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { chonDuAn } from "@/lib/cay-viec/dung-man";
import { giaoTuCay } from "@/lib/cay-viec/soan-giao";
import { dsNoiNhan } from "@/lib/cay-viec/noi-nhan";
import { ghiLuotNhan } from "@/lib/nhat-ky/so";
import { docHeaderChuoi, MA_AGENT_SO } from "@/lib/nhat-ky/chuoi";
import { sinhMa } from "@/lib/nhat-ky/khuon-so";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";

/** Tên agent gửi, viết vào câu nguồn của việc ("🤖 AI <tên> đề xuất") */
const TEN_AGENT_GUI: Record<string, string> = {
  phaply: "agent Pháp lý",
  tiendo: "agent Tiến độ",
  hopdong: "agent Hợp đồng",
  main: "Main",
  // 18/10/2026 (Mr. Đại cho dựng lại 3004): Agent nghiệm thu giao việc «Nhắc nhà thầu» + việc khắc phục từ Issue (PLAN Nghiệm thu §9)
  nghiemthu: "agent Nghiệm thu",
};

type Khuon = { ok: true; du_lieu: Record<string, unknown> } | { ok: false; ma_loi: string; thong_diep: string };

function noiBo(req: Request): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("[::1]");
}

function thatBai(ma_loi: string, thong_diep: string): Khuon {
  return { ok: false, ma_loi, thong_diep };
}

async function chay(b: Record<string, unknown>, maAgent: string, nguoiBam: string): Promise<Khuon> {
  if (!TEN_AGENT_GUI[maAgent]) return thatBai("KHONG_CO_QUYEN", `Mã agent "${maAgent || "trống"}" không được gửi việc sang agent Công việc.`);
  if (!nguoiBam) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu email người bấm (`nguoi_bam`) — việc phải có người duyệt.");

  const nd = await tx(async (q) => {
    const r = await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE lower(email) = $1 AND active LIMIT 1", [nguoiBam]);
    return r.rows[0] ? napNguoiDung(q, r.rows[0].id) : null;
  });
  if (!nd) return thatBai("KHONG_CO_QUYEN", `${nguoiBam} không có tài khoản đang hoạt động ở agent Công việc — không giao việc thay được.`);
  if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) {
    return thatBai("KHONG_CO_QUYEN", `${nd.ten} không có quyền Giao việc ở agent Công việc (Cài đặt › Vai trò và quyền).`);
  }

  if (b.ds_nguoi) {
    const ds = await tx(async (q) => {
      // Ô "Giao cho" 2 trong 1 (Mr. Đại chốt 04/10 tối): kèm nhóm BLĐ · cây đơn vị · đơn vị của tôi · cá nhân giao đích danh được
      const { nguoi, don_vi, nhom } = await dsNoiNhan(q, nd);
      // Ô "Thuộc dự án · không bắt buộc" + 📎 ở ô giao việc của agent gửi (giống ô "+" — Mr. Đại chốt 04/10 chiều)
      const du_an = (await layCauHinh(q, "du_an")).map((d) => ({ id: d.id, ten: d.ten, nhom: d.nhom }));
      const dk = await layCauHinh(q, "dinh_kem");
      return { nguoi, don_vi, nhom, du_an, dinh_kem: { bat: !!dk.giao_viec, toi_da_mb: dk.toi_da_mb, so_file_toi_da: dk.so_file_toi_da, luu_thang: dk.luu_thang } };
    });
    return { ok: true, du_lieu: ds };
  }

  const g = (b.giao ?? null) as {
    ma_wbs?: string;
    ten?: string;
    han?: string | null;
    giao_cho?: string;
    can_cu?: string;
    khong_ai?: boolean;
    ten_day_du?: string;
    /** Tên đầu việc của mã WBS (agent gửi biết thì gửi; không có thì sổ lấy tên việc) */
    ten_wbs?: string;
    ket_qua?: string;
    dinh_kem?: unknown;
  } | null;
  if (!g) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu lệnh — cần `giao` hoặc `ds_nguoi`.");
  if (!g.ten?.trim()) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu tên việc.");
  if (!g.giao_cho?.trim()) return thatBai("KHONG_HIEU_YEU_CAU", "Chưa chọn người hoặc đơn vị nhận.");
  const maDuAn = String(b.du_an ?? b.ma_du_an ?? "").trim();
  // Dự án KHÔNG bắt buộc (Mr. Đại chốt 04/10 chiều, như ô "+"). Trống → việc không thuộc dự án. ⚠ Không gọi chonDuAn() với
  // mã trống: hàm đó rơi về dự án đầu tiên có cây WBS — việc sẽ vào nhầm dự án.
  const da = maDuAn ? chonDuAn(await tx((q) => layCauHinh(q, "du_an")), maDuAn) : null;
  if (maDuAn && !da) return thatBai("KHONG_TIM_THAY", `Không có dự án "${maDuAn}" trong agent Công việc (danh mục kéo từ Main).`);
  const dinhKem = Array.isArray(g.dinh_kem) ? g.dinh_kem.filter((x): x is string => typeof x === "string") : [];
  const maViec = await tx((q) =>
    giaoTuCay(
      q,
      nd,
      da ? { id: da.id, ten: da.ten } : null,
      {
        ma_wbs: (g.ma_wbs ?? "").trim(),
        ten: g.ten!.trim(),
        han: g.han ?? null,
        giao_cho: g.giao_cho!,
        can_cu: g.can_cu,
        ten_day_du: typeof g.ten_day_du === "string" ? g.ten_day_du : undefined,
        ten_wbs: typeof g.ten_wbs === "string" && g.ten_wbs.trim() ? g.ten_wbs.trim() : undefined,
        ket_qua: typeof g.ket_qua === "string" ? g.ket_qua : undefined,
        dinh_kem: dinhKem.length ? dinhKem : undefined,
      },
      { maAgent, tenAgent: TEN_AGENT_GUI[maAgent], khongAi: g.khong_ai === true },
    ),
  );
  return { ok: true, du_lieu: { ma_viec: maViec, nguoi_duyet: nd.ten } };
}

export async function nhanTuAgent(req: Request, b: Record<string, unknown>): Promise<NextResponse> {
  const bd = Date.now();
  const maAgent = chuanHoaMaAgent(String(b.agent_goi ?? "").trim());
  const nguoiBam = String(b.nguoi_bam ?? "").trim().toLowerCase();
  const lenh = b.giao ? "giao_viec" : b.ds_nguoi ? "danh_sach_nguoi_nhan" : "khong_ro";
  let kq: Khuon;
  if (!noiBo(req)) {
    kq = thatBai("KHONG_CO_QUYEN", "Cửa giao việc cho agent khác chỉ nghe trên mạng nội bộ — gọi bằng localhost hoặc 127.0.0.1.");
  } else {
    try {
      kq = await chay(b, maAgent, nguoiBam);
    } catch (e) {
      kq =
        e instanceof LoiHttp
          ? thatBai(e.status === 403 ? "KHONG_CO_QUYEN" : "KHONG_HIEU_YEU_CAU", e.message)
          : thatBai("LOI_NOI_BO", `Lỗi bên trong agent Công việc: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const g = (b.giao ?? {}) as Record<string, unknown>;
  const hc = docHeaderChuoi(req);
  ghiLuotNhan(
    {
      thoiDiem: new Date(bd).toISOString(),
      agentHoi: maAgent || "khong-ro",
      agentTraLoi: "base",
      congCu: `base.${lenh} (cửa soan-giao)`, // không chứa "/" — có "/" thì sổ gắn nhầm bên Base.vn (đo 04/10)
      thamSo: b.giao ? { ma_du_an: b.du_an ?? b.ma_du_an, ma_wbs: g.ma_wbs, giao_cho: g.giao_cho, han: g.han, nguoi_bam: nguoiBam } : { nguoi_bam: nguoiBam },
      lyDoGoi: String(b.ly_do_goi ?? "").trim() || `${TEN_AGENT_GUI[maAgent] ?? maAgent} gửi việc người đã duyệt`,
      duong: "A",
      duAn: typeof (b.du_an ?? b.ma_du_an) === "string" ? String(b.du_an ?? b.ma_du_an) : undefined,
      nguoi: nguoiBam || undefined,
    },
    { maLuot: hc.maLuot ?? sinhMa(MA_AGENT_SO), maChuoi: hc.maChuoi ?? sinhMa(MA_AGENT_SO), kiemDinh: hc.kiemDinh },
    bd,
    kq,
    {
      traLoiGon: kq.ok
        ? lenh === "giao_viec"
          ? `đã tạo việc ${String(kq.du_lieu.ma_viec)} · người duyệt ${String(kq.du_lieu.nguoi_duyet)} · giao ${String(g.giao_cho ?? "")}`
          : `danh sách ${(kq.du_lieu.nguoi as unknown[]).length} người · ${(kq.du_lieu.don_vi as unknown[]).length} đơn vị`
        : kq.thong_diep.slice(0, 160),
    },
  );
  return NextResponse.json(kq.ok ? { ok: true, ...kq.du_lieu } : kq);
}

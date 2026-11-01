// /api/phong/tom-tat-tien-do — bảng TÓM TẮT TIẾN ĐỘ của một dự án (Mr. Đại giao 13/10/2026). BẢN NHÁP: nạp bằng tệp Excel, lưu tệp
// JSON trên đĩa, không vào sổ cái, không agent nào đọc (lib/tom-tat-tien-do).
//   GET                → { co: [mã dự án đã có bảng], nap_duoc: [mã dự án người này nạp được], chua_hoi_duoc: [mã dự án chưa hỏi
//                        được agent Tiến độ] } — để màn Dự án biết ô nào hiện nút
//   GET ?du_an=<mã>    → { ban: bản đang lưu | null, nap_duoc }
//   GET ?du_an=<mã>&tai=1 → tệp .xlsx đúng khuôn nạp (bảng đang lưu; chưa có bảng thì tệp mẫu trống) — nút «Tải file»
//   POST multipart {du_an, tep}: nạp tệp .xlsx — CHỈ người của Ban QLDA dự án đó (lib/tom-tat-tien-do/luu.napDuocTomTat)
// ⭐ 26/10/2026 (Mr. Đại duyệt): dự án có Baseline ĐÃ DUYỆT bên agent Tiến độ → bảng lấy từ đó (cổng tiendo.bang_gantt, qua sổ
//   nhật ký — lib/tom-tat-tien-do/dong-bo), KHOÁ nạp tay. Agent Tiến độ không thưa → hiện bản nạp tay (nếu có) kèm lời báo.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docBanTomTat, docTepTomTat, duAnCoTomTat, ghiBanTomTat, napDuocTomTat, xuatTepTomTat } from "@/lib/tom-tat-tien-do/luu";
import { tenAscii } from "@/lib/gui/api";
import { coBangGantt, layBangGanttNhanh } from "@/lib/tom-tat-tien-do/dong-bo";
import { banTuBangGantt, type BanTomTat } from "@/lib/tom-tat-tien-do/thuan";
import type { DuAn } from "@/lib/phong/du-an-thuan";

/** Bảng lấy từ agent Tiến độ nếu dự án có Baseline đã duyệt bên đó; `bao` = lời báo khi hỏi không được */
async function banTienDo(a: DuAn): Promise<{ ban: BanTomTat | null; bao: string | null }> {
  if (!a.ma_tien_do) return { ban: null, bao: null };
  const kq = await layBangGanttNhanh(a.ma_tien_do, a.ten);
  if (!kq.ok) return { ban: null, bao: kq.chua_co ? null : `Chưa lấy được bảng từ agent Tiến độ (${kq.thong_diep}) — đang hiện bản nạp tay nếu có.` };
  if (!kq.bang.co_baseline_duyet) return { ban: null, bao: null };
  return { ban: banTuBangGantt(a, a.ma_tien_do, kq.bang, kq.luc), bao: null };
}

export const dynamic = "force-dynamic";

const TEP_TOI_DA = 8 * 1024 * 1024;

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem menu Dự án");
    const ds = await tx((q) => layCauHinh(q, "du_an"));
    const ma = new URL(req.url).searchParams.get("du_an");
    if (!ma) {
      const co = duAnCoTomTat();
      // Hỏi TUẦN TỰ (kiểm lần 8 CT-3): agent Tiến độ tắt thì lượt đầu hỏng, các dự án sau thấy «đang nghỉ» và không hỏi nữa —
      // không bắn N lỗi một lúc làm ngắt mạch 10 phút mọi công cụ 3004 → 3003
      const coTd = new Set<string>();
      const chuaHoi = new Set<string>();
      for (const a of ds) {
        if (!a.ma_tien_do) continue;
        const c = await coBangGantt(a.ma_tien_do, a.ten);
        if (c) coTd.add(a.id);
        else if (c === null) chuaHoi.add(a.id);
      }
      return {
        // Chưa hỏi được: vẫn hiện icon (bấm vào thấy lời báo), KHÔNG cho nạp tay — biết đâu dự án đã có Baseline bên Tiến độ (CT-5)
        co: ds.filter((a) => co.has(a.id) || coTd.has(a.id) || chuaHoi.has(a.id)).map((a) => a.id),
        nap_duoc: ds.filter((a) => !coTd.has(a.id) && !chuaHoi.has(a.id) && napDuocTomTat(nd, a)).map((a) => a.id),
        chua_hoi_duoc: [...chuaHoi],
      };
    }
    const a = ds.find((x) => x.id === ma);
    if (!a) throw new LoiHttp(404, "Không có dự án này");
    const td = await banTienDo(a);
    if (new URL(req.url).searchParams.get("tai")) {
      const ten = `Tóm tắt tiến độ - ${a.ten.replace(/[\\/:*?"<>|]+/g, " ").trim()}.xlsx`;
      // Bảng lấy từ Tiến độ: xuất đúng mã bên Tiến độ, bỏ dòng tên dự án (khuôn sáu cột như nạp tay)
      const xuat = td.ban ? { ...td.ban, dong: td.ban.dong.filter((d) => d.ma).map((d) => ({ ...d, wbs: d.ma! })) } : docBanTomTat(a.id);
      return new Response(new Uint8Array(await xuatTepTomTat(xuat)), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${tenAscii(ten)}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (td.ban) return { ban: td.ban, nap_duoc: false };
    // Chưa hỏi được agent Tiến độ → chưa biết dự án có Baseline không, nên chưa cho nạp tay (CT-6)
    return { ban: docBanTomTat(a.id), nap_duoc: !td.bao && napDuocTomTat(nd, a), canh_bao: td.bao ? [td.bao] : undefined };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const fd = await req.formData();
    const ma = String(fd.get("du_an") ?? "");
    const a = (await tx((q) => layCauHinh(q, "du_an"))).find((x) => x.id === ma);
    if (!a) throw new LoiHttp(404, "Không có dự án này");
    const td = await banTienDo(a);
    if (td.ban) throw new LoiHttp(409, `Dự án ${a.ten} đã có Baseline duyệt bên agent Tiến độ — bảng lấy thẳng từ đó, không nạp tay nữa`);
    // Chưa hỏi được thì chưa biết có Baseline không — từ chối, để bản nạp tay không bị bảng đồng bộ che mất ngay sau đó (CT-6)
    if (td.bao) throw new LoiHttp(503, `Chưa hỏi được agent Tiến độ xem dự án ${a.ten} đã có Baseline duyệt chưa — thử nạp lại sau ít phút`);
    if (!napDuocTomTat(nd, a)) throw new LoiHttp(403, `Chỉ người của Ban QLDA dự án ${a.ten} mới nạp được bảng tóm tắt tiến độ của dự án này`);
    const tep = fd.get("tep");
    if (!tep || typeof tep === "string") throw new LoiHttp(400, "Chưa chọn tệp");
    if (!/\.xlsx?$/i.test(tep.name)) throw new LoiHttp(400, "Chỉ nhận tệp Excel (.xlsx hoặc .xls)");
    if (tep.size > TEP_TOI_DA) throw new LoiHttp(400, "Tệp lớn quá 8 MB");
    let kq: ReturnType<typeof docTepTomTat>;
    try {
      kq = docTepTomTat(Buffer.from(await tep.arrayBuffer()));
    } catch {
      throw new LoiHttp(400, "Không mở được tệp này — hãy lưu lại bằng Excel dạng .xlsx rồi nạp lại");
    }
    if (!kq.dong.length) throw new LoiHttp(400, ["Tệp không có dòng nào đọc được. Trang tính đầu cần sáu cột: WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc.", ...kq.canh_bao].join(" "));
    const ban = { du_an: a.id, ten_tep: tep.name, nap_luc: new Date().toISOString(), nap_boi: nd.id, nap_boi_ten: nd.ten, dong: kq.dong };
    ghiBanTomTat(ban);
    return { ban, canh_bao: kq.canh_bao };
  });
}

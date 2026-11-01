// /api/cay-viec/issue — SỔ ISSUE của màn /cay-viec/issue (chép app/api/canh-bao/route.ts của agent Base).
//   GET  ?du_an=…                      → sổ + ngưỡng + quyền (KHÔNG hỏi agent khác — trang hiện ngay)
//   POST { du_an, hanhDong: … }
//     "chay"       → bộ sinh 4 luật (hỏi agent Tiến độ qua lớp ghi sổ, luật 29) — màn tự gọi ngay sau khi hiện sổ
//     "sinh-ai"    → 🤖 nhóm 5: AI đọc bảng Kiến nghị / Sự cố / Cảnh báo của báo cáo đã nộp (tốn token, người bấm)
//     "ghi-nhan" · "them" · "an" · "dong" · "xoa" · "duyet" · "bac-bo" — như Base
//     "nguong"     → sửa N/M/K ngay trên màn, ghi vết ai sửa / lúc nào / từ → sang
//     "giao-viec"  → NGƯỜI bấm Giao việc từ một issue → tạo việc thật trong sổ cái + ghi nhận "Đã giao việc"
//                    ⭐ 05/10 Luật 33: hỏi 4 agent kia trước (nút găng dùng lại kết quả lúc 🤖 soạn, nhớ 10 phút) — trùng thì
//                    trả { ok:false, trung }; `van_soan: true` = người đã đọc câu trùng, bấm "Vẫn giao việc riêng"
//     "nhac-giu-viec" → thẻ NHẮC (Q4, đợt ⑤ 06/10): chuông người chủ trì việc cũ + ghi lịch sử việc — không giao việc mới
//     "khong-can-giao" { bo? } → Bỏ qua ở khối giao việc dưới thẻ = nhớ "không cần giao việc"; bo = bỏ đánh dấu (chốt 04/10 tối)
// Quyền (không thêm quyền mới — xem lib/cay-viec/issue/quyen.ts): xem so_cai.xem · ghi cong_viec.sua · phán xét wbs.duyet ·
// giao cong_viec.giao. ⛔ Không chạy lượt AI trong tx() (PGlite khoá cả CSDL → app treo, lỗi 03/10).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { duongGang, khoiLuongHangMuc } from "@/lib/nguon-tien-do";
import { layHetDauViec } from "@/lib/tien-do-dau-viec";
import { chonDuAn } from "@/lib/cay-viec/dung-man";
import { homNayVN } from "@/lib/cay-viec/doc-so-cai";
import { chaySinhIssue } from "@/lib/cay-viec/issue/chay";
import { sinhNhom5 } from "@/lib/cay-viec/issue/nhom5";
import { docNguong, luuNguong } from "@/lib/cay-viec/issue/nguong-luu";
import { quyenIssue } from "@/lib/cay-viec/issue/quyen";
import { docSoNguoiGo } from "@/lib/chung/doc-so";
import type { TrangThaiXuLy } from "@/lib/cay-viec/issue/model";
import { boQuaIssue, giaoTuIssue, nhacNguoiGiuViec } from "@/lib/cay-viec/issue/viec-cho-duyet";
import { anIssue, bacBoDeXuat, docSo, dongIssue, duyetDeXuat, ghiNhanXuLy, themIssueNguoi, xoaIssue, type KetQua } from "@/lib/cay-viec/issue/so-issue";

export const dynamic = "force-dynamic";

const XU_LY_HOP_LE: TrangThaiXuLy[] = ["chua-ai-dong", "da-tiep-nhan", "da-giao-viec", "dang-xu-ly"];

const nguonThat = {
  hoiGang: (ma: string, ly: string) => duongGang(ma, ly),
  hoiCay: (ma: string, ly: string) => layHetDauViec(ma, ly),
  hoiKhoiLuong: (ma: string, loc: { ma_wbs?: string; tu_ngay?: string; den_ngay?: string }, ly: string) => khoiLuongHangMuc(ma, loc, ly),
};

async function duAnCua(duAnId: string | null | undefined) {
  const ds = await layCauHinh(await layQ(), "du_an");
  const da = chonDuAn(ds, duAnId);
  if (!da) {
    if (duAnId) throw new LoiHttp(404, `Không có dự án "${duAnId}" trong Cài đặt › Sơ đồ tổ chức dự án`);
    throw new LoiHttp(404, 'Chưa dự án nào có cây WBS bên agent Tiến độ — chưa có gì để soi việc');
  }
  return da;
}

function traVe(kq: KetQua, duAn: string, thongDiep: string) {
  if (!kq.ok) throw new LoiHttp(kq.khongThay ? 404 : 400, kq.loi);
  return { ok: true, thong_diep: thongDiep, so: docSo(duAn) };
}

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const da = await duAnCua(new URL(req.url).searchParams.get("du_an"));
    return { ok: true, du_an: { id: da.id, ten: da.ten, co_cay: !!da.ma_tien_do }, so: docSo(da.id), nguong: docNguong(), quyen: quyenIssue(nd), hom_nay: homNayVN() };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) throw new LoiHttp(400, "Nội dung gửi lên không hợp lệ");
    const da = await duAnCua(typeof b.du_an === "string" ? b.du_an : null);
    const q = quyenIssue(nd);
    const can = (co: boolean, viec: string) => {
      if (!co) throw new LoiHttp(403, `Bạn không có quyền ${viec}`);
    };
    const id = typeof b.id === "string" ? b.id : "";
    const homNay = homNayVN();

    switch (String(b.hanhDong ?? "")) {
      case "chay": {
        const kq = await chaySinhIssue(da.id, nguonThat);
        return {
          ok: true,
          thong_diep: kq.khongChayDuoc ? "Bộ sinh không đo được lượt này — sổ giữ nguyên." : `Đã chạy bộ sinh: ${kq.soSinh} thẻ${kq.soBiLoai > 0 ? `, ${kq.soBiLoai} thẻ bị luật 10.0 loại vì thiếu Ảnh hưởng COD hoặc Đề xuất` : ""}.`,
          ghi_chu: kq.ghiChu,
          khong_chay_duoc: !!kq.khongChayDuoc,
          so: kq.khongChayDuoc ? docSo(da.id) : kq.so,
        };
      }
      case "sinh-ai": {
        can(q.duyet, '"Duyệt gắn WBS" — cần để chạy 🤖 AI đề xuất');
        const kq = await sinhNhom5(da.id, nguonThat.hoiCay);
        if (!kq.ok) throw new LoiHttp(502, kq.thongDiep);
        return { ok: true, thong_diep: kq.thongDiep, so: docSo(da.id) };
      }
      case "ghi-nhan": {
        can(q.ghi, '"Sửa việc" — cần để ghi nhận xử lý');
        const viecDaLam = String(b.viecDaLam ?? "").trim();
        const chuyenSang = String(b.chuyenSang ?? "") as TrangThaiXuLy;
        if (viecDaLam.length < 3) throw new LoiHttp(400, "Ghi nhận xử lý phải nói rõ ĐÃ LÀM GÌ — không nhận ô trống.");
        if (!XU_LY_HOP_LE.includes(chuyenSang)) throw new LoiHttp(400, "Trạng thái xử lý không hợp lệ.");
        return traVe(ghiNhanXuLy(da.id, id, { luc: new Date().toISOString(), nguoi: nd.ten, viecDaLam, chuyenSang }), da.id, "Đã ghi nhận — lưu vào sổ, không mất khi tải lại.");
      }
      case "them": {
        can(q.ghi, '"Sửa việc" — cần để thêm issue');
        const tieuDe = String(b.tieuDe ?? "").trim();
        const phanTich = String(b.phanTich ?? "").trim();
        const deXuat = String(b.deXuat ?? "").trim();
        if (tieuDe.length < 3 || phanTich.length < 3) throw new LoiHttp(400, "Phải có tiêu đề và mô tả vấn đề.");
        if (deXuat.length < 3) throw new LoiHttp(400, "Phải ghi ĐỀ XUẤT xử lý — luật 10.0: thẻ không nói nên làm gì thì không được hiện.");
        const t = themIssueNguoi(da.id, {
          mucDo: b.mucDo === "red" ? "red" : "yellow",
          tieuDe,
          phanTich,
          wbs: typeof b.wbs === "string" && b.wbs.trim() ? b.wbs.trim() : undefined,
          // ô chữ người gõ số ngày → chuẩn số Việt Nam, lib/chung/doc-so (chốt 130): «12,5» = 12,5 (bản cũ ra 0)
          anhHuongCod: Math.max(0, Math.round(docSoNguoiGo(b.anhHuongCod) ?? 0)),
          nguonDuLieu: `người nhập tay (nguồn 4) — ${nd.ten}`,
          deXuat,
          ngayMo: homNay,
          nguoiMo: nd.ten,
          nguoiTheoDoi: typeof b.nguoiTheoDoi === "string" && b.nguoiTheoDoi.trim() ? b.nguoiTheoDoi.trim() : undefined,
          hanXuLy: typeof b.hanXuLy === "string" && b.hanXuLy ? b.hanXuLy : undefined,
        });
        return { ok: true, thong_diep: `Đã ghi vào sổ ${t.id} — hiệu lực ngay, không cần ai duyệt.`, so: docSo(da.id), id: t.id };
      }
      case "an": {
        can(q.ghi, '"Sửa việc" — cần để ẩn issue');
        const an = b.an !== false;
        return traVe(anIssue(da.id, id, an), da.id, an ? "Đã ẩn — issue vẫn nằm trong sổ và VẪN ĐẾM vào tổng." : "Đã bỏ ẩn.");
      }
      case "khong-can-giao": {
        can(q.giao, '"Giao việc" — cần để đánh dấu không cần giao việc');
        const bo = b.bo === true;
        return traVe(
          boQuaIssue(da.id, id, bo, nd),
          da.id,
          bo ? "Đã hiện lại — khối giao việc trở lại dưới thẻ." : "Đã bỏ qua — khối giao việc ẩn, hiện lại được ngay dưới thẻ.",
        );
      }
      case "dong": {
        can(q.ghi, '"Sửa việc" — cần để đóng issue');
        return traVe(dongIssue(da.id, id), da.id, "Đã đóng issue.");
      }
      case "xoa": {
        can(q.duyet, '"Duyệt gắn WBS" — cần để xoá issue sai');
        return traVe(xoaIssue(da.id, id, String(b.lyDo ?? ""), nd.ten), da.id, "Đã xoá và ghi lý do vào Sổ đã bác — bộ sinh sẽ KHÔNG sinh lại issue này.");
      }
      case "duyet": {
        can(q.duyet, '"Duyệt gắn WBS" — cần để duyệt đề xuất');
        const kq = duyetDeXuat(da.id, id, nd.ten, homNay);
        const r = traVe(kq, da.id, 'Đã duyệt — đề xuất vào sổ và chuyển sang tab "👤 Issue do người thêm".');
        return { ...r, id: kq.ok ? kq.the?.id : undefined };
      }
      case "bac-bo": {
        can(q.duyet, '"Duyệt gắn WBS" — cần để bác bỏ đề xuất');
        return traVe(bacBoDeXuat(da.id, id, String(b.lyDo ?? "")), da.id, "Đã bác bỏ — lý do được lưu để đo AI sai bao nhiêu.");
      }
      case "nguong": {
        can(q.duyet, '"Duyệt gắn WBS" — cần để sửa ngưỡng');
        const so = (k: string) => Number(b[k]);
        const kq = luuNguong({ N: so("N"), M: so("M"), K: so("K") }, nd.ten);
        if (!kq.ok) throw new LoiHttp(400, kq.loi);
        // Ngưỡng đổi → chạy lại bộ sinh ngay để thẻ theo số mới (hỏi agent Tiến độ, ngoài giao dịch)
        const chay = kq.soDoi > 0 ? await chaySinhIssue(da.id, nguonThat) : null;
        return {
          ok: true,
          thong_diep: kq.soDoi === 0 ? "Ngưỡng không đổi." : `Đã lưu ${kq.soDoi} ngưỡng và chạy lại bộ sinh${chay?.khongChayDuoc ? " (lượt này không đo được — sổ giữ nguyên)" : `: ${chay?.soSinh ?? 0} thẻ`}.`,
          nguong: kq.ch,
          so: docSo(da.id),
        };
      }
      case "giao-viec": {
        // Lõi chung với màn Việc của tôi + cửa base.giao_viec_cho_duyet của Main (đợt ⑤ 06/10 — lib/cay-viec/issue/viec-cho-duyet.ts)
        const kq = await giaoTuIssue(nd, { id: da.id, ten: da.ten }, id, {
          giao_cho: String(b.giao_cho ?? ""),
          han: typeof b.han === "string" ? b.han : "",
          ten: typeof b.ten === "string" ? b.ten : undefined,
          ket_qua_can_co: typeof b.ket_qua_can_co === "string" ? b.ket_qua_can_co : undefined,
          ten_wbs: typeof b.ten_wbs === "string" ? b.ten_wbs : undefined,
          can_cu: typeof b.can_cu === "string" ? b.can_cu : undefined,
          dinh_kem: Array.isArray(b.dinh_kem) ? b.dinh_kem.filter((x): x is string => typeof x === "string") : undefined,
          van_soan: b.van_soan === true,
        });
        if (!kq.ok) return { ok: false, trung: kq.trung, thong_diep: kq.trung };
        return { ok: true, thong_diep: `Đã tạo việc ${kq.maViec} trong sổ cái, giao ${kq.tenNhan} — issue chuyển "Đã giao việc".`, ma_viec: kq.maViec, so: docSo(da.id) };
      }
      case "nhac-giu-viec": {
        // Q4 (chốt 04/10) + 06/10: thẻ nhắc → chuông người chủ trì + lịch sử việc, không giao việc mới
        const kq = await nhacNguoiGiuViec(nd, { id: da.id, ten: da.ten }, id);
        return {
          ok: true,
          thong_diep: kq.soViec ? `Đã nhắc ${kq.soNguoi} người giữ ${kq.viec.join(", ")} — chuông trong app, ghi vào lịch sử việc.` : "Các việc cũ của issue này không còn trong sổ cái — không có ai để nhắc.",
          so: docSo(da.id),
        };
      }
      default:
        throw new LoiHttp(400, "Hành động không hợp lệ.");
    }
  });
}

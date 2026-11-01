// ============================================================
// cay-viec/issue/viec-cho-duyet.ts — ĐỢT ⑤ (06/10/2026, THIET-KE-VIEC-CHO-DUYET-CHUNG-04-10 mục 2–3 · 5)
//
//   ① giaoTuIssue      — lõi nút "Giao việc" từ một issue (tách khỏi route /api/cay-viec/issue để khối dưới thẻ, màn
//                         Việc của tôi và cửa base.giao_viec_cho_duyet của Main đi CHUNG một lối — luật 7). Hỏi trùng Luật 33.
//   ② nhacNguoiGiuViec — Q4: thẻ NHẮC không giao việc mới; nút "Nhắc người giữ việc" = chuông app cho người chủ trì
//                         (đơn vị → trưởng đơn vị) + ghi lịch sử từng việc (Mr. Đại chốt 06/10). Khuôn y như nhắc từ Báo cáo tuần.
//   ③ nhapChoDuyet     — nháp tính PHÍA MÁY CHỦ (trước tính ở trình duyệt nên Main không đọc được): mọi issue cần giao việc
//                         mới mà người này giao được, theo khuôn chung mục 2. 🤖 người nhận đọc từ bộ nhớ ④, KHÔNG gọi AI.
//   ④ bộ nhớ 🤖 chọn người cho nút găng — một lượt AI mỗi nút rồi NHỚ (trước: mỗi lần mở trang lại gọi AI).
//
// ⛔ Không chạy lượt mạng / AI trong tx() (PGlite khoá cả CSDL — lỗi 03/10). CHỈ SERVER.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { layQ, tx, type Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { homNayVN } from "@/lib/cay-viec/doc-so-cai";
import { giaoTuCay, tenPhuTrach } from "@/lib/cay-viec/soan-giao";
import { giaoViec } from "@/lib/so-cai/dich-vu";
import { dsNoiNhan } from "@/lib/cay-viec/noi-nhan";
import { hoiTrungCoNho, khoaHoiTrung, quenHoiTrung } from "@/lib/cay-viec/hoi-trung-hoi";
import { tomTatHoiTrung } from "@/lib/chung/hoi-trung-kieu";
import { taoThongBao, dauDonVi } from "@/lib/thong-bao";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { docSo, ghiNhanXuLy, khongCanGiaoIssue, type KetQua } from "@/lib/cay-viec/issue/so-issue";
import { boDanhDauKhongCanGiao, danhDauKhongCanGiao } from "@/lib/cay-viec/khong-can-giao";
import { lyDoChanGhi, quyenIssue } from "@/lib/cay-viec/issue/quyen";
import { canGiaoViec, laNutGang, laTheNhac, nguonViecCua, nhapMacDinh, tenWbsCua, viecCuCuaThe, type NguonViecCho } from "@/lib/cay-viec/issue/nhap-thuan";

// ─────────────────────────────────────────────────────────────
// ④ Bộ nhớ 🤖 chọn người cho nút găng — data/cay-viec/issue/ai-chon-nguoi.json
// ─────────────────────────────────────────────────────────────
export interface ChonNguoiAi {
  giao_cho: string;
  loai: "nguoi" | "don_vi";
  ten_day_du: string;
  can_cu: string;
  luc: string;
}
const tepChonAi = () => thuMucDuLieu("cay-viec", "issue", "ai-chon-nguoi.json");
const khoaChon = (duAn: string, wbs: string) => `${duAn}|${wbs}`;

function docTatCaChonAi(): Record<string, ChonNguoiAi> {
  try {
    return JSON.parse(fs.readFileSync(tepChonAi(), "utf8")) as Record<string, ChonNguoiAi>;
  } catch {
    return {};
  }
}
export function docChonNguoiAi(duAn: string, wbs: string): ChonNguoiAi | null {
  return docTatCaChonAi()[khoaChon(duAn, wbs)] ?? null;
}
export function ghiChonNguoiAi(duAn: string, wbs: string, v: Omit<ChonNguoiAi, "luc">): void {
  const ds = docTatCaChonAi();
  ds[khoaChon(duAn, wbs)] = { ...v, luc: new Date().toISOString() };
  fs.mkdirSync(path.dirname(tepChonAi()), { recursive: true });
  fs.writeFileSync(tepChonAi(), JSON.stringify(ds, null, 2) + "\n", "utf8");
}

// ─────────────────────────────────────────────────────────────
// ① Giao việc từ một issue
// ─────────────────────────────────────────────────────────────
export interface YeuCauGiaoIssue {
  /** "nguoi|<mã>" | "don_vi|<mã>" */
  giao_cho: string;
  /** yyyy-mm-dd */
  han: string;
  ten?: string;
  ket_qua_can_co?: string;
  ten_wbs?: string;
  can_cu?: string;
  dinh_kem?: string[];
  van_soan?: boolean;
}

export type KetQuaGiaoIssue = { ok: true; maViec: string; tenNhan: string; han: string } | { ok: false; trung: string };

export async function giaoTuIssue(nd: NguoiDungPhien, da: { id: string; ten: string }, theId: string, b: YeuCauGiaoIssue): Promise<KetQuaGiaoIssue> {
  if (!quyenIssue(nd).giao) throw new LoiHttp(403, 'Bạn không có quyền "Giao việc"');
  const the = docSo(da.id).the.find((t) => t.id === theId);
  if (!the) throw new LoiHttp(404, "Không tìm thấy issue.");
  if (laTheNhac(the)) throw new LoiHttp(400, "Issue nhắc không giao việc mới — dùng Mở việc cũ / Nhắc người giữ việc (Mr. Đại chốt 04/10).");
  const [loai, ma] = String(b.giao_cho ?? "").split("|") as ["nguoi" | "don_vi", string];
  if (!ma || (loai !== "nguoi" && loai !== "don_vi")) throw new LoiHttp(400, "Chưa chọn người / đơn vị nhận việc.");
  const han = typeof b.han === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.han) ? b.han : null;
  if (!han) throw new LoiHttp(400, "Chưa có hạn — mọi việc giao phải có ngày kết thúc.");
  const homNay = homNayVN();
  if (han < homNay) throw new LoiHttp(400, `Hạn ${han.split("-").reverse().join("/")} đã qua — chọn hạn từ hôm nay trở đi.`);
  const ten = String(b.ten ?? "").trim();
  const kqcc = String(b.ket_qua_can_co ?? "").trim();
  const nutGang = laNutGang(the);
  // 04/10/2026 (khuôn chung giao việc): giao ĐÚNG nội dung đang hiện trên ô (tên · kết quả cần có) + tệp kẹp ở ô Sửa
  const dinhKem = Array.isArray(b.dinh_kem) ? b.dinh_kem.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
  // Luật 33 — hỏi trùng NGOÀI tx() (gọi mạng, có thể chờ 15 giây)
  const khoa = khoaHoiTrung(da.id, nutGang ? { maWbs: the.wbs } : { maIssue: the.id });
  if (b.van_soan !== true) {
    const kq = await hoiTrungCoNho(
      khoa,
      {
        noi_dung: ten || (nutGang ? `[${da.ten}] Xử lý ${the.wbs} — ${String(b.ten_wbs ?? the.tieuDe)}` : `Xử lý issue ${the.id}: ${the.tieuDe}`),
        ly_do: `Issue ${the.id} "${the.tieuDe}" ở agent Công việc cần người xử lý`,
        ma_du_an: da.id,
        ma_wbs: /^\d+(?:\.\d+)*$/.test(the.wbs ?? "") ? the.wbs : null,
        han,
      },
      { duong: "tay", duAn: da.id, nguoi: nd.email },
    );
    if (kq.trung) return { ok: false, trung: tomTatHoiTrung(kq) };
  }
  const { maViec, tenNhan } = await tx(async (qq) => {
    const pt = await tenPhuTrach(qq, ma);
    if (!pt) throw new LoiHttp(400, `Không có người hay đơn vị "${ma}" trong danh bạ`);
    const maViec = nutGang
      ? await giaoTuCay(qq, nd, { id: da.id, ten: da.ten }, {
          ma_wbs: the.wbs!,
          ten: String(b.ten_wbs ?? the.tieuDe),
          han,
          giao_cho: ma,
          can_cu: typeof b.can_cu === "string" ? b.can_cu : `từ issue ${the.id}`,
          ...(ten ? { ten_day_du: ten } : {}),
          ...(kqcc ? { ket_qua: kqcc } : {}),
          ...(dinhKem.length ? { dinh_kem: dinhKem } : {}),
        })
      : await giaoViec(qq, nd, {
          ten: ten || `Xử lý issue ${the.id}`,
          du_an: da.ten,
          ket_qua_can_co: kqcc || the.deXuat,
          bat_dau: homNay,
          ket_thuc: han,
          phan_viec: [{ loai, id: ma, ten: pt.ten, ket_thuc: han }],
          la_quyet_dinh: false,
          tu_tai_lieu: null,
          ...(dinhKem.length ? { dinh_kem: dinhKem } : {}),
        });
    return { maViec, tenNhan: pt.ten };
  });
  quenHoiTrung(khoa);
  // Ghi nhận ngay trên trục Xử lý — file, ngoài giao dịch
  ghiNhanXuLy(da.id, the.id, { luc: new Date().toISOString(), nguoi: nd.ten, viecDaLam: `Giao việc ${maViec} cho ${tenNhan}, hạn ${han.split("-").reverse().join("/")}`, chuyenSang: "da-giao-viec" });
  return { ok: true, maViec, tenNhan, han };
}

// ─────────────────────────────────────────────────────────────
// ② Nhắc người giữ việc (thẻ nhắc — Q4)
// ─────────────────────────────────────────────────────────────
export async function nhacNguoiGiuViec(nd: NguoiDungPhien, da: { id: string; ten: string }, theId: string): Promise<{ soViec: number; soNguoi: number; viec: string[] }> {
  if (!quyenIssue(nd).giao) throw new LoiHttp(403, 'Bạn không có quyền "Giao việc" — cần để nhắc người giữ việc');
  const the = docSo(da.id).the.find((t) => t.id === theId);
  if (!the) throw new LoiHttp(404, "Không tìm thấy issue.");
  if (!laTheNhac(the)) throw new LoiHttp(400, "Chỉ issue nhắc (gom theo người) mới có nút Nhắc người giữ việc.");
  const dsViec = viecCuCuaThe(the);
  if (!dsViec.length) throw new LoiHttp(400, "Issue này không ghi mã việc cũ nào — không biết nhắc việc gì.");
  const kq = await tx(async (q) => {
    const daNhac = new Set<string>();
    const coViec: string[] = [];
    for (const cvId of dsViec) {
      const cv = await q.query<{ ten: string }>("SELECT ten FROM docflow.cong_viec WHERE id = $1", [cvId]);
      if (!cv.rows.length) continue;
      coViec.push(cvId);
      const { rows: pt } = await q.query<{ phu_trach_loai: string; phu_trach_id: string }>(
        "SELECT phu_trach_loai, phu_trach_id FROM docflow.phan_viec WHERE cong_viec_id = $1 AND NOT da_bo AND COALESCE(vai,'chu_tri') = 'chu_tri' AND trang_thai = 'dang_lam'",
        [cvId],
      );
      const tb = {
        loai: "nhac_viec",
        noi_dung: `${nd.ten} nhắc việc ${cvId} ${cv.rows[0].ten.slice(0, 90)} — từ issue ${the.id}: ${the.tieuDe.slice(0, 120)}`,
        lien_ket: `/cong-viec/${cvId}`,
      };
      for (const p of pt) {
        // phần của cả đơn vị: đầu đơn vị (khuôn nhắc từ Báo cáo tuần, chốt K2 02/10)
        for (const id of p.phu_trach_loai === "nguoi" ? [p.phu_trach_id] : await dauDonVi(q, p.phu_trach_id)) {
          await taoThongBao(q, { ...tb, nguoi_nhan: id });
          daNhac.add(id);
        }
      }
      await ghiLichSu(q, {
        nguoi: nd.id,
        don_vi_id: nd.don_vi_id,
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: cvId,
        hanh_dong: "nhac_tu_issue",
        chi_tiet: { du_an: da.id, issue: the.id, tieu_de: the.tieuDe },
      });
    }
    return { soViec: coViec.length, soNguoi: daNhac.size, viec: coViec };
  });
  if (kq.soViec > 0) {
    ghiNhanXuLy(da.id, the.id, {
      luc: new Date().toISOString(),
      nguoi: nd.ten,
      viecDaLam: `Nhắc người giữ việc ${kq.viec.join(", ")} (${kq.soNguoi} người nhận chuông)`,
      chuyenSang: "dang-xu-ly",
    });
  }
  return kq;
}

// ─────────────────────────────────────────────────────────────
// ③ Nháp chờ duyệt phía máy chủ — khuôn chung mục 2 (bảng tổng ở Main · màn Việc của tôi)
// ─────────────────────────────────────────────────────────────
type DsNoiNhan = Awaited<ReturnType<typeof dsNoiNhan>>;

/** Mình giao được tới nơi này không — theo danh sách ô Giao cho (đã lọc quyền), y như khối dưới thẻ */
export function giaoDuocToi(ds: DsNoiNhan, loai: string, ma: string): boolean {
  const n = ds.nhom;
  if (!n) return loai === "nguoi" ? ds.nguoi.some((x) => x.id === ma) : ds.don_vi.some((x) => x.id === ma);
  return loai === "nguoi" ? n.ca_nhan.includes(ma) : n.lanh_dao.includes(ma) || n.cay.some((c) => c.id === ma);
}

/** Mã nơi nhận trần (Main gửi id không kèm loại) → "loai|id"; không có trong danh sách → "" */
export function chuanNoiNhan(ds: DsNoiNhan, giaoCho: string): string {
  const g = giaoCho.trim();
  if (/^(nguoi|don_vi)\|/.test(g)) return g;
  if (ds.nguoi.some((x) => x.id === g)) return `nguoi|${g}`;
  if (ds.don_vi.some((x) => x.id === g)) return `don_vi|${g}`;
  return "";
}

export interface DongChoDuyet {
  id: string;
  agent: "base";
  du_an: { id: string; ma: string; ten: string };
  tu_issue: { ma: string; tieu_de: string };
  ten: string;
  ket_qua_can_co: string;
  han: string;
  ngay_phai_lam: string;
  giao_cho_goi_y: { id: string } | null;
  /** 🤖 căn cứ AI chọn người (nút găng) — rỗng = máy */
  can_cu_ai: string | null;
  nguon_soan: "may";
  hoi_trung: null;
  chung: true;
  nguoi_soan: null;
  luc: string;
  muc_do: string;
  /** Việc nằm trên đường găng (nút găng ở Cây việc, hoặc thẻ issue có cờ găng) — ô Lọc "Chỉ việc trên đường găng" ở Main (07/10) */
  tren_duong_gang: boolean;
  /** Nguồn: nút găng chưa giao ở Cây việc & đường găng · hay issue (Mr. Đại chốt 07/10 — tổng phải khớp từng nguồn) */
  nguon_viec: NguonViecCho;
}

/** Mã nháp trên đường dây = "<dự án>|<mã issue>" — mã issue chỉ duy nhất trong một dự án */
export const maNhap = (duAn: string, theId: string) => `${duAn}|${theId}`;
export function tachMaNhap(id: string): { duAn: string; theId: string } | null {
  const i = id.indexOf("|");
  return i > 0 ? { duAn: id.slice(0, i), theId: id.slice(i + 1) } : null;
}

export async function nhapChoDuyet(nd: NguoiDungPhien, q?: Q): Promise<DongChoDuyet[]> {
  if (!quyenIssue(nd).giao) return [];
  const qq = q ?? (await layQ());
  const [dsDuAn, ds] = [await layCauHinh(qq, "du_an"), await dsNoiNhan(qq, nd)];
  const homNay = homNayVN();
  const ra: DongChoDuyet[] = [];
  for (const da of dsDuAn) {
    let so;
    try {
      so = docSo(da.id);
    } catch {
      continue;
    }
    for (const t of so.the) {
      if (!canGiaoViec(t, lyDoChanGhi(t)) || laTheNhac(t)) continue;
      const n = nhapMacDinh(t, { duAnTen: da.ten, homNay, dauViec: so.dauViec });
      const ai = laNutGang(t) ? docChonNguoiAi(da.id, t.wbs!) : null;
      const giaoCho = ai && giaoDuocToi(ds, ai.loai, ai.giao_cho) ? ai.giao_cho : null;
      ra.push({
        id: maNhap(da.id, t.id),
        agent: "base",
        du_an: { id: da.id, ma: da.id, ten: da.ten },
        tu_issue: { ma: t.id, tieu_de: t.tieuDe },
        ten: n.ten,
        ket_qua_can_co: n.kq,
        han: n.han,
        ngay_phai_lam: n.han,
        giao_cho_goi_y: giaoCho ? { id: giaoCho } : null,
        can_cu_ai: giaoCho ? ai!.can_cu : null,
        nguon_soan: "may",
        hoi_trung: null,
        chung: true,
        nguoi_soan: null,
        luc: t.ngayMo ? `${t.ngayMo}T00:00:00.000Z` : new Date().toISOString(),
        muc_do: t.mucDo,
        tren_duong_gang: nguonViecCua(t) === "cay-viec" || !!t.trenDuongGang,
        nguon_viec: nguonViecCua(t),
      });
    }
  }
  return ra;
}

/** Tên đầu việc của nút găng (để giao đúng "mã kèm tên" — luật 30) */
export function tenWbsCuaThe(duAn: string, theId: string): string | undefined {
  const so = docSo(duAn);
  const t = so.the.find((x) => x.id === theId);
  return t ? tenWbsCua(t, so.dauViec) : undefined;
}

/**
 * BỎ QUA một issue (Mr. Đại chốt 06/10: chữ "Bỏ qua" thay "Xóa"; "Hiện lại bỏ qua" thay "Xem đã xóa"). Thẻ GĂNG thì ghi luôn sổ
 * "không cần giao" theo mã WBS của Cây việc — MỘT sổ cho hai màn (trước 06/10 Issue ghi cờ trên thẻ, Cây việc ghi tệp riêng → lệch).
 * Dùng chung: nút Bỏ qua dưới thẻ (màn Issue + Cây việc) và cửa base.bo_qua_viec_cho_duyet của Main.
 */
export function boQuaIssue(duAn: string, theId: string, bo: boolean, nd: Pick<NguoiDungPhien, "id" | "ten">): KetQua {
  const kq = khongCanGiaoIssue(duAn, theId, !bo, nd.ten);
  if (!kq.ok) return kq;
  const t = docSo(duAn).the.find((x) => x.id === theId);
  if (t && laNutGang(t)) {
    if (bo) boDanhDauKhongCanGiao(duAn, t.wbs!);
    else danhDauKhongCanGiao(duAn, t.wbs!, nd.id, `Bỏ qua ở khối giao việc dưới issue ${t.id}`);
  }
  return kq;
}

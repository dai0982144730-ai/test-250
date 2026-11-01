// ============================================================
// bao-cao-tuan/viet.ts — 🤖 AI VIẾT BÁO CÁO TUẦN (Mr. Đại duyệt demo 30/09/2026).
// Code đọc sổ cái + báo cáo đã nộp → tinh.ts tính MỌI con số → AI chỉ viết lời từ bảng số (vai ② của LLM, cấm bịa số)
// → lưới kiểm của code (link sai thì bỏ link, số lạ / tên người thì ghi cảnh báo và gỡ tên) → lưu một bản mỗi tuần.
// Văn phong (Mr. Đại chốt 30/09): KHÔNG khen, KHÔNG chê — báo cáo mở cho mọi người đọc; giọng khách quan, công tâm, đồng cảm,
// như một người lãnh đạo cấp cao điềm tĩnh, từ bi nhìn lại một tuần làm việc. Nhận xét tổ chức, bộ máy — không nhận xét cá nhân.
// Viết khi cấp 1 (Ban TGĐ) nộp báo cáo tuần; tới giờ viết muộn nhất thứ Hai tuần sau mà chưa nộp thì vẫn viết, ghi "cấp 1 chưa nộp".
// CHỈ SERVER.
// ============================================================
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { bayGioVN, congNgay, tuanCua } from "@/lib/phong/tuan";
import { duLieuSoDo, kyTinhChoTuan } from "@/lib/phong/so-do";
import { docDoKho } from "./do-kho";
import { duAnCuaViec } from "@/lib/phong/du-an-thuan";
import { tinhBaoCaoTuan, tenVung, BLD, type DauVaoTinh, type KetQuaTinh, type ViecTinh } from "./tinh";

/** "2026-10-05T12:00" → "12:00 05/10/2026" (chữ đưa cho AI — tránh AI chép ngày kiểu máy) */
function ngayGio(s: string): string {
  if (!s) return "chưa đặt";
  const d = `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  return s.length > 10 ? `${s.slice(11, 16)} ${d}` : d;
}

export interface LoiAi {
  /** 5–7 câu nhận định; link dạng [[CV-…|chữ]] · [[dv:<đơn vị>[:qua_han|trong_han|xong|moi]|chữ]] · [[ds:<xong|moi|qua_han|trong_han>|chữ]] */
  nhan_dinh: string[];
  /** một câu cho mỗi đơn vị đánh giá (khóa = mã đơn vị, "bld" = tập thể Ban lãnh đạo) */
  nhan_xet: Record<string, string>;
  can_quyet: { ma: string[]; ly_do: string }[];
  diem_nong: Record<string, string>;
}
export interface BanBaoCaoTuan {
  id: string;
  tuan_so: number;
  tuan_tu: string;
  tuan_den: string;
  trang_thai: "dang_viet" | "xong" | "loi";
  ly_do_viet: string | null;
  cap1_da_nop: boolean;
  model: string | null;
  so_lieu: KetQuaTinh | null;
  ai: LoiAi | null;
  canh_bao: string[];
  loi: string | null;
  bat_dau_luc: string;
  xong_luc: string | null;
  thoi_gian_ms: number | null;
}

// ---------------- Đọc đầu vào từ CSDL ----------------

const ngayVn = (luc: string | Date | null) => (luc ? bayGioVN(new Date(luc)).slice(0, 10) : null);

export async function docDauVao(q: Q, ngayTrongTuan: string, homNay: string): Promise<{ dauVao: DauVaoTinh; cap1DaNop: boolean }> {
  const tuan = tuanCua(ngayTrongTuan);
  const ch = await layCauHinh(q, "bao_cao_tuan");
  const luu = await layCauHinh(q, "dinh_kem");
  const sd = await duLieuSoDo(q, ngayTrongTuan);
  const doKho = await docDoKho(q);
  const { rows: cv } = await q.query<{ id: string; ten: string; du_an: string | null; trang_thai: "dang_mo" | "hoan_thanh"; ket_thuc: string | null; bat_dau: string | null; luon_mo: boolean; tao_luc: Date; dong_luc: Date | null; nguon: string | null; cot_khac: Record<string, string> | null }>(
    `SELECT c.id, c.ten, c.du_an, c.trang_thai, c.ket_thuc::text AS ket_thuc, c.bat_dau::text AS bat_dau, c.luon_mo, c.tao_luc, c.dong_luc,
            (SELECT g.nhan FROM docflow.nguon_cong_viec g WHERE g.cong_viec_id = c.id AND g.trang_thai = 'hien_hanh' LIMIT 1) AS nguon,
            (SELECT g.du_lieu->'cot_khac' FROM docflow.nguon_cong_viec g WHERE g.cong_viec_id = c.id AND g.trang_thai = 'hien_hanh' LIMIT 1) AS cot_khac
       FROM docflow.cong_viec c
      WHERE c.trang_thai = 'dang_mo' OR (c.trang_thai = 'hoan_thanh' AND c.dong_luc > now() - make_interval(months => $1))
      ORDER BY c.id`,
    [luu.luu_thang ?? 6],
  );
  const { rows: pv } = await q.query<{ cong_viec_id: string; phu_trach_loai: "nguoi" | "don_vi"; phu_trach_id: string; vai: string | null; trang_thai: string; ket_thuc: string | null }>(
    `SELECT cong_viec_id, phu_trach_loai, phu_trach_id, vai, trang_thai, ket_thuc::text AS ket_thuc FROM docflow.phan_viec WHERE NOT da_bo ORDER BY thu_tu`,
  );
  const ptCua = new Map<string, ViecTinh["pt"]>();
  for (const p of pv) {
    const a = ptCua.get(p.cong_viec_id) ?? [];
    a.push({ loai: p.phu_trach_loai, id: p.phu_trach_id, vai: p.vai === "phoi_hop" ? "phoi_hop" : "chu_tri", xong: p.trang_thai !== "dang_lam", ket_thuc: p.ket_thuc });
    ptCua.set(p.cong_viec_id, a);
  }
  // Việc → dự án: dùng đúng hàm của menu Dự án (tên / tên gọi khác / Ban điều hành) để hai nơi cùng một đáp số
  const dsDuAn = sd.du_an;
  const duAnCua = (c: { id: string; du_an: string | null; ten?: string }) => {
    const id = duAnCuaViec(c.du_an, (ptCua.get(c.id) ?? []).map((p) => p.id), dsDuAn, c.ten);
    return id ? (dsDuAn.find((a) => a.id === id) ?? null) : null;
  };
  const viec: ViecTinh[] = cv.map((c) => ({
    ma: c.id,
    ten: c.ten,
    du_an: duAnCua(c)?.ten ?? c.du_an,
    du_an_sci: duAnCua(c)?.nhom === "sci" ? duAnCua(c)!.ten : null,
    tien_do: c.cot_khac?.tien_do ?? null,
    ghi_chu: c.cot_khac?.ghi_chu ?? null,
    trang_thai: c.trang_thai,
    ket_thuc: c.ket_thuc,
    bat_dau: c.bat_dau,
    luon_mo: !!c.luon_mo,
    tao_ngay: ngayVn(c.tao_luc),
    xong_ngay: c.trang_thai === "hoan_thanh" ? ngayVn(c.dong_luc) : null,
    nguon: c.nguon,
    pt: ptCua.get(c.id) ?? [],
    diem: doKho[c.id]?.diem ?? null,
  }));
  const { rows: dv } = await q.query<{ id: string; ten: string; ten_ngan: string; loai: string; cap: number }>(
    "SELECT id, ten, ten_ngan, loai, cap FROM identity.don_vi WHERE active ORDER BY thu_tu, ten",
  );
  // Nộp báo cáo: lần gửi ĐẦU và số lần gửi của từng đơn vị trong tuần (chức danh lãnh đạo → ô Ban lãnh đạo, như Sơ đồ)
  const goc = sd.o.find((x) => x.cha === null)?.id ?? null;
  const laChucDanh = new Set(dv.filter((d) => d.loai === "chuc_danh").map((d) => d.id));
  const { rows: bc } = await q.query<{ id: string; don_vi_lap: string; ky_bao_cao: Parameters<typeof kyTinhChoTuan>[0]; luc: Date; phien_ban: number }>(
    `SELECT t.id, t.don_vi_lap, t.ky_bao_cao, t.phien_ban_hien_tai AS phien_ban,
            COALESCE((SELECT min(l.luc) FROM docflow.lich_su l WHERE l.doi_tuong_id = t.id AND l.hanh_dong IN ('gui','gui_moi')), t.tao_luc) AS luc
       FROM docflow.tai_lieu t
      WHERE t.don_vi_lap IS NOT NULL AND t.ky_bao_cao IS NOT NULL AND t.trang_thai IN ('da_gui','hoan_thanh')`,
  );
  const nopMap = new Map<string, DauVaoTinh["nop"][number]>();
  for (const r of bc) {
    if (!kyTinhChoTuan(r.ky_bao_cao, tuan)) continue;
    const dvId = laChucDanh.has(r.don_vi_lap) && goc ? goc : r.don_vi_lap;
    const luc = bayGioVN(new Date(r.luc));
    const cu = nopMap.get(dvId);
    if (!cu) nopMap.set(dvId, { don_vi_id: dvId, luc, so_lan: Number(r.phien_ban) || 1, tai_lieu_id: r.id });
    else {
      cu.so_lan += Number(r.phien_ban) || 1;
      if (luc < cu.luc) (cu.luc = luc), (cu.tai_lieu_id = r.id);
    }
  }
  const dauVao: DauVaoTinh = {
    tuan: { so: tuan.so, tu: tuan.tu, den: tuan.den },
    hom_nay: homNay,
    viec,
    don_vi: dv.map((d) => ({ ...d, cap: Number(d.cap) })),
    nguoi: sd.nguoi.map((n) => ({ id: n.id, don_vi_id: n.don_vi_id, don_vi_ids: n.don_vi_ids ?? [] })),
    nop: [...nopMap.values()],
    han_nop: sd.han_nop,
    ch: { don_vi_danh_gia: ch.don_vi_danh_gia, nguong_qua_tai: ch.nguong_qua_tai, nguong_can_bang: ch.nguong_can_bang, nguong_tre: ch.nguong_tre, tre_muc_1: ch.tre_muc_1, tre_muc_2: ch.tre_muc_2 },
  };
  return { dauVao, cap1DaNop: !!(goc && nopMap.has(goc)) };
}

// ---------------- Lời dặn AI ----------------

export const HE_THONG_BAO_CAO = `Bạn viết phần nhận định cho BÁO CÁO TUẦN của một công ty đầu tư, thiết kế, thi công và vận hành dự án điện gió, thủy điện, điện mặt trời.
Báo cáo MỞ cho mọi người trong công ty cùng đọc.

VĂN PHONG (bắt buộc):
- Giọng của một người lãnh đạo cấp cao điềm tĩnh, công tâm, từ bi: nhìn sự việc như nó đang là, thấu hiểu khó khăn của từng bộ phận.
- KHÔNG khen, KHÔNG chê, KHÔNG so sánh hơn thua giữa các đơn vị, không dùng từ "yếu", "kém", "chậm chạp", "xuất sắc", "đáng khen"…
  Thay vào đó mô tả khách quan: điều gì đang diễn ra, vì sao (theo số liệu), sức nặng đang dồn ở đâu, điều gì cần được tháo gỡ.
- Nói về TỔ CHỨC, BỘ MÁY, CÁCH PHÂN BỔ VIỆC — tuyệt đối không nêu tên hay nhận xét một cá nhân nào.
- Đồng cảm: khi một đơn vị gánh nhiều việc khó hay vướng cơ quan bên ngoài, ghi nhận sức nặng đó; khi sổ chưa cập nhật, nhắc nhẹ như một lời gợi ý.
- Câu ngắn, rõ, tiếng Việt tự nhiên. Không sáo rỗng.

SỐ LIỆU (bắt buộc): mọi con số phải lấy đúng từ dữ liệu được cho. Không tự tính thêm số mới, không ước lượng. Số thập phân dùng dấu phẩy (32,2). Ngày viết dạng 02/10/2026.
KHÔNG nêu điểm độ khó hay điểm nợ của TỪNG việc (chỉ Ban lãnh đạo được xem); điểm tổng của đơn vị thì được nêu.
KHÔNG viết mã việc (CV-…) hay mã đơn vị trong chữ — mã là thứ máy đọc, người đọc báo cáo không cần. Nêu việc bằng TÊN NGẮN (tối đa khoảng 10 chữ) và bọc liên kết [[CV-…|tên ngắn]]. Khoảng ngày luôn kèm số ngày.

CÁCH NÓI SỐ (bắt buộc — người đọc không phải chuyên viên phân tích):
- Mỗi con số phải đi kèm lời nói rõ nó đo cái gì. CẤM số trơn trong ngoặc như "(3,7)", cấm viết tắt kiểu "tải/người 7,3".
- "Điểm việc" = độ khó cộng dồn: việc rất dễ 1 điểm, dễ 2, vừa 4, khó 8, rất khó 13.
- Báo cáo đo mỗi đơn vị bằng BA con số, gọi đúng tên:
  · Điểm công việc → "mỗi người đang gánh bình quân 32,2 điểm việc" (tổng điểm việc đang làm ÷ số người)
  · % trễ → "29% khối lượng đang làm đã quá hạn" (điểm việc quá hạn ÷ điểm việc đang làm)
  · Làm ra → "tuần này mỗi người khép lại bình quân 3,3 điểm việc" (điểm việc xong trong tuần ÷ số người)
- Vùng ghép từ Điểm công việc và % trễ, dùng đúng tên vùng trong dữ liệu (vd "Quá tải, trễ nhiều"); khi nói vùng thì kèm ngưỡng: "vượt ngưỡng quá tải 20 điểm/người", "trên ngưỡng trễ 25%".
- Không dùng "điểm nợ", "hệ số trễ", "tải" — người đọc không cần.

LIÊN KẾT (để người đọc bấm xem việc ở cột phải) — bọc cụm chữ bằng:
- [[CV-2026-0023|chữ hiện ra]] — một việc
- [[dv:<mã đơn vị>|chữ]] — mọi việc của đơn vị; thêm :qua_han / :trong_han / :xong / :moi để lọc, vd [[dv:p-dtpc:qua_han|5 việc quá hạn]]
- [[ds:xong|chữ]] · [[ds:moi|chữ]] · [[ds:qua_han|chữ]] · [[ds:trong_han|chữ]] — danh sách toàn công ty
Chỉ dùng mã đơn vị / mã việc có trong dữ liệu.

Trả lời DUY NHẤT một đối tượng JSON:
{"nhan_dinh":["8 đến 12 gạch đầu dòng, mỗi gạch MỘT ý, tối đa khoảng 40 chữ; đi vào nơi sức nặng dồn tụ và điều cần tháo gỡ. KHÔNG viết câu tổng số xong/mới/đang mở/quá hạn toàn công ty — máy đã tự ghép câu đó ở dòng đầu"],
 "nhan_xet":{"<mã đơn vị được đánh giá>":"một câu, tối đa 35 chữ, khách quan, đồng cảm, số nào cũng nói rõ đo cái gì", "bld":"một câu cho tập thể Ban lãnh đạo"},
 "diem_nong":{"<mã việc điểm nóng>":"một câu: vướng ở đâu, ảnh hưởng tới đâu"}}
"diem_nong": viết cho ĐỦ mọi việc trong danh sách ĐIỂM NÓNG.
Trong "diem_nong": tên việc đã hiện sẵn ở dòng trên — KHÔNG nhắc lại tên việc đó, KHÔNG bọc liên kết tới chính việc đó; vào thẳng: vướng ở đâu, ảnh hưởng tới đâu.`;
// "can_quyet" thôi nhờ AI (Mr. Đại chốt 02/10): tab Cần ra quyết định do CODE đọc dòng kiến nghị + Form 0 (bao-cao-tuan/can-quyet.ts)

function tomTatChoAi(kq: KetQuaTinh, tenDv: Record<string, string>): string {
  const vv = (ma: string) => {
    const v = kq.viec[ma];
    return v ? `${ma} | ${v.ten} | chủ trì: ${v.don.map((d) => tenDv[d] ?? d).join(" + ") || "—"}${v.phoi_hop.length ? ` | phối hợp: ${v.phoi_hop.map((d) => tenDv[d] ?? d).join(", ")}` : ""} | hạn ${v.han ? ngayGio(v.han) : "không"}${v.tre ? ` | quá hạn ${v.tre} ngày` : ""}${v.xong_ngay ? ` | xong ${ngayGio(v.xong_ngay)}` : ""} ${v.tien_do ? ` | % hoàn thành ${v.tien_do}` : ""}${v.ghi_chu ? ` | ghi chú của đơn vị: ${v.ghi_chu}` : ""} | độ khó ${v.diem} (chỉ để cân nhắc, không viết ra) | dự án ${v.du_an ?? "—"}` : ma;
  };
  const dong = kq.don_vi.map(
    (r) =>
      `${r.ma} (${r.ten}): ${r.nhan_su} người · đang làm ${r.so_mo} việc = ${r.tai} điểm việc · Điểm công việc ${r.tai_nguoi ?? "—"} · quá hạn ${r.so_qua_han} việc = ${r.diem_tre} điểm việc → % trễ ${r.pt_tre ?? "—"}% · xong tuần ${r.so_xong} việc = ${r.san_luong} điểm việc → Làm ra ${r.lam_ra_nguoi ?? "—"} điểm/người · mới ${r.moi} việc · đang phối hợp ${r.phoi_hop} việc · vùng: ${tenVung(r)}`,
  );
  const nop = kq.nop.map((c) => {
    const chua = c.don_vi.filter((d) => !d.nop && d.co_tai_khoan);
    const khongTk = c.don_vi.filter((d) => !d.nop && !d.co_tai_khoan);
    return `Cấp ${c.cap} (hạn ${ngayGio(c.han)}): ${c.don_vi.filter((d) => d.nop).length}/${c.don_vi.length} đã nộp` +
      (chua.length ? ` · chưa nộp: ${chua.map((d) => d.ten).join(", ")}` : "") +
      (khongTk.length ? ` · ${khongTk.length} đơn vị chưa có tài khoản trên hệ thống nên chưa thể nộp (không phải thiếu sót của đơn vị — không nhắc họ nộp)` : "");
  });
  const soCai = Object.keys(kq.viec).filter((m) => !kq.viec[m].xong_ngay || kq.ds_the.xong.includes(m)).map(vv);
  return [
    `TUẦN ${kq.tuan.so}: ${ngayGio(kq.tuan.tu)} → ${ngayGio(kq.tuan.den)} (số chốt tới ${ngayGio(kq.hom_nay)})`,
    `TOÀN CÔNG TY: xong ${kq.the.xong} việc · mới ${kq.the.moi} · đang mở ${kq.the.dang_mo}, trong đó quá hạn ${kq.the.qua_han} · đã nộp báo cáo ${kq.the.nop}/${kq.the.tong_don_vi} đơn vị`,
    `Bình quân Điểm công việc các đơn vị đánh giá, trừ đơn vị cao nhất: ${kq.binh_quan_tai_nguoi_con_lai ?? "—"}`,
    `Thang độ khó 1 · 2 · 4 · 8 · 13 điểm. Ngưỡng Điểm công việc: quá tải trên ${kq.nguong.qua_tai} điểm/người · cân bằng ${kq.nguong.can_bang}–${kq.nguong.qua_tai} · dư sức dưới ${kq.nguong.can_bang}. Ngưỡng trễ: từ ${kq.nguong.tre}% là trễ nhiều, dưới là giữ nhịp`,
    `\nĐƠN VỊ ĐƯỢC ĐÁNH GIÁ (vùng: qua_tai / can_bang / du_suc / chua_du = chưa đủ dữ liệu / tap_the):\n${dong.join("\n")}`,
    `\nĐIỂM NÓNG (nợ quá hạn lớn nhất):\n${kq.nong.map((n) => `${vv(n.ma)} | nợ ${n.no} điểm (không viết ra)`).join("\n")}`,
    `\nNỘP BÁO CÁO:\n${nop.join("\n")}`,
    `\nDỰ ÁN (đang mở / quá hạn): ${kq.du_an.map((d) => `${d.ten} ${d.mo.length}/${d.qua_han.length}`).join(" · ")}`,
    `\nSỔ CÁI (việc đang mở + việc xong trong tuần):\n${soCai.join("\n")}`,
  ].join("\n");
}

// ---------------- Lưới kiểm của code ----------------

const LINK = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
const DS_HOP_LE = new Set(["xong", "moi", "qua_han", "trong_han", "dang_mo"]);

/** Bỏ link trỏ tới thứ không có (giữ chữ); gỡ tên người; gom cảnh báo số lạ. Trả lời đã sạch + danh sách cảnh báo. */
export function kiemLoiAi(tho: unknown, kq: KetQuaTinh, tenNguoi: string[], duLieuChu: string): { ai: LoiAi; canh_bao: string[] } {
  const canhBao: string[] = [];
  const o = (tho ?? {}) as Partial<LoiAi>;
  const dvCo = new Set(kq.don_vi.map((r) => r.ma));
  const soCo = new Set((duLieuChu.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(",", "."))));
  const tenDai = tenNguoi.filter((t) => t && t.trim().split(/\s+/).length >= 2);
  const lam = (s: unknown, noi: string, tru: string[] = []): string => {
    let t = String(s ?? "").trim();
    // Mục cần quyết / điểm nóng: tên việc đã ở dòng trên → link tới chính việc đó thành chữ thường (Mr. Đại 01/10)
    if (tru.length) t = t.replace(LINK, (m, dich: string, chu: string) => (tru.includes(dich) ? chu : m));
    t = t.replace(LINK, (m, dich: string, chu: string) => {
      const [loai, a, b] = dich.split(":");
      const ok = /^CV-/.test(dich) ? !!kq.viec[dich] : loai === "dv" ? dvCo.has(a) && (!b || DS_HOP_LE.has(b)) : loai === "ds" ? DS_HOP_LE.has(a) : false;
      if (!ok) canhBao.push(`${noi}: bỏ liên kết không hợp lệ "${dich}"`);
      return ok ? m : chu;
    });
    // Mã việc không hiện cho người đọc (Mr. Đại 30/09: "Mã là thứ máy hiểu") — giữ trong đích liên kết, gỡ khỏi chữ
    t = t
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]|CV-\d{4}-\d{4}\s*[:–-]?\s*/g, (m, dich?: string, chu?: string) =>
        dich ? `[[${dich}|${(chu ?? "").replace(/CV-\d{4}-\d{4}\s*[:–-]?\s*/g, "").trim() || (kq.viec[dich]?.ten ?? chu)}]]` : "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s{2,}/g, " ");
    // Số thập phân kiểu Việt: 32.2 → 32,2 (mã CV-2026-0023 và ngày 28/09 không có dấu chấm giữa hai chữ số)
    t = t.replace(/(\d)\.(\d)/g, "$1,$2");
    // Ngày kiểu máy 2026-10-02 → 02/10/2026
    t = t.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3/$2/$1");
    for (const ten of tenDai)
      if (t.includes(ten)) {
        canhBao.push(`${noi}: AI nêu tên người "${ten}" — đã gỡ`);
        t = t.split(ten).join("một cá nhân");
      }
    const chuTrong = t.replace(LINK, "$2").replace(/CV-\d{4}-\d{4}/g, "").replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, "");
    for (const so of chuTrong.match(/\d+(?:[.,]\d+)?/g) ?? []) if (!soCo.has(Number(so.replace(",", ".")))) canhBao.push(`${noi}: số "${so}" không có trong dữ liệu`);
    return t;
  };
  const nhanDinh = (Array.isArray(o.nhan_dinh) ? o.nhan_dinh : []).slice(0, 14).map((x, i) => lam(x, `Nhận định ${i + 1}`)).filter(Boolean);
  const nhanXet: Record<string, string> = {};
  for (const [k, x] of Object.entries(o.nhan_xet ?? {})) if (dvCo.has(k)) nhanXet[k] = lam(x, `Nhận xét ${k}`);
  const canQuyet = (Array.isArray(o.can_quyet) ? o.can_quyet : [])
    .map((c) => ({ ma: (Array.isArray(c?.ma) ? c.ma : [c?.ma]).map(String).filter((m) => !!kq.viec[m]), ly_do: lam(c?.ly_do, "Cần quyết", (Array.isArray(c?.ma) ? c.ma : [c?.ma]).map(String)) }))
    .filter((c) => c.ma.length)
    .slice(0, 6);
  const diemNong: Record<string, string> = {};
  for (const n of kq.nong) diemNong[n.ma] = lam(o.diem_nong?.[n.ma] ?? "", `Điểm nóng ${n.ma}`, [n.ma]);
  if (!nhanDinh.length) canhBao.push("AI không trả phần nhận định");
  return { ai: { nhan_dinh: nhanDinh, nhan_xet: nhanXet, can_quyet: canQuyet, diem_nong: diemNong }, canh_bao: [...new Set(canhBao)] };
}

// ---------------- Viết + lưu ----------------

export async function vietBaoCaoTuan(
  q: Q,
  ngayTrongTuan: string,
  lyDo: "cap1_nop" | "den_gio" | "viet_lai",
  goiAi: (prompt: string, system: string, model?: string) => Promise<string>,
  model?: string,
): Promise<BanBaoCaoTuan> {
  const tuan = tuanCua(ngayTrongTuan);
  const t0 = Date.now();
  const homNay = bayGioVN().slice(0, 10);
  const chot = homNay > tuan.den ? tuan.den : homNay;
  await q.query(
    `INSERT INTO docflow.bao_cao_tuan (id, tuan_so, tuan_tu, tuan_den, trang_thai, ly_do_viet, model) VALUES ($1,$2,$3,$4,'dang_viet',$5,$6)
     ON CONFLICT (id) DO UPDATE SET trang_thai = 'dang_viet', ly_do_viet = EXCLUDED.ly_do_viet, model = EXCLUDED.model, loi = NULL, bat_dau_luc = now(), xong_luc = NULL`,
    [tuan.tu, tuan.so, tuan.tu, tuan.den, lyDo, model ?? null],
  );
  try {
    const { dauVao, cap1DaNop } = await docDauVao(q, ngayTrongTuan, chot);
    const kq = tinhBaoCaoTuan(dauVao);
    const tenDv: Record<string, string> = Object.fromEntries(dauVao.don_vi.map((d) => [d.id, d.ten_ngan || d.ten]));
    tenDv[BLD] = "Ban lãnh đạo";
    const duLieu = tomTatChoAi(kq, tenDv);
    const text = await goiAi(`${cap1DaNop ? "" : "LƯU Ý: cấp 1 (Ban TGĐ) chưa nộp báo cáo tuần này.\n"}${duLieu}`, HE_THONG_BAO_CAO, model);
    const { layJson } = await import("@/lib/kiem-tra/gop-y-ai");
    const { rows: ng } = await q.query<{ ten: string }>("SELECT ten FROM identity.nguoi_dung WHERE active");
    const { ai, canh_bao } = kiemLoiAi(layJson(text), kq, ng.map((r) => r.ten), duLieu);
    await q.query(
      `UPDATE docflow.bao_cao_tuan SET trang_thai = 'xong', cap1_da_nop = $2, so_lieu = $3::jsonb, ai = $4::jsonb, canh_bao = $5::jsonb, xong_luc = now(), thoi_gian_ms = $6 WHERE id = $1`,
      [tuan.tu, cap1DaNop, JSON.stringify(kq), JSON.stringify(ai), JSON.stringify(canh_bao), Date.now() - t0],
    );
  } catch (e) {
    await q.query(`UPDATE docflow.bao_cao_tuan SET trang_thai = 'loi', loi = $2, xong_luc = now(), thoi_gian_ms = $3 WHERE id = $1`, [
      tuan.tu,
      (e instanceof Error ? e.message : String(e)).slice(0, 500),
      Date.now() - t0,
    ]);
    throw e;
  }
  return (await docBan(q, tuan.tu))!;
}

export async function docBan(q: Q, id: string): Promise<BanBaoCaoTuan | null> {
  const { rows } = await q.query<BanBaoCaoTuan>(
    `SELECT id, tuan_so, tuan_tu::text AS tuan_tu, tuan_den::text AS tuan_den, trang_thai, ly_do_viet, cap1_da_nop, model, so_lieu, ai, canh_bao, loi,
            bat_dau_luc::text AS bat_dau_luc, xong_luc::text AS xong_luc, thoi_gian_ms
       FROM docflow.bao_cao_tuan WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Tuần nào đã có bản (mới nhất trước) — cho ô chọn tuần. */
export async function cacBan(q: Q): Promise<{ id: string; tuan_so: number; trang_thai: string }[]> {
  const { rows } = await q.query<{ id: string; tuan_so: number; trang_thai: string }>(
    "SELECT id, tuan_so, trang_thai FROM docflow.bao_cao_tuan ORDER BY id DESC LIMIT 60",
  );
  return rows;
}

// ---------------- Hẹn giờ ----------------

/**
 * Gọi mỗi phút từ bộ hẹn giờ. Xét tuần trước và tuần này:
 *  · chưa có bản (hoặc bản lỗi quá 30 phút) + cấp 1 đã nộp → viết (cap1_nop)
 *  · tuần trước chưa có bản + đã qua giờ viết muộn nhất thứ Hai tuần này → viết dù cấp 1 chưa nộp (den_gio)
 */
export async function vietTheoLich(q: Q, goiAi: (prompt: string, system: string, model?: string) => Promise<string>): Promise<string | null> {
  const ch = await layCauHinh(q, "bao_cao_tuan");
  if (!ch.bat) return null;
  const bayGio = bayGioVN();
  const nay = tuanCua(bayGio.slice(0, 10));
  const truoc = tuanCua(congNgay(nay.tu, -7));
  for (const t of [truoc, nay]) {
    const ban = await docBan(q, t.tu);
    if (ban && (ban.trang_thai === "xong" || ban.trang_thai === "dang_viet")) continue;
    if (ban?.trang_thai === "loi" && Date.now() - Date.parse(ban.bat_dau_luc) < 30 * 60_000) continue;
    const { cap1DaNop } = await docDauVao(q, t.tu, bayGio.slice(0, 10));
    const denGio = t === truoc && bayGio >= `${nay.tu}T${ch.gio_viet_muon}`;
    if (!cap1DaNop && !denGio) continue;
    await vietBaoCaoTuan(q, t.tu, cap1DaNop ? "cap1_nop" : "den_gio", goiAi, ch.model || undefined);
    return t.tu;
  }
  return null;
}

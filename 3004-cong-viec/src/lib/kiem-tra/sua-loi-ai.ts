// ============================================================
// kiem-tra/sua-loi-ai.ts — BƯỚC "SỬA LỖI" KHI NỘP BÁO CÁO (Mr. Đại chốt 28/09/2026, Đợt A). CHỈ SERVER.
// Code kiểm xong mà còn lỗi chặn / cảnh báo → 🤖 đọc từng lỗi: giải thích VÌ SAO (lời thường) + đề xuất "Cũ → Mới".
// Phân vai (chốt 06/09): CODE lấy chữ CŨ thẳng từ file và quyết ô nào được sửa; LLM chỉ viết giải thích + chữ MỚI;
// NGƯỜI bấm "Sửa vào file" mới ghi (sua-vao-file.ts). LLM không bịa ngày: hạn để chỗ {HAN}, người nộp chọn ngày.
// Một lượt AI cho cả danh sách lỗi; cùng file + cùng lỗi thì dùng lại kết quả (không gọi lại tốn phí).
// AI tắt / lỗi → vẫn trả danh sách lỗi, người nộp tự gõ chữ mới.
// ============================================================
import { anhXaBang } from "./cau-truc";
import crypto from "node:crypto";
import type { LoiKiemTra, MauWord } from "@/lib/types";
import { getAIConfig, runAIGan } from "@/lib/ai/providers";
import type { NoiDungWord } from "./doc-word";
import type { DanhBa } from "./phan-giai";
import { coHan, layJson } from "./gop-y-ai";
import { nhanViTri } from "./danh-dau-loi";

export const CHO_HAN = "{HAN}";
// Đo 28/09: một mình 23–38 giây; chạy cùng lúc góp ý + luật AI trên máy chủ thì quá 60 giây → chờ tới 150 giây
const THOI_GIAN_CHO_MS = 150_000;

/** Một ô được phép sửa cho một lỗi — chữ CŨ do code đọc từ file. */
export interface OChoSua {
  vi_tri: { tag?: string; bang?: string; dong?: number; cot?: string };
  nhan: string;
  cu: string;
  /** nghĩa cột theo cau_truc của mẫu (ket_thuc, bat_dau…) — bảng chưa khai thì = tag (Đợt A, 01/10/2026) */
  nghia?: string;
}

export interface MucSuaLoi {
  i: number;
  muc: "chan" | "canh_bao";
  luat: string;
  thong_diep: string;
  noi: string; // "Bảng “…”, dòng 2, cột “…”"
  cho_sua: OChoSua[]; // rỗng = lỗi không sửa bằng một ô (thiếu mục, việc trùng…)
  can_han: boolean; // lỗi "chưa có hạn" → chữ mới phải có ngày (người nộp chọn)
  giai_thich?: string; // 🤖
  de_xuat?: { o: number; moi: string } | null; // 🤖 — o = chỉ số trong cho_sua
  khong_sua_file?: string; // 🤖 hoặc code: lỗi này không sửa trong file (vd chọn ở bước duyệt việc)
  /** Chữ đang ghi của CẢ dòng lỗi (Mr. Đại chốt 29/09: người nộp đọc được bằng mắt rồi mới ghi đề xuất) */
  dong_chu?: { nhan: string; gt: string }[];
  /** Chữ để tìm chỗ lỗi trong bản xem báo cáo gốc (khoanh cam): tên việc của dòng, hoặc giá trị ô */
  tim?: string;
}

export interface KetQuaSuaLoi {
  trang_thai: "xong" | "khong_ai" | "loi_ai";
  ly_do?: string;
  muc: MucSuaLoi[];
}

type DinhNghia = { bang?: { tag: string; nhan?: string; cot?: { tag: string; nhan: string }[] }[]; o_nhap?: { tag: string; nhan: string }[] };

/** Các ô được phép sửa cho một lỗi: đúng ô lỗi; lỗi chỉ ra dòng (cột máy tự thêm như hạn, phụ trách) → mọi ô chữ của dòng. */
export function choSuaCuaLoi(l: LoiKiemTra, nd: NoiDungWord, mau?: MauWord | null): OChoSua[] {
  const v = l.vi_tri;
  const dn = mau?.dinh_nghia as DinhNghia | undefined;
  if (v?.bang && v.dong) {
    const dong = nd.bang[v.bang]?.[v.dong - 1];
    if (!dong) return [];
    const cot = dn?.bang?.find((b) => b.tag === v.bang)?.cot ?? [];
    const ax = anhXaBang(mau?.dinh_nghia, v.bang);
    const cotKhai = mau?.dinh_nghia.cau_truc?.chuong.flatMap((c) => c.bang).find((b) => b.tag === v.bang)?.cot ?? [];
    const nhan = (c: string) => cotKhai.find((x) => x.tag === c)?.tieu_de ?? cot.find((x) => x.tag === c)?.nhan ?? c;
    // Bỏ cột số thứ tự ("#", "STT", ô chỉ có số) — không ai sửa lỗi bằng cột đó
    const ds = (v.cot && v.cot in dong ? [v.cot] : Object.keys(dong)).filter((c) => !/^(#|stt|tt)$/i.test(nhan(c).trim()) && !/^\s*\d{1,3}\s*$/.test(dong[c] ?? ""));
    return ds.map((c) => ({ vi_tri: { bang: v.bang, dong: v.dong, cot: c }, nhan: nhan(c), cu: dong[c] ?? "", nghia: ax?.nghiaCuaTag.get(c) ?? c }));
  }
  if (v?.tag && !v.tag.startsWith("muc:") && v.tag !== "mau_ma" && v.tag in nd.o_nhap) {
    return [{ vi_tri: { tag: v.tag }, nhan: dn?.o_nhap?.find((o) => o.tag === v.tag)?.nhan ?? v.tag, cu: nd.o_nhap[v.tag] ?? "" }];
  }
  return [];
}

/** Chữ của cả dòng lỗi (bỏ cột STT, ô trống) + chữ dùng để khoanh cam chỗ lỗi trong bản xem báo cáo gốc. */
export function chuCuaDong(l: LoiKiemTra, nd: NoiDungWord, mau?: MauWord | null): Pick<MucSuaLoi, "dong_chu" | "tim"> {
  const v = l.vi_tri;
  const dn = mau?.dinh_nghia as DinhNghia | undefined;
  if (v?.bang && v.dong) {
    const dong = nd.bang[v.bang]?.[v.dong - 1];
    if (!dong) return {};
    const cot = dn?.bang?.find((b) => b.tag === v.bang)?.cot ?? [];
    const nhan = (c: string) => cot.find((x) => x.tag === c)?.nhan ?? c;
    const ds = Object.keys(dong)
      .filter((c) => (dong[c] ?? "").trim() && !/^(#|stt|tt)$/i.test(nhan(c).trim()) && !/^\s*\d{1,3}\s*$/.test(dong[c] ?? ""))
      .map((c) => ({ nhan: nhan(c), gt: (dong[c] ?? "").trim().replace(/\s+/g, " ").slice(0, 300) }));
    const tim = (dong.ten ?? "").trim().split(/\r?\n/)[0] || ds.find((x) => x.gt.length >= 6)?.gt || ds[0]?.gt;
    return { dong_chu: ds, ...(tim ? { tim } : {}) };
  }
  if (v?.tag && v.tag in nd.o_nhap) {
    const gt = (nd.o_nhap[v.tag] ?? "").trim();
    return gt ? { tim: gt.split(/\r?\n/)[0] } : {};
  }
  return {};
}

/** Cột NGÀY của bảng việc: chữ mới chỉ được là ngày — ghi "hạn 20/10/2026" vào đó thì máy đọc lại báo "không phải ngày"
 *  (Mr. Đại test 29/09, file Phòng Cơ điện: sửa xong vẫn còn đúng lỗi đó). */
const COT_NGAY = /^(bat_dau|ket_thuc|han_quyet_dinh)$/;
export const laCotNgay = (o?: OChoSua) => !!o?.vi_tri.cot && COT_NGAY.test(o.nghia ?? o.vi_tri.cot);

/** Ô nên sửa khi phải thêm chữ vào dòng: cột kiến nghị / biện pháp / xử lý / hành động; không có thì cột cuối. */
export function oUuTien(cho: OChoSua[]): number {
  const k = cho.findIndex((o) => /kiến nghị|biện pháp|xử lý|vướng mắc|hành động|giải pháp/i.test(o.nhan));
  return k >= 0 ? k : cho.length - 1;
}

/** Đề xuất CODE (không cần AI) cho hai lỗi đoán chắc được — dùng khi AI tắt / lỗi / không đề xuất. */
function deXuatCode(m: MucSuaLoi): MucSuaLoi["de_xuat"] {
  if (!m.cho_sua.length) return undefined;
  // Thiếu hạn mà dòng có cột Kết thúc → ghi đúng ngày vào cột đó
  const oNgay = m.can_han ? m.cho_sua.findIndex((x) => (x.nghia ?? x.vi_tri.cot) === "ket_thuc") : -1;
  if (oNgay >= 0) return { o: oNgay, moi: CHO_HAN };
  const o = oUuTien(m.cho_sua);
  const cu = m.cho_sua[o].cu.trim();
  if (m.can_han) return { o, moi: cu ? `${cu}, hạn ${CHO_HAN}` : `hạn ${CHO_HAN}` };
  const dv = /chưa có người phụ trách, tự gán cho (.+)$/.exec(m.thong_diep)?.[1]?.trim();
  if (dv) return { o, moi: `${cu} — ${dv} chủ trì` };
  return undefined;
}

export function dungDanhSach(loi: LoiKiemTra[], nd: NoiDungWord, mau?: MauWord | null): MucSuaLoi[] {
  const ds: MucSuaLoi[] = [];
  loi.forEach((l, i) => {
    if (l.muc !== "chan" && l.muc !== "canh_bao") return;
    // "Có vẻ trùng" là quyết định của bước Duyệt việc (chọn Đúng là CV-… / Việc mới) — không liệt kê ở đây (một vấn đề một nơi)
    if (l.luat === "viec_trung") return;
    const khongThuocDonVi = l.luat === "dung_mau" && /bạn không thuộc/.test(l.thong_diep);
    const m: MucSuaLoi = {
      i,
      muc: l.muc,
      luat: l.luat,
      thong_diep: l.thong_diep,
      noi: nhanViTri(l.vi_tri, mau),
      // Người nộp không thuộc đơn vị của báo cáo: lỗi QUYỀN, không sửa bằng ô (đổi tên đơn vị cho lọt là sai) — soát 30/09
      cho_sua: khongThuocDonVi ? [] : choSuaCuaLoi(l, nd, mau),
      ...(khongThuocDonVi ? { khong_sua_file: "Không sửa trong file: nhờ người của đơn vị đó nộp, hoặc quản trị gán kiêm nhiệm cho bạn." } : {}),
      can_han: /chưa có hạn/.test(l.thong_diep),
      ...chuCuaDong(l, nd, mau),
    };
    m.de_xuat = deXuatCode(m);
    ds.push(m);
  });
  // Chặn gửi lên trước
  return ds.sort((a, b) => Number(a.muc !== "chan") - Number(b.muc !== "chan"));
}

const HE_THONG = `Bạn giúp người nộp báo cáo tuần của Công ty SCI sửa lỗi mà máy kiểm tra đã tìm ra, TRƯỚC khi nộp.
Với MỖI lỗi được đưa:
1. "giai_thich": vì sao máy báo lỗi này — lời thường, 1–2 câu, tiếng Việt, không thuật ngữ máy tính.
2. Nếu sửa được bằng cách viết lại MỘT ô trong danh sách "o" của lỗi đó: "o" = số thứ tự ô (từ 0), "moi" = TOÀN BỘ chữ mới của ô đó.
   Giữ nguyên ý và câu chữ gốc, chỉ thêm/sửa đúng phần còn thiếu. Không đổi số liệu, tên, ngày đã có.
3. Không sửa bằng một ô được (hoặc không cần sửa): "o": -1, "moi": null, "khong_can_sua": lý do ngắn.
LUẬT CỨNG:
- KHÔNG BỊA ngày tháng, số tiền, số liệu, tên người. Lỗi thiếu hạn: viết chữ mới có đúng chỗ giữ "hạn {HAN}" (người nộp tự chọn ngày), ví dụ "… trình ký, hạn {HAN}".
- CHỈ THÊM ĐÚNG PHẦN CÒN THIẾU mà lỗi nói tới: thiếu hạn → thêm "hạn {HAN}"; thiếu người phụ trách → thêm "— <tên đơn vị> chủ trì".
  KHÔNG thêm đơn vị phối hợp, KHÔNG thêm hành động / bước làm mới (soạn thảo, trình ký…), KHÔNG viết lại câu gốc.
- Thiếu người phụ trách mà máy đã tự gán cho một đơn vị: đề xuất ghi đúng đơn vị máy đã gán (người nộp sẽ đổi nếu sai), không tự chọn đơn vị khác.
- Người / đơn vị chỉ được dùng tên có trong DANH BẠ.
- Không bao giờ chỉ viết mã: mã luôn kèm tên ngắn.
Chỉ trả JSON, không giải thích thêm: {"sua":[{"i":<số>,"giai_thich":"…","o":<số>,"moi":"…"|null,"khong_can_sua":"…"|null}]}`;

function dungPrompt(ds: MucSuaLoi[], danhBa?: DanhBa | null): string {
  const cat = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
  const loi = ds.map((m) => ({
    i: m.i,
    muc: m.muc === "chan" ? "CHẶN GỬI" : "CẢNH BÁO",
    vi_tri: m.noi,
    thong_diep: m.thong_diep,
    o: m.cho_sua.map((o, k) => ({ so: k, cot: o.nhan, chu_hien_tai: cat(o.cu, 800) })),
  }));
  const db = danhBa ? `\nDANH BẠ đơn vị: ${danhBa.don_vi.map((d) => d.ten).join("; ").slice(0, 2500)}` : "";
  return `CÁC LỖI:\n${JSON.stringify(loi, null, 1)}${db}`;
}

/** Ghép trả lời của AI vào danh sách — code soát lại: ô phải có thật, chữ mới phải khác, lỗi thiếu hạn phải có {HAN}. */
export function ghepTraLoi(ds: MucSuaLoi[], text: string): MucSuaLoi[] {
  const j = layJson(text) as { sua?: { i?: unknown; giai_thich?: unknown; o?: unknown; moi?: unknown; khong_can_sua?: unknown }[] };
  const theoI = new Map((Array.isArray(j?.sua) ? j.sua : []).map((x) => [Number(x.i), x]));
  return ds.map((m) => {
    const x = theoI.get(m.i);
    if (!x) return m;
    const kq: MucSuaLoi = { ...m, giai_thich: typeof x.giai_thich === "string" ? x.giai_thich.trim().slice(0, 600) : undefined };
    const o = Number(x.o);
    let moi = typeof x.moi === "string" ? x.moi.trim().slice(0, 3000) : "";
    if (Number.isInteger(o) && o >= 0 && o < m.cho_sua.length && moi && moi !== m.cho_sua[o].cu.trim()) {
      if (m.can_han && !moi.includes(CHO_HAN)) moi = `${m.cho_sua[o].cu.trim()}, hạn ${CHO_HAN}`;
      if (laCotNgay(m.cho_sua[o]) && moi.includes(CHO_HAN)) moi = CHO_HAN; // cột ngày: chỉ ngày
      kq.de_xuat = { o, moi };
    } else if (m.de_xuat ?? deXuatCode(m)) {
      // AI không đề xuất được → giữ đề xuất của code (thiếu hạn / thiếu phụ trách)
      kq.de_xuat = m.de_xuat ?? deXuatCode(m);
    } else {
      kq.de_xuat = null;
      if (!kq.khong_sua_file && typeof x.khong_can_sua === "string" && x.khong_can_sua.trim()) kq.khong_sua_file = x.khong_can_sua.trim().slice(0, 300);
    }
    return kq;
  });
}

const boNho = new Map<string, KetQuaSuaLoi>();

/** 🤖 giải thích + đề xuất sửa cho mọi lỗi chặn / cảnh báo của một bản báo cáo. Không bao giờ ném lỗi vì AI. */
export async function suaLoiBangAi(
  buf: Buffer,
  loi: LoiKiemTra[],
  nd: NoiDungWord,
  mau: MauWord | null | undefined,
  tuyChon: { danhBa?: DanhBa | null; model?: string } = {},
): Promise<KetQuaSuaLoi> {
  const ds = dungDanhSach(loi, nd, mau);
  if (!ds.length) return { trang_thai: "xong", muc: [] };
  const khoa = crypto
    .createHash("sha256")
    .update(buf)
    .update(JSON.stringify(ds.map((m) => [m.i, m.thong_diep])))
    .digest("hex");
  const cu = boNho.get(khoa);
  if (cu) return cu;
  if (getAIConfig().mode === "off") return { trang_thai: "khong_ai", ly_do: "Kết nối AI đang tắt — gõ chữ sửa trực tiếp", muc: ds };
  try {
    const text = await coHan(
      runAIGan("lib/kiem-tra/sua-loi-ai", dungPrompt(ds, tuyChon.danhBa), HE_THONG, undefined, tuyChon.model, THOI_GIAN_CHO_MS),
      THOI_GIAN_CHO_MS,
      `🤖 không trả lời sau ${Math.round(THOI_GIAN_CHO_MS / 1000)} giây — đang dùng đề xuất của máy (thiếu hạn, thiếu phụ trách); các lỗi khác gõ chữ sửa trực tiếp`,
    );
    const kq: KetQuaSuaLoi = { trang_thai: "xong", muc: ghepTraLoi(ds, text) };
    boNho.set(khoa, kq);
    return kq;
  } catch (e) {
    return { trang_thai: "loi_ai", ly_do: e instanceof Error ? e.message : String(e), muc: ds };
  }
}

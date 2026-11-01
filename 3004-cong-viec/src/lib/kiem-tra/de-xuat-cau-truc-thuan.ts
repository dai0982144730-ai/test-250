// ============================================================
// kiem-tra/de-xuat-cau-truc-thuan.ts — 🤖 AI ĐỀ XUẤT CẤU TRÚC MẪU: phần THUẦN (không node:fs — luật 10),
// dùng chung cho server (de-xuat-cau-truc.ts) và màn duyệt /mau-word (tính lại tại chỗ mỗi lần người chọn nghĩa).
// Khai báo mẫu báo cáo không cần sửa code — Đợt C/D, 01/10/2026. MD mục 4.1 bước 3–5, mục 4.2:
//   · AI trỏ chương / bảng / cột theo SỐ THỨ TỰ trong khung file → không bịa được cột không có thật,
//   · lưới: nghĩa phải thuộc bộ nghĩa cố định; cột STT tự "Không lấy"; trùng nghĩa → Thông tin thêm;
//     chương không sinh việc thì mọi bảng trong đó là bảng số liệu (đo 01/10: 🤖 xếp "Kiến nghị lãnh đạo" thành bảng quyết định),
//   · TAG DO CODE ĐẶT (AI không đặt); bản cập nhật giữ tag phiên bản trước cho chương / bảng / cột không đổi hoặc chỉ đổi tên,
//   · NGƯỜI chọn lại nghĩa (bảng duyệt) thắng AI; cuối cùng kiemCauTruc.
// ============================================================
import type { BangMau, CauTrucMau, ChuongMau, CotMau, NghiaCot } from "@/lib/types";
import type { KhungVanBan } from "./gan-nhan";
import { kiemCauTruc, NHAN_NGHIA_BANG, NHAN_NGHIA_CHUONG, NHAN_NGHIA_COT } from "./cau-truc";
import { khongDau } from "./chuan-hoa";

const DS_NGHIA_COT: NghiaCot[] = ["ten", "ket_thuc", "tinh_trang", "du_an", "phu_trach", "bat_dau", "ket_qua_can_co", "ma_viec", "han_quyet_dinh", "them", "bo_qua"];
const DS_NGHIA_CHUONG: ChuongMau["nghia"][] = ["sinh_viec_bang", "sinh_viec_van_xuoi", "so_lieu", "thong_tin"];
const DS_NGHIA_BANG: BangMau["nghia"][] = ["sinh_viec", "quyet_dinh", "so_lieu"];
const NGHIA_COT = new Set<string>(DS_NGHIA_COT);
const NGHIA_CHUONG = new Set<string>(DS_NGHIA_CHUONG);
const NGHIA_BANG = new Set<string>(DS_NGHIA_BANG);
const KHOA_CHUAN = new Set(["ma_viec", "ten", "du_an", "hang_muc", "phu_trach", "bat_dau", "ket_thuc", "ket_qua_can_co", "da_xong", "tinh_trang", "han_quyet_dinh", "stt"]);

export const HE_THONG_CAU_TRUC = `Bạn giúp quản trị viên khai báo MẪU BÁO CÁO Word của một công ty đầu tư, thiết kế, thi công, vận hành dự án điện gió, thủy điện, điện mặt trời.
Máy đã rút KHUNG của file: các chương (đánh số "so" từ 0), dưới mỗi chương là các bảng (vi_tri từ 0) với chữ tiêu đề từng cột (cột đánh số từ 0) và một dòng mẫu.
Nhiệm vụ: cho biết mỗi chương, bảng, cột mang NGHĨA gì — CHỈ chọn trong các danh sách dưới đây. Không bịa chương, bảng, cột không có trong khung.

NGHĨA CHƯƠNG:
- sinh_viec_bang: chương có BẢNG kế hoạch/kết quả công việc — mỗi dòng là một việc có tên việc và hạn (vd "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI", "TIẾN ĐỘ CHI TIẾT CÔNG TÁC THIẾT KẾ" có hạng mục + ngày kế hoạch + % hoàn thành)
- sinh_viec_van_xuoi: chương KHÔNG có bảng nhưng chữ là danh sách việc phải làm có người làm / hạn
- so_lieu: chương chủ yếu là bảng số liệu (sản lượng, doanh thu, chi phí, KPI, nhân sự, tiến độ % thi công…) — không sinh việc
- thong_tin: chương chữ tự do: tóm tắt, cảnh báo, vấn đề nổi bật, kiến nghị, rủi ro — KHÔNG sinh việc (Mr. Đại chốt: kiến nghị / sự cố / cảnh báo không phải việc)

NGHĨA BẢNG: sinh_viec (mỗi dòng một việc) · quyet_dinh · so_lieu (không sinh việc).
- quyet_dinh CHỈ dùng cho bảng "VIỆC CẦN LÃNH ĐẠO QUYẾT ĐỊNH" do chính Ban lãnh đạo lập (mỗi dòng là một việc lãnh đạo giao, có hạn quyết định); chương chứa nó là sinh_viec_bang.
- Bảng "vấn đề nổi bật / kiến nghị lãnh đạo" của phòng ban, đơn vị gửi lên KHÔNG phải quyet_dinh — là so_lieu trong chương thong_tin.
- Bảng nằm trong chương thong_tin / so_lieu luôn là so_lieu.

NGHĨA CỘT (chỉ cần cho bảng sinh_viec / quyet_dinh):
- ten: tên / nội dung công việc, hạng mục
- ket_thuc: hạn, ngày kết thúc, ngày kế hoạch hoàn thành
- tinh_trang: tình trạng, đã xong, % hoàn thành
- du_an: dự án · phu_trach: người / đơn vị phụ trách, chủ trì · bat_dau: ngày bắt đầu
- ket_qua_can_co: kết quả cần có / sản phẩm đầu ra · ma_viec: mã việc · han_quyet_dinh: hạn lãnh đạo quyết định
- them: thông tin thêm (ghi chú, ưu tiên, tài liệu…) · bo_qua: cột số thứ tự hoặc cột không dùng
Bảng sinh việc phải có đủ ten, ket_thuc, tinh_trang — thiếu thì vẫn trả đúng thực tế, nêu rõ ở ly_do.

Mỗi mục kèm "ly_do" (một câu tiếng Việt, tối đa 20 chữ) và "chac" (true nếu chắc chắn, false nếu đoán).
Trả lời DUY NHẤT một đối tượng JSON:
{"chuong":[{"so":0,"nghia":"thong_tin","ly_do":"…","chac":true,
  "bang":[{"vi_tri":0,"nghia":"sinh_viec","ly_do":"…","chac":true,"cot":[{"so":0,"nghia":"ten","ly_do":"…","chac":true}]}]}]}
Bảng so_lieu không cần liệt kê cột ("cot":[]).`;

/** Một dòng của bảng duyệt (MD mục 4.2). Khoá theo SỐ THỨ TỰ trong khung file: "c<i>" · "c<i>.b<v>" · "c<i>.b<v>.cot<j>"; dòng "Bỏ" của bản trước: "cu…" */
export interface HangDuyet {
  khoa: string;
  cap: "chuong" | "bang" | "cot";
  trong_file: string;
  /** nghĩa 🤖 đề xuất (nhãn tiếng Việt); null = AI không xếp / xếp nghĩa không có trong bộ nghĩa */
  ai_hieu: string | null;
  nghia: string;
  nhan_nghia: string;
  /** rỗng = khoá, không chọn lại được */
  lua_chon: { gia_tri: string; nhan: string }[];
  ly_do: string;
  chac: boolean;
  nguoi_chon: boolean;
  ai_nhat: string;
  /** chỉ khi cập nhật mẫu: Mới · Giữ nguyên · Đổi tên (cũ: …) · Đổi nghĩa · Bỏ */
  so_voi_truoc: string | null;
  bat_buoc?: boolean;
}

export interface KetQuaDeXuat {
  cau_truc: CauTrucMau;
  hang: HangDuyet[];
  /** lưới code đã sửa gì so với AI trả */
  canh_bao: string[];
  /** kiemCauTruc — phải hết lỗi mới lưu được */
  loi_cau_truc: string[];
}

export const slugTag = (s: string) =>
  khongDau(s)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30)
    .replace(/_+$/g, "");
const soKhop = (s: string) => slugTag(s.replace(/^\s*(?:[IVX]+|[A-Z]\d?|\d{1,2})\.\s*/, ""));
const LA_COT_STT = (t: string) => /^(#|stt|tt|so tt)$/.test(khongDau(t).trim());

/** Lời nhắn cho AI: khung file (+ cấu trúc phiên bản trước nếu là bản cập nhật). */
export function dungPromptCauTruc(khung: KhungVanBan, cu?: CauTrucMau | null): string {
  const k = {
    tieu_de_bao_cao: khung.tieu_de_bao_cao,
    chuong: khung.chuong.map((c, i) => ({
      so: i,
      tieu_de: c.tieu_de_goc,
      ...(c.doan ? { doan: c.doan } : {}),
      bang: c.bang.map((b) => ({ vi_tri: b.vi_tri, so_dong: b.so_dong, cot: b.tieu_de_cot.map((t, j) => `${j}: ${t || "(trống)"}`), dong_mau: b.dong_mau })),
    })),
  };
  const cuChu = cu
    ? `\n\nPHIÊN BẢN TRƯỚC của mẫu (giữ nghĩa cho chương / cột còn nguyên): ${JSON.stringify(
        cu.chuong.map((c) => ({ tieu_de: c.tieu_de, nghia: c.nghia, bang: c.bang.map((b) => ({ nghia: b.nghia, cot: b.cot.map((x) => `${x.tieu_de} = ${x.nghia}`) })) })),
      ).slice(0, 4000)}`
    : "";
  return `KHUNG FILE:\n${JSON.stringify(k, null, 1)}${cuChu}`;
}

type AiMuc = { so?: unknown; vi_tri?: unknown; nghia?: unknown; ly_do?: unknown; chac?: unknown; bang?: unknown; cot?: unknown };
const theoSo = (ds: unknown, khoa: "so" | "vi_tri") => {
  const m = new Map<number, AiMuc>();
  for (const x of Array.isArray(ds) ? (ds as AiMuc[]) : []) if (Number.isInteger(x?.[khoa])) m.set(x[khoa] as number, x);
  return m;
};
const lyDo = (x: AiMuc | undefined) => (typeof x?.ly_do === "string" ? x.ly_do.trim().slice(0, 200) : "");
const LC = <T extends string>(ds: T[], nhan: Record<string, string>) => ds.map((g) => ({ gia_tri: g, nhan: nhan[g] ?? g }));
const ONhat = (n: string) => (n === "sinh_viec_bang" || n === "sinh_viec" || n === "quyet_dinh" || n === "dac_biet" ? "Code" : n === "sinh_viec_van_xuoi" ? "🤖 LLM" : "—");

/**
 * Ghép trả lời của AI (+ lựa chọn của người duyệt) thành cau_truc hợp lệ và các dòng bảng duyệt.
 * `chon`: khoá dòng → nghĩa người chọn; "c<i>.bb" → "1"/"0" (chương bắt buộc).
 */
export function ghepDeXuat(tho: unknown, khung: KhungVanBan, cu?: CauTrucMau | null, chon: Record<string, string> = {}): KetQuaDeXuat {
  const canhBao: string[] = [];
  const hang: HangDuyet[] = [];
  const aiChuong = theoSo((tho as { chuong?: unknown } | null)?.chuong, "so");
  const capNhat = !!cu;

  // nghĩa chương (AI → người chọn)
  const nghiaC = khung.chuong.map((kc, i) => {
    const a = aiChuong.get(i);
    const aiOk = NGHIA_CHUONG.has(String(a?.nghia)) ? (a!.nghia as ChuongMau["nghia"]) : null;
    if (a && !aiOk) canhBao.push(`Chương "${kc.tieu_de}": 🤖 trả nghĩa "${String(a.nghia)}" không có trong bộ nghĩa`);
    const ng = NGHIA_CHUONG.has(chon[`c${i}`]) ? (chon[`c${i}`] as ChuongMau["nghia"]) : null;
    return { ai: aiOk, nghia: ng ?? aiOk ?? "thong_tin", nguoi: !!ng };
  });
  // ghép chương với bản trước: trùng tên → giữ; chương sinh việc chưa ghép ↔ chương sinh việc cũ chưa ghép → đổi tên
  const cuDung = new Set<number>();
  const ghepCu: (number | null)[] = khung.chuong.map((kc) => {
    const j = cu ? cu.chuong.findIndex((c, k) => !cuDung.has(k) && soKhop(c.tieu_de) === soKhop(kc.tieu_de)) : -1;
    if (j >= 0) cuDung.add(j);
    return j >= 0 ? j : null;
  });
  const doiTen = new Set<number>();
  khung.chuong.forEach((_, i) => {
    if (!cu || ghepCu[i] !== null || nghiaC[i].nghia !== "sinh_viec_bang") return;
    const j = cu.chuong.findIndex((c, k) => !cuDung.has(k) && c.nghia === "sinh_viec_bang");
    if (j >= 0) {
      cuDung.add(j);
      ghepCu[i] = j;
      doiTen.add(i);
    }
  });

  const tagBangDung = new Set<string>();
  const chuong: ChuongMau[] = khung.chuong.map((kc, i) => {
    const a = aiChuong.get(i);
    let { nghia } = nghiaC[i];
    const cc = ghepCu[i] !== null ? cu!.chuong[ghepCu[i]!] : undefined;
    const aiBang = theoSo(a?.bang, "vi_tri");
    const bang: BangMau[] = [];
    const hangBang: HangDuyet[] = [];
    for (const kb of kc.bang) {
      const kB = `c${i}.b${kb.vi_tri}`;
      const ab = aiBang.get(kb.vi_tri);
      const bCu0 = cc?.bang[kb.vi_tri];
      const bCu = bCu0?.tag ? bCu0 : undefined; // tag "" = chỗ trống của bảng số liệu (cauTrucTuFileCo)
      const trongFileB = `· Bảng ${kb.vi_tri + 1}${kb.tieu_de_cot.length ? ` (${kb.tieu_de_cot.filter(Boolean).slice(0, 3).join(" · ")}${kb.tieu_de_cot.length > 3 ? " …" : ""})` : ""}`;
      if (bCu?.nghia === "dac_biet") {
        // bảng có code riêng (Form 5 Tiến độ thiết kế) — giữ nguyên cả tag cột, không chọn lại
        bang.push(bCu);
        tagBangDung.add(bCu.tag);
        hangBang.push({ khoa: kB, cap: "bang", trong_file: trongFileB, ai_hieu: null, nghia: "dac_biet", nhan_nghia: NHAN_NGHIA_BANG.dac_biet, lua_chon: [], ly_do: "giữ như bản trước — bảng có code riêng", chac: true, nguoi_chon: false, ai_nhat: "Code", so_voi_truoc: "Giữ nguyên" });
        for (const x of bCu.cot)
          hangBang.push({ khoa: `${kB}.${x.tag}`, cap: "cot", trong_file: `cột "${x.tieu_de}"`, ai_hieu: null, nghia: x.nghia, nhan_nghia: NHAN_NGHIA_COT[x.nghia], lua_chon: [], ly_do: "", chac: true, nguoi_chon: false, ai_nhat: "", so_voi_truoc: "Giữ nguyên" });
        continue;
      }
      const aiNb = NGHIA_BANG.has(String(ab?.nghia)) ? (ab!.nghia as BangMau["nghia"]) : null;
      const ngB = NGHIA_BANG.has(chon[kB]) ? (chon[kB] as BangMau["nghia"]) : null;
      let nb: BangMau["nghia"] = ngB ?? aiNb ?? (nghia === "sinh_viec_bang" && kb.vi_tri === 0 ? "sinh_viec" : "so_lieu");
      const khoaB = nghia !== "sinh_viec_bang";
      if (khoaB && nb !== "so_lieu") {
        if (!ngB) canhBao.push(`Chương "${kc.tieu_de}" không sinh việc nhưng 🤖 xếp bảng ${kb.vi_tri + 1} là ${nb === "quyet_dinh" ? "bảng quyết định" : "bảng sinh việc"} → Bảng số liệu`);
        nb = "so_lieu";
      }
      // TAG BẢNG: giữ tag bản trước · bảng số liệu còn nhãn trên file → giữ · bảng sinh việc đầu tiên = bang_cong_viec ·
      // quyết định = bang_quyet_dinh · còn lại theo tên chương
      const tagFile = nb === "so_lieu" && kb.tag_co_san && !tagBangDung.has(kb.tag_co_san) ? kb.tag_co_san : null;
      // bảng số liệu bản trước KHÔNG gắn nhãn (máy không đọc) → giữ không nhãn: tag "" (gan-nhan bỏ qua)
      const khongNhan = nb === "so_lieu" && !!bCu0 && !bCu0.tag && !tagFile;
      let tag = khongNhan ? "" : bCu?.tag ?? tagFile ?? (nb === "sinh_viec" && !tagBangDung.has("bang_cong_viec") ? "bang_cong_viec" : nb === "quyet_dinh" && !tagBangDung.has("bang_quyet_dinh") ? "bang_quyet_dinh" : `bang_${slugTag(kc.tieu_de) || "bang"}`);
      if (tag && !(nb === "so_lieu" && bCu?.tag === tag)) {
        for (let n = 2; tagBangDung.has(tag); n++) tag = `${tag.replace(/_\d+$/, "")}_${n}`;
        tagBangDung.add(tag);
      }
      hangBang.push({
        khoa: kB, cap: "bang", trong_file: trongFileB,
        ai_hieu: aiNb ? NHAN_NGHIA_BANG[aiNb] : null, nghia: nb, nhan_nghia: NHAN_NGHIA_BANG[nb],
        lua_chon: khoaB ? [] : LC(DS_NGHIA_BANG, NHAN_NGHIA_BANG),
        ly_do: khoaB ? "chương không sinh việc → bảng số liệu" : lyDo(ab), chac: khoaB || ab?.chac === true, nguoi_chon: !!ngB, ai_nhat: ONhat(nb),
        so_voi_truoc: capNhat ? (bCu ? (bCu.nghia === nb ? "Giữ nguyên" : "Đổi nghĩa") : "Mới") : null,
      });
      const cot: CotMau[] = [];
      if (nb === "so_lieu") {
        // bảng số liệu: không chọn nghĩa cột, chỉ GIỮ tag cột (luật kiểm tra trỏ vào) — của bản trước, hoặc nhãn còn trên file
        // bảng số liệu MỚI: cột theo dòng tiêu đề (để sau này đặt được luật kiểm tra), tag = tên cột không dấu
        const daTag = new Set<string>();
        const moi = (): CotMau[] =>
          kb.tieu_de_cot.filter((t) => t.trim()).map((t, j) => {
            let tg = slugTag(t) || `cot_${j + 1}`;
            for (let n = 2; daTag.has(tg); n++) tg = `${tg.replace(/_\d+$/, "")}_${n}`;
            daTag.add(tg);
            return { tag: tg, tieu_de: t, nghia: "them" as const };
          });
        const coSan = tag && tag === kb.tag_co_san ? (kb.cot_co_san ?? []) : null;
        let giu: CotMau[];
        if (!tag) giu = [];
        else if (bCu?.nghia === "so_lieu") {
          if (coSan) {
            // sửa trên file mẫu tải về: cột nào còn nhãn thì giữ; cột người quản trị đã XOÁ → dòng "Bỏ" (luật trỏ vào sẽ tắt khi lưu)
            const con = new Set(coSan.map((x) => x.tag));
            giu = [...bCu.cot.filter((x) => con.has(x.tag)), ...coSan.filter((x) => !bCu.cot.some((y) => y.tag === x.tag)).map((x) => ({ ...x, nghia: "them" as const }))];
            for (const x of bCu.cot)
              if (!con.has(x.tag))
                hangBang.push({ khoa: `cu.${kB}.${x.tag}`, cap: "cot", trong_file: `cột "${x.tieu_de}" (bản trước)`, ai_hieu: null, nghia: "them", nhan_nghia: "Cột bảng số liệu", lua_chon: [], ly_do: "", chac: true, nguoi_chon: false, ai_nhat: "", so_voi_truoc: "Bỏ" });
          } else giu = bCu.cot; // Word thường: máy thử dựng lại nhãn theo chữ tiêu đề (gan-nhan báo cột không dựng được)
        } else if (coSan) giu = coSan.map((x) => ({ ...x, nghia: "them" as const }));
        else giu = bCu ? [] : moi();
        cot.push(...giu);
      } else {
        const aiCot = theoSo(ab?.cot, "so");
        const chonCot = (j: number) => (NGHIA_COT.has(chon[`${kB}.cot${j}`]) ? (chon[`${kB}.cot${j}`] as NghiaCot) : null);
        const daCo = new Set<NghiaCot>(kb.tieu_de_cot.map((_, j) => chonCot(j)).filter((n): n is NghiaCot => !!n && n !== "them" && n !== "bo_qua"));
        const daCoNguoi = new Set<NghiaCot>();
        const tagCotDung = new Set<string>();
        const cuCotDung = new Set<CotMau>();
        const tieuDeMoi = new Set(kb.tieu_de_cot.map(soKhop));
        kb.tieu_de_cot.forEach((tieuDe, j) => {
          if (!tieuDe.trim()) return;
          const ax = aiCot.get(j);
          const aiN = NGHIA_COT.has(String(ax?.nghia)) ? (ax!.nghia as NghiaCot) : null;
          const ng = chonCot(j);
          let n: NghiaCot = ng ?? (LA_COT_STT(tieuDe) ? "bo_qua" : aiN ?? "them");
          if (!ng && ax && !aiN) canhBao.push(`Cột "${tieuDe}": 🤖 trả nghĩa "${String(ax.nghia)}" không có trong bộ nghĩa → Thông tin thêm`);
          if (n !== "them" && n !== "bo_qua") {
            if (ng ? daCoNguoi.has(n) : daCo.has(n)) {
              canhBao.push(`Bảng "${kc.tieu_de}": hai cột cùng nghĩa ${NHAN_NGHIA_COT[n]} — cột "${tieuDe}" chuyển Thông tin thêm`);
              n = "them";
            } else (ng ? daCoNguoi : daCo).add(n);
          }
          // giữ tag cũ: cùng tên cột; hoặc cột cũ cùng nghĩa đã biến mất khỏi file → coi là đổi tên
          let xCu = bCu?.cot.find((x) => !cuCotDung.has(x) && soKhop(x.tieu_de) === soKhop(tieuDe));
          let doiTenCot = false;
          if (!xCu && bCu && n !== "them" && n !== "bo_qua") {
            xCu = bCu.cot.find((x) => !cuCotDung.has(x) && x.nghia === n && !tieuDeMoi.has(soKhop(x.tieu_de)));
            doiTenCot = !!xCu;
          }
          if (xCu) cuCotDung.add(xCu);
          let tagCot = xCu?.tag ?? (n !== "them" && n !== "bo_qua" ? n : slugTag(tieuDe) || `cot_${j + 1}`);
          if (!xCu && (n === "them" || n === "bo_qua") && KHOA_CHUAN.has(tagCot)) tagCot = `cot_${tagCot}`;
          for (let k = 2; tagCotDung.has(tagCot); k++) tagCot = `${tagCot.replace(/_\d+$/, "")}_${k}`;
          tagCotDung.add(tagCot);
          cot.push({ tag: tagCot, tieu_de: tieuDe, nghia: n, ...(n === "them" ? { ten_them: tagCot } : {}) });
          hangBang.push({
            khoa: `${kB}.cot${j}`, cap: "cot", trong_file: `cột "${tieuDe}"`,
            ai_hieu: aiN ? NHAN_NGHIA_COT[aiN] : null, nghia: n, nhan_nghia: NHAN_NGHIA_COT[n], lua_chon: LC(DS_NGHIA_COT, NHAN_NGHIA_COT),
            ly_do: !ax && n === "bo_qua" ? "cột số thứ tự" : lyDo(ax), chac: ax?.chac === true || (!ax && n === "bo_qua"), nguoi_chon: !!ng, ai_nhat: "",
            so_voi_truoc: capNhat ? (!xCu ? "Mới" : doiTenCot ? `Đổi tên (cũ: "${xCu.tieu_de}")` : xCu.nghia === n ? "Giữ nguyên" : "Đổi nghĩa") : null,
          });
        });
        for (const x of bCu?.cot ?? [])
          if (!cuCotDung.has(x))
            hangBang.push({ khoa: `cu.${kB}.${x.tag}`, cap: "cot", trong_file: `cột "${x.tieu_de}" (bản trước)`, ai_hieu: null, nghia: x.nghia, nhan_nghia: NHAN_NGHIA_COT[x.nghia], lua_chon: [], ly_do: "", chac: true, nguoi_chon: false, ai_nhat: "", so_voi_truoc: "Bỏ" });
      }
      bang.push({ tag, tieu_de: nb === "so_lieu" && bCu?.tieu_de ? bCu.tieu_de : kc.tieu_de, nghia: nb, cot });
    }
    // bảng có nhãn ở bản trước mà file mới không còn (chương vẫn còn)
    cc?.bang.slice(kc.bang.length).forEach((b, k) => {
      if (b.tag)
        hangBang.push({ khoa: `cu.c${i}.b${kc.bang.length + k}`, cap: "bang", trong_file: `· Bảng ${kc.bang.length + k + 1} "${b.tieu_de}" (bản trước)`, ai_hieu: null, nghia: b.nghia, nhan_nghia: NHAN_NGHIA_BANG[b.nghia], lua_chon: [], ly_do: "", chac: true, nguoi_chon: false, ai_nhat: "", so_voi_truoc: "Bỏ" });
    });
    if (bang.some((b) => b.nghia === "dac_biet")) nghia = "sinh_viec_bang"; // bảng có code riêng chỉ chạy trong chương sinh việc
    const bb = chon[`c${i}.bb`] === "1" ? true : chon[`c${i}.bb`] === "0" ? false : cc ? cc.bat_buoc : true;
    const tenCu = [...(cc?.ten_cu ?? []), ...(doiTen.has(i) && cc ? [cc.tieu_de] : [])];
    hang.push({
      khoa: `c${i}`, cap: "chuong", trong_file: `Chương ${kc.tieu_de_goc}`,
      ai_hieu: nghiaC[i].ai ? NHAN_NGHIA_CHUONG[nghiaC[i].ai!] : null, nghia, nhan_nghia: NHAN_NGHIA_CHUONG[nghia], lua_chon: LC(DS_NGHIA_CHUONG, NHAN_NGHIA_CHUONG),
      ly_do: lyDo(a) || (a ? "" : "🤖 không xếp — máy để Chương thông tin"), chac: a?.chac === true, nguoi_chon: nghiaC[i].nguoi, ai_nhat: ONhat(nghia),
      so_voi_truoc: capNhat ? (!cc ? "Mới" : doiTen.has(i) ? `Đổi tên (cũ: "${cc.tieu_de}")` : cc.nghia === nghia ? "Giữ nguyên" : "Đổi nghĩa") : null,
      bat_buoc: bb,
    });
    hang.push(...hangBang);
    return { tieu_de: kc.tieu_de, ...(tenCu.length ? { ten_cu: tenCu } : {}), nghia, bat_buoc: bb, bang };
  });
  cu?.chuong.forEach((c, k) => {
    if (!cuDung.has(k))
      hang.push({ khoa: `cu.c${k}`, cap: "chuong", trong_file: `Chương ${c.tieu_de} (bản trước)`, ai_hieu: null, nghia: c.nghia, nhan_nghia: NHAN_NGHIA_CHUONG[c.nghia], lua_chon: [], ly_do: "", chac: true, nguoi_chon: false, ai_nhat: "", so_voi_truoc: "Bỏ" });
  });
  const cau_truc: CauTrucMau = { chuong };
  return { cau_truc, hang, canh_bao: canhBao, loi_cau_truc: kiemCauTruc(cau_truc) };
}

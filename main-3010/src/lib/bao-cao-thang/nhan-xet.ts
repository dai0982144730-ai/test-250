// ============================================================
// BÁO CÁO THÁNG — BƯỚC SOẠN NHẬN XÉT BẰNG LLM  (server-only)
//
// Khung báo cáo có sẵn những ô đánh dấu 🤖 (`laLlm: true`): *Đánh giá* ·
// *Kiến nghị* · *Kết quả cần có*. Nhưng bước soạn chúng thì CHƯA AI VIẾT —
// dựng nháp xong, mấy ô đó vẫn ghi "chưa chạy bước soạn nhận xét". File này
// là bước đó.
//
// ⛔ BA LUẬT CỨNG, đây là chỗ dễ phạm nhất của cả agent:
//
//   1. LLM CHỈ ĐƯỢC DIỄN GIẢI, KHÔNG ĐƯỢC TẠO SỐ. Prompt chỉ đưa những ô ĐÃ
//      CÓ NGUỒN của chính dòng đó. Nếu dòng không có ô nào có nguồn thì
//      KHÔNG hỏi LLM — để ô trống kèm lý do. Không có số thì không có gì để
//      nhận xét, và bịa một câu nghe hợp lý là cách nhanh nhất để mất tin.
//
//   2. 🤖 ĐỨNG TRƯỚC MỌI CHỮ LLM SINH RA (luật A.4 điều 6). Ép ngay lúc ghi
//      vào ô, không trông vào việc dặn LLM tự thêm.
//
//   3. VẾT NGUỒN của ô 🤖 nói rõ nó dựa vào ô nào của dòng nào — người đọc
//      kiểm được ngay câu chữ có bám số hay không.
//
// LLM chạy qua `runAI`, tức đi theo cấu hình Kết nối AI: gói Claude Pro/Max
// qua CLI (không tốn khoá API) hoặc HTTP API. Chưa cấu hình thì bước này báo
// rõ và KHÔNG làm hỏng bản nháp đã dựng.
// ============================================================

import { runAI } from "@/lib/ai/providers";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import {
  chuGiaTri,
  moiBang,
  oCoSo,
  oThieu,
  type Bang,
  type BaoCaoThang,
  type DongBang,
  type OSo,
} from "./model";
import { LUAT_MA_KEM_TEN, ganTenChoMa, tuDienTuDuLieu } from "@/lib/chung/ma-kem-ten";
import { LUAT_NHANH_CHAM_THEO_NGAY } from "@/lib/chung/luat-nhanh-cham";

/** Số dòng tối đa gửi LLM một lượt — prompt quá dài thì CLI chậm và dễ cắt */
const TRAN_DONG = 60; // 13/10: bảng 10 tối đa 10 vấn đề × số dự án, bảng 11 gom việc hai agent — 25 dòng không đủ

export interface KetQuaSoan {
  /** Bao nhiêu ô 🤖 đã điền được */
  soO: number;
  /** Bao nhiêu bảng đã soạn */
  soBang: number;
  /** Câu tiếng Việt khi không soạn được — hiện thẳng lên màn */
  lyDo: string | null;
}

const HE_THONG =
  "Bạn soạn phần NHẬN XÉT cho báo cáo tháng của Ban quản lý dự án điện gió Việt Nam.\n" +
  "LUẬT BẮT BUỘC:\n" +
  "1. CHỈ được diễn giải những con số đã cho. TUYỆT ĐỐI không tạo thêm số, không ước, " +
  "không suy ra ngày tháng hay tỉ lệ mới.\n" +
  "2. Mỗi dòng trả về MỘT câu tiếng Việt, tối đa 30 từ, nói thẳng vào việc.\n" +
  "3. Không có đủ số để nhận xét thì trả chuỗi rỗng cho dòng đó. Thà bỏ trống còn hơn " +
  "viết một câu chung chung nghe cho có.\n" +
  "4. Không mở đầu bằng 'Theo số liệu', 'Nhìn chung', 'Có thể thấy'. Vào thẳng.\n" +
  "5. Trả về ĐÚNG một mảng JSON, không kèm giải thích, không kèm dấu ```.\n" +
  `6. ${LUAT_MA_KEM_TEN}
` +
  `7. ${LUAT_NHANH_CHAM_THEO_NGAY}`;

/** Những ô ĐÃ CÓ NGUỒN của một dòng — đây là toàn bộ nguyên liệu LLM được phép dùng */
export function soCoNguon(bang: Bang, dong: DongBang): { nhan: string; giaTri: string }[] {
  const ra: { nhan: string; giaTri: string }[] = [];
  for (const c of bang.cot) {
    if (c.laLlm) continue;
    const o: OSo | undefined = dong.o[c.khoa];
    if (o && o.coSo) {
      ra.push({
        nhan: c.nhan,
        // chuẩn số Việt Nam (chốt 130): số đưa AI diễn giải viết «1.234,5» để câu AI chép ra cũng đúng chuẩn
        giaTri: `${chuGiaTri(o.giaTri)}${o.donVi ? " " + o.donVi : ""}`,
      });
    }
  }
  return ra;
}

interface DongHoi {
  khoa: string;
  so: { nhan: string; giaTri: string }[];
}

export function dungPrompt(bang: Bang, ds: DongHoi[], cot: { khoa: string; nhan: string }[]): string {
  const moTaCot = cot.map((c) => `"${c.khoa}": "${c.nhan}"`).join(", ");
  const dong = ds
    .map(
      (d, i) =>
        `${i + 1}. [khoa=${d.khoa}] ` +
        d.so.map((s) => `${s.nhan}: ${s.giaTri}`).join(" · "),
    )
    .join("\n");
  return (
    `BẢNG: ${bang.soHieu} — ${bang.ten}\n\n` +
    `Mỗi dòng dưới đây là số liệu THẬT đã có nguồn. Soạn cho mỗi dòng các trường: ${moTaCot}.\n\n` +
    `${dong}\n\n` +
    `Trả về mảng JSON, mỗi phần tử: {"khoa": "<đúng chuỗi khoa ở trên>", ` +
    cot.map((c) => `"${c.khoa}": "<câu tiếng Việt>"`).join(", ") +
    `}. Đúng ${ds.length} phần tử, không thừa không thiếu.`
  );
}

/** Bóc mảng JSON khỏi câu trả lời — LLM hay kèm rào ```json dù đã dặn */
export function bocMang(tho: string): Record<string, unknown>[] | null {
  const s = tho.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const dau = s.indexOf("[");
  const cuoi = s.lastIndexOf("]");
  if (dau < 0 || cuoi <= dau) return null;
  try {
    const v: unknown = JSON.parse(s.slice(dau, cuoi + 1));
    return Array.isArray(v) ? (v.filter((x) => x !== null && typeof x === "object") as Record<string, unknown>[]) : null;
  } catch {
    return null;
  }
}

/**
 * Soạn nhận xét cho MỘT bảng. Không ném lỗi — hỏng thì trả 0 ô và ghi lý do
 * vào chính các ô đó, bản nháp giữ nguyên phần số đã dựng được.
 */
async function soanMotBang(bang: Bang, nguoi: string): Promise<number> {
  const cotLlm = bang.cot.filter((c) => c.laLlm);
  if (cotLlm.length === 0) return 0;

  const ds: DongHoi[] = [];
  for (const d of bang.dong) {
    // 13/10: hàng TỔNG của dự án và hàng ĐẾM phần còn lại không phải một việc — 🤖 không soạn gì cho chúng
    if (d.loai) continue;
    const so = soCoNguon(bang, d);
    // Luật 1: dòng không có ô nào có nguồn thì KHÔNG hỏi LLM
    if (so.length === 0) {
      for (const c of cotLlm) {
        d.o[c.khoa] = oThieu(
          d.o[c.khoa].anhXa,
          "Dòng này chưa có ô số nào dẫn được nguồn — không có gì để nhận xét, và LLM không được tự nghĩ ra.",
          c.donVi,
        );
      }
      continue;
    }
    ds.push({ khoa: d.khoa, so });
  }
  if (ds.length === 0) return 0;

  const catBot = ds.slice(0, TRAN_DONG);
  const prompt = dungPrompt(
    bang,
    catBot,
    cotLlm.map((c) => ({ khoa: c.khoa, nhan: c.nhan })),
  );

  let tho = "";
  try {
    tho = await goiCoGhi(
      {
        agentTraLoi: "llm",
        congCu: `baocao.nhan_xet_thang_b${bang.soHieu}`,
        thamSo: { bang: bang.soHieu, so_dong: catBot.length },
        lyDoGoi: `soạn nhận xét 🤖 cho bảng ${bang.soHieu} của báo cáo tháng (PLAN-MAIN-AGENT mục 2)`,
        duong: "tay",
        nguoi,
      },
      () => runAI(prompt, HE_THONG),
      () => ({ nguonDan: `bảng ${bang.soHieu} · ${catBot.length} dòng đã có nguồn` }),
    );
  } catch (e) {
    const loi = e instanceof Error ? e.message : "lỗi không rõ";
    for (const d of bang.dong) {
      for (const c of cotLlm) {
        d.o[c.khoa] = oThieu(d.o[c.khoa].anhXa, `Chưa soạn được nhận xét: ${loi}`, c.donVi);
      }
    }
    return 0;
  }

  const mang = bocMang(tho);
  if (!mang) {
    for (const d of bang.dong) {
      for (const c of cotLlm) {
        d.o[c.khoa] = oThieu(
          d.o[c.khoa].anhXa,
          "LLM trả lời không đúng khuôn JSON — không đọc được thành từng dòng.",
          c.donVi,
        );
      }
    }
    return 0;
  }

  const theoKhoa = new Map<string, Record<string, unknown>>();
  for (const m of mang) {
    const k = typeof m.khoa === "string" ? m.khoa : "";
    if (k !== "") theoKhoa.set(k, m);
  }

  const luc = new Date().toISOString();
  const tuDienBang = tuDienTuDuLieu(bang);
  let dem = 0;
  for (const d of bang.dong) {
    if (d.loai) continue;
    const m = theoKhoa.get(d.khoa);
    const so = soCoNguon(bang, d);
    for (const c of cotLlm) {
      const v = m?.[c.khoa];
      // Lưới an toàn "mã kèm tên" (26/09): báo cáo tháng vắt nhiều dự án → chỉ dùng cặp mã–tên có trong chính bảng
      const chu = typeof v === "string" ? ganTenChoMa(v.trim(), tuDienBang) : "";
      if (chu === "") {
        d.o[c.khoa] = oThieu(
          d.o[c.khoa].anhXa,
          "LLM không soạn câu nào cho dòng này — đúng luật thì để trống còn hơn viết cho có.",
          c.donVi,
        );
        continue;
      }
      // Luật 2: ép 🤖 ngay lúc ghi, không trông vào LLM tự thêm
      d.o[c.khoa] = oCoSo(
        chu.startsWith("🤖") ? chu : `🤖 ${chu}`,
        d.o[c.khoa].anhXa,
        {
          // Luật 3: vết nói rõ câu này dựa vào ô nào
          moTa: `🤖 LLM soạn từ ${so.length} ô đã có nguồn của chính dòng này: ${so
            .map((x) => x.nhan)
            .join(" · ")}`,
          thoiDiem: luc,
        },
        c.donVi,
      );
      dem += 1;
    }
  }
  return dem;
}

/**
 * SOẠN NHẬN XÉT CHO CẢ BẢN BÁO CÁO.
 *
 * Chạy TUẦN TỰ từng bảng, cố ý: đường CLI của gói Pro/Max chạy một tiến trình
 * một lúc (có khoá tuần tự bên trong), bắn song song chỉ làm chúng xếp hàng
 * mà lại khó đọc lỗi hơn.
 */
export async function soanNhanXet(
  bc: BaoCaoThang,
  nguoi: string,
): Promise<KetQuaSoan> {
  const bang = moiBang(bc).filter((b) => b.cot.some((c) => c.laLlm));
  if (bang.length === 0) return { soO: 0, soBang: 0, lyDo: "Báo cáo không có ô 🤖 nào." };

  let soO = 0;
  for (const b of bang) soO += await soanMotBang(b, nguoi);

  bc.thoiDiemSoanNhanXet = new Date().toISOString();
  return {
    soO,
    soBang: bang.length,
    lyDo:
      soO === 0
        ? "Không ô 🤖 nào soạn được — xem lý do ghi trong từng ô (thường là chưa cấu hình Kết nối AI, hoặc dòng chưa có số nào có nguồn)."
        : null,
  };
}

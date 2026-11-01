// ============================================================
// cay-viec/soan-giao.ts — NÚT GĂNG CHƯA AI ĐƯỢC GIAO: 🤖 AI soạn sẵn người nhận, NGƯỜI bấm "Giao việc" mới ghi (chép route
// /api/cay-viec/soan-giao của agent Base, Mr. Đại chốt 10/09). CHỈ SERVER.
//   · soạn: LLM rà lịch sử "loại việc này thường ai làm" = việc trong sổ cái ĐÃ gắn mã cùng giai đoạn cấp 1 (không có thì nới
//     ra toàn dự án), kèm người/đơn vị chủ trì. CHỈ được chọn người có trong lịch sử — code kiểm lại, AI bịa thì không dùng.
//   · CHỨC NĂNG NHIỆM VỤ (db/81, chốt 03/10): LLM đọc thêm chức năng từng đơn vị + phân công lãnh đạo → được chọn cả đơn vị
//     theo chức năng (kể cả khi chưa có lịch sử), kèm đơn vị PHỐI HỢP và LÃNH ĐẠO PHỤ TRÁCH. Mã nào cũng phải có trong danh sách
//     code đưa vào — bịa thì bỏ. Phối hợp/lãnh đạo hiện trong căn cứ (chữ), người bấm Giao mới thành việc thật.
//   · giao: tạo việc giao tay THẬT trong sổ cái qua giaoViec (người giao = người bấm, quyền "Giao việc" + phạm vi giao kiểm
//     ở đó), rồi gắn ngay việc mới vào mã WBS của nút (nguồn 'nguoi') để nút đổi sang "đã có việc".
// Chốt an toàn mục 9: AI KHÔNG tự ghi — nhánh giao chỉ chạy sau cú bấm của người.
// ============================================================
import type { Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { giaoViec } from "@/lib/so-cai/dich-vu";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { ganTenWbs } from "@/lib/gan-wbs/thuan";
import { ketQuaMacDinhGang } from "./thuan";
import { viecSoCaiCuaDuAn, homNayVN } from "./doc-so-cai";
import { docChucNang, type ChucNangDonVi } from "@/lib/chuc-nang-don-vi";

export type GoiAi = (prompt: string, system: string) => Promise<string>;

export interface DeXuatGiao {
  /** Mã người (email) hoặc mã đơn vị */
  giao_cho: string;
  loai: "nguoi" | "don_vi";
  /** Tên thật — màn hiện tên, không hiện email trần */
  ten_day_du: string;
  /** Thay "nơi làm việc / không gian Base": việc mới thuộc dự án nào */
  du_an_ten: string;
  can_cu: string;
}

export const HE_THONG_SOAN =
  "Bạn chọn NƠI GIAO VIỆC cho một đầu việc trên đường găng của dự án năng lượng (điện gió, thủy điện, điện mặt trời), dựa vào " +
  "(1) CHỨC NĂNG NHIỆM VỤ của các đơn vị và phân công Ban lãnh đạo, (2) lịch sử ai thường làm LOẠI việc tương tự. " +
  "Chức năng nhiệm vụ là căn cứ chính; lịch sử dùng để chọn đúng người/đơn vị cụ thể khi có. " +
  "CHỈ được dùng mã có trong danh sách đưa vào. Lãnh đạo phụ trách chọn trong mục BAN LÃNH ĐẠO, theo đúng phân công " +
  "(việc pháp lý: xem dự án do BQLDA nào triển khai). " +
  'Trả DUY NHẤT một JSON: {"ma":"<mã người hoặc đơn vị CHỦ TRÌ>","phoi_hop":["<mã đơn vị phối hợp>"],"lanh_dao":"<mã lãnh đạo phụ trách hoặc rỗng>",' +
  '"ly_do":"một câu tiếng Việt: dòng chức năng nào / lịch sử nào cho thấy nơi này phải làm"}. phoi_hop tối đa 2, không cần thì []. ' +
  "Không viết gì khác. Nhắc mã WBS thì luôn kèm tên ngắn (vd \"7.2.3 Thi công san nền\"), không bao giờ chỉ viết mã.";

const ngayVN = (iso: string) => {
  const [n, t, ng] = iso.slice(0, 10).split("-");
  return ng && t && n ? `${ng}/${t}/${n}` : iso;
};

export async function soanDeXuat(
  q: Q,
  dsDuAn: CauHinh["du_an"],
  duAn: { id: string; ten: string },
  dau: { ma_wbs: string; ten: string; han?: string | null },
  tenTheoMa: Map<string, string>,
  goiAi: GoiAi,
): Promise<{ ok: true; de_xuat: DeXuatGiao } | { ok: false; thong_diep: string }> {
  const giaiDoan = dau.ma_wbs.split(".")[0];
  const viec = (await viecSoCaiCuaDuAn(q, dsDuAn, duAn.id, null)).filter((v) => v.maWbs && !v.aiGanChuaSoat && v.nguoiPhuTrach && v.loaiPhuTrach); // chỉ mã ĐÃ DUYỆT (chốt 03/10)
  const ung = new Map<string, { loai: "nguoi" | "don_vi"; ten: string }>();
  for (const v of viec) ung.set(v.nguoiPhuTrach, { loai: v.loaiPhuTrach as "nguoi" | "don_vi", ten: v.tenNguoi });
  let lichSu = viec.filter((v) => (v.maWbs as string).split(".")[0] === giaiDoan).slice(0, 60);
  const cungGiaiDoan = lichSu.length > 0;
  if (!cungGiaiDoan) lichSu = viec.slice(0, 60);
  // Chức năng nhiệm vụ + đơn vị triển khai dự án (BQLDA/BĐH chưa ghi chức năng vẫn được chọn chủ trì)
  const cauHinhDa = dsDuAn.find((d) => d.id === duAn.id);
  const maDvDuAn = [...(cauHinhDa?.don_vi ?? []), ...(cauHinhDa?.ban_dieu_hanh ? [cauHinhDa.ban_dieu_hanh] : [])];
  const cn = await docChucNang(q);
  const dvDuAn = maDvDuAn.length
    ? (await q.query<ChucNangDonVi>("SELECT id, ten, loai, cha_id, COALESCE(chuc_nang, '') AS chuc_nang FROM identity.don_vi WHERE active AND id = ANY($1)", [maDvDuAn])).rows
    : [];
  const lanhDao = cn.filter((d) => d.loai === "chuc_danh");
  const donVi = [...cn.filter((d) => d.loai !== "chuc_danh"), ...dvDuAn.filter((d) => !cn.some((c) => c.id === d.id))];
  for (const d of donVi) if (!ung.has(d.id)) ung.set(d.id, { loai: "don_vi", ten: d.ten });

  if (!lichSu.length && !donVi.length) {
    return {
      ok: false,
      thong_diep:
        "Chưa có căn cứ: dự án chưa có việc nào gắn mã đã duyệt, và chưa đơn vị nào ghi chức năng nhiệm vụ (Cài đặt › Tổ chức & người dùng) — chọn người tay.",
    };
  }
  const motDong = (x: string) => x.replace(/\s*\n\s*/g, " ");
  const tenDvDuAn = dvDuAn.map((d) => d.ten).join(", ");
  const prompt =
    `ĐẦU VIỆC CẦN GIAO: ${dau.ma_wbs} ${dau.ten} (giai đoạn ${giaiDoan}${tenTheoMa.get(giaiDoan) ? ` ${tenTheoMa.get(giaiDoan)}` : ""}, hạn ${dau.han ? ngayVN(dau.han) : "—"})\n` +
    `DỰ ÁN: ${duAn.ten}${tenDvDuAn ? ` — đơn vị triển khai: ${tenDvDuAn}` : ""}\n\n` +
    `BAN LÃNH ĐẠO (mã | chức danh · tên | phân công):\n` +
    (lanhDao.length ? lanhDao.map((d) => `${d.id} | ${d.ten} | ${motDong(d.chuc_nang)}`).join("\n") : "(chưa ghi)") +
    `\n\nĐƠN VỊ (mã | tên | chức năng nhiệm vụ):\n` +
    donVi.map((d) => `${d.id} | ${d.ten} | ${d.chuc_nang ? motDong(d.chuc_nang) : "(chưa ghi chức năng — đơn vị triển khai dự án này)"}`).join("\n") +
    `\n\nLỊCH SỬ VIỆC ĐÃ GẮN MÃ (tên việc | mã người/đơn vị (tên thật) | mã WBS):\n` +
    (lichSu.length
      ? lichSu.map((v) => `${v.ten} | ${v.nguoiPhuTrach} (${v.tenNguoi}) | ${v.maWbs} ${tenTheoMa.get(v.maWbs as string) ?? ""}`.trim()).join("\n")
      : "(chưa có việc nào gắn mã đã duyệt)");
  let d: { ma?: unknown; ly_do?: unknown; phoi_hop?: unknown; lanh_dao?: unknown };
  try {
    const traLoi = await goiAi(prompt, HE_THONG_SOAN);
    const dauNgoac = traLoi.indexOf("{");
    const cuoi = traLoi.lastIndexOf("}");
    if (dauNgoac < 0 || cuoi <= dauNgoac) throw new Error("AI không trả JSON");
    d = JSON.parse(traLoi.slice(dauNgoac, cuoi + 1));
  } catch (e) {
    return { ok: false, thong_diep: `🤖 Chưa gọi được AI: ${e instanceof Error ? e.message : "lỗi không rõ"}.` };
  }
  const ma = String(d.ma ?? "").replace(/^@/, "").trim();
  const ai = ung.get(ma);
  if (!ma || !ai) return { ok: false, thong_diep: `AI trả "${ma}" không có trong lịch sử việc hay danh sách đơn vị — không dùng, chọn tay.` };
  const tenDv = new Map(donVi.map((x) => [x.id, x.ten]));
  const phoiHop = (Array.isArray(d.phoi_hop) ? d.phoi_hop : [])
    .map((x) => String(x).trim())
    .filter((x, i, arr) => x !== ma && tenDv.has(x) && arr.indexOf(x) === i)
    .slice(0, 2)
    .map((x) => tenDv.get(x) as string);
  const ld = lanhDao.find((x) => x.id === String(d.lanh_dao ?? "").trim());
  const lyDo = ganTenWbs(String(d.ly_do ?? "").trim(), tenTheoMa);
  const tenGd = tenTheoMa.get(giaiDoan);
  const gd = tenGd ? `${giaiDoan} ${tenGd.split(/\s+/).slice(0, 8).join(" ")}` : giaiDoan;
  const soCoCn = donVi.filter((x) => x.chuc_nang).length;
  const canCuNguon = [
    soCoCn ? `chức năng nhiệm vụ ${soCoCn} đơn vị` : "",
    lichSu.length ? `rà ${lichSu.length} việc đã gắn mã${cungGiaiDoan ? ` giai đoạn ${gd}` : " toàn dự án"}` : "",
  ].filter(Boolean);
  return {
    ok: true,
    de_xuat: {
      giao_cho: ma,
      loai: ai.loai,
      ten_day_du: ai.ten,
      du_an_ten: duAn.ten,
      can_cu:
        `🤖 ${lyDo || "nơi thường nhận loại việc này"}` +
        (phoiHop.length ? ` · Phối hợp: ${phoiHop.join(", ")}` : "") +
        (ld ? ` · Lãnh đạo phụ trách: ${ld.ten}` : "") +
        ` (căn cứ: ${canCuNguon.join(" · ")})`,
    },
  };
}

/** Tên thật của người / đơn vị — người bấm "Sửa" gõ tay mã thì máy tra lại, mã lạ thì báo */
export async function tenPhuTrach(q: Q, ma: string): Promise<{ loai: "nguoi" | "don_vi"; ten: string } | null> {
  const n = (await q.query<{ ten: string }>("SELECT ten FROM identity.nguoi_dung WHERE id = $1 OR lower(email) = lower($1) LIMIT 1", [ma])).rows[0];
  if (n) return { loai: "nguoi", ten: n.ten };
  const d = (await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [ma])).rows[0];
  return d ? { loai: "don_vi", ten: d.ten } : null;
}

/** NGƯỜI bấm "Giao việc" → tạo việc thật trong sổ cái + gắn mã WBS của nút. Trả mã việc mới. */
export async function giaoTuCay(
  q: Q,
  nd: NguoiDungPhien,
  /** null = việc không thuộc dự án nào (agent khác gửi, dự án không bắt buộc như ô "+" — Mr. Đại chốt 04/10 chiều) */
  duAn: { id: string; ten: string } | null,
  g: {
    ma_wbs: string;
    ten: string;
    ten_wbs?: string;
    han?: string | null;
    giao_cho: string;
    can_cu?: string;
    /** Người bấm Sửa rồi giao (Mr. Đại chốt 04/10): tên việc / kết quả cần có ĐÚNG như người đã sửa, kèm tệp kẹp */
    ten_day_du?: string;
    ket_qua?: string;
    dinh_kem?: string[];
  },
  /** 04/10 (CHOT 6g.7 mục 2): việc do AI agent khác đề xuất, người đã duyệt ở agent đó — câu nguồn khác câu "đường găng" */
  tu?: { maAgent: string; tenAgent: string; khongAi?: boolean },
): Promise<string> {
  let ma = g.giao_cho.replace(/^@/, "").trim();
  const pt = await tenPhuTrach(q, ma);
  if (!pt) throw new LoiHttp(400, `Không có người hay đơn vị "${ma}" trong danh bạ — gõ email tài khoản hoặc mã đơn vị`);
  if (pt.loai === "nguoi") {
    const id = (await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE id = $1 OR lower(email) = lower($1) LIMIT 1", [ma])).rows[0];
    ma = id?.id ?? ma;
  }
  const han = g.han ? g.han.slice(0, 10) : null;
  const homNay = homNayVN();
  // Câu nguồn khi việc đến từ agent khác — luôn ghi, kể cả khi người đã sửa "Kết quả cần có" (biết việc từ đâu ra)
  // khongAi: chữ do máy ghép (vd nút Giao việc ở Bảng điều hành Main) — không gắn 🤖 (luật 19)
  const nguonTu = tu
    ? (tu.khongAi ? `${tu.tenAgent} đề xuất (máy ghép, không qua AI), ` : `🤖 AI ${tu.tenAgent} đề xuất, `) + `${nd.ten} duyệt và giao tại ${tu.tenAgent}.`
    : "";
  const kqSua = g.ket_qua?.trim() ?? "";
  const maViec = await giaoViec(q, nd, {
    ten: g.ten_day_du?.trim() || (tu ? (duAn ? `[${duAn.ten}] ${g.ten}` : g.ten) : `[${duAn?.ten ?? ""}] Xử lý ${g.ma_wbs} — ${g.ten}`),
    ...(duAn ? { du_an: duAn.ten } : {}),
    ket_qua_can_co: kqSua
      ? kqSua + (nguonTu ? `\n\n${nguonTu}` : "")
      : tu
      ? `${nguonTu}\n` +
        (g.ma_wbs ? `Mã WBS: ${g.ma_wbs}.\n` : "") +
        (g.can_cu ? `Căn cứ đề xuất: ${g.can_cu}\n` : "") +
        `Hạn: ${han ? ngayVN(han) : "—"}.`
      : `${ketQuaMacDinhGang(g.ma_wbs, g.ten, g.can_cu)}\nHạn = ngày xong theo tiến độ: ${han ? ngayVN(han) : "—"}.`,
    bat_dau: han && han < homNay ? han : homNay,
    ket_thuc: han,
    phan_viec: [{ loai: pt.loai, id: ma, ten: pt.ten, ket_thuc: han }],
    la_quyet_dinh: false,
    tu_tai_lieu: null,
    ...(g.dinh_kem?.length ? { dinh_kem: g.dinh_kem } : {}),
  });
  // Agent đề xuất chưa gắn mã WBS (hoặc việc không thuộc dự án) → việc vẫn tạo, chỉ không gắn mã
  if (!g.ma_wbs || !duAn) return maViec;
  await q.query(
    `INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai, nguoi_duyet, luc_duyet)
     VALUES ($1,$2,$3,$4,$5,NULL,'nguoi','da_duyet',$6, now()) ON CONFLICT (cong_viec_id) DO NOTHING`,
    [
      maViec,
      duAn.id,
      g.ma_wbs,
      g.ten_wbs ?? g.ten,
      tu ? `✎ ${tu.tenAgent} đề xuất mã, ${nd.ten} duyệt khi giao` : "✎ giao từ màn Cây việc & đường găng",
      nd.id,
    ],
  );
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: maViec,
    hanh_dong: "gan_wbs",
    chi_tiet: { truoc: null, sau: { ma_wbs: g.ma_wbs, ten_wbs: g.ten_wbs ?? g.ten }, tu: tu ? `agent:${tu.maAgent}` : "cay-viec" },
  });
  return maViec;
}

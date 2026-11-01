// ============================================================
// Ô "GIAO CHO" — dựng danh sách nơi nhận (Mr. Đại chốt 04/10/2026 tối, bản GỌN thay bản 4 nhóm "khó dùng").
// THUẦN — không đọc CSDL, bài kiểm gọi được. Chỉ hiện nơi NGƯỜI BẤM GIAO ĐƯỢC — khớp đúng batBuocTrongPhamVi (so-cai/dich-vu.ts):
//   · bấm vào ô → `lanh_dao` (Ban lãnh đạo, TRỪ trợ lý) + `cay` (đơn vị theo sơ đồ, thụt lề theo cấp) — trong phạm vi Giao việc
//   · gõ "@"    → `ca_nhan`: người giao ĐÍCH DANH được. Phạm vi "toàn bộ" (lãnh đạo / quản trị) = cả công ty; còn lại (trưởng đơn
//                 vị) = người cùng đơn vị chính + kiêm nhiệm VÀ thuộc phạm vi giao (luật giao đích danh 30/09) + chính mình
// ============================================================

export interface DonViNoiNhan {
  id: string;
  ten: string;
  ten_ngan: string | null;
  cap: number | null;
  cha_id: string | null;
  loai: string | null;
  thu_tu: number | null;
}

export interface NguoiNoiNhan {
  id: string;
  ten: string;
  dv: string | null;
  don_vi_ids: string[];
}

export interface NhomNoiNhan {
  /** id đơn vị chức danh Ban lãnh đạo (trừ trợ lý), thứ tự sơ đồ */
  lanh_dao: string[];
  /** id đơn vị (không chức danh, không Ban TGĐ) theo thứ tự cây + độ thụt */
  cay: { id: string; thut: number }[];
  /** id người giao đích danh được (gồm chính mình — tự giao cho mình luôn được) */
  ca_nhan: string[];
}

const laTroLy = (d: DonViNoiNhan) => /^trợ lý/i.test(d.ten.trim()) || /^trợ lý/i.test((d.ten_ngan ?? "").trim());
const laChucDanh = (d: DonViNoiNhan) => d.loai === "chuc_danh";
const laBanTgd = (d: DonViNoiNhan) => d.loai === "ban_tgd";

export function dungNhomNoiNhan(
  donVi: DonViNoiNhan[],
  nguoi: NguoiNoiNhan[],
  nguoiBam: { id: string; don_vi_ids: string[] },
  phamVi: "tat_ca" | string[],
): NhomNoiNhan {
  const trongPv = (id: string) => phamVi === "tat_ca" || phamVi.includes(id);
  const theoId = new Map(donVi.map((d) => [d.id, d]));
  const thuTu = (a: DonViNoiNhan, b: DonViNoiNhan) => (a.thu_tu ?? 0) - (b.thu_tu ?? 0) || a.ten.localeCompare(b.ten, "vi");

  const lanh_dao = donVi.filter((d) => laChucDanh(d) && !laTroLy(d) && trongPv(d.id)).sort(thuTu).map((d) => d.id);

  // Cây đơn vị: đi theo cha → con (thứ tự sơ đồ); Ban TGĐ và chức danh không hiện, con của Ban TGĐ đứng ở độ thụt 0
  const con = new Map<string | null, DonViNoiNhan[]>();
  for (const d of donVi) {
    const k = d.cha_id && theoId.has(d.cha_id) ? d.cha_id : null;
    con.set(k, [...(con.get(k) ?? []), d]);
  }
  const cay: NhomNoiNhan["cay"] = [];
  const di = (cha: string | null, thut: number) => {
    for (const d of (con.get(cha) ?? []).sort(thuTu)) {
      if (laChucDanh(d)) continue;
      const an = laBanTgd(d);
      if (!an && trongPv(d.id)) cay.push({ id: d.id, thut });
      di(d.id, an ? thut : thut + 1);
    }
  };
  di(null, 0);

  // Người giao đích danh được — cùng hai điều kiện máy chủ kiểm lúc giao (đo 04/10: bản 4 nhóm chặt hơn máy chủ, lãnh đạo chỉ thấy 5/52 người)
  const dvToi = new Set(nguoiBam.don_vi_ids);
  const ca_nhan = nguoi
    .filter((n) => phamVi === "tat_ca" || n.id === nguoiBam.id || (n.don_vi_ids.some((d) => dvToi.has(d)) && n.don_vi_ids.some(trongPv)))
    .map((n) => n.id);

  return { lanh_dao, cay, ca_nhan };
}

/**
 * Hộp «Giao cho cá nhân» (Mr. Đại chốt 29/10/2026): người giao ĐÍCH DANH được (`ca_nhan` của dungNhomNoiNhan), xếp theo đơn vị.
 * Người chỉ đứng ở ô chức danh (lãnh đạo, trợ lý…) / Ban TGĐ vào nhóm «Ban lãnh đạo» đứng đầu; còn lại theo thứ tự cây đơn vị,
 * mỗi người ở đơn vị chính (không có thì đơn vị kiêm nhiệm đầu tiên). Trong nhóm xếp A–Z theo TÊN RIÊNG.
 */
export interface NhomCaNhan {
  don_vi_id: string;
  don_vi: string;
  nguoi: { id: string; ten: string; toi?: boolean }[];
}
export function nhomCaNhanTheoDonVi(donVi: DonViNoiNhan[], nguoi: NguoiNoiNhan[], caNhan: string[], nguoiBamId: string): NhomCaNhan[] {
  const theoId = new Map(donVi.map((d) => [d.id, d]));
  const thuTuDv = new Map(donVi.map((d, i) => [d.id, i]));
  const chon = new Set(caNhan);
  const ten = (ho: string) => ho.trim().split(/\s+/).pop() ?? ho;
  const nhom = new Map<string, NhomCaNhan>();
  const LD = "@ban-lanh-dao";
  for (const n of nguoi) {
    if (!chon.has(n.id)) continue;
    const thuong = n.don_vi_ids.find((d) => {
      const x = theoId.get(d);
      return x && !laChucDanh(x) && !laBanTgd(x);
    });
    const k = thuong ?? LD;
    if (!nhom.has(k)) nhom.set(k, { don_vi_id: k, don_vi: k === LD ? "Ban lãnh đạo" : (theoId.get(k)?.ten_ngan ?? theoId.get(k)?.ten ?? k), nguoi: [] });
    nhom.get(k)!.nguoi.push({ id: n.id, ten: n.ten, ...(n.id === nguoiBamId ? { toi: true } : {}) });
  }
  for (const g of nhom.values()) g.nguoi.sort((a, b) => ten(a.ten).localeCompare(ten(b.ten), "vi") || a.ten.localeCompare(b.ten, "vi"));
  return [...nhom.values()].sort((a, b) => (a.don_vi_id === LD ? -1 : b.don_vi_id === LD ? 1 : (thuTuDv.get(a.don_vi_id) ?? 9e3) - (thuTuDv.get(b.don_vi_id) ?? 9e3)));
}

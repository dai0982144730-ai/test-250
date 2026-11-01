// ============================================================
// Dựng một việc sổ cái ĐÚNG NHƯ khu phải màn Sơ đồ (đang đứng ở ô gốc Ban lãnh đạo) — để "Việc của tôi" ở Main · Tiến độ ·
// Hợp đồng hiện y hệt (Mr. Đại chốt 07/10/2026: khu phải các agent giống khu phải agent Công việc tới từng dấu › và !).
// Không viết lại luật: dùng nguyên chuyenViec / taoDoiViec / xepSoDo / khoangViecLamXong của màn Sơ đồ (luật 7).
//   · tt + ttChu: "quá hạn N ngày" · "đến hạn hôm nay" · "còn N ngày" · "Xong ngày dd/mm/yyyy" — cùng ngưỡng 3 ngày của màn
//   · nhóm: "Của riêng Ban lãnh đạo" rồi từng đơn vị cấp 2 theo thứ tự sơ đồ (việc thuộc cây con của đơn vị đó)
// CHỈ SERVER (đọc sổ sơ đồ trong database).
// ============================================================
import type { Q } from "@/lib/db";
import { duLieuSoDo } from "./so-do";
import { oTatCaCua, taoDoiViec } from "@/components/phong/doi-viec";
import { xepSoDo } from "@/components/phong/bo-cuc";
import { khoangViecLamXong, type ViecApi, type ViecO } from "@/components/phong/viec";

export interface BoHienViec {
  doi: (v: ViecApi) => ViecO;
  nhomCua: (v: ViecO) => { ten: string; thu_tu: number };
  /** Khối "Việc làm xong: Tuần N−1 và N" cuối mỗi nhóm */
  lamXong: { tu: string; den: string; nhan: string; giai_thich: string };
}

export async function boHienViec(q: Q, homNay: string): Promise<BoHienViec> {
  const goc0 = await duLieuSoDo(q, homNay);
  const dl = { ...goc0, hom_nay: homNay };
  const oTat = oTatCaCua(dl);
  const bc = xepSoDo(oTat.map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu })));
  const theoId = Object.fromEntries(oTat.map((o) => [o.id, o]));
  const cayCon = (id: string): string[] => [id, ...(bc.con[id] ?? []).flatMap(cayCon)];
  const goc = bc.goc;
  const con = goc ? (bc.con[goc] ?? []) : [];
  const tapCon = con.map((c) => ({ ten: theoId[c]?.ten ?? c, s: new Set(cayCon(c)) }));
  return {
    doi: taoDoiViec(dl, bc, theoId),
    nhomCua: (v) => {
      if (goc && v.nut.includes(goc)) return { ten: con.length ? "Của riêng Ban lãnh đạo" : "Ban lãnh đạo", thu_tu: 0 };
      const i = tapCon.findIndex((c) => v.nut.some((n) => c.s.has(n)));
      return i >= 0 ? { ten: tapCon[i]!.ten, thu_tu: i + 1 } : { ten: "Chưa gắn đơn vị", thu_tu: 9999 };
    },
    lamXong: khoangViecLamXong(goc0.tuan, homNay),
  };
}

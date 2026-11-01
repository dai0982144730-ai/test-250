// ============================================================
// Mã các việc sổ cái đang gắn (đã duyệt) vào một đầu việc GĂNG, mọi dự án có cây WBS — dấu "!" đỏ trước tên việc chưa xong
// (Mr. Đại chốt 05/10/2026). "Găng" lấy đúng nguồn của màn Cây việc: cờ critical trong cây đầu việc agent Tiến độ (layHetDauViec —
// qua lớp ghi sổ, luật 29, nhớ tạm 10 phút) · việc gắn mã theo gomTheoWbs. Việc chưa gắn mã WBS thì không biết găng hay không.
// Dự án hỏi Tiến độ không được thì bỏ qua và trả tên dự án đó trong `thieu`.
// Dùng chung: /api/phong/viec-gang (màn Dự án · Sơ đồ) và cửa base.viec_cua_toi (Việc của tôi ở Main · Tiến độ · Hợp đồng, 07/10).
// CHỈ SERVER.
// ============================================================
import { tx } from "@/lib/db";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import type { NguoiDungPhien } from "@/lib/types";
import { layHetDauViec } from "@/lib/tien-do-dau-viec";
import { viecSoCaiCuaDuAn } from "@/lib/cay-viec/doc-so-cai";
import { gomTheoWbs, type DauViecCay } from "@/lib/cay-viec/thuan";

export async function idsViecGang(
  dsDuAn: CauHinh["du_an"],
  nd: NguoiDungPhien | null,
  lyDo: (tenDuAn: string) => string,
): Promise<{ ids: Set<string>; thieu: string[] }> {
  const ids = new Set<string>();
  const thieu: string[] = [];
  await Promise.all(
    dsDuAn
      .filter((d) => d.ma_tien_do)
      .map(async (da) => {
        const [ket, viec] = await Promise.all([layHetDauViec(da.ma_tien_do!, lyDo(da.ten)), tx((q) => viecSoCaiCuaDuAn(q, dsDuAn, da.id, nd))]);
        if (!ket.ok) {
          thieu.push(da.ten);
          return;
        }
        const tasks = ((ket.du_lieu as { tasks?: DauViecCay[] }).tasks ?? []) as DauViecCay[];
        const { theoWbs } = gomTheoWbs(viec);
        for (const t of tasks) {
          if (t.critical !== true || !t.wbs) continue;
          for (const v of theoWbs.get(t.wbs) ?? []) if (!v.daXong) ids.add(v.id);
        }
      }),
  );
  return { ids, thieu };
}

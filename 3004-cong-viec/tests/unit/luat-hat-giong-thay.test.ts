// Luật mẫu đổi mã (AI → code) thì bản cũ đã gieo, chưa ai sửa, tự TẮT (không xóa); bản đã sửa tay giữ nguyên.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { query, layQ } from "@/lib/db";
import { hatGiongLuat } from "@/lib/luat/hat-giong";

describe("gieo luật mẫu: tắt luật mẫu cũ đã bị thay", () => {
  beforeAll(async () => {
    await csdlMoi();
  });

  it("luật mẫu cũ không còn trong bộ mới → tắt; đã sửa tay → giữ", async () => {
    const q = await layQ();
    const { rows: mot } = await query<{ id: string; ma: string }>(
      "SELECT id, ma FROM docflow.luat_kiem_tra WHERE id LIKE 'luat-mau-%' AND bat ORDER BY id LIMIT 2",
    );
    expect(mot.length).toBe(2);
    const [cu, daSua] = mot;
    // Giả lập: hai luật này thuộc bộ cũ (mã không còn trong LUAT_MAU)
    await query("UPDATE docflow.luat_kiem_tra SET ma = ma || '-ban-cu' WHERE id = ANY($1)", [[cu.id, daSua.id]]);
    await query("UPDATE docflow.luat_kiem_tra SET phien_ban = 2 WHERE id = $1", [daSua.id]);
    await query(
      `UPDATE docflow.luat_danh_dau SET gia_tri = gia_tri || $1::jsonb WHERE khoa = (SELECT khoa FROM docflow.luat_danh_dau WHERE khoa LIKE '%mau%' LIMIT 1)`,
      [JSON.stringify([cu.ma + "-ban-cu", daSua.ma + "-ban-cu"])],
    );
    await hatGiongLuat(q);
    const { rows } = await query<{ id: string; bat: boolean; da_xoa: boolean }>(
      "SELECT id, bat, da_xoa FROM docflow.luat_kiem_tra WHERE id = ANY($1)",
      [[cu.id, daSua.id]],
    );
    const theoId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(theoId[cu.id]).toMatchObject({ bat: false, da_xoa: false });
    expect(theoId[daSua.id]).toMatchObject({ bat: true });
    // Chạy lại lần nữa không đổi gì thêm
    await hatGiongLuat(q);
    const { rows: n } = await query<{ n: number }>("SELECT count(*)::int n FROM docflow.luat_kiem_tra WHERE bat = false AND id = $1", [cu.id]);
    expect(n[0].n).toBe(1);
  });
});

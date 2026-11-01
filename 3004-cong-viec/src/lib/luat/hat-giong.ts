// ============================================================
// luat/hat-giong.ts — GIEO BỘ LUẬT (idempotent). Chủ: agent luat-loi. Gọi từ kiem-tra/hat-giong.ts (sau khi gieo mẫu).
//   · 9 luật hệ thống từ cấu hình luat_kiem_tra.luat hiện có (giữ bat/muc/ap_dung), loai 'he_thong', không xóa được;
//   · luật mẫu LUAT_MAU (src/lib/luat/luat-mau.ts, agent luat-mau) — mỗi mã gieo MỘT lần (đánh dấu trong
//     luat_danh_dau), quản trị xóa rồi thì không gieo lại.
// ============================================================
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { DAU_LUAT_MAU, DAU_MOC_CAU_HINH, docDanhDau, dongBoTuCauHinh, ghiDanhDau, trichMoc } from "./kho-luat";
import type { LuatNhap } from "./types";
import { ghiLichSu } from "@/lib/lich-su/ghi";

const HE_THONG = "he-thong";

async function chen(q: Q, id: string, l: Omit<LuatNhap, "id">, heThong: boolean, thuTu: number): Promise<boolean> {
  const { rows } = await q.query<Record<string, unknown>>(
    `INSERT INTO docflow.luat_kiem_tra (id, ma, ten, cau_luat, mo_ta, he_thong, cach_kiem, loai, tham_so, huong_dan_ai, ap_dung, muc,
       khi_ai_loi, bat, nhom, thu_tu, phien_ban, tao_boi, sua_boi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12,$13,$14,$15,$16,1,$17,$17)
     ON CONFLICT DO NOTHING RETURNING *`,
    [
      id,
      l.ma,
      l.ten,
      l.cau_luat ?? l.ten,
      l.mo_ta ?? null,
      heThong,
      ["code", "ai", "ca_hai"].includes(l.cach_kiem) ? l.cach_kiem : "code",
      l.loai ?? null,
      l.tham_so == null ? null : JSON.stringify(l.tham_so),
      l.huong_dan_ai ?? null,
      JSON.stringify(l.ap_dung ?? "tat_ca"),
      ["chan", "canh_bao", "goi_y"].includes(l.muc) ? l.muc : "canh_bao",
      l.khi_ai_loi === "chan" ? "chan" : "cho_gui",
      l.bat !== false,
      l.nhom ?? null,
      thuTu,
      HE_THONG,
    ],
  );
  const r = rows[0];
  if (!r) return false;
  const giaTri = {
    ...r,
    tao_luc: new Date(r.tao_luc as string).toISOString(),
    sua_luc: new Date(r.sua_luc as string).toISOString(),
  };
  await q.query(
    `INSERT INTO docflow.luat_kiem_tra_phien_ban (luat_id, phien_ban, gia_tri, boi, ghi_chu) VALUES ($1, 1, $2::jsonb, $3, 'gieo sẵn')
     ON CONFLICT (luat_id, phien_ban) DO NOTHING`,
    [id, JSON.stringify(giaTri), HE_THONG],
  );
  return true;
}

/** 9 luật gốc: lấy từ cấu hình hiện có (bổ sung luật mặc định còn thiếu). */
async function gieoLuatHeThong(q: Q): Promise<void> {
  const ch = await layCauHinh(q, "luat_kiem_tra");
  const ds = [...ch.luat];
  for (const l of MAC_DINH.luat_kiem_tra.luat) if (!ds.some((x) => x.ma === l.ma)) ds.push(l);
  const { rows } = await q.query<{ ma: string }>("SELECT ma FROM docflow.luat_kiem_tra WHERE he_thong AND NOT da_xoa");
  const co = new Set(rows.map((r) => r.ma));
  for (const [i, l] of ds.entries()) {
    if (co.has(l.ma)) continue;
    await chen(
      q,
      `luat-${l.ma}`,
      {
        ma: l.ma,
        ten: l.ten,
        cau_luat: l.ten,
        mo_ta: null,
        cach_kiem: "code",
        loai: "he_thong",
        tham_so: null,
        huong_dan_ai: null,
        ap_dung: l.ap_dung,
        muc: l.muc,
        khi_ai_loi: "cho_gui",
        bat: l.bat,
        nhom: "Luật hệ thống",
        thu_tu: i + 1,
      },
      true,
      i + 1,
    );
  }
  // Mốc đồng bộ với cấu hình: lần đầu = cấu hình hiện tại; đã có thì kéo thay đổi của Cài đặt về
  if (!(await docDanhDau(q, DAU_MOC_CAU_HINH))) await ghiDanhDau(q, DAU_MOC_CAU_HINH, trichMoc(ch.luat));
  else await dongBoTuCauHinh(q);
}

/** Luật mẫu từ 9 mẫu thật (agent luat-mau). Chưa có file / lỗi thì bỏ qua. */
async function gieoLuatMau(q: Q): Promise<void> {
  let ds: LuatNhap[] = [];
  try {
    // Import động: file của agent luat-mau có thể chưa có
    const ten = "mau";
    const m = (await import(/* webpackInclude: /luat-mau\.ts$/ */ `./luat-${ten}.ts`)) as { LUAT_MAU?: LuatNhap[] };
    ds = Array.isArray(m.LUAT_MAU) ? m.LUAT_MAU : [];
  } catch {
    return;
  }
  if (ds.length === 0) return;
  const daGieo = new Set((await docDanhDau<string[]>(q, DAU_LUAT_MAU)) ?? []);
  const { rows } = await q.query<{ ma: string; n: number }>(
    "SELECT ma, (SELECT COALESCE(max(thu_tu), 0)::int FROM docflow.luat_kiem_tra) AS n FROM docflow.luat_kiem_tra WHERE NOT da_xoa",
  );
  const co = new Set(rows.map((r) => r.ma));
  let thuTu = Math.max(100, Number(rows[0]?.n ?? 0));
  let doi = false;
  for (const l of ds) {
    if (!l?.ma || daGieo.has(l.ma)) continue;
    if (!co.has(l.ma)) {
      thuTu += 10;
      await chen(q, `luat-mau-${l.ma}-${Date.now().toString(36)}`, l, false, l.thu_tu ?? thuTu);
      co.add(l.ma);
    }
    daGieo.add(l.ma);
    doi = true;
  }
  // Luật mẫu đã bị THAY trong bộ mới (vd luật AI chuyển thành luật code, đổi mã): tự TẮT bản cũ nếu quản trị
  // chưa từng sửa (phiên bản 1) — để báo cáo không bị báo hai lần. Không xóa: vẫn xem/bật lại được.
  const conDung = new Set(ds.map((l) => l.ma));
  const { rows: cu } = await q.query<{ id: string; ma: string }>(
    `SELECT id, ma FROM docflow.luat_kiem_tra
      WHERE NOT da_xoa AND NOT he_thong AND bat AND phien_ban = 1 AND id LIKE 'luat-mau-%'`,
  );
  for (const r of cu) {
    if (conDung.has(r.ma) || !daGieo.has(r.ma)) continue;
    await q.query("UPDATE docflow.luat_kiem_tra SET bat = false, sua_boi = 'he-thong', sua_luc = now() WHERE id = $1", [r.id]);
    await ghiLichSu(q, {
      nguoi: "he-thong",
      doi_tuong_loai: "cau_hinh",
      doi_tuong_id: `luat:${r.id}`,
      hanh_dong: "sua_cau_hinh",
      chi_tiet: { ma: r.ma, thay_doi: [{ truong: "bat", tu: true, sang: false }], ly_do: "Luật mẫu đã được thay bằng luật mới trong bộ luật mẫu" },
    });
  }
  // Mẫu mới (vd Form 9 Phòng Cơ điện) được thêm vào luật mẫu đã gieo: cập nhật "áp dụng cho mẫu" của bản gieo
  // mà quản trị CHƯA sửa (phiên bản 1) — quản trị đã sửa thì giữ nguyên lựa chọn của quản trị.
  const theoMa = new Map(ds.map((l) => [l.ma, JSON.stringify(l.ap_dung ?? "tat_ca")]));
  const { rows: dangCo } = await q.query<{ id: string; ma: string; ap_dung: unknown }>(
    `SELECT id, ma, ap_dung FROM docflow.luat_kiem_tra WHERE NOT da_xoa AND NOT he_thong AND phien_ban = 1 AND id LIKE 'luat-mau-%'`,
  );
  for (const r of dangCo) {
    const moi = theoMa.get(r.ma);
    const cu = typeof r.ap_dung === "string" ? r.ap_dung : JSON.stringify(r.ap_dung);
    if (!moi || moi === cu) continue;
    await q.query("UPDATE docflow.luat_kiem_tra SET ap_dung = $2::jsonb WHERE id = $1", [r.id, moi]);
  }
  if (doi) await ghiDanhDau(q, DAU_LUAT_MAU, Array.from(daGieo));
}

export async function hatGiongLuat(q: Q): Promise<void> {
  await gieoLuatHeThong(q);
  try {
    await gieoLuatMau(q);
  } catch (e) {
    console.warn("Không gieo được luật mẫu:", e instanceof Error ? e.message : e);
  }
}

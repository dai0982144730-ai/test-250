// Đợt D — luồng KIỂM TRA / LƯU phiên bản mẫu khai theo nghĩa (01/10/2026). Không gọi AI: nghĩa lấy đúng như bản trước.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import type { CauTrucMau } from "@/lib/types";
import { layMau } from "@/lib/kiem-tra/kiem-tra";
import { cauTrucTruoc } from "@/lib/kiem-tra/de-xuat-cau-truc";
import { ghepDeXuat, slugTag } from "@/lib/kiem-tra/de-xuat-cau-truc-thuan";
import { goHetNhan, khungVanBan, type KhungVanBan } from "@/lib/kiem-tra/gan-nhan";
import { kiemThuMau, luuPhienBanMau } from "@/lib/kiem-tra/khai-bao-mau";
import { soBaoCaoDaGui, xoaMau } from "@/lib/kiem-tra/quan-ly-mau";
import { danhSachLuat } from "@/lib/luat/kho-luat";
import { khoTam } from "../fixtures/chuan-bi";

let q: Q;
const tepMau = (ma: string) => fs.readFileSync(path.join(process.cwd(), "mau-word", `${ma}.docx`));

function aiDung(khung: KhungVanBan, cu: CauTrucMau) {
  return {
    chuong: khung.chuong.map((kc, i) => {
      const cc = cu.chuong.find((c) => slugTag(c.tieu_de) === slugTag(kc.tieu_de));
      return {
        so: i,
        nghia: cc?.nghia ?? "thong_tin",
        bang: kc.bang.map((kb) => {
          const b = cc?.bang[kb.vi_tri];
          return { vi_tri: kb.vi_tri, nghia: b?.tag ? b.nghia : "so_lieu", cot: kb.tieu_de_cot.map((t, j) => ({ so: j, nghia: b?.cot.find((x) => slugTag(x.tieu_de) === slugTag(t))?.nghia ?? "them" })) };
        }),
      };
    }),
  };
}

async function cauTruc(ma: string, buf: Buffer, sua?: (ct: CauTrucMau) => void) {
  const cu = (await cauTrucTruoc(q, ma))!;
  const khung = await khungVanBan(buf);
  const ct = ghepDeXuat(aiDung(khung, cu), khung, cu).cau_truc;
  sua?.(ct);
  return ct;
}

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
});

describe("Khai báo mẫu — kiểm tra & lưu phiên bản (Đợt D)", () => {
  it("chỉ người có quyền Quản lý mẫu", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    await expect(kiemThuMau(q, hung, { buf: tepMau("form-5"), ma: "form-5", ten: "x", moi: false, cau_truc: { chuong: [] } })).rejects.toMatchObject({ status: 403 });
  });

  it("cập nhật trên file mẫu tải về: đạt, không tắt luật nào; lưu thành bản +1, định nghĩa có cau_truc", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const buf = tepMau("form-5");
    const ct = await cauTruc("form-5", buf);
    const kq = await kiemThuMau(q, qt, { buf, ma: "form-5", ten: "PMC", moi: false, cau_truc: ct });
    expect(kq.loi).toEqual([]);
    expect(kq.luat_tat).toEqual([]);
    const truoc = (await layMau(q, "form-5"))!;
    const r = await tx((x) => luuPhienBanMau(x, qt, { buf, ten_tep: "Form 5.docx", ma: "form-5", ten: "PMC", moi: false, cau_truc: ct }));
    expect(r.phien_ban).toBe(truoc.phien_ban + 1);
    const sau = (await layMau(q, "form-5"))!;
    expect(sau.dinh_nghia.cau_truc?.chuong.length).toBe(ct.chuong.length);
    expect(sau.dinh_nghia.bang_cong_viec.map((b) => b.tag)).toEqual(truoc.dinh_nghia.bang_cong_viec.map((b) => b.tag));
    expect(sau.dinh_nghia.o_nhap.map((o) => o.tag).sort()).toEqual(truoc.dinh_nghia.o_nhap.map((o) => o.tag).sort());
  });

  it("cập nhật bằng Word thường mất nhãn bảng số liệu (Form 8 Sản lượng 2 dòng tiêu đề) → CHẶN, chỉ đường tải mẫu về", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const buf = await goHetNhan(tepMau("form-8"));
    const ct = await cauTruc("form-8", buf);
    const kq = await kiemThuMau(q, qt, { buf, ma: "form-8", ten: "NM", moi: false, cau_truc: ct });
    expect(kq.dat).toBe(false);
    expect(kq.loi.join(" ")).toContain("tải mẫu hiện hành về");
    await expect(tx((x) => luuPhienBanMau(x, qt, { buf, ten_tep: "f8.docx", ma: "form-8", ten: "NM", moi: false, cau_truc: ct }))).rejects.toMatchObject({ status: 400 });
  });

  it("bỏ bảng Kiến nghị khỏi phần máy đọc → luật trỏ vào bảng đó: áp riêng mẫu này thì tắt, áp nhiều mẫu thì gỡ mẫu này", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const buf = tepMau("form-7");
    const ct = await cauTruc("form-7", buf, (c) => {
      for (const ch of c.chuong) for (const b of ch.bang) if (b.tag === "bang_kien_nghi") Object.assign(b, { tag: "", cot: [] });
    });
    const kq = await kiemThuMau(q, qt, { buf, ma: "form-7", ten: "QT", moi: false, cau_truc: ct });
    expect(kq.loi).toEqual([]);
    const trungBang = (await danhSachLuat(q)).filter((l) => l.bat && Array.isArray(l.ap_dung) && l.ap_dung.includes("form-7") && JSON.stringify(l.tham_so ?? {}).includes('"bang_kien_nghi"'));
    expect(trungBang.length).toBeGreaterThan(0);
    expect(kq.luat_tat.map((l) => l.ma).sort()).toEqual(trungBang.map((l) => l.ma).sort());
    await tx((x) => luuPhienBanMau(x, qt, { buf, ten_tep: "f7.docx", ma: "form-7", ten: "QT", moi: false, cau_truc: ct }));
    const sau = await danhSachLuat(q);
    for (const h of kq.luat_tat) {
      const l = sau.find((x) => x.id === h.id)!;
      if (h.chi_mau_nay) expect(l.bat).toBe(false);
      else expect(l.bat && Array.isArray(l.ap_dung) && !l.ap_dung.includes("form-7")).toBe(true);
    }
  });

  it("mẫu mới tinh bằng Word thường: tạo mẫu, lưu bản 1, nộp thử nhận ra mẫu", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const buf = await goHetNhan(tepMau("form-3"));
    const khung = await khungVanBan(buf);
    const ai = { chuong: khung.chuong.map((kc, i) => ({ so: i, nghia: /KẾT QUẢ VÀ KẾ HOẠCH/.test(kc.tieu_de) ? "sinh_viec_bang" : "thong_tin", bang: kc.bang.map((kb) => ({ vi_tri: kb.vi_tri, nghia: /KẾT QUẢ VÀ KẾ HOẠCH/.test(kc.tieu_de) ? "sinh_viec" : "so_lieu", cot: kb.tieu_de_cot.map((t, j) => ({ so: j, nghia: ({ "Công việc": "ten", "Dự án": "du_an", "Bắt đầu": "bat_dau", "Kết thúc": "ket_thuc", "Kết quả cần có": "ket_qua_can_co", "Tình trạng": "tinh_trang" } as Record<string, string>)[t] ?? "them" })) })) })) };
    const ct = ghepDeXuat(ai, khung, null).cau_truc;
    const kq = await kiemThuMau(q, qt, { buf, ma: "form-99", ten: "Mẫu thử mới", moi: true, cau_truc: ct });
    expect(kq.loi).toEqual([]);
    const r = await tx((x) => luuPhienBanMau(x, qt, { buf, ten_tep: "Mẫu thử mới.docx", ma: "form-99", ten: "Mẫu thử mới", moi: true, cau_truc: ct }));
    expect(r.phien_ban).toBe((await layMau(q, "form-99"))!.phien_ban);
    const m = (await layMau(q, "form-99"))!;
    expect(m.dinh_nghia.bang_cong_viec.map((b) => b.tag)).toEqual(["bang_cong_viec"]);
  });

  it("xoá mẫu: chưa có báo cáo gửi thì xoá hẳn; đã có thì từ chối, chỉ ngừng dùng (Mr. Đại chốt 01/10)", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    // form-99 tạo ở ca trên, chưa ai gửi; thêm một bản nháp theo mẫu → xoá xong thành file thường
    await q.query("INSERT INTO docflow.tai_lieu (id, ten, mau_ma, nguoi_tao, trang_thai) VALUES ('TL-NHAP-99', 'nháp', 'form-99', $1, 'nhap')", [qt.id]);
    expect(await soBaoCaoDaGui(q, "form-99")).toBe(0);
    const r = await tx((x) => xoaMau(x, qt, "form-99"));
    expect(r.ban_nhap).toBe(1);
    expect(await layMau(q, "form-99")).toBeNull();
    const { rows } = await q.query<{ mau_ma: string | null }>("SELECT mau_ma FROM docflow.tai_lieu WHERE id = 'TL-NHAP-99'");
    expect(rows[0].mau_ma).toBeNull();

    await q.query("INSERT INTO docflow.tai_lieu (id, ten, mau_ma, nguoi_tao, trang_thai) VALUES ('TL-GUI-7', 'đã gửi', 'form-7', $1, 'da_gui')", [qt.id]);
    await expect(tx((x) => xoaMau(x, qt, "form-7"))).rejects.toMatchObject({ status: 409 });
    expect(await layMau(q, "form-7")).not.toBeNull();
    const hung = await nguoi("hung.tv@scigroup.vn");
    await expect(tx((x) => xoaMau(x, hung, "form-3"))).rejects.toMatchObject({ status: 403 });
  });
});

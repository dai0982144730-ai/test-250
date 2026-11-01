// Tóm tắt tiến độ lấy từ agent Tiến độ (Mr. Đại duyệt 26/10/2026) — đổi bảng cổng tiendo.bang_gantt thành bảng của màn,
// lặp trang, ô «KL TH / TK = %». Không gọi mạng thật: hàm hỏi một trang được thay.
import { describe, expect, it } from "vitest";
import { banTuBangGantt, capWbs, cotPctTH, ngayTrucTienDo, wbsCoCon, type DongGanttTD, type TraBangGantt } from "@/lib/tom-tat-tien-do/thuan";
import { layBangGanttTheoTrang } from "@/lib/tom-tat-tien-do/dong-bo";
import { fmtSo } from "@/lib/format";

const dongTD = (wbs: string, o: Partial<DongGanttTD> = {}): DongGanttTD => ({
  wbs,
  ten: `Việc ${wbs}`,
  cap: wbs.split(".").length,
  nhom: false,
  moc: false,
  ke_hoach: { bd: "2026-11-01", kt: "2026-11-30" },
  baseline_duyet: { bd: "2026-11-01", kt: "2026-11-30" },
  muc_tieu: null,
  thanh_nhom: null,
  thuc_te: null,
  du_bao: null,
  gang: false,
  gang_du_bao: false,
  pct: 0,
  kl: null,
  theo_tien_boq: false,
  du_bao_xong: null,
  du_bao_bat_dau: null,
  ly_do_du_bao: null,
  nha_thau_hua: null,
  cham_so_muc_tieu: null,
  cham_so_baseline: { ngay: null, cau: "Chưa đến ngày bắt đầu" },
  ...o,
});

const bang = (dong: DongGanttTD[]): TraBangGantt => ({
  co_baseline_duyet: true,
  phien_ban_baseline: 2,
  baseline_duyet_luc: "2026-09-27T08:06:18.385Z",
  co_muc_tieu: true,
  ngay_bao_cao: "2026-10-11",
  cod_muc_tieu: "2027-08-03",
  cod_baseline: "2027-09-14",
  cod_du_bao: "2027-10-28",
  dong,
});

describe("Tóm tắt tiến độ lấy từ agent Tiến độ", () => {
  it("cấp 1 là tên dự án: mọi dòng bên Tiến độ lùi xuống một cấp, mã hiện giữ nguyên mã bên Tiến độ", () => {
    const b = bang([
      dongTD("1", { nhom: true, baseline_duyet: { bd: "2026-04-10", kt: "2026-09-28" }, muc_tieu: { bd: "2026-04-10", kt: "2026-09-14" }, thanh_nhom: { bd: "2026-04-10", kt: "2026-10-11" } }),
      dongTD("1.1", { nhom: true }),
      dongTD("1.1.1", { kl: { th: 2792, tk: 5000, don_vi: "m³", theo: "bao-cao" }, pct: 55.8 }),
      dongTD("7", { nhom: true, ke_hoach: { bd: "2026-09-02", kt: "2027-10-28" }, baseline_duyet: { bd: "2026-09-02", kt: "2027-09-14" }, muc_tieu: { bd: "2026-08-20", kt: "2027-08-03" } }),
    ]);
    const ban = banTuBangGantt({ id: "HV", ten: "Hướng Việt" }, "HV", b, "2026-10-26T08:00:00.000Z");
    expect(ban.dong.map((d) => d.wbs)).toEqual(["0", "0.1", "0.1.1", "0.1.1.1", "0.7"]);
    expect(ban.dong.map((d) => d.ma)).toEqual(["", "1", "1.1", "1.1.1", "7"]);
    expect(ban.dong.map((d) => capWbs(d.wbs))).toEqual([1, 2, 3, 4, 2]);
    expect([...wbsCoCon(ban.dong)].sort()).toEqual(["0", "0.1", "0.1.1"]);
    // dòng tên dự án gộp các giai đoạn cấp 1
    expect(ban.dong[0]).toMatchObject({ ten: "Hướng Việt", bat_dau: "2026-04-10", ket_thuc: "2027-09-14" });
    expect(ban.dong[0].td?.muc_tieu).toEqual({ bd: "2026-04-10", kt: "2027-08-03" });
    expect(ban.tien_do).toMatchObject({ ma_tien_do: "HV", phien_ban_baseline: 2, cod_du_bao: "2027-10-28" });
    // trục phủ cả ba vạch COD
    expect(ngayTrucTienDo(ban)).toEqual(expect.arrayContaining(["2027-08-03", "2027-09-14", "2027-10-28"]));
  });

  it("ô % TH (29/10/2026): chỉ % thực hiện — việc lá, dòng nhóm, mốc đều chỉ «%»; chưa có số thì trống", () => {
    expect(cotPctTH(dongTD("1.1.1", { kl: { th: 2792, tk: 5000, don_vi: "m³", theo: "bao-cao" }, pct: 55.8 }), fmtSo)).toEqual({ chu: "55,8%", mau: "xanh" });
    expect(cotPctTH(dongTD("7.2", { nhom: true, pct: 7.7 }), fmtSo)).toEqual({ chu: "7,7%", mau: "xanh" });
    expect(cotPctTH(dongTD("1.1.10", { moc: true, pct: 100 }), fmtSo)).toEqual({ chu: "100%", mau: "xanh" });
    expect(cotPctTH(dongTD("1.1.2", { pct: 0 }), fmtSo)).toEqual({ chu: "—", mau: "trang" });
    expect(cotPctTH(dongTD("1.1.3", { pct: 100, vuot_pct: 112 }), fmtSo)).toEqual({ chu: "112%", mau: "vang" });
    expect(cotPctTH(dongTD("9.9", { pct: null }), fmtSo)).toEqual({ chu: "", mau: "trang" });

  });

  it("lặp trang tới khi con_nua = false; dự án chưa có tiến độ thì báo chua_co", async () => {
    const tat = Array.from({ length: 183 }, (_, i) => dongTD(`1.${i + 1}`));
    const hoi: { vi_tri: number }[] = [];
    const kq = await layBangGanttTheoTrang("HV", async (t) => {
      hoi.push({ vi_tri: Number(t.vi_tri) });
      const vt = Number(t.vi_tri);
      const trang = tat.slice(vt, vt + 100);
      return { ok: true, du_lieu: { ...bang([]), dong: trang, con_nua: vt + trang.length < tat.length } };
    });
    expect(hoi.map((h) => h.vi_tri)).toEqual([0, 100]);
    expect(kq.ok && kq.bang.dong.length).toBe(183);
    const khong = await layBangGanttTheoTrang("BT", async () => ({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "Dự án chưa có bảng tiến độ." }));
    expect(khong).toMatchObject({ ok: false, chua_co: true });
    const tat2 = await layBangGanttTheoTrang("HV", async () => ({ ok: false, ma_loi: "KHONG_KET_NOI", thong_diep: "agent Tiến độ đang tắt" }));
    expect(tat2).toMatchObject({ ok: false, chua_co: false });
  });
});

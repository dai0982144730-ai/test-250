// thuan.js — các hàm THUẦN chép nguyên từ agent Công việc 3004 (không đụng mạng, không đụng Electron).
// Nguồn: src/lib/phong-hop/thuan.ts · src/components/phong/KhungPhong.tsx · src/lib/ai/trang-co-that.ts
// Dùng chung cho tiến trình chính (require) và các cửa sổ (<script src>). Sửa bên web thì sửa lại đây cho khớp.
(function (goc, tao) {
  const t = tao();
  if (typeof module !== "undefined" && module.exports) module.exports = t;
  else goc.Thuan = t;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const PHUT_NHAC_TRUOC = 15;
  const LOAI_DO = new Set(["nhac_viec", "nhac_nop", "bi_tra_lai", "qua_han"]);
  const LOAI_TEN = {
    nhac_viec: "Ban lãnh đạo nhắc việc",
    nhac_nop: "Nhắc nộp báo cáo",
    bi_tra_lai: "Báo cáo bị trả lại",
    qua_han: "Việc quá hạn",
    nhac_dong_viec: "Nhắc bấm Xong việc",
  };

  /** Giờ Việt Nam (+7), luật 44 */
  function bayGioVN(ms) {
    const iso = new Date((ms === undefined ? Date.now() : ms) + 7 * 3600_000).toISOString();
    return { ngay: iso.slice(0, 10), phut: Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)), gio: iso.slice(11, 16) };
  }
  const phut = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  function congNgay(iso, n) {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  const ngayVN = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);
  const thuCua = (iso) => {
    const d = new Date(iso + "T00:00:00Z").getUTCDay();
    return d === 0 ? 7 : d;
  };
  const tenThu = (thu) => THU[thu % 7];
  const tenPhong = (id) => {
    const m = /^p(\d+)$/.exec(id || "");
    return m ? "Phòng họp " + m[1] : id;
  };
  const laDuongDanHop = (s) => typeof s === "string" && /^https?:\/\//i.test(s);

  function nhapNhay(c, bay) {
    bay = bay || bayGioVN();
    if (!c.da_xem) return true;
    const con = phut(c.tu) - bay.phut;
    return c.ngay === bay.ngay && con > 0 && con <= PHUT_NHAC_TRUOC;
  }
  function chuDongHop(c, bay) {
    bay = bay || bayGioVN();
    const ngay = c.ngay === bay.ngay ? "" : c.ngay === congNgay(bay.ngay, 1) ? "mai " : tenThu(thuCua(c.ngay)) + " " + ngayVN(c.ngay).slice(0, 5) + " ";
    const dang = c.ngay === bay.ngay && phut(c.tu) <= bay.phut ? "đang họp: " : "";
    return dang + ngay + c.tu + " họp " + c.noi_dung + " · " + tenPhong(c.phong);
  }
  /**
   * Trạng thái dòng báo họp (Mr. Đại chốt 28/10/2026):
   *  - chuanbi: có cuộc còn ≤ 15 phút tới giờ → «CHUẨN BỊ ĐI ĐẾN CUỘC HỌP …», nền vàng, nháy tới giờ họp
   *  - moi:     có cuộc CHƯA XEM → chữ đỏ nháy, đứng yên (bấm 1 lần = đã xem)
   *  - xem:     đã xem hết → chữ đỏ CHẠY NGANG; còn chữ chạy = còn cuộc họp
   */
  /** Khoá một cuộc họp để nhớ «đã bấm tắt dòng chuẩn bị» — đổi giờ/ngày thì khoá đổi, dòng chuẩn bị hiện lại */
  const khoaHop = (c) => c.id + "|" + c.ngay + "|" + c.tu;
  /**
   * tuyChon = { an, tat } — chế độ «Ẩn thông báo họp khi mở xem» (Mr. Đại chốt 28/10/2026, menu chuột phải):
   *  - đã xem hết → KHÔNG chạy chữ ngang, dòng ẩn hẳn (kieu «an»)
   *  - còn ≤ 15 phút → «CHUẨN BỊ ĐI ĐẾN CUỘC HỌP» nháy vàng; bấm một lần thì ẩn (khoá vào tat)
   *  - tới giờ họp → không hiện gì, không báo «đang họp»
   */
  function trangThaiHop(hien, bay, tuyChon) {
    bay = bay || bayGioVN();
    const tc = tuyChon || {};
    const tat = new Set(tc.tat || []);
    const chuaXem = hien.filter((c) => !c.da_xem).map((c) => c.id);
    let sap = hien.filter((c) => c.ngay === bay.ngay && phut(c.tu) - bay.phut > 0 && phut(c.tu) - bay.phut <= PHUT_NHAC_TRUOC).sort((a, b) => phut(a.tu) - phut(b.tu));
    if (tc.an) sap = sap.filter((c) => !tat.has(khoaHop(c)));
    if (sap.length) return { kieu: "chuanbi", chu: "CHUẨN BỊ ĐI ĐẾN CUỘC HỌP · " + chuDongHop(sap[0], bay), nhay: true, chua_xem: chuaXem, cuon: false, sap_khoa: sap.map(khoaHop), sap_ids: sap.map((c) => c.id) };
    if (chuaXem.length) return { kieu: "moi", chu: hien.filter((c) => !c.da_xem).map((c) => chuDongHop(c, bay)).join("   ·   "), nhay: true, chua_xem: chuaXem, cuon: false };
    if (tc.an) return { kieu: "an", chu: "", nhay: false, chua_xem: [], cuon: false };
    return { kieu: "xem", chu: hien.map((c) => chuDongHop(c, bay)).join("   ·   "), nhay: false, chua_xem: [], cuon: true };
  }
  /** Cuộc họp còn hiện ở thanh trên: chưa kết thúc */
  const conHien = (c, bay) => {
    bay = bay || bayGioVN();
    return c.ngay > bay.ngay || (c.ngay === bay.ngay && phut(c.den) > bay.phut);
  };

  /** Chữ con số chuông «8+5»: 8 = chưa đọc đã thấy · 5 = tin mới từ lần mở trước (Mr. Đại chốt 29/09) */
  function chuSo(so, soMoi) {
    const moi = Math.min(soMoi || 0, so);
    const cu = so - moi;
    const gon = (n) => (n > 99 ? "99+" : String(n));
    return moi ? (cu ? gon(cu) + (cu > 99 ? " " : "") + "+" + gon(moi) : "+" + gon(moi)) : gon(cu);
  }

  /** /cong-viec/X → /so-do?viec=X (chuông web dùng chung) */
  function linkPhong(lk) {
    const m = lk ? /^\/cong-viec\/([^/?#]+)/.exec(lk) : null;
    return m ? "/so-do?viec=" + m[1] : lk;
  }

  /** Gộp tin trùng thành một dòng ×N rồi xếp thứ tự — đúng gopTin() của chuông web */
  function gopTin(ds, mocCu) {
    const m = new Map();
    for (const t of ds) {
      const k = t.loai + "|" + t.noi_dung + "|" + (t.tep || []).map((x) => x.id).join(",");
      const moi = !t.da_doc && t.id > mocCu;
      const g = m.get(k);
      if (g) {
        g.ids.push(t.id);
        if (!t.da_doc) g.chua_doc++;
        if (moi) g.moi = true;
        if (t.luc > g.luc) g.luc = t.luc;
      } else m.set(k, { ids: [t.id], loai: t.loai, noi_dung: t.noi_dung, lien_ket: t.lien_ket, chua_doc: t.da_doc ? 0 : 1, luc: t.luc, moi });
    }
    const hang = (g) =>
      g.loai === "nhac_viec"
        ? g.chua_doc ? -20 : 3.5
        : (g.moi ? -8 : 0) + (g.chua_doc ? 0 : 4) + (LOAI_DO.has(g.loai) ? 0 : g.loai === "binh_luan" || g.loai === "duoc_nhac" ? 1 : 2);
    return [...m.values()].sort((a, b) => hang(a) - hang(b) || (a.luc < b.luc ? 1 : -1));
  }

  return { bayGioVN, phut, congNgay, ngayVN, tenPhong, laDuongDanHop, nhapNhay, trangThaiHop, chuDongHop, conHien, chuSo, linkPhong, gopTin, LOAI_DO, LOAI_TEN };
});

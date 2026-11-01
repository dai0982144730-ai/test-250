// ============================================================
// BỘ TEST MÀN ISSUE RIÊNG CỦA MAIN — PLAN-MAIN-AGENT mục 8b
//
// Bài đắt nhất trong bộ này là mấy bài canh LUẬT CỨNG (KE-HOACH/05 A.4): sai
// một trong số đó thì cả agent hỏng, chứ không phải lỗi giao diện:
//   · issue thiếu nguồn / thiếu điều kiện đóng phải BỊ LOẠI
//   · tám nhóm chủ đề phân đúng, issue máy sinh nằm LẪN trong nhóm
//   · tab ⭐ đúng 5 việc và KHÔNG kèm điểm số dưới bất kỳ tên nào
//   · số ngày ảnh hưởng lấy MAX, không cộng
//   · agent tắt thì ghi rõ "chưa gom được từ con này"
// ============================================================

import { describe, expect, it } from "vitest";
import {
  MOI_NHOM,
  NHAN_NHOM,
  SO_VIEC_CAN_XEM,
  TAM_NHOM,
  anhHuongNangNhat,
  canAnhXem,
  demTheoNhom,
  docIssueTuKhuon,
  dongTroNhomPhu,
  gopKetQuaGom,
  hienSo,
  hienTien,
  hopLeIssue,
  iconIssue,
  laNhomHopLe,
  locIssue,
  lyDoLoaiIssue,
  nguonDanTuKhuon,
  nhomChinhCuaIssue,
  soHoacNull,
  xepVaoNhom,
  type IssueMain,
  type NhomChuDe,
} from "@/lib/issue-main/model";
import {
  apDungCanAnhXem,
  apDungPhanLoai,
  chuaPhanLoai,
  docTraLoiCanAnhXem,
  docTraLoiPhanLoai,
  dungPromptCanAnhXem,
  dungPromptPhanLoai,
} from "@/lib/issue-main/phan-loai";
import { thanhCong, thatBai } from "@/lib/mcp/khuon";
import { cacConDiHoi, congCuIssue, dieuKienDongCuaThe, theThanhIssue } from "@/lib/issue-main/gom";
import type { KhaiAgent } from "@/lib/danh-ba-agent";
import type { TheCanhBao } from "@/lib/canh-bao/model";

// ─────────────────────────────────────────────────────────────
// Đồ dùng chung
// ─────────────────────────────────────────────────────────────

function issue(v: Partial<IssueMain> = {}): IssueMain {
  return {
    id: "ISS-2026-36-001",
    agentChu: "tiendo",
    tenAgentChu: "Agent Tiến độ",
    tieuDe: "Đổ bê tông trụ T3 chậm 9 ngày",
    moTa: "Khối lượng thực tế chỉ đạt 41% so với kế hoạch tuần.",
    nguonDuLieu: "bc-tuan 2026-W35 — sheet Khối lượng dòng 12",
    dieuKienDong: "Đóng khi khối lượng luỹ kế trụ T3 đạt kế hoạch tuần hai kỳ liên tiếp.",
    mucDo: "vang",
    nhomChinh: null,
    nhomPhu: [],
    doLlmSinh: false,
    doNguoiThem: false,
    soNgayAnhHuong: null,
    tienAnhHuongVnd: null,
    daDong: false,
    ...v,
  };
}

// ─────────────────────────────────────────────────────────────
// A. LUẬT A.4.1 + A.4.5 — thiếu nguồn / thiếu điều kiện đóng thì bị loại
// ─────────────────────────────────────────────────────────────

describe("Luật cứng A.4.1 · A.4.5 — không nguồn thì không được hiện", () => {
  it("1. issue thiếu nguồn bị loại, kèm lý do nói rõ chưa có số liệu", () => {
    const i = issue({ nguonDuLieu: "   " });
    expect(hopLeIssue(i)).toBe(false);
    expect(lyDoLoaiIssue(i)).toMatch(/không dẫn được nguồn/i);
  });

  it("2. issue thiếu ĐIỀU KIỆN ĐÓNG bị loại — không có nút đóng tuỳ tiện", () => {
    const i = issue({ dieuKienDong: "" });
    expect(hopLeIssue(i)).toBe(false);
    expect(lyDoLoaiIssue(i)).toMatch(/điều kiện đóng/i);
  });

  it("3. issue thiếu tiêu đề bị loại", () => {
    expect(hopLeIssue(issue({ tieuDe: "" }))).toBe(false);
  });

  it("4. issue đủ nguồn + điều kiện đóng thì hợp lệ", () => {
    expect(lyDoLoaiIssue(issue())).toBeNull();
  });

  it("5. locIssue tách hai phần và ĐẾM ĐƯỢC phần bị loại, không nuốt im lặng", () => {
    const kq = locIssue([
      issue({ id: "A" }),
      issue({ id: "B", nguonDuLieu: "" }),
      issue({ id: "C", dieuKienDong: "" }),
    ]);
    expect(kq.nhan.map((i) => i.id)).toEqual(["A"]);
    expect(kq.loai).toHaveLength(2);
    expect(kq.loai[0]!.issue.id).toBe("B");
  });

  it("6. issue thiếu nguồn KHÔNG lọt vào bảng nhóm, nên không hiện ra màn", () => {
    const bang = xepVaoNhom([issue({ id: "X", nhomChinh: "cod", nguonDuLieu: "" })]);
    expect(bang.cod).toHaveLength(0);
    expect(bang.khac).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// B. TÁM NHÓM CHỦ ĐỀ (chốt BD) + 📁 Khác
// ─────────────────────────────────────────────────────────────

describe("Tám nhóm chủ đề — chốt BD", () => {
  it("7. đúng TÁM nhóm chính, cộng 📁 Khác là chín ô trên hàng tab", () => {
    expect(TAM_NHOM).toHaveLength(8);
    expect(MOI_NHOM).toHaveLength(9);
    expect(MOI_NHOM[MOI_NHOM.length - 1]).toBe("khac");
    expect(TAM_NHOM.includes("khac" as NhomChuDe)).toBe(false);
  });

  it("8. tám nhóm đúng thứ tự ①→⑧ của bảng 8b.3 và đều có nhãn tiếng Việt", () => {
    expect(TAM_NHOM).toEqual([
      "cod",
      "duong-gang",
      "hop-dong",
      "thiet-ke",
      "mat-bang",
      "phap-ly",
      "nha-thau",
      "thiet-bi",
    ]);
    for (const n of MOI_NHOM) expect(NHAN_NHOM[n].length).toBeGreaterThan(2);
  });

  it("9. issue được LLM xếp thì vào ĐÚNG nhóm đó, mỗi issue chỉ một nhóm chính", () => {
    const bang = xepVaoNhom([
      issue({ id: "1", nhomChinh: "cod" }),
      issue({ id: "2", nhomChinh: "phap-ly" }),
      issue({ id: "3", nhomChinh: "thiet-bi" }),
    ]);
    expect(bang.cod.map((i) => i.id)).toEqual(["1"]);
    expect(bang["phap-ly"].map((i) => i.id)).toEqual(["2"]);
    expect(bang["thiet-bi"].map((i) => i.id)).toEqual(["3"]);
    const tong = MOI_NHOM.reduce((s, n) => s + bang[n].length, 0);
    expect(tong).toBe(3); // không nhân bản thẻ sang nhóm khác
  });

  it("10. chưa phân loại hoặc nhóm lạ thì rơi về 📁 Khác, KHÔNG mất thẻ", () => {
    const la = { ...issue({ id: "9" }), nhomChinh: "nhom-tu-che" as unknown as NhomChuDe };
    const bang = xepVaoNhom([issue({ id: "8", nhomChinh: null }), la]);
    expect(bang.khac.map((i) => i.id).sort()).toEqual(["8", "9"]);
    expect(laNhomHopLe("nhom-tu-che")).toBe(false);
    expect(nhomChinhCuaIssue(la)).toBe("khac");
  });

  it("11. số đếm tab chỉ tính NHÓM CHÍNH — nhóm phụ không làm tổng đếm trùng", () => {
    const ds = [issue({ id: "1", nhomChinh: "phap-ly", nhomPhu: ["cod", "duong-gang"] })];
    const dem = demTheoNhom(ds);
    expect(dem["phap-ly"]).toBe(1);
    expect(dem.cod).toBe(0);
    expect(dem["duong-gang"]).toBe(0);
  });

  it("12. nhóm phụ vẫn HIỆN ĐƯỢC ở tab nhóm phụ, dưới dạng dòng trỏ", () => {
    const ds = [
      issue({ id: "1", nhomChinh: "phap-ly", nhomPhu: ["cod"] }),
      issue({ id: "2", nhomChinh: "cod" }),
    ];
    const tro = dongTroNhomPhu(ds, "cod");
    expect(tro.map((i) => i.id)).toEqual(["1"]);
    // Thẻ có nhóm chính là "cod" thì không tự trỏ tới chính nó
    expect(dongTroNhomPhu(ds, "phap-ly")).toHaveLength(0);
  });

  it("13. issue đã đóng không nằm trong tab đang mở, và xem lại được ở ô lọc Đã đóng", () => {
    const ds = [issue({ id: "1", nhomChinh: "cod", daDong: true })];
    expect(xepVaoNhom(ds).cod).toHaveLength(0);
    expect(xepVaoNhom(ds, true).cod.map((i) => i.id)).toEqual(["1"]);
  });
});

// ─────────────────────────────────────────────────────────────
// C. ISSUE MÁY SINH NẰM LẪN TRONG NHÓM — chốt BE
// ─────────────────────────────────────────────────────────────

describe("Chốt BE — issue Main tự sinh nằm LẪN trong 8 nhóm, không tách khu", () => {
  it("14. issue 🤖 của Main nằm cùng nhóm với issue của agent khác, không có khu riêng", () => {
    const ds = [
      issue({ id: "TD", agentChu: "tiendo", nhomChinh: "cod" }),
      issue({ id: "MAIN", agentChu: "main", tenAgentChu: "Main Agent", nhomChinh: "cod", doLlmSinh: true }),
    ];
    const bang = xepVaoNhom(ds);
    expect(bang.cod.map((i) => i.id).sort()).toEqual(["MAIN", "TD"]);
    // Không có ô nào tên "may-sinh"/"ai" trên hàng tab — tách khu là sai chốt BE
    expect(MOI_NHOM.includes("ai" as NhomChuDe)).toBe(false);
    expect(MOI_NHOM.includes("may-sinh" as NhomChuDe)).toBe(false);
  });

  it("15. phân biệt Main tự sinh với issue thường CHỈ bằng icon 🤖 / 👤", () => {
    expect(iconIssue(issue({ doLlmSinh: true }))).toBe("🤖");
    expect(iconIssue(issue({ doNguoiThem: true }))).toBe("👤");
    expect(iconIssue(issue())).toBe("");
  });

  it("16. thẻ trong sổ nội bộ nguồn AI thành issue 🤖, nguồn người thành 👤", () => {
    const nen: TheCanhBao = {
      id: "ISS-2026-36-007",
      nguon: "ai",
      mucDo: "red",
      tieuDe: "Ba dự án cùng tắc ở một cơ quan cấp phép",
      phanTich: "Cùng một sở giữ hồ sơ của HV, ĐN, TL.",
      anhHuongCod: 12,
      nguonDuLieu: "so-issue core.issue — 3 dòng",
      deXuat: "Gộp một buổi làm việc với sở.",
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      ngayMo: "2026-09-01",
    };
    const ai = theThanhIssue(nen, "Main Agent");
    expect(ai.doLlmSinh).toBe(true);
    expect(iconIssue(ai)).toBe("🤖");
    expect(ai.id.startsWith("ISS-")).toBe(true); // dùng mã chung core.issue
    const nguoi = theThanhIssue({ ...nen, nguon: "nguoi" }, "Main Agent");
    expect(nguoi.doNguoiThem).toBe(true);
    expect(iconIssue(nguoi)).toBe("👤");
  });

  it("17. mọi thẻ chuyển từ sổ đều có ĐIỀU KIỆN ĐÓNG, nên không thẻ nào bị loại oan", () => {
    const nen: TheCanhBao = {
      id: "ISS-2026-36-008",
      nguon: "gang",
      mucDo: "red",
      tieuDe: "WBS 7.2.3 trên găng trễ 6 ngày",
      phanTich: "…",
      anhHuongCod: 6,
      nguonDuLieu: "tien-do 2026-09-01",
      deXuat: "…",
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      ngayMo: "2026-09-01",
    };
    expect(dieuKienDongCuaThe(nen)).toMatch(/máy đóng/i);
    expect(dieuKienDongCuaThe({ ...nen, nguon: "nguoi", hanXuLy: "2026-09-20" })).toContain(
      "2026-09-20"
    );
    expect(hopLeIssue(theThanhIssue(nen, "Main Agent"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// D. TAB ⭐ "CẦN ANH XEM" — 5 việc, KHÔNG điểm số
// ─────────────────────────────────────────────────────────────

describe("Tab ⭐ Cần anh xem — mục 8b.3b", () => {
  const nhieu = Array.from({ length: 9 }, (_, k) =>
    issue({ id: `ISS-${k}`, lyDoChon: `Lý do thứ ${k}: ngày mất không lấy lại được.` })
  );

  it("18. trả đúng 5 việc dù đống issue nhiều hơn", () => {
    expect(SO_VIEC_CAN_XEM).toBe(5);
    expect(canAnhXem(nhieu)).toHaveLength(5);
  });

  it("19. mỗi việc KHÔNG kèm điểm số / thứ hạng dưới bất kỳ tên nào", () => {
    for (const v of canAnhXem(nhieu)) {
      expect(Object.keys(v).sort()).toEqual(["issue", "lyDo"]);
      for (const k of Object.keys(v.issue)) {
        expect(k).not.toMatch(/diem|score|rank|thuHang|thang|phanTram/i);
      }
    }
  });

  it("20. issue không nói được VÌ SAO nó đứng đó thì không lên tab ⭐", () => {
    const ds = [issue({ id: "A", lyDoChon: "  " }), issue({ id: "B" }), issue({ id: "C", lyDoChon: "Gốc của chuỗi." })];
    expect(canAnhXem(ds).map((v) => v.issue.id)).toEqual(["C"]);
  });

  it("21. issue đã đóng và issue thiếu nguồn không lên tab ⭐", () => {
    const ds = [
      issue({ id: "A", lyDoChon: "x", daDong: true }),
      issue({ id: "B", lyDoChon: "y", nguonDuLieu: "" }),
    ];
    expect(canAnhXem(ds)).toHaveLength(0);
  });

  it("22. câu hỏi gửi LLM CẤM thẳng việc chấm điểm", () => {
    const p = dungPromptCanAnhXem([issue()]);
    expect(p).toMatch(/không.*(điểm|thứ hạng)/i);
    expect(p).toMatch(/chưa có số liệu/i);
  });

  it("23. LLM có trả kèm điểm thì trường điểm BỊ VỨT ngay lúc bóc câu trả lời", () => {
    const raw = '[{"id":"ISS-1","lyDo":"Gỡ nó thì mấy cái kia tự tắt.","diem":87,"thuHang":1}]';
    const dong = docTraLoiCanAnhXem(raw);
    expect(dong).toHaveLength(1);
    expect(Object.keys(dong[0]!).sort()).toEqual(["id", "lyDo"]);
  });

  it("24. bóc câu trả lời: bỏ dòng thiếu lý do, bỏ dòng trùng mã, cắt đúng 5", () => {
    const raw = JSON.stringify([
      { id: "A", lyDo: "1" },
      { id: "A", lyDo: "trùng" },
      { id: "B" },
      { id: "C", lyDo: "3" },
      { id: "D", lyDo: "4" },
      { id: "E", lyDo: "5" },
      { id: "F", lyDo: "6" },
      { id: "G", lyDo: "7" },
    ]);
    expect(docTraLoiCanAnhXem(raw).map((d) => d.id)).toEqual(["A", "C", "D", "E", "F"]);
  });

  it("25. áp kết quả: gắn lý do, đưa đúng thứ tự LLM chọn lên đầu", () => {
    const ds = [issue({ id: "A" }), issue({ id: "B" }), issue({ id: "C" })];
    const sau = apDungCanAnhXem(ds, [
      { id: "C", lyDo: "Chỉ cấp Ban mới quyết được." },
      { id: "A", lyDo: "Ngày mất không lấy lại được." },
    ]);
    expect(sau.map((i) => i.id)).toEqual(["C", "A", "B"]);
    expect(canAnhXem(sau).map((v) => v.issue.id)).toEqual(["C", "A"]);
  });

  it("26. chọn lại thì lý do lượt cũ hết hiệu lực — tab ⭐ không phình quá 5", () => {
    const ds = [issue({ id: "A", lyDoChon: "cũ" }), issue({ id: "B" })];
    const sau = apDungCanAnhXem(ds, [{ id: "B", lyDo: "mới" }]);
    expect(canAnhXem(sau).map((v) => v.issue.id)).toEqual(["B"]);
  });
});

// ─────────────────────────────────────────────────────────────
// E. SỐ NGÀY ẢNH HƯỞNG — MAX, KHÔNG CỘNG (A.4.4) · KHÔNG ƯỚC SỐ (A.4.3)
// ─────────────────────────────────────────────────────────────

describe("Số ngày ảnh hưởng — luật A.4.3 · A.4.4", () => {
  it("27. lấy cái NẶNG NHẤT chứ không cộng dồn", () => {
    const kq = anhHuongNangNhat([
      issue({ id: "A", soNgayAnhHuong: 9 }),
      issue({ id: "B", soNgayAnhHuong: 21 }),
      issue({ id: "C", soNgayAnhHuong: 4 }),
    ]);
    expect(kq.soNgay).toBe(21);
    expect(kq.soNgay).not.toBe(34); // 9+21+4 — cộng dồn là sai
    expect(kq.issue?.id).toBe("B");
  });

  it("28. in kèm CÂU GIẢI THÍCH vì sao không cộng dồn", () => {
    const kq = anhHuongNangNhat([issue({ soNgayAnhHuong: 5 })]);
    expect(kq.giaiThich).toMatch(/không phải tổng|không cộng/i);
  });

  it("29. không agent nào có số thì trả null + nói rõ chưa có số liệu, KHÔNG trả 0", () => {
    const kq = anhHuongNangNhat([issue({ soNgayAnhHuong: null })]);
    expect(kq.soNgay).toBeNull();
    expect(kq.soNgay).not.toBe(0);
    expect(kq.giaiThich).toMatch(/chưa có số liệu/i);
  });

  it("30. issue đã đóng và issue bị loại không tham gia tính số nặng nhất", () => {
    const kq = anhHuongNangNhat([
      issue({ id: "A", soNgayAnhHuong: 30, daDong: true }),
      issue({ id: "B", soNgayAnhHuong: 40, nguonDuLieu: "" }),
      issue({ id: "C", soNgayAnhHuong: 7 }),
    ]);
    expect(kq.soNgay).toBe(7);
  });

  it("31. thiếu số thì hiện “—”, có số thì hiện số — không bao giờ hiện 0 thay cho thiếu", () => {
    expect(hienSo(null)).toBe("—");
    expect(hienSo(null, "ngày")).toBe("—");
    expect(hienSo(0, "ngày")).toBe("0 ngày");
    expect(hienSo(12, "ngày")).toBe("12 ngày");
    expect(hienTien(null)).toBe("—");
    // chuẩn số Việt Nam (Mr. Đại chốt 12/10/2026, chốt 130): thập phân dấu phẩy, nhóm ba chữ số dấu chấm — bản cũ ra «1.20 tỷ»
    expect(hienTien(1_200_000_000)).toBe("1,20 tỷ");
    expect(hienTien(45_600_000)).toBe("46 triệu");
    expect(hienTien(999_000)).toBe("999.000 đ");
    expect(hienSo(1200, "ngày")).toBe("1.200 ngày");
    expect(hienSo(1.5, "ngày")).toBe("1,5 ngày");
  });

  it("32. chuỗi rỗng / chữ / undefined đều thành null, KHÔNG thành 0", () => {
    expect(soHoacNull("")).toBeNull();
    expect(soHoacNull(undefined)).toBeNull();
    expect(soHoacNull("chưa có")).toBeNull();
    expect(soHoacNull("21")).toBe(21);
    expect(soHoacNull(0)).toBe(0);
    // chốt 130: chữ agent chủ / AI viết theo chuẩn số Việt Nam thì đọc đúng (bản cũ ra null); cú pháp số của máy giữ như máy
    expect(soHoacNull("1.200.000.000")).toBe(1_200_000_000);
    expect(soHoacNull("1,5")).toBe(1.5);
    expect(soHoacNull("12.5")).toBe(12.5);
  });
});

// ─────────────────────────────────────────────────────────────
// F. GOM ISSUE — agent tắt thì NÓI RÕ
// ─────────────────────────────────────────────────────────────

describe("Gom issue từ các agent — chốt BC · HOP-DONG-KET-NOI 8.1", () => {
  it("33. agent TẮT thì ghi rõ “chưa gom được từ con này” kèm lý do", () => {
    const kq = docIssueTuKhuon(
      "phaply",
      "Agent Pháp lý",
      thatBai("AGENT_KHONG_SAN_SANG", 'Agent "Agent Pháp lý" đang TẮT trong Danh bạ agent.')
    );
    expect(kq.issue).toHaveLength(0);
    expect(kq.chuaGomVi).toMatch(/chưa gom được từ agent pháp lý/i);
    expect(kq.chuaGomVi).toMatch(/đang TẮT/);
  });

  it("34. agent chưa mở công cụ issue cũng thành câu nói rõ, KHÔNG bịa issue thay nó", () => {
    const kq = docIssueTuKhuon(
      "hopdong",
      "Agent Hợp đồng",
      thatBai("KHONG_HIEU_YEU_CAU", "Không có công cụ hopdong.danh_sach_issue.")
    );
    expect(kq.issue).toHaveLength(0);
    expect(kq.chuaGomVi).toContain("Chưa gom được từ Agent Hợp đồng");
  });

  it("35. đọc được issue từ khuôn trả lời thành công", () => {
    const kq = docIssueTuKhuon(
      "tiendo",
      "Agent Tiến độ",
      thanhCong(
        [
          {
            id: "ISS-2026-36-011",
            tieuDe: "Trụ T3 chậm",
            moTa: "…",
            dieuKienDong: "Đủ khối lượng hai kỳ liên tiếp.",
            soNgayAnhHuong: 9,
            nhomChinh: "duong-gang",
          },
        ],
        [{ loai: "bc-tuan", ma: "2026-W35", file_goc: "bc-tuan.xlsx" }]
      )
    );
    expect(kq.chuaGomVi).toBeNull();
    expect(kq.issue).toHaveLength(1);
    expect(kq.issue[0]!.agentChu).toBe("tiendo");
    expect(kq.issue[0]!.soNgayAnhHuong).toBe(9);
    expect(kq.issue[0]!.nhomChinh).toBe("duong-gang");
  });

  it("36. dòng agent quên dẫn nguồn thì lấy nguồn chung của khuôn, không để rỗng", () => {
    const kq = docIssueTuKhuon(
      "base",
      "Agent Base.vn",
      thanhCong([{ id: "ISS-1", tieuDe: "x", dieuKienDong: "y" }], [
        { loai: "base", ma: "T-99", file_goc: "base-request.json" },
      ])
    );
    expect(kq.issue[0]!.nguonDuLieu).toContain("base-request.json");
    expect(hopLeIssue(kq.issue[0]!)).toBe(true);
  });

  it("37. agent trả về số kiểu chuỗi rỗng thì thành null, không thành 0", () => {
    const kq = docIssueTuKhuon(
      "tiendo",
      "Agent Tiến độ",
      thanhCong([{ id: "ISS-2", tieuDe: "x", dieuKienDong: "y", soNgayAnhHuong: "" }], [
        { loai: "tien-do", ma: "7.2.3", file_goc: "tiendo.json" },
      ])
    );
    expect(kq.issue[0]!.soNgayAnhHuong).toBeNull();
  });

  it("38. hai agent cùng trả một mã issue thì chỉ giữ MỘT thẻ — không đếm trùng", () => {
    const a = { ma: "tiendo", ten: "Agent Tiến độ", issue: [issue({ id: "ISS-9" })], chuaGomVi: null };
    const b = { ma: "base", ten: "Agent Base.vn", issue: [issue({ id: "ISS-9" })], chuaGomVi: null };
    const gop = gopKetQuaGom([a, b]);
    expect(gop.issue).toHaveLength(1);
    expect(gop.chuaGom).toHaveLength(0);
  });

  it("39. gộp giữ đủ danh sách con CHƯA gom được, không nuốt im lặng", () => {
    const gop = gopKetQuaGom([
      { ma: "tiendo", ten: "Agent Tiến độ", issue: [issue({ id: "A" })], chuaGomVi: null },
      { ma: "phaply", ten: "Agent Pháp lý", issue: [], chuaGomVi: "Chưa gom được từ Agent Pháp lý — đang tắt." },
    ]);
    expect(gop.issue).toHaveLength(1);
    expect(gop.chuaGom.map((c) => c.ma)).toEqual(["phaply"]);
  });

  it("40. số agent KHÔNG gắn cứng: danh bạ mấy con thì đi hỏi bấy nhiêu, trừ chính mình", () => {
    const danhBa: KhaiAgent[] = [
      { ma: "main", ten: "Main Agent", diaChi: "http://localhost:3010", duongDanMcp: "/api/mcp/main", dangBat: true },
      { ma: "tiendo", ten: "Agent Tiến độ", diaChi: "http://localhost:3003", duongDanMcp: "/api/mcp/tiendo", dangBat: true },
      { ma: "phaply", ten: "Agent Pháp lý", diaChi: "http://localhost:3013", duongDanMcp: "/api/mcp/phaply", dangBat: false },
      { ma: "thietke", ten: "Agent Thiết kế", diaChi: "http://localhost:3099", duongDanMcp: "/api/mcp/thietke", dangBat: true },
      // 26/09: agent quan sát CHỈ ĐỌC, không có sổ issue → Main không đi gom từ nó
      { ma: "quansat", ten: "Agent quan sát", diaChi: "http://localhost:3014", duongDanMcp: "/api/mcp/quansat", dangBat: true },
    ];
    const con = cacConDiHoi(danhBa);
    expect(con.map((a) => a.ma)).toEqual(["tiendo", "thietke"]); // agent thứ 6 tự chạy được; quansat bị bỏ
    expect(congCuIssue("tiendo")).toBe("tiendo.danh_sach_issue");
  });

  it("41. chuỗi dẫn nguồn ghép từ khuôn MCP đọc được, không rỗng", () => {
    const s = nguonDanTuKhuon([
      { loai: "bc-ngay", ma: "2026-08-27", file_goc: "bc-ngay.xlsx" },
      { loai: "wbs", ma: "7.2.3", file_goc: "tiendo.mpp" },
    ]);
    expect(s).toContain("bc-ngay.xlsx");
    expect(s).toContain("7.2.3");
    expect(s.includes("·")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// G. PHÂN LOẠI LẠI — LLM xếp, code chỉ bóc và áp
// ─────────────────────────────────────────────────────────────

describe("Tab 🔁 Phân loại lại — thay chỗ ba tab máy sinh (8b.1)", () => {
  it("42. bóc câu trả lời phân loại, kể cả khi LLM bọc trong ```json", () => {
    const raw = '```json\n[{"id":"ISS-1","nhomChinh":"cod","nhomPhu":["duong-gang"],"ghiChu":"đẩy COD"}]\n```';
    const dong = docTraLoiPhanLoai(raw);
    expect(dong).toHaveLength(1);
    expect(dong[0]!.nhomChinh).toBe("cod");
    expect(dong[0]!.nhomPhu).toEqual(["duong-gang"]);
  });

  it("43. LLM tự chế nhóm thứ chín thì về 📁 Khác — AI không tự thêm nhóm", () => {
    const dong = docTraLoiPhanLoai('[{"id":"ISS-1","nhomChinh":"an-toan-lao-dong"}]');
    expect(dong[0]!.nhomChinh).toBe("khac");
  });

  it("44. nhóm phụ trùng nhóm chính bị bỏ, và không lặp", () => {
    const dong = docTraLoiPhanLoai(
      '[{"id":"ISS-1","nhomChinh":"cod","nhomPhu":["cod","phap-ly","phap-ly"]}]'
    );
    expect(dong[0]!.nhomPhu).toEqual(["phap-ly"]);
  });

  it("45. dòng không có mã issue thì bỏ — không biết xếp cho ai", () => {
    expect(docTraLoiPhanLoai('[{"nhomChinh":"cod"},{"id":"ISS-2","nhomChinh":"cod"}]')).toHaveLength(1);
  });

  it("46. câu trả lời hỏng thì trả mảng rỗng, KHÔNG ném lỗi làm sập màn", () => {
    expect(docTraLoiPhanLoai("xin lỗi tôi không làm được")).toEqual([]);
    expect(docTraLoiPhanLoai("[{hỏng")).toEqual([]);
    expect(docTraLoiCanAnhXem("")).toEqual([]);
  });

  it("47. áp phân loại: issue LLM không nhắc tới thì GIỮ NGUYÊN nhóm cũ", () => {
    const ds = [issue({ id: "A", nhomChinh: "cod" }), issue({ id: "B", nhomChinh: null })];
    const sau = apDungPhanLoai(ds, [{ id: "B", nhomChinh: "mat-bang", nhomPhu: [], ghiChu: "" }]);
    expect(sau[0]!.nhomChinh).toBe("cod");
    expect(sau[1]!.nhomChinh).toBe("mat-bang");
  });

  it("48. đếm được issue chưa xếp nhóm — số này hiện trên tab Phân loại lại", () => {
    const ds = [issue({ id: "A", nhomChinh: "cod" }), issue({ id: "B" }), issue({ id: "C", daDong: true })];
    expect(chuaPhanLoai(ds).map((i) => i.id)).toEqual(["B"]);
  });

  it("49. câu hỏi phân loại nêu đủ TÁM nhóm và cấm tự đặt nhóm mới", () => {
    const p = dungPromptPhanLoai([issue({ id: "ISS-1" })]);
    for (const n of TAM_NHOM) expect(p).toContain(`"${n}"`);
    expect(p).toMatch(/KHÔNG tự đặt nhóm mới/i);
    expect(p).toContain("ISS-1");
  });

  it("50. issue bị luật cứng loại KHÔNG được đưa vào câu hỏi gửi LLM", () => {
    const p = dungPromptPhanLoai([issue({ id: "ISS-TOT" }), issue({ id: "ISS-XAU", nguonDuLieu: "" })]);
    expect(p).toContain("ISS-TOT");
    expect(p).not.toContain("ISS-XAU");
  });
});

// ─────────────────────────────────────────────────────────────
// Lỗi đo 25/09: Main gọi danh_sach_issue không xin số lượng → cổng trả mặc
// định 20, HV mất 35 thẻ mà màn không báo. Nay xin đủ trần 100; quá trần thì
// màn hiện "còn N thẻ chưa lấy về" kèm link sang màn Issue của agent đó.
// ─────────────────────────────────────────────────────────────
import { GIOI_HAN_XIN_ISSUE, cauThieuThe, demTheConThieu } from "@/lib/issue-main/model";
import { lienKetManIssue } from "@/lib/issue-main/gom";

function khuonIssue(so: number, tongMo: number) {
  const issue = Array.from({ length: so }, (_, k) => ({
    id: `ISS-${k}`,
    tieu_de: `thẻ ${k}`,
    dieu_kien_dong: "đóng khi hết vi phạm",
  }));
  return thanhCong({ so_the_dang_mo: tongMo, issue }, [{ loai: "issue", ma: "sổ", file_goc: "issues.json" }]);
}

describe("Cắt 20 thẻ — Main xin đủ và báo phần còn thiếu (lỗi đo 25/09)", () => {
  it("38. xin đúng trần chung của bốn cổng: 100", () => {
    expect(GIOI_HAN_XIN_ISSUE).toBe(100);
  });

  it("39. nhận đủ (30/30) → không thiếu thẻ nào, không có dòng báo cắt", () => {
    const kq = docIssueTuKhuon("tiendo", "Agent tiến độ", khuonIssue(30, 30));
    expect(kq.issue).toHaveLength(30);
    expect(kq.conThieu).toBe(0);
    expect(gopKetQuaGom([kq]).thieuThe).toHaveLength(0);
  });

  it("40. cổng cắt (100 trả / 145 mở) → còn đúng 45, kèm link màn Issue của agent", () => {
    const kq = docIssueTuKhuon("hopdong", "Agent Hợp đồng", khuonIssue(100, 145));
    expect(kq.conThieu).toBe(45);
    const gop = gopKetQuaGom([kq], () => "http://127.0.0.1:3012/alerts");
    expect(gop.thieuThe).toEqual([
      { ma: "hopdong", ten: "Agent Hợp đồng", soConLai: 45, lienKet: "http://127.0.0.1:3012/alerts" },
    ]);
    expect(cauThieuThe(gop.thieuThe[0]!)).toContain("Còn 45 thẻ của Agent Hợp đồng chưa lấy về");
  });

  it("41. agent không báo tổng số (pháp lý đếm sau khi cắt) mà nhận đủ trần → null = có thể còn, KHÔNG đoán số", () => {
    const kq = docIssueTuKhuon("phaply", "Agent Pháp lý", khuonIssue(100, 100));
    expect(kq.conThieu).toBeNull();
    const t = gopKetQuaGom([kq]).thieuThe[0]!;
    expect(t.soConLai).toBeNull();
    expect(cauThieuThe(t)).toMatch(/có thể còn thẻ chưa lấy về/);
  });

  it("42. câu trả lời lỗi thì không tính thiếu thẻ (đã có dòng chưa gom được)", () => {
    expect(demTheConThieu(thatBai("HET_HAN_CHO", "x"), 0, 100)).toBe(0);
  });

  it("43. link màn Issue: pháp lý /so-issue, còn lại /alerts; chưa khai địa chỉ → null", () => {
    const a = (ma: string, diaChi: string): KhaiAgent => ({ ma, ten: ma, diaChi, duongDanMcp: "/api/mcp", dangBat: true });
    expect(lienKetManIssue(a("phaply", "http://127.0.0.1:3013/"))).toBe("http://127.0.0.1:3013/so-issue");
    expect(lienKetManIssue(a("base", "http://127.0.0.1:3011"))).toBe("http://127.0.0.1:3011/alerts");
    expect(lienKetManIssue(a("base", ""))).toBeNull();
    expect(lienKetManIssue(undefined)).toBeNull();
  });
});

import { laSoKhongCoTheMo } from "@/lib/issue-main/model";

describe("Ba trạng thái trả lời: có thẻ · 0 thẻ · chưa gom được (25/09)", () => {
  const soTrong = thatBai(
    "KHONG_CO_DU_LIEU",
    'Sổ issue của dự án "hv" (HV) có 0 thẻ nhưng KHÔNG thẻ nào đang mở (file issues.json).'
  );

  it("44. sổ trống (cả câu tiến độ/Base/hợp đồng lẫn câu pháp lý) = đã trả lời, KHÔNG vào ô chưa gom", () => {
    expect(laSoKhongCoTheMo(soTrong)).toBe(true);
    expect(laSoKhongCoTheMo(thatBai("KHONG_CO_DU_LIEU", "Sổ Issue pháp lý hiện không có thẻ nào đang mở."))).toBe(true);
    const kq = docIssueTuKhuon("hopdong", "Agent Hợp đồng", soTrong);
    expect(kq.chuaGomVi).toBeNull();
    const gop = gopKetQuaGom([kq]);
    expect(gop.chuaGom).toHaveLength(0);
    expect(gop.khongCoIssue).toEqual([{ ma: "hopdong", ten: "Agent Hợp đồng" }]);
  });

  it("45. trả `issue: []` hẳn hoi cũng là sổ trống", () => {
    const kq = docIssueTuKhuon(
      "base",
      "Agent Base.vn",
      thanhCong({ so_the_dang_mo: 0, issue: [] }, [{ loai: "issue", ma: "sổ", file_goc: "issues.json" }])
    );
    expect(kq.khongCoTheMo).toBe(true);
    expect(kq.chuaGomVi).toBeNull();
  });

  it("46. CHƯA CÓ SỔ / không có dự án / lỗi mạng — cùng mã hay khác mã — vẫn là chưa gom được", () => {
    for (const k of [
      thatBai("KHONG_CO_DU_LIEU", 'CHƯA CÓ SỔ ISSUE cho dự án "n3a": thư mục có thật nhưng chưa có file'),
      thatBai("KHONG_CO_DU_LIEU", 'Không có dự án nào mang mã/slug/tên "XX" — KHÔNG lấy số của dự án khác ra thay.'),
      thatBai("HET_HAN_CHO", "quá 10 giây"),
    ]) {
      expect(laSoKhongCoTheMo(k)).toBe(false);
      const gop = gopKetQuaGom([docIssueTuKhuon("hopdong", "Agent Hợp đồng", k)]);
      expect(gop.chuaGom).toHaveLength(1);
      expect(gop.khongCoIssue).toHaveLength(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// A10a (25/09) — Xếp theo WBS: ba góc nhìn cùng WBS đặt CẠNH NHAU, không gộp
// ─────────────────────────────────────────────────────────────
import { demKhoiWbs, mangMaWbs, maWbsHopLe, neoTheWbs, soSanhMaWbs, tenNganAgent, tieuDeNgan, xepTheoWbs } from "@/lib/issue-main/model";

describe("A10a — Xếp theo WBS", () => {
  it("chỉ nhận mã WBS thật; khoá gom thẻ của Base (người:@nick …) KHÔNG phải mã", () => {
    expect(maWbsHopLe("1.1.6")).toBe("1.1.6");
    expect(maWbsHopLe(" 7.2.1.2 ")).toBe("7.2.1.2");
    expect(maWbsHopLe("4")).toBe("4");
    expect(maWbsHopLe("người:@cuongnv")).toBeNull();
    expect(maWbsHopLe("xong-giấy:@kiendt")).toBeNull();
    expect(maWbsHopLe("")).toBeNull();
    expect(maWbsHopLe(null)).toBeNull();
    expect(maWbsHopLe(116)).toBeNull();
  });

  it("docIssueTuKhuon đọc trường wbs và lọc khoá lạ", () => {
    const kq = docIssueTuKhuon(
      "base",
      "Agent Base",
      thanhCong({ issue: [
        { id: "B1", tieu_de: "a", nguon_du_lieu: "n", dieu_kien_dong: "d", wbs: "6.1.4" },
        { id: "B2", tieu_de: "b", nguon_du_lieu: "n", dieu_kien_dong: "d", wbs: "người:@x" },
        { id: "B3", tieu_de: "c", nguon_du_lieu: "n", dieu_kien_dong: "d", wbs: null },
      ] }, [{ loai: "issue", ma: "sổ Base", file_goc: "so.json" }]),
    );
    expect(kq.issue.map((i) => i.wbs)).toEqual(["6.1.4", null, null]);
  });

  it("so mã theo từng đoạn số: 1.1.9 < 1.1.10 < 1.2", () => {
    const ds = ["1.2", "1.1.10", "1.1.9", "1"].sort(soSanhMaWbs);
    expect(ds).toEqual(["1", "1.1.9", "1.1.10", "1.2"]);
  });

  it("khối ≥2 agent lên đầu, issue từng agent đứng riêng, 'Chưa gắn WBS' cuối, tên lấy từ bảng", () => {
    const ds = [
      issue({ id: "T1", agentChu: "tiendo", tenAgentChu: "Tiến độ", wbs: "1.1.1" }),
      issue({ id: "T2", agentChu: "tiendo", tenAgentChu: "Tiến độ", wbs: "6.1.4" }),
      issue({ id: "B1", agentChu: "base", tenAgentChu: "Base", wbs: "6.1.4" }),
      issue({ id: "B2", agentChu: "base", tenAgentChu: "Base", wbs: null }),
      issue({ id: "P1", agentChu: "phaply", tenAgentChu: "Pháp lý", wbs: "6.1.4" }),
      issue({ id: "P2", agentChu: "phaply", tenAgentChu: "Pháp lý" }),
      issue({ id: "D1", agentChu: "tiendo", tenAgentChu: "Tiến độ", wbs: "2.1", daDong: true }),
    ];
    const khoi = xepTheoWbs(ds, { "6.1.4": "Móng tuabin", "1.1.1": "Khảo sát" });
    expect(khoi.map((k) => k.ma)).toEqual(["6.1.4", "1.1.1", null]);
    expect(khoi[0].ten).toBe("Móng tuabin");
    expect(khoi[0].theoAgent.map((a) => [a.ma, a.issue.map((i) => i.id)])).toEqual([
      ["tiendo", ["T2"]],
      ["base", ["B1"]],
      ["phaply", ["P1"]],
    ]);
    expect(khoi[2].soIssue).toBe(2);
    expect(demKhoiWbs(khoi)).toMatchObject({ soKhoi: 2, soKhoiNhieuAgent: 1, soChuaGan: 2, soTheGom: 0, soDongTro: 0 });
    // Đã đóng chỉ hiện ở phạm vi "Đã đóng"; mã không có trong bảng tên → ten null, không bịa
    const dong = xepTheoWbs(ds, {}, true);
    expect(dong.map((k) => [k.ma, k.ten])).toEqual([["2.1", null]]);
  });

  it("không đếm trùng, không mất thẻ: tổng issue trong các khối = số thẻ hiện được đang mở", () => {
    const ds = [
      issue({ id: "A", wbs: "1" }),
      issue({ id: "B", wbs: "x" }),
      issue({ id: "C", nguonDuLieu: "" }), // bị luật A.4.1 loại — không vào khối nào
    ];
    const khoi = xepTheoWbs(ds);
    expect(khoi.reduce((s, k) => s + k.soIssue, 0)).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// Phương án a (Mr. Đại chốt 25/09): thẻ Base gom theo người giữ nguyên ở khối
// riêng; mỗi khối WBS đã có hiện dòng TRỎ tới thẻ gom chứa việc mã đó.
// ─────────────────────────────────────────────────────────────
describe("Phương án a — dòng trỏ thẻ Base gom theo người", () => {
  it("docIssueTuKhuon đọc wbs_lien_quan, lọc mã lạ, không trùng, xếp theo đoạn số", () => {
    const kq = docIssueTuKhuon(
      "base",
      "Agent Base.vn",
      thanhCong({ issue: [
        { id: "B1", tieu_de: "a", nguon_du_lieu: "n", dieu_kien_dong: "d", wbs: "người:@x", wbs_lien_quan: ["6.1.10", "6.1.4", "x", "6.1.4"] },
        { id: "B2", tieu_de: "b", nguon_du_lieu: "n", dieu_kien_dong: "d", wbs: "6.1.4" },
      ] }, [{ loai: "issue", ma: "sổ Base", file_goc: "so.json" }]),
    );
    expect(kq.issue.map((i) => [i.wbs, i.wbsLienQuan])).toEqual([
      [null, ["6.1.4", "6.1.10"]],
      ["6.1.4", []],
    ]);
    expect(mangMaWbs("6.1")).toEqual([]);
  });

  it("thẻ gom KHÔNG nhân bản; khối WBS đã có nhận dòng trỏ; mã chỉ có trong thẻ gom không mở khối", () => {
    const ds = [
      issue({ id: "T1", agentChu: "tiendo", tenAgentChu: "Agent Tiến độ", wbs: "1.1.1" }),
      issue({ id: "T2", agentChu: "tiendo", tenAgentChu: "Agent Tiến độ", wbs: "6.1.4" }),
      issue({ id: "B1", agentChu: "base", tenAgentChu: "Agent Base.vn", wbs: null, wbsLienQuan: ["1.1.1", "9.9"], tieuDe: "Nguyễn Văn Cường (@cuongnv) tồn 39 việc quá hạn ≥ 7 ngày — lâu nhất 60 ngày · 3 việc trên găng" }),
      issue({ id: "B2", agentChu: "base", tenAgentChu: "Agent Base.vn", wbs: null }),
      issue({ id: "P1", agentChu: "phaply", tenAgentChu: "Agent Pháp lý", wbs: "6.1.4" }),
    ];
    const khoi = xepTheoWbs(ds);
    expect(khoi.map((k) => [k.loai, k.ma])).toEqual([
      ["wbs", "1.1.1"], // Tiến độ + dòng trỏ Base = 2 góc nhìn → lên đầu (1.1.1 < 6.1.4)
      ["wbs", "6.1.4"],
      ["gom", null],
      ["chua-gan", null],
    ]);
    expect(khoi[0].soAgent).toBe(2);
    expect(khoi[0].troGom).toEqual([
      { id: "B1", agentChu: "base", tenAgent: "Base", tieuDeNgan: tieuDeNgan(ds[2].tieuDe) },
    ]);
    expect(khoi[1].troGom).toEqual([]);
    expect(khoi[2].ten).toBe("Base — gom theo người");
    expect(khoi[2].theoAgent.flatMap((a) => a.issue.map((i) => i.id))).toEqual(["B1"]);
    expect(khoi[3].theoAgent.flatMap((a) => a.issue.map((i) => i.id))).toEqual(["B2"]);
    // Không đếm trùng: mỗi thẻ đúng một khối
    expect(khoi.reduce((s, k) => s + k.soIssue, 0)).toBe(5);
    expect(demKhoiWbs(khoi)).toEqual({
      soKhoi: 2,
      soKhoiNhieuAgent: 2,
      soChuaGan: 1,
      soTheGom: 1,
      soDongTro: 1,
      soMaTrongTheGom: 2,
      soMaTrongTheGomCoKhoi: 1,
    });
  });

  it("khối đã có thẻ Base riêng + dòng trỏ Base vẫn chỉ tính Base một lần", () => {
    const ds = [
      issue({ id: "B0", agentChu: "base", tenAgentChu: "Agent Base.vn", wbs: "6.1.4" }),
      issue({ id: "B1", agentChu: "base", tenAgentChu: "Agent Base.vn", wbs: null, wbsLienQuan: ["6.1.4"] }),
    ];
    const k = xepTheoWbs(ds)[0];
    expect(k.soAgent).toBe(1);
    expect(k.troGom.map((t) => t.id)).toEqual(["B1"]);
  });

  it("tên ngắn · tiêu đề ngắn · neo", () => {
    expect(tenNganAgent("Agent Base.vn")).toBe("Base");
    expect(tenNganAgent("Agent Tiến độ")).toBe("Tiến độ");
    expect(tieuDeNgan("ngắn")).toBe("ngắn");
    const dai = tieuDeNgan("Nguyễn Văn Cường (@cuongnv) tồn 39 việc quá hạn ≥ 7 ngày — lâu nhất 60 ngày · 3 việc trên găng");
    expect(dai.length).toBeLessThanOrEqual(71);
    expect(dai.endsWith("…")).toBe(true);
    expect(neoTheWbs("base", "ISS-2026-39-001")).toBe("the-wbs-base-ISS-2026-39-001");
  });
});

// ============================================================
// scripts/tao-mau-word.mjs — SINH MẪU + BÁO CÁO VÍ DỤ.
//
// Chạy: node scripts/tao-mau-word.mjs
//   1. Chuyển 9 mẫu thật (mau-word/goc/) sang dạng có ô nhập gắn mã → mau-word/form-0..8.docx + dinh-nghia.json
//      (xem scripts/chuyen-mau-that.mjs).
//   2. Dựng các báo cáo ví dụ trong mau-word/vi-du/ TỪ mẫu đã chuyển (điền ô gắn mã) — dùng cho test và demo.
//      Nội dung lấy theo kịch bản của kế hoạch v2 (GPMB Trụ T11, SCI E&C tháng 7, relay R21 Nậm Xe...).
// ============================================================

import JSZip from "jszip";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chuyenTatCa, dienBaoCao, tuanIso } from "./chuyen-mau-that.mjs";

const GOC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "mau-word");

/** Báo cáo điền từ mẫu đã chuyển (mau-word/form-N.docx). g: xem dienBaoCao. */
export async function taoBaoCao(ma, g = {}) {
  return dienBaoCao(fs.readFileSync(path.join(GOC, `${ma}.docx`)), g);
}

// ---------------- Word tối thiểu (tài liệu không theo mẫu) ----------------

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (t, b = false) => `<w:p><w:r>${b ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;

export async function dongGoiDocx(bodyXml, title = "SCI công việc") {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file(
    "docProps/core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title></cp:coreProperties>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="850" w:bottom="1000" w:left="950" w:header="600" w:footer="600" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------------- Dữ liệu ví dụ ----------------

// Bản 9 (01/10/2026): máy kiểm "từ – đến" khớp số tuần ISO — ngày tính từ số tuần, không ghi tay (ví dụ cũ lệch 1 ngày)
const tuan = (so) => {
  const [tu, den] = tuanIso(so, 2026);
  return { chon: "tuan", tuan: `${so}/2026   (${tu} – ${den})` };
};

function bqlda(soTuan, nguoiLap) {
  const t28 = soTuan === 28;
  return {
    o: {
      ky_bao_cao: t28 ? tuan(28, "07/07/2026", "13/07/2026") : tuan(29, "14/07/2026", "20/07/2026"),
      nguoi_lap: nguoiLap || "......",
      ngay_lap: t28 ? "13/07/2026" : "21/07/2026",
      ky_nguoi_lap: nguoiLap || "......",
    },
    bang: {
      bang_cong_viec: [
        { ten: "GPMB Trụ T11", du_an: "ĐG Hướng Việt", phu_trach: "BQLDA Quảng Trị", bat_dau: t28 ? "07/07/2026" : "14/07/2026", ket_thuc: t28 ? "30/07/2026" : "05/08/2026", ket_qua_can_co: "Thỏa thuận xong với 3 hộ" },
        { ten: "Chuyển mục đích đất rừng T14–T16", du_an: "ĐG Hướng Việt", phu_trach: "", ket_qua_can_co: "Có văn bản Sở NN&PTNT chuyển mục đích" },
        { ten: "Thi công móng trụ T5–T8", du_an: "ĐG Hướng Việt", phu_trach: "BQLDA QT; SCI E&C", bat_dau: "01/07/2026", ket_thuc: "15/08/2026", ket_qua_can_co: "Hoàn thành móng 4 trụ" },
      ],
    },
  };
}

function sciEnc(ban) {
  return {
    o: {
      ky_bao_cao: { chon: "thang", thang: "07/2026" },
      nguoi_lap: "Đặng Thị Hoa",
      ngay_lap: ban === 1 ? "03/08/2026" : "05/08/2026",
      ky_nguoi_lap: "Đặng Thị Hoa",
      ky_truong_don_vi: "Bùi Văn Cường",
    },
    bang: {
      bang_cong_viec: [
        { stt: "1", ten: "Đập chính Nậm Mô 1 đạt 85%", phu_trach: "SCI E&C", ket_thuc: "31/08/2026", ket_qua_can_co: "Đập chính đạt 85%" },
        { stt: "2", ten: "Rotor turbine Nậm Mô 1 về chậm", phu_trach: "PGĐ Kỹ thuật SCI ENC", ket_thuc: "", ket_qua_can_co: "Rotor về công trường" },
        { stt: "3", ten: "Gia hạn GPXD Nậm Khiên 1", phu_trach: "SCI E&C; Phòng ĐT&PC", ket_thuc: "20/08/2026", ket_qua_can_co: "Có giấy phép gia hạn" },
        { stt: "4", ten: "Thu vốn đợt 4 Nậm Khiên 1 (12,5 tỷ)", phu_trach: "GĐ SCI ENC + Phòng Tài chính Kế toán", ket_thuc: "25/08/2026", ket_qua_can_co: "Thu đủ 12,5 tỷ đồng" },
        { stt: "5", ten: "Đập chính Nậm Khiên 1 đạt 75%", phu_trach: "SCI E&C", ket_thuc: "31/08/2026", ket_qua_can_co: "Đập chính đạt 75%" },
      ],
    },
    // Bản 1 thiếu số liệu thu vốn Nậm Khiên 1 (mục IV) — P.ĐT&PC trả lại; bản 2 bổ sung
    ...(ban === 1 ? { thay: [["1.060,0", "......"], ["40,0%", "......"], ["12,5 tỷ", "......"]] } : {}),
  };
}

const DTPC_T29 = {
  o: { nguoi_lap: "Phạm Thu Hà", ky_nguoi_lap: "Phạm Thu Hà", ky_truong_don_vi: "Lê Minh Tuấn" },
  bang: {
    bang_cong_viec: [
      { ten: "GPMB Trụ T11", du_an: "ĐG Hướng Việt", phu_trach: "BQLDA Quảng Trị; Phòng Đầu tư và Pháp chế", bat_dau: "14/07/2026", ket_thuc: "10/08/2026", ket_qua_can_co: "Chi trả xong cho 3 hộ" },
      { ten: "Gia hạn GPXD Nậm Khiên 1", du_an: "Nậm Khiên 1", phu_trach: "Phòng Đầu tư và Pháp chế", bat_dau: "21/07/2026", ket_thuc: "20/08/2026", ket_qua_can_co: "Có giấy phép gia hạn" },
    ],
  },
};

const NAMXE_T29 = {
  o: { nguoi_lap: "Nguyễn Văn Tâm", ky_nguoi_lap: "Nguyễn Văn Tâm", ky_truong_don_vi: "Mai Văn Sơn" },
  bang: {
    bang_cong_viec: [
      { ten: "Thay relay bảo vệ R21 máy phát TM2", du_an: "NM Nậm Xe", phu_trach: "Phòng KT&VH; Phòng Tài chính Kế toán; Nhà máy thủy điện Nậm Xe", bat_dau: "21/07/2026", ket_thuc: "31/07/2026", ket_qua_can_co: "Relay mới vận hành, thí nghiệm đạt" },
    ],
  },
};

const TGD_T30 = {
  // Mẫu Form 0 đã ghi sẵn tuần 30, người tổng hợp, người kiểm tra
  bang_them: {
    bang_quyet_dinh: [
      { uu_tien: "4", ten: "Chi trả GPMB Trụ T11\nNâng đơn giá bồi thường cho 3 hộ theo QĐ mới của UBND tỉnh", phu_trach: "BQLDA QT + P.ĐT&PC", han_quyet_dinh: "28/07/2026", tai_lieu: "✅ Tờ trình của BQLDA QT, biên bản làm việc với 3 hộ" },
    ],
  },
  bang: {
    bang_cong_viec: [
      { ten: "Theo dõi thu vốn đợt 4 Nậm Khiên 1", du_an: "Nậm Khiên 1", phu_trach: "Phòng Tài chính Kế toán", bat_dau: "22/07/2026", ket_thuc: "25/08/2026", ket_qua_can_co: "Thu đủ 12,5 tỷ đồng" },
    ],
  },
};

/** Dữ liệu ví dụ (cho test dựng biến thể: ngày ngược, ngày trống...). */
export const VI_DU = { bqlda, sciEnc, DTPC_T29, NAMXE_T29, TGD_T30 };

async function yKienPhapLy() {
  return dongGoiDocx(
    [
      p("CÔNG TY CỔ PHẦN SCI — PHÒNG ĐẦU TƯ VÀ PHÁP CHẾ", true),
      p("Ý KIẾN PHÁP LÝ VỀ THU VỐN ĐỢT 4 DỰ ÁN NẬM KHIÊN 1", true),
      p("Kính gửi: Phòng Tài chính Kế toán"),
      p("1. Căn cứ hợp đồng EPC và phụ lục 03, BQLDA NK1 có nghĩa vụ thanh toán đợt 4 (12,5 tỷ đồng) trong 30 ngày kể từ ngày nghiệm thu."),
      p("2. Đến nay BQLDA NK1 đã chậm 18 ngày. SCI E&C có quyền yêu cầu lãi chậm trả theo điều 11 hợp đồng."),
      p("3. Đề nghị Phòng TCKT gửi văn bản đòi nợ lần 1, đồng thời chuẩn bị hồ sơ phạt chậm thanh toán."),
      p("Người lập: Phạm Thu Hà · Ngày 05/08/2026"),
    ].join(""),
    "Ý kiến pháp lý thu vốn",
  );
}

async function saiMau() {
  // Người dùng tự gõ lại báo cáo, không dùng mẫu (không có ô gắn mã, không có dấu nhận mẫu)
  return dongGoiDocx([p("BÁO CÁO TUẦN 29", true), p("Đơn vị: BQLDA Quảng Trị"), p("Người lập: Lý Thị Nga"), p("Nội dung: tiến độ dự án ĐG Hướng Việt đạt 41,5%.")].join(""), "Báo cáo tự gõ");
}

export async function taoViDu(thuMuc = GOC) {
  const viDu = path.join(thuMuc, "vi-du");
  fs.mkdirSync(viDu, { recursive: true });
  const ghi = async (ten, buf) => fs.writeFileSync(path.join(viDu, ten), await buf);
  await ghi("BaoCao_Tuan28_BQLDA_QuangTri.docx", taoBaoCao("form-7", bqlda(28, "Lý Thị Nga")));
  await ghi("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx", taoBaoCao("form-7", bqlda(29, "")));
  await ghi("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", taoBaoCao("form-7", bqlda(29, "Lý Thị Nga")));
  await ghi("BaoCao_Thang7_SCI_ENC.docx", taoBaoCao("form-6", sciEnc(1)));
  await ghi("BaoCao_Thang7_SCI_ENC_ban2.docx", taoBaoCao("form-6", sciEnc(2)));
  await ghi("BaoCao_Tuan29_PDTPC.docx", taoBaoCao("form-1", DTPC_T29));
  await ghi("BaoCao_Tuan29_NM_NamXe.docx", taoBaoCao("form-8", NAMXE_T29));
  await ghi("BaoCao_HopNhat_Tuan30.docx", taoBaoCao("form-0", TGD_T30));
  await ghi("YKien_PhapLy_ThuVon.docx", yKienPhapLy());
  await ghi("BaoCao_SaiMau.docx", saiMau());
  // Có dấu mẫu Form 7 nhưng bị xóa mất mục "Rủi ro & kiến nghị" và ô Người kiểm soát
  await ghi(
    "BaoCao_Tuan29_BQLDA_MatO.docx",
    taoBaoCao("form-7", { ...bqlda(29, "Lý Thị Nga"), bo_muc: ["RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC"], bo_o: ["nguoi_kiem_soat"] }),
  );
}

export async function taoTatCa(thuMuc = GOC) {
  const bao = await chuyenTatCa(thuMuc);
  await taoViDu(thuMuc);
  // Mẫu trắng (bản người dùng tải về) dựng từ mẫu vừa chuyển — luôn đi cùng để hai bộ không lệch nhau
  const { taoTatCaMauTrang } = await import("./tao-mau-trang.mjs");
  await taoTatCaMauTrang(thuMuc);
  return { thuMuc, so_mau: bao.length, bao };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  taoTatCa().then((kq) => console.log(`${kq.bao.join("\n")}\n\nĐã chuyển ${kq.so_mau} mẫu thật, dựng báo cáo ví dụ và mẫu trắng vào ${kq.thuMuc}`));
}

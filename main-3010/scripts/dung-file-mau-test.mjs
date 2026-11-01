// ============================================================
// DỰNG BỘ FILE MẪU CỐ TÌNH SAI — phục vụ kịch bản test (Mr. Đại giao 06/09).
//
// Mỗi file sai ĐÚNG MỘT chỗ, để khi cửa kiểm báo lỗi thì biết chắc nó bắt
// đúng cái gì. File nào cũng có bản "đúng" tương ứng để so sánh.
//
// Chạy:  node scripts/dung-file-mau-test.mjs
// Ra:    data/mau-test/  (không commit — xem .gitignore)
//
// Khuôn báo cáo ngày lấy từ file thật đang có trong kho:
//   dòng 0 tiêu đề · dòng 3 "Nhà thầu:" · dòng 4 "Ngày BC:" · dòng 6 hàng
//   tiêu đề cột · từ dòng 7 là khối lượng · cuối là thời tiết/ghi chú/ảnh.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const RA = path.join(process.cwd(), "data", "mau-test");
fs.mkdirSync(RA, { recursive: true });

// Cột "Nhà thầu" là BẮT BUỘC trong bảng khối lượng — ĐO 06/09 tại
// lib/lop0/chan.ts:369: luật C7 (nhà thầu lạ) đọc tên ở CỘT CỦA TỪNG DÒNG,
// không đọc ô "Nhà thầu:" trên đầu file. Thiếu cột này thì C7 im lặng.
const COT = [
  "STT",
  "WBS",
  "Nội dung công việc",
  "Đơn vị",
  "KL hôm nay",
  "Lũy kế đến hôm nay",
  "Nhà thầu",
  "Tình trạng",
  "Nhân lực / Thiết bị",
  "Vướng mắc",
];

/** Một dòng khối lượng bình thường — nhà thầu mặc định lấy trong danh mục thật */
function dong(stt, wbs, ten, dvt, kl, luyKe, nhaThau = "Tổng thầu EPC") {
  return [stt, wbs, ten, dvt, kl, luyKe, nhaThau, "Đang thi công", "12 người / 4 xe", ""];
}

/**
 * Dựng một file báo cáo ngày.
 * `sua` là hàm được gọi với mảng dòng để bẻ cong cho sai đúng một chỗ.
 */
function baoCaoNgay({
  ten,
  nhaThau = "TS",
  ngay = "2026-09-01",
  dongKl,
  ghiChu = "",
  maDuAn = "HV",
  nguonLuc = "1 KT, 20 CN đắp cấp phối; 1 máy đào, 2 xe ben",
}) {
  // Ba trường BẮT BUỘC của biểu mẫu v2.0 — ĐO trong lib/lop0/chan.ts ngày 06/09:
  //   "Mã dự án" (mã lỗi L-MADA) · "Nhà thầu" (L-NT) · "Chi tiết" nguồn lực
  //   (L-NGUONLUC). Thiếu bất kỳ ô nào là file bị chặn NGAY, chưa kịp xét tới
  //   cái sai mình cố tình gài — nên bản "đúng" phải có đủ ba.
  const rows = [
    ["BÁO CÁO THI CÔNG NGÀY"],
    [],
    ["Mã dự án:", maDuAn],
    ["Nhà thầu:", nhaThau],
    ["Ngày BC:", ngay],
    [],
    COT,
    ...dongKl,
    [],
    ["Chi tiết", nguonLuc],
    ["Thời tiết", "Nắng"],
    ["Ảnh hưởng TC", "Không ảnh hưởng"],
    ["Ghi chú", ghiChu],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "BC Ngày");
  const duong = path.join(RA, ten);
  XLSX.writeFile(wb, duong);
  return ten;
}

// WBS phải CÓ THẬT trong cây tiến độ dự án Điện gió Hướng Việt, nếu không thì
// dính lỗi C6 (WBS không thuộc cây) và che mất cái sai mình muốn thử.
// Đo ngày 06/09: cây có 330 đầu việc, 265 việc lá.
const KL_DUNG = [
  dong(1, "1.1.1", "Khảo sát phục vụ FS/thiết kế cơ sở", "bộ", 1, 1),
  dong(2, "1.1.2", "Thỏa thuận hướng tuyến", "bộ", 1, 1),
];

const daDung = [];

// ===== BẢN ĐÚNG — để so sánh, phải nạp trót lọt =====
daDung.push(
  baoCaoNgay({ ten: "00-DUNG-bao-cao-ngay.xlsx", dongKl: KL_DUNG })
);

// ===== C1 — mã dự án trong file khác dự án đang nạp =====
daDung.push(
  baoCaoNgay({
    ten: "C1-sai-ma-du-an.xlsx",
    maDuAn: "BT", // Bắc Ái — khác dự án đang mở
    dongKl: KL_DUNG,
  })
);

// ===== C2 — một file trộn WBS của hai dự án =====
daDung.push(
  baoCaoNgay({
    ten: "C2-tron-hai-du-an.xlsx",
    // ĐO 06/09: cửa kiểm dò MÃ DỰ ÁN trong Ô (danh sách HV/TT/BT), không dò
    // tiền tố của mã công việc. Nên phải gài mã "BT" vào một ô thật thì luật
    // C2 mới bật — gài bằng tiền tố WBS là không ăn.
    dongKl: [
      dong(1, "1.1.1", "Khảo sát phục vụ FS (dự án HV)", "bộ", 1, 1),
      [2, "1.1.2", "Đào móng trụ T05", "bộ", 60, 300, "Tổng thầu EPC", "BT", "12 người", ""],
    ],
  })
);

// ===== C3 — nộp trùng: bản sao y hệt file đúng =====
daDung.push(
  baoCaoNgay({ ten: "C3-nop-trung-ban-sao.xlsx", dongKl: KL_DUNG })
);

// ===== C4a — file rác đội lốt .xlsx =====
{
  const ten = "C4a-file-rac-doi-lot-xlsx.xlsx";
  fs.writeFileSync(
    path.join(RA, ten),
    "Đây không phải file Excel. Chỉ là chữ thường được đặt đuôi .xlsx để thử cửa kiểm C4.\n"
  );
  daDung.push(ten);
}

// ===== C4b — Excel mở được nhưng KHÔNG phải biểu mẫu hệ thống =====
{
  const ten = "C4b-excel-khong-phai-bieu-mau.xlsx";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Danh sách mua sắm văn phòng phẩm"],
      ["STT", "Tên hàng", "Số lượng"],
      [1, "Giấy A4", 20],
    ]),
    "Sheet1"
  );
  XLSX.writeFile(wb, path.join(RA, ten));
  daDung.push(ten);
}

// ===== L-NGUONLUC — đúng khuôn nhưng BỎ TRỐNG ô nguồn lực =====
daDung.push(
  baoCaoNgay({ ten: "L-thieu-o-nguon-luc.xlsx", dongKl: KL_DUNG, nguonLuc: "" })
);

// ===== L-MADA — bỏ trống ô mã dự án =====
daDung.push(
  baoCaoNgay({ ten: "L-thieu-ma-du-an.xlsx", dongKl: KL_DUNG, maDuAn: "" })
);

// ===== C5 — trùng kỳ: cùng ngày, cùng nhà thầu, số liệu khác =====
daDung.push(
  baoCaoNgay({
    ten: "C5-trung-ky-cung-ngay-cung-nha-thau.xlsx",
    dongKl: [dong(1, "1.1.1", "Khảo sát phục vụ FS", "bộ", 2, 2)],
  })
);

// ===== C6 — WBS không thuộc cây tiến độ (chỉ vài dòng sai) =====
daDung.push(
  baoCaoNgay({
    ten: "C6-wbs-khong-co-trong-cay.xlsx",
    dongKl: [
      dong(1, "1.1.1", "Khảo sát phục vụ FS (dòng ĐÚNG)", "bộ", 1, 1),
      dong(2, "99.99.99", "Việc bịa không có trong tiến độ", "m³", 10, 10),
      dong(3, "1.1.2", "Thỏa thuận hướng tuyến (dòng ĐÚNG)", "bộ", 1, 1),
    ],
  })
);

// ===== C7 — nhà thầu lạ chưa khai trong danh mục =====
daDung.push(
  baoCaoNgay({
    ten: "C7-nha-thau-la.xlsx",
    // ĐO 06/09: luật C7 so tên ở CỘT NHÀ THẦU CỦA TỪNG DÒNG với danh mục lấy
    // từ cây tiến độ, không nhìn ô "Nhà thầu:" ở đầu file.
    nhaThau: "XYZ-CHUA-KHAI",
    dongKl: [
      dong(1, "1.1.1", "Khảo sát phục vụ FS", "bộ", 1, 1, "XYZ-CHUA-KHAI"),
    ],
  })
);

// ===== C8a — khối lượng ÂM =====
daDung.push(
  baoCaoNgay({
    ten: "C8a-khoi-luong-am.xlsx",
    dongKl: [dong(1, "1.1.1", "Khảo sát phục vụ FS", "bộ", -40, 400)],
  })
);

// ===== C8b — chữ trong ô số =====
daDung.push(
  baoCaoNgay({
    ten: "C8b-chu-trong-o-so.xlsx",
    dongKl: [dong(1, "1.1.1", "Khảo sát phục vụ FS", "bộ", "khoảng bốn mươi", 440)],
  })
);

// ===== C8c — ngày không tồn tại =====
daDung.push(
  baoCaoNgay({ ten: "C8c-ngay-khong-ton-tai.xlsx", ngay: "2026-02-31", dongKl: KL_DUNG })
);

// ===== C8d — ngày ở tương lai =====
{
  const sau = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  daDung.push(
    baoCaoNgay({ ten: "C8d-ngay-tuong-lai.xlsx", ngay: sau, dongKl: KL_DUNG })
  );
}

// ===== CHAN-14 — TOÀN BỘ dòng đều sai =====
daDung.push(
  baoCaoNgay({
    ten: "CHAN14-moi-dong-deu-sai.xlsx",
    dongKl: [
      dong(1, "88.1", "Việc bịa 1", "m³", -5, 0),
      dong(2, "88.2", "Việc bịa 2", "m³", "ba mươi", 0),
      dong(3, "88.3", "Việc bịa 3", "m³", -9, 0),
    ],
  })
);

// ===== TD-15 — tiến độ nối vòng tròn (A chờ B, B chờ A) =====
{
  const ten = "TD15-tien-do-noi-vong-tron.xlsx";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["ID", "WBS", "Tên công việc", "Bắt đầu", "Kết thúc", "Việc trước"],
      [1, "1.1", "Việc A", "2026-09-01", "2026-09-10", "2"],
      [2, "1.2", "Việc B", "2026-09-11", "2026-09-20", "1"],
    ]),
    "Tiến độ"
  );
  XLSX.writeFile(wb, path.join(RA, ten));
  daDung.push(ten);
}

// ===== TD-14 — công việc kéo dài 0 ngày (mốc) =====
{
  const ten = "TD14-cong-viec-0-ngay-la-moc.xlsx";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["ID", "WBS", "Tên công việc", "Bắt đầu", "Kết thúc", "Việc trước"],
      [1, "1.1", "Khởi công", "2026-09-01", "2026-09-01", ""],
      [2, "1.2", "Thi công móng", "2026-09-02", "2026-09-30", "1"],
    ]),
    "Tiến độ"
  );
  XLSX.writeFile(wb, path.join(RA, ten));
  daDung.push(ten);
}

// ===== TD-13 — tiến độ chỉ có MỘT công việc =====
{
  const ten = "TD13-chi-mot-cong-viec.xlsx";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["ID", "WBS", "Tên công việc", "Bắt đầu", "Kết thúc", "Việc trước"],
      [1, "1.1", "Việc duy nhất", "2026-09-01", "2026-09-30", ""],
    ]),
    "Tiến độ"
  );
  XLSX.writeFile(wb, path.join(RA, ten));
  daDung.push(ten);
}

// ===== QT-02 — vi phạm luật chờ bê tông: dựng tháp cách đổ móng 10 ngày =====
{
  const ten = "QT02-dung-thap-cach-do-mong-10-ngay.xlsx";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["ID", "WBS", "Tên công việc", "Bắt đầu", "Kết thúc", "Việc trước"],
      [1, "5.1", "Đổ bê tông móng TB03", "2026-09-01", "2026-09-05", ""],
      [2, "5.2", "Dựng tháp TB03", "2026-09-15", "2026-09-25", "1"],
    ]),
    "Tiến độ"
  );
  XLSX.writeFile(wb, path.join(RA, ten));
  daDung.push(ten);
}

// ===== QT-06 — tên việc GẦN GIỐNG nhưng không phải cặp trong quy tắc =====
{
  const ten = "QT06-ten-gan-giong-khong-duoc-bao-oan.xlsx";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["ID", "WBS", "Tên công việc", "Bắt đầu", "Kết thúc", "Việc trước"],
      [1, "6.1", "Đổ bê tông rãnh thoát nước", "2026-09-01", "2026-09-05", ""],
      [2, "6.2", "Dựng hàng rào tạm", "2026-09-08", "2026-09-12", "1"],
    ]),
    "Tiến độ"
  );
  XLSX.writeFile(wb, path.join(RA, ten));
  daDung.push(ten);
}

// ===== Bảng tra cho người test =====
const doc = `# BỘ FILE MẪU CỐ TÌNH SAI — dùng cho kịch bản test

Sinh bằng \`node scripts/dung-file-mau-test.mjs\`. Mỗi file sai **đúng một chỗ**.
Nạp qua màn **Hồ sơ dự án → khung AI bên phải**, với dự án **Điện gió Hướng Việt**.

> ⚠ Bộ này gắn với cây tiến độ của dự án Hướng Việt (330 đầu việc, 5 nhà thầu).
> Nạp vào dự án khác thì mã công việc thành "không thuộc cây" và mọi file đều
> bị chặn vì lý do đó, che mất cái sai thật sự muốn thử.

## Đã chạy thử qua chính cửa kiểm — cột cuối là kết quả ĐO, không phải dự đoán

| File | Bài | Sai chỗ nào | Cửa kiểm trả về (đo 06/09) |
|---|---|---|---|
| 00-DUNG-bao-cao-ngay.xlsx | đối chứng | không sai gì | ✅ **Qua** — đọc 2 dòng, 0 lỗi |
| C1-sai-ma-du-an.xlsx | CHAN-01 | ô Mã dự án ghi BT | ✅ Chặn **C1** |
| C2-tron-hai-du-an.xlsx | CHAN-02 | gài mã BT vào một ô | ✅ Chặn **C2** |
| C3-nop-trung-ban-sao.xlsx | CHAN-03 | y hệt file đúng | ✅ Chặn **C3** *(nạp 00-DUNG trước)* |
| C4a-file-rac-doi-lot-xlsx.xlsx | CHAN-04 | chữ thường đội đuôi .xlsx | ✅ Chặn **C4** |
| C4b-excel-khong-phai-bieu-mau.xlsx | CHAN-04 | Excel thật, sai biểu mẫu | ✅ Chặn **C4** |
| C5-trung-ky…xlsx | CHAN-05 | cùng ngày cùng nhà thầu | ✅ **Cảnh báo C5**, không chặn — đúng thiết kế |
| C6-wbs-khong-co-trong-cay.xlsx | CHAN-06 | dòng 2 mang WBS 99.99.99 | ✅ Chặn **C6**, loại **đúng 1/3 dòng** |
| C7-nha-thau-la.xlsx | CHAN-07 | nhà thầu XYZ-CHUA-KHAI | ⚠ **KHÔNG bật cảnh báo** — xem ghi chú dưới |
| C8a-khoi-luong-am.xlsx | CHAN-08 | KL = −40 | ✅ Chặn **C8** |
| C8b-chu-trong-o-so.xlsx | CHAN-11 | KL = "khoảng bốn mươi" | ✅ Chặn **C8** |
| C8c-ngay-khong-ton-tai.xlsx | CHAN-09 | ngày 2026-02-31 | ✅ Chặn **L-NGAY** |
| C8d-ngay-tuong-lai.xlsx | CHAN-10 | ngày sau hôm nay 90 ngày | ✅ Chặn **C8** |
| CHAN14-moi-dong-deu-sai.xlsx | CHAN-14 | cả 3 dòng hỏng | ✅ Loại **3/3 dòng** |
| L-thieu-ma-du-an.xlsx | (thêm) | bỏ trống ô Mã dự án | ✅ Chặn **L-MADA** |
| L-thieu-o-nguon-luc.xlsx | (thêm) | bỏ trống ô Chi tiết nguồn lực | ✅ Chặn **L-NGUONLUC** |
| TD13-chi-mot-cong-viec.xlsx | TD-13 | chỉ 1 công việc | nạp qua màn **Lập tiến độ** |
| TD14-cong-viec-0-ngay-la-moc.xlsx | TD-14 | việc dài 0 ngày | nạp qua màn **Lập tiến độ** |
| TD15-tien-do-noi-vong-tron.xlsx | TD-15 | A chờ B, B chờ A | nạp qua màn **Lập tiến độ** |
| QT02-dung-thap-cach-do-mong-10-ngay.xlsx | QT-02 | cách nhau 10 ngày | nạp qua màn **Lập tiến độ** |
| QT06-ten-gan-giong…xlsx | QT-06 | bẫy báo oan | nạp qua màn **Lập tiến độ** |

## ⚠ Một chỗ CHƯA giải thích được — đáng nghi là lỗi thật

**CHAN-07 (nhà thầu lạ)** không bật cảnh báo, dù đã dựng file đúng khuôn mà cửa
kiểm đòi. Đã đo và loại trừ được ba nguyên nhân:

- Cây tiến độ **có** 5 nhà thầu (Tư vấn FS · BQL · Tư vấn TK · NCC Thiết bị · Tổng thầu EPC)
  → không phải "danh mục rỗng nên bỏ qua".
- File **có** cột "Nhà thầu" ở đúng bảng khối lượng, giá trị "XYZ-CHUA-KHAI".
- Cùng file đó, luật C6 và C8 chạy bình thường → cột đã được dò đúng.

Nghĩa là hoặc luật C7 có lỗi, hoặc còn một điều kiện chưa tìm ra. **Chưa kết luận**
— cần mở \`lib/lop0/chan.ts\` quanh dòng 369–410 đo tiếp. Đừng ghi bài CHAN-07
là "đạt" cho tới khi làm rõ.

## Thứ tự nạp cho hai bài cần bối cảnh

- **CHAN-03 (nộp trùng):** nạp \`00-DUNG\` trước → rồi nạp \`C3\`.
- **CHAN-05 (trùng kỳ):** nạp \`00-DUNG\` trước → rồi nạp \`C5\`.

Hai file này nạp một mình sẽ **qua được** — đó là đúng, không phải lỗi.
\`;
fs.writeFileSync(path.join(RA, "DOC-TRUOC-KHI-TEST.md"), doc, "utf8");

console.log(`Đã dựng ${daDung.length} file mẫu + bảng tra vào: ${RA}`);
for (const t of daDung) console.log("  -", t);

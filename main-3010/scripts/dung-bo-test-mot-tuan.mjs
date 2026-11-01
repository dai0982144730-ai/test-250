#!/usr/bin/env node
// ============================================================
// DỰNG BỘ FILE TEST MỘT TUẦN — Mr. Đại giao 06/09, điểm 3 của gói bàn giao.
//
// "bộ file test 1 tuần có đủ báo cáo ngày của các thầu phụ, báo cáo tuần của
//  tổng thầu. nối tiếp vào các báo cáo có trong cơ sở dữ liệu."
//
// NỐI TIẾP nghĩa là: khối lượng lũy kế bắt đầu đúng từ chỗ tuần trước dừng.
// Nạp bộ này vào là biểu đồ chạy tiếp một tuần, không gãy khúc, không âm.
//
// Đo trong CSDL ngày 06/09 để biết nối vào đâu:
//   · Ba thầu phụ: TS · Điện 8 · SNP, mỗi thầu có bộ mã công việc riêng
//   · Tuần cuối cùng đã có: 2026-W35 (24/08 → 30/08)
//   · Tổng thầu nộp báo cáo tuần: BC-tuan_HV_2026-W35_TongThau.xlsx
//   → Sinh tiếp tuần 2026-W36 (31/08 → 06/09), 6 ngày làm việc, nghỉ Chủ nhật.
//
// Chạy:  node scripts/dung-bo-test-mot-tuan.mjs
// Ra:    data/bo-test-mot-tuan/  (19 file .xlsx + bảng tra)
// ============================================================

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const GOC = process.cwd();
const PID = "dien-gio-huong-viet-hv-du-lieu";
const NGUON = path.join(GOC, "data", "projects", PID);
const RA = path.join(GOC, "data", "bo-test-mot-tuan");

const TUAN_MOI = "2026-W36";
const NGAY_CUOI_TUAN_TRUOC = "2026-08-30";
/** 31/08 → 05/09; Chủ nhật 06/09 nghỉ, cố ý không có báo cáo */
const NGAY_LAM = [
  "2026-08-31",
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
];

const THAU = [
  { ma: "ts", ten: "TS" },
  { ma: "dien-8", ten: "Điện 8" },
  { ma: "snp", ten: "SNP" },
];

const COT_NGAY = [
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

const COT_TUAN = [
  "STT",
  "WBS",
  "Nội dung công việc",
  "Nhà thầu",
  "Đơn vị",
  "KL thiết kế",
  "KL tuần",
  "Lũy kế",
  "% hoàn thành",
  "KH tuần sau",
  "Lý do chênh lệch",
  "Ghi chú",
];

/** Thời tiết tuần — cố ý có hai ngày mưa để engine có cái mà nói */
const THOI_TIET = {
  "2026-08-31": ["Nắng", "Không ảnh hưởng"],
  "2026-09-01": ["Nắng", "Không ảnh hưởng"],
  "2026-09-02": ["Mưa rào", "Dừng đổ bê tông buổi chiều"],
  "2026-09-03": ["Mưa to", "Dừng thi công cả ngày"],
  "2026-09-04": ["Âm u", "Không ảnh hưởng"],
  "2026-09-05": ["Nắng", "Không ảnh hưởng"],
};

/** Ngày mưa thì làm ít đi — số liệu phải khớp với ô thời tiết, nếu không thì
 *  bộ test tự mâu thuẫn và người soát sẽ mất tin. */
const HE_SO = {
  "2026-08-31": 1,
  "2026-09-01": 1,
  "2026-09-02": 0.55,
  "2026-09-03": 0,
  "2026-09-04": 0.9,
  "2026-09-05": 1,
};

// ---------- đọc chỗ tuần trước dừng ----------

function docMocCuoi() {
  const moc = new Map(); // "thầu|wbs" → { name, unit, todayQty, cumulativeQty }
  for (const t of THAU) {
    const f = path.join(NGUON, `dayreport-${NGAY_CUOI_TUAN_TRUOC}-${t.ma}.json`);
    if (!fs.existsSync(f)) {
      throw new Error(`Không thấy ${path.basename(f)} — CSDL đổi rồi, phải đo lại trước khi sinh.`);
    }
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const r of j.klRows ?? []) {
      moc.set(`${t.ma}|${r.wbs}`, {
        name: r.name,
        unit: r.unit,
        nhipNgay: Number(r.todayQty) || 0,
        luyKe: Number(r.cumulativeQty) || 0,
      });
    }
  }
  return moc;
}

function ghi(rows, tenSheet, tenFile) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), tenSheet);
  fs.mkdirSync(RA, { recursive: true });
  XLSX.writeFile(wb, path.join(RA, tenFile));
  return tenFile;
}

// ---------- sinh ----------

const moc = docMocCuoi();
/** Lũy kế chạy dần qua từng ngày — đây là chỗ bảo đảm "nối tiếp" */
const luyKe = new Map();
for (const [k, v] of moc) luyKe.set(k, v.luyKe);

const daSinh = [];
/** Gom khối lượng cả tuần theo thầu|wbs để dựng báo cáo tuần cho khớp */
const tuan = new Map();

for (const ngay of NGAY_LAM) {
  const heSo = HE_SO[ngay] ?? 1;
  for (const t of THAU) {
    const dong = [];
    let stt = 0;
    for (const [k, v] of moc) {
      if (!k.startsWith(`${t.ma}|`)) continue;
      const wbs = k.split("|")[1];
      // Nhịp ngày nhích nhẹ quanh mức tuần trước cho giống thật, rồi nhân hệ
      // số thời tiết. Làm tròn 1 số lẻ để người soát cộng tay kiểm được.
      const nhip = Math.round(v.nhipNgay * (0.85 + ((stt * 7) % 30) / 100) * heSo * 10) / 10;
      const moi = Math.round((luyKe.get(k) + nhip) * 10) / 10;
      luyKe.set(k, moi);
      tuan.set(k, Math.round(((tuan.get(k) ?? 0) + nhip) * 10) / 10);
      stt++;
      dong.push([
        stt,
        wbs,
        v.name,
        v.unit,
        nhip,
        moi,
        t.ten,
        nhip === 0 ? "Dừng do thời tiết" : "Đang thi công",
        "1 KT, 15 CN; 1 máy đào, 3 xe ben",
        nhip === 0 ? "Mưa to, dừng cả ngày" : "",
      ]);
    }

    const [tt, ah] = THOI_TIET[ngay];
    // ĐO 06/09: hàm dò nhãn của cửa kiểm chỉ đọc 12 DÒNG ĐẦU của sheet
    // (lib/lop0/chan.ts:166 theoNhan toiDaDong = 12). Bảng khối lượng 5 dòng
    // đẩy ô "Chi tiết" xuống dòng 14 → cửa kiểm không thấy, chặn L-NGUONLUC.
    // Nên mọi ô khai báo phải nằm TRƯỚC bảng.
    const rows = [
      ["BÁO CÁO THI CÔNG NGÀY"],
      ["Mã dự án:", "HV"],
      ["Nhà thầu:", t.ten],
      ["Ngày BC:", ngay],
      ["Chi tiết", "1 KT, 15 CN bê tông, 6 thợ sắt, 2 lái máy; 1 trạm trộn, 1 máy đào, 3 xe ben"],
      ["Thời tiết", tt],
      ["Ảnh hưởng TC", ah],
      ["Ghi chú", ""],
      [],
      COT_NGAY,
      ...dong,
    ];
    daSinh.push(ghi(rows, "BC Ngày", `BC-ngay_HV_${ngay}_${t.ten.replace(/\s/g, "")}.xlsx`));
  }
}

// ---------- báo cáo tuần của tổng thầu ----------

const dongTuan = [];
let sttT = 0;
for (const [k, v] of moc) {
  const [maThau, wbs] = k.split("|");
  const ten = THAU.find((x) => x.ma === maThau)?.ten ?? maThau;
  sttT++;
  dongTuan.push([
    sttT,
    wbs,
    v.name,
    ten,
    v.unit,
    null, // KL thiết kế: tổng thầu để trống, hệ lấy từ cây tiến độ
    tuan.get(k) ?? 0,
    luyKe.get(k),
    null,
    Math.round((tuan.get(k) ?? 0) * 1.1 * 10) / 10, // kế hoạch tuần sau
    (HE_SO["2026-09-03"] === 0 && "Mưa to ngày 03/09 dừng thi công cả ngày") || "",
    "",
  ]);
}

// ĐO 06/09 trong lib/lop0/chan.ts: biểu mẫu BC tuần bắt buộc có thêm ô
// "Từ ngày"/"Đến ngày" (mã lỗi L-TUNGAY, L-DENNGAY) và ĐỦ BỐN SHEET —
// KL Tuần · CV Tuần · Vấn đề · Thời tiết. Thiếu sheet nào là chặn L-SHEET.
const rowsTuan = [
  ["BÁO CÁO TIẾN ĐỘ TUẦN — TỔNG THẦU"],
  ["Mã dự án:", "HV"],
  ["Mã tuần:", TUAN_MOI],
  ["Từ ngày:", NGAY_LAM[0]],
  ["Đến ngày:", "2026-09-06"],
  ["Nhà thầu:", "Tổng thầu EPC"],
  ["Chi tiết", "Huy động bình quân 3 mũi thi công, 48 nhân công, 9 thiết bị"],
  [],
  COT_TUAN,
  ...dongTuan,
];

/** Công việc tuần — sheet bắt buộc, đủ 4 cột */
const rowsCv = [
  ["CÔNG VIỆC TUẦN"],
  [],
  ["STT", "Nội dung", "Phụ trách", "Mốc hoàn thành", "Trạng thái"],
  [1, "Hoàn thiện mặt bằng trụ T05", "Chỉ huy trưởng TS", "2026-09-10", "Đang làm"],
  [2, "Nghiệm thu cốt thép móng T06", "Giám sát A", "2026-09-08", "Chờ duyệt"],
  [3, "Trình hồ sơ nghiệm thu đường công vụ", "Ban KT", "2026-09-12", "Chưa bắt đầu"],
];

/** Vấn đề tồn đọng — sheet bắt buộc, đủ 6 cột */
const rowsVanDe = [
  ["VẤN ĐỀ TỒN ĐỌNG & ĐỀ XUẤT"],
  [],
  ["STT", "Vấn đề", "WBS", "Mức độ", "Đề xuất", "Phụ trách", "Mốc xử lý"],
  [
    1,
    "Mưa to ngày 03/09 dừng thi công cả ngày, chậm 1 ngày công",
    "7.2.3",
    "Trung bình",
    "Bù ca cuối tuần, huy động thêm 1 tổ 8 người",
    "Chỉ huy trưởng",
    "2026-09-12",
  ],
  [
    2,
    "Dân chưa nhận đền bù, chặn đường vào vị trí T07",
    "7.2.2",
    "Cao",
    "Đề nghị Ban GPMB làm việc với địa phương trong tuần",
    "Ban Đền bù",
    "2026-09-15",
  ],
];

/** Thời tiết tuần — sheet bắt buộc, đủ 4 cột; số giờ dừng phải khớp báo cáo ngày */
const rowsThoiTiet = [
  ["THỜI TIẾT TUẦN"],
  [],
  ["Ngày", "Thời tiết", "Ảnh hưởng", "Số giờ dừng"],
  ...NGAY_LAM.map((n) => {
    const [tt, ah] = THOI_TIET[n];
    const gio = HE_SO[n] === 0 ? 8 : HE_SO[n] < 1 ? 4 : 0;
    return [n, tt, ah, gio];
  }),
];

{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rowsTuan), "KL Tuần");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rowsCv), "CV Tuần");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rowsVanDe), "Vấn đề");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rowsThoiTiet), "Thời tiết");
  const ten = `BC-tuan_HV_${TUAN_MOI}_TongThau.xlsx`;
  fs.mkdirSync(RA, { recursive: true });
  XLSX.writeFile(wb, path.join(RA, ten));
  daSinh.push(ten);
}

// ---------- bảng tra ----------

const soNgay = NGAY_LAM.length;
const doc = `# BỘ FILE TEST MỘT TUẦN — AGENT TIẾN ĐỘ

Sinh bằng \`node scripts/dung-bo-test-mot-tuan.mjs\`.
**Tuần ${TUAN_MOI}** (31/08 → 06/09/2026), nối tiếp đúng chỗ tuần ${"2026-W35"} dừng.

## Trong bộ có gì

| Loại | Số file | Chi tiết |
|---|---|---|
| Báo cáo ngày của thầu phụ | **${soNgay * THAU.length}** | ${THAU.map((t) => t.ten).join(" · ")} × ${soNgay} ngày làm việc |
| Báo cáo tuần của tổng thầu | **1** | \`BC-tuan_HV_${TUAN_MOI}_TongThau.xlsx\` |
| **Tổng** | **${daSinh.length}** | |

Chủ nhật 06/09 **cố ý không có báo cáo** — đúng thực tế công trường nghỉ.

## Vì sao gọi là "nối tiếp"

Khối lượng lũy kế của mỗi đầu việc bắt đầu **đúng từ con số cuối cùng** trong
báo cáo ngày 30/08 đang có trong cơ sở dữ liệu. Nạp bộ này vào thì đường Thực
tế trên biểu đồ chạy tiếp một tuần, **không gãy khúc, không tụt số**.

## Thời tiết cài sẵn trong tuần

| Ngày | Thời tiết | Khối lượng |
|---|---|---|
| 31/08 · 01/09 | Nắng | bình thường |
| 02/09 | Mưa rào, dừng chiều | **còn 55%** |
| 03/09 | Mưa to, dừng cả ngày | **bằng 0** |
| 04/09 | Âm u | 90% |
| 05/09 | Nắng | bình thường |

Số liệu khớp với ô thời tiết — nếu bộ test tự mâu thuẫn thì người soát sẽ mất
tin vào cả bộ. Nhờ hai ngày mưa này mà thử được: engine có trừ ngày dừng do
thời tiết không, màn Năng suất có nêu ghi chú mưa không, cảnh báo "dừng liên
tiếp" có bật không.

## Cách nạp

1. Mở màn **Hồ sơ dự án**, dự án **Điện gió Hướng Việt**.
2. Thả ${soNgay * THAU.length} file báo cáo ngày vào khung AI bên phải (thả cả lô một lần được).
3. Soát từng dòng đề xuất rồi bấm **Đồng ý — ghi vào Drive**.
4. Thả nốt file báo cáo tuần của tổng thầu.
5. Sang màn **Lập tiến độ** bấm tính lại, rồi xem **Gantt** và **Phân tích năng suất**.

## Kiểm sau khi nạp

- Đường **Thực tế** trên Gantt dài thêm đúng một tuần, không gãy.
- Màn **Soát số liệu**: tổng khối lượng ngày cộng lại phải **khớp** báo cáo tuần.
- Màn **Phân tích năng suất**: có nhắc hai ngày mưa 02–03/09.
- Màn **Cảnh báo**: xem có sinh issue vì ngày dừng liên tiếp không.
`;
fs.writeFileSync(path.join(RA, "DOC-TRUOC-KHI-TEST.md"), doc, "utf8");

console.log(`Đã dựng ${daSinh.length} file + bảng tra vào: ${RA}`);
for (const t of daSinh) console.log("  -", t);

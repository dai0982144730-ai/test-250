// Kiểu dùng chung của Main.
//
// ⭐ 24/09: cắt các kiểu nghiệp vụ tiến độ (Task, Alert, ProductivityRow,
// CrossCheckRow, MilestoneRow, WeatherDay…) — chúng thuộc bộ tính tiến độ CHÉP
// trong Main, đã gỡ theo chốt Mr. Đại 24/09. Chỉ còn mức độ màu mà thẻ issue
// và huy hiệu trạng thái dùng.

export type Severity = "red" | "yellow" | "green";

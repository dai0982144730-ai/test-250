// Hướng dẫn bản 2 (tab) — hộp «Vai trò mới» / «Sửa vai trò: …» (mở từ mục Vai trò và quyền). Viết 20/10/2026.
// Căn cứ code: components/quan-tri/MaTranQuyen.tsx (SuaVaiTro) · app/api/quan-tri/vai-tro/route.ts, [id]/route.ts · packages/sci-identity/src/vai-tro.ts. Không dùng AI.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Hộp «Vai trò mới» và «Sửa vai trò» — tạo hoặc đổi tên một vai trò",
  ai: "Chỉ người quản lý người dùng ở phạm vi Toàn bộ mới thấy nút «Vai trò mới» và biểu tượng bút để mở hộp này; người khác không thấy. Muốn chép quyền từ vai trò khác, bạn không được chép quyền rộng hơn quyền mình đang có.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Hộp này là gì",
          doan: [
            "Một hộp nhỏ có hai chế độ. «Vai trò mới» (từ nút «Vai trò mới») để tạo một cột vai trò mới trong ma trận quyền. «Sửa vai trò: …» (từ biểu tượng bút ở đầu cột) chỉ đổi tên và mô tả của vai trò đã có.",
            "Hộp chỉ lo phần danh tính của vai trò. Quyền cụ thể của vai trò vẫn đặt bằng cách bấm ô trong ma trận.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          doan: ["Bộ vai trò cài sẵn không đủ cho mọi tình huống: có người chỉ cần xem, có người phụ trách riêng một mảng. Tạo vai trò riêng giúp cấp đúng quyền cần thiết, không cấp thừa."],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Việc", "Vai trò của hộp này"],
            ["Trước", "Quản trị nhận ra bộ vai trò sẵn có không khớp nhu cầu", "—"],
            ["Hộp này", "Đặt tên, mô tả, mã; chọn chép quyền từ vai trò khác", "Tạo cột vai trò mới"],
            ["Sau", "Bấm ô trong cột mới để bật quyền, «Lưu thay đổi»; gán vai trò cho người ở mục «Tổ chức & người dùng»", "Vai trò dùng được"],
          ],
        },
        {
          tieuDe: "④ Các ô trong hộp",
          bang: [
            ["Ô", "Có ở chế độ", "Để làm gì"],
            ["Tên vai trò", "Mới và Sửa", "Tên hiện ở đầu cột ma trận và trong ô chọn vai trò khi thêm người"],
            ["Mô tả", "Mới và Sửa", "Giải thích vai trò dùng cho ai, làm gì (không bắt buộc)"],
            ["Mã (không bắt buộc)", "Chỉ Mới", "Mã nội bộ; để trống thì máy tự tạo từ tên"],
            ["Chép quyền từ vai trò", "Chỉ Mới", "Bắt đầu với bộ quyền của một vai trò sẵn có thay vì trắng"],
            ["Nút «Hủy» và «Lưu»", "Cả hai", "«Lưu» mờ khi chưa có tên vai trò"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Đặt tên, mô tả; chọn có chép quyền không; bấm «Lưu»"],
            ["Máy", "Tạo mã từ tên, kiểm mã đúng khuôn và không trùng, kiểm không chép quyền vượt quyền bạn, ghi nhật ký"],
            ["🤖 AI", "— Hộp này không dùng AI."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Hộp này không dùng AI: người điền, máy kiểm và ghi."],
        },
      ],
    },
    {
      ten: "① Tạo vai trò mới",
      khoi: [
        {
          bam: [
            "Bấm «Vai trò mới» ở góc trên phải mục «Vai trò và quyền». Hộp tên «Vai trò mới» mở ra.",
            "Gõ «Tên vai trò» (ví dụ gợi ý trong ô: Nhân sự HCTH).",
            "Gõ «Mô tả» ngắn (ví dụ gợi ý: Vai trò này dùng cho ai, làm gì).",
            "Tuỳ chọn: «Mã (không bắt buộc)» — chữ thường không dấu, số, gạch ngang (ví dụ nhan-su-hcth). Để trống thì máy tự tạo từ tên.",
            "Tuỳ chọn: «Chép quyền từ vai trò» chọn một vai trò sẵn có. Giữ mặc định «— Bắt đầu không có quyền nào —» nếu muốn cột trắng.",
            "Bấm «Lưu».",
          ],
        },
        {
          ketQua: [
            "Máy báo «Đã tạo vai trò …. Bấm các ô trong cột mới để bật quyền.»",
            "Ma trận có thêm một cột cho vai trò mới, ghi «0 người». Vai trò tạo trên màn này luôn là vai trò thường nên xóa được khi chưa gán cho ai.",
          ],
        },
        {
          viDu: [
            "Phòng Hành chính Tổng hợp cần một người phụ trách sổ văn bản đến nhưng không cần quyền của «Văn thư». Bạn tạo vai trò «Phụ trách văn bản đến», chép quyền từ «Văn thư», rồi vào ma trận bỏ bớt các ô không cần.",
            "Nếu bỏ trống «Chép quyền từ vai trò», cột mới toàn «Không»; bạn bấm từng ô cần thiết rồi «Lưu thay đổi».",
          ],
        },
        { luuY: ["Nếu chọn chép quyền từ một vai trò có phạm vi rộng hơn quyền bạn đang có (và bạn không phải quản trị viên có cờ), máy từ chối. Chọn vai trò khác hoặc để cột trắng."] },
      ],
    },
    {
      ten: "② Sửa vai trò",
      khoi: [
        { doan: ["Ở đầu cột vai trò, bấm biểu tượng bút (rê chuột hiện «Đổi tên, mô tả»). Hộp mở ra với tên «Sửa vai trò: » kèm tên vai trò, chỉ có hai ô «Tên vai trò» và «Mô tả»."] },
        { bam: ["Sửa tên hoặc mô tả.", "Bấm «Lưu». Máy báo «Đã sửa vai trò …»."] },
        {
          viDu: [
            "Vai trò «Văn thư» đổi mô tả thành «Vào sổ văn bản đến và đi của công ty». Chỉ chữ giải thích thay đổi; quyền và mã vai trò giữ nguyên, người đang mang vai trò không bị ảnh hưởng.",
          ],
        },
        { luuY: ["Vai trò hệ thống (6 vai trò cài sẵn) vẫn đổi được tên và mô tả, nhưng không xóa được."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «Lưu» mờ", "Chưa gõ «Tên vai trò». Gõ tên rồi bấm lại."],
            ["Máy báo mã đã tồn tại hoặc không hợp lệ", "Mã phải là chữ thường không dấu, số, gạch ngang và chưa có vai trò nào dùng. Đổi mã hoặc để trống."],
            ["Báo không chép được quyền", "Vai trò nguồn có phạm vi rộng hơn quyền bạn đang có. Chọn nguồn khác."],
            ["Muốn đổi mã vai trò", "Không đổi được sau khi tạo. Tạo vai trò mới, chuyển người sang rồi xóa vai trò cũ."],
            ["Không thấy nút «Vai trò mới»", "Bạn không phải người quản lý toàn bộ người dùng."],
          ],
        },
      ],
    },
  ],
  canCu: "Chỉ người quản lý toàn bộ người dùng tạo và sửa vai trò · vai trò tạo trên màn luôn là vai trò thường (xóa được khi chưa gán) · không trao quyền rộng hơn quyền mình.",
};

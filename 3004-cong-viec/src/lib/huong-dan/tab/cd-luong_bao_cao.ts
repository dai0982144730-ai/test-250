// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Luồng báo cáo. Viết 20/10/2026 (nhóm B3). Nhãn chép từ components/cai-dat/nhom.tsx (NhomLuongBaoCao).
// Đối chiếu code 20/10: «Từ đơn vị» và «Gửi đến» được đọc ở app/api/gui/noi-nhan/route.ts (nơi nhận gợi ý), lib/kiem-tra/kiem-tra.ts:424 (nơi nhận mặc định),
// lib/phong/so-do.ts:90 (ô cha trên Sơ đồ tổ chức), lib/tro-ly/lam-bao-cao.ts:492 (gộp báo cáo đơn vị dưới). «Ai kiểm soát» và «Tổng hợp thành mẫu» (kiem_soat, tong_hop_thanh)
// có ô nhập và được kiểm hợp lệ khi lưu (lib/cau-hinh/kiem-tra.ts:302) nhưng KHÔNG có chỗ nào đọc để làm việc → ghi thẳng trong hướng dẫn (⏸ báo cáo).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Luồng báo cáo",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm luồng báo cáo. Ai đăng nhập cũng xem được.",
  laGi: [
    "Luồng báo cáo là sơ đồ «đơn vị nào nộp báo cáo lên đơn vị nào». Mỗi dòng của bảng là một mũi tên: từ một đơn vị (ví dụ Ban điều hành dự án Hướng Việt) đến một đơn vị cấp trên (ví dụ BQLDA Quảng Trị). Cả công ty hiện có 26 dòng như vậy.",
    "Mỗi dòng còn có hai ô «Ai kiểm soát» và «Tổng hợp thành mẫu». Hai ô này có thể nhập và lưu, nhưng đến ngày 20/10/2026 máy CHƯA đọc chúng để làm việc (xem tab «③ Hai ô chưa dùng»).",
  ],
  vaoSao: [
    "Cấp trên chỉ tổng hợp được khi biết cấp dưới của mình là ai. Luồng này khai một lần, cả nơi nhận báo cáo, ô cha trên Sơ đồ tổ chức và phần AI gộp báo cáo đều dựa vào đó.",
    "Khi công ty đổi cơ cấu (thêm nhà máy, đổi Ban quản lý dự án phụ trách), chỉ cần sửa một dòng ở đây, không phải nhờ ai sửa phần mềm.",
  ],
  vongLam: [
    "Bước trước: các đơn vị được tạo trong cây đơn vị (Cài đặt › Tổ chức & người dùng) và có cấp.",
    "Mục này: khai mũi tên «Từ đơn vị» → «Gửi đến». Lưu thì máy kiểm: đơn vị phải có thật, không trùng luồng, không thành vòng tròn.",
    "Bước sau: ở «Báo cáo», nơi nhận gợi ý và mặc định lấy từ đây; Sơ đồ tổ chức vẽ ô cha theo luồng; trợ lý «Làm báo cáo» ở đơn vị cấp trên gộp báo cáo của mọi đơn vị gửi lên nó.",
  ],
  cacKhoi: [
    ["Bảng «Đơn vị nào gửi báo cáo cho ai»: cột «Từ đơn vị» · «Gửi đến»", "Mũi tên nộp báo cáo; mỗi cột chọn từ danh sách đơn vị đang hoạt động (kèm cấp)", "① Khai một luồng"],
    ["Cột «Ai kiểm soát» (ô «+ vai trò / đơn vị»)", "Ghi vai trò hoặc đơn vị kiểm soát. Máy chưa đọc", "③ Hai ô chưa dùng"],
    ["Cột «Tổng hợp thành mẫu» (mặc định «— Không —»)", "Mẫu báo cáo tổng hợp ở cấp trên. Máy chưa đọc", "③ Hai ô chưa dùng"],
    ["Biểu tượng thùng rác cuối dòng (rê chuột ghi «Bỏ luồng»)", "Xóa dòng", "② Thêm, bỏ luồng"],
    ["Nút «Thêm luồng»", "Thêm một dòng mới", "② Thêm, bỏ luồng"],
  ],
  nguoi: "Quản trị khai và sửa luồng, bấm «Lưu». Người lập báo cáo chọn nơi nhận ở «Báo cáo» (nơi nhận theo luồng được gợi ý sẵn).",
  may: "Kiểm luồng hợp lệ trước khi lưu; tra luồng để gợi ý nơi nhận, đặt nơi nhận mặc định khi báo cáo không ghi dòng «Gửi:», vẽ ô cha trên Sơ đồ tổ chức, tìm các đơn vị cấp dưới để gộp báo cáo.",
  aiLam: "— Mục này không dùng AI. (Trợ lý «Làm báo cáo» dùng luồng này để biết gộp báo cáo của những đơn vị nào, nhưng việc tra luồng do máy làm.)",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Khai một luồng",
      khoi: [
        { doan: ["Mỗi dòng của bảng là một mũi tên. Một đơn vị có thể có nhiều dòng nếu nó nộp lên nhiều nơi, nhưng mỗi cặp «Từ đơn vị» → «Gửi đến» chỉ được xuất hiện một lần."] },
        {
          tieuDe: "Mặc định (26 dòng, chia theo tầng)",
          bang: [
            ["Từ", "Gửi đến", "Số dòng"],
            ["SCI PMC · SCI E&C · BQLDA Quảng Trị · BQLDA Lào", "Phòng Đầu tư và Pháp chế", "4"],
            ["Ban điều hành tổng thầu các dự án (Hướng Việt, Tân Thành, Ba Tầng 1)", "BQLDA Quảng Trị", "3"],
            ["Ban điều hành tổng thầu các dự án (Nam Khian 1, 2, 3 · Nam Neun hạ lưu · Nam Lan 1, 2)", "BQLDA Lào", "6"],
            ["Bảy nhà máy (Nậm Xe, Ca Nan 1, Ca Nan 2, Nậm Lụm 1, Nậm Lụm 2, Hướng Linh 7, Hướng Linh 8)", "Phòng Kinh tế và Vận hành", "7"],
            ["Năm phòng (Đầu tư và Pháp chế, Kinh tế và Vận hành, Hành chính Tổng hợp, Tài chính Kế toán, Cơ điện)", "Ban Tổng giám đốc", "5"],
            ["Ban Tổng giám đốc", "Ban Tổng giám đốc (nội bộ)", "1"],
          ],
        },
        {
          bam: [
            "Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Luồng báo cáo».",
            "Ở dòng cần đổi, chọn lại «Từ đơn vị» hoặc «Gửi đến» trong danh sách xổ ra (mỗi lần chọn là áp dụng và đóng).",
            "Bấm «Lưu». Máy kiểm trước; nếu lỗi sẽ hiện khung đỏ liệt kê từng dòng lỗi và không ghi gì.",
          ],
        },
        {
          viDu: [
            "Ban điều hành tổng thầu dự án Hướng Việt nộp báo cáo lên BQLDA Quảng Trị; BQLDA Quảng Trị nộp lên Phòng Đầu tư và Pháp chế; phòng này nộp lên Ban Tổng giám đốc. Đó là chuỗi ba bước mà báo cáo đi qua.",
            "Tình huống: công ty chuyển một nhà máy sang cho Phòng Cơ điện phụ trách. Quản trị mở dòng của nhà máy đó, đổi «Gửi đến» từ Phòng Kinh tế và Vận hành sang Phòng Cơ điện, bấm «Lưu». Từ lần mở «Báo cáo» kế tiếp, nhà máy thấy gợi ý nơi nhận mới; Sơ đồ tổ chức vẽ ô nhà máy dưới Phòng Cơ điện.",
          ],
        },
        {
          ketQua: [
            "Ở «Báo cáo»: đơn vị của người đăng nhập thấy nơi nhận theo luồng được gợi ý sẵn. Báo cáo không ghi dòng «Gửi:» và mẫu không có nơi nhận mặc định thì máy dùng nơi nhận theo luồng của đơn vị lập.",
            "Ở Sơ đồ tổ chức: ô cha của một đơn vị là nơi nó gửi đến (dòng đầu tiên gửi đi nơi khác); đơn vị không có dòng nào thì xếp theo cây đơn vị.",
            "Ở trợ lý «Làm báo cáo» của đơn vị cấp trên: máy lấy mọi đơn vị có dòng gửi đến đơn vị đó để gộp báo cáo đã nộp trong kỳ; đơn vị chưa nộp được ghi tên, không điền thay.",
          ],
        },
        {
          luuY: [
            "Luồng không được thành vòng tròn (A gửi B, B gửi C, C gửi A). Riêng Ban Tổng giám đốc gửi chính nó (nội bộ) là hợp lệ.",
            "Đơn vị trong danh sách chỉ gồm đơn vị đang hoạt động. Đơn vị đã tắt vẫn còn trong dòng cũ nhưng hiện kèm chữ «(không có)» và máy từ chối lưu cho tới khi bạn chọn lại.",
          ],
        },
      ],
    },
    {
      ten: "② Thêm, bỏ luồng",
      khoi: [
        { doan: ["Thêm đơn vị mới vào công ty thì phải thêm luồng cho nó, nếu không đơn vị đó không có nơi nhận gợi ý và Sơ đồ tổ chức xếp nó theo cây đơn vị."] },
        {
          bam: [
            "Bấm «Thêm luồng»: một dòng mới hiện ở cuối, mặc định chọn đơn vị đầu danh sách ở cả hai cột.",
            "Chọn «Từ đơn vị» và «Gửi đến» đúng ý.",
            "Muốn bỏ một luồng: bấm biểu tượng thùng rác cuối dòng.",
            "Bấm «Lưu».",
          ],
        },
        {
          viDu: [
            "Công ty lập thêm Nhà máy điện gió Hướng Linh 9. Sau khi thêm đơn vị mới trong cây đơn vị, quản trị bấm «Thêm luồng», chọn «Từ đơn vị» = Nhà máy điện gió Hướng Linh 9, «Gửi đến» = Phòng Kinh tế và Vận hành, «Lưu».",
          ],
        },
        {
          luuY: [
            "Thêm dòng trùng cặp đã có thì «Lưu» báo «Luồng N: trùng luồng … → …».",
            "Bỏ luồng của một đơn vị rồi lưu thì đơn vị đó không còn nơi nhận theo luồng. Báo cáo đã nộp trước đó không bị ảnh hưởng.",
          ],
        },
      ],
    },
    {
      ten: "③ Hai ô chưa dùng",
      khoi: [
        { doan: ["Hai cột «Ai kiểm soát» và «Tổng hợp thành mẫu» có trong bảng, nhập được và lưu được, nhưng đến ngày 20/10/2026 không có chỗ nào trong ứng dụng đọc chúng để thay đổi cách làm việc. Ghi ở đây để bạn khỏi chờ một tác dụng chưa có."] },
        {
          bang: [
            ["Cột", "Mặc định", "Tình trạng"],
            ["Ai kiểm soát", "Trưởng đơn vị (dòng của Ban Tổng giám đốc: lãnh đạo)", "Chưa dùng. Quyền «Kiểm soát báo cáo» có riêng ở mục «Vai trò và quyền» và không đọc cột này"],
            ["Tổng hợp thành mẫu", "Form 1 · Form 2 · Form 7 · Form 0 tùy tầng", "Chưa dùng. Trợ lý «Làm báo cáo» không đọc cột này khi chọn mẫu tổng hợp"],
          ],
        },
        {
          viDu: [
            "Quản trị đổi «Tổng hợp thành mẫu» của luồng BQLDA Quảng Trị → Phòng Đầu tư và Pháp chế từ Form 1 sang Form 7 và lưu. Không có gì đổi ở trợ lý «Làm báo cáo»: ô này chưa tác dụng.",
          ],
        },
        { luuY: ["Máy vẫn kiểm hai ô khi lưu: vai trò hoặc đơn vị ở «Ai kiểm soát» phải có thật; mẫu ở «Tổng hợp thành mẫu» phải có thật. Nhập sai thì không lưu được."] },
      ],
    },
  ],
  viDuLuu: ["Đổi «Gửi đến» của một nhà máy sang Phòng Cơ điện và bấm «Lưu» → nhật ký ghi thay đổi của nhóm «Luồng báo cáo» kèm tên người sửa và giờ."],
  vuong: [
    ["Lưu báo «Luồng báo cáo bị vòng tròn»", "Có chuỗi A → B → … → A. Tìm dòng nào nối ngược lên cấp trên và đổi."],
    ["Lưu báo «trùng luồng»", "Hai dòng cùng «Từ đơn vị» và «Gửi đến». Xóa một dòng."],
    ["Một ô chọn hiện «(không có)»", "Đơn vị đó đã bị tắt hoặc xóa khỏi cây đơn vị. Chọn đơn vị khác."],
    ["Đơn vị mới không có nơi nhận gợi ý ở «Báo cáo»", "Chưa có dòng luồng cho nó. Bấm «Thêm luồng»."],
    ["Đổi «Ai kiểm soát» hay «Tổng hợp thành mẫu» mà không thấy gì đổi", "Hai ô này chưa được máy dùng (tab «③ Hai ô chưa dùng»)."],
    ["Không thấy nút «Lưu», «Thêm luồng», thùng rác", "Bạn chỉ có quyền xem; các nút không có quyền bấm bị ẩn. Nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «luong_bao_cao» trong cài đặt; cách tra luồng ở phần nơi nhận báo cáo, Sơ đồ tổ chức và trợ lý «Làm báo cáo»; kiểm hợp lệ luồng khi lưu cài đặt.",
});

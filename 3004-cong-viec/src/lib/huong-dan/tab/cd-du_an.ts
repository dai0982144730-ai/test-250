// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Sơ đồ tổ chức dự án. Viết 20/10/2026 (nhóm B3).
// Căn cứ code: components/cai-dat/nhom.tsx (NhomDuAn: cột, cây 3 cấp, ô sửa tại chỗ, nền cam thẫm .o-tu-main = ô lấy từ Main chỉ đọc) · components/cai-dat/keo-main.tsx (khung «Danh mục dự án lấy từ Main»,
// nút «Kéo lại từ Main», «Sửa ở Main») · app/api/cai-dat/keo-du-an-main/route.ts (quyền: người sửa được nhóm du_an) · lib/cau-hinh/kiem-tra.ts:269 (kiểm hợp lệ khi lưu) · lib/cau-hinh/mac-dinh.ts (14 dự án mặc định).
// Danh mục này được đọc ở menu Dự án, Cây việc & đường găng, Gắn WBS, Tóm tắt tiến độ (app/api/cay-viec/*, app/api/phong/*, lib/ai/chat-agent.ts:132).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Sơ đồ tổ chức dự án",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm này. Nút «Kéo lại từ Main» chỉ hiện với người sửa được nhóm này. Ai đăng nhập cũng xem được.",
  laGi: [
    "Đây là danh mục các dự án của công ty, xếp thành cây: «Dự án SCI đầu tư» (cấp 1) gồm các Ban QLDA (cấp 2) và dưới mỗi Ban là các dự án (cấp 3); «Loại khác» (cấp 1) gồm các dự án mà SCI không đầu tư (cấp 3). Mặc định có 14 dự án: 9 dự án SCI đầu tư (3 dự án thuộc BQLDA Quảng Trị, 6 dự án thuộc BQLDA Lào) và 5 dự án loại khác.",
    "Phần lớn thông tin dự án (tên, mã ngắn, nhóm, tên gọi khác, và cả Ban QLDA, đơn vị làm, Ban điều hành khi Main đã giữ) lấy từ phần mềm Main, nơi giữ danh mục gốc dùng chung cho mọi agent. Ở đây bạn chủ yếu XEM, và sửa vài thứ còn lại.",
  ],
  vaoSao: [
    "Việc chỉ thuộc về một dự án khi máy tra được tên dự án trong danh mục: máy không đoán. Nhờ vậy menu Dự án, Cây việc & đường găng và Báo cáo tuần chỉ gom đúng việc của đúng dự án.",
    "Danh mục dùng chung nên gốc đặt ở Main; agent này kéo về mỗi 30 phút. Sửa tên dự án một nơi (Main) thì mọi agent cùng thấy, không lệch.",
  ],
  vongLam: [
    "Bước trước: dự án được khai ở Main › Cài đặt › Dự án (tên, mã ngắn, nhóm, tên gọi khác). Agent Tiến độ có cây WBS cho dự án nào thì dự án đó có «Mã bên Tiến độ».",
    "Mục này: máy kéo danh mục từ Main (20 giây sau khi bật, rồi 30 phút một lần, hoặc bấm «Kéo lại từ Main»); bạn bổ sung loại dự án, Ban QLDA, Ban điều hành, đơn vị làm khi Main chưa giữ.",
    "Bước sau: việc có ô «Dự án» khớp tên hoặc tên gọi khác thì vào menu Dự án; việc giao cho Ban điều hành của dự án tự thuộc dự án; dự án có «Mã bên Tiến độ» được 🤖 AI gắn việc vào cây WBS (mục «Gắn việc vào WBS»).",
  ],
  cacKhoi: [
    ["Khung «Danh mục dự án lấy từ Main» ở đầu mục, với liên kết «Sửa ở Main» và nút «Kéo lại từ Main»", "Cho biết lượt kéo gần nhất; kéo ngay; mở Main để sửa", "① Kéo từ Main"],
    ["Tiêu đề cột: «Tên dự án · mã» · «Loại» · «Nằm dưới» · «Ban điều hành / đơn vị làm» · «Tên gọi khác trong báo cáo» · «Mã bên Tiến độ»", "Bảng dự án, chia 3 cấp", "② Đọc cây dự án"],
    ["Ô nền cam thẫm, chữ trần", "Thông tin lấy từ Main hoặc máy tự điền, chỉ đọc", "② Đọc cây dự án"],
    ["Ô «Loại», ô chọn «Nằm dưới», ô chọn «— Không có BĐH —», ô «+ đơn vị làm»", "Phần sửa được ngay tại đây (khi Main chưa giữ)", "③ Sửa tại chỗ"],
    ["Ô chọn «+ Thêm Ban QLDA (chọn từ Đơn vị)…»", "Thêm một Ban QLDA mới vào cây", "③ Sửa tại chỗ"],
  ],
  nguoi: "Quản trị kiểm tra danh mục sau mỗi lần kéo, chọn Ban QLDA cho dự án mới, điền Ban điều hành và đơn vị làm khi cần, bấm «Lưu». Sửa tên, mã, nhóm, tên gọi khác thì làm ở Main.",
  may: "Kéo danh mục từ Main định kỳ, ghép vào danh mục này; hỏi agent Tiến độ dự án nào có cây WBS để tự điền «Mã bên Tiến độ»; kiểm danh mục hợp lệ (không trùng mã, không trùng tên, không một dự án hai tên); tra tên dự án cho việc.",
  aiLam: "— Mục này không dùng AI. (Việc gắn việc vào cây WBS dùng AI nhưng ở mục «Gắn việc vào WBS».)",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Kéo từ Main",
      khoi: [
        { doan: ["Khung đầu mục (viền thẫm theo tông màu của Main) kể lại lượt kéo gần nhất và cho bạn kéo ngay. Trong khung có thể có các dòng: «Lượt gần nhất <giờ> · Main có N dự án · M dự án có cây WBS bên agent Tiến độ · có thay đổi, đã lưu» (hoặc «không có gì thay đổi»), «Dự án Main mới khai: …», «Chưa chọn Ban QLDA: …», «Chỉ có ở đây, Main chưa khai (giữ nguyên, không xoá): …». Nếu kéo lỗi, dòng đỏ ghi «chưa kéo được — lý do»."] },
        {
          bam: [
            "Muốn sửa tên, mã, nhóm, tên gọi khác, thêm hay bỏ dự án: bấm liên kết «Sửa ở Main» (mở Main ở tab dự án), sửa ở đó.",
            "Quay lại đây bấm «Kéo lại từ Main» (nút xoay khi đang kéo, chữ «Đang kéo…»). Nút mờ nếu đang có thay đổi chưa lưu: «Lưu» hoặc «Bỏ thay đổi» trước.",
            "Đọc dòng kết quả. Có thay đổi thì máy đã lưu luôn danh mục mới.",
          ],
        },
        {
          viDu: [
            "Main vừa khai thêm một dự án mới. Quản trị bấm «Kéo lại từ Main». Khung báo «Dự án Main mới khai: <mã> <tên dự án>» và «Chưa chọn Ban QLDA: <mã> <tên dự án>». Dự án nằm dưới nhóm «Chưa chọn Ban QLDA» của bảng, chờ quản trị chọn.",
            "Nếu khung báo «Chưa hỏi được agent Tiến độ (tắt hoặc chậm): …» thì «Mã bên Tiến độ» giữ nguyên như đang có, lượt sau máy hỏi lại.",
          ],
        },
        {
          luuY: [
            "Kéo từ Main không xóa dự án chỉ có ở đây: các dự án này được liệt kê ở dòng «Chỉ có ở đây, Main chưa khai (giữ nguyên, không xoá)».",
            "Người không có quyền sửa nhóm này không thấy nút «Kéo lại từ Main», chỉ thấy khung thông tin.",
          ],
        },
      ],
    },
    {
      ten: "② Đọc cây dự án",
      khoi: [
        { doan: ["Bảng chia ba tầng. Dòng nền nhạt «Dự án SCI đầu tư · cấp 1», rồi mỗi Ban QLDA «tên Ban · cấp 2 · N dự án», rồi các dự án. Dòng nền nhạt thứ hai «Loại khác · cấp 1 · dự án ngay cấp 3» chứa các dự án SCI không đầu tư. Nếu có dự án Main mới chưa chọn Ban QLDA, nhóm «Chưa chọn Ban QLDA» hiện giữa hai phần."] },
        {
          bang: [
            ["Cột", "Nghĩa", "Nguồn"],
            ["Tên dự án · mã", "Tên và mã ngắn (HV là Hướng Việt…)", "Main (nền cam thẫm, chỉ đọc)"],
            ["Loại", "Điện gió, Thủy điện, Mỏ đá…", "Gõ tại đây"],
            ["Nằm dưới", "Dự án SCI đầu tư thuộc Ban QLDA nào; dự án loại khác ghi «Loại khác»", "Chọn tại đây, hoặc Main khi Main đã giữ (nền cam thẫm)"],
            ["Ban điều hành / đơn vị làm", "BĐH tổng thầu của dự án; đơn vị làm (SCI PMC thiết kế, SCI E&C thi công…)", "Chọn tại đây, hoặc Main khi Main đã giữ"],
            ["Tên gọi khác trong báo cáo", "Các cách người ta ghi tên dự án trong báo cáo", "Main (chỉ đọc)"],
            ["Mã bên Tiến độ", "Có mã khi agent Tiến độ đang có cây WBS của dự án; ghi «không có cây WBS» nếu chưa", "Máy tự điền (kiểm 30 phút một lần hoặc khi bấm «Kéo lại từ Main»)"],
          ],
        },
        {
          viDu: [
            "Theo danh mục mặc định ghi sẵn, dự án Hướng Việt (mã HV, điện gió) nằm dưới BQLDA Quảng Trị, Ban điều hành là BĐH Hướng Việt, tên gọi khác «ĐG Hướng Việt» và «Điện gió Hướng Việt», có «Mã bên Tiến độ» là HV. Một việc có ô Dự án ghi «ĐG Hướng Việt» hoặc được giao cho BĐH Hướng Việt tự thuộc dự án Hướng Việt.",
            "Dự án Mỏ đá Dốc Đá Trắng (mã MDDT, loại Mỏ đá) nằm ở nhóm «Loại khác», không có Ban điều hành, không có cây WBS: việc của nó vẫn gom vào menu Dự án nhưng không được gắn WBS.",
          ],
        },
        {
          luuY: [
            "Việc khớp dự án theo tên hoặc tên gọi khác ĐÚNG dấu; ghi không dấu chỉ nhận khi ra đúng MỘT dự án. Hai dự án quá giống tên (lệch không quá 2 chữ cái, cùng các con số, như «Nam Khian 1» và «Nậm Khiên 1») bị chặn lưu: phải gộp làm một và đưa tên kia vào tên gọi khác.",
            "Dự án chưa lập (đang đấu thầu, tìm hiểu) thì chưa đưa vào.",
          ],
        },
      ],
    },
    {
      ten: "③ Sửa tại chỗ",
      khoi: [
        { doan: ["Phần nào Main đã giữ thì hiện nền cam thẫm và chỉ đọc. Phần còn lại sửa được ngay ở đây. Dòng mô tả dưới tiêu đề bảng cho biết lúc này phần nào đang chỉ đọc."] },
        {
          bam: [
            "Đổi loại: gõ vào ô «Loại» của dòng dự án.",
            "Chuyển dự án sang Ban QLDA khác (khi Main chưa giữ): ở ô «Nằm dưới» chọn «thuộc <Ban QLDA>». Chọn một lần là chuyển.",
            "Đặt Ban điều hành: ở ô chọn thứ hai chọn Ban điều hành (hoặc «— Không có BĐH —»). Ngay dưới là ô «+ đơn vị làm» để thêm SCI PMC, SCI E&C… (phải chọn Ban QLDA trước).",
            "Thêm Ban QLDA mới vào cây: chọn ở ô «+ Thêm Ban QLDA (chọn từ Đơn vị)…» (danh sách là các đơn vị đã có ở cây đơn vị); sau đó chuyển dự án vào Ban đó bằng ô «Nằm dưới».",
            "Bấm «Lưu».",
          ],
        },
        {
          viDu: [
            "Dự án mới từ Main hiện trong nhóm «Chưa chọn Ban QLDA». Quản trị chọn «thuộc BQLDA Lào» ở ô «Nằm dưới», chọn Ban điều hành tương ứng, rồi «Lưu». Dự án chuyển sang dưới BQLDA Lào.",
            "Dự án Nam Khian 1 có đơn vị làm là SCI PMC và SCI E&C ngoài BQLDA Lào: nên trên Sơ đồ tổ chức, ô dự án hiện cả dưới PMC và E&C; việc của mọi đơn vị vẫn gom về một dự án ở menu Dự án.",
          ],
        },
        {
          luuY: [
            "Ban QLDA mới thêm mà chưa có dự án nào thì không được lưu: bảng nhắc «chuyển dự án vào bằng ô “Nằm dưới”; chưa có dự án thì ban này không được lưu».",
            "Một dự án SCI đầu tư có đơn vị làm mà chưa chọn Ban QLDA thì máy báo «chọn Ban QLDA trước rồi mới thêm đơn vị làm».",
            "Muốn đổi dự án giữa nhóm «SCI đầu tư» và «Loại khác» thì sửa ở Main.",
            "Đổi ở đây có hiệu lực ngay sau «Lưu» và được ghi vào nhật ký phiên bản; quay lại bản cũ được.",
          ],
        },
      ],
    },
  ],
  viDuLuu: ["Chuyển dự án mới sang «thuộc BQLDA Lào» rồi bấm «Lưu» → nhật ký ghi «Sơ đồ tổ chức dự án» đổi, kèm người sửa và giờ; quay lại bản trước được ở cột nhật ký."],
  vuong: [
    ["Khung báo «chưa kéo được — …»", "Main chưa chạy hoặc không trả lời. Mở Main (liên kết «Sửa ở Main»), kiểm Main đang bật, rồi bấm lại «Kéo lại từ Main»."],
    ["Nút «Kéo lại từ Main» mờ", "Đang có thay đổi chưa lưu. Bấm «Lưu» hoặc «Bỏ thay đổi» trước."],
    ["Lưu báo trùng mã, trùng tên, hoặc “gần trùng tên”", "Hai dự án trùng hoặc quá giống. Gộp làm một ở Main và chuyển tên kia thành tên gọi khác."],
    ["Dự án có «không có cây WBS»", "Agent Tiến độ chưa có cây WBS cho dự án đó, hoặc chưa hỏi được. Việc của dự án vẫn gom ở menu Dự án nhưng chưa gắn WBS."],
    ["Sửa tên dự án ở đây không được", "Tên, mã, nhóm, tên gọi khác lấy từ Main; sửa ở Main."],
    ["Không thấy nút «Lưu», «Kéo lại từ Main»", "Bạn chỉ có quyền xem; các nút không có quyền bấm bị ẩn. Nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «du_an» trong cài đặt; cách kéo danh mục dự án từ Main và hỏi agent Tiến độ về cây WBS; cách tra dự án của một việc trong phần Dự án và Cây việc.",
});

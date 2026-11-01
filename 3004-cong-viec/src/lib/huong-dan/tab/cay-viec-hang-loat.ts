// Hướng dẫn bản 2 (tab) — khung phải «🤖 Soạn việc trên đường găng chưa ai làm» (soạn và giao hàng loạt). Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/SoanGiaoHangLoat.tsx (NutSoanGiao, KhungHangLoat: soạn lần lượt từng đầu việc, mỗi dòng nút «Giao») · lib/cay-viec/thuan.ts (nutGangTrong, chuaAiGiao)
// · app/api/cay-viec/soan-giao/route.ts:119 (AI chọn người nhận mỗi lượt) · lib/cay-viec/hoi-trung.ts:55 (AI phán trùng). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Soạn việc hàng loạt trên đường găng",
  ai: "Cần quyền «Giao việc». Người không có quyền sẽ không thấy nút «🤖 Soạn việc trên đường găng chưa ai làm», nên không mở được khung này.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì?",
          doan: [
            "Một lối tắt khi có NHIỀU đầu việc găng chưa ai nhận: thay vì bấm từng đầu việc, nút «🤖 Soạn việc trên đường găng chưa ai làm (N)» (N là số đầu việc) mở khung này ở cột phải. AI lần lượt soạn người nhận cho từng đầu việc, mỗi đầu việc một dòng có nút «Giao».",
            "Tập đầu việc soạn đúng bằng tập mà bộ lọc «⭕ Việc găng chưa giao» hiện ra.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Đầu dự án hay cuối giai đoạn thường có cả loạt đầu việc găng cùng đến hạn giao; soạn từng cái mất thời gian.",
            "Vẫn an toàn: AI không tự giao. Mỗi dòng người đọc rồi mới bấm «Giao».",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của khung này"],
            ["Trước", "Màn Cây việc cho biết có N đầu việc găng chưa giao (thẻ thứ tư)", "Chỉ ra số lượng"],
            ["Khung này", "AI soạn từng đầu việc → bạn duyệt từng dòng", "Màn bạn đang xem"],
            ["Sau", "Việc hiện ở «Việc của tôi» của người nhận và ở Sơ đồ tổ chức; thẻ thứ tư giảm", "Cây việc"],
          ],
        },
        {
          tieuDe: "④ Khung có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Tiêu đề «🤖 Soạn việc trên đường găng chưa ai làm — N nút»", "Số đầu việc sẽ soạn"],
            ["Dòng tiến độ", "«Đang soạn… đang soạn i/N — mã tên» rồi «Soạn được X/Y nút.»"],
            ["Mỗi đầu việc một khối", "Tên đầu việc (bấm để mở riêng), «🤖 Giao cho: …», câu căn cứ hoặc lý do không soạn được, nút «Giao» hoặc «chọn tay»"],
            ["Dòng nhỏ cuối khung", "«Chốt an toàn: AI không tự ghi — chỉ cú bấm Giao của người mới tạo việc trong sổ cái»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm nút mở khung · đọc từng dòng · bấm «Giao» hoặc bấm tên đầu việc để chọn tay", "Người quyết giao dòng nào"],
            ["MÁY", "Lập danh sách đầu việc găng chưa giao · gọi AI lần lượt từng đầu việc, không gọi song song · hỏi các agent khác xem có trùng không · tạo việc thật khi người bấm «Giao» · tính hạn là ngày xong theo tiến độ của đầu việc", "Cùng danh sách thì cùng thứ tự"],
            ["🤖 AI", "🤖 Với mỗi đầu việc, chọn người hoặc đơn vị nhận theo lịch sử loại việc này và chức năng đơn vị, viết câu căn cứ", "🤖 Chỉ được chọn trong danh sách máy đưa; có thể sai; người kiểm trước khi giao"],
            ["🤖 AI", "🤖 Xét xem việc có trùng việc agent khác đã soạn không", "🤖 Chỉ báo"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người bấm «🤖 Soạn việc trên đường găng chưa ai làm». Cột phải mở khung, máy bắt đầu soạn đầu việc thứ nhất.",
            "🤖 AI soạn từng đầu việc một (mỗi lượt vài giây đến vài chục giây); dòng nào xong hiện ngay, không phải chờ hết cả loạt.",
            "Người đọc dòng đã hiện, bấm «Giao» nếu đồng ý. Dòng nào AI không chọn được người thì ghi lý do và có nút «chọn tay».",
            "Bấm «Giao»: máy tạo việc thật trong sổ cái, dòng đổi thành «Đã giao CV-…».",
          ],
          ai: [
            "🤖 AI không tự ghi gì. Chỉ cú bấm «Giao» của người mới tạo việc, có ghi lịch sử ai bấm lúc nào.",
            "Mất kết nối AI: từng dòng ghi lý do; dùng «chọn tay» ở đầu việc rồi giao như thường.",
          ],
        },
      ],
    },
    {
      ten: "① Mở và chờ soạn",
      khoi: [
        {
          bam: [
            "Trong khối «🤖 Gán mã WBS bằng AI» bấm «🤖 Soạn việc trên đường găng chưa ai làm (N)». Rê chuột sẽ thấy «Soạn một lượt cho N nút găng đang trống người — kết quả ở khung bên phải».",
            "Nhìn dòng tiến độ «đang soạn i/N — mã tên».",
            "Cuộn khung xem các dòng đã hiện.",
          ],
          ketQua: [
            "Khi xong, dòng tiến độ đổi thành «Soạn được X/Y nút.»",
            "Không có đầu việc găng nào đang trống thì nút mờ và khung ghi «Không có nút găng nào đang trống người — không có gì để soạn».",
          ],
          luuY: ["Soạn lần lượt nên N lớn thì chờ lâu hơn. Bấm đầu việc khác ở cây giữa chừng thì khung đổi sang đầu việc đó và việc soạn dừng lại; muốn soạn tiếp bấm lại nút soạn (soạn lại từ đầu)."],
          viDu: ["Tình huống minh hoạ: thẻ «Việc găng CHƯA GIAO» ghi số đỏ. Bạn bấm nút soạn, rời máy pha cà phê, quay lại thì các dòng đã hiện đủ."],
        },
      ],
    },
    {
      ten: "② Giao từng dòng",
      khoi: [
        {
          tieuDe: "Một dòng gồm gì",
          bang: [
            ["Phần", "Nghĩa"],
            ["Mã và tên đầu việc (chữ đỏ đậm)", "Bấm để mở đầu việc ở khung riêng, nơi có «Sửa» và chọn người nhận khác (xem hướng dẫn «Một đầu việc WBS và giao việc»)"],
            ["«🤖 Giao cho: <tên> (đơn vị hoặc mã người)»", "Người hoặc đơn vị AI chọn"],
            ["Dòng chữ nhỏ", "Câu căn cứ của AI; hoặc lý do không soạn được; hoặc câu báo trùng việc agent khác đã soạn"],
            ["Nút «Giao» · «chọn tay» · «Đã giao CV-…»", "Giao ngay · không có đề xuất, tự chọn · đã tạo việc (bấm mã để mở)"],
          ],
          bam: [
            "Đọc người nhận và câu căn cứ.",
            "Đồng ý thì bấm «Giao». Muốn đổi người hoặc sửa nội dung thì bấm tên đầu việc rồi dùng «Sửa» ở khung riêng.",
            "Nếu dòng báo trùng, bấm tên đầu việc và quyết ở đó («Vẫn soạn việc riêng» nếu chắc).",
          ],
          ketQua: ["«Giao» ở đây dùng nội dung mặc định: tên việc theo đầu việc, hạn là ngày xong theo tiến độ, người nhận như AI chọn. Việc thật được tạo và dòng đổi thành «Đã giao CV-…»; cây đọc lại."],
          luuY: ["Giao hàng loạt không cho sửa nội dung từng dòng. Cần sửa tên việc, hạn hay kết quả cần có thì dùng khung riêng của đầu việc."],
          viDu: ["Tình huống minh hoạ: dòng đầu việc «Lắp đặt trạm biến áp» ghi «🤖 Giao cho: Ban điều hành dự án» với căn cứ «loại việc này trước đây do Ban điều hành nhận». Bạn đồng ý, bấm «Giao». Dòng đổi thành «Đã giao CV-…»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «🤖 Soạn việc trên đường găng chưa ai làm» mờ", "Không còn đầu việc găng trống nào tới lúc giao (N = 0)."],
            ["Không thấy nút", "Bạn thiếu quyền «Giao việc» — nút ẩn."],
            ["Một dòng ghi lý do thay vì tên người", "AI chưa chọn được người (thiếu lịch sử hoặc không có người phù hợp trong danh sách bạn giao được). Bấm tên đầu việc rồi chọn tay."],
            ["Dòng báo trùng", "Agent khác đã soạn việc gần giống. Mở đầu việc đọc kỹ rồi mới quyết, đừng giao hai lần."],
            ["Bấm «Giao» mà báo lỗi", "Thường do hạn đã qua hoặc mất kết nối. Bấm tên đầu việc, «Sửa» chọn hạn mới."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 10/09/2026 (chép từ agent Base) và 03/10/2026 (kết quả ở cột phải, mỗi dòng một nút Giao) · luật 32 (chỉ đầu việc tới lúc giao) · luật 33 (hỏi trùng) · luật 30 (mã kèm tên).",
};

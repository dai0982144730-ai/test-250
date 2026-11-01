// Hướng dẫn bản 2 (tab) — Bước «Tham số» của luật Code: 13 dạng luật và các ô điền. Viết 20/10/2026 (nhóm B3).
// Căn cứ code: components/luat/ThamSoLuat.tsx (ô chọn Ô / Cột / Số / Kỳ báo cáo, phép so sánh, phép tính, danh sách) · lib/luat/loai-luat.ts (13 dạng) · lib/luat/loai/{o,bang,muc,ngay-dieu-kien,tinh-toan}.ts
// (nhãn tham số, mô tả, ví dụ của từng dạng, 6 định dạng có sẵn). Chuẩn số Việt Nam: lib/chung/doc-so.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Dạng luật code và ô tham số",
  ai: "Quản trị viên, người có quyền «cau_hinh.sua», hoặc người được mục «Phân quyền cài đặt» cho phép nhóm luật kiểm tra. Người khác thấy các ô nhưng bị khóa.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Phần này là gì",
          doan: [
            "Luật Code không hiểu câu tiếng Việt; nó chỉ làm đúng một trong 13 «dạng luật» có sẵn. Mỗi dạng giống một khuôn đục lỗ: bạn chọn dạng, rồi điền vào các lỗ (gọi là «tham số») để chỉ ra kiểm CÁI GÌ: ô nào, bảng nào, cột nào, so với số nào.",
            "Các ô điền hiện ra ở bước 3 của ngăn kéo luật, ngay sau khi bạn chọn dạng ở bước 2. Bạn chọn theo nhãn trên mẫu Word như «Ngày kết thúc», «Người phụ trách», không phải nhớ mã.",
          ],
        },
        {
          tieuDe: "② Vì sao tách khuôn và tham số",
          ds: [
            "Cùng một khuôn dùng cho nhiều luật: khuôn «Cột bắt buộc điền» dùng được cho bảng Công việc, bảng Kiến nghị, bảng Sự cố… chỉ đổi cột.",
            "Máy chạy khuôn rất nhanh và chắc: cùng báo cáo, cùng tham số thì luôn ra cùng kết quả, nên mới cho phép chặn gửi.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Bước 1 và 2: viết câu luật, chọn «Code» hoặc «Code + AI», chọn «Dạng luật code»"],
            ["Bước này", "Bước 3: điền tham số; máy đọc lại thành câu «Code sẽ kiểm: …» để bạn đối chiếu"],
            ["Sau", "Bước 4 chọn mức; bước 5 chạy thử; lưu"],
          ],
        },
        {
          tieuDe: "④ 13 dạng, chia 6 nhóm (đúng thứ tự trong ô chọn)",
          bang: [
            ["Nhóm", "Dạng", "Xem tab"],
            ["Ô nhập", "«Ô phải được điền» · «Đúng định dạng»", "② Ô và số"],
            ["Ngày và số", "«So sánh hai ngày» · «Số nằm trong khoảng»", "③ Ngày và điều kiện · ② Ô và số"],
            ["Tính toán số liệu", "«Phép tính giữa các số» · «Dòng tổng bằng tổng các dòng»", "⑤ Tính toán"],
            ["Bảng", "«Bảng có đủ số dòng» · «Cột bắt buộc điền» · «Không trùng giữa các dòng» · «Người phụ trách có trong hệ thống»", "④ Bảng và mục"],
            ["Giá trị và điều kiện", "«Chọn trong danh sách» · «Nếu … thì …»", "② Ô và số · ③ Ngày và điều kiện"],
            ["Mục nội dung", "«Mục phải có nội dung»", "④ Bảng và mục"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Chọn dạng, điền hoặc sửa tham số theo ý mình."],
            ["Máy", "Hiện đúng ô, bảng, cột của mẫu; kiểm tham số có hợp lệ; đọc lại thành lời; sau này chạy luật."],
            ["🤖 AI", "🤖 Nếu bạn bấm «AI đề xuất cách chạy» ở bước 1 thì AI điền sẵn dạng và tham số cho bạn xem. Bạn vẫn duyệt hoặc sửa. Tự điền tay thì không có AI."],
          ],
        },
        { tieuDe: "⑥ Quy trình người ↔ AI", doan: ["AI chỉ đề xuất sẵn các ô; người sửa lại bất kỳ ô nào. Máy kiểm tham số có khớp mẫu trước khi cho lưu. Tự chọn dạng luật thì quy trình hoàn toàn do người và máy."] },
      ],
    },
    {
      ten: "① Chọn ô, bảng, cột",
      khoi: [
        { doan: ["Hầu hết các ô tham số đều hỏi «kiểm cái nào». Bạn trả lời bằng cách chọn trong danh sách đúng nhãn của mẫu. Danh sách chỉ hiện những ô, bảng, cột có trong các mẫu bạn đã chọn ở «Áp dụng cho mẫu»; chỗ nào chỉ có ở vài mẫu thì có chú thích mẫu nào có."] },
        {
          tieuDe: "Các nút chọn kiểu tham chiếu",
          bang: [
            ["Nút", "Nghĩa", "Hiện ở"],
            ["«Ô nhập» (hoặc «Ô»)", "Một ô đơn trên báo cáo, như ô «Người kiểm soát»", "Hầu hết dạng"],
            ["«Cột trong bảng» (hoặc «Cột»)", "Chọn bảng trước, rồi chọn cột; luật xét từng dòng của bảng", "Hầu hết dạng"],
            ["«Kỳ báo cáo»", "Ngày đầu kỳ, ngày cuối kỳ, hoặc ngày nộp báo cáo (máy tự ghi lúc nộp)", "Chỉ khi so sánh ngày và điều kiện"],
            ["«Số»", "Một con số cố định do bạn gõ, như 100", "Chỉ ở phép tính"],
          ],
        },
        { bam: ["Bấm nút kiểu tham chiếu.", "Chọn trong danh sách (cột thì chọn bảng trước, ô «cột» mở sau khi đã có bảng).", "Ô còn thiếu sẽ viền đỏ sau khi bạn thử lưu."] },
        {
          viDu: [
            "Luật «Mỗi việc trong bảng Công việc phải có người phụ trách»: chọn nút «Cột trong bảng», bảng «Công việc», cột «Phụ trách». Máy xét từng dòng việc.",
            "Luật «Ô người kiểm soát phải được điền»: chọn nút «Ô nhập», ô «Người kiểm soát». Máy xét một lần cho cả báo cáo.",
          ],
        },
        { luuY: ["Chọn bảng khác thì ô cột bị đặt lại. Số bạn gõ theo chuẩn Việt Nam: dấu phẩy là thập phân, dấu chấm ngăn nhóm ba (1.240,5)."] },
      ],
    },
    {
      ten: "② Ô và số",
      khoi: [
        { doan: ["Bốn dạng xét giá trị của một ô hoặc một cột."] },
        {
          bang: [
            ["Dạng", "Làm gì", "Ô điền"],
            ["«Ô phải được điền»", "Ô không được trống hay còn chữ mẫu như «......»", "«Ô cần điền»"],
            ["«Đúng định dạng»", "Giá trị đúng một khuôn: số điện thoại, mã việc, ngày dd/mm/yyyy, địa chỉ email, số, phần trăm; ô trống thì bỏ qua", "«Ô hoặc cột cần kiểm» · «Định dạng có sẵn» · hoặc «Hoặc biểu thức tự viết» (khi không có khuôn sẵn; dành cho người rành kỹ thuật)"],
            ["«Số nằm trong khoảng»", "Giá trị là số và nằm giữa hai mốc; đọc được «41,5%», «1.240», «12,5 tỷ»; ô trống thì bỏ qua", "«Ô hoặc cột chứa số» · «Từ (nhỏ nhất)» · «Đến (lớn nhất)» (bỏ trống bên nào thì không giới hạn bên đó)"],
            ["«Chọn trong danh sách»", "Giá trị chỉ được là một trong các lựa chọn, không phân biệt hoa thường", "«Ô hoặc cột cần kiểm» · «Các giá trị cho phép» (gõ từng giá trị rồi Enter) · «Bỏ qua dấu tiếng Việt khi so»"],
          ],
        },
        {
          viDu: [
            "«% hoàn thành từ 0 đến 100»: dạng «Số nằm trong khoảng», cột % hoàn thành, «Từ» 0, «Đến» 100. Dòng ghi 105% bị báo.",
            "«Mã việc trong bảng Công việc phải có dạng CV-2026-0412»: dạng «Đúng định dạng», chọn «Định dạng có sẵn» là mã việc.",
            "«Mức độ trong bảng kiến nghị chỉ được là Cao, TB hoặc Thấp»: dạng «Chọn trong danh sách», gõ ba giá trị Cao, TB, Thấp.",
          ],
        },
        { luuY: ["«Đúng định dạng» bắt buộc chọn định dạng có sẵn hoặc viết biểu thức; không chọn cả hai thì không lưu được. Biểu thức sai cú pháp bị từ chối."] },
      ],
    },
    {
      ten: "③ Ngày và điều kiện",
      khoi: [
        {
          bang: [
            ["Dạng", "Làm gì", "Ô điền"],
            ["«So sánh hai ngày»", "Ngày A phải trước, sau hoặc cùng ngày với ngày B (có thể cộng thêm số ngày cho B). Cả hai là cột của một bảng thì so trong từng dòng; so được với kỳ báo cáo; bên nào trống thì bỏ qua", "«Ngày A» · «Phép so» · «Ngày B» · «Cộng thêm cho B (ngày)»"],
            ["«Nếu … thì …»", "Khi điều kiện thứ nhất đúng thì điều kiện thứ hai phải đúng. Hai cột cùng bảng thì xét từng dòng, ô thì xét cả báo cáo", "«Nếu» và «Thì»: mỗi bên gồm ô hoặc cột + điều kiện (có giá trị, để trống, là, khác, có chứa, không chứa, bằng, khác, nhỏ hơn…) + giá trị"],
          ],
        },
        {
          tieuDe: "Đọc phép so ngày cho đúng",
          bang: [
            ["Nút phép so", "Với ngày, nghĩa là"],
            ["=", "cùng ngày với B"],
            ["≠", "khác ngày"],
            ["<", "trước B"],
            ["≤", "không sau B (A trước hoặc bằng B)"],
            [">", "sau B"],
            ["≥", "không trước B"],
          ],
        },
        {
          viDu: [
            "Mặc định máy có luật hệ thống «Ngày bắt đầu không sau ngày kết thúc». Tự làm tương tự: «So sánh hai ngày», Ngày A = cột Bắt đầu, Phép so ≤, Ngày B = cột Kết thúc.",
            "«Ngày lập không được trước ngày đầu kỳ báo cáo»: Ngày A = nút «Kỳ báo cáo» › ngày nộp, phép so ≥, Ngày B = nút «Kỳ báo cáo» › ngày đầu kỳ.",
            "«Nếu Đã xong thì phải có ngày Kết thúc»: dạng «Nếu … thì …»; Nếu: cột Đã xong «có giá trị»; Thì: cột Kết thúc «có giá trị».",
            "Muốn cho phép ngày hoàn thành chậm tối đa 30 ngày so với ngày kế hoạch: ngày A là cột hoàn thành, ≤, ngày B là cột kế hoạch, «Cộng thêm cho B» = 30.",
          ],
        },
        { luuY: ["Ở «Nếu … thì …» chọn phép «nhỏ hơn (số)», «lớn hơn (số)»… thì ô giá trị là số theo chuẩn Việt Nam; các phép chữ (là, có chứa…) thì ô giá trị là chữ, ví dụ «Có»."] },
      ],
    },
    {
      ten: "④ Bảng và mục",
      khoi: [
        {
          bang: [
            ["Dạng", "Làm gì", "Ô điền"],
            ["«Bảng có đủ số dòng»", "Bảng phải có tối thiểu số dòng có nội dung; dòng trống hay toàn «......» không tính", "«Bảng» · «Số dòng tối thiểu» (bỏ trống = 1)"],
            ["«Cột bắt buộc điền»", "Ở mỗi dòng có nội dung, cột này phải được điền", "«Bảng» · «Cột phải điền»"],
            ["«Không trùng giữa các dòng»", "Trong một bảng, cột này không có hai dòng cùng giá trị (không phân biệt hoa thường); ô trống bỏ qua", "«Bảng» · «Cột không được trùng» · «Bỏ qua dấu tiếng Việt khi so»"],
            ["«Người phụ trách có trong hệ thống»", "Mỗi tên ở cột phụ trách phải nhận ra là một đơn vị hoặc một người có trong hệ thống (tên cách nhau bằng ; , +)", "«Bảng» · «Cột người phụ trách» (bỏ trống = cột phụ trách của bảng)"],
            ["«Mục phải có nội dung»", "Mục (tìm theo tiêu đề) phải có chữ thật, ít nhất số ký tự đặt ra", "«Mục (tiêu đề)» · «Số ký tự tối thiểu» (bỏ trống = 1)"],
          ],
        },
        {
          viDu: [
            "«Báo cáo phải có ít nhất 1 việc trong bảng Công việc»: dạng «Bảng có đủ số dòng», bảng Công việc, số dòng tối thiểu để mặc định (1).",
            "«Mã việc trong bảng Công việc không được trùng nhau»: dạng «Không trùng giữa các dòng», cột Mã việc.",
            "«Mục Nhân sự phải có nội dung, ít nhất 20 ký tự»: dạng «Mục phải có nội dung», mục «Nhân sự», số ký tự tối thiểu 20.",
          ],
        },
        { luuY: ["Máy coi «......» và các chuỗi liệt kê ở Cài đặt › «Luật hệ thống» (mục chuỗi coi là chưa điền) là CHƯA điền. Đổi danh sách chuỗi đó thì mọi luật dạng này đổi theo."] },
      ],
    },
    {
      ten: "⑤ Tính toán",
      khoi: [
        { doan: ["Hai dạng dành cho số liệu: «Phép tính giữa các số» kiểm một ô hoặc một cột bằng phép tính của hai ô hoặc cột khác; «Dòng tổng bằng tổng các dòng» kiểm dòng TỔNG của bảng."] },
        {
          tieuDe: "«Phép tính giữa các số»",
          bang: [
            ["Ô", "Điền gì"],
            ["«Ô hoặc cột kết quả»", "Chỗ chứa kết quả cần kiểm, ví dụ cột Lệch"],
            ["«Kết quả phải … phép tính»", "Phép so: bằng (mặc định), không nhỏ hơn, không lớn hơn…"],
            ["«Phép tính» (6 nút)", "A − B (hiệu) · A + B (tổng) · A × B (tích) · A ÷ B (thương) · A ÷ B × 100 (phần trăm) · = A (so thẳng với A)"],
            ["«A» và «B» (nút Ô / Cột / Số)", "Hai vế của phép tính; vế nào cũng chọn được ô, cột hoặc một con số"],
            ["«Cộng thêm (chỉ phép tổng)»", "Thêm cột thứ ba trở đi vào phép tổng"],
            ["«Sai số cho phép (tuyệt đối)» và «Sai số cho phép (% giá trị tính ra)»", "Cho lệch tối đa bao nhiêu. Bỏ trống thì chỉ cho lệch do làm tròn"],
            ["«So chính xác (không cho lệch làm tròn)»", "Bật thì không cho lệch làm tròn"],
            ["«Ô A/B trống hoặc «—» thì tính là 0»", "Bật thì ô trống không làm luật bỏ qua dòng"],
            ["«Kết quả ghi chữ này thì bỏ qua»", "Gõ chữ như «Đạt»: kết quả ghi chữ đó thì không kiểm"],
          ],
        },
        {
          tieuDe: "«Dòng tổng bằng tổng các dòng»",
          bang: [
            ["Ô", "Điền gì"],
            ["«Bảng»", "Bảng có dòng TỔNG"],
            ["«Các cột phải cộng khớp»", "Danh sách cột số cần cộng"],
            ["«Cột ghi nhãn dòng tổng»", "Cột chứa chữ TỔNG; bỏ trống là cột đầu (không tính số thứ tự)"],
            ["«Nhãn dòng tổng»", "Chữ nhận ra dòng tổng; bỏ trống là TỔNG"],
            ["«Sai số cho phép (tuyệt đối)» · «Sai số cho phép (% của tổng)» · «So chính xác…»", "Như trên"],
          ],
        },
        {
          viDu: [
            "«Cột Lệch phải bằng TH lũy kế trừ KH lũy kế» trong bảng Tiến độ tổng thể: kết quả = cột Lệch, phép tính A − B, A = cột TH lũy kế, B = cột KH lũy kế, phép so bằng.",
            "«Dòng TỔNG của bảng Công nợ phải thu bằng tổng các dự án ở mọi cột số»: dạng «Dòng tổng bằng tổng các dòng», bảng Công nợ phải thu, liệt kê các cột số.",
            "«% hoàn thành = A ÷ B × 100»: phép tính A ÷ B × 100, A là cột khối lượng đã làm, B là cột khối lượng thiết kế; cho sai số 0,1 để khỏi báo vì làm tròn.",
          ],
        },
        { luuY: ["Luật tính toán nên để «Cảnh báo» hay «Gợi ý» trừ khi chắc chắn công thức luôn đúng: số liệu có đơn vị, dòng trống, làm tròn dễ gây báo nhầm."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Danh sách ô, bảng, cột trống hoặc thiếu chỗ cần chọn", "Mẫu bạn chọn ở «Áp dụng cho mẫu» không có chỗ đó. Chọn đúng mẫu có bảng cần kiểm, hoặc xem lại mục «Mẫu Word»."],
            ["Lưu báo «Thiếu tham số …»", "Còn ô bắt buộc chưa điền; ô đó viền đỏ."],
            ["Lưu báo bảng, cột «không có trong mẫu»", "Luật áp cho đúng một mẫu và tham số trỏ vào chỗ mẫu đó không có. Chọn lại từ danh sách."],
            ["Câu «Code sẽ kiểm …» đọc không giống ý mình", "Tham số chưa đúng. Sửa tham số cho tới khi câu đọc ra đúng ý."],
            ["Số gõ vào bị báo sai", "Dùng chuẩn Việt Nam: 0,5 · 1.240,5. Không gõ 1,240.5."],
            ["Điều kiện cần hiểu nghĩa (nêu lý do, hợp lý, mâu thuẫn)", "Không có dạng nào làm được. Đổi cách chạy sang «AI» ở bước 2 và viết «Hướng dẫn cho AI»."],
          ],
        },
      ],
    },
  ],
  canCu: "Mười ba dạng luật Code của bộ luật kiểm tra (phần dạng luật), định nghĩa ô, bảng, cột của mẫu Word, chuẩn số Việt Nam.",
};

# BẮT ĐẦU: dán toàn bộ nội dung dưới đây vào AI viết code

> **Cách dùng**: mở công cụ AI viết code (Claude Code / Cursor / …), **trỏ thư mục làm việc vào
> chính thư mục chứa file này**, rồi dán nguyên phần trong khung xuống dưới làm câu lệnh đầu tiên.

---

Bạn sắp viết **Agent Base.vn** cho BQLDA SCI. Đọc hết phần này trước khi gõ dòng code nào.

## 1. Bạn có gì trong tay

| Thứ | Ở đâu | Dùng để làm gì |
|---|---|---|
| Đặc tả nghiệp vụ agent này | `TAI-LIEU-CHUNG/CHOT/PLAN-AGENT-BASE-VN-v1.0.md` | Nguồn sự thật duy nhất về việc phải làm |
| Màn «Việc của tôi» dùng chung | `TAI-LIEU-CHUNG/CHOT/VIEC-CUA-TOI-v2.0.md` | Màn lõi có ở cả 5 agent, agent này là bên cấp dữ liệu |
| Luật dùng chung 5 agent | `TAI-LIEU-CHUNG/CHOT/LOI-DUNG-CHUNG-v1.0.md` | Menu, màu, icon 🤖, màn Issue, thanh ghim, xuất file |
| Hợp đồng nối agent | `TAI-LIEU-CHUNG/CHOT/HOP-DONG-KET-NOI-v1.0.md` | Khuôn gọi/trả lời giữa các agent |
| Bức tranh toàn hệ | `TAI-LIEU-CHUNG/CHOT/PLAN-TONG-THE-v1.0.md` | Hiểu agent này nằm ở đâu trong 5 agent |
| **Demo giao diện** | `demo-agent-base.html` (mở bằng trình duyệt) | **Đây là THƯỚC ĐO.** Màn hình bạn code phải giống demo này |
| Agent tiến độ đang chạy | `codeqlda.bundle` + `TAI-LIEU-CHUNG/HUONG-DAN-BAT-AGENT-TIEN-DO.md` | Nguồn số liệu tiến độ, hỏi qua cổng MCP |
| Biểu mẫu báo cáo | `TAI-LIEU-CHUNG/forms/` | Khuôn báo cáo của công ty |
| Chìa khoá Google Drive | `TAI-LIEU-CHUNG/google-drive/` | Kết nối kho hồ sơ dùng chung. Đọc `DOC-TRUOC.md` trước. **Không commit lên git** |

> ### 📄 Việc phải làm NGAY sau khi bật được app
>
> Trong gói có file **`cơ cấu tổ chức và tên các dự án do Sci Group triển khai.docx`**.
>
> **Hãy copy nội dung của file đó, dán vào ô "Sơ đồ tổ chức và dự án" trong mục
> "Cài đặt Agent Base"** — để đảm bảo mọi AI khác hiểu ngữ cảnh, hiểu cách viết tắt dùng
> trong Base, hiểu sơ đồ tổ chức của Group và các dự án đang thi công để phân tích cho đúng.
>
> Thiếu bước này thì agent đọc tên viết tắt trong Base sẽ không biết đó là ban nào, dự án
> nào — và mọi phân tích phía sau đều lệch.

## 2. Luật cứng — vi phạm là phải làm lại

1. **⛔ KHÔNG SỬA BẤT KỲ THỨ GÌ trong bộ code agent tiến độ.** Nó phải giữ y hệt lúc bàn giao.
   Bên nhận có bảng mã kiểm từng file và sẽ đối chiếu khi bạn trả bài. Cần agent tiến độ đổi gì
   thì **ghi vào sổ báo cáo** (mục 4), đừng tự sửa.
2. **Không tự lấy khoá API của người khác.** Gói này không kèm khoá; bạn tự điền khoá của nhóm mình.
3. **Khi tài liệu mâu thuẫn nhau**: `CHOT/LOI-DUNG-CHUNG` và `CHOT/HOP-DONG-KET-NOI` **đứng trên**
   mọi file `CLAUDE.md` / `AGENTS.md` có sẵn trong bộ code nền.
4. **Mọi thứ đến tay người dùng phải là tiếng Việt** — giao diện, thông báo, tên file xuất ra, và cả
   thông báo lỗi. Chưa kiểm điều này thì chưa được nói "xong".
5. **🤖 đứng trước mọi nội dung do LLM sinh ra**; số và bảng do code tính thì hiện bình thường.
6. **Mọi màu phải truy về được một định nghĩa** (ngưỡng khai trong Cài đặt, hoặc trạng thái vòng đời
   issue). Không có định nghĩa thì dùng chip xám, phân biệt bằng CHỮ. Đỏ dành riêng cho Issue.
7. **Demo là thước, không phải vật liệu.** Đẽo từng trang cho giống demo rồi mới sang trang tiếp;
   đừng code mới tinh nhiều màn rồi mới bật lên xem.

## 3. Lấy số liệu tiến độ thế nào

Đọc `TAI-LIEU-CHUNG/HUONG-DAN-BAT-AGENT-TIEN-DO.md` — bật agent tiến độ lên rồi gọi
`POST http://localhost:3003/api/mcp/tiendo`. Công cụ bạn sẽ cần nhiều nhất:

- `tiendo.tim_dau_viec` — lấy cây WBS để treo việc Base lên đúng đầu việc (màn 10b)
- `tiendo.duong_gang` — chuỗi việc găng, để phát hiện nút găng chưa ai được giao
- `tiendo.tom_tat_du_an` — % tổng thể, COD dự báo

> ⚠ **Bắt buộc**: gói MỌI lời gọi lấy dữ liệu tiến độ vào **MỘT lớp riêng** trong code của bạn
> (ví dụ `lib/nguon-tien-do.ts`). Tài liệu thiết kế nói về sau bốn agent sẽ đọc thẳng bảng dùng chung
> `chung.wbs` trong PostgreSQL thay cho MCP. Kho chung đó **chưa dựng**; khi dựng xong, có lớp riêng
> thì bạn chỉ sửa một chỗ. Không có lớp riêng thì phải lục khắp dự án.

## 4. Bạn phải tự lập sổ công việc

Ngay từ phiên làm việc đầu tiên, tạo file **`kế hoạch và báo cáo công việc cho agent base.md`**
ở gốc thư mục code của bạn, và **cập nhật mỗi khi xong một bước**. Nội dung tối thiểu:

- Xong cái gì · đang dở cái gì · đang bị chặn bởi cái gì
- Mỗi quyết định thiết kế: chọn gì, **vì sao**, và số đo nào dẫn tới quyết định đó
- Chỗ nào tài liệu thiếu hoặc mâu thuẫn — ghi lại, **đừng tự chế rồi im lặng**
- Thứ cần agent tiến độ đổi (công cụ MCP thiếu tham số, số trả về sai…)

Bên nhận sẽ đọc đúng file này khi ghép agent của bạn vào hệ. Sổ trống = không ghép được.

## 4b. Quyền test trên Base.vn — Mr. Đại cấp

Test thoải mái với hai tài khoản **@thinhhp (Hoàng Phú Thịnh)** và **@thanhnv (Nguyễn Văn Thanh)**.
Việc tạo ra khi test phải **đặt tên có chữ «test»**; đo xong thì khôi phục lại hoặc báo rõ trong sổ.
Lưu ý đã đo: khoá API wework đứng tên @thinhhp, nên **mọi việc tạo qua app đều hiện người tạo là
@thinhhp** — nếu cần biết ai thật sự giao việc thì phải tự ghi sổ giao việc cục bộ.

## 5. Nếp làm việc bắt buộc

- **Đo, đừng đoán.** Trước khi kết luận thì chạy lệnh đếm/grep/mở file thật rồi dán con số ra.
- **Hỏi trước khi vẽ.** Với cụm màn hình chưa rõ: hỏi **① nguyên tắc làm việc → ② vào màn này để LÀM
  gì → ③ cách trình bày → ④ chi tiết**. Hỏi chi tiết trước khi chốt nguyên tắc là hỏi lãng phí.
- **Mỗi màn phải trả lời được: "người dùng vào đây để LÀM gì?"** Trả lời không được thì nó không phải
  màn — nó là Cài đặt, hoặc chỉ là ghi chú thiết kế.
- **Nút bị chặn thì hiện MỜ, không ẩn** — người dùng phải thấy con đường tồn tại và biết điều kiện mở.
- **Sửa xong màn nào thì mở trình duyệt xem màn đó**, đừng chỉ dựa vào biên dịch sạch.


## Bốn thứ agent tiến độ ĐÃ LÀM XONG — dùng lại, đừng viết lại từ đầu

Bốn thứ dưới đây nằm sẵn trong `codeqlda.bundle`. Chúng viết theo luật chung của cả 5
agent, nên bê sang là chạy. Viết lại từ đầu vừa tốn công vừa dễ lệch luật.

| Thứ | Ở đâu trong bundle | Vì sao nên dùng lại |
|---|---|---|
| **Màn Kịch bản test** | `src/components/tabs/kiem-thu/` · `src/lib/kiem-thu/` · `src/app/api/kiem-thu/` | Tab theo chủ đề, mỗi bài có Đạt/Không đạt, không đạt thì dán ảnh chụp màn hình + viết luôn câu lệnh nhờ AI sửa. **Kết quả lưu ra FILE** `data/kiem-thu/<dự án>/BAO-CAO-TEST.md` — người test xong chỉ việc bảo AI đọc file đó rồi sửa. Bạn chỉ cần thay nội dung 13 tab bằng bài test của agent mình |
| **Trang Giới thiệu** | `src/app/gioi-thieu/` · `src/lib/gioi-thieu/` · `src/components/tabs/gioi-thieu/` | Khuôn đọc bài: mục lục dính bên trái tự nhảy theo chỗ đang đọc, thân bài bên phải. Nút vào đặt ở topmenu |
| **Nút 🌐 tìm trên internet** | `src/lib/web/` + công cụ `tim_kiem_web` trong `src/lib/ai/chat-tools.ts` | Thử ba nhà tìm kiếm lần lượt; hai nhà cuối **không cần khoá API** nên chạy được ngay. Mặc định TẮT — chỉ ra internet khi người dùng bấm bật |
| **Ô lọc phạm vi Issue + câu tổng** | `src/components/tabs/alerts/CanhBaoView.tsx` · `src/lib/canh-bao/model.ts` | Đúng chốt BC 04/09: nhìn thấy issue của cả 5 agent, nhưng **chỉ sửa được issue của chính mình** — chặn ở tầng dữ liệu, không chặn bằng nút bấm. Kèm câu tổng đầu màn |

Hai điều đáng chép theo, không chỉ chép code:

- **Số ngày ảnh hưởng KHÔNG cộng dồn.** Các việc chạy song song, cộng lại ra con số to gấp
  mấy lần sự thật. Lấy cái nặng nhất làm mốc, và in câu giải thích ngay dưới.
- **Lib nào đụng `node:fs` phải tách làm hai file** — một file thuần cho client import, một
  file server. Lỗi này đã làm sập cả ba trang một lần, xem luật 10 trong `CLAUDE.md`.

## 6. Trả bài

Đóng gói code agent của bạn thành **một file `.bundle`** (`git bundle create ten.bundle --all`),
kèm sổ công việc ở mục 4. Không cần gửi `node_modules`, không gửi khoá API.

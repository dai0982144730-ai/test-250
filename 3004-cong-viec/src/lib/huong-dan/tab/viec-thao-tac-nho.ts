// Hướng dẫn bản 2 (tab) — các ô nhỏ trong thẻ việc: Gia hạn · ＋ Phối hợp · Hủy việc · Mở lại · Giao cho… Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (DongViec: các nhánh thao gia-han, phoi-hop, huy, mo-lai và ô phan-cong; NhomPhoiHop; taiNoiPhoiHop; taiNhanChuyenTiep)
// · lib/so-cai/dich-vu.ts (quyền sửa, phạm vi giao) · lib/types.ts (nhãn quyền). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gia hạn, phối hợp, hủy, mở lại, giao lại — các ô nhỏ trong thẻ việc",
  ai: "Mỗi ô chỉ hiện khi bạn có quyền tương ứng; người không có quyền sẽ không thấy nút. «Gia hạn», «Hủy việc»: quyền «Gia hạn, thêm/đổi người, hủy việc». «＋ Phối hợp»: người sửa được việc hoặc trưởng đơn vị cấp trên của bên chủ trì. «Mở lại»: người giao và lãnh đạo, chỉ với việc đã xong. «Giao cho…»: trưởng đơn vị hoặc người nhận có người để giao tiếp.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Các ô này là gì?",
          doan: [
            "Trong thẻ việc, mỗi nút ở hàng nút mở ra một ô nhỏ ngay bên dưới: ô chọn ngày, ô chọn người, hoặc ô gõ lý do. Không có hộp nổi, không có bước xác nhận thêm: làm đủ thì chọn / bấm là xong.",
            "Gộp chung một hướng dẫn vì cùng cách dùng: bấm nút để mở ô, bấm lại cùng nút để đóng ô.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Việc thực tế luôn đổi: hạn dời, thêm đơn vị hỗ trợ, việc thôi không làm nữa, việc báo xong nhầm, việc cần giao lại cho nhân viên.",
            "Mỗi thay đổi đều có người chịu trách nhiệm (người bấm) và lý do (nếu quan trọng), để về sau còn truy ra.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Việc đã được giao và đang làm", "Thẻ việc"],
            ["Bước này", "Điều chỉnh khi thực tế đổi", "Các ô nhỏ này"],
            ["Sau", "Thay đổi lập tức hiện ở danh sách, người liên quan có chuông", "Sơ đồ tổ chức, Dự án, Việc của tôi"],
          ],
        },
        {
          tieuDe: "Có những ô nào?",
          bang: [
            ["Nút / ô", "Làm gì", "Xem tab"],
            ["«Gia hạn»", "Đổi hạn", "① Gia hạn"],
            ["«＋ Phối hợp»", "Mời thêm đơn vị hoặc người hỗ trợ", "② Phối hợp"],
            ["«Hủy việc»", "Việc không làm nữa", "③ Hủy việc"],
            ["«Mở lại»", "Đưa việc đã xong về đang làm", "④ Mở lại"],
            ["Ô «Giao cho…»", "Giao phần việc cho một nhân viên", "⑤ Giao cho"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Chọn ngày / người, gõ lý do, bấm nút"],
            ["MÁY", "Kiểm quyền, ghi thay đổi và lý do vào vết, gửi chuông, cập nhật danh sách"],
            ["🤖 AI", "Màn này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Các ô này không dùng AI. Người quyết, máy ghi vết và gửi tin."],
        },
      ],
    },
    {
      ten: "① Gia hạn",
      khoi: [
        {
          bam: [
            "Trong thẻ việc, bấm «Gia hạn».",
            "Ở ô «Hạn mới» chọn ngày (gõ hoặc chọn theo dạng dd/mm/yyyy; không chọn được ngày trước hôm nay).",
            "Chọn xong là áp dụng ngay, không có nút xác nhận.",
          ],
          ketQua: ["Hạn của việc đổi ngay, dòng báo ghi «Đã gia hạn … tới dd/mm/yyyy». Lý do tự ghi là «Gia hạn trên sơ đồ tổ chức», bạn không phải gõ."],
          luuY: ["Chữ «chọn ngày là áp dụng» cạnh ô là đúng: đừng chọn thử một ngày để xem."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Hạn của một việc là cuối tháng, nhưng chủ đầu tư dời buổi kiểm tra sang tuần sau. Chị A (người giao) bấm «Gia hạn», chọn ngày mới, xong. Chữ bên phải tên việc từ «quá hạn …» đổi lại thành «còn … ngày» ngay."],
        },
      ],
    },
    {
      ten: "② Phối hợp",
      khoi: [
        {
          doan: ["«Phối hợp» là đơn vị hoặc người chỉ để biết và hỗ trợ: không có hạn riêng, không tính vào số việc của ô trên sơ đồ, không được sửa việc."],
          bam: [
            "Bấm «＋ Phối hợp».",
            "Mở ô «Phối hợp với…», danh sách xếp theo đơn vị (ngang cấp và cấp dưới của bạn). Đợi vài giây nếu ô ghi «Đang tải danh sách…».",
            "Chọn một đơn vị hoặc một người: được thêm ngay, ô đóng lại.",
          ],
          ketQua: ["Dòng báo ghi «Đã thêm … phối hợp việc …». Bên được mời thấy việc ở «Việc cần phối hợp» và nhóm cuối «Phối hợp — chỉ để biết, không tính vào số việc»."],
          luuY: ["Đơn vị / người đã có trong việc thì không hiện lại trong danh sách. Muốn bỏ một bên phối hợp thì dùng cây bút ✎ (cần quyền «Sửa việc») rồi bấm ✕ cạnh tên."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Việc «Thử nghiệm tần số» do phòng Kỹ thuật chủ trì, cần phòng Hợp đồng biết tiến độ để chuẩn bị thanh toán. Chị A bấm «＋ Phối hợp», chọn phòng Hợp đồng. Phòng này từ nay thấy việc trong «Việc cần phối hợp» và được bình luận."],
        },
      ],
    },
    {
      ten: "③ Hủy việc",
      khoi: [
        {
          doan: ["«Hủy việc» là việc không làm nữa (giao nhầm, trùng, dự án đổi hướng). Việc rời hẳn sổ cái, nên bắt buộc có lý do."],
          bam: [
            "Bấm «Hủy việc».",
            "Gõ lý do ở ô «Lý do hủy việc (bắt buộc, Enter để hủy)».",
            "Bấm «Hủy việc» (hoặc Enter). Nút mờ khi chưa có lý do.",
          ],
          ketQua: ["Dòng báo «Đã hủy việc …». Việc biến khỏi các danh sách đang làm."],
          luuY: ["Đừng hủy để «cho gọn»: nếu việc đã làm xong thì dùng «Xong việc». Việc đã hủy rời hẳn sổ cái, nên chỉ hủy khi chắc chắn."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Hai phòng cùng giao việc «Chuẩn bị hồ sơ xin phép» do nhầm. Chị A giữ một việc, mở việc còn lại, bấm «Hủy việc» và gõ «Trùng với việc đã giao cho phòng Pháp lý». Lý do này người liên quan đọc lại được."],
        },
      ],
    },
    {
      ten: "④ Mở lại",
      khoi: [
        {
          doan: ["«Mở lại» chỉ có ở việc ĐÃ XONG (mở từ nút «Tuần N», «30 ngày» hoặc khối «Việc làm xong»). Dùng khi việc báo xong nhưng thực ra chưa xong."],
          bam: [
            "Mở việc đã xong, bấm «Mở lại».",
            "Gõ «Lý do mở lại (bắt buộc) — Enter để mở lại».",
            "Tuỳ chọn: ở «Hạn mới» chọn hạn mới; để trống là giữ hạn cũ.",
            "Bấm «Mở lại».",
          ],
          ketQua: ["Dòng báo «Đã mở lại việc …» (kèm hạn mới nếu có). Việc quay về danh sách đang làm; người làm được báo lại."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Anh B báo xong «Nộp hồ sơ lên Sở» nhưng Sở trả lại vì thiếu một giấy. Chị A mở việc đã xong, bấm «Mở lại», gõ «Sở trả hồ sơ thiếu giấy xác nhận», chọn hạn mới. Anh B nhận chuông và làm tiếp."],
        },
      ],
    },
    {
      ten: "⑤ Giao cho",
      khoi: [
        {
          doan: ["Khi một việc giao cho CẢ đơn vị (không đích danh ai), trưởng đơn vị chọn MỘT nhân viên để giao tiếp. Ô này hiện ngay dưới phần thân thẻ, trước hàng nút."],
          bam: [
            "Mở thẻ việc, tìm ô «Giao cho…» (nếu thẻ có nhiều phần việc thì ghi «Phần của …: giao cho…»).",
            "Đợi danh sách hiện (ô ghi «Đang tải danh sách người…» lúc đầu).",
            "Chọn tên một người: được giao ngay, không có nút xác nhận.",
          ],
          ketQua: ["Dòng báo «Đã giao … cho …». Người đó nhận chuông. Danh sách người hiện theo quyền «Giao việc» của bạn: lãnh đạo thấy người trực thuộc SCI; trưởng đơn vị thấy đơn vị mình và đơn vị con."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Việc «Chuẩn bị bản vẽ hoàn công» giao cho cả phòng Kỹ thuật. Anh trưởng phòng mở thẻ, ở ô «Giao cho…» chọn chị C. Từ giờ việc là của chị C, hiện ở «Việc tôi nhận» của chị."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy «Gia hạn» / «Hủy việc»", "Bạn không có quyền sửa việc này, hoặc bạn chỉ đứng phối hợp (phối hợp không bao giờ được sửa)."],
            ["«Hủy việc» mờ", "Chưa gõ lý do."],
            ["Không thấy ô «Giao cho…»", "Việc đã giao đích danh một người, hoặc bạn không phải người nhận phần việc đó."],
            ["Danh sách «Phối hợp với…» thiếu đơn vị", "Danh sách chỉ gồm nơi ngang cấp và cấp dưới của bạn."],
            ["Muốn sửa tên việc, kết quả cần có, bắt đầu", "Dùng cây bút ✎ (hướng dẫn «Sửa việc»)."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Sửa» (gia hạn, thêm/đổi người, hủy việc), «Giao việc» khai ở Cài đặt, Vai trò và quyền · chốt 02/10/2026 (K1 mở lại việc đã xong; K5 trưởng đơn vị cấp trên mời phối hợp) · chốt 09/10/2026 (giao chuyển tiếp) · luật 17 riêng 3004.",
};

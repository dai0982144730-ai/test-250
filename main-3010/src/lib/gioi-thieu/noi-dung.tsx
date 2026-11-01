// ============================================================
// NỘI DUNG TRANG GIỚI THIỆU — file THUẦN (luật 10), không fs, không mạng.
//
// Mr. Đại chốt 06/09: đây là tài liệu GIỚI THIỆU, không phải hướng dẫn cầm
// tay chỉ việc. Đọc xong phải trả lời được: AI này dùng làm gì · nó chạy
// theo trình tự nào · nó đứng ở đâu trong hệ 5 agent SCI.
//
// ⭐ GIỌNG VĂN — Mr. Đại chỉnh 06/09, lần sửa thứ hai:
//   "Đóng vai người đọc lần đầu biết đến ứng dụng này mà viết."
//   Nghĩa là: viết thành câu, thành đoạn có mạch, KHÔNG viết kiểu gạch đầu
//   dòng cụt lủn. Mọi từ nghề — P01–P10, WBS, baseline, COD, Lớp 0, issue,
//   MCP — phải được giải thích ngay lần đầu xuất hiện, bằng tiếng Việt
//   thường, rồi mới được dùng lại.
//
// MỌI SỐ TRONG ĐÂY ĐỀU ĐO TỪ CODE HOẶC BỘ CHOT — không viết theo trí nhớ:
//   13 công cụ = 3 chung + 10 riêng      → src/lib/mcp/cong-tiendo.ts
//   8 luật chặn C1–C8                    → CAU-TRUC-KHO-DU-LIEU mục 10.1
//   4 đường biểu đồ                      → PLAN-AGENT-TIEN-DO mục 6
//   bản đồ ban ↔ agent, kiến trúc 4 lớp  → PLAN-TONG-THE mục 3 · 4
//   6 mã lỗi, hạn chờ 10/60/3 giây       → HOP-DONG-KET-NOI mục 3 · 6
// ============================================================

import type { ReactNode } from "react";

export interface MucGioiThieu {
  /** neo trên URL, cũng là id thẻ trong DOM */
  id: string;
  tieuDe: string;
  /** Câu dẫn một dòng, chỉ hiện ở thân bài */
  dan?: string;
  than: ReactNode;
}

/** Bảng gọn — dùng lại cho mọi mục, khỏi chép tay class (luật 7) */
function Bang({ cot, hang }: { cot: string[]; hang: ReactNode[][] }) {
  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {cot.map((c) => (
              <th
                key={c}
                className="border-b border-border bg-bg2 px-2.5 py-1.5 text-left font-bold text-text-secondary"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hang.map((h, i) => (
            <tr key={i} className="align-top">
              {h.map((o, j) => (
                <td key={j} className="border-b border-border-light px-2.5 py-1.5 text-text-secondary">
                  {o}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Một bước trong vòng chạy — số to bên trái, nội dung bên phải */
function Buoc({ so, ten, children }: { so: number; ten: string; children: ReactNode }) {
  return (
    <div className="mb-3.5 flex gap-3">
      <span className="mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11.5px] font-bold text-accent">
        {so}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-text">{ten}</div>
        <div className="mt-0.5 space-y-2 text-[12.5px] leading-[1.75] text-text-secondary">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Câu nhấn — thứ người đọc nhớ được sau khi gấp tài liệu lại */
function Nhan({ children }: { children: ReactNode }) {
  return (
    <p className="my-3 rounded-sm border-l-2 border-accent bg-accent-soft/40 px-3 py-2 text-[13px] leading-[1.75] text-text">
      {children}
    </p>
  );
}

/** Tên máy: đường dẫn, mã công cụ, tên file */
function M({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11.5px] text-accent">{children}</span>;
}

export const MUC_GIOI_THIEU: MucGioiThieu[] = [
  {
    id: "la-gi",
    tieuDe: "1. Phần mềm này là ai, và nó thay ai làm việc",
    than: (
      <>
        <p>
          Hãy hình dung một người kỹ sư tiến độ ngồi ở Ban Kỹ thuật. Mỗi sáng, người đó mở các báo cáo
          nhà thầu gửi về, cộng khối lượng đã làm được, đối chiếu với tiến độ đã cam kết, rồi trả lời
          một câu hỏi mà lãnh đạo hỏi đi hỏi lại suốt cả dự án: liệu có kịp ngày phát điện thương mại
          hay không, và nếu không kịp thì vướng ở đâu.
        </p>
        <p>
          Phần mềm này chính là người kỹ sư đó, chỉ khác ở chỗ nó không quên gì, không mệt vào tuần thứ
          ba mươi, và không bao giờ tự ý quyết định thay ai. Hằng ngày nó bóc số từ báo cáo nhà thầu
          gửi lên. Hằng tuần nó cộng lại, đối chiếu chéo giữa các nguồn số khác nhau, tính xem tốc độ
          làm việc thực tế đang là bao nhiêu, từ đó dự báo ngày về đích, chỉ ra chỗ đang hỏng, hỏi thêm
          các phần mềm anh em nếu cần, rồi dựng sẵn báo cáo tuần cho Ban quản lý dự án đọc.
        </p>
        <Nhan>
          Điều quan trọng nhất cần nhớ ngay từ đầu: nó <b>không</b> tự sửa tiến độ đã duyệt, <b>không</b>{" "}
          tự phát hành báo cáo, <b>không</b> tự đóng một vấn đề đang treo, và <b>không</b> quyết thay
          người. Mọi việc nó làm đều dừng lại ngay trước một cái nút, và cái nút đó phải do người bấm.
        </Nhan>
        <p>
          Vì sao phải cần đến nó? Vì một dự án điện gió có hàng trăm đầu việc, mỗi tuần vài chục file
          báo cáo từ nhiều nhà thầu khác nhau, mỗi file một kiểu trình bày. Người làm tay thì mất gần
          hai ngày mỗi tuần chỉ để cộng và đối chiếu, và vẫn sót. Phần mềm làm phần cộng và đối chiếu
          đó trong vài phút, đồng thời chỉ đích danh nó sót ở dòng nào, trong file nào — để người còn
          thời gian làm phần mà chỉ người mới làm được: quyết định.
        </p>
      </>
    ),
  },
  {
    id: "vi-tri",
    tieuDe: "2. Nó nằm ở đâu trong cả hệ thống của SCI",
    than: (
      <>
        <p>
          SCI không làm một phần mềm biết tuốt. Lý do rất thực tế: một cái biết tuốt thì không ai kiểm
          được nó nói đúng hay sai. Thay vào đó, mỗi ban chuyên môn có một phần mềm riêng, phạm vi hẹp,
          và quan trọng nhất là <b className="text-text">chịu trách nhiệm về số liệu của ban mình</b>.
          Cách gọi trong nhà là &quot;agent&quot; — nghĩa là một trợ lý máy phụ trách một mảng việc.
        </p>
        <Bang
          cot={["Ban chuyên môn", "Trợ lý phụ trách", "Chịu trách nhiệm về"]}
          hang={[
            ["Ban lãnh đạo", "Trợ lý điều phối", "không giữ số liệu, chỉ hỏi các trợ lý khác rồi tổng hợp"],
            [
              "Ban Kỹ thuật và Chất lượng",
              <b key="a" className="text-accent">
                Trợ lý tiến độ — chính là phần mềm này
              </b>,
              "tiến độ thi công và theo dõi hồ sơ thiết kế",
            ],
            ["Ban Kinh tế Dự án", "Trợ lý hợp đồng", "hợp đồng, phiếu giá, thanh toán"],
            ["Ban Đền bù và Giải phóng mặt bằng", "Trợ lý pháp lý", "thủ tục pháp lý, đất đai"],
            ["Ban Tài chính Tổng hợp", "Trợ lý công việc nội bộ", "giao việc, theo dõi đầu việc hành chính"],
          ]}
        />
        <p>
          Bên dưới năm trợ lý đó là bốn tầng xếp chồng lên nhau. Tầng dưới cùng, quen gọi là{" "}
          <b className="text-text">Lớp 0</b>, làm việc bẩn nhất: nhận file thô đủ kiểu từ nhà thầu rồi
          bóc thành số liệu có cấu trúc. Số liệu sạch chảy vào <b className="text-text">Lớp 1</b> — một
          cơ sở dữ liệu duy nhất, mọi trợ lý đều lấy số từ đó chứ không ai giữ bản riêng.{" "}
          <b className="text-text">Lớp 2</b> là bốn trợ lý nghiệp vụ, mỗi trợ lý một chuyên môn. Trên
          cùng, <b className="text-text">Lớp 3</b> là trợ lý điều phối, nó không giữ số liệu nào của
          riêng mình mà chỉ đi hỏi bốn trợ lý kia rồi ghép câu trả lời lại.
        </p>
        <p>
          Trợ lý tiến độ nằm ở Lớp 2, và tự chạy Lớp 0 cho phần hồ sơ thuộc về mình — nghĩa là nó vừa
          bóc số, vừa tính, vừa trả lời.
        </p>
        <Nhan>
          Khi trợ lý hợp đồng cần biết một hạng mục đã thi công đến đâu, nó <b>không</b> mở cơ sở dữ
          liệu đọc thẳng. Nó gửi một câu hỏi sang trợ lý tiến độ và nhận về con số đã tính xong, kèm
          đường dẫn tới file gốc sinh ra con số đó. Cách làm này nghe vòng vo nhưng đổi lại: chỉ có một
          nơi duy nhất tính ra một con số, nên không bao giờ có chuyện hai bản báo cáo cãi nhau. Mọi
          lượt hỏi đều được ghi lại, xem ở <b>Agent quan sát</b>.
        </Nhan>
      </>
    ),
  },
  {
    id: "ranh-gioi",
    tieuDe: "3. Chỗ nào máy tính, chỗ nào AI viết, chỗ nào người quyết",
    than: (
      <>
        <p>
          Đây là phần đáng đọc kỹ nhất, vì nó là lý do người ta dám mang số của phần mềm này đi họp.
          Chuyện thường gặp với các phần mềm có AI là không ai phân biệt được đâu là con số được tính
          ra, đâu là câu AI tự nghĩ. Ở đây ranh giới đó được vạch cứng ngay trong mã nguồn.
        </p>
        <p>
          <b className="text-text">Phần tính toán hoàn toàn do máy làm theo công thức cố định.</b> Mọi
          phép cộng khối lượng, mọi ngưỡng cảnh báo, mọi phép dự báo ngày về đích đều là công thức viết
          sẵn. Đặc điểm của nó là cùng một dữ liệu đầu vào thì hôm nay hay tháng sau cũng ra đúng một
          đáp số, không phụ thuộc tâm trạng của máy.
        </p>
        <p>
          <b className="text-text">Phần AI chỉ được giao ba việc</b>, và cả ba đều là việc chữ nghĩa
          chứ không phải việc số. Một là đọc câu tiếng Việt của người rồi chuyển thành số hoặc thành
          phân loại — chẳng hạn người gõ &quot;móng trụ số 7 xong khoảng ba phần tư&quot; thì AI hiểu
          ra là hạng mục nào, phần trăm bao nhiêu. Hai là đọc bảng số rồi viết lại thành đoạn văn cho
          người đọc đỡ nhức mắt. Ba là gợi ý nên làm gì tiếp. AI bị cấm bịa ra con số nằm ngoài dữ liệu
          được đưa; thiếu số thì nó phải ghi thẳng là &quot;chưa có số liệu&quot; chứ không được ước
          chừng.
        </p>
        <p>
          <b className="text-text">Người giữ quyền quyết định cuối cùng</b> ở mọi chỗ. Không có nút nào
          tự chạy sau lưng người dùng.
        </p>
        <Nhan>
          Trên màn hình, biểu tượng <b>🤖</b> đứng trước mọi câu do AI viết ra. Chỗ nào là bảng số, là
          biểu đồ, không có 🤖, thì đó là máy tính theo công thức. Ngoài ra, câu nào AI nêu căn cứ thì
          luôn kèm một đường dẫn bấm được — bấm vào là mở đúng dòng, trong đúng file báo cáo đã sinh ra
          con số đó.
        </Nhan>
      </>
    ),
  },
  {
    id: "vong-chay",
    tieuDe: "4. Sáu bước lặp lại mỗi tuần",
    dan: "Nắm được sáu bước này là nắm được toàn bộ phần mềm; phần còn lại chỉ là chi tiết.",
    than: (
      <>
        <Buoc so={1} ten="Hồ sơ đi vào — người thả file, AI đọc, người bấm đồng ý">
          <p>
            Không ai được đẩy thẳng file lên kho. Cách làm ở đây là người thả file vào khung trò chuyện
            kèm <b>một câu tiếng Việt</b> nói đó là cái gì. AI mở file ra đọc nội dung để tự nhận ra
            loại hồ sơ, rồi đề xuất tên đặt theo chuẩn công ty và chỗ cất trong kho. Người xem đề xuất
            đó, thấy đúng thì bấm đồng ý, lúc ấy file mới thực sự được ghi.
          </p>
          <p>
            Nếu AI đọc mà không chắc đó là hồ sơ gì, nó <b>không đoán bừa</b>. File được cất vào một
            ngăn riêng mang tên <M>09-CHUA-PHAN-LOAI</M> để người xem lại sau, chứ không bị nhét nhầm
            vào một thư mục nào đó rồi mất dấu.
          </p>
        </Buoc>

        <Buoc so={2} ten="Cửa kiểm — dữ liệu phải sạch mới được vào">
          <p>
            Trước khi bất kỳ con số nào chạm vào hệ thống, nó phải qua tám phép kiểm. Tám phép này bắt
            những lỗi thực tế hay xảy ra khi nhiều nhà thầu cùng nộp báo cáo: file ghi mã dự án khác
            với dự án đang mở, một file trộn số liệu của hai dự án, file đã nộp rồi nộp lại lần nữa,
            file hỏng không mở được, hai báo cáo cùng một ngày của cùng một nhà thầu, mã công việc
            không có trong danh mục của dự án, tên nhà thầu lạ chưa từng khai, và khối lượng ghi số âm
            hoặc ngày tháng ở tương lai.
          </p>
          <p>
            Gặp lỗi thì phần mềm <b>chỉ đích danh dòng nào sai và sai vì cái gì</b> để người sửa rồi
            nộp lại — chứ không im lặng bỏ qua dòng đó, cũng không tự sửa hộ. Trong tài liệu kỹ thuật,
            tám phép kiểm này được đánh số từ C1 đến C8 cho tiện tra cứu.
          </p>
        </Buoc>

        <Buoc so={3} ten="Máy tính lại toàn bộ tiến độ và dự báo ngày về đích">
          <p>
            Từ khối lượng các nhà thầu báo trong tuần, phần mềm dựng lại đường tiến độ thực tế, tính ra
            tốc độ làm việc thật của từng hạng mục, rồi lấy tốc độ đó chiếu tiếp về phía trước để{" "}
            <b>dự báo ngày hoàn thành</b>. Kết quả hiện thành bốn đường trên cùng một biểu đồ — mục 5
            nói cách đọc bốn đường ấy.
          </p>
        </Buoc>

        <Buoc so={4} ten="Soát tiến độ theo luật nghề, không phải luật máy">
          <p>
            Mỗi lần có tiến độ mới nạp vào, phần mềm rà lại các cặp công việc theo{" "}
            <b>bảng quy tắc thi công của ngành</b> — tập hợp những ràng buộc mà người trong nghề đều
            biết, chẳng hạn đổ bê tông móng xong phải chờ đủ thời gian cho bê tông đạt cường độ rồi mới
            được dựng tháp, và khoảng chờ đó không dưới hai mươi tám ngày. Bảng này hiện có mười quy
            tắc, trong tài liệu đánh số từ P01 đến P10.
          </p>
          <p>
            Khi phát hiện một cặp việc xếp sát nhau hơn mức cho phép, phần mềm báo{" "}
            <b>ngay tại dòng đó</b>, nói rõ đang thiếu bao nhiêu ngày và vì sao cần khoảng chờ ấy. Nó{" "}
            <b>chỉ cảnh báo chứ không tự sửa</b>: người lập tiến độ tự quyết định giãn việc ra, hay ghi
            lại lý do vì sao trường hợp này là ngoại lệ.
          </p>
        </Buoc>

        <Buoc so={5} ten="Việc chưa xong thì không được phép rơi">
          <p>
            Cần phân biệt hai thứ nghe giống nhau. <b>Cảnh báo</b> là trạng thái nhất thời, tuần này
            chậm thì hiện, tuần sau đuổi kịp thì tự tắt, không cần ai làm gì. Còn{" "}
            <b>vấn đề tồn đọng</b> — trong phần mềm gọi là issue — thì không tự tắt: nó có người chịu
            trách nhiệm, có hạn phải xử lý, và chỉ đóng lại khi có người bấm đóng.
          </p>
          <p>
            Sổ vấn đề tồn đọng này dùng chung cho cả năm trợ lý. Nhờ vậy một hạng mục chậm vì chưa có
            mặt bằng vẫn truy ngược được sang phần việc của Ban Đền bù, thay vì mỗi bên ghi một sổ rồi
            không ai khớp với ai.
          </p>
        </Buoc>

        <Buoc so={6} ten="Báo cáo — số của máy, câu chữ của AI, chữ ký của người">
          <p>
            Báo cáo tuần cho Ban quản lý dự án được dựng sẵn từ những con số đã tính ở các bước trên.
            AI viết phần diễn giải cho dễ đọc, nhưng người phải đọc lại và bấm phát hành. Không có bản
            báo cáo nào tự gửi đi.
          </p>
        </Buoc>

        <Nhan>
          Sáu bước này lặp lại đều đặn mỗi tuần. Nhìn kỹ sẽ thấy người chỉ thực sự phải ngồi vào ở bước
          đầu và bước cuối — hai đầu của dây chuyền. Bốn bước ở giữa là phần máy làm, và cũng là phần
          trước đây ngốn nhiều thời gian nhất.
        </Nhan>
      </>
    ),
  },
  {
    id: "bon-duong",
    tieuDe: "5. Bốn đường trên biểu đồ nói lên điều gì",
    than: (
      <>
        <p>
          Biểu đồ tiến độ của phần mềm luôn vẽ bốn đường chồng lên nhau. Nhiều người mới nhìn thấy rối,
          nhưng thật ra mỗi đường trả lời một câu hỏi khác nhau, và điều đáng đọc lại nằm ở{" "}
          <b className="text-text">khoảng cách giữa chúng</b> chứ không phải bản thân từng đường.
        </p>
        <Bang
          cot={["Đường", "Nó là gì", "Có đổi không"]}
          hang={[
            [
              "Tiến độ mục tiêu",
              "Chủ đầu tư đưa ra — mục tiêu của Ban (ngày COD mục tiêu)",
              "Không đổi suốt dự án",
            ],
            [
              "Baseline",
              "Tiến độ Ban ký với Tổng thầu, bản đã duyệt — dùng để giao việc cho nhà thầu",
              "Đổi được, nhưng phải có phiên bản và Giám đốc Ban duyệt",
            ],
            [
              "Thực tế",
              "Tính ngược từ khối lượng nhà thầu nộp hằng tuần",
              "Cập nhật mỗi tuần",
            ],
            [
              "Dự báo",
              "Máy chiếu tốc độ đang có về phía trước để đoán ngày kết thúc",
              "Tính lại mỗi tuần",
            ],
          ]}
        />
        <p>
          Nhanh hay chậm <b className="text-text">luôn đếm bằng NGÀY</b>, không đếm bằng khoảng hở phần trăm
          giữa hai đường (% chỉ nói đã làm được bao nhiêu khối lượng). Và câu nào cũng phải nói rõ{" "}
          <b className="text-text">so với Tiến độ mục tiêu</b> hay <b className="text-text">so với Baseline</b>.
          Ba tình huống hay gặp và cách đọc chúng:
        </p>
        <p>
          Khi <b className="text-text">ngày dự báo xong muộn hơn ngày xong theo Baseline</b> — ví dụ «chậm 44
          ngày so với Baseline» — nghĩa là nhà thầu đang làm chậm hơn mức đã ký. Đây là chuyện nội bộ giữa Ban
          và nhà thầu, xử lý bằng đôn đốc.
        </p>
        <p>
          Khi <b className="text-text">COD dự báo muộn hơn COD Tiến độ mục tiêu</b> — ví dụ «chậm 86 ngày so
          với Tiến độ mục tiêu» — câu chuyện nặng hơn hẳn: với đà này thì dự án sẽ trễ mục tiêu Chủ đầu tư
          đưa ra. Đây là con số quan trọng nhất mà cả phần mềm được dựng lên để trả lời.
        </p>
        <p>
          Còn nếu <b className="text-text">COD Baseline đã muộn hơn COD Tiến độ mục tiêu ngay từ lúc ký</b>,
          thì vấn đề không nằm ở tuần này hay tháng này — nó cho thấy lúc ký kết đã nhượng bộ nhà thầu một
          khoảng thời gian (bao nhiêu ngày thì đọc thẳng số ngày), và khoảng đó phải bù lại ở đâu đó về sau.
        </p>
      </>
    ),
  },
  {
    id: "man-hinh",
    tieuDe: "6. Vào màn nào để làm việc gì",
    dan: "Biết mình đang ở bước nào thì tự tìm ra màn tương ứng.",
    than: (
      <>
        <p>
          Menu bên trái nhìn qua thì nhiều mục, nhưng thực ra nó xếp theo đúng sáu bước ở mục 4. Bảng
          dưới đây là bản đồ đối chiếu:
        </p>
        <Bang
          cot={["Đang ở bước nào", "Thì vào màn"]}
          hang={[
            ["Nộp hồ sơ, nộp ảnh hiện trường", "Hồ sơ dự án · Hình ảnh"],
            ["Xem tiến độ, lập hoặc sửa tiến độ", "Lập tiến độ · Gantt Chart · Tiến độ chi tiết"],
            [
              "Nghi ngờ số liệu giữa các nguồn không khớp",
              "Soát số liệu — nút ở góc trên bên phải màn Hồ sơ dự án",
            ],
            ["Xem những gì đang trục trặc", "Cảnh báo · Việc của tôi"],
            ["Làm báo cáo gửi đi", "BC Kỹ thuật hiện trường · BC Lãnh đạo"],
            ["Muốn hỏi bằng lời thay vì tự tìm", "Trợ lý AI — nút ở góc trên bên phải mọi màn"],
          ]}
        />
        <p>
          Muốn biết thao tác cụ thể của từng màn thì không cần quay lại trang này: mỗi màn đều có nút{" "}
          <b className="text-text">❓ Hướng dẫn</b> ở góc trên, mở ra đúng phần chỉ dẫn của riêng màn
          đó.
        </p>
        <Nhan>
          Hai màn <b>Skill AI của tôi</b> và <b>Cài đặt</b> giống hệt
          nhau ở cả năm trợ lý của SCI; nhật ký các agent hỏi nhau xem chung ở <b>Agent quan sát</b>. Học một lần là dùng được ở mọi phần mềm trong nhà.
        </Nhan>
      </>
    ),
  },
  {
    id: "cho-nhom-code",
    tieuDe: "7. Dành cho nhóm lập trình các trợ lý khác",
    dan: "Phần này viết cho người sắp nối phần mềm của mình vào đây; người dùng thường có thể dừng ở mục 6.",
    than: (
      <>
        <p>
          Nếu bạn đang xây một trong bốn trợ lý còn lại của SCI và cần số liệu tiến độ, thì có đúng một
          con đường vào, và con đường đó cố tình hẹp.
        </p>

        <h3 className="mt-4 text-[13.5px] font-bold text-text">Hỏi qua một cửa duy nhất</h3>
        <p>
          Cửa đó là <M>/api/mcp/tiendo</M>. Bạn gửi lên một yêu cầu ghi rõ ba thứ: muốn dùng công cụ
          nào, phần mềm nào đang hỏi, và <b>hỏi để làm gì</b>. Thứ ba nghe thừa nhưng bắt buộc — nó
          chặn thói quen gọi vu vơ cho chắc, và khi cần soát lại thì biết ai đã hỏi gì.
        </p>
        <p>
          Hiện có <b>mười ba công cụ</b>. Ba công cụ đầu mọi trợ lý trong hệ đều phải có, dùng để bắt
          tay và tra mã: <M>nang_luc</M> liệt kê công cụ đang mở, <M>suc_khoe</M> cho biết trợ lý còn
          sống không, <M>tim_theo_ma</M> tra một mã công việc. Mười công cụ còn lại là phần nghiệp vụ
          riêng của tiến độ, chẳng hạn <M>tiendo.tom_tat_du_an</M> trả về phần trăm tổng thể cùng ngày
          về đích dự báo, <M>tiendo.duong_gang</M> trả về chuỗi công việc quyết định ngày kết thúc,{" "}
          <M>tiendo.du_bao</M> và <M>tiendo.nang_suat</M> trả về số liệu tốc độ.
        </p>

        <h3 className="mt-4 text-[13.5px] font-bold text-text">Trả lời luôn theo một khuôn</h3>
        <p>
          Mọi câu trả lời đều có trường <M>ok</M> cho biết thành công hay không, và điều đáng chú ý là{" "}
          <b>trả lời thành công bắt buộc phải kèm nguồn</b>: file gốc nào, ô nào, trích lúc nào, đã
          được người duyệt chưa. Trợ lý nào không dẫn được nguồn thì không được phép trả lời, mà phải
          trả về mã <M>KHONG_CO_DU_LIEU</M>. Đây chính là chỗ nguyên tắc &quot;mọi con số truy vết được
          về file gốc&quot; được ép ở tầng kỹ thuật, chứ không phải viết trong tài liệu rồi ai nhớ thì
          làm.
        </p>
        <p>
          Khi hỏng, sáu mã lỗi dưới đây nói cho bên gọi biết nên làm gì tiếp — đừng tự nghĩ cách xử lý
          riêng:
        </p>
        <Bang
          cot={["Mã trả về", "Nghĩa là gì", "Bên hỏi nên làm gì"]}
          hang={[
            [
              <M key="a">KHONG_CO_DU_LIEU</M>,
              "Không có số, và đây không phải lỗi",
              "Hiện chữ “chưa có dữ liệu” rồi đi tiếp",
            ],
            [<M key="b">KHONG_HIEU_YEU_CAU</M>, "Sai tham số", "Ghi nhật ký, đừng thử lại"],
            [<M key="c">KHONG_CO_QUYEN</M>, "Không được phép hỏi", "Ghi nhật ký, đừng thử lại"],
            [<M key="d">HET_HAN_CHO</M>, "Quá thời gian chờ", "Thử lại đúng một lần rồi bỏ"],
            [<M key="e">AGENT_KHONG_SAN_SANG</M>, "Bên kia đang chết", "Ngừng gọi, chờ nó sống lại"],
            [<M key="f">LOI_NOI_BO</M>, "Lỗi bên trong", "Ghi nhật ký, thử lại một lần"],
          ]}
        />
        <Nhan>
          Cửa này <b>không bao giờ ném lỗi ra ngoài</b> — kể cả khi hỏng, nó vẫn trả về đúng khuôn trên
          với mã trạng thái HTTP 200. Nghĩa là bên gọi không phải bọc từng lời gọi trong khối bắt lỗi.
        </Nhan>

        <h3 className="mt-4 text-[13.5px] font-bold text-text">Đừng để một trợ lý chết kéo cả hệ theo</h3>
        <p>
          Mọi lời gọi đều có hạn chờ: mười giây cho truy vấn thường, sáu mươi giây cho những phép nặng
          như tính lại đường găng hay chạy dự báo, ba giây cho câu hỏi thăm dò xem còn sống không.
          Không có lời gọi nào được phép chờ vô hạn. Ngoài ra, nếu ba lần liên tiếp gọi sang một trợ lý
          mà đều hỏng, hãy ngừng gọi nó trong mười phút và trả ngay{" "}
          <M>AGENT_KHONG_SAN_SANG</M> thay vì cứ thử. Thiếu quy tắc này thì một trợ lý chết sẽ làm mọi
          trợ lý khác treo theo, vì ai cũng ngồi chờ hết hạn.
        </p>
        <p>
          Kèm theo đó là một nguyên tắc về giao diện: <b>màn hình không bao giờ đứng chờ trợ lý khác để
          hiện ra</b>. Phần dữ liệu của mình hiện trước, phần đi hỏi nơi khác thì hiện sau, hoặc hiện
          rằng chưa lấy được.
        </p>

        <h3 className="mt-4 text-[13.5px] font-bold text-text">Hai thứ dùng chung, đừng dựng bản riêng</h3>
        <p>
          Thứ nhất là <b>hệ mã công việc</b>. Trợ lý tiến độ sở hữu hai hệ mã: hệ mã tiến độ thi công
          và hệ mã theo dõi hồ sơ thiết kế. Mã thuộc hệ của trợ lý khác thì hỏi trợ lý đó, đừng chép
          sang dựng bảng riêng — vì bảng chép tay chắc chắn sẽ lệch sau vài tháng.
        </p>
        <p>
          Thứ hai là <b>sổ vấn đề tồn đọng</b>. Cả năm trợ lý ghi chung một sổ. Một vấn đề chỉ tồn tại
          đúng một chỗ; trợ lý nào cần nhắc tới thì trỏ sang, không tạo bản sao của riêng mình.
        </p>

        <p className="mt-4 text-[12.5px] text-text-muted">
          Trang này chỉ là cửa vào. Đặc tả đầy đủ nằm ở bộ tài liệu chốt:{" "}
          <M>PLAN-TONG-THE</M> cho bức tranh chung, <M>PLAN-AGENT-TIEN-DO</M> cho nghiệp vụ tiến độ,{" "}
          <M>HOP-DONG-KET-NOI</M> cho cách các trợ lý hỏi nhau, và <M>CAU-TRUC-KHO-DU-LIEU</M> cho quy
          tắc hồ sơ và cửa kiểm đầu vào.
        </p>
      </>
    ),
  },
];

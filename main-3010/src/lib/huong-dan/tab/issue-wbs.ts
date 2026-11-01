// Hướng dẫn bản 2 (tab) — Issue, chế độ «Xếp theo: WBS». Viết 20/10/2026.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cảnh báo — theo WBS",
  ai: "Mọi tài khoản xem được; nút trên thẻ theo quyền như chế độ Chủ đề.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Chế độ này là gì, vì sao cần?",
          doan: ["WBS là cây phân rã công việc của dự án (mỗi hạng mục một mã). Chế độ này gom theo mã: mỗi mã WBS một khối, trong khối issue của từng agent đứng cạnh nhau có nhãn agent. Dùng khi anh/chị muốn hỏi «hạng mục này, các bên đang báo gì?» thay vì «chủ đề này có gì?». Main không gộp issue: mỗi agent giữ issue theo tiêu chí riêng."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Chế độ này", "Bước sau"],
            ["Issue được gom về Main", "Xem theo từng hạng mục WBS", "Xử ở agent chủ; giao việc từ Việc của tôi"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Bấm «WBS» ở «Xếp theo», đọc từng khối, ẩn / xoá issue của Main", "Xếp theo mã WBS, đặt tên hạng mục theo cây WBS của dự án", "Màn này không dùng AI để xếp; thẻ có chữ 🤖 là do AI sinh từ trước"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Màn này không dùng AI. Hàng tab chủ đề bị ẩn trong chế độ WBS."],
        },
      ],
    },
    {
      ten: "① Đọc theo WBS",
      khoi: [
        {
          bam: ["Ở «Xếp theo» bấm «WBS».", "Mỗi khối là một mã WBS kèm tên hạng mục; đọc issue của từng agent trong khối.", "Muốn quay lại tám nhóm thì bấm «Chủ đề»."],
        },
        {
          viDu: ["Hạng mục 6.1 Hợp đồng cung cấp turbine: khối có thể có issue của Agent Tiến độ (việc găng chậm) cạnh issue của Agent Hợp đồng (phiếu giá chờ) — hai bên nói về cùng một hạng mục nhưng không gộp thành một."],
        },
        {
          luuY: ["Nếu tên hạng mục không hiện (ghi lỗi tên WBS) thì chỉ thấy mã; số vẫn đúng."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy hàng tab nhóm", "Đang ở chế độ WBS — bấm «Chủ đề»."],
            ["Issue không có mã WBS", "Chỉ hiện ở chế độ Chủ đề."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt A10a (Mr. Đại 25/09/2026): xếp theo WBS, không gộp issue.",
};

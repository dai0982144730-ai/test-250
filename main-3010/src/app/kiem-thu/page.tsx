// ============================================================
// /kiem-thu — MÀN CỦA AGENT KHÁC, ĐÃ CHẶN
//
// Trước 07/09/2026 đường dẫn này render "Cổng bước 0 — so engine CPM với MS
// Project": chạy engine CPM trên file tests/fixtures/tien-do-baseline-331.xlsx
// rồi bày bảng lệch ngày. Đó là bàn kiểm của ENGINE TIẾN ĐỘ, không phải việc
// của Main — Main không có engine CPM, không có baseline, không có WBS.
//
// Không màn nào trỏ vào đây (không có trong menu trái, không có link nào
// trong src) nên xoá hẳn cũng không gãy gì. Vẫn giữ một trang CHẶN thay vì
// để 404, vì 404 không phân biệt được "hỏng" với "cố ý không có" — mà bài
// G-02 của bộ test người dùng khẳng định Main THIẾU MÀN LÀ ĐÚNG THIẾT KẾ.
// Ai gõ tay hoặc mở lại dấu trang cũ thì đọc được ngay câu trả lời và đường
// sang đúng chỗ.
//
// Bài canh: tests/unit/man-cua-main.test.ts
// ============================================================

import Link from "next/link";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { TRANG_CHU_MAIN } from "@/lib/nhan-dien-agent";

export const metadata = { title: "Màn của agent khác — Main Agent" };

export default function ManDaChanPage() {
  return (
    <>
      <Header title="Màn này không thuộc Main" />
      <div className="p-5">
        <div className="max-w-[680px] rounded border border-yellow/40 bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0 text-yellow" />
            <h2 className="text-[15px] font-bold text-text">
              Main không có màn này
            </h2>
          </div>

          <p className="text-[12.5px] leading-relaxed text-text-secondary">
            Đường dẫn <code className="font-mono text-[11.5px] text-text">/kiem-thu</code> từng
            là bàn so engine CPM với MS Project — việc của{" "}
            <b className="text-text">Agent Tiến độ</b>. Main Agent{" "}
            <b className="text-text">không giữ dữ liệu nghiệp vụ</b>: không cây WBS, không
            baseline, không đường găng, không phiếu giá, không kho văn bản. Cần số thì nó{" "}
            <b className="text-text">đi hỏi</b> bốn con kia rồi tổng hợp.
          </p>

          <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">
            Thiếu màn ở đây là <b className="text-text">đúng thiết kế</b>, không phải lỗi.
          </p>

          <div className="mt-4 rounded-sm border border-border bg-bg2 px-3.5 py-3">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
              Số tiến độ hỏi ở đâu
            </div>
            <div className="mt-1.5 text-[12.5px] text-text-secondary">
              Agent Tiến độ —{" "}
              <a
                href="http://127.0.0.1:3003"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:text-accent-hover"
              >
                http://127.0.0.1:3003
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="mt-1 text-[11px] text-text-muted">
              Trong Main, cửa duy nhất lấy số là{" "}
              <code className="font-mono">hoiAgent(&quot;tiendo&quot;, …)</code> —{" "}
              <code className="font-mono">src/lib/nguon/hoi-agent.ts</code>.
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={TRANG_CHU_MAIN}
              className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition hover:border-accent"
            >
              Về Bảng điều hành
            </Link>
            <Link
              href="/chat"
              className="rounded-sm border border-border px-3 py-1.5 text-[12px] font-bold text-text-secondary transition hover:border-accent hover:text-accent"
            >
              Hỏi trợ lý Main
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

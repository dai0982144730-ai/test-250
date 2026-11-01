"use client";

// ============================================================
// HÌNH MINH HỌA TRONG BÀI HƯỚNG DẪN — vẽ bằng HTML/CSS (không phụ thuộc tệp ảnh), dùng trong khuôn tab của «? Hướng dẫn»
// (lib/huong-dan/kieu.ts → KhoiHD.hinh). Chữ trong hình chép ĐÚNG chữ máy hiện thật; mã 123456 chỉ là ví dụ.
// Hiện có: bài «Nối Telegram» (menu tên người · hộp mã · khung chat Telegram).
// ============================================================
import type { ReactNode } from "react";

export type KieuHinh = "menu-ten-nguoi" | "hop-ma" | "chat-link" | "chat-lenh" | "chat-xong" | "chat-loi";

function Bong({ ben, children, gio }: { ben: "phai" | "trai"; children: ReactNode; gio: string }) {
  return (
    <div className={`flex ${ben === "phai" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-[12px] leading-snug ${ben === "phai" ? "bg-[#2b5278] text-white" : "bg-[#182533] text-[#e4e8ee]"}`}>
        {children}
        <div className="mt-0.5 text-right text-[9.5px] opacity-60">{gio}</div>
      </div>
    </div>
  );
}

function KhungChat({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-[300px] space-y-1.5 rounded-lg bg-[#0e1621] p-2">
      <div className="border-b border-white/10 pb-1 text-[12px] font-bold text-white">
        SCI_Main_agent_bot <span className="font-normal text-white/50">bot</span>
      </div>
      {children}
    </div>
  );
}

const LENH = "text-[#6ab3f3]";

function Than({ kieu }: { kieu: KieuHinh }) {
  if (kieu === "menu-ten-nguoi")
    return (
      <div className="mx-auto w-[230px] rounded border border-border bg-surface text-[12px] text-text-secondary shadow-card">
        <div className="border-b border-border-light px-2.5 py-1.5 font-bold text-text">Quản trị viên ▾</div>
        <div className="px-2.5 py-1">Cài đặt</div>
        <div className="px-2.5 py-1">Đổi mật khẩu</div>
        <div className="px-2.5 py-1 text-text-muted">Agent Công việc · Tiến độ · Hợp đồng …</div>
        <div className="mx-1 my-1 flex items-center gap-1 rounded-sm border-2 border-accent bg-accent-soft px-2 py-1 font-bold text-accent">
          <span className="flex-1">✈ Nối Telegram ← bấm vào đây</span>
          <span className="rounded-sm border border-accent/50 px-1.5 text-[10.5px]">? Hướng dẫn</span>
        </div>
      </div>
    );
  if (kieu === "hop-ma")
    return (
      <div className="mx-auto w-[270px] rounded border border-border bg-surface p-3 text-[12px] text-text-secondary shadow-card">
        <div className="mb-2 font-bold text-text">✈ Nối Telegram với trợ lý Main</div>
        <div className="rounded-sm border border-border bg-bg2 p-2">
          <div className="text-[10.5px] text-text-muted">Mã nối (hết hạn lúc 11:32)</div>
          <div className="font-mono text-[22px] font-extrabold tracking-[0.3em] text-accent">123456</div>
          <div className="mt-1">
            Trên điện thoại: <span className="font-semibold text-accent underline">bấm vào đây</span> rồi bấm <b>Bắt đầu</b>
          </div>
          <div>
            Hoặc nhắn cho @SCI_Main_agent_bot: <code className="text-text">/noi 123456</code>
          </div>
        </div>
      </div>
    );
  if (kieu === "chat-link")
    return (
      <KhungChat>
        <div className="rounded-lg bg-[#182533] px-2 py-3 text-center text-[12px] text-[#e4e8ee]">
          SCI_Main_agent_bot
          <div className="mx-auto mt-2 w-[110px] rounded bg-[#2b8fd9] py-1.5 text-[12px] font-bold text-white">BẮT ĐẦU</div>
        </div>
        <div className="text-center text-[10.5px] text-white/50">↑ mở bằng link «bấm vào đây» trên website thì chỉ cần bấm nút này</div>
      </KhungChat>
    );
  if (kieu === "chat-lenh")
    return (
      <KhungChat>
        <Bong ben="phai" gio="11:22 SA">
          <span className={LENH}>/noi</span> 123456
        </Bong>
        <div className="text-center text-[10.5px] text-white/50">↑ gõ /noi, cách một chữ, rồi mã 6 số trên website</div>
      </KhungChat>
    );
  if (kieu === "chat-xong")
    return (
      <KhungChat>
        <Bong ben="phai" gio="11:22 SA">
          <span className={LENH}>/start</span>
        </Bong>
        <Bong ben="trai" gio="11:22 SA">
          ✅ Đã nối chat này với Quản trị viên (<span className={LENH}>quantri@scigroup.vn</span>, Admin). Nhắn câu hỏi vào đây để hỏi Trợ lý Main.
        </Bong>
      </KhungChat>
    );
  return (
    <KhungChat>
      <Bong ben="phai" gio="11:22 SA">
        <span className={LENH}>/start</span>
      </Bong>
      <Bong ben="trai" gio="11:22 SA">
        Mã không đúng. Nhắn đúng dạng <span className={LENH}>/noi</span> 123456 — mã 6 số lấy trên website Main → ✈️ Nối Telegram.
      </Bong>
    </KhungChat>
  );
}

/** Hình minh họa có chú thích — nằm trong khối của bài hướng dẫn */
export function HinhMinhHoa({ kieu, chuThich }: { kieu: KieuHinh; chuThich: string }) {
  return (
    <figure className="mt-2">
      <div className="overflow-hidden rounded border border-border bg-bg2 p-3">
        <Than kieu={kieu} />
      </div>
      <figcaption className="mt-1 text-[11.5px] text-text-muted">Hình minh họa — {chuThich}</figcaption>
    </figure>
  );
}

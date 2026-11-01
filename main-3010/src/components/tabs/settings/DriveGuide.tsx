"use client";

// Modal "Hướng dẫn kết nối Google Drive" — 6 bước có liên kết bấm thẳng.
// Chuyển từ bộ 2D-3D (lệnh Mr. Đại 01/09: chỉ lấy phần hướng dẫn + 2 đường
// nạp khóa), chỉnh cho app QLDA: tên app SCI QLDA, redirect URI cổng 3003.

const BUOC: {
  ten: string;
  link: string;
  nhanLink: string;
  noiDung: React.ReactNode;
  ghiChu?: React.ReactNode;
}[] = [
  {
    ten: "Tạo dự án mới",
    link: "https://console.cloud.google.com/projectcreate",
    nhanLink: "Tạo dự án",
    noiDung: (
      <>
        → đặt <b>Project name</b> (ví dụ <code className="rounded bg-bg2 px-1">SCI-QLDA</code>) →{" "}
        <b>Create</b> → đợi vài giây rồi chọn dự án đó ở ô góc trên.
      </>
    ),
  },
  {
    ten: "Bật Google Drive API",
    link: "https://console.cloud.google.com/apis/library/drive.googleapis.com",
    nhanLink: "Bật Google Drive API",
    noiDung: (
      <>
        → nhấn nút <b>Enable</b>.
      </>
    ),
    ghiChu: "Phần mềm này chỉ dùng Drive, không cần Sheets hay Docs.",
  },
  {
    ten: "Khai báo màn hình đồng ý (Branding)",
    link: "https://console.cloud.google.com/auth/overview",
    nhanLink: "Google Auth Platform",
    noiDung: (
      <>
        → <b>Get started</b> → App name (<code className="rounded bg-bg2 px-1">SCI QLDA</code>) +{" "}
        <b>User support email</b> → <b>Next</b> → <b>Audience = External</b> → <b>Next</b> → nhập
        email liên hệ → <b>Next</b> → tick &quot;I agree…&quot; → <b>Continue</b> → <b>Create</b>.
      </>
    ),
    ghiChu:
      "Công ty dùng Google Workspace thì chọn Internal — khỏi phải thêm test user, và token không hết hạn sau 7 ngày.",
  },
  {
    ten: "Thêm Test user (bắt buộc nếu chọn External)",
    link: "https://console.cloud.google.com/auth/audience",
    nhanLink: "Thẻ Audience",
    noiDung: (
      <>
        → mục <b>Test users</b> → <b>+ Add users</b> → nhập chính email Google sẽ dùng để đăng nhập
        (ví dụ <code className="rounded bg-bg2 px-1">scigroup.sub.agents@gmail.com</code>) →{" "}
        <b>Save</b>.
      </>
    ),
    ghiChu: (
      <span className="text-red">
        Ứng dụng đang ở chế độ <b>Testing</b> — chỉ email nằm trong Test users mới đăng nhập được.
        Quên bước này sẽ gặp lỗi &quot;Access blocked&quot;.
      </span>
    ),
  },
  {
    ten: "Tạo OAuth Client (kiểu Web) + khai địa chỉ quay về",
    link: "https://console.cloud.google.com/auth/clients",
    nhanLink: "Thẻ Clients",
    noiDung: (
      <>
        → <b>+ Create client</b> → Application type: <b>Web application</b> → Name tùy ý → mục{" "}
        <b>Authorized redirect URIs</b> bấm <b>+ Add URI</b> và dán ĐÚNG chuỗi:{" "}
        <code className="rounded bg-bg2 px-1 text-accent">http://localhost:3003/api/drive/callback</code>{" "}
        → <b>Create</b>.
      </>
    ),
    ghiChu:
      "Dán sai chuỗi này thì lúc kết nối Google sẽ báo redirect_uri_mismatch. Xem app qua tunnel/domain khác thì thêm URI tương ứng của domain đó.",
  },
  {
    ten: "Tải credentials.json",
    link: "https://console.cloud.google.com/auth/clients",
    nhanLink: "Thẻ Clients",
    noiDung: (
      <>
        → ở client vừa tạo bấm nút <b>Download JSON</b> → kéo tệp đó vào ô nạp tệp ở màn Cài đặt
        này. <b>Giữ tệp kín như mật khẩu</b> — không gửi qua chat/email.
      </>
    ),
  },
];

export function DriveGuide({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[860px] flex-col rounded border border-border bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-light px-4 py-3">
          <span className="text-[14px] font-bold text-accent">📖 Hướng dẫn kết nối Google Drive</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-sm px-2 text-text-muted transition hover:text-text"
          >
            ✕
          </button>
        </div>
        <div className="scroll-thin flex-1 space-y-3 overflow-auto p-4 text-[12.5px] leading-relaxed text-text-secondary">
          <p>
            Phần mềm kết nối Drive qua <b className="text-text">OAuth</b> — bạn đăng nhập trên trang
            của chính Google, phần mềm <b className="text-text">không bao giờ thấy mật khẩu</b>. Chỉ
            cần tạo khóa <code className="rounded bg-bg2 px-1">credentials.json</code> MỘT LẦN theo 6
            bước dưới, nạp vào đây, rồi từ đó về sau chỉ bấm <b className="text-text">Kết nối</b> →
            chọn tài khoản → <b className="text-text">Cho phép</b>.
          </p>
          <div className="rounded-sm border border-yellow/30 bg-yellow-soft px-3 py-2 text-yellow">
            Mỗi bước đều có <b>liên kết bấm thẳng</b> vào đúng trang Google. Sau khi bấm, nhớ chọn{" "}
            <b>đúng dự án</b> ở ô góc trên nếu Google hỏi.
          </div>
          <div className="rounded-sm border border-blue/30 bg-blue-soft px-3 py-2 text-blue">
            Google đã đổi &quot;OAuth consent screen&quot; cũ thành <b>&quot;Google Auth Platform&quot;</b> (các thẻ
            Overview · Branding · Audience · Clients · Data Access). Hướng dẫn dưới theo giao diện
            mới nhất.
          </div>
          <ol className="space-y-4">
            {BUOC.map((b, i) => (
              <li key={b.ten} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/50 text-[11px] font-bold text-accent">
                  {i + 1}
                </span>
                <div>
                  <div className="font-bold text-accent">{b.ten}</div>
                  <div>
                    Bấm{" "}
                    <a
                      href={b.link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-accent underline underline-offset-2"
                    >
                      {b.nhanLink} ↗
                    </a>{" "}
                    {b.noiDung}
                  </div>
                  {b.ghiChu && <div className="mt-1 text-[11.5px] text-text-muted">{b.ghiChu}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex justify-end border-t border-border-light px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-accent/50 bg-accent-soft px-4 py-1.5 text-[12.5px] font-bold text-accent transition hover:border-accent"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

import { Header } from "@/components/layout/Header";
import TrangGopY from "@/components/gop-y/TrangGopY";

// GÓP Ý, PHẢN ÁNH (Mr. Đại chốt 03/10/2026) — giống trang /gop-y của agent Công việc 3004.
export const metadata = { title: "Góp ý — SCI" };

export default function GopYPage() {
  return (
    <>
      <Header title="Góp ý" />
      <TrangGopY />
    </>
  );
}

// TRANG KỸ NĂNG AI — "thêm việc mới cho AI" (kế hoạch v2). Lấy nguyên màn Skill của agent tiến độ.
// Ai đăng nhập cũng thêm được kỹ năng RIÊNG; kho CHUNG cần quyền ky_nang.them_chung; người có
// quyền cau_hinh.sua thấy thêm thẻ Kết nối AI.
import Link from "next/link";
import { redirect } from "next/navigation";
import { coQuyen } from "@sci/identity";
import { layNguoiDung } from "@/lib/phien";
import { TieuDeTrang } from "@/components/layout/TieuDeTrang";
import { SkillView } from "@/components/ky-nang/SkillView";
import { KetNoiAI } from "@/components/ky-nang/KetNoiAI";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const metadata = { title: "Skill AI của tôi — SCI công việc" };
export const dynamic = "force-dynamic";

export default async function KyNangPage() {
  const nd = await layNguoiDung();
  if (!nd) redirect("/login");
  const quanTriAi = coQuyen(nd, "cau_hinh.sua");
  const capKhoa = coQuyen(nd, "agent.cap_khoa");
  return (
    <>
      <KhaiHuongDan ma="ky-nang" uuTien={1} />
      <TieuDeTrang
        tieuDe="Skill AI của tôi"
        moTa="Mỗi việc Trợ lý AI làm được là một skill. Skill chung: ai cũng dùng. Skill của tôi: chỉ mình bạn thấy — thêm, sửa, xoá tuỳ ý. Mở khung chat (nút ✨ góc dưới), gõ / rồi chọn tên skill để dùng."
        phai={
          capKhoa ? (
            <Link href="/quan-tri/khoa-agent" className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary hover:border-accent hover:text-accent">
              Khóa cho agent đọc sổ cái
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-4 p-5 text-text">
        <SkillView choPhepGhi duocSuaChung={coQuyen(nd, "ky_nang.them_chung")} />
        {quanTriAi && <KetNoiAI />}
      </div>
    </>
  );
}

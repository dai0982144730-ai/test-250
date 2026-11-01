"use client";
// CÂY HÀNH TRÌNH (như hình mẫu kế hoạch v2): người gửi mở tài liệu là thấy đã đi đâu, dừng ở đâu,
// bị trả lại vì sao, file nào được kèm ở bước nào; tài liệu mới "liên quan đến" hiện đúng nhánh sinh ra nó.
import Link from "next/link";
import { CircleStop, CornerDownRight, Paperclip } from "lucide-react";
import type { NutHanhTrinh } from "@/lib/gui/dich-vu";
import { AnhDaiDien, NHAN_LOAI_BUOC, NHAN_TRANG_THAI, Nhan, ngayGio } from "./chung";

const MAU_LOAI: Record<string, string> = {
  gui: "border-border text-text-secondary",
  chuyen_tiep: "border-blue text-blue",
  chuyen_tiep_kem: "border-blue text-blue",
  tra_lai: "border-red text-red",
  gui_lai: "border-accent text-accent",
  gui_moi: "border-accent text-accent",
};

function Nut({ n, cuaToi, taiLieuId }: { n: NutHanhTrinh; cuaToi: Set<string>; taiLieuId: string }) {
  if (n.loai === "hoan_thanh") {
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-blue">
        <CircleStop size={14} /> Dừng tại đây · hoàn thành bởi {n.tu_nguoi_ten} · {ngayGio(n.luc)}
      </div>
    );
  }
  const tt = NHAN_TRANG_THAI[n.trang_thai] ?? { nhan: n.trang_thai, mau: "" };
  const nhanLoai = n.loai === "gui_lai" ? `Gửi lại bản ${n.phien_ban}` : n.loai === "gui" && n.phien_ban > 1 ? `Gửi bản ${n.phien_ban}` : NHAN_LOAI_BUOC[n.loai];
  const cua = cuaToi.has(n.buoc_id);
  const laNguoi = !!n.den_nguoi;
  return (
    // Ô nút ôm theo nội dung (không kéo hết chiều ngang) để đường nhánh của cây dễ nhìn
    <div className={`inline-flex min-w-0 max-w-full items-start gap-2.5 rounded-sm border px-2.5 py-2 pr-4 ${cua ? "border-accent" : "border-border-light"}`}>
      <AnhDaiDien ten={n.den_ten ?? "?"} khoa={n.den_nguoi ?? n.den_don_vi ?? ""} laNguoi={laNguoi} />
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <b className="text-text">{n.den_ten ?? "—"}</b>
          {cua ? <span className="text-[11px] text-accent">· bạn</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Nhan mau={MAU_LOAI[n.loai]}>{nhanLoai}</Nhan>
          <Nhan mau={tt.mau} title={n.nhan_luc ? `nhận lúc ${ngayGio(n.nhan_luc, true)}` : undefined}>
            {tt.nhan}
            {n.nhan_luc ? ` lúc ${ngayGio(n.nhan_luc)}` : ""}
          </Nhan>
        </div>
        {n.ly_do ? <div className="mt-1 text-xs text-red">“{n.ly_do}”</div> : null}
        {n.tep_kem.length ? (
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-accent">
            {n.tep_kem.map((k) => (
              <Link key={k.tai_lieu_id} href={`/tai-lieu/${k.tai_lieu_id}`} className="inline-flex items-center gap-1 hover:underline">
                <Paperclip size={11} /> kèm {k.ten}
              </Link>
            ))}
          </div>
        ) : null}
        {n.lien_quan || n.tai_lieu_id !== taiLieuId ? (
          <div className="mt-1 text-xs text-text-secondary">
            <Link href={`/tai-lieu/${n.tai_lieu_id}`} className="text-accent hover:underline">
              {n.tai_lieu_ten}
            </Link>
            {n.lien_quan ? " · hành trình mới, liên quan tài liệu này" : ""}
          </div>
        ) : null}
        <div className="mt-0.5 text-[11px] text-text-muted">
          {ngayGio(n.luc)} · từ {n.tu_ten ?? "—"} ({n.tu_nguoi_ten})
          {n.nhan_boi_ten && n.trang_thai !== "cho_nhan" ? ` · xử lý: ${n.nhan_boi_ten}` : ""}
        </div>
      </div>
    </div>
  );
}

function Nhanh({ ds, cuaToi, taiLieuId }: { ds: NutHanhTrinh[]; cuaToi: Set<string>; taiLieuId: string }) {
  return (
    <ul className="ml-3 border-l border-border pl-4">
      {ds.map((n) => (
        <li key={n.buoc_id} className="relative pt-2 before:absolute before:-left-4 before:top-6 before:w-3.5 before:border-t before:border-border">
          <Nut n={n} cuaToi={cuaToi} taiLieuId={taiLieuId} />
          {n.con.length ? <Nhanh ds={n.con} cuaToi={cuaToi} taiLieuId={taiLieuId} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function CayHanhTrinh({ cay, taiLieuId, cuaToi = [] }: { cay: NutHanhTrinh[]; taiLieuId: string; cuaToi?: string[] }) {
  if (cay.length === 0) return <p className="text-sm text-text-muted">Tài liệu chưa được gửi đi đâu.</p>;
  const toi = new Set(cuaToi);
  // Mỗi hành trình một gốc: người gửi đầu tiên
  const nhom = new Map<string, NutHanhTrinh[]>();
  for (const n of cay) nhom.set(n.hanh_trinh_id ?? n.buoc_id, [...(nhom.get(n.hanh_trinh_id ?? n.buoc_id) ?? []), n]);
  return (
    <div className="scroll-thin overflow-x-auto">
      <div className="min-w-[440px] space-y-4">
        {Array.from(nhom.values()).map((ds) => {
          const g = ds[0];
          const nguoiNgoai = !g.tu_don_vi && g.nguoi_gui_that;
          return (
            <div key={g.buoc_id}>
              <div className="flex items-start gap-2.5">
                <AnhDaiDien ten={g.tu_ten ?? "?"} khoa={g.tu_don_vi ?? g.tu_ten ?? ""} laNguoi={!g.tu_don_vi} co={32} />
                <div className="text-sm">
                  <b className="text-text">{g.tu_ten}</b>
                  <span className="text-text-muted"> · {g.lien_quan ? "gửi tài liệu mới" : `gửi bản ${g.phien_ban}`}</span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Nhan>{nguoiNgoai ? "Người gửi ngoài công ty" : "Người gửi"}</Nhan>
                    <span className="text-xs text-text-secondary">{g.tai_lieu_ten}</span>
                  </div>
                  {nguoiNgoai ? (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                      <CornerDownRight size={11} /> văn thư {g.tu_nguoi_ten} vào sổ văn bản đến thay nơi gửi
                    </div>
                  ) : null}
                </div>
              </div>
              <Nhanh ds={ds} cuaToi={toi} taiLieuId={taiLieuId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";
// Khung "Danh mục dự án từ Main" ở đầu Cài đặt › Sơ đồ tổ chức dự án (LOI-DUNG-CHUNG 6g.6, Đợt 1 — Mr. Đại chốt 03/10/2026).
// Main là gốc mã ngắn · tên · nhóm · tên gọi khác; máy tự kéo 30 phút một lần. Khung này cho thấy lượt kéo gần nhất và nút ↻ kéo ngay.
// Nút ↻ chỉ hiện cho người sửa được nhóm này (luật 3004: không có quyền thì ẨN).
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { HopLoi, Nut, goiApi, ngayGio } from "@/components/layout/giao-dien";

interface VetKeo {
  luc: string;
  ok: boolean;
  so_main: number;
  so_ghi: number;
  co_thay_doi: boolean;
  moi: string[];
  chi_tai_cho: string[];
  thieu_ban: string[];
  co_cay: string[];
  chua_biet_cay?: string[];
  loi: string | null;
}

export function KhungKeoMain({
  ds,
  tat,
  daDoi,
  bao,
  taiLai,
}: {
  ds: CauHinh["du_an"];
  tat: boolean;
  daDoi: boolean;
  bao: (chu: string, tot?: boolean) => void;
  taiLai: () => Promise<void>;
}) {
  const [vet, setVet] = useState<VetKeo | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const [linkMain, setLinkMain] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      setVet((await goiApi<{ vet: VetKeo | null }>("/api/cai-dat/keo-du-an-main")).vet);
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không đọc được lượt kéo gần nhất");
    }
  }, []);
  useEffect(() => {
    void tai();
    // Main chạy cổng 3010 trên cùng máy — mở Cài đặt › Dự án của Main
    setLinkMain(`${window.location.protocol}//${window.location.hostname}:3010/settings?tab=du-an`);
  }, [tai]);

  async function keo() {
    setDang(true);
    try {
      const v = (await goiApi<{ vet: VetKeo }>("/api/cai-dat/keo-du-an-main", { body: {} })).vet;
      setVet(v);
      if (!v.ok) bao(`Chưa kéo được: ${v.loi ?? "lỗi không rõ"}`, false);
      else bao(v.co_thay_doi ? `Đã kéo ${v.so_main} dự án từ Main — danh mục có thay đổi, đã lưu` : `Đã kéo ${v.so_main} dự án từ Main — không có gì thay đổi`);
      if (v.co_thay_doi) await taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không kéo được", false);
    } finally {
      setDang(false);
    }
  }

  // Luật 30: không chỉ viết mã — kèm tên dự án
  const tenMa = (ma: string) => {
    const d = ds.find((x) => x.id === ma);
    return d ? `${ma} ${d.ten}` : ma;
  };

  return (
    // 03/10 Mr. Đại: khối ánh xạ từ agent khác, chỉ đọc → nền thẫm theo tông agent (.khoi-tu-main, globals.css)
    <div className="khoi-tu-main mb-4 rounded border p-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] font-bold text-text">Danh mục dự án lấy từ Main</div>
        <div className="flex flex-wrap items-center gap-2">
          {linkMain && (
            <a href={linkMain} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-accent hover:underline" title="Tên, mã ngắn, nhóm, tên gọi khác, thêm/xoá dự án — sửa ở Cài đặt › Dự án của Main">
              Sửa ở Main <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!tat && (
            <Nut nho disabled={dang || daDoi} onClick={() => void keo()} title={daDoi ? "Đang có thay đổi chưa lưu — Lưu hoặc Bỏ thay đổi trước rồi mới kéo" : "Kéo ngay danh mục dự án từ Main và hỏi lại agent Tiến độ dự án nào có cây WBS"}>
              <RefreshCw className={`h-3.5 w-3.5 ${dang ? "animate-spin" : ""}`} /> {dang ? "Đang kéo…" : "Kéo lại từ Main"}
            </Nut>
          )}
        </div>
      </div>
      <HopLoi loi={loi} />
      {!vet && !loi && <p className="text-[11.5px] text-text-muted">Chưa có lượt kéo nào — máy tự kéo 20 giây sau khi bật, rồi 30 phút một lần.</p>}
      {vet && (
        <div className="space-y-0.5 text-[11.5px] text-text-secondary">
          <div>
            Lượt gần nhất {ngayGio(vet.luc)} ·{" "}
            {vet.ok ? (
              <>
                Main có {vet.so_main} dự án · {vet.co_cay.length} dự án có cây WBS bên agent Tiến độ{vet.co_thay_doi ? " · có thay đổi, đã lưu" : " · không có gì thay đổi"}
              </>
            ) : (
              <span className="text-red">chưa kéo được — {vet.loi}</span>
            )}
          </div>
          {vet.moi.length > 0 && <div>Dự án Main mới khai: {vet.moi.map(tenMa).join(" · ")}</div>}
          {(vet.chua_biet_cay?.length ?? 0) > 0 && (
            <div className="text-text">Chưa hỏi được agent Tiến độ (tắt hoặc chậm): {vet.chua_biet_cay!.map(tenMa).join(" · ")} — giữ nguyên &quot;Mã bên Tiến độ&quot; đang có, lượt sau hỏi lại</div>
          )}
          {vet.thieu_ban.length > 0 && <div className="text-text">Chưa chọn Ban QLDA: {vet.thieu_ban.map(tenMa).join(" · ")} — chọn ở ô &quot;Nằm dưới&quot; bên dưới</div>}
          {vet.chi_tai_cho.length > 0 && <div>Chỉ có ở đây, Main chưa khai (giữ nguyên, không xoá): {vet.chi_tai_cho.join(" · ")}</div>}
        </div>
      )}
    </div>
  );
}

"use client";
// ============================================================
// THẺ ISSUE GĂNG TRÊN CÂY VIỆC (Mr. Đại chốt 06/10/2026): bỏ tab "⭕ Găng chưa ai nhận" ở màn Issue — thẻ + khối "AI soạn sẵn" +
// Giao việc · Sửa · Bỏ qua hiện NGAY DƯỚI dòng "CHƯA AI ĐƯỢC GIAO" của Cây việc & đường găng. Dùng lại NGUYÊN thẻ và khối của màn
// Issue (TheIssue · KhoiViecIssue · KhungSuaGiao — luật 7), hook này chỉ nạp sổ issue cho đúng các nút đang chưa ai được giao.
// Sổ chưa có thẻ cho một nút (bộ sinh chưa chạy từ khi nút tới lúc giao) → chạy bộ sinh MỘT lần như màn Issue vẫn làm khi mở.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { laCuaAgentNay, type SoIssue, type TheCanhBao } from "@/lib/cay-viec/issue/model";
import type { CauHinhNguong } from "@/lib/cay-viec/issue/nguong";
import { useNhapViecIssue } from "./KhoiViecIssue";
import type { DuLieuIssue, GoiIssue } from "./chung";

type TraGet = { ok: true; du_an: DuLieuIssue["duAn"]; so: SoIssue; nguong: CauHinhNguong; quyen: DuLieuIssue["quyen"]; hom_nay: string };

/** Thẻ găng đang mở của agent này cho một mã WBS */
export const theGangCua = (so: SoIssue, wbs: string): TheCanhBao | undefined =>
  so.the.find((t) => t.nguon === "gang" && t.wbs === wbs && t.dieuKien !== "da-dong" && laCuaAgentNay(t));

export function useIssueGang(duAnId: string | null, wbsCan: string[], bat: boolean, khiDoi: () => void) {
  const [du, setDu] = useState<DuLieuIssue | null>(null);
  const [loi, setLoi] = useState("");
  const daChay = useRef(false);
  const khoa = wbsCan.join(",");

  useEffect(() => {
    if (!bat || !duAnId || !khoa) return;
    let huy = false;
    (async () => {
      try {
        const j = await goiApi<TraGet>(`/api/cay-viec/issue?du_an=${encodeURIComponent(duAnId)}`);
        if (huy) return;
        let so = j.so;
        if (j.du_an.co_cay && !daChay.current && khoa.split(",").some((w) => !theGangCua(so, w))) {
          daChay.current = true;
          const r = await goiApi<{ so: SoIssue }>("/api/cay-viec/issue", { body: { du_an: j.du_an.id, hanhDong: "chay" } });
          so = r.so;
        }
        if (!huy) setDu({ duAn: j.du_an, so, nguong: j.nguong, quyen: j.quyen, homNay: j.hom_nay });
      } catch (e) {
        if (!huy) setLoi(e instanceof Error ? e.message : "Không đọc được sổ issue.");
      }
    })();
    return () => {
      huy = true;
    };
  }, [bat, duAnId, khoa]);

  // Giao xong / Bỏ qua xong → đọc lại cây (nút có việc hoặc đã bỏ qua thì dòng CHƯA AI ĐƯỢC GIAO tự mất)
  const goi: GoiIssue = useCallback(
    async (payload) => {
      if (!du) return null;
      const j = await goiApi<{ ok: boolean; thong_diep?: string; so?: SoIssue; id?: string; ma_viec?: string; trung?: string }>("/api/cay-viec/issue", {
        body: { du_an: du.duAn.id, ...payload },
      });
      setDu((x) => (x && j.so ? { ...x, so: j.so } : x));
      if (j.ok && (payload.hanhDong === "giao-viec" || payload.hanhDong === "khong-can-giao")) khiDoi();
      return j;
    },
    [du, khiDoi],
  );

  const dsThe = useMemo(() => (du ? (khoa ? khoa.split(",") : []).map((w) => theGangCua(du.so, w)).filter((t): t is TheCanhBao => !!t) : []), [du, khoa]);
  const nh = useNhapViecIssue(du, dsThe);
  const theCua = useCallback((wbs: string) => (du ? theGangCua(du.so, wbs) : undefined), [du]);
  return { du, loi, goi, nh, theCua };
}

export type IssueGang = ReturnType<typeof useIssueGang>;

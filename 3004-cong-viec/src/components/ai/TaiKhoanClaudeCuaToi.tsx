"use client";
// TÀI KHOẢN CLAUDE CÁ NHÂN (Quản lý token AI, Mr. Đại duyệt 04/10/2026) — mỗi người tự nối tài khoản Claude của mình làm DỰ PHÒNG:
// khi cả hai tài khoản công ty hết hạn mức, câu hỏi của CHÍNH người đó chạy bằng tài khoản này. API: /api/ai/tai-khoan-ca-nhan.
// 04/10 trưa (Mr. Đại: "bản chất đây là cùng 1 việc thì không trình bầy 1 vấn đề theo 2 cách khác nhau"): dùng ĐÚNG thẻ của
// Tài khoản 1 / 2 ở Cài đặt → AI (TheTaiKhoanClaude) — cùng hộp trạng thái, cùng nút, cùng cách đăng nhập link + dán mã.
import { useCallback, useEffect, useState } from "react";
import { goiApi, useThongBaoNhanh } from "@/components/layout/giao-dien";
import { TheTaiKhoanClaude, type KetQuaThe } from "@/components/ai/TheTaiKhoanClaude";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface TinhHinh {
  da_noi: boolean;
  dang_nhap: boolean;
  kieu: "ma" | "cua_so" | null;
  email?: string;
  goi?: string;
  duoi_ma?: string;
  het_den: string | null;
  mat_dang_nhap?: boolean;
  luot_7_ngay: number;
  token_7_ngay: number;
  cong_ty_con: boolean;
}

export function TaiKhoanClaudeCuaToi() {
  const [th, setTh] = useState<TinhHinh | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const { bao, khung } = useThongBaoNhanh();

  const tai = useCallback(async () => {
    try {
      setTh(await goiApi<TinhHinh & { ok: boolean }>("/api/ai/tai-khoan-ca-nhan"));
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không đọc được tình hình tài khoản.");
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);

  const dongPhu = th
    ? [
        th.cong_ty_con
          ? "Tài khoản Claude của công ty đang dùng được — trợ lý chưa cần tới tài khoản này."
          : th.dang_nhap
            ? "Tài khoản Claude của công ty đang hết hạn mức — câu hỏi của anh/chị đang chạy bằng tài khoản này."
            : "Tài khoản Claude của công ty đang hết hạn mức — đăng nhập tài khoản cá nhân để làm tiếp ngay.",
        ...(th.da_noi ? [`7 ngày qua đã dùng ${th.luot_7_ngay.toLocaleString("vi-VN")} lượt · ${th.token_7_ngay.toLocaleString("vi-VN")} token của tài khoản này.`] : []),
      ]
    : [];

  return (
    <div className="max-w-[760px] space-y-3">
      <KhaiHuongDan ma="tai-khoan-claude" uuTien={1} />
      {loi && <p className="text-[12px] text-red">{loi}</p>}
      <TheTaiKhoanClaude
        ten="Tài khoản Claude cá nhân"
        vai="dự phòng"
        dangDung={!!th && th.dang_nhap && !th.cong_ty_con && !th.het_den && !th.mat_dang_nhap}
        moTa="Chỉ dùng khi CẢ HAI tài khoản Claude của công ty hết hạn mức, và chỉ cho câu hỏi của chính anh/chị. Việc máy tự chạy (ban đêm, chạy nền) không bao giờ dùng tài khoản này. Cần tài khoản Claude trả phí (gói Pro hoặc Max)."
        tt={th ? { dang_nhap: th.dang_nhap, email: th.email, goi: th.goi, kieu: th.kieu, duoi_ma: th.duoi_ma, het_den: th.het_den, mat_dang_nhap: th.mat_dang_nhap } : null}
        dongPhu={dongPhu}
        sua
        cuaToi
        goi={(body) => goiApi<KetQuaThe>("/api/ai/tai-khoan-ca-nhan", { body })}
        sauKhiDoi={tai}
        bao={bao}
      />
      {khung}
    </div>
  );
}

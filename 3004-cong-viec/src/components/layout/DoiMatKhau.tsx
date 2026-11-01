"use client";
// Hộp thoại người dùng tự đổi mật khẩu → POST /api/auth/doi-mat-khau
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { HopLoi, HopThoai, LOP_O_NHAP, Nut, Truong, goiApi } from "./giao-dien";

export function DoiMatKhau({ dong, xong }: { dong: () => void; xong: (chu: string) => void }) {
  const [cu, setCu] = useState("");
  const [moi, setMoi] = useState("");
  const [lai, setLai] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);

  async function luu() {
    if (moi !== lai) return setLoi("Hai lần nhập mật khẩu mới không khớp");
    setDang(true);
    setLoi(null);
    try {
      await goiApi("/api/auth/doi-mat-khau", { body: { mat_khau_cu: cu, mat_khau_moi: moi } });
      xong("Đã đổi mật khẩu");
      dong();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Đổi mật khẩu thất bại");
    } finally {
      setDang(false);
    }
  }

  return (
    <HopThoai
      tieuDe={
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" /> Đổi mật khẩu
        </span>
      }
      dong={dong}
      rong="max-w-[360px]"
      chan={
        <>
          <Nut onClick={dong}>Hủy</Nut>
          <Nut kieu="chinh" disabled={dang || !cu || !moi || !lai} onClick={() => void luu()}>
            {dang ? "Đang lưu…" : "Đổi mật khẩu"}
          </Nut>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void luu();
        }}
      >
        <Truong nhan="Mật khẩu hiện tại">
          <input type="password" autoFocus autoComplete="current-password" className={LOP_O_NHAP} value={cu} onChange={(e) => setCu(e.target.value)} />
        </Truong>
        <Truong nhan="Mật khẩu mới">
          <input type="password" autoComplete="new-password" className={LOP_O_NHAP} value={moi} onChange={(e) => setMoi(e.target.value)} />
        </Truong>
        <Truong nhan="Nhập lại mật khẩu mới">
          <input type="password" autoComplete="new-password" className={LOP_O_NHAP} value={lai} onChange={(e) => setLai(e.target.value)} />
        </Truong>
        <HopLoi loi={loi} />
        <button type="submit" className="hidden" />
      </form>
    </HopThoai>
  );
}

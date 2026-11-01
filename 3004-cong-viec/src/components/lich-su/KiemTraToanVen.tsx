"use client";
// Nút "Kiểm tra toàn vẹn": băm lại toàn bộ chuỗi lịch sử, báo nguyên vẹn hay gãy ở dòng nào.
import { useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { goiApi, ngayGio } from "@/components/thu-muc/tien-ich";

interface KetQua {
  nguyen_ven: boolean;
  dong_gay: number | null;
  tong_so: number;
  mat_ms: number;
  luc: string;
}

export function KiemTraToanVen({ nho }: { nho?: boolean }) {
  const [dang, setDang] = useState(false);
  const [kq, setKq] = useState<KetQua | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const chay = async () => {
    setDang(true);
    setLoi(null);
    try {
      setKq(await goiApi<KetQua>("/api/lich-su/kiem-tra"));
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDang(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={chay}
        disabled={dang}
        className={`inline-flex items-center gap-1.5 rounded-sm border border-border text-text-secondary hover:text-text disabled:opacity-60 ${
          nho ? "px-2 py-0.5 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]"
        }`}
      >
        {dang ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        Kiểm tra toàn vẹn
      </button>
      {kq && kq.nguyen_ven && (
        <span className="inline-flex items-center gap-1 text-[12px] text-green">
          <ShieldCheck size={13} /> Nguyên vẹn: {kq.tong_so.toLocaleString("vi-VN")} dòng, chuỗi băm khớp ({ngayGio(kq.luc)})
        </span>
      )}
      {kq && !kq.nguyen_ven && (
        <span className="inline-flex items-center gap-1 text-[12px] text-red">
          <ShieldAlert size={13} /> Chuỗi băm gãy tại dòng #{kq.dong_gay}: lịch sử từ dòng này có dấu hiệu bị sửa
        </span>
      )}
      {loi && <span className="text-[12px] text-red">{loi}</span>}
    </div>
  );
}

"use client";
// Màn "Thư mục & gửi": cây thư mục · file trong thư mục · Nạp file & gửi báo cáo.
// Khi đang kiểm tra một file, khung Nạp file tự mở rộng chiếm chỗ danh sách thư mục (nút "Thu gọn" để quay lại).
import { useState } from "react";
import { TrinhDuyetThuMuc } from "./TrinhDuyetThuMuc";
import { KhungSoanGui } from "@/components/gui/KhungSoanGui";

export function ManThuMucGui() {
  const [moRong, setMoRong] = useState(false);
  return <TrinhDuyetThuMuc moRongPhai={moRong} phai={<KhungSoanGui moRong={moRong} onMoRong={setMoRong} />} />;
}

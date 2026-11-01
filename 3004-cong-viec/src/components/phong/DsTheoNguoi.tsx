"use client";
// Danh sách việc của một nhóm, gom theo NGƯỜI chủ trì (Mr. Đại chốt 29/10/2026): tên người đậm, xếp A–Z theo tên riêng,
// việc giao cả đơn vị («việc chung») cuối cùng. Dùng chung Sơ đồ tổ chức · Dự án · Việc của tôi.
import { gomTheoNguoi, type ViecO } from "./viec";

export function DsTheoNguoi({ ds, ve, tenChung = "Việc chung — chưa giao cá nhân" }: { ds: ViecO[]; ve: (v: ViecO) => React.ReactNode; tenChung?: string }) {
  const nhom = gomTheoNguoi(ds);
  // Cả nhóm chỉ có việc chung (không ai được giao riêng) thì khỏi thêm đầu mục thừa
  if (nhom.length === 1 && nhom[0].nguoi === null) return <>{ds.map(ve)}</>;
  return (
    <>
      {nhom.map((g) => (
        <div key={g.nguoi ?? "@chung"}>
          <div className={`nhom-nguoi ${g.nguoi ? "" : "chung"}`} data-gt="nhom-nguoi">
            <b>{g.nguoi ?? tenChung}</b>
            <span>{g.ds.length}</span>
          </div>
          {g.ds.map(ve)}
        </div>
      ))}
    </>
  );
}

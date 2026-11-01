// Ba mục Bảng điều hành trình bày lại theo 8 nguyên tắc (KE-HOACH/37, Mr. Đại duyệt 28/10/2026, đợt 1):
// «Tiền — hợp đồng BQL ký» · «Hồ sơ pháp lý đang thiếu» · «Đang tắc ở bàn ai».
// Số và câu chữ vẫn do cổng các agent trả (Main không tự tính); ở đây chỉ đổi cách bày.
// Không ghi mã hồ sơ / mã issue / mã hợp đồng (Mr. Đại chốt 28/10) — hàng đã thành việc có nút «Mở việc →».

import Link from "next/link";
import { Khung, NHAN_NHO, SoLon, ThanhQuaHan } from "@/components/tabs/bang-dieu-hanh/KhungBdh";
import { NutGiaoViecTaiCho } from "@/components/tabs/bang-dieu-hanh/NutGiaoViecTaiCho";
import { boMa, boTienToDuAn } from "@/lib/bao-cao-sang/khoi-telegram";
import { O_TIEN, type KhoiPhapLy, type KhoiTac, type KhoiTien } from "@/lib/bang-dieu-hanh/gom";

/** Tên việc / hồ sơ cho người đọc: bỏ «[tên dự án]» đầu câu, mã đứng trần và mã đặt trong ngoặc «(HV-09-01)» «(7.2.3)» */
const tenSach = (s: string): string =>
  boMa(boTienToDuAn(s))
    .replace(/\s*\(\s*(?:[A-Z]{1,4}-)?\d[0-9A-Z.\-]*\s*\)/g, "")
    .trim();

const LINK_TOAN_CANH = "http://localhost:3012/toan-canh";
const LINK_AGENT = "text-accent hover:text-accent-hover";

/** Dòng chữ một câu trong khung khi khối chưa có số / bị ẩn */
function CauMo({ children }: { children: React.ReactNode }) {
  return <div className="text-[12.5px] text-text-secondary">{children}</div>;
}

export function KhoiTienMoi({ tien }: { tien: KhoiTien }) {
  const nguon = (
    <>
      Nguồn: Agent hợp đồng (giá trị lũy kế, toàn cảnh hợp đồng) — số nguyên văn, «chưa có số» không phải 0.{" "}
      <a href={LINK_TOAN_CANH} target="_blank" rel="noreferrer" className={LINK_AGENT}>Mở Toàn cảnh ở Agent hợp đồng ↗</a>
    </>
  );
  if (tien.an) return <Khung tieuDe="Tiền — hợp đồng BQL ký"><CauMo>Ẩn — {tien.an}</CauMo></Khung>;
  if (tien.loi !== null) return <Khung tieuDe="Tiền — hợp đồng BQL ký" nguon={nguon}><CauMo>Chưa lấy được — {tien.loi}</CauMo></Khung>;

  const coSo = O_TIEN.filter((x) => tien.tong[x.khoa].so !== null);
  const chuaCo = O_TIEN.filter((x) => tien.tong[x.khoa].so === null);
  // Nguyên tắc 7: các ô chưa có số GOM MỘT dòng, mỗi lý do ghi một lần
  const lyDo = Array.from(new Set(chuaCo.map((x) => tien.tong[x.khoa].viSao).filter((v): v is string => !!v)));
  const am = coSo.filter((x) => (tien.tong[x.khoa].so ?? 0) < 0);

  return (
    <Khung tieuDe="Tiền — hợp đồng BQL ký" nguon={nguon}>
      {coSo.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {coSo.map((x) => (
            <SoLon key={x.khoa} so={(tien.tong[x.khoa].so as number).toLocaleString("vi-VN")} donVi={tien.tong[x.khoa].donVi} nhan={x.nhan} />
          ))}
        </div>
      )}
      {am.length > 0 && (
        <div className="mt-3 text-[12px] text-yellow">
          Số âm ở «{am.map((x) => x.nhan).join("», «")}»: nghiệm thu nhiều hơn khối lượng thi công đã ghi nhận — cần soát lại ở Agent hợp đồng, Main không sửa số.
        </div>
      )}
      {chuaCo.length > 0 && (
        <div className="mt-3 text-[12.5px] text-text-muted">
          Chưa có số {chuaCo.length} mục: {chuaCo.map((x) => x.nhan.toLowerCase()).join(" · ")}
          {lyDo.length > 0 ? ` — ${lyDo.join(" / ")}` : ""}
        </div>
      )}
      {tien.hopDong.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
            <thead>
              <tr className={`border-b border-border text-left ${NHAN_NHO}`}>
                <th className="py-1.5 pr-3 font-normal">Hợp đồng</th>
                <th className="py-1.5 font-normal">Nhà thầu</th>
              </tr>
            </thead>
            <tbody>
              {tien.hopDong.map((h) => (
                <tr key={h.ma} className="border-b border-border/50 align-top">
                  <td className="py-1.5 pr-3 text-text">{h.soHieu}</td>
                  <td className="py-1.5 text-text-secondary">
                    {h.nhaThau}
                    {h.loi ? <span className="text-text-muted"> — {h.loi}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tien.boQua.length > 0 && (
        <div className="mt-2 text-[12px] text-text-muted">Bỏ {tien.boQua.length} hợp đồng thầu phụ — Main chỉ bày nhà thầu ký với BQL (luật I07).</div>
      )}
    </Khung>
  );
}

const SO_HANG_TOI_DA = 5;

export function KhoiPhapLyMoi({
  phapLy,
  maDuAn,
  maIssueCua,
  soDaThanhIssue,
}: {
  phapLy: KhoiPhapLy;
  maDuAn: string;
  maIssueCua: (khoa: string) => string | null;
  soDaThanhIssue: number;
}) {
  const hien = phapLy.dong.slice(0, SO_HANG_TOI_DA);
  const nguon = (
    <>
      Nguồn: Agent pháp lý — hồ sơ còn thiếu. Cổng chưa trả trạng thái nộp hồ sơ nên chưa tách «chưa nộp được» với «đã nộp chờ kết quả» (đo 10/09), không đoán.{" "}
      <a href="http://localhost:3013" target="_blank" rel="noreferrer" className={LINK_AGENT}>Mở Agent pháp lý ↗</a>
    </>
  );
  return (
    <Khung tieuDe="Hồ sơ pháp lý đang thiếu" nguon={nguon}>
      <div className="grid grid-cols-3 gap-x-6 sm:max-w-xl">
        <SoLon so={phapLy.tongPhaiCo} nhan="Hồ sơ cần có" />
        <SoLon so={phapLy.soThieu} nhan="Đang thiếu" />
        <SoLon so={soDaThanhIssue} nhan="Đã thành việc" mo={soDaThanhIssue === 0} />
      </div>
      {hien.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
            <thead>
              <tr className={`border-b border-border text-left ${NHAN_NHO}`}>
                <th className="py-1.5 pr-3 font-normal">Hồ sơ</th>
                <th className="py-1.5 pr-3 font-normal">Cơ quan đang giữ</th>
                <th className="py-1.5 pr-3 font-normal">Quá hạn</th>
                <th className="py-1.5 text-right font-normal">Việc</th>
              </tr>
            </thead>
            <tbody>
              {hien.map((h) => {
                const daLaViec = maIssueCua(h.maHoSo) !== null;
                return (
                  <tr key={h.maHoSo} className="border-b border-border/50 align-middle">
                    <td className={`py-1.5 pr-3 ${daLaViec ? "text-text-muted" : "text-text"}`}>{tenSach(h.ten)}</td>
                    <td className="py-1.5 pr-3 text-text-secondary">{h.coQuan || "—"}</td>
                    <td className="py-1.5 pr-3"><ThanhQuaHan ngay={h.quaHanNgay} /></td>
                    <td className="py-1.5 text-right">
                      {daLaViec ? (
                        <Link href="/alerts" className={LINK_AGENT} title="Đã thành việc — nội dung và nút xử lý nằm ở màn Cảnh báo">Mở việc →</Link>
                      ) : (
                        <NutGiaoViecTaiCho
                          maDuAn={maDuAn}
                          ten={`Hoàn thiện hồ sơ ${h.ten}`}
                          moTa={`Hồ sơ "${h.ten}" (${h.maHoSo}) đang thiếu, cơ quan giữ: ${h.coQuan}.${
                            h.quaHanNgay !== null && h.quaHanNgay > 0 ? ` Đã quá hạn ${h.quaHanNgay.toLocaleString("vi-VN")} ngày.` : ""
                          } Nguồn: Agent pháp lý — phaply.ho_so_thieu.`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {phapLy.dong.length > SO_HANG_TOI_DA && (
        <div className="mt-2 text-[12px] text-text-muted">Còn {phapLy.dong.length - SO_HANG_TOI_DA} hồ sơ nữa — xem đủ ở Agent pháp lý.</div>
      )}
    </Khung>
  );
}

export function KhoiTacMoi({
  tac,
  maDuAn,
  maIssueCua,
}: {
  tac: KhoiTac;
  maDuAn: string;
  maIssueCua: (khoa: string) => string | null;
}) {
  const nguon = (
    <>
      Nguồn: sổ việc agent Công việc (việc quá hạn) · Agent hợp đồng (phiếu giá đang chờ).{" "}
      <a href="http://localhost:3004" target="_blank" rel="noreferrer" className={LINK_AGENT}>Mở Agent công việc ↗</a>
    </>
  );
  return (
    <Khung tieuDe="Đang tắc ở bàn ai" nguon={nguon}>
      <div className="grid grid-cols-3 gap-x-6 sm:max-w-xl">
        <SoLon so={tac.soQuaHan} nhan="Việc quá hạn" mo={tac.soQuaHan === 0} />
      </div>
      {tac.dong.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
            <thead>
              <tr className={`border-b border-border text-left ${NHAN_NHO}`}>
                <th className="py-1.5 pr-3 font-normal">Việc</th>
                <th className="py-1.5 pr-3 font-normal">Đang ở bàn</th>
                <th className="py-1.5 pr-3 font-normal">Quá hạn</th>
                <th className="py-1.5 text-right font-normal">Việc</th>
              </tr>
            </thead>
            <tbody>
              {tac.dong.map((v) => {
                const daLaViec = maIssueCua(v.ten) !== null;
                return (
                  <tr key={v.ten + v.quaHanNgay} className="border-b border-border/50 align-middle">
                    <td className={`py-1.5 pr-3 ${daLaViec ? "text-text-muted" : "text-text"}`}>{tenSach(v.ten)}</td>
                    <td className="py-1.5 pr-3 text-text-secondary">{v.nguoiPhuTrach}</td>
                    <td className="py-1.5 pr-3"><ThanhQuaHan ngay={v.quaHanNgay} /></td>
                    <td className="py-1.5 text-right">
                      {daLaViec ? (
                        <Link href="/alerts" className={LINK_AGENT} title="Đã thành việc — nội dung và nút xử lý nằm ở màn Cảnh báo">Mở việc →</Link>
                      ) : (
                        <NutGiaoViecTaiCho
                          maDuAn={maDuAn}
                          nhan="Nhắc"
                          ten={`Nhắc: ${v.ten}`}
                          moTa={`Việc "${v.ten}" đang ở ${v.nguoiPhuTrach}, quá hạn ${v.quaHanNgay.toLocaleString("vi-VN")} ngày. Nguồn: agent Công việc — base.viec_qua_han.`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 space-y-1 text-[12.5px] text-text-secondary">
        {tac.quyTrinh ? (
          <div><span className={NHAN_NHO}>Đề xuất, quy trình </span> {tac.quyTrinh}</div>
        ) : null}
        <div><span className={NHAN_NHO}>Phiếu giá </span> {tac.phieuGia}</div>
      </div>
    </Khung>
  );
}


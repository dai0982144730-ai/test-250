// ============================================================
// BẢNG ĐIỀU HÀNH — MÀN MẶC ĐỊNH CỦA MAIN (chốt AX, dựng 08/09 theo chốt BH)
// Demo nguồn: demo-agent-main.html màn "bdh" — 7 vòng hỏi Mr. Đại 04/09
//
// Bố cục demo: dàn NGANG dự án trên cùng (bấm PHÁT đổi luôn — không hộp xổ),
// dưới là các khối của dự án đang chọn. Màu: cả màn không màu, chỉ chỗ
// chậm/quá hạn mới đỏ (chốt AS "đã có màu sắc là có vấn đề").
//
// ⭐ Chống trùng màn Cảnh báo: màn này trả lời "ĐANG THẾ NÀO", màn Cảnh báo trả lời
//    "PHẢI XỬ GÌ" — ở đây không có nút xử lý issue, chỉ đường trỏ sang.
//
// ⛔ Main không tự tính số nào — mọi số hỏi qua cổng (lib/bang-dieu-hanh/gom).
//    Khối nào nguồn chưa mở công cụ thì hiện "chưa lấy được", KHÔNG ĐOÁN —
//    demo tự khai: chỉ cổng tiendo.* chạy thật, ba cổng kia chưa có dòng code.
// ============================================================

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { SectionCard } from "@/components/common/SectionCard";
import { gomBangDieuHanh, khoiTienAn } from "@/lib/bang-dieu-hanh/gom";
import { dungTuanKhac } from "@/lib/bang-dieu-hanh/tuan-khac";
import { boLocMatCuaToi } from "@/lib/agent-mat-tren-main";
import { cauAnMat } from "@/lib/agent-mat-loc";
import { SCurve } from "@/components/tabs/overview/SCurve";
import { TuanNayKhac } from "@/components/tabs/bang-dieu-hanh/TuanNayKhac";
import { KhoiPhapLyMoi, KhoiTacMoi, KhoiTienMoi } from "@/components/tabs/bang-dieu-hanh/CacKhoiBdh";
import { DongTomTatAI } from "@/components/tabs/bang-dieu-hanh/DongTomTatAI";
import { dongMay, dungKhungBonDong, NEO } from "@/lib/bang-dieu-hanh/tom-tat-bon-dong";
import { KhoiMauThuanCheo } from "@/components/tabs/bang-dieu-hanh/KhoiMauThuanCheo";
import { maNganDuAn } from "@/lib/projects";
import { chayTrangChuoi } from "@/lib/nhat-ky/so";
import { gioPhut } from "@/lib/nguon/bo-nho-hoi";
import { ngayVN } from "@/lib/ngay-hien";
import { fmtSo } from "@/lib/format"; // chuẩn số Việt Nam (chốt 130): «41,5%»
import { cauChamHaiHe, cauChamHe } from "@/lib/chung/luat-nhanh-cham";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const metadata = { title: "Bảng điều hành — Main Agent" };
export const dynamic = "force-dynamic";

/** Khối "nguồn chưa mở" — một khuôn dùng chung, nói thẳng và cho đường đi tiếp */
function KhoiChuaCo({
  ten,
  lyDo,
  moODau,
  diaChi,
}: {
  ten: string;
  lyDo: string;
  moODau: string;
  diaChi: string;
}) {
  return (
    <SectionCard title={ten}>
      <div className="space-y-2 py-2 text-[11.5px] leading-relaxed text-text-secondary">
        <div>
          <b className="text-text">Chưa lấy được dữ liệu</b> — {lyDo} Ô này sẽ tự có số khi
          cổng mở công cụ, không phải sửa màn.
        </div>
        <a
          href={diaChi}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-sm border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
        >
          {moODau} ↗
        </a>
      </div>
    </SectionCard>
  );
}

export default async function BangDieuHanhPage({
  searchParams,
}: {
  searchParams: { du_an?: string; lam_moi?: string };
}) {
  // ⭐ Khuôn sổ bản 2 (7.1): một lần mở Bảng điều hành = MỘT chuỗi — mọi lượt hỏi agent chung mã
  // ⭐ QS-074 (27/09): số nhớ tạm 10 phút; `?lam_moi=1` (nút ↻ Lấy số mới) hỏi lại thật
  const lamMoi = searchParams.lam_moi === "1";
  const bdhGoc = await chayTrangChuoi("/bang-dieu-hanh", () => gomBangDieuHanh(searchParams.du_an, lamMoi));
  // ⭐ 05/10 luật agent mật (Mr. Đại chốt): khối Tiền là hợp đồng — chỉ người được thấy hợp đồng dự án này mới thấy.
  // Lọc NGAY TẠI TRANG: dữ liệu trang máy chủ đi kèm xuống trình duyệt, không dựa vào việc ẩn ở giao diện.
  const locMat = await boLocMatCuaToi();
  const thayTien = locMat.thay("hopdong", bdhGoc.dangChon);
  const bdhTien = bdhGoc.tien && !thayTien ? { ...bdhGoc, tien: khoiTienAn(cauAnMat("hopdong")) } : bdhGoc;
  // ⭐ 12/10/2026 (Mr. Đại: «Main ẩn thẻ Pháp lý với người ngoài dự án, giống đang ẩn thẻ Hợp đồng»): khối ⑤ Hồ sơ pháp lý đang
  // thiếu là hồ sơ CỦA DỰ ÁN — người ngoài dự án chỉ thấy câu «ẩn». Bỏ luôn các khoá chống trùng mang mã hồ sơ.
  const bdh =
    bdhTien.phapLy && !locMat.thay("phaply", bdhGoc.dangChon)
      ? (() => {
          const maHoSo = new Set(bdhTien.phapLy.dong.map((h) => h.maHoSo));
          return {
            ...bdhTien,
            phapLy: { tongPhaiCo: 0, soThieu: 0, dong: [], loi: `Ẩn — ${cauAnMat("phaply")}` },
            daThanhIssue: bdhTien.daThanhIssue.filter((d) => !maHoSo.has(d.khoa)),
          };
        })()
      : bdhTien;
  const chon = bdh.duAn.find((d) => d.ma === bdh.dangChon) ?? null;
  // Nút Giao việc / Nhắc gửi sang agent Công việc theo mã ngắn dự án đang chọn (6g.7 mục 3)
  const maDuAnGiao = bdh.dangChon ? (maNganDuAn(bdh.dangChon) ?? "") : "";
  const ct = bdh.chiTiet;
  /** Khoá nào đã có issue nhận rồi — dùng cho khối ⑤ ⑥ (chống trùng) */
  const maIssueCua = (khoa: string): string | null =>
    bdh.daThanhIssue.find((d) => d.khoa === khoa)?.maIssue ?? null;
  const soDaThanhIssue = bdh.daThanhIssue.length;
  // «Tuần này khác tuần trước»: CODE dựng mô hình số từ S-Curve + nguồn lực + so tuần (lib/bang-dieu-hanh/tuan-khac.ts)
  const tuanKhac =
    bdh.soTuan && bdh.soTuan.loi === null && bdh.sCurve && bdh.sCurve.loi === null
      ? dungTuanKhac({
          tuanTruoc: bdh.soTuan.tuanTruoc,
          tuanNay: bdh.soTuan.tuanNay,
          thuocDo: bdh.soTuan.thuocDo,
          diem: bdh.sCurve.diem,
          nguonLuc: bdh.nguonLuc,
        })
      : null;

  return (
    <div className="min-h-screen bg-bg">
      <Header title="Bảng điều hành" />
      <KhaiHuongDan ma="bdh" />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        {/* ⭐ 13/09: dự án đang chọn ở thanh trên không có trong dàn ngang thì NÓI THẲNG.
            Trước đây màn lặng lẽ lấy dự án đầu dàn rồi bày số của nó — người đọc tưởng
            đó là số dự án mình chọn. */}
        {bdh.canhBaoLechDuAn !== "" ? (
          <div className="rounded border border-red/40 bg-red-soft p-3 text-[12.5px] text-text">
            ⛔ {bdh.canhBaoLechDuAn}
          </div>
        ) : null}

        {/* 07/10 (Mr. Đại): BỎ dàn ngang tên dự án — chọn dự án ở nút dự án trên thanh trên là đủ */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
          {chon ? (
            <span className="text-text-secondary">
              Dự án: <b className="text-text">{chon.ten}</b>
              {chon.so === null ? (
                <span className="text-text-muted" title={chon.loi ?? undefined}> · chưa lấy được</span>
              ) : (
                // Luật 35 + 36: số ngày, ghi rõ hệ, có cả hai hệ thì ghi cả hai. Đỏ chỉ khi chậm (dương) ở ít nhất một hệ.
                <b
                  className={
                    (chon.so.lechNgay ?? 0) > 0 || (chon.so.lechNgaySoBaseline ?? 0) > 0 ? "text-red" : "text-text-muted"
                  }
                >
                  {" "}
                  · {cauChamHaiHe(chon.so.lechNgay, chon.so.lechNgaySoBaseline)}
                </b>
              )}
            </span>
          ) : null}
          <span className="ml-auto text-[11.5px] text-text-muted">
            Thêm/bớt dự án:{" "}
            <Link href="/settings?tab=du-an" className="font-semibold text-accent hover:text-accent-hover">
              Cài đặt → 📁 Quản lý dự án
            </Link>
          </span>
        </div>

        {/* ⭐ QS-073/QS-074 (27/09): số có thể lấy từ bộ nhớ tạm 10 phút → nói tuổi số;
            bên kia chưa trả lời kịp mà còn bản cũ → nói rõ khối nào đang dùng số lúc nào */}
        <div className="space-y-0.5 text-[11.5px] text-text-muted">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span>
              {bdh.lucSo
                ? `Số lấy lúc ${gioPhut(bdh.lucSo)} — mở lại trong 10 phút dùng lại số này, không hỏi lại các agent.`
                : "Chưa có số nào từ các agent."}
            </span>
            {bdh.dangChon ? (
              <Link
                href={`/bang-dieu-hanh?du_an=${encodeURIComponent(bdh.dangChon)}&lam_moi=1`}
                data-lenh="bdh.lay-so-moi"
                className="font-semibold text-accent hover:text-accent-hover"
              >
                ↻ Lấy số mới
              </Link>
            ) : null}
          </div>
          {bdh.banCu.map((c) => (
            <div key={c} className="text-text-secondary">
              ⏳ {c}
            </div>
          ))}
        </div>

        {/* ===== ② CÂU TÌNH HÌNH — demo vẽ dòng có icon 🤖, viết kiểu BẮC CẦU
            giữa các ban. Mr. Đại chốt 10/09: làm đúng demo, để LLM viết.
            Câu số liệu code ghép vẫn hiện ngay để màn không phải chờ AI
            (luật 3), và là chỗ lui khi LLM tắt. ===== */}
        {chon && (
          <SectionCard title="">
            {chon.so === null ? (
              <div className="py-2 text-[12px] text-text-secondary">
                <b className="text-red">{chon.loi}</b> — số của dự án này chưa bày được, không
                đoán thay.
              </div>
            ) : (
              <div className="space-y-1.5 py-1">
                {/* 01/11/2026 (Mr. Đại «cách 1»): bốn dòng ngắn có nhãn thay câu dài; bỏ câu chữ xám dài của
                    tiendo.tom_tat_du_an (lặp số với dải trên + các khối dưới) — chỉ giữ ngày cắt dữ liệu. */}
                <DongTomTatAI duAn={bdh.dangChon} dongMay={dongMay(dungKhungBonDong(bdh))} />
                <div className="flex flex-wrap items-center gap-2 pl-7 text-[11.5px] text-text-muted">
                  {bdh.sCurve?.ngayCatDuLieu ? <span>Số đến {ngayVN(bdh.sCurve.ngayCatDuLieu)}</span> : null}
                  <Link
                    href="/alerts"
                    className="font-semibold text-accent hover:text-accent-hover"
                    title="Màn này chỉ nói ĐANG THẾ NÀO — phải xử gì nằm ở màn Cảnh báo (mức độ quan trọng «AI chọn: cần anh xem»)"
                  >
                    Việc cần anh xem → màn Cảnh báo
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* ===== ③ HAI CỘT CẠNH NHAU — demo chỉ ghép S-Curve ‖ đường găng.
            Bốn khối dưới chạy NGANG HẾT BỀ, đúng demo (chốt vòng 7). ===== */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{/* 04/10: grid-cols-1 = minmax(0,1fr) — màn 400px cột tự nở 334/312px làm trang tràn ngang */}
          {/* ===== S-CURVE — tiendo.s_curve (mở 09/09 theo lệnh Mr. Đại) ===== */}
          {bdh.sCurve === null || bdh.sCurve.loi !== null ? (
            <KhoiChuaCo
              ten="S-Curve — bốn đường"
              lyDo={bdh.sCurve?.loi ?? "Chưa chọn dự án."}
              moODau="Xem S-Curve ở Agent tiến độ"
              diaChi="http://localhost:3003"
            />
          ) : (
            <SectionCard title="S-Curve — bốn đường">
              <SCurve
                height={240}
                points={bdh.sCurve.diem}
                ngayCatDuLieu={ngayVN(bdh.sCurve.ngayCatDuLieu)}
                ghiChu={bdh.sCurve.ghiChu}
                dat100={bdh.sCurve.dat100 ?? null}
                cauTapViec={bdh.sCurve.cauTapViec}
                viecKhongNoi={bdh.sCurve.viecKhongNoi}
              />
              <div className="mt-1 text-[11.5px] text-text-muted">
                Mục tiêu CĐT · Baseline · Thực tế · Dự báo (kiểu MS Project, việc đang làm theo năng suất 7 ngày) — nguồn:
                tiendo.s_curve, cùng bộ tính với trang Tổng quan của Agent tiến độ.
              </div>
            </SectionCard>
          )}

          {/* ===== HẠNG MỤC ĐƯỜNG GĂNG — tiendo.duong_gang (Mr. Đại chốt 14/10/2026, luật 35 + 36).
              Bỏ ba cột KH · TH · Lệch % (cấm nói nhanh chậm bằng %). Nay hiện ĐÚNG khối Tổng quan của Agent Tiến độ:
              dòng tách chậm so với Tiến độ mục tiêu + mỗi hạng mục TỰ làm COD chậm bao nhiêu ngày so với Baseline.
              Agent Tiến độ tính và xếp sẵn — Main không tính lại (phân vai 06/09). ===== */}
          <div id={NEO.duongGang} className="scroll-mt-16">
          <SectionCard title="Hạng mục đường găng — tự làm COD chậm bao nhiêu ngày">
            {ct === null || ct.loi !== null ? (
              <div className="py-2 text-[11.5px] text-text-secondary">
                <b className="text-red">{ct?.loi ?? "Chưa chọn dự án."}</b>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11.5px] font-semibold text-text">
                  {ct.tachChamCod ?? (
                    <>
                      COD dự báo {ngayVN(ct.codDuBao)} · {cauChamHe(ct.lechNgay, "muc-tieu")}
                      {ct.codMucTieu ? ` (${ngayVN(ct.codMucTieu)})` : ""} · {cauChamHe(ct.lechNgaySoBaseline, "baseline")}
                      {ct.codBaseline ? ` (${ngayVN(ct.codBaseline)})` : ""}
                    </>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border text-left text-text-muted">
                        <th className="py-1 pr-2 font-semibold">WBS</th>
                        <th className="py-1 pr-2 font-semibold">Hạng mục</th>
                        <th className="py-1 text-right font-semibold">Tự làm COD chậm (so với Baseline)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ct.hangMucTuLam.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 text-text-muted">
                            Agent Tiến độ chưa trả bảng này (không có hạng mục găng chưa xong, hoặc cổng cũ).
                          </td>
                        </tr>
                      )}
                      {ct.hangMucTuLam.slice(0, 6).map((h) => (
                        <tr key={h.wbs} className="border-b border-border/50 align-top">
                          <td className="py-1 pr-2 font-mono text-[11px] text-text-muted">{h.wbs}</td>
                          <td className="py-1 pr-2 text-text">
                            {h.ten}
                            <div className="text-[10.5px] text-text-muted">
                              Dự báo xong {h.duBaoXong ? ngayVN(h.duBaoXong) : "—"}
                              {h.baselineXong && <> · Baseline xong {ngayVN(h.baselineXong)}</>}
                            </div>
                          </td>
                          <td className="py-1 text-right whitespace-nowrap">
                            <b className={h.tuLamCodCham === null || h.tuLamCodCham === 0 ? "text-text-muted" : "text-red"}>
                              {h.tuLamCodCham === null ? "chưa có Baseline đã duyệt" : `${fmtSo(h.tuLamCodCham)} ngày`}
                            </b>
                            {h.tuLamCodCham !== null && h.tuLamCodCham > 0 && (h.trongDoThoiTiet ?? 0) > 0 && (
                              <div className="text-[10.5px] text-text-muted">
                                {h.trongDoThoiTiet === h.tuLamCodCham ? "toàn bộ" : `trong đó ${fmtSo(h.trongDoThoiTiet ?? 0)} ngày`} do thời tiết
                              </div>
                            )}
                            {h.tuLamCodCham === 0 && h.duBaoXong && h.baselineXong && h.duBaoXong > h.baselineXong && (
                              <div className="text-[10.5px] text-text-muted">chậm do việc phía trước đẩy sang</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-[11.5px] text-text-muted">
                  Nếu các việc của RIÊNG hạng mục làm đúng Baseline thì COD sớm lên bao nhiêu ngày — chỉ phần do chính hạng mục
                  gây ra, không cộng dồn giữa các hạng mục. Nguồn: tiendo.duong_gang, cùng số khối «Hạng mục đường găng» ở Tổng quan
                  Agent Tiến độ.
                </div>
              </div>
            )}
          </SectionCard>
          </div>

        </div>

        {/* ===== TUẦN NÀY KHÁC TUẦN TRƯỚC — đặt TRÊN khối Tiền (Mr. Đại 28/10/2026). Biểu đồ + bảng + kết luận; số tiến độ thực tế lấy
            từ S-Curve cho khớp khối S-Curve cùng trang. Nguồn: tiendo.s_curve + tiendo.nguon_luc_huy_dong + tiendo.so_tuan. ===== */}
        <div id={NEO.tuan} className="scroll-mt-16">
        {bdh.soTuan === null || bdh.soTuan.loi !== null ? (
          <KhoiChuaCo
            ten="Tuần này khác tuần trước"
            lyDo={bdh.soTuan?.loi ?? "Chưa chọn dự án."}
            moODau="Xem màn Tuần trước ở Agent tiến độ"
            diaChi="http://localhost:3003/tuan-truoc"
          />
        ) : tuanKhac ? (
          <TuanNayKhac m={tuanKhac} tuanTruoc={bdh.soTuan.tuanTruoc} tuanNay={bdh.soTuan.tuanNay} />
        ) : (
          <KhoiChuaCo
            ten="Tuần này khác tuần trước"
            lyDo={`S-Curve chưa có điểm đo cho ${bdh.soTuan.tuanTruoc} và ${bdh.soTuan.tuanNay}.`}
            moODau="Xem S-Curve ở Agent tiến độ"
            diaChi="http://localhost:3003"
          />
        )}
        </div>

        {/* ===== TIỀN — G10 (Mr. Đại chốt 22/09). Số lấy nguyên từ Agent hợp đồng; null hiện «chưa có số» (gom một dòng). Luật I07: chỉ HĐ BQL ký. ===== */}
        {bdh.tien !== null && <KhoiTienMoi tien={bdh.tien} />}

        {/* ===== HỒ SƠ PHÁP LÝ ĐANG THIẾU — phaply.ho_so_thieu. Dòng đã thành việc: chỉ «Mở việc →», không vẽ lại nội dung (chống trùng màn Cảnh báo). ===== */}
        <div id={NEO.phapLy} className="scroll-mt-16">
        {bdh.phapLy === null || bdh.phapLy.loi !== null ? (
          <KhoiChuaCo
            ten="Hồ sơ pháp lý đang thiếu"
            lyDo={bdh.phapLy?.loi ?? "Chưa chọn dự án."}
            moODau="Xem ở Agent pháp lý"
            diaChi="http://localhost:3013"
          />
        ) : (
          <KhoiPhapLyMoi phapLy={bdh.phapLy} maDuAn={maDuAnGiao} maIssueCua={maIssueCua} soDaThanhIssue={soDaThanhIssue} />
        )}
        </div>

        {/* ===== ĐANG TẮC Ở BÀN AI — base.viec_qua_han + hopdong.phieu_gia_dang_cho. Cùng luật trình bày với khối pháp lý. ===== */}
        {bdh.tac === null || bdh.tac.loi !== null ? (
          <KhoiChuaCo
            ten="Đang tắc ở bàn ai"
            lyDo={bdh.tac?.loi ?? "Chưa chọn dự án."}
            moODau="Xem ở agent Công việc"
            diaChi="http://localhost:3004"
          />
        ) : (
          <KhoiTacMoi tac={bdh.tac} maDuAn={maDuAnGiao} maIssueCua={maIssueCua} />
        )}

        {/* ===== ⑦ CHỖ HAI AGENT NÓI KHÁC NHAU — B11 (22/09): Main chỉ nêu kèm nguồn hai
            bên, không phân xử. Tự hỏi ba cổng khi mở, không chặn lượt tải trang. ===== */}
        {bdh.dangChon ? <KhoiMauThuanCheo duAn={bdh.dangChon} /> : null}

        {/* 25/10/2026 (Mr. Đại): bỏ mục «Hỏi nhanh» — hỏi trợ lý qua nút trợ lý nổi */}

        {/* Chip cuối — nhắc phân vai của màn. 04/10: chữ thường ĐƯỢC xuống dòng (Pill không xuống dòng làm màn 400px tràn 49px) */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-text-muted">
          <span>Màn này: đang thế nào · Màn Cảnh báo: phải xử gì</span>
          <span>Main không tự tính số — mọi số truy về sổ hỏi–đáp (xem ở Agent quan sát)</span>
        </div>
      </main>
    </div>
  );
}

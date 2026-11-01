# 31 — Rà soát cổng MCP về khối lượng và hồ sơ thiết kế (26/10/2026)

Nguồn: Mr. Đại hỏi Main hai câu, Main đều trả «chưa có công cụ»:
1. «Khối lượng BOQ thiết kế chi tiết của hạng mục đường dây 110 dự án Hướng Việt?»
2. «Hồ sơ thiết kế nào PMC chưa làm mà sắp cần để thi công? Dự án Hướng Việt»

## Đã đo (trước khi sửa)

| Điều | Số đo |
|---|---|
| BOQ Hướng Việt | 1.203 dòng, 16 hạng mục; «DZ 110KV» = HM-HV-11, 4 dòng |
| Công cụ Tiến độ ở cổng | 28; Main chỉ nối 15 |
| `tiendo.boq_nghiem_thu` phan="dong" | trả 100 dòng/trang, **không lọc được theo hạng mục** |
| Hồ sơ thiết kế | Có ở màn `/thiet-ke` (32 bộ đã duyệt), **không có công cụ cổng nào** |

## Đã làm

| Việc | Ở đâu |
|---|---|
| Công cụ mới `tiendo.boq_theo_hang_muc` — lọc BOQ theo hạng mục (mã hoặc tên) và/hoặc chữ trong dòng; trả khối lượng thiết kế, việc WBS, hợp đồng, thầu phụ, đã thi công, % đạt | Tiến độ `src/lib/mcp/boq-theo-hang-muc.ts` |
| Công cụ mới `tiendo.ho_so_thiet_ke` — dùng đúng hàm `raSoatThietKe` của màn (luật 38) | Tiến độ `src/lib/mcp/ho-so-thiet-ke.ts` |
| Nối vào chat Main 4 công cụ: `boq_theo_hang_muc` · `bao_cao_ngay_boq` · `hop_dong_nha_thau` · `ho_so_thiet_ke` | `src/lib/ai/chat-tools.ts` · `chat-types.ts` · `chon-cong-cu.ts` |

## Bảng nguồn khối lượng theo từng bên

| Bên | Khối lượng gì | Công cụ cổng | Main hỏi được chưa |
|---|---|---|---|
| Thiết kế (BOQ) | KL thiết kế theo dòng + hạng mục | `tiendo.boq_theo_hang_muc` (mới) · `tiendo.boq_nghiem_thu` | **Có** (mới) |
| Nhà thầu báo cáo | KL theo ngày × WBS × thầu phụ | `tiendo.khoi_luong_hang_muc` · `tiendo.bao_cao_ngay_boq` | **Có** |
| Nhà thầu — hợp đồng | KL nhà thầu nhận theo mã BOQ | `tiendo.hop_dong_nha_thau` | **Có** (mới) |
| Thi công lũy kế | Đã thi công theo mã BOQ | `tiendo.luy_ke_boq` (gộp trong `boq_theo_hang_muc`) | Có (gộp) |
| Nghiệm thu | KL đã nghiệm thu theo mã BOQ | `nghiemthu.khoi_luong_da_nghiem_thu` | Có (đã nối) |
| Hợp đồng (tiền) | Sản lượng theo giá, phiếu giá so sản lượng | `tiendo.san_luong_hop_dong` · `hopdong.phieu_gia_so_san_luong` · `hopdong.chi_phi_theo_hop_dong` | **Chưa** — số tiền, chưa có agent nào hỏi (luật 46) |
| Nhật ký thi công | Nhân lực, máy, việc trong ngày | `tiendo.nhat_ky_thi_cong` | **Chưa** — chưa ai hỏi |
| Hồ sơ thiết kế | Bộ hồ sơ, ngày phải có | `tiendo.ho_so_thiet_ke` (mới) | **Có** (mới) |

## Chưa làm, chờ có người hỏi (luật 46)
- Nối `san_luong_hop_dong`, `nhat_ky_thi_cong`, `phieu_gia_so_san_luong` vào Main.
- Hồ sơ thiết kế đang «chưa hỏi được agent Công việc» ở 24/26 bộ → cột «ai làm» còn trống, đây là việc nối bên Công việc, không phải lỗi cổng.

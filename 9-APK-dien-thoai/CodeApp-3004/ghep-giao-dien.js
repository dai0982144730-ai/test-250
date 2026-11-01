// ghep-giao-dien.js — ghép assets/app/index.html từ CSS của demo (demo là thước) + khung màn của app thật.
// Chạy: node ghep-giao-dien.js   (không cần thư viện)
const fs = require("node:fs");
const path = require("node:path");
const goc = path.join(__dirname, "..");
const demo = fs.readFileSync(path.join(goc, "demo", "demo-apk-cong-viec.html"), "utf8");
const css = /<style>([^]*?)<\/style>/.exec(demo)[1];
const ra = path.join(__dirname, "app", "src", "main", "assets", "app");
fs.mkdirSync(ra, { recursive: true });
// thuan.js: bản 3004 giữ nguyên tệp đã có trong assets (nguồn «8-PC-chuong-thong-bao-live…» không có trong kho)
{ const nguon = path.join(goc, "..", "8-PC-chuong-thong-bao-live congviec.scigroup.vn", "thuan.js"); if (fs.existsSync(nguon)) fs.copyFileSync(nguon, path.join(ra, "thuan.js")); }

const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>SCI Công việc</title>
<style>${css}
  /* ---- riêng bản app thật: toàn màn hình, không khung điện thoại ---- */
  html, body { background: var(--nen); }
  #trang { display: block; padding: 0; }
  #may { width: 100vw; height: 100vh; height: 100dvh; border-radius: 0; box-shadow: none; }
  .so.tinh { animation: none; box-shadow: none; }
  .dn { position: absolute; inset: 0; z-index: 50; background: var(--nen); display: none; padding: 28px 24px; overflow-y: auto; }
  .dn.mo { display: block; }
  .dn h1 { margin: 0 0 4px; font: 700 22px "Times New Roman", serif; color: var(--cam-chu); }
  .dn p { margin: 0 0 16px; color: var(--phu); font-size: 13.5px; }
  .dn button[type=submit] { margin-top: 18px; width: 100%; padding: 12px; border: 0; border-radius: 10px; background: var(--cam); color: #fff; font-weight: 700; font-size: 15px; }
  .dn button[type=submit]:disabled { opacity: .6; }
  /* nút «!» đỏ: bấm thì sáng + phát quang, danh sách chỉ còn việc quá hạn */
  .qh-cham { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--do); color: var(--do); font: 800 15px/1 Arial, sans-serif; opacity: .8; transition: all .2s; }
  #b-qh.sang .qh-cham { background: var(--do); color: #fff; opacity: 1; animation: qh-sang 1.4s ease-in-out infinite; }
  @keyframes qh-sang { 0%, 100% { box-shadow: 0 0 4px 1px rgba(220,38,38,.7); } 50% { box-shadow: 0 0 14px 5px #DC2626; } }
  .qh-bao { color: var(--do); font-weight: 600; }
  /* chân chuông: «Xem tin đã đọc» ở góc dưới bên trái */
  .tb-chan { flex: none; display: flex; justify-content: flex-start; padding: 6px 10px calc(6px + env(safe-area-inset-bottom)); border-top: 1px solid var(--vien); background: var(--the); }
  .tb-chan button { border: 0; background: none; padding: 8px 4px; color: var(--cam-chu); font-size: 14px; font-weight: 600; text-decoration: underline; }
  /* nút ≡ bảng tiến độ cạnh icon dự án (chỉ dự án có bảng) */
  .td-nut { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 10px; background: var(--cam-nhat); color: var(--cam-chu); padding: 0; }
  /* bảng tiến độ: trái tên việc (dính mép trái), phải sơ đồ theo tháng; cuộn cả hai chiều trong MỘT khung */
  #man-td { background: var(--the); display: none; flex-direction: column; } #man-td.mo { display: flex; }
  .td-c { flex: none; min-width: 34px; height: 30px; padding: 0 6px; border: 1px solid #57534E; border-radius: 8px; background: none; color: #F5F5F4; font-weight: 700; font-size: 13px; }
  #td-ten { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 15px !important; }
  .td-c.sang { background: var(--cam); border-color: var(--cam); color: #fff; }
  #td-than { flex: 1; overflow: auto; position: relative; -webkit-overflow-scrolling: touch; }
  .td-luoi { position: relative; }
  .td-hang { display: flex; height: 30px; border-bottom: 1px solid #F0EDE8; }
  .td-t { position: sticky; left: 0; z-index: 3; flex: none; width: var(--w); box-sizing: border-box; display: flex; align-items: center; padding: 0 6px 0 0; background: var(--the); border-right: 1px solid var(--vien); font-size: 13px; text-align: left; }
  .td-ten { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .td-t.c1 { color: var(--cam-chu); font-weight: 700; } .td-t.c2 { color: var(--cam-chu); } .td-t.c3, .td-t.c4 { color: #1A1A1A; }
  .td-tg { flex: none; width: 22px; height: 30px; display: grid; place-items: center; border: 0; background: none; padding: 0; color: #78716C; } .td-tg.mo svg { transform: rotate(90deg); }
  .td-dau { position: sticky; top: 0; z-index: 5; background: #F5F3EF; } .td-dau .td-t { z-index: 6; background: #F5F3EF; font-weight: 700; color: #44403C; padding-left: 8px; }
  .td-p { position: relative; flex: none; width: var(--tw); }
  .td-th { position: absolute; top: 0; height: 30px; line-height: 30px; box-sizing: border-box; padding-left: 4px; font-size: 11.5px; font-weight: 700; color: #57534E; border-left: 1px solid #D5D2CD; overflow: hidden; white-space: nowrap; }
  .td-gach { position: absolute; top: 30px; bottom: 0; width: 1px; background: #EEEAE4; z-index: 0; pointer-events: none; } /* đường dóng tháng NẰM DƯỚI hình công việc (z-index thấp hơn) → thanh liền mạch, đường găng không bị cắt khúc */
  .td-homnay { position: absolute; top: 30px; bottom: 0; width: 0; border-left: 2px dashed var(--do); opacity: .85; z-index: 1; pointer-events: none; }
  .td-thanh { position: absolute; top: 9px; height: 12px; border-radius: 3px; z-index: 2; } .td-cha { position: absolute; top: 10px; height: 6px; z-index: 2; }
  .td-moc { position: absolute; top: 9px; width: 12px; height: 12px; transform: rotate(45deg); z-index: 2; }
  .td-tam { position: absolute; top: 16px; height: 5px; z-index: 2; } /* tam giác chúc xuống sát hai đầu thanh nhóm — như web 3004 (Mr. Đại 01/11/2026) */
  .td-tam.trai { clip-path: polygon(0 0, 100% 0, 0 100%); } .td-tam.phai { clip-path: polygon(0 0, 100% 0, 100% 100%); } .td-tam.xanh { background: #22c55e; }
  .td-thanh.cam, .td-cha.cam, .td-tam.cam, .td-moc.cam { background: var(--cam); } .td-thanh.den, .td-cha.den, .td-tam.den, .td-moc.den { background: #1A1A1A; }
  .td-hang.td-sel .td-t { background: var(--cam-nhat); } .td-hang.td-sel { background: var(--cam-nhat); }
  .td-vach { position: absolute; right: -10px; top: 0; bottom: 0; width: 20px; z-index: 7; touch-action: none; cursor: col-resize; } .td-vach::after { content: ""; position: absolute; left: 8px; top: 0; bottom: 0; width: 3px; border-radius: 2px; background: var(--cam); opacity: .35; }
  #td-pop { display: none; position: absolute; left: 8px; z-index: 12; max-width: min(250px, calc(100% - 16px)); padding: 6px 10px; background: #fff; border: 1px solid var(--vien); border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,.18); font-size: 12.5px; line-height: 1.4; color: #1a1a1a; } #td-pop b { display: block; font-size: 13px; margin-bottom: 2px; }
  /* ô tìm việc: ô chọn lọc (giao chuyển tiếp) ở trên, ô gõ chữ ở dưới */
  .o-tim { padding: 8px 14px 10px; background: var(--nen); border-bottom: 1px solid #E5E2DD; display: flex; flex-direction: column; gap: 8px; }
  .o-tim select, .o-tim input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #D5D2CD; border-radius: 8px; background: #fff; font: inherit; font-size: 15px; color: inherit; }
  .o-tim select:focus, .o-tim input:focus { outline: none; border-color: var(--cam); }
  .tim-hang { position: relative; }
  .tim-hang input { padding-right: 38px; }
  #tim-xoa { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border: 0; background: none; font-size: 20px; color: var(--phu); display: none; }
  #b-tim.sang { color: var(--cam); }
  .top h1 { color: #F97316; }
  .bao-loc { padding: 8px 14px; font-size: 13px; color: var(--cam-chu); font-weight: 600; background: var(--cam-nhat); border-bottom: 1px solid var(--vien); }
  .vitri { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 6px; min-height: 50px; padding: 6px 10px; background: var(--nen); border-bottom: 1px solid var(--vien); }
  .vitri .nha { flex: none; width: 76px; height: 38px; display: grid; place-items: center; border: 1px solid #D5D2CD; border-radius: 10px; background: var(--the); color: var(--cam-chu); }
  .vitri .nha svg { width: 20px; height: 20px; }
  .vitri .lui { flex: none; height: 38px; padding: 0 10px; border: 1px solid #D5D2CD; border-radius: 10px; background: var(--the); font-size: 13.5px; font-weight: 600; white-space: nowrap; }
  .vitri .ten { flex: 1; min-width: 0; font: 700 16px "Times New Roman", serif; color: var(--cam-chu); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vitri .gang { flex: none; height: 34px; padding: 0 10px; border: 1px solid #D5D2CD; border-radius: 17px; background: var(--the); font-size: 13px; font-weight: 600; }
  .vitri .gang.dang { background: var(--cam); border-color: var(--cam); color: #fff; }
  .nhom1 { display: flex; justify-content: space-between; margin-top: 6px; padding: 9px 14px 6px; font-size: 12.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--cam-chu); background: #F4F1EC; border-top: 1px solid var(--vien); }
  .nhom1 span { color: var(--muc); }
  .nhom2 { padding: 8px 14px 4px; font-size: 14px; font-weight: 800; color: var(--muc); }
  .nhom2 small { font-weight: 400; color: var(--phu); }
  .nhom2.chung { color: var(--phu); font-weight: 500; }
  .luoi-ic { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0 12px; }
  .o-ic { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px; border: 1px solid #D5D2CD; border-radius: 12px; background: #fff; font: inherit; color: var(--muc); }
  .o-ic span { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: var(--cam-nhat); color: var(--cam-chu); } .o-ic span svg { width: 24px; height: 24px; }
  .o-ic small { font-size: 11.5px; color: var(--phu); text-align: center; line-height: 1.2; }
  .o-ic.chon { border-color: var(--cam-chu); box-shadow: 0 0 0 2px var(--cam-nhat); }
  .ic.rung .bieu { outline: 2px dashed var(--cam-chu); outline-offset: 2px; }
  .cua-ai { font-size: 13px; color: var(--phu); margin: 0 0 8px; } .cua-ai b { color: var(--muc); }
  #man-chon { position: absolute; inset: 0; z-index: 60; background: rgba(0,0,0,.45); display: none; align-items: flex-end; } #man-chon.mo { display: flex; }
  #toast { z-index: 80; }
  .chon-khung { width: 100%; height: 86%; display: flex; flex-direction: column; background: #fff; border-radius: 18px 18px 0 0; padding: 12px 0 0; }
  .chon-dau { display: flex; align-items: center; justify-content: space-between; padding: 0 14px 8px; font: 700 17px "Times New Roman", serif; color: var(--cam-chu); } .chon-dau button { border: 0; background: none; font-size: 22px; color: var(--phu); width: 40px; height: 36px; }
  #chon-q { margin: 0 14px 8px; padding: 10px 11px; border: 1px solid #D5D2CD; border-radius: 9px; font: inherit; width: calc(100% - 28px); }
  #chon-ds { flex: 1; overflow-y: auto; padding-bottom: 24px; }
  .chon-nhom { display: flex; align-items: center; border-bottom: 1px solid var(--vien); }
  .chon-ten { flex: 1; text-align: left; padding: 14px 10px 14px 14px; border: 0; background: none; font-size: 15.5px; font-weight: 700; color: var(--muc); } .chon-ten small { font-weight: 400; color: var(--phu); } .chon-ten .mui { display: inline-block; width: 16px; color: var(--cam-chu); }
  .chon-nguoi { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; padding: 13px 14px 13px 40px; border: 0; border-bottom: 1px solid var(--vien); background: #FBFAF8; font-size: 15px; }
  .tron { flex: none; width: 24px; height: 24px; margin-right: 14px; border: 2px solid #57534E; border-radius: 50%; background: #fff; padding: 0; display: inline-block; } .chon-nguoi .tron { margin-right: 0; }
  .tron.dang { border-color: var(--cam); background: radial-gradient(circle, var(--cam) 0 45%, #fff 50%); }
  .chon-nut { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 11px 12px; border: 1px solid #D5D2CD; border-radius: 9px; background: #fff; font: inherit; text-align: left; color: var(--phu); } .chon-nut.co { color: var(--muc); font-weight: 600; } .chon-nut span { color: var(--phu); font-size: 18px; }
  .phan-cong .chon-nut { margin: 6px 0; }
  .phan-cong select { width: 100%; margin: 6px 0; padding: 10px 11px; border: 1px solid #D5D2CD; border-radius: 9px; background: #fff; font: inherit; }
  .dvcon { display: flex; justify-content: space-between; width: calc(100% - 20px); margin: 0 10px 6px; padding: 11px 12px; border: 1px solid var(--vien); border-radius: 12px; background: var(--the); text-align: left; }
  .dvcon .n { color: var(--phu); font-size: 13px; }
  .ph-dau { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--vien); }
  .hai-nut { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .hai-nut button { padding: 10px 6px; border: 1px solid #D5D2CD; border-radius: 10px; background: var(--the); font-weight: 600; font-size: 13.5px; }
  .hai-nut .chinh { background: var(--cam); border-color: var(--cam); color: #fff; }
  .hai-nut .dang { box-shadow: inset 0 0 0 2px var(--cam); color: var(--cam-chu); }
  .o.khac { background: #F1EFEB; color: #A8A29E; }
  .chip-ds { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
  .mchip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 6px 5px 10px; border: 1px solid #D5D2CD; border-radius: 16px; background: #fff; font-size: 13px; } .mchip small { color: var(--phu); } .mchip button { border: 0; background: none; color: var(--phu); padding: 0 4px; }
  .moi-o { position: relative; }
  .moi-pop { position: absolute; left: 0; right: 0; top: 100%; margin-top: 4px; max-height: 230px; overflow-y: auto; background: #fff; border: 1px solid #D5D2CD; border-radius: 10px; box-shadow: 0 8px 20px rgba(0,0,0,.18); z-index: 5; display: none; }
  .moi-pop.mo { display: block; }
  .moi-pop .dn { padding: 5px 10px; font-size: 11px; text-transform: uppercase; color: var(--phu); background: #FAF9F7; }
  .moi-pop button { display: block; width: 100%; text-align: left; padding: 9px 10px; border: 0; border-bottom: 1px solid var(--vien); background: none; font-size: 14px; } .moi-pop small { color: var(--phu); }
  /* thẻ việc mở tại chỗ như 3004 */
  #than { transition: background .2s; padding-bottom: 80px; } #than.co-mo { background: #CFCAC2; }
  .viec { padding: 0; overflow: hidden; margin: 0 10px 6px; transition: background .2s, box-shadow .2s, opacity .2s; }
  #than.co-mo .viec:not(.mo) { background: #CFCAC2; border-color: #C2BDB4; opacity: .6; }
  #than.co-mo .doan, #than.co-mo .tong, #than.co-mo .nhom-gd { opacity: .45; transition: opacity .2s; }
  .viec.mo { background: #fff; box-shadow: 0 0 0 2px var(--cam), 0 8px 24px rgba(0,0,0,.28); position: relative; z-index: 1; }
  .viec .dau { display: grid; grid-template-columns: 14px 1fr auto; gap: 0 8px; width: 100%; text-align: left; border: 0; background: transparent; padding: 10px 12px; align-items: start; }
  .viec .dau .mui { color: #78716C; transition: transform .2s; line-height: 20px; } .viec.mo .dau .mui { transform: rotate(90deg); color: var(--cam-chu); }
  .viec .dau .t { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 500; } .viec.mo .dau .t { -webkit-line-clamp: unset; font-weight: 600; }
  .viec .dau .ph { grid-column: 2; font-size: 12px; color: var(--phu); margin-top: 1px; }
  .viec .dau .r { font-size: 12.5px; white-space: nowrap; text-align: right; color: var(--phu); } .viec .dau .r.do { color: var(--do); font-weight: 700; } .viec .dau .r.sap { color: #B45309; font-weight: 600; }
  .than-viec { padding: 0 12px 12px 34px; animation: vao .25s both; } @keyframes vao { from { opacity: 0; transform: translateY(-4px); } }
  .moc { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; margin: 4px 0 8px; }
  .moc .thanh { position: relative; height: 4px; border-radius: 2px; background: var(--vien); } .moc .thanh i { position: absolute; inset: 0 auto 0 0; border-radius: 2px; background: #57534E; }
  .moc .thanh em { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); font-style: normal; font-size: 11px; font-weight: 500; color: var(--phu); background: #fff; padding: 0 6px; white-space: nowrap; } .moc .qh { color: var(--do); }
  .than-viec .dong { font-size: 13px; margin: 3px 0; } .than-viec .dong span { color: var(--phu); }
  .ba-nut { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 6px; margin: 10px 0 8px; }
  .ba-nut button { padding: 8px 4px; border: 1px solid #D5D2CD; border-radius: 9px; background: var(--the); font-weight: 600; font-size: 13px; white-space: nowrap; }
  .ba-nut button.chinh { background: var(--cam); border-color: var(--cam); color: #fff; } .ba-nut button.dang { box-shadow: inset 0 0 0 2px var(--cam); }
  .form-nho { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0 8px; font-size: 13px; background: #FAF9F7; border: 1px solid var(--vien); border-radius: 10px; padding: 8px; }
  .form-nho input[type=text], .form-nho select { flex: 1; min-width: 120px; padding: 8px; border: 1px solid #D5D2CD; border-radius: 8px; background: #fff; font: inherit; }
  .form-nho .chip { padding: 7px 10px; border: 1px solid #D5D2CD; border-radius: 16px; background: #fff; font-size: 13px; }
  .mo-nho { color: var(--phu); font-size: 12px; }
  .bl-ds { list-style: none; margin: 8px 0 6px; padding: 0; font-size: 13px; } .bl-ds li { margin: 5px 0; } .bl-ds .gio { color: #A8A29E; font-size: 12px; } .bl-ds .nd-bl { color: #44403C; } .at { color: var(--cam-chu); font-weight: 600; }
  .o-viet { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: stretch; margin-top: 6px; }
  .o-viet textarea { min-height: 40px; padding: 8px; border: 1px solid #D5D2CD; border-radius: 8px; resize: none; font: inherit; font-size: 13.5px; }
  .o-viet .gui { border: 1px solid var(--cam); border-radius: 8px; background: var(--cam); color: #fff; padding: 0 14px; font-weight: 700; } .o-viet .gui:disabled { opacity: .45; }
  .goi-y { position: absolute; left: 0; right: 0; bottom: 100%; margin-bottom: 4px; max-height: 190px; overflow-y: auto; background: #fff; border: 1px solid #D5D2CD; border-radius: 10px; box-shadow: 0 6px 18px rgba(0,0,0,.18); z-index: 5; }
  .goi-y button { display: block; width: 100%; text-align: left; padding: 8px 10px; border: 0; border-bottom: 1px solid var(--vien); background: none; } .goi-y small { display: block; color: var(--phu); font-size: 12px; }
  .goi-y .dau-nhom { padding: 5px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--phu); background: #FAF9F7; }
  .se-bao { font-size: 12px; color: var(--phu); margin-top: 6px; } .se-bao b { color: var(--muc); }
  .gat { flex: none; width: 46px; height: 26px; border-radius: 13px; background: #C9C5BF; position: relative; transition: background .2s; } .gat::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .2s; } .gat.bat { background: var(--cam); } .gat.bat::after { left: 23px; }
  .o-viet { grid-template-columns: 1fr auto auto; } .o-viet textarea { grid-column: 1; }
  .kep { border: 1px solid #D5D2CD; border-radius: 8px; background: #fff; padding: 0 10px; white-space: nowrap; } .kep:disabled { opacity: .5; }
  .form-nho .kep { padding: 8px 10px; } .hang-kep { margin-top: 10px; }
  .chon-tep { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; align-items: center; }
  .tep-da-kep { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border: 1px solid #D5D2CD; border-radius: 14px; background: #fff; font-size: 12.5px; max-width: 100%; } .tep-da-kep small { color: var(--phu); }
  .bo-tep { border: 0; background: none; color: var(--phu); padding: 0 2px; font-size: 14px; }
  .ds-tep { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 2px; align-items: center; }
  .tep-mo { padding: 4px 9px; border: 1px solid #D5D2CD; border-radius: 14px; background: #fff; font-size: 12.5px; color: var(--cam-chu); } .tep-mo small { color: var(--phu); }
  .tep-het { font-size: 12.5px; color: #A8A29E; text-decoration: line-through; }
  .xem-khung { flex: 1; width: 100%; border: 0; background: #fff; }
  .xem-chu { flex: 1; margin: 0; padding: 10px; overflow: auto; white-space: pre-wrap; background: #fff; font-family: monospace; }
  .xem-cuon { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y; }
  .xem-pdf { margin: 0 auto; } .xem-trang { position: relative; background: #fff; margin: 0 0 8px; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
  .xem-trang img { position: absolute; inset: 0; width: 100%; height: 100%; } .xem-anh { display: block; margin: 0 auto; max-width: none; }
  #man-xem .doc-het { color: #fff; border: 0; background: none; padding: 0 8px; }
  /* Việc làm xong: khối xanh, đóng sẵn (3004) */
  .khoi-xong { border-top: 1px dashed var(--vien); margin: 8px 10px 0; }
  .dong-khoi-xong { width: 100%; display: flex; align-items: center; gap: 6px; padding: 10px 4px; font-size: 13.5px; font-weight: 600; color: #15803D; background: none; border: 0; text-align: left; }
  .dong-khoi-xong .so-xong { margin-left: auto; color: var(--phu); font-weight: 500; }
  .khoi-xong .viec { margin: 0 0 6px; }
  .viec .dau .r.xong { color: #15803D; font-weight: 600; }
  #dn-loi { margin-top: 12px; color: var(--do); font-size: 13.5px; min-height: 18px; }
  #dn-loi.goi-y-dc { color: var(--phu); }
  /* ---- bản 3004: mục «Trợ lý» — chat với trợ lý AI của Main (cổng 3010), duyệt 01/11/2026 ---- */
  #man-chat { background: var(--nen); flex-direction: column; } #man-chat.mo { display: flex; }
  #man-chat .tb-dau .doc-het { color: #fff; border: 0; background: none; padding: 0 8px; font-size: 14px; font-weight: 600; }
  #chat-ten { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #chat-than { flex: 1; overflow-y: auto; padding: 10px 12px 16px; -webkit-overflow-scrolling: touch; }
  .ct-tin { margin: 0 0 14px; } .ct-tin .ai { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--cam); color: #fff; font: 700 10px Arial, sans-serif; margin-right: 6px; vertical-align: middle; }
  .ct-tin .dau-ai { font-size: 12.5px; color: var(--phu); margin-bottom: 4px; } .ct-tin .dau-ai b { color: var(--muc); }
  .ct-nd { font-size: 14.5px; line-height: 1.5; color: var(--muc); overflow-wrap: anywhere; } .ct-nd p { margin: 0 0 6px; } .ct-nd h4 { margin: 8px 0 4px; font-size: 15px; }
  .ct-nd code { background: #F1EFEB; border-radius: 4px; padding: 0 4px; font-size: 13px; } .ct-nd a { color: var(--cam-chu); font-weight: 600; text-decoration: underline; }
  .ct-nd .bang { overflow-x: auto; margin: 4px 0 8px; } .ct-nd table { border-collapse: collapse; font-size: 13px; } .ct-nd td, .ct-nd th { border: 1px solid var(--vien); padding: 4px 6px; text-align: left; vertical-align: top; } .ct-nd th { background: #F4F1EC; }
  .ct-tin.nguoi { display: flex; flex-direction: column; align-items: flex-end; } .ct-tin.nguoi .ct-nd { max-width: 86%; padding: 9px 12px; border-radius: 14px 14px 4px 14px; background: #1E293B; color: #F8FAFC; white-space: pre-wrap; }
  .ct-gio { font-size: 11.5px; color: #A8A29E; margin-top: 3px; }
  .ct-chip { display: block; margin: 5px 0 0; padding: 6px 10px; border: 1px solid #86EFAC; border-radius: 14px; background: #F0FDF4; color: #15803D; font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .ct-chip.hong { border-color: #FCA5A5; background: #FEF2F2; color: var(--do); }
  .ct-cho { margin: 8px 0 0; padding: 9px 10px; border: 1px solid #FDBA74; border-radius: 12px; background: #FFF7ED; font-size: 13px; } .ct-cho .hai-nut { margin-top: 8px; }
  .ct-doi { color: var(--phu); font-size: 13.5px; font-style: italic; }
  .ct-loi { margin: 8px 0; padding: 8px 10px; border-radius: 10px; background: #FEF2F2; color: var(--do); font-size: 13.5px; }
  .ct-trong { padding: 30px 10px; text-align: center; color: var(--phu); font-size: 14px; line-height: 1.5; }
  .ct-viet { flex: none; display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 8px 10px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid var(--vien); background: var(--the); }
  .ct-viet textarea { min-height: 44px; max-height: 140px; padding: 10px; border: 1px solid #D5D2CD; border-radius: 12px; resize: none; font: inherit; font-size: 15px; }
  .ct-viet textarea:focus { outline: none; border-color: var(--cam); }
  .ct-viet button { width: 48px; border: 0; border-radius: 50%; background: var(--cam); color: #fff; font-size: 20px; font-weight: 700; align-self: end; height: 48px; } .ct-viet button:disabled { opacity: .45; }
  .ct-phien { display: block; width: 100%; text-align: left; padding: 12px 14px; border: 0; border-bottom: 1px solid var(--vien); background: var(--the); font-size: 14.5px; } .ct-phien small { display: block; color: var(--phu); font-size: 12px; margin-top: 2px; } .ct-phien.dang { background: var(--cam-nhat); }
  .ct-dn { padding: 18px 16px; } .ct-dn p { color: var(--phu); font-size: 13.5px; margin: 0 0 12px; } .ct-dn label { display: block; margin: 10px 0 4px; font-size: 13.5px; font-weight: 600; }
  .ct-dn input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #D5D2CD; border-radius: 9px; font: inherit; font-size: 15px; background: #fff; }
  .ct-dn .nut-dn { margin-top: 16px; width: 100%; padding: 12px; border: 0; border-radius: 10px; background: var(--cam); color: #fff; font-weight: 700; font-size: 15px; } .ct-dn .nut-dn:disabled { opacity: .6; }
  /* bảng tiến độ dự án CÓ Baseline (số của agent Tiến độ) — vẽ như web 3004 TomTatGanttTD.tsx, nền tối để nét trắng nhìn thấy (Mr. Đại 01/11/2026) */
  #td-than.td-toi { background: #141414; color: #E7E5E4; }
  .td-toi .td-hang { border-bottom-color: #262626; } .td-toi .td-t { background: #141414; border-right-color: #333; z-index: 4; } /* cột chữ nằm TRÊN thanh khi cuộn ngang */
  .td-toi .td-t.c1, .td-toi .td-t.c2 { color: #F5F5F4; font-weight: 700; } .td-toi .td-t.c3, .td-toi .td-t.c4 { color: #D6D3D1; font-weight: 400; }
  .td-toi .td-tg { color: #A8A29E; }
  .td-toi .td-dau, .td-toi .td-dau .td-t { background: #1F1F1F; color: #D6D3D1; }
  .td-toi .td-th { color: #A8A29E; border-left-color: #333; } .td-toi .td-gach { background: #242424; }
  .td-toi .td-hang.td-sel, .td-toi .td-hang.td-sel .td-t { background: #2A2118; }
  .td-toi .td-homnay { border-left: 2px solid #fbbf24; opacity: .9; }
  .td-pct { flex: none; width: 46px; text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; padding-right: 4px; }
  .td-pct.xanh { color: #4ADE80; } .td-pct.vang { color: #FBBF24; } .td-pct.trang { color: #E7E5E4; }
  .tdb-kh, .tdb-nhom { position: absolute; top: 11px; height: 8px; background: #22c55e; z-index: 2; } .tdb-kh { border-radius: 2px; }
  .tdb-kh.gang, .tdb-moc.gang { box-shadow: 0 0 0 1px #ef4444; }
  .tdb-th, .tdb-cho, .tdb-db { position: absolute; top: 13.5px; height: 3px; z-index: 3; }
  .tdb-th { background: #fff; } .tdb-cho { background: #6b7280; } .tdb-th.tdb-nh, .tdb-cho.tdb-nh { opacity: .75; }
  .tdb-db { background: repeating-linear-gradient(90deg, #fff 0 5px, transparent 5px 8px); opacity: .95; } .tdb-db.gang { background: repeating-linear-gradient(90deg, #ef4444 0 5px, transparent 5px 8px); }
  .tdb-moc { position: absolute; top: 11px; width: 8px; height: 8px; transform: rotate(45deg); background: #22c55e; z-index: 3; box-sizing: border-box; }
  .tdb-moc.dat { background: #fff; } .tdb-moc.db { background: none; border: 1.2px solid #fff; }
  .tdb-cod { position: absolute; top: 30px; bottom: 0; width: 0; border-left: 1.5px solid #22c55e; opacity: .85; z-index: 1; pointer-events: none; } .tdb-cod.db { border-left: 1.5px dashed #fff; }
  .td-chu { position: sticky; left: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 8px 10px 14px; width: 100vw; box-sizing: border-box; font-size: 11.5px; color: #D6D3D1; background: #141414; }
  .td-chu span { display: inline-flex; align-items: center; gap: 4px; } .td-chu .nguon { color: #A8A29E; flex-basis: 100%; }
  .td-chu .cg { display: inline-block; width: 18px; height: 6px; } .td-chu .cg.kh { background: #22c55e; } .td-chu .cg.gang { background: #22c55e; box-shadow: 0 0 0 1px #ef4444; }
  .td-chu .cg.th { height: 3px; background: #fff; } .td-chu .cg.cho { height: 3px; background: #6b7280; } .td-chu .cg.db { height: 3px; background: repeating-linear-gradient(90deg, #fff 0 5px, transparent 5px 8px); }
  .td-chu .cg.hn { width: 2px; height: 10px; background: #fbbf24; } .td-chu .cg.cod { width: 0; height: 10px; border-left: 2px solid #22c55e; } .td-chu .cg.cod.db { border-left: 2px dashed #fff; }
  #td-pop.toi { max-width: min(320px, calc(100% - 16px)); background: #1C1917; border-color: #44403C; color: #F5F5F4; box-shadow: 0 6px 18px rgba(0,0,0,.5); }
  #td-pop.toi .hd { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; } #td-pop.toi .hd span:first-child { color: #A8A29E; white-space: nowrap; }
  #td-pop.toi .hd span:last-child { text-align: right; font-variant-numeric: tabular-nums; } #td-pop.toi .gc { font-size: 11.5px; line-height: 1.35; margin-top: 2px; }
  #td-pop.toi .ch { margin-top: 6px; padding-top: 6px; border-top: 1px solid #44403C; text-align: right; }
  /* nhóm «Việc nằm trên đường găng» đứng đầu tab Dự án — Mr. Đại chốt 01/11/2026 (đỏ = găng, luật màu) */
  .nhom2.nhom-gang { color: var(--do); } .nhom2 .gang { color: var(--do); font-weight: 800; margin-right: 2px; }
  /* ô chọn dự án ở đầu khung Trợ lý — Mr. Đại duyệt demo «demo-apk-tro-ly-chon-du-an.html» 01/11/2026 (kiểm độc lập AP-01) */
  .chon-da { flex: none; position: relative; padding: 8px 10px; background: var(--the); border-bottom: 1px solid var(--vien); }
  .chon-da .nhan { font-size: 12px; color: var(--phu); margin-bottom: 3px; }
  .chon-da .nut-da { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 12px; border: 1px solid #D5D2CD; border-radius: 10px; background: #fff; text-align: left; font-size: 14.5px; font-weight: 600; }
  .chon-da .nut-da .ten { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .chon-da .nut-da .ten.loi { color: var(--do); } .chon-da .nut-da .ten.trong { color: var(--phu); font-weight: 500; }
  .chon-da .nut-da .mui { color: var(--phu); transition: transform .15s; } .chon-da.mo .nut-da { border-color: var(--cam); box-shadow: 0 0 0 2px var(--cam-nhat); } .chon-da.mo .mui { transform: rotate(180deg); }
  .ds-da { position: absolute; left: 10px; right: 10px; top: calc(100% - 4px); z-index: 5; max-height: 60vh; overflow-y: auto; background: #fff; border: 1px solid #D5D2CD; border-radius: 12px; box-shadow: 0 10px 28px rgba(0,0,0,.25); }
  .ds-da .tim-da { position: sticky; top: 0; display: block; width: 100%; box-sizing: border-box; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--vien); font: inherit; font-size: 14.5px; background: #fff; }
  .ds-da .tim-da:focus { outline: none; }
  .ds-da button { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 11px 12px; border: 0; border-bottom: 1px solid var(--vien); background: none; font-size: 14.5px; }
  .ds-da button:last-child { border-bottom: 0; } .ds-da button .dau-chon { flex: none; width: 16px; color: var(--cam-chu); font-weight: 800; }
  .ds-da button.dang { background: var(--cam-nhat); font-weight: 700; } .ds-da button small { margin-left: auto; color: var(--phu); font-size: 11.5px; white-space: nowrap; }
  .ds-da .trong-da { padding: 12px; color: var(--phu); font-size: 13.5px; }
  #man-chat.co-ds-da #chat-than, #man-chat.co-ds-da #chat-viet { filter: brightness(.82); }
  .ct-viet textarea:disabled { background: #F4F2EE; }
</style>
</head>
<body>
<div id="trang"><div id="may">
  <div class="top">
    <h1>SCI Công việc</h1>
    <button class="chuong" id="b-qh" aria-label="Chỉ hiện việc quá hạn" aria-pressed="false"><span class="qh-cham">!</span></button>
    <button class="chuong" id="b-tim" aria-label="Tìm việc"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg></button>
    <button class="chuong" id="b-ch" aria-label="Cấu hình"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
    <button class="chuong" id="b-chuong" aria-label="Thông báo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>
      <span class="so" id="so" style="display:none"></span>
    </button>
  </div>
  <div id="o-tim" class="o-tim" style="display:none">
    <select id="tim-loai" aria-label="Lọc việc"><option value="">Tất cả việc</option><option value="chua">Việc chưa giao chuyển tiếp</option><option value="da">Việc đã giao chuyển tiếp</option></select>
    <div class="tim-hang"><input id="tim-q" type="search" enterkeyhint="search" placeholder="Gõ tên việc cần tìm — hiện ngay bên dưới, bấm Enter để đóng" autocomplete="off" spellcheck="false"><button id="tim-xoa" aria-label="Xoá chữ tìm">×</button></div>
  </div>
  <div id="hop"><span class="chu" id="hop-chu"></span></div>
  <div id="than"></div>
  <button id="nutgiao" aria-label="Giao việc">+</button>
  <nav class="duoi" id="duoi">
    <button data-t="toi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>Việc của tôi</button>
    <button data-t="pb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></svg>Phòng ban</button>
    <button data-t="da"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/></svg>Dự án</button>
    <button data-t="ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>Phòng họp</button>
    <button data-t="chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>Trợ lý</button>
  </nav>

  <div id="man-chon"><div class="chon-khung"><div class="chon-dau"><b id="chon-tieu"></b><button id="chon-dong" aria-label="Đóng">✕</button></div><input id="chon-q" type="search" placeholder="Gõ tên phòng hoặc tên người để tìm…" autocomplete="off"><div id="chon-ds"></div></div></div>
  <div class="tang" id="man-tb">
    <div class="tb-dau"><button class="lui" id="tb-lui" aria-label="Quay lại">‹</button><b>Thông báo</b><button class="doc-het" id="doc-het">Đánh dấu đã đọc hết</button></div>
    <div id="ds-tb"></div>
    <div class="tb-chan"><button id="tb-da-doc">Xem tin đã đọc</button></div>
  </div>
  <div class="tang" id="man-td">
    <div class="tb-dau"><button class="lui" id="td-lui" aria-label="Quay lại">‹</button><b id="td-ten"></b><button class="td-c" id="td-c2">C2</button><button class="td-c" id="td-c3">C3</button><button class="td-c" id="td-nho" aria-label="Thu nhỏ trục thời gian">−</button><button class="td-c" id="td-lon" aria-label="Phóng to trục thời gian">+</button></div>
    <div id="td-than"></div>
    <div id="td-pop"></div>
  </div>
  <div class="tang" id="man-xem" style="background:#fff;flex-direction:column;z-index:30">
    <div class="tb-dau"><button class="lui" id="xem-lui" aria-label="Đóng">‹</button><b id="xem-ten" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></b><button class="doc-het" id="xem-nho" aria-label="Thu nhỏ" style="font-size:20px">－</button><button class="doc-het" id="xem-lon" aria-label="Phóng to" style="font-size:20px">＋</button><button class="doc-het" id="xem-tai">Tải về</button></div>
    <div id="xem-than" style="flex:1;overflow:hidden;display:flex;flex-direction:column;background:#E9E6E1"></div>
  </div>
  <div class="tang" id="man-ch" style="background:var(--the);flex-direction:column">
    <div class="tb-dau"><button class="lui" id="ch-lui" aria-label="Quay lại">‹</button><b>Cấu hình</b></div>
    <div id="ds-ch" style="flex:1;overflow-y:auto"></div>
  </div>
  <div class="tang" id="man-cd" style="background:var(--the);flex-direction:column">
    <div class="tb-dau"><button class="lui" id="cd-lui" aria-label="Quay lại">‹</button><b>Giữ thông báo không bị lỡ</b></div>
    <div id="ds-cd" style="flex:1;overflow-y:auto"></div>
  </div>
  <div class="tang" id="man-chat">
    <div class="tb-dau"><button class="lui" id="chat-lui" aria-label="Quay lại">‹</button><b id="chat-ten">Trợ lý Main</b><button class="doc-het" id="chat-ds-nut">Phiên cũ</button><button class="doc-het" id="chat-moi">+ Mới</button></div>
    <div class="chon-da" id="chat-da" style="display:none"></div>
    <div id="chat-than"></div>
    <div class="ct-viet" id="chat-viet"><textarea id="chat-o" rows="1" placeholder="Nhắn cho trợ lý Main…" enterkeyhint="send"></textarea><button id="chat-gui" aria-label="Gửi">↑</button></div>
  </div>
  <div class="man" id="man"><div class="khung" id="khung"></div></div>
  <div id="toast"></div>

  <div class="dn" id="man-dn">
    <h1>SCI Công việc 3004</h1>
    <p>Đăng nhập bằng tài khoản SCI Công việc. Chỉ phải đăng nhập một lần trên máy này. Địa chỉ máy chủ là IP máy tính chạy 3004 trong mạng Wi-Fi, ví dụ http://192.168.1.10:3004 (điện thoại không vào được «localhost» của máy tính).</p>
    <form id="dn-f">
      <label for="dn-e">Email</label><input id="dn-e" type="email" autocomplete="username" required>
      <label for="dn-m">Mật khẩu</label><input id="dn-m" type="password" autocomplete="current-password" required>
      <label for="dn-s">Địa chỉ máy chủ</label><input id="dn-s" type="url" spellcheck="false" autocapitalize="off" placeholder="Gõ địa chỉ, ví dụ http://192.168.1.10:3004">
      <button id="dn-b" type="submit">Đăng nhập</button>
      <div id="dn-loi"></div>
    </form>
  </div>
</div></div>
<script src="thuan.js"></script>
<script src="app.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ra, "index.html"), html);
console.log("đã ghép index.html + thuan.js vào", ra);

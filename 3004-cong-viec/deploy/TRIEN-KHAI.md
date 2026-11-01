# Đưa SCI công việc lên máy chủ Vietnix (giai đoạn 6)

Máy chủ đã đo 24/09/2026: còn 4,6 GB RAM, 164 GB đĩa; PostgreSQL 17, Valkey, Garage chạy sẵn.
SCI công việc dùng chung PostgreSQL nhưng **CSDL riêng `scidocflow`** và kho file riêng; không đụng các web đang chạy
(Pháp lý, AI tư vấn, hptai.vn, proxygiasoc) và CSDL hptbim.

## Việc cần bố/anh làm trước (con không tự làm được)
1. Trỏ DNS `docflow.scigroup.vn` (bản ghi A) về IP máy chủ Vietnix.
2. Tạo kho GitHub cho `CodeSCICongViec` và cho máy chủ quyền đọc (deploy key).
3. Cho con (hoặc người triển khai) quyền SSH vào máy chủ.

## Các bước
```bash
# 1. Lấy code
sudo mkdir -p /srv/scidocflow && sudo chown $USER /srv/scidocflow
git clone <kho GitHub> /srv/scidocflow && cd /srv/scidocflow

# 1b. LibreOffice (miễn phí) để xem trước file .doc/.xls/.ppt đời cũ trên web — app tự dò /usr/bin/soffice
sudo apt-get install -y libreoffice-writer libreoffice-calc libreoffice-impress fonts-dejavu fonts-liberation

# 2. CSDL riêng (sửa mật khẩu trong file trước)
sudo -u postgres psql -f deploy/tao-csdl.sql

# 3. Biến môi trường
cat > .env.local <<ENV
AUTH_SECRET=<chuỗi ngẫu nhiên ≥32 ký tự; dùng CHUNG khóa SSO sci_session với các agent nếu muốn đăng nhập một lần>
DATABASE_URL=postgresql://scidocflow:<mật khẩu>@localhost:5432/scidocflow
DOCFLOW_KHONG_GIEO_NGUOI_MAU=1   # máy thật: không tạo người dùng mẫu, nhập danh sách thật từ Excel
ENV

# 4. Build + chạy (pm2 tiến trình scidocflow, cổng 3004)
deploy/cap-nhat.sh

# 5. Nginx + HTTPS
sudo cp deploy/nginx-docflow.conf /etc/nginx/sites-available/docflow.scigroup.vn
sudo ln -s /etc/nginx/sites-available/docflow.scigroup.vn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d docflow.scigroup.vn

# 6. Sao lưu 04:30 hằng ngày + phục hồi thử
crontab -e     # 30 4 * * * /srv/scidocflow/deploy/sao-luu.sh >> /var/log/scidocflow-sao-luu.log 2>&1
deploy/sao-luu.sh && deploy/phuc-hoi-thu.sh /srv/sao-luu/scidocflow/<bản vừa tạo>
```

Lần chạy đầu app tự tạo lược đồ (`db/*.sql`) và gieo 9 đơn vị, vai trò, 9 mẫu Word, thư mục phòng ban.
Tài khoản quản trị đầu tiên: khi `DOCFLOW_KHONG_GIEO_NGUOI_MAU=1`, tạo bằng lệnh SQL hoặc tạm bỏ biến này
để có `quantri@scigroup.vn / Sci@2026`, đăng nhập đổi mật khẩu ngay rồi nhập người dùng thật từ Excel.

## Kiểm tra sau khi lên ("Xong khi" của giai đoạn 6)
- `curl -I https://docflow.scigroup.vn/login` trả 200; `pm2 ls` thấy `scidocflow` online.
- Các web khác vẫn bình thường: `pm2 ls` không đổi các tiến trình khác; mở thử từng tên miền.
- Chạy thí điểm một kỳ báo cáo tuần thật: 4 đơn vị → 2 phòng chủ quản → Báo cáo hợp nhất; kiến nghị được TGĐ quyết định thành việc trong sổ cái.
- Phục hồi thử bản sao lưu thành công (`deploy/phuc-hoi-thu.sh`).

## Chưa làm (để sau thí điểm)
- Kho file Garage S3: hiện lưu đĩa `data/files` (có giao diện `ghiTep/docTep` sẵn để thay).
- Valkey + BullMQ cho việc nền: hiện đọc Word/kiểm tra chạy ngay trong yêu cầu, nhắc hạn chạy bằng bộ hẹn giờ trong tiến trình.
- Email nhắc việc: cần hộp thư gửi (cấu hình `thong_bao.email_gui`).

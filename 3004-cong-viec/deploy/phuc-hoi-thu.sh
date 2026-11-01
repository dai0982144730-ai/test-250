#!/usr/bin/env bash
# Phục hồi THỬ bản sao lưu vào CSDL tạm "scidocflow_phuchoi" (không đụng CSDL đang chạy) rồi kiểm tra.
# Điều kiện "Xong khi" giai đoạn 6: phục hồi thử từ bản sao lưu thành công.
#   deploy/phuc-hoi-thu.sh /srv/sao-luu/scidocflow/2026-10-01_0430
set -euo pipefail
BAN="${1:?Chỉ ra thư mục bản sao lưu}"
sha256sum -c "$BAN/SHA256SUMS"
sudo -u postgres dropdb --if-exists scidocflow_phuchoi
sudo -u postgres createdb scidocflow_phuchoi
sudo -u postgres pg_restore --no-owner -d scidocflow_phuchoi "$BAN/scidocflow.dump"
sudo -u postgres psql -d scidocflow_phuchoi -Atc "SELECT 'lich_su', count(*) FROM docflow.lich_su UNION ALL SELECT 'tai_lieu', count(*) FROM docflow.tai_lieu UNION ALL SELECT 'viec_dang_mo', count(*) FROM docflow.so_cai"
echo "Số file trong kho: $(find "$BAN/files" -type f | wc -l)"
echo "Phục hồi thử xong. Xóa CSDL tạm: sudo -u postgres dropdb scidocflow_phuchoi"

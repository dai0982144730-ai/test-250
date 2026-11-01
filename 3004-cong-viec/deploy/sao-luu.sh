#!/usr/bin/env bash
# Sao lưu hằng ngày 04:30: CSDL + kho file. Lịch sử KHÔNG BAO GIỜ bị cắt (sao lưu toàn bộ).
# crontab -e:   30 4 * * *  /srv/scidocflow/deploy/sao-luu.sh >> /var/log/scidocflow-sao-luu.log 2>&1
set -euo pipefail
APP_DIR="${APP_DIR:-/srv/scidocflow}"
DICH="${DICH:-/srv/sao-luu/scidocflow}"
GIU_NGAY="${GIU_NGAY:-30}"          # khớp cấu hình giao_dien.so_ngay_giu_sao_luu
NGAY="$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DICH/$NGAY"
# Đọc DATABASE_URL từ .env.local
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env.local" | cut -d= -f2-)"
pg_dump --format=custom --no-owner "$DATABASE_URL" > "$DICH/$NGAY/scidocflow.dump"
# Kho file: nội dung theo mã băm, không đổi sau khi ghi → rsync tăng dần với bản trước bằng hard link
TRUOC="$(ls -1d "$DICH"/*/ 2>/dev/null | grep -v "$NGAY" | tail -1 || true)"
if [ -n "$TRUOC" ] && [ -d "$TRUOC/files" ]; then
  rsync -a --link-dest="$TRUOC/files" "$APP_DIR/data/files/" "$DICH/$NGAY/files/"
else
  rsync -a "$APP_DIR/data/files/" "$DICH/$NGAY/files/"
fi
sha256sum "$DICH/$NGAY/scidocflow.dump" > "$DICH/$NGAY/SHA256SUMS"
find "$DICH" -mindepth 1 -maxdepth 1 -type d -mtime +"$GIU_NGAY" -exec rm -rf {} +
echo "$(date -Is) sao lưu xong: $DICH/$NGAY"

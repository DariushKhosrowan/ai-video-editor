#!/usr/bin/env bash
# دوبار کلیک (یا: ./build.sh videos/اسم-ویدیو). اگر پوشه ندهی، فهرست ویدیوها را می‌پرسد.
cd "$(dirname "$0")"
VID="$1"
if [ -z "$VID" ]; then
  echo "ویدیوها:"; ls -d videos/*/ | grep -v _new-video | nl
  read -p "شماره‌ی ویدیو را بزن: " N
  VID=$(ls -d videos/*/ | grep -v _new-video | sed -n "${N}p")
fi
if ! python3 -c "import playwright, yaml" 2>/dev/null; then
  echo "❌ پیش‌نیازها نصب نیست. یک بار این‌ها را بزن:"; echo "   pip install -r requirements.txt && python3 -m playwright install chromium"; read -p "Enter..."; exit 1
fi
command -v ffmpeg >/dev/null || { echo "❌ ffmpeg نصب نیست:  sudo apt install ffmpeg"; read -p "Enter..."; exit 1; }
python3 -m khordegir build "$VID" "${@:2}"
echo; read -p "تمام شد. Enter برای بستن..."

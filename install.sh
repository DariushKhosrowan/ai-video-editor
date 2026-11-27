#!/usr/bin/env bash
# ==============================================================================
# Khordegir Studio — Universal 1-Command Installer & Updater
# استودیو خردگیر — اسکریپت نصب و بروزرسانی یک‌دستوری خودکار
#
# Usage:
#   bash install.sh           # Fresh installation / نصب اولیه
#   bash install.sh --update  # Update code & dependencies / بروزرسانی
#   bash install.sh --start   # Install and run immediately / نصب و اجرای فوری
#   npm run setup             # via npm / اجرا از طریق npm
#   npm run update            # via npm / بروزرسانی از طریق npm
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "    استودیو خردگیر | Khordegir Studio Installer & Updater"
echo "=========================================================="
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

IS_UPDATE=false
AUTO_START=false

for arg in "$@"; do
  case "$arg" in
    --update|-u)
      IS_UPDATE=true
      ;;
    --start|-s)
      AUTO_START=true
      ;;
  esac
done

if [ "$IS_UPDATE" = true ]; then
  echo -e "${AMBER}🔄 در حال بررسی و دریافت آخرین بروزرسانی‌ها...${NC}"
  if [ -d ".git" ]; then
    echo "• Git repository detected: pulling latest changes..."
    git pull --rebase || echo -e "${AMBER}⚠️ هشدار: دریافت خودکار از گیت انجام نشد، ادامه با فایل‌های موجود.${NC}"
  fi
fi

# 1. Check Node.js
echo -e "${CYAN}▶ ۱. بررسی پیش‌نیاز Node.js...${NC}"
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ خطا: Node.js روی این سیستم نصب نیست.${NC}"
  echo "لطفاً ابتدا Node.js نسخه ۲۰ یا بالاتر را نصب کنید: https://nodejs.org/"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d'.' -f1)
echo -e "   ✓ نسخه Node.js موجود: ${GREEN}v$NODE_VER${NC}"

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${AMBER}⚠️ پیشنهاد: برای عملکرد بهینه، Node.js نسخه ۲۰ یا بالاتر توصیه می‌شود.${NC}"
fi

# 2. Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}❌ خطا: npm پیدا نشد.${NC}"
  exit 1
fi

# 3. Install npm dependencies
echo -e "${CYAN}▶ ۲. نصب و همگام‌سازی وابستگی‌های برنامه (npm dependencies)...${NC}"
npm install --no-audit --prefer-offline || npm install

# 4. Optional Python environment check (if python tooling present)
echo -e "${CYAN}▶ ۳. بررسی ابزارهای اختیاری...${NC}"
if command -v python3 >/dev/null 2>&1; then
  echo -e "   ✓ پایتون موجود است: $(python3 --version)"
  if [ -f "khordegir-studio/requirements.txt" ]; then
    echo "   • نصب پیش‌نیازهای پایتون استودیو..."
    python3 -m pip install -r khordegir-studio/requirements.txt --quiet || true
  fi
else
  echo "   • پایتون نصب نیست (محیط وب Node.js کاملاً مستقل و خودکفا است)."
fi

# 5. Run Verification Tests
echo -e "${CYAN}▶ ۴. بررسی صحت کارکرد و اجرای تست‌های داخلی...${NC}"
npm test

echo -e "\n${GREEN}${BOLD}=========================================================="
echo "  ✅ نصب و پیکربندی استودیو با موفقیت کامل شد!"
echo "==========================================================${NC}"
echo -e "${BOLD}راه‌های اجرای استودیو:${NC}"
echo -e "  • اجرای سرور:       ${CYAN}npm start${NC}  (یا ${CYAN}npm run dev${NC})"
echo -e "  • بروزرسانی در آینده: ${CYAN}npm run update${NC}  (یا ${CYAN}bash install.sh --update${NC})"
echo ""
echo -e "${BOLD}آدرس‌های کلیدی در مرورگر:${NC}"
echo -e "  • پنل تدوین و اسلایدها:   ${GREEN}http://localhost:3000/editor${NC}"
echo -e "  • کنسول پخش زنده پادکست:  ${GREEN}http://localhost:3000/obs${NC}"
echo -e "  • سورس بروزر برای OBS:     ${GREEN}http://localhost:3000/obs-stage${NC}"
echo -e "${GREEN}==========================================================${NC}\n"

if [ "$AUTO_START" = true ]; then
  echo -e "${CYAN}🚀 در حال راه‌اندازی استودیو...${NC}"
  npm start
fi

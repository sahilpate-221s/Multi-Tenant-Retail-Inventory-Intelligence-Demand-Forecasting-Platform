#!/usr/bin/env bash
set -uo pipefail

API_URL="${API_URL:-https://multi-tenant-retail-inventory.onrender.com}"
FRONTEND_URL="${FRONTEND_URL:-https://multi-tenant-retail-inventory-intel.vercel.app}"
ML_URL="${ML_URL:-${ML_SERVICE_URL:-}}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local title="$1"
  local url="$2"
  local pattern="$3"

  printf "  %-35s" "$title"
  response=$(curl -sf --max-time 30 "$url" 2>&1) || {
    printf "${RED}[FAIL] (unreachable)${NC}\n"
    FAIL=$((FAIL + 1))
    return
  }

  if [ -n "$pattern" ]; then
    if echo "$response" | grep -qi "$pattern"; then
      printf "${GREEN}[PASS]${NC}\n"
      PASS=$((PASS + 1))
    else
      printf "${RED}[FAIL] (pattern not found)${NC}\n"
      FAIL=$((FAIL + 1))
    fi
  else
    printf "${GREEN}[PASS]${NC}\n"
    PASS=$((PASS + 1))
  fi
}

check_http_200() {
  local title="$1"
  local url="$2"

  printf "  %-35s" "$title"
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url") || status="000"
  if [ "$status" = "200" ]; then
    printf "${GREEN}[PASS] (HTTP 200)${NC}\n"
    PASS=$((PASS + 1))
  else
    printf "${RED}[FAIL] (HTTP %s)${NC}\n" "$status"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}   StockPilot Production Smoke Test Runner        ${NC}"
echo -e "${CYAN}==================================================${NC}"
echo "API URL:      $API_URL"
echo "Frontend URL: $FRONTEND_URL"
if [ -n "$ML_URL" ]; then echo "ML URL:       $ML_URL"; fi
echo ""

echo -e "${YELLOW}[1/3] Backend API Health Checks${NC}"
check "Backend /live" "$API_URL/live" "alive"
check "Backend /ready (DB + Redis)" "$API_URL/ready" "ready"
check "Backend /health" "$API_URL/health" "stockpilot-backend"

if [ -n "$ML_URL" ]; then
  echo ""
  echo -e "${YELLOW}[2/3] ML Service Health Checks${NC}"
  check "ML /live" "$ML_URL/live" "alive"
  check "ML /ready" "$ML_URL/ready" "ready"
  check "ML /health" "$ML_URL/health" "ok"
else
  echo ""
  echo -e "\033[0;90m[2/3] ML Service Health Checks (Skipped: set ML_URL to test)\033[0m"
fi

echo ""
echo -e "${YELLOW}[3/3] Frontend Availability & Deep Links${NC}"
check_http_200 "Frontend Root (/)" "$FRONTEND_URL"
check_http_200 "Frontend Deep Link (/login)" "$FRONTEND_URL/login"
check_http_200 "Frontend Deep Link (/register)" "$FRONTEND_URL/register"

echo ""
echo -e "${CYAN}==================================================${NC}"
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}Results: $PASS PASSED, $FAIL FAILED${NC}"
else
  echo -e "${RED}Results: $PASS PASSED, $FAIL FAILED${NC}"
fi
echo -e "${CYAN}==================================================${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0

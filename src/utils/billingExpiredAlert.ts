/** 이용 기간 만료 시 안내 (로그인·메뉴 이동·결제 필요 리다이렉트) */
export const BILLING_EXPIRED_ALERT_MESSAGE =
  '이용기간이 만료 되었습니다.\n선택된 요금제에 맞게 요금결제 후 이용 가능합니다.'

export function showBillingExpiredAlert(): void {
  window.alert(BILLING_EXPIRED_ALERT_MESSAGE)
}

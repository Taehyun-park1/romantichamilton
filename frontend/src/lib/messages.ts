const messageMap: Record<string, string> = {
  admin_required: '관리자 권한이 필요합니다.',
  contact_send_failed: '문의 메일을 보내지 못했습니다.',
  contact_service_unavailable: '문의 서비스를 잠시 사용할 수 없습니다.',
  duplicate_key: '이미 등록된 항목입니다.',
  invalid_contact_payload: '입력한 문의 정보를 다시 확인해 주세요.',
  invalid_review_invite_payload: '리뷰 요청 정보를 다시 확인해 주세요.',
  invalid_reservation_confirmation_payload: '예약 확정 메일 정보를 다시 확인해 주세요.',
  new_row_violates_row_level_security_policy: '권한이 없어 저장할 수 없습니다.',
  reservation_confirmation_email_failed: '예약 확정 메일을 보내지 못했습니다.',
  reservation_confirmation_email_unavailable: '예약 확정 메일 서비스를 잠시 사용할 수 없습니다.',
  reservation_email_missing: '예약자 이메일을 찾지 못했습니다.',
  reservation_lookup_failed: '예약 정보를 확인하지 못했습니다.',
  reservation_not_found: '예약 정보를 찾지 못했습니다.',
  resend_not_configured: '메일 발송 설정이 필요합니다.',
  resend_send_failed: '메일 발송에 실패했습니다.',
  review_invite_email_failed: '리뷰 요청 메일을 보내지 못했습니다.',
  review_invite_email_unavailable: '리뷰 요청 메일 서비스를 잠시 사용할 수 없습니다.',
  supabase_admin_not_configured: '관리자 서버 설정이 필요합니다.',
  supabase_rest_not_configured: '데이터베이스 연결 설정이 필요합니다.',
};

const partialMessageMap: Array<[RegExp, string]> = [
  [/Failed to fetch/i, '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'],
  [/Invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않습니다.'],
  [/Email not confirmed/i, '이메일 인증 후 로그인해 주세요.'],
  [/User already registered/i, '이미 가입된 이메일입니다.'],
  [/Password should be at least/i, '비밀번호는 6자 이상 입력해 주세요.'],
  [/row-level security/i, '권한이 없어 저장할 수 없습니다.'],
  [/duplicate key/i, '이미 등록된 항목입니다.'],
  [/violates foreign key constraint/i, '연결된 데이터를 찾지 못했습니다.'],
  [/violates not-null constraint/i, '필수 정보가 누락되었습니다.'],
  [/JWT expired/i, '로그인이 만료되었습니다. 다시 로그인해 주세요.'],
];

function normalizeMessageKey(message: string) {
  return message
    .trim()
    .replace(/["'.]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

export function getKoreanErrorMessage(error: unknown, fallback = '처리 중 오류가 발생했습니다.') {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!rawMessage) return fallback;

  const exactMessage = messageMap[rawMessage] ?? messageMap[normalizeMessageKey(rawMessage)];

  if (exactMessage) return exactMessage;

  const partialMatch = partialMessageMap.find(([pattern]) =>
    pattern.test(rawMessage)
  );

  return partialMatch?.[1] ?? fallback;
}

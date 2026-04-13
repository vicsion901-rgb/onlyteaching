/**
 * 비밀번호를 SHA-256 해시로 변환 (클라이언트 사이드).
 * DevTools Payload에 평문 비밀번호가 노출되지 않도록 함.
 * 서버에서는 이 해시값을 다시 bcrypt로 해시하여 저장.
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

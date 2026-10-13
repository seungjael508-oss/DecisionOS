/**
 * 최신 상담 1건의 최종 접촉 결과를 판정한다(화면 조회용 파생값, DB 저장 없음).
 * 1) 저장 시 고른 결과 태그(부재·상담거절)가 있으면 그 값
 * 2) 상담내용에서 가장 뒤에 나온 결과 표현("통화했으나 상담 거절" → 상담거절, "이전엔 부재, 오늘 정상 통화" → 접촉완료)
 * 3) 아무 신호도 없으면 접촉완료 — "문자발송"만 있는 기록을 부재로 보지 않는다
 * 공백을 지운 뒤 비교하므로 "통화 안 됨"과 "통화안됨"은 같은 키워드다.
 */
export type ContactOutcome = 'CONTACTED' | 'REFUSED' | 'ABSENT';

// 실제 통화가 끝났다는 표현만. "통화 중"·"통화 시도"·"통화해야"는 완료가 아니므로 넣지 않는다.
// "안내 완료"는 "부재중 문자 안내 완료"처럼 부재 기록에도 쓰여 제외
const COMPLETED = /통화완료|통화함|통화했|통화됨|통화후|통화하여|통화하였|정상통화|통화성공|상담완료/g;
// 맨 "거절"은 "대출 거절"(잔금대출 심사)과 겹치므로 상담·통화·연락 대상이 붙은 표현만 본다
const REFUSED = /(상담|통화|전화|연락|응대)(거절|거부)|수신거부|연락(을)?원치않|연락하지말|연락금지/g;
// "안 받음"만으로는 "대출 안 받음"과 구분되지 않아 반드시 "전화"가 앞에 붙은 경우만 부재로 본다
const ABSENT = /부재|미수신|미응답|무응답|불통|연락(불능|불가|안됨|두절)|통화(안됨|불가|못함|실패)|연결안됨|전화(를)?(안받|받지않)|결번|없는번호|번호(오류|확인)|연락처확인|재통화필요|재연락필요|미접촉|전원(이)?꺼|꺼져있/g;

function lastMatchEnd(pattern: RegExp, text: string): number {
  let end = -1;
  for (const match of text.matchAll(pattern)) end = match.index + match[0].length;
  return end;
}

export function classifyContactOutcome(tagGrade: unknown, content: string | null | undefined): ContactOutcome {
  if (tagGrade === '부재') return 'ABSENT';
  if (tagGrade === '상담거절') return 'REFUSED';
  const text = (content ?? '').replace(/\s+/g, '');
  const candidates: [ContactOutcome, number][] = [
    ['CONTACTED', lastMatchEnd(COMPLETED, text)], ['REFUSED', lastMatchEnd(REFUSED, text)], ['ABSENT', lastMatchEnd(ABSENT, text)],
  ];
  const [outcome, end] = candidates.reduce((best, c) => c[1] > best[1] ? c : best);
  return end < 0 ? 'CONTACTED' : outcome;
}

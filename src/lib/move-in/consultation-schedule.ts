import { isConfirmedBalancePaid } from '@/lib/move-in/balance-paid';

/** Display-only projection; never contains consultation text, identity or timestamps. */
export type ConsultationScheduleBadge = { kind: 'balance' | 'moveIn'; label: string };
export type ScheduleContact = {
  project_id: string; unit_id: string; customer_id: string; id: string;
  consulted_at: string; content?: string | null;
};
export type ScheduleIdentity = {
  projectId: string; unitId: string; currentCustomerId: string; currentGrade: string | null;
  balancePaidAt?: string | null; fieldConfirmedBalancePaid?: boolean; actualMoveInDate?: string | null;
};
type Kind = ConsultationScheduleBadge['kind'];
type Events = Partial<Record<Kind, string | null>>;
const topic = /잔금(?:\s*(?:납부|지급|입금|완납))?|입주/g;
// A supplied tentative date is displayable; alternatives/questions still lack one usable plan.
const ambiguous = /[?？]|또는|혹은|아니면/;
const cancelled = /취소|철회|보류|무산|없음|안\s*함|않기/;
const tenant = /임차인|세입자|전세|임대/;
const loan = /대출|융자/;
const unknownReplacement = /미정|변경|연기|취소|철회|보류|무산|없음|날짜\s*확인|일정\s*확인/;
const datePattern = /(?:(\d{4})(?:년\s*|[-./]))?(\d{1,2})(?:월\s*|[-./])(\d{1,2})(?:일)?/g;

function exactDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1900 && year <= 2300 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Keep approximate/bounded precision without sending the rest of the private note. */
function withPrecision(label: string, tail: string): string {
  const qualifier = tail.match(/^\s*(이후|이전|전후|정도|쯤|경)/)?.[1];
  return qualifier ? `${label}${/^(쯤|경)$/.test(qualifier) ? '' : ' '}${qualifier}` : label;
}

function dateLabel(text: string, consultedAt: string, now: Date): string | null {
  if (cancelled.test(text)) return null;
  const period = text.match(/(?<!\d)(\d{1,2})\s*월\s*(초순|중순|하순|상순|초|중|말)?\s*(?:이나|또는|혹은|[~〜～–-])\s*(\d{1,2})\s*월\s*(초순|중순|하순|상순|초|중|말)?/);
  if (period) {
    const first = Number(period[1]), last = Number(period[3]);
    const rest = text.slice(0, period.index) + text.slice(period.index! + period[0].length);
    if (first < 1 || first > 12 || last < 1 || last > 12 || /[\d~〜～–?？]|초|중순|하순|상순|말/.test(rest)) return null;
    return `${first}월${period[2] ? ` ${period[2]}` : ''}~${last}월${period[4] ? ` ${period[4]}` : ''}`;
  }
  if (ambiguous.test(text)) return null;
  if (/(초|중|말|상순|중순|하순)\s*\/\s*(초|중|말|상순|중순|하순)/.test(text)) return null;
  // Month ranges preserve their original granularity; no day is invented.
  const range = text.match(/(?<!\d)(\d{1,2})\s*월?\s*[~〜～–-]\s*(\d{1,2})\s*월/);
  if (range) {
    const first = Number(range[1]), last = Number(range[2]);
    if (first < 1 || first > 12 || last < 1 || last > 12) return null;
    const rest = text.slice(0, range.index) + text.slice(range.index! + range[0].length);
    if (/[\d~〜～–]|초|중순|하순|상순|말/.test(rest)) return null;
    return `${first}~${last}월`;
  }
  const matches = [...text.matchAll(datePattern)];
  if (matches.length) {
    if (matches.length === 2) {
      const [first, last] = matches;
      const join = text.slice(first.index! + first[0].length, last.index).trim();
      if (/^[~〜～–-]$/.test(join)) {
        const labels = matches.map(m => {
          const year = Number(m[1] ?? consultedAt.slice(0, 4));
          return exactDate(year, Number(m[2]), Number(m[3])) && (!m[1] || year >= now.getUTCFullYear())
            ? `${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}` : null;
        });
        return labels.every(Boolean) ? withPrecision(labels.join('~'), text.slice(last.index! + last[0].length)) : null;
      }
    }
    // Only an explicit replacement permits two different dates in one phrase.
    if (matches.length > 1 && !/에서[\s\S]*로\s*변경|(?:→|->)[\s\S]*변경/.test(text)) return null;
    const match = matches.at(-1)!;
    const year = match[1] ? Number(match[1]) : Number(consultedAt.slice(0, 4));
    const month = Number(match[2]), day = Number(match[3]);
    if (!exactDate(year, month, day)) return null;
    if (match[1] && year < Number(now.toISOString().slice(0, 4))) return null;
    // Reject date-like suffixes rather than truncate a malformed date.
    if (/^[\d./~〜～–-]/.test(text.slice(match.index! + match[0].length).trimStart())) return null;
    return withPrecision(`${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`, text.slice(match.index! + match[0].length));
  }
  const month = text.match(/(?<!\d)(\d{1,2})\s*월\s*(초순|중순|하순|상순|초|중|말)?/);
  if (!month || Number(month[1]) < 1 || Number(month[1]) > 12) return null;
  const rest = text.slice(0, month.index) + text.slice(month.index! + month[0].length);
  if (/[\d~〜～–]|초|중순|하순|상순|말/.test(rest)) return null;
  return withPrecision(`${Number(month[1])}월${month[2] ? ` ${month[2]}` : ''}`, text.slice(month.index! + month[0].length));
}

export type ConsultationScheduleMode = "floorplan" | "today";
const callbackDateFirst = /(?<!\d)(?:\d{4}년\s*)?(?:\d{1,2}월\s*\d{1,2}일?|\d{1,2}[-./]\d{1,2})\s*(?:에\s*)?(?:전화\s*통화|전화|통화|콜|재통화)\s*(?:예정|약속|하기로|하기)?/g;
const callbackWordFirst = /(?:다음\s*콜|다시\s*전화|재통화|전화\s*통화|통화\s*예정|콜백)\s*[:：]?\s*(?:\d{4}년\s*)?(?:\d{1,2}월\s*\d{1,2}일?|\d{1,2}[-./]\d{1,2})/g;
const notConfirmed = /미확정|미정|확정(?:되지|은|이|을|를|하진|하지)\s*(?:않|못|안)|확정\s*(?:안|못)/;

function eventsOf(contact: ScheduleContact, now: Date, mode: ConsultationScheduleMode): Events {
  const events: Events = {};
  let pendingDate: string | null = null;
  const raw = contact.content?.normalize('NFKC') ?? '';
  const text = mode === 'today' ? raw.replace(callbackDateFirst, ' ').replace(callbackWordFirst, ' ') : raw;
  // A prose slash separates activities; a slash within a date or month qualifier does not.
  for (const clause of text.split(/[\n;,]|(?<=[!?。])\s+|\s+\/\s*|\/(?!\s*(?:\d|초|중|말|상순|중순|하순))/)) {
    if (/(?:기존|이전|모든|전체)?\s*(?:일정|계획)[\s\S]*(?:취소|변경|미정|연기|보류)/.test(clause) && !/잔금|입주/.test(clause)) {
      events.balance = null; events.moveIn = null;
      pendingDate = null;
      continue;
    }
    const topics = [...clause.matchAll(topic)];
    if (!topics.length) {
      if (/^\s*(?:기존\s*)?(?:취소|철회|보류|무산|미정|연기|변경|날짜\s*확인|일정\s*확인)/.test(clause)) {
        for (const kind of ['balance', 'moveIn'] as const) if (events[kind] !== undefined) events[kind] = null;
        pendingDate = null;
        continue;
      }
      // A standalone date can qualify the next named schedule in this same note.
      // Never carry a consultation, loan or tenant date across an activity separator.
      if (/\d/.test(clause)) pendingDate = /상담|통화|기록|대출|융자|임차인|세입자|전세|임대/.test(clause)
        ? null : dateLabel(clause, contact.consulted_at, now);
      continue;
    }
    for (let index = 0; index < topics.length; index++) {
      const token = topics[index], kind: Kind = token[0].startsWith('잔금') ? 'balance' : 'moveIn';
      if (kind === 'moveIn' && tenant.test(clause)) {
        if (/기존|이전|정정|착오|계약자|본인/.test(clause)) events.moveIn = null;
        continue;
      }
      const right = clause.slice(token.index! + token[0].length, topics[index + 1]?.index ?? clause.length);
      // Date before its topic is allowed only when no earlier topic owns it.
      const left = index === 0 ? clause.slice(0, token.index) : '';
      if (kind === 'balance' && /(?:전세|임대|임차인|세입자)\s*$/.test(clause.slice(0, token.index))) {
        events.balance = null; pendingDate = null; continue;
      }
      const context = right.trim() ? right : left;
      if ((mode === "today" && notConfirmed.test(context)) || /완료|납부했|입금했|입주했|납부함|입금함|입주함/.test(clause)
        || (/잔금\s*완납/.test(clause) && !/예정|계획/.test(clause))
        || (/변경|연기/.test(context) && !/(?:로|으로)\s*(?:변경|연기)|(?:→|->)/.test(context))) {
        events[kind] = null; continue;
      }
      if (topics[index + 1] && /\d/.test(left) && /\d/.test(right) && !/상담|통화|기록/.test(left)) {
        events[kind] = null; continue;
      }
      const rightDate = right.search(/\d{1,2}\s*(?:월|[-./]\d{1,2})/);
      const leftDate = [...left.matchAll(/\d{1,2}\s*(?:월|[-./]\d{1,2})/g)].at(-1);
      const rightLead = rightDate >= 0 ? right.slice(0, rightDate) : right;
      const leftTail = leftDate ? left.slice(leftDate.index! + leftDate[0].length) : left;
      const leftLead = leftDate ? left.slice(0, leftDate.index) : '';
      const forwardOwnedByConsultation = rightDate >= 0 && /상담|통화|기록/.test(rightLead);
      const backwardOwnedByConsultation = rightDate < 0 && (/상담|통화|기록/.test(leftTail)
        || /(?:상담|통화|기록)(?:일|일자|날짜)?\s*[:：]?\s*$/.test(leftLead));
      if (forwardOwnedByConsultation || backwardOwnedByConsultation) { events[kind] = null; continue; }
      // A loan date cannot become a balance date. A separately stated balance date can.
      if (kind === 'balance' && (rightDate >= 0 ? loan.test(rightLead) : loan.test(left))) { events.balance = null; continue; }
      const forward = dateLabel(right, contact.consulted_at, now);
      const backward = !forward && !/\d/.test(right) && !/임차인|세입자/.test(left) ? dateLabel(left, contact.consulted_at, now) : null;
      const label = forward ?? backward ?? (rightDate < 0 && !leftDate && !unknownReplacement.test(context) ? pendingDate : null);
      if (label) pendingDate = null;
      // Repeating a topic without a new date in this same note is not a cancellation.
      if (!label && events[kind] && !/\d/.test(right) && !unknownReplacement.test(context)) continue;
      // Cancelled or conflicting plans stay excluded; tentative wording does not erase a date.
      events[kind] = cancelled.test(context) || cancelled.test(left) ? null : label;
    }
  }
  return events;
}

/** Latest *relevant* record per kind wins; a cancellation/unknown replacement is a tombstone. */
export function resolveConsultationScheduleDates(identity: ScheduleIdentity, contacts: readonly ScheduleContact[], now = new Date(), mode: ConsultationScheduleMode = "floorplan"): { balance: string | null; moveIn: string | null } | null {
  if ((mode === "floorplan" && identity.currentGrade !== 'A') || !Number.isFinite(now.getTime())) return null;
  const own = contacts.filter(c => c.project_id === identity.projectId && c.unit_id === identity.unitId && c.customer_id === identity.currentCustomerId);
  if (own.some(c => !Number.isFinite(Date.parse(c.consulted_at)))) return null;
  const ordered = own.filter(c => Date.parse(c.consulted_at) <= now.getTime()).sort((a, b) => Date.parse(b.consulted_at) - Date.parse(a.consulted_at));
  const resolved: Events = {};
  for (let index = 0; index < ordered.length;) {
    const stamp = Date.parse(ordered[index].consulted_at), group: Events[] = [];
    while (index < ordered.length && Date.parse(ordered[index].consulted_at) === stamp) group.push(eventsOf(ordered[index++], now, mode));
    for (const kind of ['balance', 'moveIn'] as const) {
      if (resolved[kind] !== undefined) continue;
      const values = group.filter(event => event[kind] !== undefined).map(event => event[kind]!);
      if (values.length) resolved[kind] = new Set(values).size === 1 ? values[0] : null;
    }
  }
  return {balance: !isConfirmedBalancePaid(identity) ? resolved.balance ?? null : null,
    moveIn: !identity.actualMoveInDate ? resolved.moveIn ?? null : null};
}

export function resolveConsultationScheduleBadge(identity: ScheduleIdentity, contacts: readonly ScheduleContact[], now = new Date()): ConsultationScheduleBadge | null {
  return scheduleBadgeFromDates(resolveConsultationScheduleDates(identity,contacts,now));
}

export function scheduleBadgeFromDates(dates: ReturnType<typeof resolveConsultationScheduleDates>): ConsultationScheduleBadge | null {
  if(dates?.balance) return {kind:'balance',label:`잔금 ${dates.balance}`};
  if(dates?.moveIn) return {kind:'moveIn',label:`입주 ${dates.moveIn}`};
  return null;
}

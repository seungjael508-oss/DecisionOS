import { phoneQuality } from '@/lib/import/phone-quality';

export function CustomerPhone({raw, status}: {raw: string | null; status?: string | null}) {
  const quality=phoneQuality(raw);
  const enabled=status==='PHONE_VALID' && quality.status==='PHONE_VALID';
  return <span className="inline-flex flex-wrap items-center gap-2">
    <span>{raw || '—'}</span>
    {!enabled && <span className="text-sm text-red-800">PHONE_INVALID · 전화번호 확인필요 · 관리자 확인 필요</span>}
    {enabled ? <><a className="underline" href={`tel:${quality.normalized}`}>전화</a><a className="underline" href={`sms:${quality.normalized}`}>문자</a></> : <><button type="button" disabled>전화</button><button type="button" disabled>문자</button></>}
  </span>;
}

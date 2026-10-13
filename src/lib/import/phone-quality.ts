import { normalizePhone } from '@/lib/import/normalize';

export type PhoneQualityStatus = 'PHONE_VALID' | 'PHONE_INVALID';
export function phoneQuality(raw: string | null | undefined) {
  const source = raw ?? '';
  const digits = normalizePhone(source);
  const valid = /^[\d\s()+.-]+$/.test(source) && digits !== null && /^(?:01[016789]\d{7,8}|02\d{7,8}|0[3-6]\d\d{7,8}|070\d{8}|1[568]\d{6})$/.test(digits);
  return { raw: source, normalized: valid ? digits : null, status: (valid ? 'PHONE_VALID' : 'PHONE_INVALID') as PhoneQualityStatus };
}

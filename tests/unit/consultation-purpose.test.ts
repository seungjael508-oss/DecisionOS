import { expect, it } from 'vitest';
import { buildCreateMoveInConsultationArgs } from '@/lib/move-in/consultation';
const base={projectId:'p',unitId:'u',customerId:'c',consultationType:'OUTBOUND' as const,content:'방문 요청 문자가 있어도 채널과 목적을 추론하지 않음'};
it.each(['성향파악','입주안내','잔금독촉','매칭안내','기타'])('passes explicit purpose %s independently of content/channel',purpose=>{
 expect(buildCreateMoveInConsultationArgs({...base,purpose})).toMatchObject({p_business_purpose:purpose,p_consultation_type:'OUTBOUND',p_content:base.content});
});
it.each(['CALL','OUTBOUND','자동추론'])('rejects invalid purpose %s',purpose=>{
 expect(buildCreateMoveInConsultationArgs({...base,purpose})).toEqual({error:'invalid_purpose'});
});

it.each([undefined,''])('allows simple consultation without business purpose',purpose=>{
 const args=buildCreateMoveInConsultationArgs({...base,purpose});
 expect(args).not.toHaveProperty('error');
 expect(args).not.toHaveProperty('p_business_purpose');
});

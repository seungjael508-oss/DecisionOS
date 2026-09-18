import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from '@/app/auth/recovery/route';
const exchange=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabase/server',()=>({createServerClient:async()=>({auth:{exchangeCodeForSession:exchange,getUser:async()=>({data:{user:{id:"fixture",email:"person@example.test"}},error:null}),getClaims:async()=>({data:{claims:{sub:"fixture",amr:[{method:"recovery",timestamp:Math.floor(Date.now()/1000)}]}},error:null})}})}));
beforeEach(()=>{exchange.mockReset().mockResolvedValue({error:null});});
describe('recovery callback',()=>{
 it('passes the scoped PKCE flow identifier to the SDK',async()=>{await GET(new NextRequest('https://app.example/auth/recovery?code=fixture&sb_flow_id=flow123456'));expect(exchange).toHaveBeenCalledWith('fixture',{flowId:'flow123456'});});
 it('exchanges the code and redirects only to the app password form',async()=>{const res=await GET(new NextRequest('https://app.example/auth/recovery?code=fixture&next=https://evil.example'));expect(exchange).toHaveBeenCalledWith('fixture',undefined);expect(res.headers.get('location')).toBe('https://app.example/reset-password');expect(res.headers.get('cache-control')).toContain('no-store');expect(res.headers.get('referrer-policy')).toBe('no-referrer');});
 it('does not exchange an absent code',async()=>{const res=await GET(new NextRequest('https://app.example/auth/recovery'));expect(exchange).not.toHaveBeenCalled();expect(res.headers.get('location')).toBe('https://app.example/forgot-password?error=expired');});
 it.each(['error','throw'])('handles %s without leaking tokens or errors',async kind=>{if(kind==='error')exchange.mockResolvedValue({error:{message:'PRIVATE_ERROR'}});else exchange.mockRejectedValue(new Error('PRIVATE_ERROR'));const res=await GET(new NextRequest('https://app.example/auth/recovery?code=fixture'));expect(res.headers.get('location')).toBe('https://app.example/forgot-password?error=expired');});
});

/** @vitest-environment jsdom */
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import Page from '@/app/reset-password/page';
const getUser=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabase/server',()=>({createServerClient:async()=>({auth:{getUser,getClaims:async()=>({data:{claims:{sub:"fixture",amr:[{method:"recovery",timestamp:Math.floor(Date.now()/1000)}]}},error:null})}})}));
vi.mock('@/components/auth/reset-password-form',()=>({ResetPasswordForm:({email}:{email:string})=><form aria-label='verified password form'>{email}</form>}));
afterEach(cleanup);
beforeEach(()=>{getUser.mockReset();});
describe('reset password server boundary',()=>{
 it('shows no password form to an unauthenticated visitor',async()=>{getUser.mockResolvedValue({data:{user:null},error:null});render(await Page());expect(screen.queryByRole('form')).toBeNull();expect(screen.getByRole('link').getAttribute('href')).toBe('/forgot-password');});
 it('fails closed on auth errors',async()=>{getUser.mockRejectedValue(new Error('PRIVATE_ERROR'));render(await Page());expect(screen.queryByRole('form')).toBeNull();expect(screen.getByRole('alert').textContent).not.toContain('PRIVATE_ERROR');});
 it('renders only after verifying the current user with Auth',async()=>{getUser.mockResolvedValue({data:{user:{id:'fixture',email:'person@example.com'}},error:null});render(await Page());expect(screen.getByRole('form').textContent).toBe('person@example.com');});
});

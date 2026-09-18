/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
const mocks=vi.hoisted(()=>({request:vi.fn(),update:vi.fn(),signOut:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createBrowserClient:()=>({auth:{resetPasswordForEmail:mocks.request,updateUser:mocks.update,signOut:mocks.signOut}})}));
vi.mock('@/app/reset-password/actions',()=>({resetPassword:mocks.update}));
beforeEach(()=>{vi.resetAllMocks();mocks.request.mockResolvedValue({error:null});mocks.update.mockResolvedValue({ok:true,signedOut:true});mocks.signOut.mockResolvedValue({error:null});});
afterEach(cleanup);
function passwordValues(a:string,b=a){fireEvent.change(screen.getByLabelText('새 비밀번호'),{target:{value:a}});fireEvent.change(screen.getByLabelText('새 비밀번호 확인'),{target:{value:b}});fireEvent.submit(screen.getByRole('form'));}
describe('app password recovery',()=>{
 it('requests a recovery email with an app-origin callback',async()=>{render(<ForgotPasswordForm/>);fireEvent.change(screen.getByLabelText('이메일'),{target:{value:' person@example.com '}});fireEvent.submit(screen.getByRole('form'));await waitFor(()=>expect(mocks.request).toHaveBeenCalledWith('person@example.com',{redirectTo:window.location.origin+'/auth/recovery'}));expect(await screen.findByRole('status')).toBeTruthy();});
 it('does not expose email existence or raw errors',async()=>{mocks.request.mockResolvedValue({error:{message:'PRIVATE_ERROR'}});render(<ForgotPasswordForm/>);fireEvent.change(screen.getByLabelText('이메일'),{target:{value:'person@example.com'}});fireEvent.submit(screen.getByRole('form'));expect((await screen.findByRole('alert')).textContent).not.toContain('PRIVATE_ERROR');});
 it('keeps password updates blocked when confirmation differs',()=>{render(<ResetPasswordForm email='person@example.com'/>);passwordValues('Synthetic-Password-123!','different');expect(mocks.update).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toBeTruthy();});
 it('requires at least twelve characters',()=>{render(<ResetPasswordForm email='person@example.com'/>);passwordValues('short');expect(mocks.update).not.toHaveBeenCalled();});
 it('updates via the current user session then signs out locally',async()=>{render(<ResetPasswordForm email='person@example.com'/>);passwordValues('Synthetic-Password-123!');await waitFor(()=>expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'}));expect(mocks.update).toHaveBeenCalledWith('Synthetic-Password-123!','Synthetic-Password-123!');expect(await screen.findByRole('link',{name:'로그인하기'})).toBeTruthy();expect(screen.queryByLabelText('새 비밀번호')).toBeNull();});
 it('shows expired-session guidance without exposing auth errors',async()=>{mocks.update.mockResolvedValue({ok:false,message:'인증이 만료되었습니다. 재설정 메일을 다시 요청해 주세요.'});render(<ResetPasswordForm email='person@example.com'/>);passwordValues('Synthetic-Password-123!');expect((await screen.findByRole('alert')).textContent).toContain('재설정 메일');expect(mocks.signOut).not.toHaveBeenCalled();});
 it('does not claim update failure if signout fails after password was saved',async()=>{mocks.signOut.mockRejectedValue(new Error('PRIVATE_ERROR'));render(<ResetPasswordForm email='person@example.com'/>);passwordValues('Synthetic-Password-123!');expect(await screen.findByText(/비밀번호가 변경되었습니다/)).toBeTruthy();});
});

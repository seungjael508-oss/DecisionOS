// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CustomerPhone } from '@/components/move-in/customer-phone';
afterEach(cleanup);
it('disables telephone and SMS for invalid contact even if a raw value exists',()=>{
 render(<CustomerPhone raw="1090000001" status="PHONE_INVALID" />);
 expect(screen.getByText(/PHONE_INVALID/)).toBeTruthy();
 expect(screen.queryAllByRole('link')).toHaveLength(0);
 expect((screen.getByRole('button',{name:'전화'}) as HTMLButtonElement).disabled).toBe(true);
 expect((screen.getByRole('button',{name:'문자'}) as HTMLButtonElement).disabled).toBe(true);
});
it('creates contact links only for valid normalized phone',()=>{
 render(<CustomerPhone raw="010-9000-0001" status="PHONE_VALID" />);
 expect(screen.getByRole('link',{name:'전화'}).getAttribute('href')).toBe('tel:01090000001');
 expect(screen.getByRole('link',{name:'문자'}).getAttribute('href')).toBe('sms:01090000001');
});
it('fails closed if stored quality contradicts the actual phone',()=>{
 render(<CustomerPhone raw="javascript:alert(1)" status="PHONE_VALID" />);
 expect(screen.queryAllByRole('link')).toHaveLength(0);
});

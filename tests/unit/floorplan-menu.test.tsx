import { expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation',()=>({usePathname:()=>'/projects/p/move-in/floorplan',useRouter:()=>({push:vi.fn(),back:vi.fn()})}));
import { MoveInNav } from '@/components/move-in/move-in-nav';

test('desktop and mobile unit-management menus open the existing floorplan route',()=>{
  const html=renderToStaticMarkup(createElement(MoveInNav,{projectId:'p',projectName:'현장',role:'PROJECT_ADMIN'}));
  const links=html.match(/<a\b[^>]*>동호수배치도<\/a>/g)??[];
  expect(links).toHaveLength(2);
  for(const link of links){expect(link).toContain('href="/projects/p/move-in/floorplan"');expect(link).toContain('aria-current="page"');}
});

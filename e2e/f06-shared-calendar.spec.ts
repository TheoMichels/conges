import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
const team = '00000000-0000-4000-8000-000000000011';
async function setup(page: Page, state: "normal" | "no-teams" | "error" = "normal") {
 let failed = false;
 const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'user@example.com' };
 await page.route('https://holidays.example/**', async route => { const url = new URL(route.request().url()); await route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:4174${url.pathname}${url.search}` }) }); });
 await page.addInitScript(user => localStorage.setItem('sb-synthetic-auth-token', JSON.stringify({ access_token:'mock-token', refresh_token:'mock-refresh', token_type:'bearer', expires_at:Math.floor(Date.now()/1000)+3600, user })), user);
 await page.route('https://synthetic.supabase.invalid/**', async route => {
  const url = route.request().url(); let body: unknown = {};
  if (url.includes('/auth/v1/user')) body = user;
  if (url.includes('/rpc/register_member')) body = [{ active:true, is_admin:false, display_name:'Alex' }];
  if (url.includes('/year_plans')) body = [];
  if (url.includes('/rpc/my_calendar_teams')) body = state === 'no-teams' ? [] : [{ id:team, name:'Alpha' }];
  if (url.includes('/rpc/shared_calendar') && state === 'error' && !failed) { failed = true; await route.fulfill({ status:200, contentType:'application/json', body:'{}' }); return; }
  if (url.includes('/rpc/shared_calendar')) { const p = route.request().postDataJSON() as { month_start:string }; body = p.month_start === '2026-03-01' || p.month_start === '2026-02-01' ? [{ id:'entry', display_name:'Camille', start_date:'2026-02-27', end_date:'2026-03-03', start_half:'afternoon', end_half:'morning' }] : p.month_start === '2026-04-01' ? [{ id:'future-entry', display_name:'Camille', start_date:'2026-04-07', end_date:'2026-04-07', start_half:'morning', end_half:'afternoon' }] : []; }
  await route.fulfill({status:200, contentType:'application/json', body:JSON.stringify(body)});
 });
}
for (const width of [375, 1200]) test(`calendrier partagé et filtres ${width}px`, async ({page}) => {
 await page.setViewportSize({width,height:850}); await setup(page); await page.clock.setFixedTime(new Date('2026-03-15T12:00:00Z')); await page.goto('https://holidays.example/');
 await page.getByTestId('shared-calendar-button').click();
 await expect(page.getByTestId('shared-calendar-screen')).toBeVisible();
 await expect(page.getByTestId('calendar-team-all')).toBeVisible();
 await expect(page.getByTestId('calendar-entry')).toHaveCount(2);
 await expect(page.getByTestId('calendar-entry').last()).toContainText('Matin');
 await page.getByTestId('calendar-previous').click();
 await expect(page.getByTestId('calendar-entry')).toHaveCount(1);
 await expect(page.getByTestId('calendar-entry')).toContainText('Après-midi');
 await page.getByTestId('calendar-next').click();
 await page.getByTestId(`calendar-team-${team}`).click();
 await expect(page.getByTestId('calendar-entry')).toHaveCount(2);
 await page.getByTestId('calendar-next').click();
 await expect(page.getByTestId('calendar-month')).toContainText('avril 2026');
 await expect(page.getByTestId('calendar-entry')).toHaveCount(1);
 await expect(page.getByTestId('calendar-entry')).toContainText('Camille');
 await expect(page.getByTestId('calendar-entry')).toContainText('7 avr. 2026');
 await expect(page.getByTestId('calendar-entry')).toContainText('Journée');
 await page.getByTestId('calendar-previous').click();
 expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});

test('états vides et reprise après erreur', async ({page}) => {
 await setup(page, 'error'); await page.goto('https://holidays.example/'); await page.getByTestId('shared-calendar-button').click();
 await expect(page.getByTestId('calendar-error')).toBeVisible(); await page.getByTestId('calendar-retry').click();
 await expect(page.getByTestId('calendar-team-all')).toBeVisible();
 for (let i=0; i<12; i++) await page.getByTestId('calendar-next').click();
 await expect(page.getByTestId('calendar-empty')).toBeVisible();
});
test('aucune équipe assignée', async ({page}) => {
 await setup(page, 'no-teams'); await page.goto('https://holidays.example/'); await page.getByTestId('shared-calendar-button').click();
 await expect(page.getByTestId('calendar-no-teams')).toBeVisible();
});

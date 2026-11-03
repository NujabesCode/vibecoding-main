import { expect, test } from '@playwright/test';
import { enter, uniqueName } from './helpers';

test('템플릿으로 가구를 만들어 올리면 우리반 갤러리에 보인다', async ({ page }) => {
  await enter(page, uniqueName('지호'));
  await page.goto('/#workshop');

  await page.getByTestId('tpl-sofa').click();
  const name = '소파' + Date.now().toString(36).slice(-4);
  await page.getByTestId('item-name').fill(name);

  // 직접 한 점 찍어 보기
  const editor = page.getByTestId('item-editor');
  const box = await editor.boundingBox();
  if (!box) throw new Error('에디터가 안 보여요');
  await page.mouse.click(box.x + 5, box.y + 5);

  await page.getByTestId('save-item').click();
  await expect(page.getByRole('status')).toContainText('갤러리에 올렸어요');
  await expect(page.getByTestId('item-gallery').getByText(name)).toBeVisible();
});

test('내가 올린 가구는 지울 수 있다', async ({ page }) => {
  await enter(page, uniqueName('수아'));
  await page.goto('/#workshop');
  await page.getByTestId('tpl-plant').click();
  const name = '화분' + Date.now().toString(36).slice(-4);
  await page.getByTestId('item-name').fill(name);
  await page.getByTestId('save-item').click();
  const card = page.getByTestId('item-gallery').locator('.g-item', { hasText: name });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: '지우기' }).click();
  await expect(card).toHaveCount(0);
});

test('남이 올린 가구는 지울 수 없다 (403)', async ({ request }) => {
  const a = await (await request.post('/api/players', { data: { nickname: uniqueName('a') } })).json();
  const b = await (await request.post('/api/players', { data: { nickname: uniqueName('b') } })).json();
  const px = JSON.stringify({ v: 1, px: `${32 * 32}*#ff6b5e` });
  const created = await request.post('/api/items', {
    headers: { Authorization: `Bearer ${a.token}` },
    data: { name: '내 의자', kind: 'object', width: 1, height: 1, solid: false, pixels: px },
  });
  expect(created.status()).toBe(201);
  const item = await created.json();
  const res = await request.delete(`/api/items/${item.id}`, { headers: { Authorization: `Bearer ${b.token}` } });
  expect(res.status()).toBe(403);
});

test('이상한 가구 데이터는 400 (크기 3칸, 바닥 2칸, 빈 이름)', async ({ request }) => {
  const a = await (await request.post('/api/players', { data: { nickname: uniqueName('c') } })).json();
  const auth = { Authorization: `Bearer ${a.token}` };
  const px = JSON.stringify({ v: 1, px: '1024*' });
  const base = { name: '테스트', kind: 'object', width: 1, height: 1, solid: false, pixels: px };
  expect((await request.post('/api/items', { headers: auth, data: { ...base, width: 3 } })).status()).toBe(400);
  expect((await request.post('/api/items', { headers: auth, data: { ...base, kind: 'floor', width: 2 } })).status()).toBe(400);
  expect((await request.post('/api/items', { headers: auth, data: { ...base, name: '  ' } })).status()).toBe(400);
  expect((await request.post('/api/items', { data: base })).status()).toBe(401);
});

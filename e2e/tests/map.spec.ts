import { expect, test, type Page } from '@playwright/test';
import { enter, uniqueName } from './helpers';

// 맵 캔버스의 (x, y) 칸 가운데를 클릭
async function clickCell(page: Page, x: number, y: number) {
  const canvas = page.getByTestId('map-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('맵이 안 보여요');
  const cw = box.width / 24;
  const ch = box.height / 16;
  await page.mouse.click(box.x + cw * (x + 0.5), box.y + ch * (y + 0.5));
}

test('새 맵에 가구를 놓고 저장하면 목록에 생기고, 다시 열어도 그대로다', async ({ page }) => {
  await enter(page, uniqueName('도윤'));
  await page.goto('/#maps');
  await page.getByTestId('new-map').click();
  await expect(page.getByTestId('map-canvas')).toBeVisible();

  const name = '교실' + Date.now().toString(36).slice(-4);
  await page.getByTestId('map-name').fill(name);
  await page.getByTestId('asset-t:desk').click();
  await clickCell(page, 4, 5);
  await page.getByTestId('asset-t:plant').click();
  await clickCell(page, 10, 8);
  await page.getByTestId('tool-wall').click();
  await clickCell(page, 15, 10);
  await page.getByTestId('tool-spawn').click();
  await clickCell(page, 12, 12);
  await expect(page.getByText('가구 2개')).toBeVisible();

  await page.getByTestId('save-map').click();
  await expect(page.getByRole('status')).toContainText('새 맵을 만들었어요');
  await expect(page).toHaveURL(/#edit\/\d+$/);

  await page.reload();
  await expect(page.getByText('가구 2개')).toBeVisible();
  await expect(page.getByTestId('map-name')).toHaveValue(name);

  await page.goto('/#maps');
  await expect(page.getByTestId('map-list').getByText(name)).toBeVisible();
});

test('남의 맵은 저장할 수 없다 (403)', async ({ request }) => {
  const a = await (await request.post('/api/players', { data: { nickname: uniqueName('a') } })).json();
  const b = await (await request.post('/api/players', { data: { nickname: uniqueName('b') } })).json();
  const data = JSON.stringify({ v: 1, w: 8, h: 8, floor: new Array(64).fill('t:wood'), objects: [], blocked: [], spawn: { x: 1, y: 1 } });
  const created = await request.post('/api/maps', { headers: { Authorization: `Bearer ${a.token}` }, data: { name: '내 맵', data } });
  expect(created.status()).toBe(201);
  const map = await created.json();
  const res = await request.put(`/api/maps/${map.id}`, { headers: { Authorization: `Bearer ${b.token}` }, data: { name: '뺏은 맵', data } });
  expect(res.status()).toBe(403);
});

test('이상한 맵 데이터는 400 (시작 위치가 밖, 칸 수 불일치, 너무 큰 맵)', async ({ request }) => {
  const a = await (await request.post('/api/players', { data: { nickname: uniqueName('c') } })).json();
  const auth = { Authorization: `Bearer ${a.token}` };
  const make = (o: Record<string, unknown>) =>
    JSON.stringify({ v: 1, w: 8, h: 8, floor: new Array(64).fill('t:wood'), objects: [], blocked: [], spawn: { x: 1, y: 1 }, ...o });
  const post = (data: string) => request.post('/api/maps', { headers: auth, data: { name: '테스트', data } });
  expect((await post(make({ spawn: { x: 9, y: 1 } }))).status()).toBe(400);
  expect((await post(make({ floor: [] }))).status()).toBe(400);
  expect((await post(make({ w: 100, h: 100, floor: new Array(10000).fill(null) }))).status()).toBe(400);
});

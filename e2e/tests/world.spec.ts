import { expect, test, type Browser, type Page } from '@playwright/test';
import { enter, uniqueName } from './helpers';

// 실시간 기능은 브라우저 두 개(두 사람)를 띄워서 서로 보이는지 확인한다.

async function makeMap(page: Page): Promise<number> {
  const me = await page.evaluate(() => JSON.parse(localStorage.getItem('campus.me') ?? '{}'));
  const w = 12;
  const h = 10;
  const blocked: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) blocked.push(y * w + x);
  const data = JSON.stringify({ v: 1, w, h, floor: new Array(w * h).fill('t:tile'), objects: [{ x: 8, y: 2, ref: 't:plant' }], blocked, spawn: { x: 3, y: 5 } });
  const res = await page.request.post('/api/maps', { headers: { Authorization: `Bearer ${me.token}` }, data: { name: '실시간 테스트', data } });
  expect(res.status()).toBe(201);
  return (await res.json()).id;
}

async function person(browser: Browser, name: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await enter(page, name);
  return { context, page };
}

const presence = (page: Page) => page.getByTestId('presence').locator('li');

test('두 사람이 같은 맵에 들어가면 서로 보이고, 움직이면 위치가 바뀐다', async ({ browser }) => {
  const nameA = uniqueName('가');
  const nameB = uniqueName('나');
  const a = await person(browser, nameA);
  const b = await person(browser, nameB);
  const mapId = await makeMap(a.page);

  await a.page.goto(`/#world/${mapId}`);
  await b.page.goto(`/#world/${mapId}`);
  await expect(presence(a.page)).toHaveCount(2);
  await expect(presence(b.page)).toHaveCount(2);

  const aInB = presence(b.page).filter({ hasText: nameA });
  const before = Number(await aInB.getAttribute('data-x'));
  await a.page.getByTestId('world-canvas').click({ position: { x: 5, y: 400 } }); // 포커스만 주기
  await a.page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number(await aInB.getAttribute('data-x')), { timeout: 5000 }).toBeGreaterThan(before + 20);
  await a.page.keyboard.up('ArrowRight');

  await a.context.close();
  await b.context.close();
});

test('채팅은 근처 사람에게 보이고, 나가면 목록에서 사라진다', async ({ browser }) => {
  const nameA = uniqueName('다');
  const a = await person(browser, nameA);
  const b = await person(browser, uniqueName('라'));
  const mapId = await makeMap(a.page);
  await a.page.goto(`/#world/${mapId}`);
  await b.page.goto(`/#world/${mapId}`);
  await expect(presence(b.page)).toHaveCount(2);

  await a.page.getByTestId('chat-input').fill('안녕 반가워!');
  await a.page.getByTestId('chat-input').press('Enter');
  await expect(b.page.getByTestId('chat-log')).toContainText('안녕 반가워!');
  await expect(b.page.getByTestId('chat-log')).toContainText(nameA);

  await a.context.close();
  await expect(presence(b.page)).toHaveCount(1);
  await b.context.close();
});

test('토큰 없이는 실시간 연결이 안 된다', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const ws = new WebSocket(`ws://${location.host}/ws`, ['v12.stomp']);
        ws.onopen = () => ws.send('CONNECT\naccept-version:1.2\nhost:localhost\n\n\0');
        ws.onmessage = (m) => resolve(String(m.data).split('\n')[0]);
        ws.onclose = () => resolve('CLOSED');
        setTimeout(() => resolve('TIMEOUT'), 4000);
      }),
  );
  expect(result).not.toBe('CONNECTED');
});

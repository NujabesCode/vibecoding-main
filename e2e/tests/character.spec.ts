import { expect, test } from '@playwright/test';
import { enter, myId, uniqueName } from './helpers';

test('입장해서 캐릭터를 꾸미고 저장하면 로비 친구 목록에 보인다', async ({ page }) => {
  const name = uniqueName('민준');
  await enter(page, name);

  await page.getByTestId('part-hair-long').click();
  await expect(page.getByTestId('part-hair-long')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('save-character').click();
  await expect(page.getByRole('status')).toContainText('저장했어요');

  await page.getByRole('button', { name: '← 로비' }).click();
  const card = page.getByTestId('friends').locator('.friend', { hasText: name });
  await expect(card.locator('canvas')).toBeVisible();
});

test('직접 찍은 픽셀은 저장 후 새로고침해도 남아 있다', async ({ page }) => {
  await enter(page, uniqueName('서연'));
  await page.getByTestId('part-hair-bun').click();

  // 왼쪽 아래 빈 칸(2, 40)에 펜으로 한 점 찍기
  const editor = page.getByTestId('pixel-editor');
  const box = await editor.boundingBox();
  if (!box) throw new Error('에디터가 안 보여요');
  const cell = box.width / 32;
  await page.mouse.click(box.x + cell * 2.5, box.y + cell * 40.5);
  await page.getByTestId('save-character').click();
  await expect(page.getByRole('status')).toContainText('저장했어요');

  await page.reload();
  await expect(page.getByTestId('part-hair-bun')).toHaveAttribute('aria-pressed', 'true');

  const id = await myId(page);
  const saved = await page.request.get(`/api/characters/${id}`);
  expect(saved.ok()).toBeTruthy();
  const design = JSON.parse((await saved.json()).design);
  // 머리카락 레이어(앞)에 우리가 찍은 칸이 들어 있어야 한다: RLE를 풀어 2,40 위치 확인
  const cells: (string | null)[] = [];
  for (const tok of (design.layers.down.hair as string).split(',')) {
    const [n, v] = [Number(tok.slice(0, tok.indexOf('*'))), tok.slice(tok.indexOf('*') + 1)];
    for (let i = 0; i < n; i++) cells.push(v || null);
  }
  expect(cells[40 * 32 + 2]).not.toBeNull();
});

import { expect, type Page } from '@playwright/test';

// 테스트끼리 안 겹치게 매번 다른 닉네임 (12자 이내)
export function uniqueName(prefix: string): string {
  return prefix + Date.now().toString(36).slice(-5) + Math.floor(Math.random() * 10);
}

// 입장 화면에서 닉네임을 넣고 들어간다. 들어가면 캐릭터 공방이 열린다.
export async function enter(page: Page, nickname: string) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.getByTestId('nickname').fill(nickname);
  await page.getByTestId('enter').click();
  await expect(page.getByTestId('pixel-editor')).toBeVisible();
}

export async function myId(page: Page): Promise<number> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('campus.me') ?? '{}').id as number);
}

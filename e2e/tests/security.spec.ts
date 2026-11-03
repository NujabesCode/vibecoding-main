import { expect, test, type APIRequestContext } from '@playwright/test';
import { uniqueName } from './helpers';

// 정찰 버전에서 실제로 뚫렸던 구멍들. 다시 뚫리면 이 테스트가 빨간불이 된다.

async function newPlayer(request: APIRequestContext) {
  const res = await request.post('/api/players', { data: { nickname: uniqueName('p') } });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: number; nickname: string; token: string };
}

const design = (hair: string) =>
  JSON.stringify({ v: 1, parts: { hair }, palette: {}, layers: {} });

test('남의 캐릭터 주소로는 저장할 수 없다 (정찰 버전의 구멍)', async ({ request }) => {
  const victim = await newPlayer(request);
  const res = await request.put(`/api/characters/${victim.id}`, { data: { design: design('bun') } });
  expect(res.ok()).toBeFalsy();
});

test('토큰 없이 저장하면 401', async ({ request }) => {
  const res = await request.put('/api/characters/me', { data: { design: design('bob') } });
  expect(res.status()).toBe(401);
});

test('가짜 토큰으로 저장하면 401', async ({ request }) => {
  const res = await request.put('/api/characters/me', {
    headers: { Authorization: 'Bearer this-is-not-a-real-token' },
    data: { design: design('bob') },
  });
  expect(res.status()).toBe(401);
});

test('내 토큰으로는 내 캐릭터만 바뀐다', async ({ request }) => {
  const a = await newPlayer(request);
  const b = await newPlayer(request);
  const save = (token: string, hair: string) =>
    request.put('/api/characters/me', { headers: { Authorization: `Bearer ${token}` }, data: { design: design(hair) } });
  expect((await save(b.token, 'long')).ok()).toBeTruthy();
  expect((await save(a.token, 'bun')).ok()).toBeTruthy();
  const bSaved = await (await request.get(`/api/characters/${b.id}`)).json();
  expect(JSON.parse(bSaved.design).parts.hair).toBe('long');
});

test('너무 큰 디자인은 400', async ({ request }) => {
  const a = await newPlayer(request);
  const huge = JSON.stringify({ v: 1, parts: {}, palette: {}, layers: { junk: 'x'.repeat(200_000) } });
  const res = await request.put('/api/characters/me', { headers: { Authorization: `Bearer ${a.token}` }, data: { design: huge } });
  expect(res.status()).toBe(400);
});

test('깨진 디자인은 400', async ({ request }) => {
  const a = await newPlayer(request);
  const res = await request.put('/api/characters/me', { headers: { Authorization: `Bearer ${a.token}` }, data: { design: '해킹' } });
  expect(res.status()).toBe(400);
});

test('빈 닉네임과 너무 긴 닉네임은 400', async ({ request }) => {
  expect((await request.post('/api/players', { data: { nickname: '   ' } })).status()).toBe(400);
  expect((await request.post('/api/players', { data: { nickname: '가'.repeat(13) } })).status()).toBe(400);
});

test('플레이어 목록에는 토큰이 절대 안 나온다', async ({ request }) => {
  await newPlayer(request);
  const list = await (await request.get('/api/players')).json();
  expect(JSON.stringify(list)).not.toContain('token');
});

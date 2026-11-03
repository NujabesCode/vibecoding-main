import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type Me } from '../api';
import ItemThumb from '../components/ItemThumb';
import PixelCanvas, { type PixelTool } from '../components/PixelCanvas';
import { buildPal } from '../engine/color';
import { parseDesign } from '../engine/design';
import { FLOOR_TEMPLATES, ITEM_COLORS, itemCanvas, OBJECT_TEMPLATES, serializePixels, TS, type ItemDraft } from '../engine/items';
import type { Cells } from '../engine/rle';
import { buildFrames, FH, FW, type Frames } from '../engine/sprite';
import { useItems } from '../hooks';

const TOOLS: [PixelTool, string][] = [['pen', '펜'], ['eraser', '지우개'], ['fill', '채우기'], ['picker', '스포이트']];

export default function Workshop({ me, onBack }: { me: Me; onBack: () => void }) {
  const [draft, setDraft] = useState<ItemDraft>(() => OBJECT_TEMPLATES[0].make());
  const [tool, setTool] = useState<PixelTool>('pen');
  const [color, setColor] = useState(ITEM_COLORS[8]);
  const [mirror, setMirror] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const undo = useRef<Cells[]>([]);
  const { items, error, reload } = useItems();
  const [myFrames, setMyFrames] = useState<Frames | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const showToast = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2600);
  }, []);

  // 미리보기에 세워둘 내 캐릭터
  useEffect(() => {
    let alive = true;
    api.getCharacter(me.id).then((c) => {
      const d = c ? parseDesign(c.design) : null;
      if (alive && d) setMyFrames(buildFrames(d.layers, buildPal(d.palette)));
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [me.id]);

  // 미리보기: 바닥 4x3칸 위에 가구 + 내 캐릭터
  const finished = useMemo(() => itemCanvas(draft), [draft]);
  useEffect(() => {
    const cv = previewRef.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const S = 2;
    cv.width = 4 * TS * S;
    cv.height = 3 * TS * S;
    c.imageSmoothingEnabled = false;
    const floorTile = draft.kind === 'floor' ? finished : itemCanvas(FLOOR_TEMPLATES[0].make());
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) c.drawImage(floorTile, x * TS * S, y * TS * S, TS * S, TS * S);
    if (draft.kind === 'object') {
      const ox = 1;
      const oy = 3 - draft.h;
      c.drawImage(finished, ox * TS * S, oy * TS * S, draft.w * TS * S, draft.h * TS * S);
    }
    if (myFrames) {
      const fx = draft.kind === 'object' ? (draft.w === 2 ? 3 : 2) : 1.5;
      c.fillStyle = 'rgba(30,20,40,.22)';
      c.beginPath();
      c.ellipse((fx * TS + 16) * S, (3 * TS - 4) * S, 9 * S, 3 * S, 0, 0, 7);
      c.fill();
      c.drawImage(myFrames.left[0], fx * TS * S, (3 * TS - 4 - 46) * S, FW * S, FH * S);
    }
  }, [draft, finished, myFrames]);

  const pickTemplate = (make: () => ItemDraft) => {
    undo.current.push(draft.px);
    setDraft(make());
  };
  const onUndo = () => {
    const prev = undo.current.pop();
    if (prev && prev.length === draft.px.length) setDraft({ ...draft, px: prev });
  };
  const clearAll = () => {
    undo.current.push(draft.px);
    setDraft({ ...draft, px: new Array(draft.px.length).fill(null) });
  };
  const setSize = (w: number, h: number) => {
    undo.current = [];
    setDraft({ ...draft, w, h, px: new Array(w * TS * h * TS).fill(null) });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) return showToast('이름을 지어 주세요');
    if (!draft.px.some(Boolean)) return showToast('빈 그림은 올릴 수 없어요');
    setSaving(true);
    try {
      await api.createItem({ name, kind: draft.kind, width: draft.w, height: draft.h, solid: draft.solid, pixels: serializePixels(draft.px) });
      showToast(`"${name}" 을(를) 우리반 갤러리에 올렸어요`);
      await reload();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '올리지 못했어요');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: number) => {
    try {
      await api.deleteItem(id);
      await reload();
      showToast('지웠어요');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '지우지 못했어요');
    }
  };

  const W = draft.w * TS;
  const H = draft.h * TS;
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <button className="btn ghost" type="button" onClick={onBack}>← 로비</button>
          <div>
            <h1>우리반 <span>가구 공방</span></h1>
            <p>템플릿에서 시작해서 직접 찍고, 반 갤러리에 올리면 맵 에디터에서 다 같이 써요</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn primary" type="button" onClick={save} disabled={saving} data-testid="save-item">{saving ? '올리는 중…' : '갤러리에 올리기'}</button>
        </div>
      </header>

      <div className="workshop-grid">
        <div className="stack">
          <section className="card">
            <h2>가구 템플릿</h2>
            <div className="tpl-grid">
              {OBJECT_TEMPLATES.map((t) => (
                <button key={t.id} type="button" className="tpl" onClick={() => pickTemplate(t.make)} data-testid={`tpl-${t.id}`}>
                  <ItemThumb item={t.make()} scale={1} />
                  {t.label}
                </button>
              ))}
            </div>
            <h2 style={{ marginTop: 14 }}>바닥 타일 템플릿</h2>
            <div className="tpl-grid">
              {FLOOR_TEMPLATES.map((t) => (
                <button key={t.id} type="button" className="tpl" onClick={() => pickTemplate(t.make)} data-testid={`tpl-${t.id}`}>
                  <ItemThumb item={t.make()} scale={1} />
                  {t.label}
                </button>
              ))}
            </div>
          </section>
          <section className="card form">
            <h2>정보</h2>
            <label htmlFor="item-name">이름</label>
            <input id="item-name" data-testid="item-name" maxLength={20} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <label>종류</label>
            <div className="seg two-col">
              <button type="button" aria-pressed={draft.kind === 'object'} onClick={() => setDraft({ ...draft, kind: 'object' })}>가구</button>
              <button type="button" aria-pressed={draft.kind === 'floor'} onClick={() => { setDraft({ ...draft, kind: 'floor', solid: false, w: 1, h: 1, px: draft.w === 1 && draft.h === 1 ? draft.px : new Array(TS * TS).fill(null) }); }}>바닥 타일</button>
            </div>
            {draft.kind === 'object' && (
              <>
                <label>크기 (칸)</label>
                <div className="seg four-col">
                  {[[1, 1], [2, 1], [1, 2], [2, 2]].map(([w, h]) => (
                    <button key={`${w}x${h}`} type="button" aria-pressed={draft.w === w && draft.h === h} onClick={() => setSize(w, h)}>{w}×{h}</button>
                  ))}
                </div>
                <label className="check"><input type="checkbox" checked={draft.solid} onChange={(e) => setDraft({ ...draft, solid: e.target.checked })} /> 못 지나가게 (책상, 벽처럼)</label>
              </>
            )}
          </section>
        </div>

        <section className="card">
          <div className="editor-head">
            <div className="tool-row">
              {TOOLS.map(([t, label]) => (
                <button key={t} type="button" className="chip" aria-pressed={tool === t} onClick={() => setTool(t)}>{label}</button>
              ))}
              <button type="button" className="chip" aria-pressed={mirror} onClick={() => setMirror((m) => !m)}>좌우 대칭</button>
              <button type="button" className="chip" onClick={onUndo}>↶ 되돌리기</button>
              <button type="button" className="chip" onClick={clearAll}>전부 지우기</button>
            </div>
            <div className="now">{W}×{H} 픽셀</div>
          </div>
          <PixelCanvas
            W={W}
            H={H}
            cells={draft.px}
            tool={tool}
            color={color}
            mirror={mirror}
            maxPx={448}
            testId="item-editor"
            onBeforeEdit={() => { undo.current.push(draft.px); if (undo.current.length > 50) undo.current.shift(); }}
            onChange={(px) => setDraft((d) => ({ ...d, px }))}
            onPick={(c) => { setColor(c); setTool('pen'); }}
          />
          <div className="swatches" style={{ marginTop: 12 }}>
            {ITEM_COLORS.map((c) => (
              <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={color === c} onClick={() => { setColor(c); if (tool !== 'fill') setTool('pen'); }} />
            ))}
            <label className="custom"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /> 자유 색상</label>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <h2>미리보기 · 외곽선은 자동</h2>
            <canvas ref={previewRef} className="pixel preview-room" />
          </section>
          <section className="card">
            <h2>우리반 가구 갤러리 {items ? `· ${items.length}개` : ''}</h2>
            {error && <div className="error">{error}</div>}
            <div className="gallery" data-testid="item-gallery">
              {items?.map((it) => (
                <div key={it.id} className="g-item" data-testid={`item-${it.id}`}>
                  <ItemThumb item={it} scale={it.w === 2 || it.h === 2 ? 1 : 2} />
                  <b>{it.name}</b>
                  <span>{it.ownerName} · {it.kind === 'floor' ? '바닥' : `${it.w}×${it.h}${it.solid ? ' · 막힘' : ''}`}</span>
                  {it.ownerId === me.id && <button type="button" className="link" onClick={() => remove(it.id)}>지우기</button>}
                </div>
              ))}
              {items && items.length === 0 && <p className="dim">아직 아무것도 없어요. 첫 가구를 올려 보세요!</p>}
            </div>
          </section>
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

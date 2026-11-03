import { useEffect, useState } from 'react';
import type { Me } from './api';
import Entry from './pages/Entry';
import Lobby from './pages/Lobby';
import MapEditor from './pages/MapEditor';
import MapList from './pages/MapList';
import Studio from './pages/Studio';
import Workshop from './pages/Workshop';
import { clearMe, loadMe, saveMe } from './session';

// 주소 뒤 #부분으로 화면을 고른다: #studio, #workshop, #maps, #edit/new, #edit/12
type Route =
  | { page: 'lobby' }
  | { page: 'studio' }
  | { page: 'workshop' }
  | { page: 'maps' }
  | { page: 'edit'; id: number | null };

function readRoute(): Route {
  const h = location.hash.replace(/^#/, '');
  if (h === 'studio' || h === 'workshop' || h === 'maps') return { page: h };
  const edit = /^edit\/(new|\d+)$/.exec(h);
  if (edit) return { page: 'edit', id: edit[1] === 'new' ? null : Number(edit[1]) };
  return { page: 'lobby' };
}

function toHash(r: Route): string {
  if (r.page === 'lobby') return '';
  if (r.page === 'edit') return `edit/${r.id ?? 'new'}`;
  return r.page;
}

export default function App() {
  const [me, setMe] = useState<Me | null>(() => loadMe());
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (r: Route) => {
    location.hash = toHash(r);
    setRoute(r);
  };

  if (!me) {
    return (
      <Entry
        onEnter={(p) => {
          saveMe(p);
          setMe(p);
          go({ page: 'studio' });
        }}
      />
    );
  }
  switch (route.page) {
    case 'studio':
      return <Studio me={me} onDone={() => go({ page: 'lobby' })} />;
    case 'workshop':
      return <Workshop me={me} onBack={() => go({ page: 'lobby' })} />;
    case 'maps':
      return (
        <MapList
          me={me}
          onBack={() => go({ page: 'lobby' })}
          onNew={() => go({ page: 'edit', id: null })}
          onEdit={(id) => go({ page: 'edit', id })}
        />
      );
    case 'edit':
      return (
        <MapEditor
          key={route.id ?? 'new'}
          me={me}
          mapId={route.id}
          onBack={() => go({ page: 'maps' })}
        />
      );
    default:
      return (
        <Lobby
          me={me}
          onStudio={() => go({ page: 'studio' })}
          onWorkshop={() => go({ page: 'workshop' })}
          onMaps={() => go({ page: 'maps' })}
          onLogout={() => {
            clearMe();
            setMe(null);
          }}
        />
      );
  }
}

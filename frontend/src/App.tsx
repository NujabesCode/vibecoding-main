import { useEffect, useState } from 'react';
import type { Me } from './api';
import Entry from './pages/Entry';
import Lobby from './pages/Lobby';
import Studio from './pages/Studio';
import Workshop from './pages/Workshop';
import { clearMe, loadMe, saveMe } from './session';

type Route = 'lobby' | 'studio' | 'workshop';

const ROUTES: Route[] = ['studio', 'workshop'];
const readRoute = (): Route => ROUTES.find((r) => location.hash === '#' + r) ?? 'lobby';

export default function App() {
  const [me, setMe] = useState<Me | null>(() => loadMe());
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (r: Route) => {
    location.hash = r === 'lobby' ? '' : r;
    setRoute(r);
  };

  if (!me) {
    return (
      <Entry
        onEnter={(p) => {
          saveMe(p);
          setMe(p);
          go('studio');
        }}
      />
    );
  }
  if (route === 'studio') return <Studio me={me} onDone={() => go('lobby')} />;
  if (route === 'workshop') return <Workshop me={me} onBack={() => go('lobby')} />;
  return (
    <Lobby
      me={me}
      onStudio={() => go('studio')}
      onWorkshop={() => go('workshop')}
      onLogout={() => {
        clearMe();
        setMe(null);
      }}
    />
  );
}

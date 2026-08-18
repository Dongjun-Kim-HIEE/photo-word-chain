import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { Auth } from './features/auth';
import { RoomList } from './features/rooms';

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div>
      <h1>사진 끝말잇기 로비</h1>
      <button onClick={handleLogout}>로그아웃</button>
      <RoomList />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { Auth } from './features/auth';
import { RoomList, RoomPage } from './features/rooms';

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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <div>
                <h1>사진 끝말잇기 로비</h1>
                <button onClick={handleLogout}>로그아웃</button>
                <RoomList />
              </div>
            ) : (
              <Auth />
            )
          }
        />
        <Route
          path="/room/:roomId"
          element={session ? <RoomPage /> : <Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { Auth } from './features/auth';
import { RoomList, RoomPage } from './features/rooms';
import './styles/theme.css';
import './styles/lobby.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!sessionLoaded) {
    return (
      <div className="lobby-page grass-bg">
        <div className="lobby-page__inner">
          <div className="lobby-topbar panel-card">불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <div className="lobby-page grass-bg">
                <div className="lobby-page__inner">
                  <div className="lobby-topbar panel-card">
                    <span className="lobby-topbar__logo">🖼️🔗</span>
                    <h1 className="lobby-topbar__title">사진 끝말잇기</h1>
                    <span className="lobby-topbar__spacer" />
                    <button className="lobby-topbar__logout" onClick={handleLogout}>
                      로그아웃
                    </button>
                  </div>
                  <RoomList />
                </div>
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

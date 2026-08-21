import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/theme.css';
import './Auth.css';

const MIN_PASSWORD_LENGTH = 6;
const MAX_USERNAME_LENGTH = 20;

export default function Auth() {
    const [mode, setMode] = useState('login');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    const handleAuth = async (isSignUp) => {
        if (isSignUp) {
            const trimmedUsername = username.trim();
            if (trimmedUsername.length === 0) {
                alert('닉네임을 입력해 주세요.');
                return;
            }
            if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
                alert(`닉네임은 ${MAX_USERNAME_LENGTH}자 이하로 입력해 주세요.`);
                return;
            }
            if (password.length < MIN_PASSWORD_LENGTH) {
                alert(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
                return;
            }
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username: username.trim() } },
                });
                if (error) throw error;
                alert('가입이 완료되었습니다.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const isSignUp = mode === 'signup';

    return (
        <div className="auth-page grass-bg">
            <div className="auth-card panel-card">
                <div className="auth-brand">
                    <div className="auth-brand__logo">🖼️🔗</div>
                    <h1 className="auth-brand__title">사진 끝말잇기</h1>
                    <p className="auth-brand__tag">사진으로 잇는 끝말잇기 게임</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => setMode('login')}
                        disabled={mode === 'login'}
                    >
                        로그인
                    </button>
                    <button
                        className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                        onClick={() => setMode('signup')}
                        disabled={mode === 'signup'}
                    >
                        회원가입
                    </button>
                </div>

                <div className="auth-form">
                    <div className="field">
                        <label>이메일</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label>비밀번호</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {isSignUp && (
                        <div className="field">
                            <label>닉네임</label>
                            <input
                                type="text"
                                placeholder="게임에서 보일 이름"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <span className="hint">나중에 바꿀 수 있어요 · 중복 불가</span>
                        </div>
                    )}

                    <button className="btn-primary" onClick={() => handleAuth(isSignUp)} disabled={loading}>
                        {isSignUp ? '회원가입' : '로그인'}
                    </button>
                </div>
            </div>
        </div>
    );
}

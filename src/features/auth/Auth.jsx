import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
        <div>
            <h2>로그인 및 회원가입</h2>
            <div>
                <button onClick={() => setMode('login')} disabled={mode === 'login'}>
                    로그인
                </button>
                <button onClick={() => setMode('signup')} disabled={mode === 'signup'}>
                    회원가입
                </button>
            </div>
            <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            {isSignUp && (
                <input
                    type="text"
                    placeholder="닉네임"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            )}
            <button onClick={() => handleAuth(isSignUp)} disabled={loading}>
                {isSignUp ? '회원가입' : '로그인'}
            </button>
        </div>
    );
}

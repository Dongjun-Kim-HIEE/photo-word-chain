import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const formatNextStartChars = (chars) => {
    if (!chars || chars.length === 0) return '';
    if (chars.length === 1) return `다음 시작 글자: ${chars[0]}`;
    return `다음 시작 글자: ${chars[0]} 또는 ${chars[1]}`;
};

export default function GuessForm({ turnId }) {
    const [guess, setGuess] = useState('');
    const [resultMessage, setResultMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmed = guess.trim();
        if (!trimmed) return;

        setErrorMessage('');
        setResultMessage('');
        setSubmitting(true);

        try {
            const { data, error } = await supabase.rpc('submit_guess', {
                p_turn_id: turnId,
                p_guess: trimmed,
            });

            if (error) throw error;

            const result = data?.[0];
            if (!result) throw new Error('결과를 받지 못했습니다.');

            if (result.is_correct) {
                setResultMessage(`정답입니다! ${formatNextStartChars(result.next_start_chars)}`);
                setGuess('');
            } else if (result.already_solved) {
                setResultMessage(
                    `이미 다른 사람이 맞혔습니다. ${formatNextStartChars(result.next_start_chars)}`
                );
                setGuess('');
            } else {
                setResultMessage('오답입니다. 다시 시도해보세요');
            }
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="정답 입력"
            />
            <button type="submit" disabled={submitting}>
                제출
            </button>
            {resultMessage && <p>{resultMessage}</p>}
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        </form>
    );
}

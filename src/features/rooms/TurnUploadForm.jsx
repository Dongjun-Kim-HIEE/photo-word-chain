import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/theme.css';
import './GameScreen.css';

const GUESS_ERROR_MESSAGES = {
    not_authenticated: '로그인이 필요합니다',
    no_turn_to_guess: '맞힐 사진이 없습니다',
    turn_invalidated: '이 턴은 무효 처리되었습니다',
    already_solved: '이미 다른 사람이 진행했습니다',
    not_your_turn: '지금은 당신의 차례가 아닙니다',
    cannot_guess_own: '본인이 올린 사진은 맞힐 수 없습니다',
};

const SUBMIT_ERROR_MESSAGES = {
    ...GUESS_ERROR_MESSAGES,
    wrong_guess: '추측이 틀렸습니다.',
    no_answers: '정답을 1개 이상 입력해주세요',
    invalid_answer_ending: '정답은 한글 음절로 끝나야 합니다',
    duplicate_answer: '중복된 정답이 있습니다',
};

const HANGUL_SYLLABLE_END = /[가-힣]$/;

const formatAllowedStartChars = (chars) => {
    if (!chars || chars.length === 0) return '';
    if (chars.length === 1) return `'${chars[0]}'`;
    return `'${chars[0]}' 또는 '${chars[1]}'`;
};

export default function TurnUploadForm({ roomId, onUploaded, isFirstTurn }) {
    const [guess, setGuess] = useState('');
    const [guessChecking, setGuessChecking] = useState(false);
    const [guessError, setGuessError] = useState('');
    const [guessConfirmed, setGuessConfirmed] = useState(false);
    const [allowedStartChars, setAllowedStartChars] = useState(null);

    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [answers, setAnswers] = useState(['']);
    const [generalError, setGeneralError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    const showPhotoSection = isFirstTurn || guessConfirmed;

    const handleFileChange = (e) => {
        setFile(e.target.files?.[0] ?? null);
    };

    const handleAnswerChange = (index, value) => {
        setAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));
        setFieldErrors((prev) => {
            if (!(index in prev)) return prev;
            const next = { ...prev };
            delete next[index];
            return next;
        });
        setGeneralError('');
    };

    const handleAddAnswer = () => {
        setAnswers((prev) => [...prev, '']);
    };

    const handleRemoveAnswer = (index) => {
        setAnswers((prev) => prev.filter((_, i) => i !== index));
        setFieldErrors({});
        setGeneralError('');
    };

    const handleCheckGuess = async () => {
        const trimmed = guess.trim();
        if (!trimmed) return;

        setGuessError('');
        setGuessChecking(true);
        try {
            const { data: result, error } = await supabase.rpc('check_guess', {
                p_room_id: roomId,
                p_guess: trimmed,
            });
            if (error) throw error;

            if (!result.success) {
                setGuessError(GUESS_ERROR_MESSAGES[result.error_code] ?? '추측 확인에 실패했습니다.');
                return;
            }

            if (!result.correct) {
                setGuessError('틀렸습니다. 다시 시도해보세요.');
                return;
            }

            setAllowedStartChars(result.allowed_start_chars ?? null);
            setGuessConfirmed(true);
        } catch {
            setGuessError('추측 확인에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setGuessChecking(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!showPhotoSection) return;

        const entries = answers
            .map((value, index) => ({ index, value: value.trim() }))
            .filter((entry) => entry.value !== '');

        if (entries.length === 0) {
            setGeneralError('정답을 1개 이상 입력해주세요');
            setFieldErrors({});
            return;
        }
        setGeneralError('');

        const hangulErrors = {};
        entries.forEach((entry) => {
            if (!HANGUL_SYLLABLE_END.test(entry.value)) {
                hangulErrors[entry.index] = '한글 음절로 끝나야 합니다';
            }
        });

        if (Object.keys(hangulErrors).length > 0) {
            setFieldErrors(hangulErrors);
            return;
        }

        const countByValue = {};
        entries.forEach((entry) => {
            countByValue[entry.value] = (countByValue[entry.value] ?? 0) + 1;
        });

        const duplicateErrors = {};
        entries.forEach((entry) => {
            if (countByValue[entry.value] > 1) {
                duplicateErrors[entry.index] = '중복된 정답입니다';
            }
        });

        if (Object.keys(duplicateErrors).length > 0) {
            setFieldErrors(duplicateErrors);
            return;
        }

        if (!isFirstTurn && allowedStartChars && allowedStartChars.length > 0) {
            const hasAllowedStart = entries.some((entry) => allowedStartChars.includes(entry.value[0]));
            if (!hasAllowedStart) {
                setGeneralError(
                    `정답 중 하나는 반드시 ${formatAllowedStartChars(allowedStartChars)}로 시작해야 합니다`
                );
                return;
            }
        }

        setFieldErrors({});

        if (!file) {
            setSubmitError('사진을 선택해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            const extMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name);
            const ext = extMatch ? extMatch[1] : 'jpg';
            const safeFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const filePath = `${roomId}/${user.id}/${safeFileName}`;

            const { error: uploadError } = await supabase.storage
                .from('turn-photos')
                .upload(filePath, file);
            if (uploadError) throw new Error('UPLOAD_FAILED');

            const { data: result, error: rpcError } = await supabase.rpc('submit_turn', {
                p_room_id: roomId,
                p_guess: isFirstTurn ? null : guess.trim(),
                p_photo_path: filePath,
                p_answers: entries.map((entry) => entry.value),
            });
            if (rpcError) throw new Error('UPLOAD_FAILED');

            if (!result.success) {
                const err = new Error(result.error_code);
                err.result = result;
                throw err;
            }

            setGuess('');
            setGuessChecking(false);
            setGuessError('');
            setGuessConfirmed(false);
            setAllowedStartChars(null);
            setFile(null);
            setAnswers(['']);

            await onUploaded?.();
        } catch (error) {
            if (error.message === 'invalid_start_char') {
                const chars = error.result?.allowed_start_chars ?? allowedStartChars;
                setSubmitError(`정답 중 하나는 반드시 ${formatAllowedStartChars(chars)}로 시작해야 합니다`);
            } else if (SUBMIT_ERROR_MESSAGES[error.message]) {
                setSubmitError(SUBMIT_ERROR_MESSAGES[error.message]);
            } else {
                setSubmitError('사진 업로드에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="turn-form panel-card" onSubmit={handleSubmit}>
            {!isFirstTurn && (
                <div className="guess-step">
                    {!guessConfirmed && <p className="turn-form__stage-title">이 사진, 뭘까요?</p>}
                    <div className="guess-box">
                        <input
                            className="guess-box__input"
                            type="text"
                            value={guess}
                            onChange={(e) => {
                                setGuess(e.target.value);
                                setGuessError('');
                            }}
                            placeholder="이전 사진 맞히기"
                            readOnly={guessConfirmed}
                        />
                        {!guessConfirmed && (
                            <button
                                type="button"
                                className="guess-box__submit"
                                onClick={handleCheckGuess}
                                disabled={guessChecking || !guess.trim()}
                            >
                                {guessChecking ? '확인 중...' : '확인'}
                            </button>
                        )}
                    </div>
                    {guessError && <p className="form-error">{guessError}</p>}
                    {guessConfirmed && (
                        <p className="guess-confirmed-badge">
                            정답! 이제 {formatAllowedStartChars(allowedStartChars)}로 시작하는 사진을
                            올려주세요
                        </p>
                    )}
                </div>
            )}

            {showPhotoSection && (
                <div className="photo-section">
                    <p className="turn-form__stage-title">
                        {isFirstTurn ? '첫 사진을 올려주세요' : '내 사진 올리기'}
                    </p>
                    <div className="upload-drop">
                        <input
                            className="upload-drop__input"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        {previewUrl && <img className="upload-preview" src={previewUrl} alt="미리보기" />}
                    </div>

                    <div className="answer-fields">
                        {answers.map((answer, index) => (
                            <div key={index} className="answer-field-row">
                                <div className="answer-input">
                                    <input
                                        type="text"
                                        value={answer}
                                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                                        placeholder="정답 입력"
                                    />
                                    <button
                                        type="button"
                                        className="mini-btn"
                                        onClick={() => handleRemoveAnswer(index)}
                                        disabled={answers.length === 1}
                                    >
                                        -
                                    </button>
                                </div>
                                {fieldErrors[index] && (
                                    <div className="field-error">{fieldErrors[index]}</div>
                                )}
                            </div>
                        ))}
                        <button type="button" className="mini-btn mini-btn--add" onClick={handleAddAnswer}>
                            +
                        </button>
                    </div>

                    {generalError && <p className="form-error">{generalError}</p>}
                    {submitError && <p className="form-error">{submitError}</p>}

                    <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? '업로드 중...' : '사진 올리고 이어가기'}
                    </button>
                </div>
            )}
        </form>
    );
}

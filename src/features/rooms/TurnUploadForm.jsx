import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const ERROR_MESSAGES = {
    not_the_solver: '정답을 맞힌 사람만 다음 사진을 올릴 수 있습니다',
    turn_not_solved: '아직 아무도 정답을 맞히지 않았습니다',
    turn_invalidated: '이 턴은 무효 처리되었습니다',
    no_answers: '정답을 1개 이상 입력해주세요',
    invalid_answer_ending: '정답은 한글 음절로 끝나야 합니다',
    duplicate_answer: '중복된 정답이 있습니다',
};

const formatAllowedStartChars = (chars) => {
    if (!chars || chars.length === 0) return '';
    if (chars.length === 1) return `'${chars[0]}'`;
    return `'${chars[0]}' 또는 '${chars[1]}'`;
};

export default function TurnUploadForm({ roomId, onUploaded, allowedStartChars }) {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [answers, setAnswers] = useState(['']);
    const [generalError, setGeneralError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const HANGUL_SYLLABLE_END = /[가-힣]$/;

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

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
                p_photo_path: filePath,
                p_answers: entries.map((entry) => entry.value),
            });
            if (rpcError) throw new Error('UPLOAD_FAILED');

            if (!result.success) {
                throw new Error(result.error_code);
            }

            setFile(null);
            setAnswers(['']);

            await onUploaded?.();
        } catch (error) {
            if (error.message === 'invalid_start_char') {
                setSubmitError(`정답 중 하나는 반드시 ${formatAllowedStartChars(allowedStartChars)}로 시작해야 합니다`);
            } else if (ERROR_MESSAGES[error.message]) {
                setSubmitError(ERROR_MESSAGES[error.message]);
            } else {
                setSubmitError('사진 업로드에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {previewUrl && (
                    <img
                        src={previewUrl}
                        alt="미리보기"
                        style={{ maxWidth: '100%', display: 'block', marginTop: '0.5rem' }}
                    />
                )}
            </div>

            <div>
                {answers.map((answer, index) => (
                    <div key={index}>
                        <input
                            type="text"
                            value={answer}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                            placeholder="정답 입력"
                        />
                        <button
                            type="button"
                            onClick={() => handleRemoveAnswer(index)}
                            disabled={answers.length === 1}
                        >
                            -
                        </button>
                        {fieldErrors[index] && (
                            <div style={{ color: 'red', fontSize: '0.8rem' }}>{fieldErrors[index]}</div>
                        )}
                    </div>
                ))}
                <button type="button" onClick={handleAddAnswer}>
                    +
                </button>
            </div>

            {generalError && <p style={{ color: 'red' }}>{generalError}</p>}
            {submitError && <p style={{ color: 'red' }}>{submitError}</p>}

            <button type="submit" disabled={submitting}>
                {submitting ? '업로드 중...' : '제출'}
            </button>
        </form>
    );
}

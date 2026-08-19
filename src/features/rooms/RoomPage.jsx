import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import TurnUploadForm from './TurnUploadForm';
import GuessForm from './GuessForm';

export default function RoomPage() {
    const { roomId } = useParams();
    const [room, setRoom] = useState(null);
    const [creatorUsername, setCreatorUsername] = useState(null);
    const [turns, setTurns] = useState([]);
    const [signedUrls, setSignedUrls] = useState({});
    const [answerTexts, setAnswerTexts] = useState({});
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    const broadcastChannelRef = useRef(null);
    const currentUserIdRef = useRef(null);

    const answerTextsRef = useRef({});
    useEffect(() => {
        answerTextsRef.current = answerTexts;
    }, [answerTexts]);

    useEffect(() => {
        let cancelled = false;

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!cancelled) setCurrentUserId(user?.id ?? null);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const fetchTurns = async () => {
        const { data: feedData } = await supabase
            .from('room_feed')
            .select('*')
            .eq('room_id', roomId)
            .eq('event_type', 'photo_turn')
            .order('created_at', { ascending: true });

        const feedRows = feedData ?? [];

        if (feedRows.length === 0) {
            setTurns([]);
            setSignedUrls({});
            setAnswerTexts({});
            return;
        }

        const { data: turnsMeta } = await supabase
            .from('turns')
            .select('id, turn_number, matched_answer_id, is_invalidated')
            .in('id', feedRows.map((row) => row.id));

        const metaById = {};
        turnsMeta?.forEach((meta) => {
            metaById[meta.id] = meta;
        });

        const rows = feedRows.map((row) => ({
            id: row.id,
            photoPath: row.photo_url,
            postedBy: row.actor_id,
            turnNumber: metaById[row.id]?.turn_number ?? null,
            matchedAnswerId: metaById[row.id]?.matched_answer_id ?? null,
            isInvalidated: metaById[row.id]?.is_invalidated ?? false,
        }));

        const urlMap = {};
        const { data: signedData } = await supabase.storage
            .from('turn-photos')
            .createSignedUrls(rows.map((row) => row.photoPath), 3600);

        signedData?.forEach((item, i) => {
            urlMap[rows[i].id] = item.signedUrl;
        });

        const matchedAnswerIds = rows.map((row) => row.matchedAnswerId).filter(Boolean);
        const answerTextMap = {};

        if (matchedAnswerIds.length > 0) {
            const { data: answersData } = await supabase
                .from('answers')
                .select('id, answer_text')
                .in('id', matchedAnswerIds);

            answersData?.forEach((answer) => {
                answerTextMap[answer.id] = answer.answer_text;
            });
        }

        setTurns(rows);
        setSignedUrls(urlMap);
        setAnswerTexts(answerTextMap);
    };

    useEffect(() => {
        let cancelled = false;

        const fetchRoom = async () => {
            setLoading(true);
            setNotFound(false);

            const { data: roomData, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .maybeSingle();

            if (cancelled) return;

            if (error || !roomData) {
                setNotFound(true);
                setRoom(null);
                setLoading(false);
                return;
            }

            setRoom(roomData);

            await fetchTurns();

            if (roomData.created_by) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', roomData.created_by)
                    .maybeSingle();

                if (!cancelled) {
                    setCreatorUsername(profileData?.username ?? null);
                }
            } else {
                setCreatorUsername(null);
            }

            setLoading(false);
        };

        fetchRoom();

        return () => {
            cancelled = true;
        };
    }, [roomId]);

    useEffect(() => {
        const handleTurnInsert = async (inserted) => {
            let alreadyExists = false;

            setTurns((prev) => {
                if (prev.some((t) => t.id === inserted.id)) {
                    alreadyExists = true;
                    return prev;
                }
                return [
                    ...prev,
                    {
                        id: inserted.id,
                        photoPath: inserted.photo_url,
                        postedBy: inserted.posted_by,
                        turnNumber: inserted.turn_number,
                        matchedAnswerId: inserted.matched_answer_id,
                        isInvalidated: inserted.is_invalidated,
                    },
                ];
            });

            if (alreadyExists) return;

            const { data: signedData } = await supabase.storage
                .from('turn-photos')
                .createSignedUrl(inserted.photo_url, 3600);

            if (signedData) {
                setSignedUrls((prev) => ({ ...prev, [inserted.id]: signedData.signedUrl }));
            }
        };

        const handleTurnUpdate = async (updated) => {
            setTurns((prev) =>
                prev.map((t) =>
                    t.id === updated.id
                        ? {
                              ...t,
                              matchedAnswerId: updated.matched_answer_id,
                              isInvalidated: updated.is_invalidated,
                          }
                        : t
                )
            );

            if (updated.matched_answer_id && !answerTextsRef.current[updated.matched_answer_id]) {
                const { data: answerData } = await supabase
                    .from('answers')
                    .select('id, answer_text')
                    .eq('id', updated.matched_answer_id)
                    .maybeSingle();

                if (answerData) {
                    setAnswerTexts((prev) => ({ ...prev, [answerData.id]: answerData.answer_text }));
                }
            }
        };

        const channel = supabase
            .channel(`room-${roomId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'turns', filter: `room_id=eq.${roomId}` },
                (payload) => handleTurnInsert(payload.new)
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'turns', filter: `room_id=eq.${roomId}` },
                (payload) => handleTurnUpdate(payload.new)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    useEffect(() => {
        let isMounted = true;
        let presenceChannel = null;
        let handleVisibilityChange = null;

        const setupPresence = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user || !isMounted) return;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .maybeSingle();

            if (!isMounted) return;

            const username = profileData?.username ?? '익명';

            presenceChannel = supabase.channel(`room-${roomId}-presence`, {
                config: { presence: { key: user.id } },
            });

            const trackPresence = () => {
                presenceChannel.track({
                    user_id: user.id,
                    username,
                    online_at: new Date().toISOString(),
                });
            };

            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel.presenceState();
                    setOnlineUsers(Object.values(state).map((entries) => entries[0]));
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        trackPresence();
                    }
                });

            handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    trackPresence();
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
        };

        setupPresence();

        return () => {
            isMounted = false;

            if (handleVisibilityChange) {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }

            if (presenceChannel) {
                presenceChannel.untrack();
                supabase.removeChannel(presenceChannel);
            }

            setOnlineUsers([]);
        };
    }, [roomId]);

    useEffect(() => {
        let isMounted = true;
        let channel = null;

        const setupBroadcast = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user || !isMounted) return;

            currentUserIdRef.current = user.id;

            channel = supabase.channel(`room-${roomId}-broadcast`);

            channel
                .on('broadcast', { event: 'report_test' }, (payload) => {
                    console.log('report_test received:', payload);
                })
                .subscribe();

            broadcastChannelRef.current = channel;
        };

        setupBroadcast();

        return () => {
            isMounted = false;
            broadcastChannelRef.current = null;
            currentUserIdRef.current = null;

            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [roomId]);

    // TEMP: Phase 6에서 실제 "억지 신고" 버튼으로 교체 예정 — Broadcast 채널 수신 확인용
    const handleTestBroadcast = () => {
        const channel = broadcastChannelRef.current;
        if (!channel || !currentUserIdRef.current) return;

        channel.send({
            type: 'broadcast',
            event: 'report_test',
            payload: { from: currentUserIdRef.current, sent_at: new Date().toISOString() },
        });
    };

    if (loading) {
        return <div>불러오는 중...</div>;
    }

    if (notFound) {
        return (
            <div>
                <p>방을 찾을 수 없습니다.</p>
                <Link to="/">목록으로 돌아가기</Link>
            </div>
        );
    }

    return (
        <div>
            <Link to="/">← 방 목록</Link>
            <h2>{room.name}</h2>
            <p>만든 사람: {creatorUsername ?? '알 수 없음'}</p>
            <p>
                현재 접속자:{' '}
                {onlineUsers.length === 0
                    ? '-'
                    : onlineUsers.map((u) => u.username).join(', ')}
            </p>
            {/* TEMP: Phase 6에서 실제 "억지 신고" 버튼으로 교체 예정 */}
            <button onClick={handleTestBroadcast}>Broadcast 테스트</button>

            {turns.length === 0 ? (
                <>
                    <p>아직 사진이 없습니다. 첫 사진을 올려보세요.</p>
                    <TurnUploadForm roomId={roomId} onUploaded={fetchTurns} />
                </>
            ) : (
                <div>
                    {turns.map((turn) => (
                        <div key={turn.id} style={{ marginBottom: '1rem' }}>
                            {turn.isInvalidated && (
                                <p style={{ color: 'red', fontWeight: 'bold' }}>무효 처리됨</p>
                            )}
                            <img
                                src={signedUrls[turn.id]}
                                alt={`turn ${turn.turnNumber ?? ''}`}
                                style={{ maxWidth: '100%', display: 'block' }}
                            />
                            {turn.matchedAnswerId && (
                                <p>정답: {answerTexts[turn.matchedAnswerId] ?? '...'}</p>
                            )}
                        </div>
                    ))}
                    {(() => {
                        const latestTurn = turns[turns.length - 1];
                        if (
                            latestTurn &&
                            latestTurn.matchedAnswerId === null &&
                            currentUserId &&
                            latestTurn.postedBy !== currentUserId
                        ) {
                            return <GuessForm turnId={latestTurn.id} />;
                        }
                        return null;
                    })()}
                </div>
            )}
        </div>
    );
}

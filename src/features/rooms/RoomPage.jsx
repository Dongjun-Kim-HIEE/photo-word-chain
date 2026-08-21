import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import TurnUploadForm from './TurnUploadForm';
import '../../styles/theme.css';
import './GameScreen.css';

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
    const [turnHolderId, setTurnHolderId] = useState(null);
    const [turnHolderUsername, setTurnHolderUsername] = useState(null);
    const [memberCount, setMemberCount] = useState(0);

    const broadcastChannelRef = useRef(null);
    const currentUserIdRef = useRef(null);

    const answerTextsRef = useRef({});
    useEffect(() => {
        answerTextsRef.current = answerTexts;
    }, [answerTexts]);

    const turnsRef = useRef([]);
    useEffect(() => {
        turnsRef.current = turns;
    }, [turns]);

    // 다음 턴 담당자(순번)와 현재 방 인원을 다시 계산한다.
    const refreshTurnHolderForTurn = async (nextTurnNumber) => {
        const [{ data: holderId }, { count }] = await Promise.all([
            supabase.rpc('get_turn_holder', { p_room_id: roomId, p_turn_number: nextTurnNumber }),
            supabase
                .from('room_members')
                .select('user_id', { count: 'exact', head: true })
                .eq('room_id', roomId),
        ]);

        setTurnHolderId(holderId ?? null);
        setMemberCount(count ?? 0);
    };

    const refreshTurnHolderFromTurnsList = async (turnsList) => {
        const lastTurn = turnsList[turnsList.length - 1];
        const nextTurnNumber = lastTurn ? (lastTurn.turnNumber ?? turnsList.length) + 1 : 1;
        await refreshTurnHolderForTurn(nextTurnNumber);
    };

    // 담당자 유저네임 조회 (내 차례가 아닐 때만 필요)
    useEffect(() => {
        let cancelled = false;

        const loadTurnHolderUsername = async () => {
            if (!turnHolderId || turnHolderId === currentUserId) {
                if (!cancelled) setTurnHolderUsername(null);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', turnHolderId)
                .maybeSingle();

            if (!cancelled) setTurnHolderUsername(data?.username ?? null);
        };

        loadTurnHolderUsername();

        return () => {
            cancelled = true;
        };
    }, [turnHolderId, currentUserId]);

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
            await refreshTurnHolderFromTurnsList([]);
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
        await refreshTurnHolderFromTurnsList(rows);
    };

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            setLoading(true);
            setNotFound(false);

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (cancelled) return;
            setCurrentUserId(user?.id ?? null);

            if (user) {
                // joined_at은 최초 입장 시각 1회만 기록되어야 하므로 이미 있으면 갱신하지 않는다.
                await supabase
                    .from('room_members')
                    .upsert(
                        { room_id: roomId, user_id: user.id },
                        { onConflict: 'room_id,user_id', ignoreDuplicates: true }
                    );
            }
            if (cancelled) return;

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

        init();

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

            await refreshTurnHolderForTurn(inserted.turn_number + 1);
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

            await refreshTurnHolderFromTurnsList(turnsRef.current);
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
        return (
            <div className="room-page grass-bg">
                <div className="room-page__inner">
                    <div className="status-panel panel-card">불러오는 중...</div>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="room-page grass-bg">
                <div className="room-page__inner">
                    <div className="status-panel panel-card">
                        <p>방을 찾을 수 없습니다.</p>
                        <Link to="/" className="room-topbar__back">
                            목록으로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isFirstTurn = turns.length === 0;
    const notEnoughMembers = !isFirstTurn && memberCount < 2;
    const isMyTurn = Boolean(currentUserId) && turnHolderId === currentUserId;

    return (
        <div className="room-page grass-bg">
            <div className="room-page__inner">
                <div className="room-topbar">
                    <Link to="/" className="room-topbar__back">
                        ← 방 목록
                    </Link>
                    <div className="room-topbar__info">
                        <h2 className="room-topbar__title">{room.name}</h2>
                        <p className="room-topbar__meta">만든 사람: {creatorUsername ?? '알 수 없음'}</p>
                    </div>
                    <span className="room-topbar__spacer" />
                    <div className="room-topbar__online">
                        <span className="room-topbar__online-label">현재 접속자</span>
                        <span className="room-topbar__online-value">
                            {onlineUsers.length === 0
                                ? '-'
                                : onlineUsers.map((u) => u.username).join(', ')}
                        </span>
                    </div>
                    {/* TEMP: Phase 6에서 실제 "억지 신고" 버튼으로 교체 예정 */}
                    <button className="btn-ghost-small" onClick={handleTestBroadcast}>
                        Broadcast 테스트
                    </button>
                </div>

                {isFirstTurn ? (
                    <div className="stage stage-empty panel-card">
                        <p>아직 사진이 없습니다. 첫 사진을 올려보세요.</p>
                    </div>
                ) : (
                    <div className="turns-list">
                        {turns.map((turn) => (
                            <div key={turn.id} className="turn-card panel-card">
                                {turn.isInvalidated && <p className="turn-card__invalid">무효 처리됨</p>}
                                <div className="turn-card__photo">
                                    <img src={signedUrls[turn.id]} alt={`turn ${turn.turnNumber ?? ''}`} />
                                </div>
                                {turn.matchedAnswerId && (
                                    <p className="turn-card__answer">
                                        정답: {answerTexts[turn.matchedAnswerId] ?? '...'}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {notEnoughMembers ? (
                    <div className="status-panel panel-card">
                        <p>2명 이상 입장해야 게임을 이어갈 수 있습니다.</p>
                    </div>
                ) : isMyTurn ? (
                    <TurnUploadForm roomId={roomId} onUploaded={fetchTurns} isFirstTurn={isFirstTurn} />
                ) : (
                    turnHolderId && (
                        <div className="status-panel panel-card">
                            <p>지금은 {turnHolderUsername ?? '...'}님의 차례입니다.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

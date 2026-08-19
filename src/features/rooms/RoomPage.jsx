import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import TurnUploadForm from './TurnUploadForm';

export default function RoomPage() {
    const { roomId } = useParams();
    const [room, setRoom] = useState(null);
    const [creatorUsername, setCreatorUsername] = useState(null);
    const [turns, setTurns] = useState([]);
    const [signedUrls, setSignedUrls] = useState({});
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const fetchTurns = async () => {
        const { data: turnsData } = await supabase
            .from('turns')
            .select('*')
            .eq('room_id', roomId)
            .order('turn_number', { ascending: true });

        const rows = turnsData ?? [];
        const urlMap = {};

        if (rows.length > 0) {
            const { data: signedData } = await supabase.storage
                .from('turn-photos')
                .createSignedUrls(rows.map((turn) => turn.photo_url), 3600);

            signedData?.forEach((item, i) => {
                urlMap[rows[i].id] = item.signedUrl;
            });
        }

        setTurns(rows);
        setSignedUrls(urlMap);
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

            {turns.length === 0 ? (
                <>
                    <p>아직 사진이 없습니다. 첫 사진을 올려보세요.</p>
                    <TurnUploadForm roomId={roomId} onUploaded={fetchTurns} />
                </>
            ) : (
                <div>
                    {turns.map((turn) => (
                        <img
                            key={turn.id}
                            src={signedUrls[turn.id]}
                            alt={`turn ${turn.turn_number}`}
                            style={{ maxWidth: '100%', display: 'block', marginBottom: '1rem' }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

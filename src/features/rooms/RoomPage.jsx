import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function RoomPage() {
    const { roomId } = useParams();
    const [room, setRoom] = useState(null);
    const [creatorUsername, setCreatorUsername] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

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
            <p>여기서 게임이 진행됩니다.</p>
        </div>
    );
}

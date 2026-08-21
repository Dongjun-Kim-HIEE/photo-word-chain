import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/theme.css';
import '../../styles/lobby.css';

export default function RoomList() {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchRooms = async () => {
        const { data, error } = await supabase
            .from('rooms')
            .select('*');

        if (!error && data) {
            setRooms(data);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const trimmedName = newRoomName.trim();
        if (trimmedName.length === 0) {
            alert('방 이름을 입력해 주세요.');
            return;
        }

        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('rooms')
                .insert({ name: trimmedName, created_by: user.id });
            if (error) throw error;

            setNewRoomName('');
            await fetchRooms();
        } catch (error) {
            alert(error.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div className="create-card panel-card">
                <h2 className="create-card__title">+ 새 방 만들기</h2>
                <form className="create-row" onSubmit={handleCreateRoom}>
                    <input
                        className="text-input"
                        type="text"
                        placeholder="방 이름을 입력하세요"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                    />
                    <button type="submit" className="btn-primary create-row__btn" disabled={creating}>
                        만들기
                    </button>
                </form>
            </div>

            <div className="list-head">
                <h2 className="list-head__title">열려 있는 방</h2>
                <span className="list-head__count">{rooms.length}</span>
            </div>

            {rooms.length === 0 ? (
                <div className="empty-state panel-card">아직 만들어진 방이 없습니다. 첫 방을 만들어보세요.</div>
            ) : (
                <div className="room-grid">
                    {rooms.map((room) => (
                        <Link to={`/room/${room.id}`} key={room.id} className="room-card panel-card">
                            <span className="room-card__thumb">🎮</span>
                            <span className="room-card__name">{room.name}</span>
                            <span className="room-card__go">›</span>
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}

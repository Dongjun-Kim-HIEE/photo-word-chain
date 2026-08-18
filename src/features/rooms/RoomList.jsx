import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

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
        <div>
            <h2>방 목록</h2>
            <form onSubmit={handleCreateRoom}>
                <input
                    type="text"
                    placeholder="방 이름"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                />
                <button type="submit" disabled={creating}>
                    만들기
                </button>
            </form>
            <ul>
                {rooms.map((room) => (
                    <li key={room.id}>
                        <Link to={`/room/${room.id}`}>{room.name}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function RoomList() {
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        const fetchRooms = async () => {
            const { data, error } = await supabase
                .from('rooms')
                .select('*');

            if (!error && data) {
                setRooms(data);
            }
        };

        fetchRooms();
    }, []);

    return (
        <div>
            <h2>방 목록</h2>
            <ul>
                {rooms.map((room) => (
                    <li key={room.id}>{room.name}</li>
                ))}
            </ul>
        </div>
    );
}
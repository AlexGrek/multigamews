import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Messenger from '../core/Messenger';

interface RoomInfo {
    name: string
    userCount: number
    game: string
}

interface RoomsLobbyProps {
    rooms: RoomInfo[];
    visible: boolean
    msg: Messenger | null
}

const RoomsLobby: React.FC<RoomsLobbyProps> = ({ rooms, visible, msg }) => {
    const [roomsInfo, setRoomsInfo] = useState<RoomInfo[]>(rooms);
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [name, setName] = useState<string>('');

    useEffect(() => {
        setRoomsInfo(rooms);
    }, [rooms]);

    const handleOpenCr = () => {
        setCreateDialogOpen(true);
    };

    const handleCloseCr = () => {
        setCreateDialogOpen(false);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    };

    const enterRoom = (room: RoomInfo) => {
        if (msg)
            msg.send({"type": "init", "command": "enter", "name": room.name})
    }

    const renderRooms = () => {
        return roomsInfo.map((room) => {
            return <button onClick={() => enterRoom(room)} className='room-button swing-in-top-fwd' key={room.name}>{room.name} ({room.game}) [{room.userCount}]</button>
        })
    }

    const handleNewButtonClick = () => {
        setCreateDialogOpen(false)
        if (msg)
            msg.send({"type": "init", "command": "create", "name": name})
        setName("")
      };

    return (
        <div>
            {visible && renderRooms()}
            <button className='room-button new-room swing-in-top-fwd' onClick={handleOpenCr}>Create</button>
            <Modal isOpen={createDialogOpen} onClose={handleCloseCr}>
                Name:
                <input
                    type="text"
                    value={name}
                    onChange={handleInputChange}
                />

                <button
                    onClick={handleNewButtonClick}
                    disabled={name.trim() === ''} // Disable the button if the input is empty
                >
                    Create
                </button>
            </Modal>
        </div>
    );
};

export default RoomsLobby;

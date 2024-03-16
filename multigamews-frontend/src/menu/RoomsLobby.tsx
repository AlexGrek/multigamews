import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Messenger from '../core/Messenger';
import './RoomsLobby.css';
import Choices from '../common/Choices';

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
    const [gameType, setGameType] = useState<string>('poker');
    const [selected, setSelected] = useState<string | null>(null)

    useEffect(() => {
        setRoomsInfo(rooms);
    }, [rooms]);

    const anim = (base: string, entry?: string) => {
        if (selected) {
            return `${base} fadeout`
        }
        else return entry ? `${base} ${entry}` : base
    }

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
        if (msg) {
            setSelected(room.name)
            setTimeout(() =>
                msg.send({ "type": "init", "command": "enter", "name": room.name }), 500)
        }
    }

    const renderRooms = () => {
        return roomsInfo.map((room) => {
            return <button className={anim("room-button", "swing-in-top-fwd")} onClick={() => enterRoom(room)} key={room.name}>{room.name} ({room.game}) [{room.userCount}]</button>
        })
    }

    const handleNewButtonClick = () => {
        setCreateDialogOpen(false)
        if (msg)
            msg.send({ "type": "init", "command": "create", "name": name, "game": gameType })
        setName("")
    };

    return (
        <div>
            {visible && renderRooms()}
            <button className={anim("room-button new-room", "swing-in-top-fwd")} onClick={handleOpenCr}>Create</button>
            <Modal header="Create new room" isOpen={createDialogOpen} onClose={handleCloseCr}>
                Name:
                <input
                    type="text"
                    value={name}
                    onChange={handleInputChange}
                />
                <Choices value={gameType} options={[{ value: "poker", label: "poker" }, { value: "chat", "label": "chat" }, { value: "dixit", "label": "Dixit" }]} onChange={(v) => setGameType(v)} ></Choices>
                <button
                    onClick={handleNewButtonClick}
                    disabled={name.trim() === ''}
                >
                    Create
                </button>
            </Modal>
        </div>
    );
};

export default RoomsLobby;

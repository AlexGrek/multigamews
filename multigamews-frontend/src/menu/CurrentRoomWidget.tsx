import React from 'react';
import Messenger from '../core/Messenger';

interface CurrentRoomWidgetProps {
    currentRoom: string | null;
    msg: Messenger | null
}

const CurrentRoomWidget: React.FC<CurrentRoomWidgetProps> = ({ currentRoom, msg }) => {
    const handleLeaveClick = () => {
        msg?.send({"type": "init", "command":  "enter", "name": null})
    }

    return (
        <button onClick={() => handleLeaveClick()}>
            <i className='"fa-solid fa-circle-up"'></i>  {currentRoom}
        </button>
    );
};

export default CurrentRoomWidget;

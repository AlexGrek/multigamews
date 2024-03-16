import React from 'react';
import './DixitSeat.css'
import { DixitPlayer, Seat } from './DixitGame';

interface DixitSeatProps {
    seat: Seat;
    isMe: boolean;
    isTurn: boolean;
    dixitPlayer: DixitPlayer | null;
}

const DixitSeat: React.FC<DixitSeatProps> = ({ seat, isMe, dixitPlayer, isTurn }) => {
    const genClass = (baseClass: string) => {
        let base = isTurn ? `${baseClass} turn` : baseClass
        if (!isMe) {
            return base
        } else {
            return `${base} me`
        }
    }

    const renderBottom = (player: DixitPlayer) => {
        return <div className='dixit-player-bottom-panel'>
            <p>{player.pts}</p>
        </div>
    }

    return (
        <div className={genClass("dixit-seat dixit-seat-container")} style={{ backgroundImage: `url("${seat?.info?.avatar}")` }}>
            <div className='dixit-seat-name'>
                <p>{seat.info?.name}</p>
            </div>
            <div className='dixit-seat-bottom'>
                {dixitPlayer && renderBottom(dixitPlayer)}
            </div>
        </div>
    );
};

export default DixitSeat;

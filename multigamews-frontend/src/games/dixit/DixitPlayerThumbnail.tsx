import React from 'react';
import { DixitPlayer, Seat } from './DixitGame';
import "../DixitPlayerThumbnail.css"

interface DixitPlayerThumbnailProps {
    player: DixitPlayer;
    seat: Seat | null;
    isChosen: boolean;
    me: boolean;
}

const DixitPlayerThumbnail: React.FC<DixitPlayerThumbnailProps> = ({ player, seat, me }) => {
    const clazz = (player.acted || player.guess) ? "faded" : "";
    const meclass = (me) ? "me" : "";
    return (
        <div className={`dixit-thumbnail ${clazz} ${meclass}`} style={{ backgroundImage: `url("${seat?.info?.avatar}")` }}>
            <p>{seat?.info?.name}</p>
            <p>{player.pts}</p>
        </div>
    );
};

export default DixitPlayerThumbnail;

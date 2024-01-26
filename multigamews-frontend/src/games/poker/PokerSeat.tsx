import React from 'react';
import { UserInfo } from '../../menu/AppWrapper';
import Card from '../../common/Card';
import CardStack from '../../common/CardStack';
import './PokerSeat.css'

export interface Seat {
    info: UserInfo | null
    ai: boolean
}

export interface PokerAction {
    action: "call" | "check" | "fold" | "fold_show" | "bet" | "raise"
    amount: number
}

export interface PokerPlayer {
    stack: number
    bet: number | null
    cards: string[]
    folded: boolean
    lastAction?: PokerAction
    isAllIn: boolean
}

interface PokerSeatProps {
    seat: Seat;
    isMe: boolean;
    isTurn: boolean;
    pokerPlayer: PokerPlayer | null;
}

const PokerSeat: React.FC<PokerSeatProps> = ({ seat, isMe, pokerPlayer, isTurn }) => {
    const genClass = (baseClass: string) => {
        let base = isTurn ? `${baseClass} turn` : baseClass
        if (!isMe) {
            return base
        } else {
            return `${base} me`
        }
    }

    const renderLastAction = (player: PokerPlayer) => {
        return <p key={`${player.lastAction?.action} ${player.lastAction?.amount}`} className='poker-last-action'>{player.lastAction?.action}</p>
    }

    const renderBottom = (player: PokerPlayer) => {
        return <div className='poker-player-bottom-panel'>
            <p>{player.stack}</p>
        </div>
    }

    const renderSeatBet = () => {
        if (pokerPlayer?.bet) {
            return <div key={pokerPlayer?.bet} className='poker-seat-bet'>{pokerPlayer?.bet}</div>
        }
    }

    const renderSeatCards = () => {
        if (pokerPlayer && pokerPlayer.cards.length > 0) {
            const folded = pokerPlayer.folded ? "folded" : ""
            return <div className={`poker-seat-cards ${folded}`}><CardStack cards={pokerPlayer.cards}/></div>
        }
        return <div/>
    }


    return (
        <div className={genClass("poker-seat poker-seat-container")} style={{backgroundImage: `url("${seat?.info?.avatar}")`}}>
            <div className='poker-seat-name'>
                <p>{seat.info?.name}</p>
            </div>
            <div className='poker-seat-popup'>
                {renderSeatBet()}
                {pokerPlayer && renderLastAction(pokerPlayer)}
                {renderSeatCards()}
            </div>
            <div className='poker-seat-bottom'>
                {pokerPlayer && renderBottom(pokerPlayer)}
            </div>
        </div>
    );
};

export default PokerSeat;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserInfo } from '../../menu/AppWrapper';
import CardStack from '../../common/CardStack';
import './PokerSeat.css'
import Seatbet from './Seatbet';
import Tablebet from './Tablebet';

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
    center: React.RefObject<HTMLDivElement>
}

const PokerSeat: React.FC<PokerSeatProps> = ({ seat, isMe, pokerPlayer, isTurn, center }) => {
    const [prevBet, setPrevBet] = useState<number>(0)




    useEffect(() => {
        if (pokerPlayer) {
            if (pokerPlayer.bet != prevBet) {
                if (pokerPlayer.bet == 0) {
                    // genAnimatedClassForBet()
                }
                setPrevBet(pokerPlayer.bet ? pokerPlayer.bet : 0)
            }
        }
    }, [pokerPlayer])

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
            <p><Tablebet bet={player.stack} className='player-stack'/></p>
        </div>
    }



    const renderSeatBet = () => {
        if (pokerPlayer?.bet) {
            return <Seatbet bet={pokerPlayer?.bet || 0} center={center} />
        }
        else if (prevBet > 0) {
            console.log("No bet!")
            return <Seatbet bet={0} center={center} />
        }
        console.log("Nothing at all")
        return null
    }

    const renderSeatCards = () => {
        if (pokerPlayer && pokerPlayer.cards.length > 0) {
            const folded = pokerPlayer.folded ? "folded" : ""
            return <div className={`poker-seat-cards ${folded}`}><CardStack cards={pokerPlayer.cards} /></div>
        }
        return <div />
    }


    return (
        <div className={genClass("poker-seat poker-seat-container")} style={{ backgroundImage: `url("${seat?.info?.avatar}")` }}>
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

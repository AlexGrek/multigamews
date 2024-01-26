import React, { useEffect, useState } from 'react';
import CardStack from '../../common/CardStack';
import { Seat } from './PokerSeat';
import './PokerTable.css'

interface PokerTableProps {
    tableCards: string[]
    bank: number
    data: PokerComment[]
    players: Seat[] | null
    victory: VictoryRecord | null
}

export interface PokerComment {
    text: string;
    seats: number[];
}

export interface VictoryRecord {
    folded: boolean;
    winners: number[];
    won: number;
    combination?: string | null;
}

const getPlayerBySeat = (seat: number, players: Seat[] | null) => {
    if (seat < 0 || players == null || players.length < seat) {
        return null
    }
    return players[seat]
}

const processComment = (data: PokerComment, players: Seat[]) => {
    if (data.seats.length > 0 && players.length > 0 && players[data.seats[0]]) {
        const player = players[data.seats[0]]
        const text = data.text.replace("$$", `${player.info?.name}`)
        return text
    }
    return data.text
}

const PokerTable: React.FC<PokerTableProps> = ({ tableCards, bank, data, players, victory }) => {
    const [messages, setMessages] = useState<string[]>(data.map((a) => processComment(a, players || [])))
    const [lastLength, setLastLength] = useState<number>(0)

    useEffect(() => {
        const news = data.slice(lastLength)
        setLastLength(data.length)
        setMessages(news.map(a => processComment(a, players || [])))
    }, [data])

    const genClass = (baseClass: string) => {
        return `${baseClass}`
    }

    const renderVictory = (victory: VictoryRecord) => {
        const plrs: string = victory.winners.map(seat => {
            const plr = getPlayerBySeat(seat, players)
            if (plr) {
                return plr.info?.name
            } else {
                return "???"
            }
        }
        ).join(", ")
        const reason = victory.folded ? "everyone folded" : `${victory.combination}`
        const text = `Player ${plrs} wins ${victory.won}: {reason}`
        return <h2 key={text} className='poker-victory-msg-text'>
            Player <b className='poker-table-player-won-name'>{plrs}</b> wins <b className='poker-table-player-won-amount'>${victory.won}</b> with <i className='poker-table-player-won-reason'>{reason}</i>
        </h2>
    }


    return (
        <div className={genClass("poker-table")}>
            {victory && <div className='poker-victory-msg'>{renderVictory(victory)}</div>}
            <div className='poker-messages'>
                {messages.map((msg) => {
                    return <p className='poker-msg' key={msg}>{msg}</p>
                })}
            </div>
            <div className='poker-table-bank'>
                <h2>{bank}</h2>
            </div>
            <div className='poker-table-cards'>
                <CardStack cards={tableCards} />
            </div>
        </div>
    );
};

export default PokerTable;

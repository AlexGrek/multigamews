import React, { useState, useEffect } from 'react';
import Messenger from '../../core/Messenger';
import MicroChat, { MessageInfo } from '../../common/MicroChat';
import { UserInfo } from '../../menu/AppWrapper';
import './PokerGame.css'

interface PokerGameProps {
    msg: Messenger | null;
    user: UserInfo | null;
}

interface Seat {
    info: UserInfo | null
    ai: boolean
}

interface PokerGameSetup {
    gameName: "holdem"
    seats: Seat[]
}

interface PokerAction {
    action: "call" | "check" | "fold" | "fold_show" | "bet" | "raise"
    amount: number
}

interface PokerPlayer {
    stack: number
    bet: number | null
    cards: string[]
    folded: boolean
    lastAction?: PokerAction
    isAllIn: boolean
}

interface PokerGamePlaying {
    players: (PokerPlayer | null)[]
    dealer: number
    turn: number
    table: string[]
    bank: number
}

interface PokerGameStatus {
    stage: "playing" | "setup" | "result"
    setup: PokerGameSetup
    playing?: PokerGamePlaying
}

const PokerGame: React.FC<PokerGameProps> = ({ msg, user }) => {
    const [lastMsg, setLastMsg] = useState<MessageInfo | null>(null)

    useEffect(() => {
        if (msg != null) {
            msg.onMessageType("game", (message) => {
                const data = message.data
                if (data.type === 'chat') {
                    setLastMsg({ "text": data.text, "sender": data.sender.name })
                }
            })
        }
    }, [msg]);

    const handleSend = (text: string) => {
        msg?.send({ type: 'game', data: { type: 'chat', text } })
    }

    return (
        <div className='poker-root'>
            
            <MicroChat message={lastMsg} send={handleSend} />
        </div>
    );
};

export default PokerGame;

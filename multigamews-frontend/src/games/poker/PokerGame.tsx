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

function genLoadingSetup(): PokerGameSetup {
    return {
        gameName: "holdem",
        seats: []
    }
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
    stage: "playing" | "setup" | "result" | "loading"
    setup: PokerGameSetup
    playing?: PokerGamePlaying
}

const PokerGame: React.FC<PokerGameProps> = ({ msg, user }) => {
    const [lastMsg, setLastMsg] = useState<MessageInfo | null>(null)
    const [status, setStatus] = useState<PokerGameStatus>({stage: "loading", setup: genLoadingSetup()})

    useEffect(() => {
        if (msg != null) {
            msg.onMessageType("game", (message) => {
                const data = message.data
                if (data.type === 'status') {
                    setStatus(data.status)
                }
                if (data.type === 'chat') {
                    setLastMsg({ "text": data.text, "sender": data.sender.name })
                }
            })
        }
    }, [msg]);

    const handleSend = (text: string) => {
        msg?.send({ type: 'game', data: { type: 'chat', text } })
    }

    const main = () => {
        const stage = status.stage
        if (stage == "loading") {
            return <div><h2>Loading...</h2></div>
        }
        if (stage == "setup") {
            return <div>setup screen</div>
        }
        if (stage == "playing") {
            return <div>game screen</div>
        }
        return <div><h2>Unsupported stage</h2></div>
    }

    return (
        <div className='poker-root'>
            {main()}
            <MicroChat message={lastMsg} send={handleSend} />
        </div>
    );
};

export default PokerGame;

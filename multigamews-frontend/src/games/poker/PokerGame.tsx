import React, { useState, useEffect } from 'react';
import Messenger from '../../core/Messenger';
import MicroChat, { MessageInfo } from '../../common/MicroChat';
import { UserInfo } from '../../menu/AppWrapper';
import './PokerGame.css'
import Choices from '../../common/Choices';
import PokerSeat, { PokerAction, PokerPlayer, Seat } from './PokerSeat';

interface PokerGameProps {
    msg: Messenger | null;
    user: UserInfo | null;
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

interface PersonalGameStatus {
    websocket_uid: string
    seat: number
    expected_actions: PokerAction[]
}

const PokerGame: React.FC<PokerGameProps> = ({ msg, user }) => {
    const [lastMsg, setLastMsg] = useState<MessageInfo | null>(null)
    const [status, setStatus] = useState<PokerGameStatus>({stage: "loading", setup: genLoadingSetup()})
    const [personal, setPersonal] = useState<PersonalGameStatus | null>(null)

    useEffect(() => {
        console.info("ReRender " + Math.random())
        if (msg != null) {
            console.log(msg)
            console.info("AAAAAAA msg " + Math.random())
            msg.incCounter()
            msg.onMessageType("game", (message) => {
                const data = message.data
                if (data.type === 'status') {
                    setStatus(data.status)
                    setPersonal(data.personal)
                }
                if (data.type === 'chat') {
                    setLastMsg({ "text": data.text, "sender": data.sender.name })
                }
            })
            msg.send({ type: 'game', data: { type: 'get_status' } })
        }
    }, [msg]);

    const handleSend = (text: string) => {
        msg?.send({ type: 'game', data: { type: 'chat', text } })
    }

    const handleTakeSeat = (seat: number) => {
        msg?.send({ type: 'game', data: { type: 'take_seat', data: seat } })
    }

    const renderSeats = () => {
        return status.setup.seats.map((seat, i) => {
            if (seat == null) {
            return <div key={i} className='poker-seat poker-setup-seat'>
                <p>{i+1}</p>
                <button className='poker-take-seat-button' onClick={() => handleTakeSeat(i)}>Take</button>
            </div>
            } else {
                let player = null
                let turn = false
                if (status.playing && status.playing.players[i]) {
                    player = status.playing.players[i]
                    turn = status.playing.turn === i
                }
                return <PokerSeat seat={seat} isMe={i === personal?.seat} pokerPlayer={player} isTurn={turn}/>
            }
        })
    }

    const setupScreen = () => {
        function handleChangeSettings(arg0: { gameName: string; }): void {
            const statusUpdate = {...status, ...arg0}
            setStatus(statusUpdate)
            msg?.send({"type": "game", "data": { "type": "change_options", "data": statusUpdate.setup }})
        }

        return <div>
            <Choices value={status.setup.gameName} options={[{value: 'holdem', label: "Texas Holdem"}]} onChange={(val) => handleChangeSettings({"gameName": val})}/>
            <div>
                <h3>Seats</h3>
                <p>Take any empty seat you want</p>
                <div className='poker-take-seats-container'>{renderSeats()}</div>
            </div>
        </div>
    }

    const main = () => {
        const stage = status.stage
        if (stage == "loading") {
            return <div><h2>Loading...</h2></div>
        }
        if (stage == "setup") {
            return <div className='poker-setup-screen'>{setupScreen()}</div>
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

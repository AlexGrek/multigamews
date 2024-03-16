import React, { useState, useEffect, useRef } from 'react';
import Messenger from '../../core/Messenger';
import MicroChat, { MessageInfo } from '../../common/MicroChat';
import { UserInfo } from '../../menu/AppWrapper';
import './DixitGame.css'
import DixitSeat from './DixitSeat';
import DixitPlayerThumbnail from './DixitPlayerThumbnail';
import DixitCard from './DixitCard';

interface DixitGameProps {
    msg: Messenger | null;
    user: UserInfo | null;
}

export interface Seat {
    info: UserInfo | null
    ai: boolean
}

export interface DixitPlayer {
    seat: number;
    pts: number;
    cards: string[];
    acted: boolean;
    guess: string | null;
}

export interface DixitGameState {
    status: string;
    players: (DixitPlayer | null)[];
    current_player: number;
    table: TableCardHandle[];
    last_round_result: DixitResult | null;
    deck: string[];
}

export interface DixitAction {
    seat: number;
    chosen: string;
}

export interface DixitResult {
    players_guessed_correctly: number[];
    players_guessed_incorrectly: number[];
}

export interface TableCardHandle {
    card: string;
    author: number;
    original: boolean;
    votes: number[];
}

export interface DixitGameSetup {
    seats: (Seat | null)[];
    windelay: number;
    playing: DixitGameState | null;
}

export interface DixitGameStatusMessageData {
    type: string;
    status: DixitGameState;
    personal?: DixitGameStatusPersonal | null;
}

interface DixitGameStatusPersonal {
    websocket_uid: string;
    seat: number;
}

interface DixitGameStatusMessage {
    type: string;
    data: DixitGameStatusMessageData;
}

// function genLoadingSetup(): DixitGameSetup {
//     return {
//         gameName: "holdem",
//         seats: [],
//         windelay: 6
//     }
// }

// interface DixitGamePlaying {
//     players: (DixitPlayer | null)[]
//     dealer: number
//     turn: number
//     table: string[]
//     bank: number
//     expected_actions: DixitAction[]
//     comments: DixitComment[]
//     last_round_victory: VictoryRecord | null
// }

// interface DixitGameStatus {
//     stage: "playing" | "setup" | "result" | "loading"
//     setup: DixitGameSetup
//     playing?: DixitGamePlaying
// }

// interface PersonalGameStatus {
//     websocket_uid: string
//     seat: number
//     expected_actions: DixitAction[]
// }

const DixitGame: React.FC<DixitGameProps> = ({ msg, user }) => {
    const [lastMsg, setLastMsg] = useState<MessageInfo | null>(null)
    const [status, setStatus] = useState<DixitGameSetup>({ seats: [], windelay: 0, playing: null })
    const [personal, setPersonal] = useState<DixitGameStatusPersonal | null>(null)

    useEffect(() => {
        // console.info("ReRender " + Math.random())
        if (msg != null) {
            console.log(msg)
            // console.info("AAAAAAA msg " + Math.random())
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

    const handleStartButtonClick = () => {
        msg?.send({ "type": "game", "data": { "type": "start" } })
    }

    const renderSeats = (selectSeat: boolean = false) => {
        return status.seats.map((seat, i) => {
            if (seat == null) {
                return <div key={i} className='dixit-seat poker-setup-seat'>
                    <p>{i + 1}</p>
                    {selectSeat && <button className='dixit-take-seat-button' onClick={() => handleTakeSeat(i)}>Take</button>}
                </div>
            } else {
                let player = null
                let turn = false
                if (status.playing && status.playing.players[i]) {
                    player = status.playing.players[i]
                    turn = status.playing.current_player === i
                }
                return <DixitSeat seat={seat} isMe={i === personal?.seat} dixitPlayer={player} isTurn={turn} />
            }
        })
    }

    const setupScreen = () => {
        function handleChangeSettings(arg0: { gameName: string; }): void {
            const statusUpdate = { ...status, ...arg0 }
            setStatus(statusUpdate)
            msg?.send({ "type": "game", "data": { "type": "change_options", "data": statusUpdate } })
        }

        return <div>
            <div>
                <h3>Seats</h3>
                <p>Take any empty seat you want</p>
                <div className='dixit-take-seats-container'>{renderSeats(true)}</div>
            </div>
            <div><button className='start-button' onClick={handleStartButtonClick}>Start</button></div>
        </div>
    }

    const phase1 = () => {
        return <div className='fullw'>
            <h2>Phase 2</h2>
            {status.playing?.current_player == personal?.seat ? "Pick a card and describe it" : `Player ${status.seats[status.playing?.current_player || 0]?.info?.name} (${status.playing?.current_player}) should pick a card`}
            <div className='dixit-cards'>
                {status.playing && personal && status.playing.players[personal.seat]?.cards.map(card => <DixitCard key={card} onClick={handleCardClick} card={card}></DixitCard>)}
            </div>
            <p className='debug'>
                {`status.playing?.current_player = ${status.playing?.current_player}`}<br />
                {`status.seats = ${JSON.stringify(status.seats, null, 2)}`}
            </p>
        </div>

    }

    const phase2 = () => {
        if (status.playing?.current_player == personal?.seat) {
            return <div className='fullw'>
                <h2>Phase 2</h2>
                <p>Wait until other users pick their variants</p>
                <p>Chosen: </p>
                <DixitCard card={status.playing?.table[0].card || ""} />
            </div>
        } else {
            return <div className='fullw'>
                <h2>Phase 2</h2>
                <p>Choose your variant</p>
                <div className={'dixit-cards ' + (getSelf()?.acted ? 'faded' : '')}>
                    {status.playing && personal && status.playing.players[personal.seat]?.cards.map(card => <DixitCard key={card} onClick={handleCardClick} card={card}></DixitCard>)}
                </div>
            </div>
        }
    }

    const getSelf = () => {
        if (personal && status.playing) {
            return status.playing.players[personal.seat]
        }
        return null;
    }

    const amICurrentPlayer = () => {
        return status.playing?.current_player == personal?.seat
    }

    const phase3 = () => {
        if (status.playing?.current_player == personal?.seat) {
            return <div className='fullw'>
                <h2>Phase 3</h2>
                <p>Wait until other users guess their variants</p>
                <p>Variants: </p>
                <div className={'dixit-cards'}>
                    {status.playing?.table.map(cardHandle => <DixitCard key={cardHandle.card} card={cardHandle.card} />)}
                </div>
            </div>
        } else {
            return <div className='fullw'>
                <h2>Phase 3</h2>
                <p>Choose a card on the table</p>
                <div className={'dixit-cards ' + (getSelf()?.guess ? 'faded' : '')}>
                    {status.playing?.table.map(cardHandle => <DixitCard key={cardHandle.card} card={cardHandle.card} onClick={handleCardClick} />)}
                </div>
            </div>
        }
    }

    const asUserNamesP = (votes: number[]) => {
        return votes.map((user, i) => {
            const seat = status.seats[user];
            if (seat == null) {
                return <p key={i}>Unknown user {user}</p>
            } else {
                return <p key={i}>
                    {seat.info?.name}
                </p>
            }
        });
    }

    const renderCardResult = (auth: number, votes: number[], original: boolean) => {
        const authorSeat = status.seats[auth];
        return <div className={"dixit-card-result-addon " + (original ? "dixit-card-original" : "dixit-card-wrong")}>
            <p>{(original ? "Original by " : "Fake by ") + authorSeat?.info?.name}</p>
            <div>
                <h3>Guessed by:</h3>
                {asUserNamesP(votes)}
            </div>
        </div>
    }

    const phaseResult = () => {
        return <div className='fullw'>
            <h2>Phase Result</h2>
            <div className='dixit-round-stats fullw'>
                {status.playing?.last_round_result && (
                    <div className='dixit-round-stats-blocks'>
                    <div>
                        <h3>Guessed correctly</h3>
                    </div>
                    
                        {asUserNamesP(status.playing.last_round_result.players_guessed_correctly)}
                        <div>
                        <h3>Guessed incorrectly</h3>
                        {asUserNamesP(status.playing.last_round_result.players_guessed_incorrectly)}
                    </div>
                    </div>
                )}
            </div>
            <div className='dixit-cards'>
                {status.playing?.table.map(cardHandle => <DixitCard key={cardHandle.card} card={cardHandle.card} addon={renderCardResult(cardHandle.author, cardHandle.votes, cardHandle.original)} />)}
            </div>
        </div>
    }

    const handleCardClick = (card: string) => {
        msg?.send({ "type": "game", "data": { "type": "action", "data": { "seat": personal ? personal.seat : -1, "chosen": card } } })
    }

    const renderPlayers = (s: DixitGameState) => {
        return <div className='dixit-players-panel'>{s.players.map((player, i) => {
            const seat = status.seats[i];
            if (player != null && seat != null)
                return <DixitPlayerThumbnail isChosen={i == s.current_player} key={i} player={player} seat={seat} me={i == personal?.seat} />
            else {
                return <p />
            }
        })}</div>
    }

    const renderGameScr = () => {
        let content = <div className='fullw'>Unknown phase: {status.playing?.status}</div>
        if (status.playing && status.playing.status == "phase1") {
            content = phase1()
        }
        if (status.playing && status.playing.status == "results") {
            content = phaseResult()
        }
        if (status.playing && status.playing.status == "phase2") {
            content = phase2()
        }
        if (status.playing && status.playing.status == "phase3") {
            content = phase3()
        }
        return <div className='dixit-game-content fullw'>
            <div className='dixit-players'>{status.playing && renderPlayers(status.playing)}</div>
            <div className='dixit-phase-window fullw'>{content}</div>
        </div>
    }

    const main = () => {
        console.log(`status: ${JSON.stringify(status)}`)
        const setupScr = status.playing && status.playing.status == "initial" ? setupScreen() : null;
        const dixitGameScr = status.playing && status.playing.status != "initial" ? renderGameScr() : null;
        return <div className='fullw'>{setupScr}{dixitGameScr}</div>
    }

    return (
        <div className='dixit-root fullw'>
            {main()}
            <MicroChat message={lastMsg} send={handleSend} />
        </div>
    );
};

export default DixitGame;

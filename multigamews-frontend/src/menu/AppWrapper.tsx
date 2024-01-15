import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import WebSocketTest from '../common/WebSocketTest';
import './AppWrapper.css'
import RoomsLobby from './RoomsLobby';
import Messenger from '../core/Messenger';
import CurrentRoomWidget from './CurrentRoomWidget';
import ChatGame from '../games/Chat';

interface UserInfo {
    name: string,
    gender: number,
    avatar?: string
}

interface AppWrapperProps {

}

const AppWrapper: React.FC<AppWrapperProps> = ({ }) => {
    const [wsTesterOpen, setWsTesterOpen] = useState<boolean>(false);
    const [connected, setConnected] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [msg, setMsg] = useState<Messenger | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [currentRoom, setCurrentRoom] = useState<string | null>(null);
    const [currentRoomInfo, setCurrentRoomInfo] = useState<any | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        // Connect to the WebSocket server
        const newWs = new WebSocket('ws://localhost:8765');
    
        newWs.onopen = () => {
          console.log('WebSocket connection opened');
          setConnected(true)
        };

        let msgr = new Messenger(newWs)
        setMsg(msgr)

        msgr.onMessageType("rooms", (message) => {
            setRooms(message.data)
        })

        msgr.onMessageType("status", (message) => {
            const status = message.data
            setCurrentRoom(status.room)
            setCurrentRoomInfo(status.game_status)
            setUserInfo(status.info)
            console.log("Status updated")
        })


        msgr.onMessageType("game", (message) => {
            console.warn("Game message received")
        })
    
        newWs.onclose = () => {
          console.log('WebSocket connection closed');
          setConnected(false)
        };
    
        setWs(newWs);
    
        return () => {
          // Close the WebSocket connection when the component is unmounted
          newWs.close();
        };
      }, []);


    const handleOpenModalTester = () => {
        setWsTesterOpen(true);
    };

    const handleCloseModalTester = () => {
        setWsTesterOpen(false);
    };

    const connectionWidget = <button>
        {connected ? <i className="fas fa-signal"></i> : <i className="fas fa-spinner spin"></i>}
    </button>

const userWidget = <button>
    <i className="fas fa-user-tie"></i>   {userInfo && userInfo.name}
</button>

    return (
        <div>
            <header className='main-header'>
                <div className='header-left'>
                    WS GAMES
                </div>
                <div className='header-middle'>
                    {currentRoom && <CurrentRoomWidget currentRoom={currentRoom} msg={msg}></CurrentRoomWidget>}
                </div>
                <div className='header-right'>
                    {userWidget}
                    {connectionWidget}
                    <button onClick={handleOpenModalTester}><i className="fas fa-terminal"></i></button>
                </div>
            </header>
            {currentRoom || <RoomsLobby msg={msg} rooms={rooms} visible={true} />}
            {currentRoom && currentRoomInfo["game"] === "chat" && <ChatGame msg={msg}/>}

            <Modal isOpen={wsTesterOpen} onClose={handleCloseModalTester}>
                <WebSocketTest />
            </Modal>
        </div>
    );
};

export default AppWrapper;

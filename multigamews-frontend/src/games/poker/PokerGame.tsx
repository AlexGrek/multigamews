import React, { useState, useEffect } from 'react';
import Messenger from '../../core/Messenger';
import MicroChat, { MessageInfo } from '../../common/MicroChat';
import { UserInfo } from '../../menu/AppWrapper';
import './PokerGame.css'

interface PokerGameProps {
    msg: Messenger | null;
    user: UserInfo | null;
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

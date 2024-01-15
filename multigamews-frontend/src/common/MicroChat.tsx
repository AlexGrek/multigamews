import React, { useState, useEffect } from 'react';

export interface MessageInfo {
    sender: string
    text: string
}

interface MicroChatProps {
    message: MessageInfo | null;
    send: (text: string) => void
}

const MicroChat: React.FC<MicroChatProps> = ({ message, send }) => {
    const [setMessages, setSetMessages] = useState<MessageInfo[]>([]);
    const [txt, setTxt] = useState<string>('');

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTxt(event.target.value);
    };

    useEffect(() => {
        if (message != null)
            setSetMessages([...setMessages, message]);
    }, [message]);

    const handleSend = () => {
        send(txt)
        setTxt("")
    }

    return (
        <div className="chat-container">
          <div className='chat-messages'>
            {setMessages.map((message, i) => {
                return <p className='message swing-in-top-fwd' key={i}>
                    <b className='message-sender'>{message.sender}</b>  {message.text}
                </p>
            })}
          </div>
          <input type="text" value={txt} placeholder='Your chat message...' onChange={handleInputChange}></input>
          <button className='message-send-button' onClick={() => handleSend()}>Send</button>
        </div>
    );
};

export default MicroChat;

import React, { useState, useEffect, useRef } from 'react';

const WebSocketChatComponent: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false)
  const messageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Connect to the WebSocket server
    const newWs = new WebSocket('ws://localhost:8765');

    newWs.onopen = () => {
      console.log('WebSocket connection opened');
      setConnected(true)
    };

    newWs.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);

      if (message.type === 'rooms') {
        setRooms(message.data);
      } else if (message.type === 'game' && message.data.type === 'chat') {
        setMessages((prevMessages) => [...prevMessages, message.data.text]);
      }
    };

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

  const handleCreateRoom = () => {
    const roomName = prompt('Enter room name:');
    if (roomName) {
      sendWebSocketMessage({ type: 'init', command: 'create', name: roomName });
      setCurrentRoom(roomName);
    }
  };

  const handleEnterRoom = (roomName: string) => {
    sendWebSocketMessage({ type: 'init', command: 'enter', name: roomName });
    setCurrentRoom(roomName);
  };

  const handleSendMessage = () => {
    const text = messageInputRef.current?.value;
    if (text && currentRoom) {
      sendWebSocketMessage({ type: 'game', data: { type: 'chat', text } });
      setMessages((prevMessages) => [...prevMessages, `You: ${text}`]);
      messageInputRef.current!.value = '';
    }
  };

  const sendWebSocketMessage = (message: object) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      console.log('Sent WebSocket message:', message);
    }
  };

  return (
    <div>
      <h2>WebSocket Chat</h2>
      <div>
        <h3>Rooms</h3>
        <ul>
          {rooms.map((room) => (
            <li key={room.name}>
              <button onClick={() => handleEnterRoom(room.name)}>Enter {room.name}</button>
              ({room.userCount} users)
            </li>
          ))}
        </ul>
        <button disabled={!connected} onClick={handleCreateRoom}>Create Room</button>
      </div>
      {currentRoom && (
        <div>
          <h3>{currentRoom}</h3>
          <div style={{ border: '1px solid #ccc', padding: '10px', height: '200px', overflowY: 'auto' }}>
            {messages.map((msg, index) => (
              <div key={index}>{msg}</div>
            ))}
          </div>
          <div>
            <input disabled={!connected} ref={messageInputRef} type="text" placeholder="Type your message" />
            <button disabled={!connected} onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketChatComponent;

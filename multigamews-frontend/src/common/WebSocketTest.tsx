import React, { useState, useEffect } from 'react';
import JSONViewer from 'react-json-viewer';

interface WebSocketTestProps {}

function getJsonOrError(receivedData: string) {
    try {
        const data = JSON.parse(receivedData)
        return data
    } catch (e) {
        const dataErr = {"error": e}
        return dataErr
    }
}

const WebSocketTest: React.FC<WebSocketTestProps> = () => {
  const [serverUrl, setServerUrl] = useState<string>('ws://localhost:8765/');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [message, setMessage] = useState<string>('');
  const [receivedData, setReceivedData] = useState<string>('');
  const [receivedDataList, setReceivedDataList] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        setReceivedData(event.data.toString());
        setReceivedDataList([event.data.toString(), ...receivedDataList])
      };

      socket.onclose = () => {
        setSocket(null);
        setConnected(false);
      };

      return () => {
        socket.close();
      };
    }
  }, [socket]);

  const handleConnect = () => {
    if (serverUrl) {
      const newSocket = new WebSocket(serverUrl);
      setSocket(newSocket);
      setConnected(true);
    }
  };

  const handleDisconnect = () => {
    if (socket) {
      socket.close();
    }
    setConnected(false);
  };

  const handleSend = () => {
    if (socket && message) {
      socket.send(message);
    }
  };

  return (
    <div>
      <div>
        <label>Server URL:</label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
        />
      </div>
      <div>
        <button onClick={handleConnect}>Connect</button>
        <button onClick={handleDisconnect}>Disconnect</button>
      </div>
      <div>
        <label>Message to send:</label>
        <input
          type="text"
          value={message}
          disabled={!connected}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={handleSend}>Send</button>
      </div>
      <div>
        <label>Received Data:</label>
        <div>{receivedData}</div>
        <div>
            <p>JSON visualize</p>
            <div>
            <JSONViewer json={getJsonOrError(receivedData)}/>
            <ul>
                {receivedDataList.map((item, i) => {
                    return <li key={i}>{item}</li>
                })}
            </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketTest;

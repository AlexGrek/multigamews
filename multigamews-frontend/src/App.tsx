import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import WebSocketTest from './common/WebSocketTest'
import WebSocketChatComponent from './common/WebSocketChatComponent'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Vite + React</h1>

      <div>
        <WebSocketChatComponent/>
      </div>
      
      <div className="card">
        <WebSocketTest />
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App

type StringToFunctionMap = Record<string, (data: any) => void>;

class Messenger {
    websocket: WebSocket;
    subscriptionsOnMessageTypes: StringToFunctionMap = {}
    subscriptionsOnRequestTypes: StringToFunctionMap = {}
    onUnknownType?: (data: any) => void

    constructor(ws: WebSocket) {
        this.websocket = ws
        ws.onmessage = this.handleMessage.bind(this)
    }

    public onMessageType(name: string, action: (data: any) => void) {
        this.subscriptionsOnMessageTypes[name] = action
    }

    public onResponseType(name: string, action: (data: any) => void) {
        this.subscriptionsOnRequestTypes[name] = action
    }

    public onUnknownMessageType(action: (data: any) => void) {
        this.onUnknownMessageType = action
    }

    public handleMessage(e: MessageEvent<any>) {
        const message = JSON.parse(e.data);
        console.log('Received WebSocket message:', message);
        const messageType = message.type
        if (messageType) {
            const found = this.subscriptionsOnMessageTypes[messageType]
            if (found != undefined) {
                found(message)
                return
            }
            if (message.request) {
                const found = this.subscriptionsOnRequestTypes[message.request]
                if (found != undefined) {
                    found(message.data)
                    return
                }
                console.warn(`No handler for message request: ${message.request}`)
            }
            console.warn(`No handler for message type: ${messageType}`)
        } else {
            console.error("Message has no type in JSON")
        }

        if (this.onUnknownType != undefined) {
            this.onUnknownType(message)
            return
        }
        console.error("Message was not read by any handler")
    }

    public request(name: string) {
        this.send({ "type": "init", "command": "request", "data": name })
    }

    public send(data: any) {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(data));
            console.log('Sent WebSocket message:', data);
            return true;
        } else {
            console.error("Websocket not in ready state, not sending: " + JSON.stringify(data))
            return false;
        }
    }
}

export default Messenger;
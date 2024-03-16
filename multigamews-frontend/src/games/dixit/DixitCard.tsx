import React, { ReactNode } from 'react';
import '../DixitCard.css'

interface AppProps {
    card: string;
    onClick?: (card: string) => void
    addon?: ReactNode
}

const App: React.FC<AppProps> = ({ card, onClick, addon }) => {
    const renderAddon = (add: ReactNode) => {
        return <div className='dixit-cards-addon'>{add}</div>
    }

    return (
        <div className='dixit-card' style={{ backgroundImage: `url("dixit_cards/${card}")` }} onClick={() => onClick && onClick(card)}>
            {addon ? renderAddon(addon) : null}
        </div>
    );
};

export default App;

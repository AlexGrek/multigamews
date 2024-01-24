import React from 'react';
import Card from './Card';
import './CardStack.css'

interface CardStackProps {
    cards: string[];
    size?: "small" | "large" | "medium"
}

const CardStack: React.FC<CardStackProps> = ({ cards, size }) => {
    const cardSize = size ? size : "medium"

    return (
        <div className='card-stack'>
            {cards.map((card, i) => {
                    return <Card value={card} key={i} size={cardSize}/>
                })}
        </div>
    );
};

export default CardStack;

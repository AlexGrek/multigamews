import React from 'react';
import './Card.css'

interface CardProps {
    value: string;
    size: "small" | "large" | "medium"
}

const Card: React.FC<CardProps> = ({ value, size }) => {
    const genClass = (baseClass: string) => {
        return `${baseClass} card-${size}`
    }

    const getSuite = (value: string) => {
        switch (value[1]) {
            case "c":
                return "♣"
            case "d":
                return "♦"
            case "h":
                return "♥"
            case "s":
                return "♠"
            default:
                return value[1]
        }
    }

    const getVal = (value: string) => {
        switch (value[0]) {
            case "T":
                return "10"
            default:
                return value[0]
        }
    }

    const getColor = (value: string) => {
        switch (value[1]) {
            case "h":
            case "d":
                return "red"
            default:
                return "black"
            
        }
    }

    const colorBasedSuiteClass = `${getColor(value)} card-suite`

    return (
        <div className={genClass("card-base")}>
            <p className={colorBasedSuiteClass}>{getSuite(value)}</p>
            <p className='card-value'>{getVal(value)}</p>
        </div>
    );
};

export default Card;

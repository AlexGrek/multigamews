import React from 'react';
import Card from '../../common/Card';
import CardStack from '../../common/CardStack';

interface PokerTableProps {
    tableCards: string[]
    bank: number
}

const PokerTable: React.FC<PokerTableProps> = ({ tableCards, bank }) => {
    const genClass = (baseClass: string) => {
        return `${baseClass}`
    }


    return (
        <div className={genClass("poker-table")}>
            <div className='poker-table-bank'>
                <h2>{bank}</h2>
            </div>
            <div className='poker-table-cards'>
                <CardStack cards={tableCards}/>
            </div>
        </div>
    );
};

export default PokerTable;

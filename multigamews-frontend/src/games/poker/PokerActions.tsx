import React from 'react';
import PokerSeat, { PokerAction, PokerPlayer, Seat } from './PokerSeat';

interface PokerActionsProps {
    actions?: PokerAction[]
    myTurn?: boolean
    onAct: (action: PokerAction, value: number) => void
}

const PokerActions: React.FC<PokerActionsProps> = ({ actions, myTurn, onAct
 }) => {
    const handleClick = (act: PokerAction) => {
        onAct(act, act.amount)
    }

    const renderActions = (actions: PokerAction[]) => {
        return actions.map((action, i) => {
            return <button onClick={() => handleClick(action)} className='poker-action' key={i}>{action.action} {action.amount}</button>
        })
    }

    return (
        <div className='poker-action-list'>
            {actions && myTurn && renderActions(actions)}
        </div>
    );
};

export default PokerActions;

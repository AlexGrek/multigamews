import React from 'react';
import PokerSeat, { PokerAction, PokerPlayer, Seat } from './PokerSeat';
import "./PokerActions.css"
import RaiseAmountPop from './RaiseAmountPop';

interface PokerActionsProps {
    actions?: PokerAction[]
    myTurn?: boolean
    maximumRaiseAmount: number
    onAct: (action: PokerAction, value: number) => void
}

const PokerActions: React.FC<PokerActionsProps> = ({ actions, myTurn, onAct, maximumRaiseAmount
}) => {

    const isRaiseableButton = (action: PokerAction) => {
        return action.action == "raise" || action.action == "bet"
    }

    const renderAmountOnSimpleButton = (action: PokerAction) => {
        if (action.action == "call") {
            return <i className='poker-action-amount'>{action.amount}</i>
        }
        return null
    }

    const renderSimpleActionButton = (action: PokerAction) => {
        return <button onClick={() => handleClick(action)} className={`poker-action action-${action.action}`}>{action.action} {renderAmountOnSimpleButton(action)}</button>
    }

    const renderRaisableButton = (action: PokerAction) => {
        return <div className={`poker-action poker-raisable-action action${action.action}`}>
            {action.action} <div className='poker-action-raisable-options'>
                <button className='poker-action-bet-min' onClick={() => handleClick(action)}>
                    {action.amount}
                </button>
                <RaiseAmountPop min={action.amount} max={maximumRaiseAmount} onSelectAmount={(a) => handleClick(action, a)}/>
            </div>
        </div>
    }

    const handleClick = (act: PokerAction, amount?: number) => {
        onAct(act, amount ? amount : act.amount)
    }

    const renderActions = (actions: PokerAction[]) => {
        return actions.map((action, i) => {
            return <span className='poker-action-btn-group' key={i}>
                {isRaiseableButton(action) ? renderRaisableButton(action) : renderSimpleActionButton(action)}
            </span>
        })
    }

    return (
        <div className='poker-action-list'>
            {actions && myTurn && renderActions(actions)}
        </div>
    );
};

export default PokerActions;

import React, { useEffect, useState } from 'react';
import './RaiseAmountPop.css'

interface RaiseAmountPopProps {
    min: number;
    max: number;
    onSelectAmount: (amount: number) => void;
}

const RaiseAmountPop: React.FC<RaiseAmountPopProps> = ({ min, max, onSelectAmount }) => {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setOpen(false)
    }, [min, max])

    const getChoices = () => {
        let choices = []
        let variant = min*2
        while (variant < max) {
            choices.push(variant)
            variant *= 2
        }
        choices.reverse()
        return choices
    }

    const handleVariantClick = (amount: number) => {
        setOpen(false)
        onSelectAmount(amount)
    }

    const renderChoices = () => {
        const choices = getChoices()
        return choices.map((choice, i) => {
            return <button className='raise-amount-choice' key={i} onClick={() => handleVariantClick(choice)}>{choice}</button>
        })
    }

    const renderChoiceGroup = () => {
        return <div className='raise-amount-choice-group'>
            {renderChoices()}
        </div>
    }

    return (
        <div className='raise-amount-container'>
            <button className='raise-amount-button' onClick={() => setOpen(!open)}>...</button>
            {open && renderChoiceGroup()}
        </div>
    );
};

export default RaiseAmountPop;

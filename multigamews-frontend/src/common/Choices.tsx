import React, { ReactNode } from 'react';
import './Choices.css'

export interface ChoiceOption {
    value: string
    label: ReactNode
}

interface ChoicesProps {
    value: string;
    options: ChoiceOption[];
    onChange: (upd: string) => void
}

const Choices: React.FC<ChoicesProps> = ({ value, options, onChange }) => {


    return (
        <div className='choices-container'>
            {options.map((option) => {
                const chosen = option.value == value
                return <button onClick={() => onChange(option.value)} className={chosen ? "selected-choice" : "unselected-choice"} disabled={chosen}>{option.label}</button>
            })}
        </div>
    );
};

export default Choices;

import React, { useState, useEffect, useRef } from 'react';

interface TablebetProps {
    bet: number;
    className: string
}

type Flow = "raising" | "falling"

const Tablebet: React.FC<TablebetProps> = ({ bet, className }) => {
    const [existingBet, setExistingBet] = useState<number>(bet);
    const [raisingProcess, setRaisingProcess] = useState<Flow | null>(null)
    const betRef = useRef<HTMLDivElement>(null)
    const animationTicksRemaining = useRef<number>(0)
    const [currentlyDisplayedBet, setCurrentlyDisplayedBet] = useState<number>(bet)

    const calculateClassName = () => {
        if (raisingProcess == null) {
            return className
        }
        return className + ` animate-${raisingProcess}`
    }

    const startAnimation = (remaining: number, currentBet: number, flow: Flow) => {
        const newRemaining = remaining - 1
        console.log(`Step ${remaining}`)
        if (remaining == 0) {
            // end animation
            setRaisingProcess(null)
            console.log(`END! existingBet=${existingBet}`)
            setCurrentlyDisplayedBet(bet)
            return
        }
        let nextBet = flow == "raising" ? currentBet + 1 : currentBet - 1
        if (remaining == 10) {
            nextBet = flow == "raising" ? bet - remaining : bet + remaining
        }
        setCurrentlyDisplayedBet(nextBet)
        console.log(`I want to print ${currentlyDisplayedBet} -> ${nextBet}`)
        setTimeout(() => startAnimation(newRemaining, nextBet, flow), 10 + newRemaining * 3)
    }

    useEffect(() => {
        if (existingBet != bet) {
            let flow: Flow = "raising"
            if (bet > existingBet) {
                flow = "raising"
                setRaisingProcess("raising")
            } else {
                flow = "falling"
                setRaisingProcess("falling")
            }
            setCurrentlyDisplayedBet(existingBet)
            setTimeout(() => startAnimation(20, existingBet, flow), 10)
            setExistingBet(bet)
        }
    }, [bet]);

    return (
        <span className={calculateClassName()}>{currentlyDisplayedBet}</span>
    );

    
};

export default Tablebet;

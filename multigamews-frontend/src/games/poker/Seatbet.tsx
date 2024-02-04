import React, { useState, useEffect, useRef } from 'react';

interface SeatbetProps {
    bet: number;
    center: React.RefObject<HTMLDivElement>
}

const Seatbet: React.FC<SeatbetProps> = ({ bet, center }) => {
    const [existingBet, setExistingBet] = useState<number>(bet);
    const [prevBet, setPrevBet] = useState<number>(bet);
    const betRef = useRef<HTMLDivElement>(null)

    const genAnimatedClassForBet = () => {
        if (!betRef || !betRef.current || !center || !center.current) {
            // return "no-animation-for-you-sucker"
        }
        
            if (!betRef || !betRef.current || !center || !center.current)
                return
            const centerPlace = center.current.getBoundingClientRect();
            const betCenter = betRef.current.getBoundingClientRect();

            const deltaX = centerPlace.x - betCenter.x
            const deltaY = centerPlace.y - betCenter.y
            betRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            betRef.current.style.transition = `transform 0.5s ease-in-out`;
            betRef.current.classList.add('move-animation');
        
    }
    
    useEffect(() => {
        if (bet == 0 && existingBet != 0) {
            genAnimatedClassForBet()
        }
        setExistingBet(bet);
        setPrevBet(existingBet);
    }, [bet]);

    return (
        <div ref={betRef} key={bet} className={`poker-seat-bet`}>{bet}</div>
    );

    
};

export default Seatbet;

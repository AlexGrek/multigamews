import React, { useState, useEffect } from 'react';
import './ChooseNewAvatar.css'

interface ChooseNewAvatarProps {
    avatars: string[];
    loadNewAvatars: () => void
    setAvatar: (a: string) => void
    cancel: () => void
}

const ChooseNewAvatar: React.FC<ChooseNewAvatarProps> = ({ avatars, loadNewAvatars, setAvatar, cancel }) => {
    
    useEffect(() => {
        if (avatars.length == 0) {
            loadNewAvatars()
        }
    }, [avatars]);

    const images = <div className='choose-new-avatar-images'>
        {avatars.map(a => {
            return <div onClick={() => setAvatar(a)} className='choose-avatar-img' style={{backgroundImage: `url("${a}")`}}></div>
        })}
    </div>

    return (
        <div className='choose-new-avatar-container'>
            <div className='choose-new-top-menu'><button className='link-button' onClick={() => loadNewAvatars()}>Reload...</button><button className='link-button' onClick={() => cancel()}>Cancel</button></div>
            {images}
        </div>
    );
};

export default ChooseNewAvatar;

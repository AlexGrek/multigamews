import React, { useState, useEffect } from 'react';
import { UserInfo } from './AppWrapper';
import Messenger from '../core/Messenger';
import './UserWidget.css'
import Modal from '../common/Modal';
import ChooseNewAvatar from './ChooseNewAvatar';

interface UserWidgetProps {
    userInfo: UserInfo | null;
    msg: Messenger | null;
}

const createEmptyUserInfo = () => {
    return {
        name: "",
        gender: 0,
        avatar: ""
    }
}

const UserWidget: React.FC<UserWidgetProps> = ({ userInfo, msg }) => {
    const [updatedUserInfo, setUpdatedUserInfo] = useState<UserInfo>(userInfo || createEmptyUserInfo());

    useEffect(() => {
        setUpdatedUserInfo(userInfo || createEmptyUserInfo());
    }, [userInfo]);

    useEffect(() => {
        msg?.onResponseType("avatar_list_9", (data) => {
            setAvatars(data)
        })
    }, [msg]);

    const [modalOpen, setModalOpen] = useState(false)
    const [avatarOpen, setAvatarOpen] = useState(false)
    const [avatars, setAvatars] = useState<string[]>([])

    const handleLoadNewAvatars = () => {
        msg?.request("avatar_list_9")
    }

    const userWidget = <button onClick={() => setModalOpen(true)}>
        <i className="fas fa-user-tie"></i>   {updatedUserInfo.name}
    </button>

    const handleUpdate = () => {
        setModalOpen(false)
        if (msg) {
            msg.send({ "type": "init", "command": "change_info", "data": updatedUserInfo })
        }
    }

    const background_url = updatedUserInfo.avatar
    const avatar = <div className='user-info-avatar' style={{backgroundImage: `url("${background_url}")`}} onClick={() => setAvatarOpen(true)}></div>

    return (
        <div className='user-info-widget-host'>
            {userWidget}
            <Modal header="It's you" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                {avatarOpen ? <ChooseNewAvatar avatars={avatars} loadNewAvatars={handleLoadNewAvatars} setAvatar={(a) => {setUpdatedUserInfo({...updatedUserInfo, avatar: a}); setAvatarOpen(false)}} cancel={() => setAvatarOpen(false)}/> : avatar}
                <input onChange={(e) => setUpdatedUserInfo({ ...updatedUserInfo, name: e.target.value })} type='text' value={updatedUserInfo.name}></input>
                <button onClick={handleUpdate}>Update</button>
            </Modal>
        </div>
    );
};

export default UserWidget;

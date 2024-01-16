import React, { FC, ReactNode } from 'react';
import './Modal.css'

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  header?: string
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, children, header }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal tilt-in-fwd-tr">
        <div className="modal-header"><p className='modal-header-text'>{header}</p><button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
        </button></div>
          
        {children}
      </div>
    </div>
  );
};

export default Modal;
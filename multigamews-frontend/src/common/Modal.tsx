import React, { FC, ReactNode } from 'react';
import './Modal.css'

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
        </button></div>
          
        {children}
      </div>
    </div>
  );
};

export default Modal;
import React, { useState } from 'react';
import styles from './ChatScreen.module.css';

interface MessageInputProps {
    onSend: (text: string) => void;
    disabled?: boolean;
    inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled, inputRef }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
            onSend(text);
            setText('');
        }
    };

    return (
        <form className={styles.inputArea} onSubmit={handleSubmit}>
            <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={disabled}
            />
            <button type="submit" disabled={disabled || !text.trim()}>
                Enviar
            </button>
        </form>
    );
};

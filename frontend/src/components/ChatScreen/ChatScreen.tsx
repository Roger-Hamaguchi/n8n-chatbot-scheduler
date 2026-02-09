import React from 'react';
import type { User } from '../../types';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AdminControls } from './AdminControls';
import styles from './ChatScreen.module.css';

interface ChatScreenProps {
    user: User;
    onLogout: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ user, onLogout }) => {
    const { messages, sendMessage, sendAdminCommand, loading, isBotTyping, error } = useChat(user);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!loading) {
            // Slight delay to ensure DOM update and disabled state removal
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [loading]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>{user.name}</span>
                    <span className={styles.userEmail}>{user.email}</span>
                </div>
                <button onClick={onLogout} className={styles.logoutBtn}>
                    Sair
                </button>
            </header>

            {error && (
                <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <MessageList messages={messages} userName={user.name} isTyping={isBotTyping} />

            <AdminControls onAction={sendAdminCommand} />

            <MessageInput onSend={sendMessage} disabled={loading} inputRef={inputRef} />
        </div>
    );
};

import React, { useEffect, useRef } from 'react';
import type { Message } from '../../types';
import styles from './ChatScreen.module.css'; // Shared styles or separate? Let's use shared for simplicity
import aikoAvatar from '../../assets/aiko.png';
import userAvatar from '../../assets/user.svg';

interface MessageListProps {
    messages: Message[];
    userName: string;
    isTyping?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, userName, isTyping }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div className={styles.messageList}>
            {messages.map((msg) => {
                // Skip messages with missing required fields to prevent crashes
                if (!msg || !msg.id || !msg.text || !msg.sender) {
                    console.warn('Skipping invalid message:', msg);
                    return null;
                }

                const isSystem = msg.sender === 'system';
                const isBot = msg.sender === 'bot';

                if (isSystem) {
                    return (
                        <div key={msg.id} className={styles.systemMessage}>
                            <div className={styles.systemBubble}>{msg.text}</div>
                        </div>
                    );
                }

                return (
                    <div
                        key={msg.id}
                        className={`${styles.messageRow} ${isBot ? styles.botRow : styles.userRow}`}
                    >
                        {isBot && (
                            <div className={styles.avatarContainer}>
                                <img
                                    src={aikoAvatar}
                                    alt="Aiko"
                                    className={styles.avatar}
                                />
                            </div>
                        )}

                        <div className={styles.messageContent}>
                            <span className={styles.senderName}>
                                {isBot ? 'Aiko' : userName}
                            </span>
                            <div className={`${styles.bubble} ${isBot ? styles.botBubble : styles.userBubble}`}>
                                {msg.text}
                                <span className={styles.time}>
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </span>
                            </div>
                        </div>

                        {!isBot && (
                            <div className={styles.avatarContainer}>
                                <img
                                    src={userAvatar}
                                    alt="User"
                                    className={styles.avatar}
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            {isTyping && (
                <div className={`${styles.messageRow} ${styles.botRow}`}>
                    <div className={styles.avatarContainer}>
                        <img
                            src={aikoAvatar}
                            alt="Aiko"
                            className={styles.avatar}
                        />
                    </div>
                    <div className={styles.messageContent}>
                        <span className={styles.senderName}>Aiko</span>
                        <div className={`${styles.bubble} ${styles.botBubble} ${styles.typingBubble}`}>
                            <span className={styles.dot}></span>
                            <span className={styles.dot}></span>
                            <span className={styles.dot}></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={endRef} />
        </div>
    );
};

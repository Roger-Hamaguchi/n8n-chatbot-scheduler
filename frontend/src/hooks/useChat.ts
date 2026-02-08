import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, User } from '../types';
import { api } from '../services/api';

export const useChat = (user: User) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // Cursor for polling (use next_after_ts from API)
    const afterTsRef = useRef<string>('');

    // Load message history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await api.getMessages(user.id);

                if (data.messages && data.messages.length > 0) {
                    const historicalMsgs: Message[] = data.messages.map((msg: any) => {
                        const timestamp = msg.created_at ? new Date(msg.created_at).getTime() : Date.now();
                        return {
                            id: msg.id,
                            text: msg.content,
                            // Map 'system' messages to 'bot' so they appear as Aiko messages
                            sender: msg.direction === 'user' ? 'user' : 'bot',
                            timestamp: isNaN(timestamp) ? Date.now() : timestamp,
                        };
                    });

                    setMessages(historicalMsgs);
                }

                // Store cursor for polling
                if (data.next_after_ts) {
                    afterTsRef.current = data.next_after_ts;
                }

                setHistoryLoaded(true);
            } catch (err) {
                console.error('Failed to load message history:', err);
                setHistoryLoaded(true); // Continue even if history fails
            }
        };

        loadHistory();
    }, [user.id]);

    // Polling for new messages
    useEffect(() => {
        if (!historyLoaded) return; // Wait for history to load first

        const pollMessages = async () => {
            try {
                const data = await api.getMessages(user.id, afterTsRef.current);

                // Update cursor
                if (data.next_after_ts) {
                    afterTsRef.current = data.next_after_ts;
                }

                // Append new messages with deduplication
                if (data.messages && data.messages.length > 0) {
                    const newMsgs: Message[] = data.messages.map((msg: any) => {
                        const timestamp = msg.created_at ? new Date(msg.created_at).getTime() : Date.now();
                        return {
                            id: msg.id,
                            text: msg.content,
                            // Map 'system' messages to 'bot' so they appear as Aiko messages
                            sender: msg.direction === 'user' ? 'user' : 'bot',
                            timestamp: isNaN(timestamp) ? Date.now() : timestamp,
                        };
                    });

                    setMessages((prev) => {
                        // Remove temporary messages that match incoming backend messages
                        // Temporary messages have IDs starting with 'temp-'
                        let updatedMessages = [...prev];

                        newMsgs.forEach(newMsg => {
                            // Find and remove any temp message with same content and sender
                            const tempIndex = updatedMessages.findIndex(existing =>
                                existing?.id && // Add null safety check
                                existing.id.startsWith('temp-') &&
                                existing.text === newMsg.text &&
                                existing.sender === newMsg.sender
                            );

                            if (tempIndex !== -1) {
                                // Remove the temporary message
                                updatedMessages.splice(tempIndex, 1);
                            }
                        });

                        // Filter out any messages with missing IDs before deduplication
                        updatedMessages = updatedMessages.filter(m => m && m.id);

                        // Now add new messages, deduplicating by ID
                        const existingIds = new Set(updatedMessages.map(m => m.id));
                        const uniqueNew = newMsgs.filter(m => m && m.id && !existingIds.has(m.id));

                        if (uniqueNew.length > 0) {
                            console.log('New messages received:', uniqueNew);
                            return [...updatedMessages, ...uniqueNew];
                        }

                        return updatedMessages;
                    });
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        };

        // Poll every 5 seconds
        const intervalId = setInterval(pollMessages, 5000);

        return () => clearInterval(intervalId);
    }, [user.id, historyLoaded]);

    const sendAdminCommand = useCallback(async (command: string) => {
        const lowerCommand = command.trim().toLowerCase();
        setLoading(true);
        try {
            if (lowerCommand === 'bloquear') {
                await api.blockUser(user.email);
                const sysMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    text: '🔒 Você bloqueou a Aiko. (Ação via Painel)',
                    sender: 'system',
                    timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, sysMsg]);
            } else if (lowerCommand === 'desbloquear') {
                await api.unblockUser(user.email);
                const sysMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    text: '🔓 Você desbloqueou a Aiko.',
                    sender: 'system',
                    timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, sysMsg]);
            }
        } catch (err) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: `Erro ao executar comando: ${lowerCommand}. Tente novamente.`,
                sender: 'system',
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        // REMOVED: Optimistic UI to fix duplication issue
        // Messages will appear via polling after backend saves them
        // This adds ~5 second delay but eliminates duplicates

        // Local feedback for typed commands (but request proceeds to chat webhook)
        const lowerText = text.trim().toLowerCase();
        if (lowerText === 'bloquear') {
            const sysMsg: Message = {
                id: `temp-${Date.now()}`,
                text: '🔒 Solicitação de bloqueio enviada.',
                sender: 'bot',
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, sysMsg]);
        }

        setLoading(true);
        setError(null);

        try {
            await api.sendMessage({
                name: user.name,
                email: user.email,
                message: text,
            });

            // REMOVED: Immediate bot response handling
            // All messages (user + bot) will appear via polling
            // This ensures consistency and prevents duplicates

            console.log('Message sent successfully, waiting for polling to fetch response');
        } catch (err) {
            // Standard error handling
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Erro ao enviar mensagem. Tente novamente.',
                sender: 'system',
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            setError('Falha na comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const clearChat = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return {
        messages,
        sendMessage,
        sendAdminCommand,
        loading,
        error,
        clearChat
    };
};

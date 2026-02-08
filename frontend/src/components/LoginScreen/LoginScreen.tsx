import React, { useState } from 'react';
import type { WebhookResponse } from '../../types';
import { api } from '../../services/api';
import styles from './LoginScreen.module.css';

interface LoginScreenProps {
    onLogin: (id: string, name: string, email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;

        setLoading(true);
        setError('');

        try {
            // Call backend to get/create user and obtain UUID
            const response = await api.sendMessage({
                name: name.trim(),
                email: email.trim(),
                message: 'Olá' // Initial greeting to trigger user creation
            });

            // Extract user_id from backend response
            let userId: string | null = null;

            if (Array.isArray(response) && response.length > 0 && response[0].user_id) {
                userId = response[0].user_id;
            } else if (!Array.isArray(response) && (response as WebhookResponse).user_id) {
                userId = (response as WebhookResponse).user_id;
            }

            if (!userId) {
                throw new Error('Backend did not return user_id');
            }

            onLogin(userId, name.trim(), email.trim());
        } catch (err) {
            setError('Erro ao conectar. Tente novamente.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Chatbot N8N</h1>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="name">Nome</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome"
                        required
                        disabled={loading}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        disabled={loading}
                    />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Conectando...' : 'Entrar no Chat'}
                </button>
            </form>
        </div>
    );
};

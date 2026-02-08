import React from 'react';

import styles from './ChatScreen.module.css';

interface AdminControlsProps {
    onAction: (command: string) => void;
}

export const AdminControls: React.FC<AdminControlsProps> = ({ onAction }) => {
    return (
        <div className={styles.adminControls} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className={styles.adminLabel} style={{ fontWeight: 'bold', marginRight: '8px' }}>Gerenciar Aiko:</span>
            <button onClick={() => onAction('Bloquear')} className={styles.blockBtn}>Bloquear</button>
            <button onClick={() => onAction('Desbloquear')} className={styles.unblockBtn}>Desbloquear</button>
            <div className={styles.adminHint}>
                Dica: Você também pode digitar <strong>"Bloquear"</strong> no chat.
            </div>
        </div>
    );
};

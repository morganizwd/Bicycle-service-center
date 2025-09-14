import React from 'react';

export default function FullPageLoader({ text = 'Загрузка...' }) {
    return (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>{text}</span>
        </div>
    );
}

// src/components/ServiceCenterRoute.jsx
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

export default function ServiceCenterRoute({ children }) {
    const { center, centerLoading, refreshCenter } = useAuth();
    const location = useLocation();

    useEffect(() => {
        // если центра ещё нет — пробуем освежить профиль по токену из localStorage
        if (!center) refreshCenter();
    }, [center, refreshCenter]);

    if (centerLoading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    // если не авторизован — уводим на форму входа центра
    if (!center) {
        return <Navigate to="/center/login" replace state={{ from: location }} />;
    }

    return <>{children}</>;
}

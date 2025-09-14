import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUserToken, isTokenValid } from '../utils/auth';
import { useAuth } from '../context/AuthContext';
import FullPageLoader from './common/FullPageLoader';

export default function PrivateRoute({ children }) {
    const location = useLocation();
    const token = getUserToken();
    const { user, userLoading, refreshUser } = useAuth();

    const tokenOk = token && isTokenValid(token, 'userId');

    useEffect(() => {
        if (tokenOk && !user && !userLoading) {
            // есть валидный токен, но профиль не загружен — подтянем
            refreshUser();
        }
    }, [tokenOk, user, userLoading, refreshUser]);

    if (!tokenOk) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    if (userLoading || (tokenOk && !user)) {
        return <FullPageLoader />;
    }
    return children;
}

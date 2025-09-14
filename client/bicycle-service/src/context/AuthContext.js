// client\bicycle-service\src\context\AuthContext.js 
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
    getUserToken, getServiceCenterToken,
    setUserToken, setServiceCenterToken,
    isTokenValid, authHeader, clearAllAuth
} from '../utils/auth';

const API = process.env.REACT_APP_API_URL || '/api';
const USERS_AUTH_URL = `${API}/users/auth`;
const CENTERS_AUTH_URL = `${API}/service-centers/auth`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // user
    const [user, setUser] = useState(null);
    const [userLoading, setUserLoading] = useState(true);

    // service center
    const [center, setCenter] = useState(null);
    const [centerLoading, setCenterLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const token = getUserToken();
        if (!isTokenValid(token, 'userId')) {
            setUser(null);
            setUserLoading(false);
            return null;
        }
        setUserLoading(true);
        try {
            const res = await fetch(USERS_AUTH_URL, { headers: { ...authHeader(token) } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setUser(data);
            return data;
        } catch {
            setUser(null);
            setUserToken(null);
            return null;
        } finally {
            setUserLoading(false);
        }
    }, []);

    const refreshCenter = useCallback(async () => {
        const token = getServiceCenterToken();
        if (!isTokenValid(token, 'serviceCenterId')) {
            setCenter(null);
            setCenterLoading(false);
            return null;
        }
        setCenterLoading(true);
        try {
            const res = await fetch(CENTERS_AUTH_URL, { headers: { ...authHeader(token) } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setCenter(data);
            return data;
        } catch {
            setCenter(null);
            setServiceCenterToken(null);
            return null;
        } finally {
            setCenterLoading(false);
        }
    }, []);

    // первоначальная гидратация при загрузке приложения
    useEffect(() => {
        refreshUser();
        refreshCenter();
    }, [refreshUser, refreshCenter]);

    // удобные методы логина/логаута
    const loginUser = useCallback(async (token) => {
        setUserToken(token);
        return refreshUser();
    }, [refreshUser]);

    const loginServiceCenter = useCallback(async (token) => {
        setServiceCenterToken(token);
        return refreshCenter();
    }, [refreshCenter]);

    const logoutUser = useCallback(() => {
        setUser(null);
        setUserToken(null);
    }, []);

    const logoutServiceCenter = useCallback(() => {
        setCenter(null);
        setServiceCenterToken(null);
    }, []);

    const logoutAll = useCallback(() => {
        setUser(null);
        setCenter(null);
        clearAllAuth();
    }, []);

    const value = useMemo(() => ({
        // user
        user,
        userLoading,
        refreshUser,
        loginUser,
        logoutUser,
        // service center
        center,
        centerLoading,
        refreshCenter,
        loginServiceCenter,
        logoutServiceCenter,
        // both
        logoutAll,
    }), [
        user, userLoading, refreshUser, loginUser, logoutUser,
        center, centerLoading, refreshCenter, loginServiceCenter, logoutServiceCenter,
        logoutAll
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

// client\bicycle-service\src\utils\auth.js

export function decodeJWT(token) {
    try {
        const [, payload] = token.split('.');
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

export function isTokenValid(token, requiredClaim) {
    const p = decodeJWT(token);
    if (!p) return false;
    if (p.exp && Date.now() >= p.exp * 1000) return false;
    if (requiredClaim && !p[requiredClaim]) return false;
    return true;
}

// getters
export function getUserToken() {
    return localStorage.getItem('userToken') || localStorage.getItem('token') || null;
}
export function getServiceCenterToken() {
    return (
        localStorage.getItem('serviceCenterToken') ||
        localStorage.getItem('tokenServiceCenter') ||
        localStorage.getItem('sellerToken') ||
        localStorage.getItem('token') ||
        null
    );
}

// setters/clear
export function setUserToken(token) {
    if (token) localStorage.setItem('userToken', token);
    else localStorage.removeItem('userToken');
}
export function setServiceCenterToken(token) {
    if (token) localStorage.setItem('serviceCenterToken', token);
    else localStorage.removeItem('serviceCenterToken');
}
export function clearAllAuth() {
    ['userToken', 'serviceCenterToken', 'tokenServiceCenter', 'sellerToken', 'token']
        .forEach(k => localStorage.removeItem(k));
}

export function authHeader(token) {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

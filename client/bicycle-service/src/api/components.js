import api from './axiosConfig';
import { getServiceCenterToken } from '../utils/auth';

const BASE_URL = '/components';

function authHeaders(token) {
    const resolved = token || getServiceCenterToken();
    return resolved ? { Authorization: `Bearer ${resolved}` } : {};
}

export function listComponents(params = {}, token) {
    return api.get(BASE_URL, {
        params,
        headers: authHeaders(token),
    });
}

export function getComponent(id, params = {}, token) {
    return api.get(`${BASE_URL}/${id}`, {
        params,
        headers: authHeaders(token),
    });
}

export function createComponent(payload, token) {
    return api.post(BASE_URL, payload, {
        headers: authHeaders(token),
    });
}

export function updateComponent(id, payload, token) {
    return api.put(`${BASE_URL}/${id}`, payload, {
        headers: authHeaders(token),
    });
}

export function deleteComponent(id, token) {
    return api.delete(`${BASE_URL}/${id}`, {
        headers: authHeaders(token),
    });
}

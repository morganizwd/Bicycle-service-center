import api from './axiosConfig';
import { getServiceCenterToken } from '../utils/auth';

const BASE_URL = '/workshop-services';

function authHeaders(token) {
    const resolved = token || getServiceCenterToken();
    return resolved ? { Authorization: `Bearer ${resolved}` } : {};
}

export function listWorkshopServices(params = {}, token) {
    return api.get(BASE_URL, {
        params,
        headers: authHeaders(token),
    });
}

export function getWorkshopService(id, params = {}, token) {
    return api.get(`${BASE_URL}/${id}`, {
        params,
        headers: authHeaders(token),
    });
}

export function createWorkshopService(payload, token) {
    return api.post(BASE_URL, payload, {
        headers: authHeaders(token),
    });
}

export function updateWorkshopService(id, payload, token) {
    return api.put(`${BASE_URL}/${id}`, payload, {
        headers: authHeaders(token),
    });
}

export function deleteWorkshopService(id, token) {
    return api.delete(`${BASE_URL}/${id}`, {
        headers: authHeaders(token),
    });
}

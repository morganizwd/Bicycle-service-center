import api from './axiosConfig';
import { getServiceCenterToken } from '../utils/auth';

const BASE_URL = '/repair-warranties';

function authHeaders(token) {
    const resolved = token || getServiceCenterToken();
    return resolved ? { Authorization: `Bearer ${resolved}` } : {};
}

export function listRepairWarranties(params = {}, token) {
    return api.get(BASE_URL, {
        params,
        headers: authHeaders(token),
    });
}

export function getRepairWarranty(id, params = {}, token) {
    return api.get(`${BASE_URL}/${id}`, {
        params,
        headers: authHeaders(token),
    });
}

export function createRepairWarranty(payload, token) {
    return api.post(BASE_URL, payload, {
        headers: authHeaders(token),
    });
}

export function updateRepairWarranty(id, payload, token) {
    return api.put(`${BASE_URL}/${id}`, payload, {
        headers: authHeaders(token),
    });
}

export function deleteRepairWarranty(id, token) {
    return api.delete(`${BASE_URL}/${id}`, {
        headers: authHeaders(token),
    });
}

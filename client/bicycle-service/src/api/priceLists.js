import api from './axiosConfig';
import { getServiceCenterToken } from '../utils/auth';

const BASE_URL = '/price-lists';

function authHeaders(token) {
    const resolved = token || getServiceCenterToken();
    return resolved ? { Authorization: `Bearer ${resolved}` } : {};
}

export function listPriceLists(params = {}, token) {
    return api.get(BASE_URL, {
        params,
        headers: authHeaders(token),
    });
}

export function getPriceList(id, params = {}, token) {
    return api.get(`${BASE_URL}/${id}`, {
        params,
        headers: authHeaders(token),
    });
}

export function createPriceList(payload, token) {
    return api.post(BASE_URL, payload, {
        headers: authHeaders(token),
    });
}

export function updatePriceList(id, payload, token) {
    return api.put(`${BASE_URL}/${id}`, payload, {
        headers: authHeaders(token),
    });
}

export function deletePriceList(id, token) {
    return api.delete(`${BASE_URL}/${id}`, {
        headers: authHeaders(token),
    });
}

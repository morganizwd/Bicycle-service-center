import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import {
    listRepairWarranties,
    createRepairWarranty,
    updateRepairWarranty,
    deleteRepairWarranty,
} from '../../../api/repairWarranties';
import { listWorkshopServices } from '../../../api/workshopServices';
import api from '../../../api/axiosConfig';
import { authHeader, getServiceCenterToken } from '../../../utils/auth';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'void', label: 'Voided' },
];

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function addMonths(dateString, months) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const result = new Date(date);
    result.setMonth(result.getMonth() + Number(months || 0));
    return result.toISOString().slice(0, 10);
}

const EMPTY_FORM = {
    serviceRequestId: '',
    workshopServiceId: '',
    coverageDescription: '',
    warrantyPeriodMonths: 6,
    conditions: '',
    status: 'active',
    startDate: todayISO(),
    endDate: addMonths(todayISO(), 6),
};

export default function CenterWarrantyManagement() {
    const { center } = useAuth();
    const [warranties, setWarranties] = useState([]);
    const [requests, setRequests] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const requestMap = useMemo(() => new Map(requests.map((req) => [req.id, req])), [requests]);
    const serviceMap = useMemo(() => new Map(services.map((svc) => [svc.id, svc])), [services]);

    useEffect(() => {
        if (!center?.id) {
            setWarranties([]);
            setRequests([]);
            setServices([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const token = getServiceCenterToken();
                const auth = authHeader(token);
                const [warrantiesRes, requestsRes, servicesRes] = await Promise.all([
                    listRepairWarranties({ serviceCenterId: center.id }, token),
                    api.get('/serviceRequests', { params: { serviceCenterId: center.id }, headers: auth }),
                    listWorkshopServices({ serviceCenterId: center.id }, token),
                ]);
                if (cancelled) return;
                setWarranties(Array.isArray(warrantiesRes.data) ? warrantiesRes.data : []);
                setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
                setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    toast.error('Failed to load repair warranties');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [center?.id]);

    function openCreate() {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    }

    function openEdit(warranty) {
        setEditingId(warranty.id);
        setForm({
            serviceRequestId: warranty.serviceRequestId || '',
            workshopServiceId: warranty.workshopServiceId || '',
            coverageDescription: warranty.coverageDescription || '',
            warrantyPeriodMonths: Number(warranty.warrantyPeriodMonths || 0) || 1,
            conditions: warranty.conditions || '',
            status: warranty.status || 'active',
            startDate: warranty.startDate ? new Date(warranty.startDate).toISOString().slice(0, 10) : todayISO(),
            endDate: warranty.endDate ? new Date(warranty.endDate).toISOString().slice(0, 10) : todayISO(),
        });
        setShowModal(true);
    }

    async function refetch() {
        if (!center?.id) return;
        try {
            const token = getServiceCenterToken();
            const { data } = await listRepairWarranties({ serviceCenterId: center.id }, token);
            setWarranties(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error('Unable to refresh warranty list');
        }
    }

    function onWarrantyPeriodChange(months) {
        setForm((prev) => ({
            ...prev,
            warrantyPeriodMonths: months,
            endDate: prev.startDate ? addMonths(prev.startDate, months) : prev.endDate,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!center?.id) return;

        if (!form.serviceRequestId || !form.coverageDescription || !form.startDate || !form.endDate) {
            toast.warn('Select a request and fill required fields');
            return;
        }

        const payload = {
            serviceRequestId: Number(form.serviceRequestId),
            workshopServiceId: form.workshopServiceId ? Number(form.workshopServiceId) : null,
            coverageDescription: form.coverageDescription.trim(),
            warrantyPeriodMonths: Number(form.warrantyPeriodMonths || 0) || 1,
            conditions: form.conditions?.trim() || null,
            status: form.status,
            startDate: new Date(form.startDate).toISOString(),
            endDate: new Date(form.endDate).toISOString(),
        };

        if (new Date(payload.startDate) > new Date(payload.endDate)) {
            toast.warn('End date must be after start date');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await updateRepairWarranty(editingId, payload);
                toast.success('Warranty updated');
            } else {
                await createRepairWarranty(payload);
                toast.success('Warranty created');
            }
            setShowModal(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM });
            await refetch();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save warranty');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this warranty?')) return;
        try {
            const token = getServiceCenterToken();
            await deleteRepairWarranty(id, token);
            toast.success('Warranty deleted');
            setWarranties((prev) => prev.filter((warranty) => warranty.id !== id));
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete warranty');
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">Repair Warranties</h3>
                <Button onClick={openCreate}>Create Warranty</Button>
            </div>

            {loading ? (
                <div className="d-flex justify-content-center py-5"><Spinner /></div>
            ) : (
                <Table responsive striped hover className="align-middle">
                    <thead>
                        <tr>
                            <th>Request</th>
                            <th>Service</th>
                            <th>Coverage</th>
                            <th>Period</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {warranties.map((warranty) => {
                            const request = warranty.serviceRequest || requestMap.get(warranty.serviceRequestId);
                            const svc = warranty.workshopService || serviceMap.get(warranty.workshopServiceId);
                            return (
                                <tr key={warranty.id}>
                                    <td>
                                        <div className="fw-semibold">Request #{warranty.serviceRequestId}</div>
                                        {request && (
                                            <div className="text-muted small">
                                                {request.problemDescription}
                                            </div>
                                        )}
                                    </td>
                                    <td>{svc ? svc.name : warranty.workshopServiceId ? `Service #${warranty.workshopServiceId}` : '—'}</td>
                                    <td>
                                        <div>{warranty.coverageDescription}</div>
                                        {warranty.conditions && (
                                            <div className="text-muted small">Conditions: {warranty.conditions}</div>
                                        )}
                                    </td>
                                    <td>
                                        <div>{new Date(warranty.startDate).toLocaleDateString()} — {new Date(warranty.endDate).toLocaleDateString()}</div>
                                        <div className="text-muted small">{warranty.warrantyPeriodMonths} months</div>
                                    </td>
                                    <td>
                                        <Badge bg={warranty.status === 'active' ? 'success' : warranty.status === 'expired' ? 'secondary' : 'warning'}>
                                            {STATUS_OPTIONS.find((option) => option.value === warranty.status)?.label || warranty.status}
                                        </Badge>
                                    </td>
                                    <td className="text-end">
                                        <div className="d-flex justify-content-end gap-2">
                                            <Button size="sm" variant="outline-secondary" onClick={() => openEdit(warranty)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="outline-danger" onClick={() => handleDelete(warranty.id)}>
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {warranties.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center text-muted py-4">
                                    No repair warranties have been issued yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            )}

            <Modal centered show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{editingId ? 'Edit Warranty' : 'Create Warranty'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Service request *</Form.Label>
                            <Form.Select
                                value={form.serviceRequestId}
                                onChange={(e) => setForm((prev) => ({ ...prev, serviceRequestId: e.target.value }))}
                                required
                            >
                                <option value="">Select request…</option>
                                {requests.map((request) => (
                                    <option key={request.id} value={request.id}>
                                        #{request.id} — {request.problemDescription?.slice(0, 60) || 'No description'}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Workshop service</Form.Label>
                            <Form.Select
                                value={form.workshopServiceId}
                                onChange={(e) => setForm((prev) => ({ ...prev, workshopServiceId: e.target.value }))}
                            >
                                <option value="">Do not link</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>{service.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Coverage description *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={form.coverageDescription}
                                onChange={(e) => setForm((prev) => ({ ...prev, coverageDescription: e.target.value }))}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Service conditions</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={form.conditions}
                                onChange={(e) => setForm((prev) => ({ ...prev, conditions: e.target.value }))}
                                placeholder="Example: preventive inspection every 3 months"
                            />
                        </Form.Group>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Warranty term (months) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        value={form.warrantyPeriodMonths}
                                        onChange={(e) => onWarrantyPeriodChange(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Start date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm((prev) => ({
                                            ...prev,
                                            startDate: e.target.value,
                                            endDate: prev.warrantyPeriodMonths ? addMonths(e.target.value, prev.warrantyPeriodMonths) : prev.endDate,
                                        }))}
                                        required
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>End date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                                        required
                                    />
                                </Form.Group>
                            </div>
                        </div>
                        <Form.Group className="mt-3">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                                value={form.status}
                                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingId ? 'Save' : 'Create'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

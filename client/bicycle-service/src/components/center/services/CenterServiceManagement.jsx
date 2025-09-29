import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import {
    listWorkshopServices,
    createWorkshopService,
    updateWorkshopService,
    deleteWorkshopService,
} from '../../../api/workshopServices';
import { listComponents } from '../../../api/components';

const EMPTY_FORM = {
    name: '',
    description: '',
    category: '',
    basePrice: '',
    durationMinutes: '',
    isActive: true,
    componentUsages: [],
};

function toNumber(value, allowNull = false) {
    if (value === '' || value === null || value === undefined) {
        return allowNull ? null : 0;
    }
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : 0;
}

export default function CenterServiceManagement() {
    const { center } = useAuth();
    const [services, setServices] = useState([]);
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const componentMap = useMemo(() => {
        const map = new Map();
        components.forEach((component) => map.set(component.id, component));
        return map;
    }, [components]);

    useEffect(() => {
        if (!center?.id) {
            setServices([]);
            setComponents([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const [servicesRes, componentsRes] = await Promise.all([
                    listWorkshopServices({ serviceCenterId: center.id, includeComponents: true }),
                    listComponents({ serviceCenterId: center.id }),
                ]);
                if (cancelled) return;
                setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
                setComponents(Array.isArray(componentsRes.data) ? componentsRes.data.filter((c) => c.isActive !== false) : []);
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    toast.error('Failed to load services or components');
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
        setForm({ ...EMPTY_FORM, componentUsages: [] });
        setShowModal(true);
    }

    function openEdit(service) {
        setEditingId(service.id);
        setForm({
            name: service.name || '',
            description: service.description || '',
            category: service.category || '',
            basePrice: service.basePrice || '',
            durationMinutes: service.durationMinutes || '',
            isActive: service.isActive !== false,
            componentUsages: (service.components || []).map((component) => ({
                componentId: component.id,
                quantity: component.ServiceComponent?.quantity ?? component.quantity ?? 1,
                unit: component.ServiceComponent?.unit ?? component.unit ?? 'pcs',
            })),
        });
        setShowModal(true);
    }

    async function refetch() {
        if (!center?.id) return;
        try {
            const { data } = await listWorkshopServices({ serviceCenterId: center.id, includeComponents: true });
            setServices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error('Unable to refresh service list');
        }
    }

    function updateComponentUsage(index, patch) {
        setForm((prev) => ({
            ...prev,
            componentUsages: prev.componentUsages.map((usage, idx) => (idx === index ? { ...usage, ...patch } : usage)),
        }));
    }

    function addComponentUsage() {
        setForm((prev) => ({
            ...prev,
            componentUsages: [
                ...prev.componentUsages,
                { componentId: components[0]?.id || '', quantity: 1, unit: components[0]?.unit || 'pcs' },
            ],
        }));
    }

    function removeComponentUsage(index) {
        setForm((prev) => ({
            ...prev,
            componentUsages: prev.componentUsages.filter((_, idx) => idx !== index),
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!center?.id) return;

        if (!form.name || !form.description || form.basePrice === '') {
            toast.warn('Name, description and base price are required');
            return;
        }

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            category: form.category?.trim() || null,
            basePrice: toNumber(form.basePrice),
            durationMinutes: form.durationMinutes === '' ? null : toNumber(form.durationMinutes, true),
            isActive: Boolean(form.isActive),
        };

        if (payload.basePrice < 0) {
            toast.warn('Base price must be non-negative');
            return;
        }

        const normalizedUsages = (form.componentUsages || [])
            .map((usage) => ({
                componentId: Number(usage.componentId),
                quantity: Number(usage.quantity || 1),
                unit: usage.unit || 'pcs',
            }))
            .filter((usage) => Number.isInteger(usage.componentId) && usage.componentId > 0 && usage.quantity > 0);

        if (normalizedUsages.length) {
            payload.componentUsages = normalizedUsages;
        }

        setSaving(true);
        try {
            if (editingId) {
                await updateWorkshopService(editingId, payload);
                toast.success('Service updated');
            } else {
                await createWorkshopService(payload);
                toast.success('Service created');
            }
            setShowModal(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM, componentUsages: [] });
            await refetch();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save service');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(serviceId) {
        if (!window.confirm('Delete this service?')) return;
        try {
            await deleteWorkshopService(serviceId);
            toast.success('Service deleted');
            setServices((prev) => prev.filter((svc) => svc.id !== serviceId));
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete service');
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">Workshop Services</h3>
                <Button onClick={openCreate}>Add Service</Button>
            </div>

            {loading ? (
                <div className="d-flex justify-content-center py-5"><Spinner /></div>
            ) : (
                <Table responsive striped hover className="align-middle">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Category</th>
                            <th className="text-end">Price</th>
                            <th className="text-end">Duration</th>
                            <th>Components</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((service) => (
                            <tr key={service.id}>
                                <td>
                                    <div className="fw-semibold">{service.name}</div>
                                    <div className="text-muted small">{service.description}</div>
                                    {service.isActive === false && (
                                        <Badge bg="secondary" className="mt-1">Inactive</Badge>
                                    )}
                                </td>
                                <td>{service.category || '—'}</td>
                                <td className="text-end">{Number(service.basePrice || 0).toFixed(2)} ₽</td>
                                <td className="text-end">
                                    {service.durationMinutes ? `${service.durationMinutes} min` : '—'}
                                </td>
                                <td>
                                    {(service.components || []).length === 0 ? (
                                        <span className="text-muted">No components linked</span>
                                    ) : (
                                        <div className="d-flex flex-column gap-1">
                                            {service.components.map((component) => {
                                                const through = component.ServiceComponent || {};
                                                const title = component.name || componentMap.get(component.id)?.name || `Component #${component.id}`;
                                                return (
                                                    <div key={`${service.id}-${component.id}`} className="small">
                                                        <span className="fw-semibold">{title}</span>
                                                        <span className="text-muted"> — {through.quantity || 1} {through.unit || component.unit || 'pcs'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </td>
                                <td className="text-end">
                                    <div className="d-flex justify-content-end gap-2">
                                        <Button size="sm" variant="outline-secondary" onClick={() => openEdit(service)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(service.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {services.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center text-muted py-4">
                                    No services have been created yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            )}

            <Modal centered show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{editingId ? 'Edit Service' : 'New Service'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Name *</Form.Label>
                            <Form.Control
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Category</Form.Label>
                            <Form.Control
                                value={form.category}
                                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                                placeholder="For example, Drivetrain tune-up"
                            />
                        </Form.Group>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Price *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.basePrice}
                                        onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))}
                                        required
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Duration (minutes)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        value={form.durationMinutes}
                                        onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4 d-flex align-items-center">
                                <Form.Check
                                    type="switch"
                                    id="service-active-switch"
                                    label="Active"
                                    checked={form.isActive}
                                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                />
                            </div>
                        </div>

                        <hr className="my-4" />
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Required Components</h5>
                            <Button size="sm" variant="outline-primary" onClick={addComponentUsage} disabled={components.length === 0}>
                                Add Component
                            </Button>
                        </div>
                        {components.length === 0 ? (
                            <div className="text-muted small mb-3">
                                Add components first to link them with services.
                            </div>
                        ) : form.componentUsages.length === 0 ? (
                            <div className="text-muted small mb-3">No components linked (optional).</div>
                        ) : (
                            <Table size="sm" className="align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '45%' }}>Component</th>
                                        <th style={{ width: '15%' }}>Qty</th>
                                        <th style={{ width: '20%' }}>Unit</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.componentUsages.map((usage, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <Form.Select
                                                    value={usage.componentId}
                                                    onChange={(e) => updateComponentUsage(idx, { componentId: e.target.value })}
                                                >
                                                    {components.map((component) => (
                                                        <option value={component.id} key={component.id}>
                                                            {component.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    min={0.1}
                                                    step="0.1"
                                                    value={usage.quantity}
                                                    onChange={(e) => updateComponentUsage(idx, { quantity: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control
                                                    value={usage.unit}
                                                    onChange={(e) => updateComponentUsage(idx, { unit: e.target.value })}
                                                />
                                            </td>
                                            <td className="text-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => removeComponentUsage(idx)}
                                                >
                                                    Remove
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
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




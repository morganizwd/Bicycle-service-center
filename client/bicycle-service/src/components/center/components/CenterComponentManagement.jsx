import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import {
    listComponents,
    createComponent,
    updateComponent,
    deleteComponent,
} from '../../../api/components';
import { listWorkshopServices } from '../../../api/workshopServices';

const EMPTY_FORM = {
    name: '',
    description: '',
    manufacturer: '',
    supplier: '',
    partNumber: '',
    compatibleManufacturers: '',
    compatibleModels: '',
    stock: 0,
    unit: 'pcs',
    unitPrice: '',
    isActive: true,
};

function normalizeList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function stringifyList(value) {
    return Array.isArray(value) ? value.join(', ') : value || '';
}

export default function CenterComponentManagement() {
    const { center } = useAuth();
    const [components, setComponents] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);

    const serviceMap = useMemo(() => {
        const map = new Map();
        services.forEach((svc) => map.set(svc.id, svc));
        return map;
    }, [services]);

    useEffect(() => {
        if (!center?.id) {
            setComponents([]);
            setServices([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const [componentsRes, servicesRes] = await Promise.all([
                    listComponents({ serviceCenterId: center.id, includeServices: true }),
                    listWorkshopServices({ serviceCenterId: center.id, includeComponents: true }),
                ]);

                if (cancelled) return;
                setComponents(Array.isArray(componentsRes.data) ? componentsRes.data : []);
                setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    toast.error('Failed to load components or workshop services');
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
        setForm(EMPTY_FORM);
        setShowModal(true);
    }

    function openEdit(component) {
        setEditingId(component.id);
        setForm({
            name: component.name || '',
            description: component.description || '',
            manufacturer: component.manufacturer || '',
            supplier: component.supplier || '',
            partNumber: component.partNumber || '',
            compatibleManufacturers: stringifyList(component.compatibleManufacturers),
            compatibleModels: stringifyList(component.compatibleModels),
            stock: Number(component.stock || 0),
            unit: component.unit || 'pcs',
            unitPrice: component.unitPrice || '',
            isActive: component.isActive !== false,
        });
        setShowModal(true);
    }

    async function refetch() {
        if (!center?.id) return;
        try {
            const { data } = await listComponents({ serviceCenterId: center.id, includeServices: true });
            setComponents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error('Unable to refresh component list');
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!center?.id) return;

        const payload = {
            ...form,
            unitPrice: form.unitPrice === '' ? null : Number(form.unitPrice),
            stock: Number(form.stock || 0),
            compatibleManufacturers: normalizeList(form.compatibleManufacturers),
            compatibleModels: normalizeList(form.compatibleModels),
        };

        if (!payload.name || !payload.manufacturer || payload.unitPrice === null || Number.isNaN(payload.unitPrice)) {
            toast.warn('Name, manufacturer and price are required');
            return;
        }

        payload.unitPrice = Number(payload.unitPrice);
        if (Number.isNaN(payload.unitPrice) || payload.unitPrice < 0) {
            toast.warn('Enter a valid non-negative price');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await updateComponent(editingId, payload);
                toast.success('Component updated');
            } else {
                await createComponent(payload);
                toast.success('Component created');
            }
            setShowModal(false);
            setForm(EMPTY_FORM);
            setEditingId(null);
            await refetch();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save component');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(componentId) {
        if (!window.confirm('Delete this component?')) return;
        try {
            await deleteComponent(componentId);
            toast.success('Component deleted');
            setComponents((prev) => prev.filter((item) => item.id !== componentId));
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete component');
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">Repair Components</h3>
                <Button onClick={openCreate}>Add Component</Button>
            </div>

            {loading ? (
                <div className="d-flex justify-content-center py-5"><Spinner /></div>
            ) : (
                <Table responsive striped hover className="align-middle">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Manufacturer</th>
                            <th>Part Number</th>
                            <th>Compatibility</th>
                            <th className="text-end">Stock</th>
                            <th className="text-end">Price</th>
                            <th>Used In Services</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {components.map((component) => (
                            <tr key={component.id}>
                                <td>
                                    <div className="fw-semibold">{component.name}</div>
                                    {component.description && (
                                        <div className="text-muted small">{component.description}</div>
                                    )}
                                </td>
                                <td>
                                    <div>{component.manufacturer || '—'}</div>
                                    {component.supplier && (
                                        <div className="text-muted small">Supplier: {component.supplier}</div>
                                    )}
                                </td>
                                <td>{component.partNumber || '—'}</td>
                                <td>
                                    {component.compatibleManufacturers?.length > 0 && (
                                        <div className="text-muted small">Manufacturers: {component.compatibleManufacturers.join(', ')}</div>
                                    )}
                                    {component.compatibleModels?.length > 0 && (
                                        <div className="text-muted small">Models: {component.compatibleModels.join(', ')}</div>
                                    )}
                                    {!component.compatibleManufacturers?.length && !component.compatibleModels?.length && '—'}
                                </td>
                                <td className="text-end">{Number(component.stock || 0)}</td>
                                <td className="text-end">{Number(component.unitPrice || 0).toFixed(2)} ₽</td>
                                <td>
                                    {(component.services || []).length === 0 ? (
                                        <span className="text-muted">Not linked</span>
                                    ) : (
                                        component.services.map((svc) => (
                                            <Badge bg="info" key={`${component.id}-${svc.id}`} className="me-1 mb-1">
                                                {svc.name || serviceMap.get(svc.id)?.name || `Service #${svc.id}`}
                                            </Badge>
                                        ))
                                    )}
                                </td>
                                <td className="text-end">
                                    <div className="d-flex justify-content-end gap-2">
                                        <Button size="sm" variant="outline-secondary" onClick={() => openEdit(component)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(component.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {components.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center text-muted py-4">
                                    No components have been added yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            )}

            <Modal centered show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{editingId ? 'Edit Component' : 'New Component'}</Modal.Title>
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
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Manufacturer *</Form.Label>
                            <Form.Control
                                value={form.manufacturer}
                                onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Supplier</Form.Label>
                            <Form.Control
                                value={form.supplier}
                                onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Part Number</Form.Label>
                            <Form.Control
                                value={form.partNumber}
                                onChange={(e) => setForm((prev) => ({ ...prev, partNumber: e.target.value }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Compatible Manufacturers (comma separated)</Form.Label>
                            <Form.Control
                                value={form.compatibleManufacturers}
                                onChange={(e) => setForm((prev) => ({ ...prev, compatibleManufacturers: e.target.value }))}
                                placeholder="Shimano, SRAM"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Compatible Models (comma separated)</Form.Label>
                            <Form.Control
                                value={form.compatibleModels}
                                onChange={(e) => setForm((prev) => ({ ...prev, compatibleModels: e.target.value }))}
                                placeholder="Deore, XTR"
                            />
                        </Form.Group>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Stock Quantity</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        value={form.stock}
                                        onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Unit</Form.Label>
                                    <Form.Control
                                        value={form.unit}
                                        onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Price *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.unitPrice}
                                        onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                                        required
                                    />
                                </Form.Group>
                            </div>
                        </div>
                        <Form.Check
                            className="mt-3"
                            type="switch"
                            id="component-active-switch"
                            label="Active"
                            checked={form.isActive}
                            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        />
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




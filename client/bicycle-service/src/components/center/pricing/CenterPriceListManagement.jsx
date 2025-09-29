import React, { useEffect, useMemo, useState } from 'react';
import { Accordion, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import {
    listPriceLists,
    createPriceList,
    updatePriceList,
    deletePriceList,
} from '../../../api/priceLists';
import { listWorkshopServices } from '../../../api/workshopServices';
import { listComponents } from '../../../api/components';
import api from '../../../api/axiosConfig';

const LIST_TYPES = [
    { value: 'combined', label: 'Combined' },
    { value: 'services', label: 'Services only' },
    { value: 'components', label: 'Components only' },
    { value: 'products', label: 'Products only' },
];

const ITEM_TYPES = [
    { value: 'service', label: 'Service' },
    { value: 'component', label: 'Component' },
    { value: 'product', label: 'Product' },
    { value: 'custom', label: 'Custom entry' },
];

const EMPTY_FORM = {
    name: '',
    description: '',
    listType: 'combined',
    effectiveFrom: '',
    effectiveTo: '',
    isDefault: false,
    items: [],
};

function defaultItem(itemType = 'service') {
    return {
        itemType,
        referenceId: '',
        itemName: '',
        description: '',
        unit: 'pcs',
        unitPrice: '',
        durationMinutes: '',
        warrantyMonths: '',
        isActive: true,
    };
}

function toDateInput(value) {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function toIsoDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function CenterPriceListManagement() {
    const { center } = useAuth();
    const [priceLists, setPriceLists] = useState([]);
    const [services, setServices] = useState([]);
    const [components, setComponents] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const lookups = useMemo(() => ({
        service: new Map(services.map((item) => [item.id, item])),
        component: new Map(components.map((item) => [item.id, item])),
        product: new Map(products.map((item) => [item.id, item])),
    }), [services, components, products]);

    useEffect(() => {
        if (!center?.id) {
            setPriceLists([]);
            setServices([]);
            setComponents([]);
            setProducts([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const [listsRes, servicesRes, componentsRes, productsRes] = await Promise.all([
                    listPriceLists({ serviceCenterId: center.id, includeItems: true }),
                    listWorkshopServices({ serviceCenterId: center.id }),
                    listComponents({ serviceCenterId: center.id }),
                    api.get('/products', { params: { serviceCenterId: center.id } }),
                ]);
                if (cancelled) return;
                setPriceLists(Array.isArray(listsRes.data) ? listsRes.data : []);
                setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
                setComponents(Array.isArray(componentsRes.data) ? componentsRes.data : []);
                setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    toast.error('Failed to load price lists or related data');
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
        setForm({ ...EMPTY_FORM, items: [] });
        setShowModal(true);
    }

    function openEdit(priceList) {
        setEditingId(priceList.id);
        setForm({
            name: priceList.name || '',
            description: priceList.description || '',
            listType: priceList.listType || 'combined',
            effectiveFrom: toDateInput(priceList.effectiveFrom),
            effectiveTo: toDateInput(priceList.effectiveTo),
            isDefault: Boolean(priceList.isDefault),
            items: (priceList.items || priceList.Items || []).map((item) => ({
                itemType: item.itemType || 'custom',
                referenceId: item.referenceId ?? '',
                itemName: item.itemName || '',
                description: item.description || '',
                unit: item.unit || 'pcs',
                unitPrice: item.unitPrice ?? '',
                durationMinutes: item.durationMinutes ?? '',
                warrantyMonths: item.warrantyMonths ?? '',
                isActive: item.isActive !== false,
            })),
        });
        setShowModal(true);
    }

    async function refetch() {
        if (!center?.id) return;
        try {
            const { data } = await listPriceLists({ serviceCenterId: center.id, includeItems: true });
            setPriceLists(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error('Unable to refresh price lists');
        }
    }

    function updateItem(index, patch) {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
        }));
    }

    function addItem(itemType) {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, defaultItem(itemType)],
        }));
    }

    function removeItem(index) {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== index),
        }));
    }

    function autoFillFromReference(index, type, referenceId) {
        const map = lookups[type];
        if (!map) return;
        const entity = map.get(Number(referenceId));
        if (!entity) return;

        const patch = {};
        if (entity.name) patch.itemName = entity.name;
        if (entity.description) patch.description = entity.description;
        if (entity.basePrice !== undefined) patch.unitPrice = Number(entity.basePrice);
        if (entity.price !== undefined) patch.unitPrice = Number(entity.price);
        if (entity.unit) patch.unit = entity.unit;
        if (entity.durationMinutes !== undefined) patch.durationMinutes = entity.durationMinutes;
        updateItem(index, patch);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!center?.id) return;

        if (!form.name || !form.listType) {
            toast.warn('Name and type are required');
            return;
        }

        const payload = {
            name: form.name.trim(),
            description: form.description?.trim() || null,
            listType: form.listType,
            effectiveFrom: toIsoDate(form.effectiveFrom),
            effectiveTo: toIsoDate(form.effectiveTo),
            isDefault: Boolean(form.isDefault),
        };

        if (payload.effectiveFrom && payload.effectiveTo && payload.effectiveFrom > payload.effectiveTo) {
            toast.warn('Start date cannot be after end date');
            return;
        }

        const normalizedItems = (form.items || [])
            .map((item) => {
                const numericPrice = item.unitPrice === '' || item.unitPrice === null ? null : Number(item.unitPrice);
                return {
                    itemType: item.itemType,
                    referenceId: item.referenceId === '' ? null : Number(item.referenceId),
                    itemName: item.itemName?.trim() || null,
                    description: item.description?.trim() || null,
                    unit: item.unit || 'pcs',
                    unitPrice: numericPrice,
                    durationMinutes: item.durationMinutes === '' || item.durationMinutes === null ? null : Number(item.durationMinutes),
                    warrantyMonths: item.warrantyMonths === '' || item.warrantyMonths === null ? null : Number(item.warrantyMonths),
                    isActive: Boolean(item.isActive),
                };
            })
            .filter((item) => {
                if (item.itemType === 'custom') {
                    return item.itemName && item.unitPrice !== null;
                }
                return item.referenceId !== null;
            });

        if (normalizedItems.length) {
            payload.items = normalizedItems;
        }

        setSaving(true);
        try {
            if (editingId) {
                await updatePriceList(editingId, payload);
                toast.success('Price list updated');
            } else {
                await createPriceList(payload);
                toast.success('Price list created');
            }
            setShowModal(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM, items: [] });
            await refetch();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save price list');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this price list?')) return;
        try {
            await deletePriceList(id);
            toast.success('Price list deleted');
            setPriceLists((prev) => prev.filter((pl) => pl.id !== id));
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete price list');
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">Price Lists</h3>
                <Button onClick={openCreate}>Add Price List</Button>
            </div>

            {loading ? (
                <div className="d-flex justify-content-center py-5"><Spinner /></div>
            ) : (
                <Table responsive striped hover className="align-middle">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Active Dates</th>
                            <th>Items</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {priceLists.map((list) => (
                            <tr key={list.id}>
                                <td>
                                    <div className="fw-semibold">{list.name}</div>
                                    {list.description && (
                                        <div className="text-muted small">{list.description}</div>
                                    )}
                                    {list.isDefault && (
                                        <Badge bg="success" className="mt-1">Default</Badge>
                                    )}
                                </td>
                                <td>{LIST_TYPES.find((item) => item.value === list.listType)?.label || list.listType}</td>
                                <td>
                                    <div>{list.effectiveFrom ? new Date(list.effectiveFrom).toLocaleDateString() : '—'} — {list.effectiveTo ? new Date(list.effectiveTo).toLocaleDateString() : '—'}</div>
                                </td>
                                <td>{(list.items || list.Items || []).length}</td>
                                <td className="text-end">
                                    <div className="d-flex justify-content-end gap-2">
                                        <Button size="sm" variant="outline-secondary" onClick={() => openEdit(list)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(list.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {priceLists.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center text-muted py-4">
                                    No price lists have been published yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            )}

            <Modal size="xl" centered show={showModal} onHide={() => setShowModal(false)}>
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{editingId ? 'Edit Price List' : 'New Price List'}</Modal.Title>
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
                        <div className="row g-3">
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Type *</Form.Label>
                                    <Form.Select
                                        value={form.listType}
                                        onChange={(e) => setForm((prev) => ({ ...prev, listType: e.target.value }))}
                                        required
                                    >
                                        {LIST_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Effective From</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={form.effectiveFrom}
                                        onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Effective To</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={form.effectiveTo}
                                        onChange={(e) => setForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                                    />
                                </Form.Group>
                            </div>
                        </div>
                        <Form.Check
                            className="mt-3"
                            type="switch"
                            id="price-list-default"
                            label="Use as default"
                            checked={form.isDefault}
                            onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                        />

                        <hr className="my-4" />
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Price List Items</h5>
                            <div className="d-flex gap-2">
                                {ITEM_TYPES.map((type) => (
                                    <Button key={type.value} size="sm" variant="outline-primary" onClick={() => addItem(type.value)}>
                                        Add {type.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        {form.items.length === 0 ? (
                            <div className="text-muted small">No items added yet.</div>
                        ) : (
                            <Table size="sm" responsive className="align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: 140 }}>Type</th>
                                        <th style={{ minWidth: 160 }}>Reference / Name</th>
                                        <th style={{ minWidth: 120 }}>Price</th>
                                        <th style={{ minWidth: 100 }}>Unit</th>
                                        <th style={{ minWidth: 140 }}>Details</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <Form.Select
                                                    value={item.itemType}
                                                    onChange={(e) => {
                                                        const newType = e.target.value;
                                                        updateItem(idx, { ...defaultItem(newType), itemType: newType });
                                                    }}
                                                >
                                                    {ITEM_TYPES.map((type) => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </Form.Select>
                                                <Form.Check
                                                    size="sm"
                                                    className="mt-2"
                                                    type="switch"
                                                    id={`item-active-${idx}`}
                                                    label="Active"
                                                    checked={item.isActive}
                                                    onChange={(e) => updateItem(idx, { isActive: e.target.checked })}
                                                />
                                            </td>
                                            <td>
                                                {item.itemType === 'custom' ? (
                                                    <>
                                                        <Form.Control
                                                            className="mb-2"
                                                            placeholder="Name *"
                                                            value={item.itemName}
                                                            onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                                                            required
                                                        />
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={2}
                                                            placeholder="Description"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <Form.Select
                                                            className="mb-2"
                                                            value={item.referenceId || ''}
                                                            onChange={(e) => {
                                                                const referenceId = e.target.value;
                                                                updateItem(idx, { referenceId });
                                                                autoFillFromReference(idx, item.itemType, referenceId);
                                                            }}
                                                        >
                                                            <option value="">Select…</option>
                                                            {(item.itemType === 'service' ? services : item.itemType === 'component' ? components : products).map((entity) => (
                                                                <option key={entity.id} value={entity.id}>{entity.name}</option>
                                                            ))}
                                                        </Form.Select>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={2}
                                                            placeholder="Description"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                                                        />
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                                                    required={item.itemType === 'custom'}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control
                                                    className="mb-2"
                                                    value={item.unit}
                                                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control
                                                    className="mb-2"
                                                    type="number"
                                                    min={0}
                                                    placeholder="Duration, min"
                                                    value={item.durationMinutes}
                                                    onChange={(e) => updateItem(idx, { durationMinutes: e.target.value })}
                                                />
                                                <Form.Control
                                                    type="number"
                                                    min={0}
                                                    placeholder="Warranty, months"
                                                    value={item.warrantyMonths}
                                                    onChange={(e) => updateItem(idx, { warrantyMonths: e.target.value })}
                                                />
                                            </td>
                                            <td className="text-end">
                                                <Button size="sm" variant="outline-danger" onClick={() => removeItem(idx)}>
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


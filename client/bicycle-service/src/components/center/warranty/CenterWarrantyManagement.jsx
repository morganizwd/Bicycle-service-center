// src/components/center/warranty/CenterWarrantyManagement.jsx
import React, { useEffect, useState } from 'react';
import { Table, Form, Button, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

const empty = {
    orderItemId: '',
    warrantyPeriod: '',
    serviceConditions: '',
    serviceCenterContacts: '',
    validUntil: '',
};

export default function CenterWarrantyManagement() {
    const { center, centerToken, centerLoading } = useAuth();
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(true);

    async function load() {
        if (!center?.id) {
            setItems([]);
        } else {
            setLoading(true);
            try {
                // ПУБЛИЧНЫЙ список по serviceCenterId
                const { data } = await api.get(`/warrantyServices`, {
                    params: { serviceCenterId: center.id },
                });
                setItems(Array.isArray(data) ? data : []);
            } catch {
                toast.error('Не удалось загрузить гарантии');
            } finally {
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center?.id]);

    const onChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    async function create(e) {
        e.preventDefault();
        try {
            await api.post(`/warrantyServices`, form, {
                headers: { Authorization: `Bearer ${centerToken}` },
            });
            toast.success('Гарантия создана');
            setForm(empty);
            await load();
        } catch {
            toast.error('Ошибка при создании гарантии');
        }
    }

    async function remove(id) {
        if (!window.confirm('Удалить запись гарантии?')) return;
        try {
            await api.delete(`/warrantyServices/${id}`, {
                headers: { Authorization: `Bearer ${centerToken}` },
            });
            toast.success('Гарантия удалена');
            await load();
        } catch {
            toast.error('Ошибка при удалении');
        }
    }

    if (centerLoading || loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    if (!center) return <div>Требуется вход сервисного центра</div>;

    return (
        <>
            <h3 className="mb-3">Гарантии и сервис</h3>

            <Card className="mb-4">
                <Card.Body>
                    <Card.Title>Создать гарантию</Card.Title>
                    <Form onSubmit={create}>
                        <Form.Group className="mb-2">
                            <Form.Label>ID позиции заказа *</Form.Label>
                            <Form.Control
                                name="orderItemId"
                                value={form.orderItemId}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Срок гарантии *</Form.Label>
                            <Form.Control
                                name="warrantyPeriod"
                                value={form.warrantyPeriod}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Условия сервиса *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                name="serviceConditions"
                                value={form.serviceConditions}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Контакты сервис-центра *</Form.Label>
                            <Form.Control
                                name="serviceCenterContacts"
                                value={form.serviceCenterContacts}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Действительна до *</Form.Label>
                            <Form.Control
                                type="date"
                                name="validUntil"
                                value={form.validUntil}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Button type="submit">Создать</Button>
                    </Form>
                </Card.Body>
            </Card>

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>OrderItem</th>
                        <th>Период</th>
                        <th>Условия</th>
                        <th>Контакты</th>
                        <th>До</th>
                        <th>Товар</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((w, i) => (
                        <tr key={w.id}>
                            <td>{i + 1}</td>
                            <td>{w.orderItemId}</td>
                            <td>{w.warrantyPeriod}</td>
                            <td style={{ maxWidth: 300 }}>{w.serviceConditions}</td>
                            <td>{w.serviceCenterContacts}</td>
                            <td>
                                {w.validUntil
                                    ? new Date(w.validUntil).toLocaleDateString()
                                    : '—'}
                            </td>
                            <td>{w?.OrderItem?.Product?.name || '—'}</td>
                            <td className="text-nowrap">
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => remove(w.id)}
                                >
                                    Удалить
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
}

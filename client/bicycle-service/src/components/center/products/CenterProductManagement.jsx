// src/components/center/products/CenterProductManagement.jsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Row, Col, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

const empty = {
    name: '',
    description: '',
    price: '',
    category: '',
    brand: '',
    model: '',
    condition: 'new',
    warranty: '',
    stock: '',
};

export default function CenterProductManagement() {
    const { center, centerLoading } = useAuth();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState(empty);
    const [photo, setPhoto] = useState(null);
    const [editingId, setEditingId] = useState(null);

    async function load() {
        if (!center) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.get('/products', {
                params: { serviceCenterId: center.id },
            });
            setItems(data || []);
        } catch {
            toast.error('Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center]);

    const onChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    const onFile = (e) => setPhoto(e.target.files?.[0] || null);

    async function submitCreateOrUpdate(e) {
        e.preventDefault();

        // простая валидация
        if (!form.name || !form.price || !form.stock) {
            toast.warn('Заполните Название, Цена и В наличии');
            return;
        }

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
        if (photo) fd.append('photo', photo);

        try {
            if (editingId) {
                await api.put(`/products/${editingId}`, fd);
                toast.success('Товар обновлён');
            } else {
                await api.post('/products', fd);
                toast.success('Товар создан');
            }
            setForm(empty);
            setPhoto(null);
            setEditingId(null);
            await load();
        } catch {
            toast.error('Ошибка при сохранении товара');
        }
    }

    function startEdit(p) {
        setEditingId(p.id);
        setForm({
            name: p.name || '',
            description: p.description || '',
            price: p.price ?? '',
            category: p.category || '',
            brand: p.brand || '',
            model: p.model || '',
            condition: p.condition || 'new',
            warranty: p.warranty || '',
            stock: p.stock ?? '',
        });
        setPhoto(null);
    }

    async function remove(id) {
        if (!window.confirm('Удалить товар?')) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success('Товар удалён');
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

    if (!center) {
        return <div>Требуется вход сервисного центра</div>;
    }

    return (
        <>
            <h3 className="mb-3">Управление товарами</h3>

            <Card className="mb-4">
                <Card.Body>
                    <Card.Title>{editingId ? 'Редактирование товара' : 'Создание товара'}</Card.Title>
                    <Form onSubmit={submitCreateOrUpdate} encType="multipart/form-data">
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Название *</Form.Label>
                                    <Form.Control
                                        name="name"
                                        value={form.name}
                                        onChange={onChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Цена *</Form.Label>
                                    <Form.Control
                                        name="price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.price}
                                        onChange={onChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-2">
                                    <Form.Label>В наличии *</Form.Label>
                                    <Form.Control
                                        name="stock"
                                        type="number"
                                        min="0"
                                        value={form.stock}
                                        onChange={onChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Категория</Form.Label>
                                    <Form.Control
                                        name="category"
                                        value={form.category}
                                        onChange={onChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Бренд</Form.Label>
                                    <Form.Control
                                        name="brand"
                                        value={form.brand}
                                        onChange={onChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Модель</Form.Label>
                                    <Form.Control
                                        name="model"
                                        value={form.model}
                                        onChange={onChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Состояние</Form.Label>
                                    <Form.Select
                                        name="condition"
                                        value={form.condition}
                                        onChange={onChange}
                                    >
                                        <option value="new">new</option>
                                        <option value="used">used</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Гарантия</Form.Label>
                                    <Form.Control
                                        name="warranty"
                                        value={form.warranty}
                                        onChange={onChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Фото</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={onFile}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Описание</Form.Label>
                            <Form.Control
                                as="textarea"
                                name="description"
                                rows={3}
                                value={form.description}
                                onChange={onChange}
                            />
                        </Form.Group>

                        <div className="d-flex gap-2">
                            <Button type="submit">
                                {editingId ? 'Сохранить' : 'Создать'}
                            </Button>
                            {editingId && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setEditingId(null);
                                        setForm(empty);
                                        setPhoto(null);
                                    }}
                                >
                                    Отмена
                                </Button>
                            )}
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Название</th>
                        <th>Цена</th>
                        <th>В наличии</th>
                        <th>Категория</th>
                        <th>Бренд</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((p, i) => (
                        <tr key={p.id}>
                            <td>{i + 1}</td>
                            <td>{p.name}</td>
                            <td>{p.price}</td>
                            <td>{p.stock}</td>
                            <td>{p.category}</td>
                            <td>{p.brand}</td>
                            <td className="text-nowrap">
                                <Button size="sm" onClick={() => startEdit(p)}>
                                    Изм.
                                </Button>{' '}
                                <Button size="sm" variant="danger" onClick={() => remove(p.id)}>
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

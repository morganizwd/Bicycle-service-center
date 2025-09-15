// src/components/center/warranty/CenterWarrantyManagement.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Table, Form, Button, Card, Spinner, Modal, InputGroup } from 'react-bootstrap';
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
    const [items, setItems] = useState([]);         // существующие гарантии
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(true);

    // --- состояние модалки выбора позиции заказа ---
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerItems, setPickerItems] = useState([]); // расплющенные orderItems
    const [pickerQuery, setPickerQuery] = useState('');

    // набор уже покрытых orderItemId, чтобы не предлагать их повторно
    const coveredIds = useMemo(() => new Set(items.map(w => w.orderItemId)), [items]);

    async function load() {
        if (!center?.id) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // ПУБЛИЧНЫЙ список гарантий по центру
            const { data } = await api.get('/warrantyServices', { params: { serviceCenterId: center.id } });
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Не удалось загрузить гарантии');
        } finally {
            setLoading(false);
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
            await api.post('/warrantyServices', form, {
                headers: { Authorization: `Bearer ${centerToken}` }, // оставим явный заголовок
            });
            toast.success('Гарантия создана');
            setForm(empty);
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Ошибка при создании гарантии');
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
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Ошибка при удалении');
        }
    }

    // ------- модалка выбора позиции заказа -------
    const openPicker = async () => {
        setPickerOpen(true);
        setPickerLoading(true);
        try {
            // заказы текущего сервис-центра (по токену центра)
            const { data: orders } = await api.get('/service-centers/orders', {
                headers: { Authorization: `Bearer ${centerToken}` },
            });

            // расплющим orderItems, добавим удобные поля
            const flat = [];
            (orders || []).forEach((o) => {
                const ois = o.orderItems || o.OrderItems || []; // на всякий случай оба варианта
                ois.forEach((oi) => {
                    // показываем только позиции товаров этого центра (на будущее)
                    const prod = oi.Product || oi.product || {};
                    if (prod.serviceCenterId && center?.id && prod.serviceCenterId !== center.id) return;

                    flat.push({
                        orderId: o.id,
                        orderDate: o.orderDate,
                        user: o.User || o.user || null,
                        product: prod,
                        quantity: oi.quantity,
                        priceAtPurchase: oi.priceAtPurchase,
                        orderItemId: oi.id,
                    });
                });
            });

            setPickerItems(flat);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Не удалось загрузить заказы');
        } finally {
            setPickerLoading(false);
        }
    };

    const closePicker = () => setPickerOpen(false);

    const filteredPickerItems = useMemo(() => {
        const q = pickerQuery.trim().toLowerCase();
        return pickerItems
            .filter(it => !coveredIds.has(it.orderItemId)) // исключаем уже покрытые гарантией
            .filter((it) => {
                if (!q) return true;
                const fields = [
                    String(it.orderId),
                    it.product?.name || '',
                    it.product?.brand || '',
                    it.product?.model || '',
                    (it.user ? `${it.user.firstName || ''} ${it.user.lastName || ''}`.trim() : ''),
                ]
                    .join(' ')
                    .toLowerCase();
                return fields.includes(q);
            })
            .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    }, [pickerItems, pickerQuery, coveredIds]);

    const pickItem = (oi) => {
        setForm(f => ({ ...f, orderItemId: oi.orderItemId }));
        setPickerOpen(false);
    };

    // ----------- UI -----------
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
                            <InputGroup>
                                <Form.Control
                                    name="orderItemId"
                                    value={form.orderItemId}
                                    onChange={onChange}
                                    placeholder="Выберите из заказов"
                                    required
                                    readOnly
                                />
                                <Button variant="outline-secondary" onClick={openPicker}>
                                    Выбрать из заказов
                                </Button>
                            </InputGroup>
                            <Form.Text className="text-muted">
                                Нажмите «Выбрать из заказов», чтобы выбрать позицию заказа (товар) с оформленного заказа.
                            </Form.Text>
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
                            <td>{w.validUntil ? new Date(w.validUntil).toLocaleDateString() : '—'}</td>
                            <td>{w?.OrderItem?.Product?.name || '—'}</td>
                            <td className="text-nowrap">
                                <Button size="sm" variant="outline-danger" onClick={() => remove(w.id)}>
                                    Удалить
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={8} className="text-center text-muted">
                                Записей пока нет
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>

            {/* Модалка выбора позиции заказа */}
            <Modal show={pickerOpen} onHide={closePicker} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Выберите позицию заказа</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <InputGroup>
                            <Form.Control
                                placeholder="Поиск: № заказа, товар, бренд/модель, клиент…"
                                value={pickerQuery}
                                onChange={(e) => setPickerQuery(e.target.value)}
                            />
                            <Button variant="outline-secondary" onClick={() => setPickerQuery('')}>Сброс</Button>
                        </InputGroup>
                        <Form.Text className="text-muted">
                            Позиции, по которым уже есть гарантия, скрыты из списка.
                        </Form.Text>
                    </div>

                    {pickerLoading ? (
                        <div className="d-flex justify-content-center py-4"><Spinner /></div>
                    ) : (
                        <Table hover responsive className="align-middle">
                            <thead>
                                <tr>
                                    <th>Заказ</th>
                                    <th>Дата</th>
                                    <th>Клиент</th>
                                    <th>Товар</th>
                                    <th className="text-center">Кол-во</th>
                                    <th className="text-end">Цена</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPickerItems.map((it) => (
                                    <tr key={it.orderItemId}>
                                        <td>#{it.orderId}</td>
                                        <td>{new Date(it.orderDate).toLocaleString()}</td>
                                        <td>{it.user ? `${it.user.firstName || ''} ${it.user.lastName || ''}`.trim() : '—'}</td>
                                        <td>
                                            <div className="fw-semibold">{it.product?.name}</div>
                                            <div className="text-muted small">{it.product?.brand} {it.product?.model}</div>
                                        </td>
                                        <td className="text-center">{it.quantity}</td>
                                        <td className="text-end">{Number(it.priceAtPurchase || it.product?.price || 0).toFixed(2)} ₽</td>
                                        <td className="text-end">
                                            <Button size="sm" onClick={() => pickItem(it)}>Выбрать</Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPickerItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center text-muted py-3">Подходящих позиций не найдено</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closePicker}>Закрыть</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

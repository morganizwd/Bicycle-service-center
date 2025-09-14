// src/components/center/profile/CenterProfileSettings.jsx
import React, { useEffect, useState } from 'react';
import { Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

export default function CenterProfileSettings() {
    const { center, centerLoading, refreshCenter } = useAuth();
    const [form, setForm] = useState(null);
    const [logo, setLogo] = useState(null);
    const [saving, setSaving] = useState(false);

    // При монтировании подстрахуемся и освежим профиль, если его ещё нет
    useEffect(() => {
        if (!center) refreshCenter();
    }, [center, refreshCenter]);

    // Заполняем форму, когда центр подгрузился
    useEffect(() => {
        if (center) {
            setForm({
                name: center.name || '',
                contactPerson: center.contactPerson || '',
                registrationNumber: center.registrationNumber || '',
                phone: center.phone || '',
                email: center.email || '',
                address: center.address || '',
                establishedYear: center.establishedYear || '',
                specialization: center.specialization || 'горные велосипеды',
                offersDelivery: !!center.offersDelivery,
            });
        }
    }, [center]);

    if (centerLoading || (!center && !form)) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    if (!center) {
        // На эту страницу вообще не попадём из-за ServiceCenterRoute,
        // но оставим безопасный фоллбек.
        return <div>Требуется вход сервисного центра</div>;
    }

    if (!form) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    };

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (logo) fd.append('logo', logo);

            // axios инстанс сам подставит Authorization и boundary
            await api.put(`/service-centers/${center.id}`, fd);

            toast.success('Профиль обновлён');
            await refreshCenter();
        } catch (err) {
            console.error(err);
            toast.error('Не удалось обновить профиль');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card className="mx-auto" style={{ maxWidth: 900 }}>
            <Card.Body>
                <Card.Title>Настройки сервисного центра</Card.Title>
                <Form onSubmit={save} encType="multipart/form-data">
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Название</Form.Label>
                                <Form.Control name="name" value={form.name} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Контактное лицо</Form.Label>
                                <Form.Control name="contactPerson" value={form.contactPerson} onChange={onChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Рег. номер</Form.Label>
                                <Form.Control name="registrationNumber" value={form.registrationNumber} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Телефон</Form.Label>
                                <Form.Control name="phone" value={form.phone} onChange={onChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" name="email" value={form.email} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Адрес</Form.Label>
                                <Form.Control name="address" value={form.address} onChange={onChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <Form.Group className="mb-2">
                                <Form.Label>Год основания</Form.Label>
                                <Form.Control
                                    name="establishedYear"
                                    type="number"
                                    value={form.establishedYear}
                                    onChange={onChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group className="mb-2">
                                <Form.Label>Специализация</Form.Label>
                                <Form.Select name="specialization" value={form.specialization} onChange={onChange}>
                                    {['горные велосипеды', 'шоссейные велосипеды', 'городские велосипеды', 'электровелосипеды'].map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-center">
                            <Form.Check
                                type="checkbox"
                                label="Есть доставка"
                                name="offersDelivery"
                                checked={form.offersDelivery}
                                onChange={onChange}
                            />
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Логотип</Form.Label>
                        <Form.Control type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
                    </Form.Group>

                    <Button type="submit" disabled={saving}>
                        {saving ? 'Сохранение…' : 'Сохранить'}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
}

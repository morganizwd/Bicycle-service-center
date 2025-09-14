import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

export default function ProfilePage() {
    const { token, user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(!user);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', phone: '', birthDate: '', address: ''
    });
    const [photoFile, setPhotoFile] = useState(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                // /user/auth уже возвращает текущего пользователя (мы под гардом, токен валидный)
                const res = await fetch(`${API}/user/auth`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) throw new Error();
                const u = await res.json();
                setForm({
                    firstName: u.firstName || '',
                    lastName: u.lastName || '',
                    email: u.email || '',
                    phone: u.phone || '',
                    birthDate: u.birthDate ? u.birthDate.slice(0, 10) : '',
                    address: u.address || '',
                });
            } catch {
                toast.error('Не удалось загрузить профиль');
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line
    }, []);

    function setField(k, v) {
        setForm(prev => ({ ...prev, [k]: v }));
    }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => data.append(k, v ?? ''));
            if (photoFile) data.append('photo', photoFile);

            const res = await fetch(`${API}/user/${user.id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: data
            });
            if (!res.ok) {
                let msg = 'Не удалось сохранить профиль';
                try { const err = await res.json(); if (err?.message) msg = err.message; } catch { }
                throw new Error(msg);
            }
            toast.success('Профиль обновлён');
            await refreshUser(); // перезагрузим контекст
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;

    return (
        <>
            <h3 className="mb-3">Профиль</h3>
            <Card>
                <Card.Body>
                    <Form onSubmit={save}>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Имя</Form.Label>
                                    <Form.Control value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Фамилия</Form.Label>
                                    <Form.Control value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Телефон</Form.Label>
                                    <Form.Control value={form.phone} onChange={(e) => setField('phone', e.target.value)} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Дата рождения</Form.Label>
                                    <Form.Control type="date" value={form.birthDate} onChange={(e) => setField('birthDate', e.target.value)} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Адрес</Form.Label>
                                    <Form.Control value={form.address} onChange={(e) => setField('address', e.target.value)} />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Фото профиля</Form.Label>
                                    <Form.Control type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="mt-3 d-flex gap-2">
                            <Button type="submit" disabled={saving}>Сохранить</Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </>
    );
}

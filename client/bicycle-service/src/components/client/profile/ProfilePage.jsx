// src/components/client/profile/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

export default function ProfilePage() {
    const { user, userLoading, refreshUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', phone: '', birthDate: '', address: ''
    });
    const [photoFile, setPhotoFile] = useState(null);

    useEffect(() => {
        let ignore = false;
        async function load() {
            setLoading(true);
            try {
                // axios сам подставит Authorization из интерсептора
                const { data: u } = await api.get('/users/auth');
                if (ignore) return;
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
                if (!ignore) setLoading(false);
            }
        }
        load();
        return () => { ignore = true; };
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

            // axios: заголовок Authorization добавится автоматически
            await api.put(`/users/${user.id}`, data);
            toast.success('Профиль обновлён');
            await refreshUser(); // обновим контекст
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Не удалось сохранить профиль');
        } finally {
            setSaving(false);
        }
    }

    if (userLoading || loading) {
        return <div className="d-flex justify-content-center py-5"><Spinner /></div>;
    }

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
                            <Button type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </>
    );
}

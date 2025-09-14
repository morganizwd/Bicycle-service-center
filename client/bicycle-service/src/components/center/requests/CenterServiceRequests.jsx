// src/components/center/requests/CenterServiceRequests.jsx
import React, { useEffect, useState } from 'react';
import { Table, Form, Button, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

const STATUSES = ['запрошена', 'в работе', 'выполнена', 'отменена'];

export default function CenterServiceRequests() {
    const { center, centerLoading } = useAuth();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [notesDrafts, setNotesDrafts] = useState({}); // { [id]: 'text' }

    async function load() {
        if (!center) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = { serviceCenterId: center.id };
            if (filter) params.status = filter;
            const { data } = await api.get('/serviceRequests', { params });
            setItems(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Не удалось загрузить заявки');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center, filter]);

    async function updateStatus(id, status) {
        try {
            await api.put(`/serviceRequests/${id}`, { status });
            toast.success('Статус обновлён');
            await load();
        } catch {
            toast.error('Ошибка при обновлении статуса');
        }
    }

    async function updateNotes(id) {
        const technicianNotes = notesDrafts[id] ?? '';
        try {
            await api.put(`/serviceRequests/${id}`, { technicianNotes });
            toast.success('Заметки сохранены');
            await load();
        } catch {
            toast.error('Ошибка при обновлении заметок');
        }
    }

    async function remove(id) {
        if (!window.confirm('Удалить заявку?')) return;
        try {
            await api.delete(`/serviceRequests/${id}`);
            toast.success('Заявка удалена');
            await load();
        } catch {
            toast.error('Ошибка удаления');
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
            <h3 className="mb-3">Заявки на обслуживание</h3>

            <div className="d-flex gap-2 align-items-center mb-2">
                <div>Фильтр по статусу:</div>
                <Form.Select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ maxWidth: 240 }}
                >
                    <option value="">— Все —</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </Form.Select>
            </div>

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Дата</th>
                        <th>Клиент</th>
                        <th>Велик</th>
                        <th>Описание</th>
                        <th>Статус</th>
                        <th>Заметки мастера</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((r, i) => {
                        const draft = notesDrafts[r.id] ?? r.technicianNotes ?? '';
                        return (
                            <tr key={r.id}>
                                <td>{i + 1}</td>
                                <td>{r.requestDate ? new Date(r.requestDate).toLocaleString() : '—'}</td>
                                <td>{r.User ? `${r.User.firstName} ${r.User.lastName}` : '—'}</td>
                                <td>{r.bikeModel || '—'}</td>
                                <td style={{ maxWidth: 260 }}>{r.problemDescription}</td>
                                <td style={{ minWidth: 180 }}>
                                    <Form.Select
                                        size="sm"
                                        value={r.status}
                                        onChange={(e) => updateStatus(r.id, e.target.value)}
                                    >
                                        {STATUSES.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </td>
                                <td style={{ minWidth: 240 }}>
                                    <Form.Control
                                        size="sm"
                                        value={draft}
                                        onChange={(e) =>
                                            setNotesDrafts((m) => ({ ...m, [r.id]: e.target.value }))
                                        }
                                        onBlur={() => updateNotes(r.id)}
                                        placeholder="Добавить заметку…"
                                    />
                                </td>
                                <td className="text-nowrap">
                                    <Button size="sm" variant="outline-danger" onClick={() => remove(r.id)}>
                                        Удалить
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </>
    );
}

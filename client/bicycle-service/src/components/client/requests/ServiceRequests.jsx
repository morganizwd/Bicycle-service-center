import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

const statusColor = (s) => ({
    'запрошена': 'secondary',
    'в работе': 'info',
    'выполнена': 'success',
    'отменена': 'danger'
}[s] || 'secondary');

export default function ServiceRequests() {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    async function load() {
        setLoading(true);
        try {
            // фильтруем по userId (безопаснее и меньше данных)
            const res = await fetch(`${API}/serviceRequests?userId=${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            setItems(await res.json());
        } catch {
            toast.error('Не удалось загрузить заявки');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    async function cancel(id) {
        if (!window.confirm('Удалить эту заявку?')) return;
        try {
            const res = await fetch(`${API}/servicerequests/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            toast.success('Заявка удалена');
            await load();
        } catch {
            toast.error('Не удалось удалить заявку');
        }
    }

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;

    return (
        <>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Мои заявки на сервис</h3>
                <Button as={Link} to="/requests/new">Новая заявка</Button>
            </div>

            <Card>
                <Card.Body>
                    {items.length === 0 ? (
                        <div className="text-muted">Заявок пока нет</div>
                    ) : (
                        <Table responsive hover>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Центр</th>
                                    <th>Дата</th>
                                    <th>Статус</th>
                                    <th>Описание проблемы</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.id}</td>
                                        <td>{r.ServiceCenter?.name}</td>
                                        <td>{new Date(r.requestDate).toLocaleString()}</td>
                                        <td><Badge bg={statusColor(r.status)}>{r.status}</Badge></td>
                                        <td className="text-truncate" style={{ maxWidth: 320 }}>{r.problemDescription}</td>
                                        <td className="text-end">
                                            <Button size="sm" variant="outline-danger" onClick={() => cancel(r.id)}>Удалить</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </>
    );
}

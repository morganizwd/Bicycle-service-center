// src/components/center/reviews/CenterReviewsManagement.jsx
import React, { useEffect, useState } from 'react';
import { Table, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

export default function CenterReviewsManagement() {
    const { center, centerLoading } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        if (!center?.id) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.get(`/reviews/service-center/${center.id}`);
            setItems(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Не удалось загрузить отзывы');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center?.id]);

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
            <h3 className="mb-3">Отзывы</h3>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Рейтинг</th>
                        <th>Кратко</th>
                        <th>Текст</th>
                        <th>Товар</th>
                        <th>Автор</th>
                        <th>Заказ</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((r, i) => (
                        <tr key={r.id}>
                            <td>{i + 1}</td>
                            <td>{r.rating}</td>
                            <td>{r.shortReview}</td>
                            <td style={{ maxWidth: 400 }}>{r.reviewText}</td>
                            <td>{r.Product?.name || '—'}</td>
                            <td>{r.User ? `${r.User.firstName} ${r.User.lastName}` : '—'}</td>
                            <td>#{r.orderId}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
}

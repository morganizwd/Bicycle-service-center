// src/components/center/dashboard/CenterDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Spinner, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ===== Helpers =====
async function loadFontBase64(url) {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

/**
 * Регистрирует TTF с кириллицей (рекомендуется NotoSans или DejaVuSans).
 * Возвращает имя шрифта, которое безопасно указывать в autoTable.
 * Если подключение не удалось — возвращает 'helvetica' (fallback).
 */
async function ensureCyrillicFont(doc) {
    try {
        const regular = await loadFontBase64(
            `${process.env.PUBLIC_URL}/fonts/NotoSans-Regular.ttf`
        );
        const bold = await loadFontBase64(
            `${process.env.PUBLIC_URL}/fonts/NotoSans-Bold.ttf`
        );

        doc.addFileToVFS('NotoSans-Regular.ttf', regular);
        doc.addFileToVFS('NotoSans-Bold.ttf', bold);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

        doc.setFont('NotoSans', 'normal');

        // sanity check — если шрифт не распознан, тут бы упало
        doc.getTextWidth('проверка кириллицы');

        return 'NotoSans';
    } catch (e) {
        console.warn('Не удалось подключить кириллический TTF, fallback на Helvetica:', e);
        doc.setFont('helvetica', '');
        return 'helvetica';
    }
}

function fmtMoney(v) {
    const n = Number(v || 0);
    return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}
function fmtDate(d) {
    try { return new Date(d).toLocaleString('ru-RU'); } catch { return ''; }
}

export default function CenterDashboard() {
    const { center, centerLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [requests, setRequests] = useState([]);
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        let aborted = false;

        async function load() {
            if (!center) { setLoading(false); return; }
            setLoading(true);
            try {
                const [prodRes, ordersRes, reqRes, revRes] = await Promise.all([
                    api.get('/products', { params: { serviceCenterId: center.id } }),
                    api.get('/service-centers/orders'),
                    api.get('/serviceRequests', { params: { serviceCenterId: center.id } }),
                    api.get(`/reviews/service-center/${center.id}`),
                ]);
                if (aborted) return;

                setProducts(prodRes.data || []);
                setOrders(ordersRes.data || []);
                setRequests(reqRes.data || []);
                setReviews(revRes.data || []);
            } catch {
                if (!aborted) toast.error('Не удалось загрузить данные дашборда');
            } finally {
                if (!aborted) setLoading(false);
            }
        }

        load();
        return () => { aborted = true; };
    }, [center]);

    const metrics = useMemo(() => {
        const ordersPending = orders.filter(o => o.status === 'pending').length;
        const ordersProcessing = orders.filter(o => o.status === 'processing').length;
        const revenue = orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + Number(o.totalCost || 0), 0);
        const avgRating = reviews.length
            ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
            : '—';
        const openRequests = requests.filter(r => r.status !== 'выполнена' && r.status !== 'отменена').length;
        return { ordersPending, ordersProcessing, revenue, avgRating, openRequests };
    }, [orders, reviews, requests]);

    // ==== Builders for Excel ====
    const buildSummary = () => {
        const byStatus = orders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1; return acc;
        }, {});
        const reqByStatus = requests.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1; return acc;
        }, {});
        return {
            centerName: center?.name || '',
            generatedAt: new Date().toLocaleString('ru-RU'),
            totals: {
                products: products.length,
                orders: orders.length,
                revenue: metrics.revenue,
                requests: requests.length,
                reviews: reviews.length,
                avgRating: metrics.avgRating,
            },
            ordersByStatus: byStatus,
            requestsByStatus: reqByStatus,
            lastOrders: orders.slice(0, 20).map(o => ({
                id: o.id,
                date: fmtDate(o.orderDate),
                status: o.status,
                total: fmtMoney(o.totalCost),
                customer: o.User ? `${o.User.firstName} ${o.User.lastName}` : '',
                delivery: o.deliveryMethod,
            })),
            productList: products.map(p => ({
                id: p.id,
                name: p.name,
                price: fmtMoney(p.price),
                stock: p.stock ?? 0,
                brand: p.brand || '',
                category: p.category || '',
            })),
        };
    };

    // ==== PDF ====
    async function downloadPDF() {
        try {
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const pdfFont = await ensureCyrillicFont(doc);

            // Заголовок
            doc.setFont(pdfFont, pdfFont === 'helvetica' ? 'normal' : 'bold');
            doc.setFontSize(20);
            doc.text(`Дашборд — ${center.name}`, 40, 50);

            doc.setFont(pdfFont, 'normal');
            doc.setFontSize(10);
            doc.text(`Сформировано: ${new Date().toLocaleString('ru-RU')}`, 40, 68);

            // Сводка
            autoTable(doc, {
                startY: 90,
                styles: { font: pdfFont, fontSize: 10 },
                headStyles: { font: pdfFont, fillColor: [33, 150, 243], textColor: 255 },
                columns: [{ header: 'Метрика' }, { header: 'Значение' }],
                body: [
                    ['Товары', String(products.length)],
                    ['Заказы (в ожидании)', String(metrics.ordersPending)],
                    ['Заказы (в работе)', String(metrics.ordersProcessing)],
                    ['Выручка (доставлено)', `${metrics.revenue.toLocaleString('ru-RU')} ₽`],
                    ['Средний рейтинг', String(metrics.avgRating)],
                    ['Активные заявки', String(metrics.openRequests)],
                ],
            });

            // Заказы по статусам
            const y1 = (doc.lastAutoTable?.finalY || 90) + 18;
            autoTable(doc, {
                startY: y1,
                styles: { font: pdfFont, fontSize: 10 },
                headStyles: { font: pdfFont, fillColor: [76, 175, 80], textColor: 255 },
                head: [['Статусы заказов', 'Кол-во']],
                body: [
                    ['pending', metrics.ordersPending],
                    ['processing', metrics.ordersProcessing],
                    ['delivered', orders.filter(o => o.status === 'delivered').length],
                    ['cancelled', orders.filter(o => o.status === 'cancelled').length],
                ],
            });

            // Последние заказы
            const y2 = (doc.lastAutoTable?.finalY || y1) + 18;
            autoTable(doc, {
                startY: y2,
                styles: { font: pdfFont, fontSize: 9 },
                headStyles: { font: pdfFont, fillColor: [255, 152, 0], textColor: 255 },
                head: [['ID', 'Дата', 'Статус', 'Сумма', 'Адрес']],
                body: orders.slice(0, 20).map(o => [
                    String(o.id),
                    new Date(o.orderDate).toLocaleString('ru-RU'),
                    o.status,
                    `${Number(o.totalCost || 0).toLocaleString('ru-RU')} ₽`,
                    o.deliveryAddress || '—',
                ]),
            });

            // Товары
            const y3 = (doc.lastAutoTable?.finalY || y2) + 18;
            autoTable(doc, {
                startY: y3,
                styles: { font: pdfFont, fontSize: 9 },
                headStyles: { font: pdfFont, fillColor: [63, 81, 181], textColor: 255 },
                head: [['ID', 'Название', 'Цена', 'Stock', 'Бренд', 'Категория']],
                body: products.slice(0, 20).map(p => [
                    String(p.id),
                    p.name || '—',
                    `${Number(p.price || 0).toLocaleString('ru-RU')} ₽`,
                    String(p.stock ?? 0),
                    p.brand || '—',
                    p.category || '—',
                ]),
            });

            doc.save(`dashboard_${center.id}.pdf`);
        } catch (e) {
            console.error(e);
            toast.error('Не удалось сформировать PDF');
        }
    }

    // ==== Excel ====
    function downloadExcel() {
        try {
            const report = buildSummary();
            const wb = XLSX.utils.book_new();

            const summaryRows = [
                ['Отчёт по центру', report.centerName],
                ['Сформирован', report.generatedAt],
                [],
                ['Показатель', 'Значение'],
                ['Товаров', report.totals.products],
                ['Заказов', report.totals.orders],
                ['Выручка (доставлено)', report.totals.revenue],
                ['Заявок', report.totals.requests],
                ['Отзывы (ср. рейтинг)', `${report.totals.reviews} (${report.totals.avgRating})`],
                [],
                ['Заказы по статусам', 'Кол-во'],
                ...Object.entries(report.ordersByStatus).map(([st, n]) => [st, n]),
                [],
                ['Заявки по статусам', 'Кол-во'],
                ...Object.entries(report.requestsByStatus).map(([st, n]) => [st, n]),
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

            const ordersSheet = XLSX.utils.json_to_sheet(report.lastOrders, {
                header: ['id', 'date', 'status', 'total', 'customer', 'delivery'],
            });
            XLSX.utils.book_append_sheet(wb, ordersSheet, 'Последние заказы');

            const productsSheet = XLSX.utils.json_to_sheet(report.productList, {
                header: ['id', 'name', 'price', 'stock', 'brand', 'category'],
            });
            XLSX.utils.book_append_sheet(wb, productsSheet, 'Товары');

            const filename = `report_${report.centerName.replace(/\s+/g, '_')}.xlsx`;
            XLSX.writeFile(wb, filename);
        } catch (e) {
            console.error(e);
            toast.error('Не удалось сформировать Excel');
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
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="mb-0">Дашборд: {center.name}</h3>
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={downloadPDF}>Скачать PDF</Button>
                    <Button variant="outline-primary" onClick={downloadExcel}>Скачать Excel</Button>
                </div>
            </div>

            <Row className="g-3">
                <Col md={4}>
                    <Card><Card.Body><Card.Title>Товары</Card.Title><h2>{products.length}</h2></Card.Body></Card>
                </Col>
                <Col md={4}>
                    <Card><Card.Body><Card.Title>Заказы (в ожидании)</Card.Title><h2>{metrics.ordersPending}</h2></Card.Body></Card>
                </Col>
                <Col md={4}>
                    <Card><Card.Body><Card.Title>Заказы (в работе)</Card.Title><h2>{metrics.ordersProcessing}</h2></Card.Body></Card>
                </Col>
                <Col md={4}>
                    <Card><Card.Body><Card.Title>Выручка (доставлено)</Card.Title><h2>{fmtMoney(metrics.revenue)}</h2></Card.Body></Card>
                </Col>
                <Col md={4}>
                    <Card><Card.Body><Card.Title>Средний рейтинг</Card.Title><h2>{metrics.avgRating}</h2></Card.Body></Card>
                </Col>
                <Col md={4}>
                    <Card><Card.Body><Card.Title>Активные заявки</Card.Title><h2>{metrics.openRequests}</h2></Card.Body></Card>
                </Col>
            </Row>
        </>
    );
}

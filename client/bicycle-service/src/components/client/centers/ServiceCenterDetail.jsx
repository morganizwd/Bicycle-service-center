// client/bicycle-service/src/components/client/centers/ServiceCenterDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Row,    Col,    Card,    ListGroup,    Spinner,    Button,    Badge,    Modal,    Form,    Table,    Accordion,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';
import { mediaUrl } from '../../../utils/media';

const FALLBACK_SPECIALIZATION = 'All bike services';

export default function ServiceCenterDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [center, setCenter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [extrasLoading, setExtrasLoading] = useState(true);

    const [workshopServices, setWorkshopServices] = useState([]);
    const [centerComponents, setCenterComponents] = useState([]);
    const [priceLists, setPriceLists] = useState([]);

    const [showReview, setShowReview] = useState(false);
    const [eligibleOrders, setEligibleOrders] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [review, setReview] = useState({
        rating: 5,
        shortReview: '',
        reviewText: '',
        orderId: '',
        productId: '',
    });

    useEffect(() => {
        let active = true;
        async function loadCenter() {
            if (!id) return;
            setLoading(true);
            try {
                const { data } = await api.get(`/service-centers/${id}`);
                if (active) setCenter(data);
            } catch (error) {
                console.error(error);
                if (active) toast.error('Failed to load service center details');
            } finally {
                if (active) setLoading(false);
            }
        }

        loadCenter();
        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        let active = true;
        async function loadExtras() {
            if (!id) {
                setWorkshopServices([]);
                setCenterComponents([]);
                setPriceLists([]);
                setExtrasLoading(false);
                return;
            }

            setExtrasLoading(true);
            try {
                const [servicesRes, componentsRes, priceListRes] = await Promise.all([
                    api.get('/workshop-services', {
                        params: { serviceCenterId: id, includeComponents: true },
                    }),
                    api.get('/components', {
                        params: { serviceCenterId: id },
                    }),
                    api.get('/price-lists', {
                        params: { serviceCenterId: id, includeItems: true, activeOnly: true },
                    }),
                ]);

                if (!active) return;
                setWorkshopServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
                setCenterComponents(Array.isArray(componentsRes.data) ? componentsRes.data : []);
                setPriceLists(Array.isArray(priceListRes.data) ? priceListRes.data : []);
            } catch (error) {
                console.error(error);
                if (active) toast.error('Failed to load additional information for this service center');
            } finally {
                if (active) setExtrasLoading(false);
            }
        }

        loadExtras();
        return () => {
            active = false;
        };
    }, [id]);

    const products = center?.Products || center?.products || [];
    const reviews = center?.Reviews || center?.reviews || [];

    async function openReviewModal() {
        if (!user) {
            navigate('/login', { replace: true, state: { from: `/center/${id}` } });
            return;
        }
        setShowReview(true);
        setOrdersLoading(true);
        try {
            let orders = [];
            try {
                const { data } = await api.get('/orders/my', {
                    params: { serviceCenterId: id, status: 'delivered' },
                });
                orders = Array.isArray(data) ? data : [];
            } catch {
                const { data } = await api.get('/orders', {
                    params: { serviceCenterId: id, status: 'delivered', mine: 'true' },
                });
                orders = Array.isArray(data) ? data : [];
            }
            setEligibleOrders(orders);
        } catch (error) {
            console.error(error);
            setEligibleOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    }

    function closeReviewModal() {
        setShowReview(false);
        setReview({ rating: 5, shortReview: '', reviewText: '', orderId: '', productId: '' });
        setOrderItems([]);
    }

    async function onSelectOrder(orderId) {
        setReview((prev) => ({ ...prev, orderId, productId: '' }));
        setOrderItems([]);
        if (!orderId) return;
        setItemsLoading(true);
        try {
            const { data } = await api.get(`/orders/${orderId}`);
            const items = data?.orderItems || data?.OrderItems || [];
            setOrderItems(items);
        } catch (error) {
            console.error(error);
            setOrderItems([]);
        } finally {
            setItemsLoading(false);
        }
    }

    async function submitReview(event) {
        event.preventDefault();
        if (!review.orderId) {
            toast.warn('Select an order before submitting a review');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                rating: Number(review.rating),
                shortReview: review.shortReview.trim(),
                reviewText: review.reviewText.trim(),
                orderId: Number(review.orderId),
                productId: review.productId ? Number(review.productId) : undefined,
            };
            const { data: created } = await api.post('/reviews', payload);
            toast.success('Review submitted successfully');

            setCenter((prev) => {
                const existing = prev?.Reviews || prev?.reviews || [];
                return { ...prev, Reviews: [created, ...existing] };
            });

            closeReviewModal();
        } catch (error) {
            const message = error?.response?.data?.message || 'Unable to submit the review';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    if (!center) {
        return <div className="text-danger">Service center not found.</div>;
    }

    return (
        <>
            <Row className="g-4">
                <Col md={4}>
                    <Card>
                        {center.logo ? (
                            <Card.Img src={mediaUrl(center.logo)} alt={center.name} style={{ objectFit: 'cover', height: 220 }} />
                        ) : (
                            <div className="p-5 text-center text-muted">No logo available</div>
                        )}
                        <Card.Body>
                            <Card.Title>{center.name}</Card.Title>
                            {center.address && <div className="text-muted mb-2">{center.address}</div>}
                            <div className="mb-2"><strong>Contact person:</strong> {center.contactPerson}</div>
                            <div className="mb-2"><strong>Phone:</strong> {center.phone}</div>
                            <div className="mb-2"><strong>Email:</strong> {center.email}</div>
                            <div className="mb-2">
                                <strong>Specialization:</strong> {center.specialization || FALLBACK_SPECIALIZATION}
                            </div>
                            {center.offersDelivery && <Badge bg="success">Delivery available</Badge>}
                            <div className="mt-3 d-flex flex-column gap-2">
                                <Button
                                    variant="primary"
                                    onClick={() => navigate('/requests/new', { state: { serviceCenterId: center.id } })}
                                >
                                    Request service
                                </Button>
                                <Button variant="outline-secondary" onClick={openReviewModal}>
                                    Leave a review
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={8}>
                    <h5 className="mb-2">Products</h5>
                    <Row className="g-3">
                        {products.map((product) => (
                            <Col key={product.id} sm={6} lg={4}>
                                <Card className="h-100">
                                    {product.photo && (
                                        <Card.Img
                                            variant="top"
                                            src={product.photo}
                                            alt={product.name}
                                            style={{ objectFit: 'cover', height: 140 }}
                                        />
                                    )}
                                    <Card.Body>
                                        <Card.Title className="h6">{product.name}</Card.Title>
                                        <div className="text-muted small mb-1">{product.brand} {product.model}</div>
                                        <div className="fw-bold mb-2">{Number(product.price || 0).toFixed(2)} RUB</div>
                                        <Button as={Link} to={`/product/${product.id}`} size="sm">
                                            View details
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                        {products.length === 0 && (
                            <div className="text-muted">No products are currently linked to this service center.</div>
                        )}
                    </Row>

                    <h5 className="mt-4 mb-2">Workshop Services</h5>
                    {extrasLoading ? (
                        <div className="d-flex justify-content-center py-3"><Spinner size="sm" /></div>
                    ) : workshopServices.length === 0 ? (
                        <div className="text-muted">This service center has not published any services yet.</div>
                    ) : (
                        <Row className="g-3">
                            {workshopServices.map((svc) => (
                                <Col key={svc.id} md={6}>
                                    <Card className="h-100">
                                        <Card.Body>
                                            <Card.Title className="h6 d-flex justify-content-between">
                                                <span>{svc.name}</span>
                                                <span className="text-primary">{Number(svc.basePrice || 0).toFixed(2)} RUB</span>
                                            </Card.Title>
                                            {svc.category && (
                                                <div className="text-muted small mb-1">{svc.category}</div>
                                            )}
                                            <div className="mb-2">{svc.description}</div>
                                            {svc.durationMinutes && (
                                                <div className="text-muted small">Duration: {svc.durationMinutes} min</div>
                                            )}
                                            {(svc.components || []).length > 0 && (
                                                <div className="text-muted small mt-2">
                                                    Parts used:
                                                    <br />
                                                    {(svc.components || []).map((comp) => comp.name || comp.Component?.name || (`Component #${comp.id}`)).join(', ')}
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}

                    <h5 className="mt-4 mb-2">Repair Components</h5>
                    {extrasLoading ? (
                        <div className="d-flex justify-content-center py-3"><Spinner size="sm" /></div>
                    ) : centerComponents.length === 0 ? (
                        <div className="text-muted">No spare parts are available at the moment.</div>
                    ) : (
                        <>
                            <Table responsive size="sm" className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Manufacturer</th>
                                        <th>Price</th>
                                        <th>Availability</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {centerComponents.slice(0, 8).map((comp) => (
                                        <tr key={comp.id}>
                                            <td>{comp.name}</td>
                                            <td>{comp.manufacturer || '—'}</td>
                                            <td>{Number(comp.unitPrice || 0).toFixed(2)} RUB</td>
                                            <td>{comp.stock ?? '—'} {comp.unit || 'pcs'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            {centerComponents.length > 8 && (
                                <div className="text-muted small mt-1">
                                    Showing the first 8 items. Visit the service center profile for the full list.
                                </div>
                            )}
                        </>
                    )}

                    <h5 className="mt-4 mb-2">Published Price Lists</h5>
                    {extrasLoading ? (
                        <div className="d-flex justify-content-center py-3"><Spinner size="sm" /></div>
                    ) : priceLists.length === 0 ? (
                        <div className="text-muted">No price lists are available right now.</div>
                    ) : (
                        <Accordion alwaysOpen className="mb-3">
                            {priceLists.map((list) => (
                                <Accordion.Item eventKey={String(list.id)} key={list.id}>
                                    <Accordion.Header>
                                        <span className="me-2">{list.name}</span>
                                        {list.isDefault && <Badge bg="success">Default</Badge>}
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        {list.description && <p className="text-muted">{list.description}</p>}
                                        <Table responsive size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Type</th>
                                                    <th>Price</th>
                                                    <th>Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(list.items || list.Items || []).map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{item.itemName || 'Entry'}</td>
                                                        <td>{item.itemType}</td>
                                                        <td>{Number(item.unitPrice || 0).toFixed(2)} RUB</td>
                                                        <td className="text-muted small">{item.description || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Accordion.Body>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    )}

                    <h5 className="mt-4 mb-2">Customer Reviews</h5>
                    <Card>
                        <ListGroup variant="flush">
                            {reviews.map((r) => (
                                <ListGroup.Item key={r.id}>
                                    <div className="d-flex justify-content-between">
                                        <div className="fw-semibold">Rating: {r.rating} · {r.shortReview}</div>
                                        <div className="text-muted small">Order #{r.orderId}</div>
                                    </div>
                                    <div className="text-muted small">
                                        {r.User ? `${r.User.firstName} ${r.User.lastName}` : 'User'}
                                    </div>
                                    {r.reviewText && <div className="mt-1">{r.reviewText}</div>}
                                </ListGroup.Item>
                            ))}
                            {reviews.length === 0 && (
                                <ListGroup.Item className="text-muted">No reviews yet</ListGroup.Item>
                            )}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>

            <Modal show={showReview} onHide={closeReviewModal} centered>
                <Form onSubmit={submitReview}>
                    <Modal.Header closeButton>
                        <Modal.Title>Leave a review</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Delivered order</Form.Label>
                            {ordersLoading ? (
                                <div className="d-flex align-items-center gap-2">
                                    <Spinner size="sm" /> <span className="text-muted">Loading orders...</span>
                                </div>
                            ) : eligibleOrders.length > 0 ? (
                                <Form.Select value={review.orderId} onChange={(e) => onSelectOrder(e.target.value)}>
                                    <option value="">Select an order...</option>
                                    {eligibleOrders.map((order) => (
                                        <option key={order.id} value={order.id}>
                                            #{order.id} · {new Date(order.orderDate).toLocaleString()} · {Number(order.totalCost || 0).toFixed(2)} RUB
                                        </option>
                                    ))}
                                </Form.Select>
                            ) : (
                                <>
                                    <Form.Control
                                        placeholder="Paste the order ID"
                                        value={review.orderId}
                                        onChange={(e) => onSelectOrder(e.target.value)}
                                    />
                                    <div className="form-text">
                                        If the order list is empty, paste the delivered order ID manually.
                                    </div>
                                </>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Product (optional)</Form.Label>
                            {itemsLoading ? (
                                <div className="d-flex align-items-center gap-2">
                                    <Spinner size="sm" /> <span className="text-muted">Loading items...</span>
                                </div>
                            ) : (
                                <Form.Select
                                    value={review.productId}
                                    onChange={(e) => setReview((prev) => ({ ...prev, productId: e.target.value }))}
                                    disabled={!review.orderId || orderItems.length === 0}
                                >
                                    <option value="">Do not link a product</option>
                                    {orderItems.map((item) => (
                                        <option key={item.id} value={item.productId}>
                                            {item.Product?.name || `Product #${item.productId}`} · {item.quantity}
                                        </option>
                                    ))}
                                </Form.Select>
                            )}
                        </Form.Group>

                        <Row className="g-2">
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Rating</Form.Label>
                                    <Form.Select
                                        value={review.rating}
                                        onChange={(e) => setReview((prev) => ({ ...prev, rating: e.target.value }))}
                                    >
                                        {[5, 4, 3, 2, 1].map((value) => (
                                            <option key={value} value={value}>{value} / 5</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Title</Form.Label>
                                    <Form.Control
                                        value={review.shortReview}
                                        onChange={(e) => setReview((prev) => ({ ...prev, shortReview: e.target.value }))}
                                        placeholder="Short summary"
                                        maxLength={120}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group>
                            <Form.Label>Detailed feedback</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={review.reviewText}
                                onChange={(e) => setReview((prev) => ({ ...prev, reviewText: e.target.value }))}
                                placeholder="Share any details about the service quality"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={closeReviewModal} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit review'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
}











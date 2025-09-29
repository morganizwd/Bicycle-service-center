import React, { useEffect, useState } from 'react';
import {
    Navbar,
    Nav,
    NavDropdown,
    Container,
    Badge,
    Button,
    Spinner,
} from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserToken, authHeader } from '../utils/auth';
import './Header.css';

const API = process.env.REACT_APP_API_URL || '/api';

function initials(u) {
    const a = (u?.firstName || '').trim()[0] || '';
    const b = (u?.lastName || '').trim()[0] || '';
    return (a + b || 'U').toUpperCase();
}

export default function Header() {
    const navigate = useNavigate();
    const {
        user,
        userLoading,
        logoutUser,
        center,
        centerLoading,
        logoutServiceCenter,
    } = useAuth();

    const [cartCount, setCartCount] = useState(0);

    // Грузим размер корзины только для авторизованного пользователя
    useEffect(() => {
        let ignore = false;

        async function loadCartCount() {
            const token = getUserToken();
            if (!token || !user) {
                setCartCount(0);
                return;
            }
            try {
                const res = await fetch(`${API}/carts`, {
                    headers: { ...authHeader(token) },
                });
                if (!res.ok) throw new Error();
                const cart = await res.json();
                if (!ignore) {
                    const count = (cart?.CartItems || []).reduce(
                        (sum, ci) => sum + Number(ci.quantity || 0),
                        0
                    );
                    setCartCount(count);
                }
            } catch {
                if (!ignore) setCartCount(0);
            }
        }

        loadCartCount();
        return () => {
            ignore = true;
        };
    }, [user]);

    const handleLogoutUser = () => {
        logoutUser?.();
        navigate('/');
    };

    const handleLogoutCenter = () => {
        logoutServiceCenter?.();
        navigate('/');
    };

    return (
        <Navbar expand="lg" className="app-navbar sticky-top">
            <Container>
                {/* Brand */}
                <Navbar.Brand as={NavLink} to="/" className="brand">
                    <span className="brand__logo" aria-hidden>🚲</span>
                    <span className="brand__text">Veloservice</span>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="main-nav" className="app-toggle" />
                <Navbar.Collapse id="main-nav">
                    {/* Left */}
                    <Nav className="me-auto nav-left">
                        <Nav.Link as={NavLink} to="/products" end>
                            Товары
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/centers" end>
                            Сервис-центры
                        </Nav.Link>
                    </Nav>

                    {/* Right */}
                    <Nav className="ms-auto align-items-lg-center nav-right">
                        {/* Корзина / если юзер есть */}
                        {user && (
                            <Nav.Link as={NavLink} to="/cart" className="cart-link">
                                <span className="cart-link__icon" aria-hidden>🛒</span>
                                <span>Корзина</span>
                                {cartCount > 0 && (
                                    <Badge bg="primary" pill className="cart-link__badge">
                                        {cartCount}
                                    </Badge>
                                )}
                            </Nav.Link>
                        )}

                        {/* Пользователь */}
                        {userLoading ? (
                            <div className="nav-skel">
                                <Spinner size="sm" />
                            </div>
                        ) : user ? (
                            <NavDropdown
                                align="end"
                                id="user-menu"
                                title={
                                    <span className="user-chip">
                                        <span className="user-chip__avatar">{initials(user)}</span>
                                        <span className="user-chip__name">
                                            {user.firstName || 'Профиль'}
                                        </span>
                                    </span>
                                }
                            >
                                <NavDropdown.Item as={NavLink} to="/profile">
                                    Мой профиль
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/orders">
                                    Мои заказы
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/requests">
                                    Мои заявки
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleLogoutUser}>
                                    Выйти
                                </NavDropdown.Item>
                            </NavDropdown>
                        ) : (
                            <>
                                <Nav.Link as={NavLink} to="/login">
                                    Log in
                                </Nav.Link>
                                <Button as={NavLink} to="/register" size="sm" className="ms-2">
                                    Sign up
                                </Button>
                            </>
                        )}

                        {/* Сервис-центр */}
                        {centerLoading ? (
                            <div className="nav-skel ms-2">
                                <Spinner size="sm" />
                            </div>
                        ) : center ? (
                            <NavDropdown
                                align="end"
                                id="center-menu"
                                className="ms-lg-3"
                                title={
                                    <span className="center-chip">
                                        <span className="center-chip__dot" />
                                        <span className="center-chip__name">
                                            {center.name || 'Service Center'}
                                        </span>
                                    </span>
                                }
                            >
                                <NavDropdown.Item as={NavLink} to="/center/dashboard">Dashboard</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/products">Products</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/services">Workshop Services</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/components">Components</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/pricing">Price Lists</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/orders">Orders</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/requests">Service Requests</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/reviews">Reviews</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/warranty">Repair Warranties</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/profile">Profile Settings</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleLogoutCenter}>
                                    Log out
                                </NavDropdown.Item>
                            </NavDropdown>
                        ) : (
                            <NavDropdown
                                align="end"
                                id="center-auth"
                                className="ms-lg-3"
                                title="Service Center"
                            >
                                <NavDropdown.Item as={NavLink} to="/center/login">
                                    Log in
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/register">
                                    Sign up
                                </NavDropdown.Item>
                            </NavDropdown>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}




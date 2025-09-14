// src/components/Header.jsx
import React, { useEffect, useState } from 'react';
import {
    Navbar,
    Nav,
    NavDropdown,
    Container,
    Badge,
    Button,
} from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserToken, authHeader } from '../utils/auth';

const API = process.env.REACT_APP_API_URL || '/api';

export default function Header() {
    const navigate = useNavigate();
    const {
        user,
        logoutUser,
        center,
        logoutServiceCenter,
        userLoading,
        centerLoading,
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
                // Корзина: GET /api/carts
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
        <Navbar bg="light" expand="lg" className="shadow-sm">
            <Container>
                <Navbar.Brand as={NavLink} to="/">
                    🚲 Veloservice
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="main-nav" />
                <Navbar.Collapse id="main-nav">
                    {/* Левые пункты */}
                    <Nav className="me-auto">
                        <Nav.Link as={NavLink} to="/products">
                            Товары
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/centers">
                            Сервис-центры
                        </Nav.Link>
                    </Nav>

                    {/* Правые пункты */}
                    <Nav className="ms-auto align-items-lg-center">
                        {/* Блок пользователя */}
                        {user ? (
                            <>
                                <Nav.Link as={NavLink} to="/cart">
                                    Корзина{' '}
                                    {cartCount > 0 && (
                                        <Badge bg="primary" pill>
                                            {cartCount}
                                        </Badge>
                                    )}
                                </Nav.Link>
                                <NavDropdown
                                    align="end"
                                    title={`${user.firstName || 'Профиль'}`}
                                    id="user-menu"
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
                            </>
                        ) : (
                            <>
                                <Nav.Link as={NavLink} to="/login">
                                    Войти
                                </Nav.Link>
                                <Button
                                    as={NavLink}
                                    to="/register"
                                    size="sm"
                                    className="ms-2"
                                >
                                    Регистрация
                                </Button>
                            </>
                        )}

                        {/* Блок сервис-центра (может быть одновременно с пользовательским) */}
                        {center ? (
                            <NavDropdown
                                align="end"
                                title={center.name || 'Сервис-центр'}
                                id="center-menu"
                                className="ms-lg-3"
                            >
                                <NavDropdown.Item as={NavLink} to="/center/dashboard">
                                    Дашборд
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/products">
                                    Товары
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/orders">
                                    Заказы
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/requests">
                                    Заявки
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/reviews">
                                    Отзывы
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/warranty">
                                    Гарантия/сервис
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/profile">
                                    Настройки профиля
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleLogoutCenter}>
                                    Выйти как центр
                                </NavDropdown.Item>
                            </NavDropdown>
                        ) : (
                            <NavDropdown
                                align="end"
                                title="Для сервис-центров"
                                id="center-auth"
                                className="ms-lg-3"
                            >
                                <NavDropdown.Item as={NavLink} to="/center/login">
                                    Войти
                                </NavDropdown.Item>
                                <NavDropdown.Item as={NavLink} to="/center/register">
                                    Регистрация
                                </NavDropdown.Item>
                            </NavDropdown>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

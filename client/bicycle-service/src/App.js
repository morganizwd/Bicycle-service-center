import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Container } from 'react-bootstrap';

import Header from './components/Header';

import Home from './components/public/Home/Home';
import Registration from './components/auth/Registration/Registration';
import Login from './components/auth/Login/Login';

import ServiceCenterRegistration from './components/serviceCenter/auth/ServiceCenterRegistration';
import ServiceCenterLogin from './components/serviceCenter/auth/ServiceCenterLogin';

import ProductCatalog from './components/client/products/ProductCatalog';
import ProductDetail from './components/client/products/ProductDetail';

import ServiceCenterCatalog from './components/client/centers/ServiceCenterCatalog';
import ServiceCenterDetail from './components/client/centers/ServiceCenterDetail';

import CartPage from './components/client/cart/CartPage';
import CheckoutPage from './components/client/checkout/CheckoutPage';
import ProfilePage from './components/client/profile/ProfilePage';
import UserOrders from './components/client/orders/UserOrders';
import OrderDetail from './components/client/orders/OrderDetail';
import ServiceRequests from './components/client/requests/ServiceRequests';
import CreateServiceRequest from './components/client/requests/CreateServiceRequest';

import ServiceCenterRoute from './components/ServiceCenterRoute';
import CenterDashboard from './components/center/dashboard/CenterDashboard';
import CenterProductManagement from './components/center/products/CenterProductManagement';
import CenterServiceManagement from './components/center/services/CenterServiceManagement';
import CenterComponentManagement from './components/center/components/CenterComponentManagement';
import CenterPriceListManagement from './components/center/pricing/CenterPriceListManagement';
import CenterOrderManagement from './components/center/orders/CenterOrderManagement';
import CenterServiceRequests from './components/center/requests/CenterServiceRequests';
import CenterReviewsManagement from './components/center/reviews/CenterReviewsManagement';
import CenterWarrantyManagement from './components/center/warranty/CenterWarrantyManagement';
import CenterProfileSettings from './components/center/profile/CenterProfileSettings';

import PrivateRoute from './components/PrivateRoute';

import NotFound from './components/NotFound';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <Header />
      <Container className="py-4">
        <Routes>
          {/* РџСѓР±Р»РёС‡РЅС‹Рµ */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/login" element={<Login />} />

          {/* РђРІС‚РѕСЂРёР·Р°С†РёСЏ СЃРµСЂРІРёСЃРЅРѕРіРѕ С†РµРЅС‚СЂР° */}
          <Route path="/center/register" element={<ServiceCenterRegistration />} />
          <Route path="/center/login" element={<ServiceCenterLogin />} />

          {/* РљР°С‚Р°Р»РѕРі С‚РѕРІР°СЂРѕРІ Рё СЃРµСЂРІРёСЃ-С†РµРЅС‚СЂРѕРІ */}
          <Route path="/products" element={<ProductCatalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/centers" element={<ServiceCenterCatalog />} />
          <Route path="/center/:id" element={<ServiceCenterDetail />} />

          {/* РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ (protected) */}
          <Route
            path="/cart"
            element={
              <PrivateRoute>
                <CartPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <PrivateRoute>
                <CheckoutPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <UserOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <PrivateRoute>
                <OrderDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <PrivateRoute>
                <ServiceRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/requests/new"
            element={
              <PrivateRoute>
                <CreateServiceRequest />
              </PrivateRoute>
            }
          />

          {/* РљР°Р±РёРЅРµС‚ СЃРµСЂРІРёСЃРЅРѕРіРѕ С†РµРЅС‚СЂР° (protected) */}
          <Route
            path="/center/dashboard"
            element={
              <ServiceCenterRoute>
                <CenterDashboard />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/products"
            element={
              <ServiceCenterRoute>
                <CenterProductManagement />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/services"
            element={
              <ServiceCenterRoute>
                <CenterServiceManagement />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/components"
            element={
              <ServiceCenterRoute>
                <CenterComponentManagement />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/pricing"
            element={
              <ServiceCenterRoute>
                <CenterPriceListManagement />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/orders"
            element={
              <ServiceCenterRoute>
                <CenterOrderManagement />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/requests"
            element={
              <ServiceCenterRoute>
                <CenterServiceRequests />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/reviews"
            element={
              <ServiceCenterRoute>
                <CenterReviewsManagement />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/warranty"
            element={
              <ServiceCenterRoute>
                <CenterWarrantyManagement />
              </ServiceCenterRoute>
            }
          />
          <Route
            path="/center/profile"
            element={
              <ServiceCenterRoute>
                <CenterProfileSettings />
              </ServiceCenterRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
      <ToastContainer />
    </>
  );
}

export default App;





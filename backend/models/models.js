const sequelize = require('../db');
const { DataTypes } = require('sequelize');

/* 1. Пользователь */
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    birthDate: { type: DataTypes.DATE, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    photo: { type: DataTypes.STRING, allowNull: true },
}, { timestamps: true });

/* 2. Сервисный центр (мастерская по ремонту велосипедов) */
const ServiceCenter = sequelize.define('ServiceCenter', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contactPerson: { type: DataTypes.STRING, allowNull: false },
    registrationNumber: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    logo: { type: DataTypes.STRING, allowNull: true },
    establishedYear: { type: DataTypes.INTEGER, allowNull: true },
    specialization: {
        type: DataTypes.ENUM('горные велосипеды', 'шоссейные велосипеды', 'городские велосипеды', 'электровелосипеды'),
        allowNull: false
    },
    offersDelivery: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { timestamps: true });

/* 3. Товар (велозапчасти, велосипеды, аксессуары) */
const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false }, // рама, колесо, тормоза и т.д.
    brand: { type: DataTypes.STRING, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: true },
    condition: {
        type: DataTypes.ENUM('new', 'used'),
        allowNull: false,
        defaultValue: 'new'
    },
    warranty: { type: DataTypes.STRING, allowNull: true },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    photo: { type: DataTypes.STRING, allowNull: true },
    serviceCenterId: { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: true });

/* 4. Корзина */
const Cart = sequelize.define('Cart', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: true });

/* 5. Элемент корзины */
const CartItem = sequelize.define('CartItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cartId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: true });

/* 6. Заказ */
const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    deliveryAddress: { type: DataTypes.STRING, allowNull: false },
    totalCost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        allowNull: false
    },
    paymentMethod: { type: DataTypes.STRING, allowNull: false },
    trackingNumber: { type: DataTypes.STRING, allowNull: true },
    orderDate: { type: DataTypes.DATE, allowNull: false },
    deliveryMethod: {
        type: DataTypes.ENUM('самовывоз', 'курьер', 'доставка сервисом'),
        allowNull: false
    },
    serviceCenterId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

/* 7. Элемент заказа */
const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    priceAtPurchase: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { timestamps: true });

/* 8. Отзыв */
const Review = sequelize.define('Review', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    shortReview: { type: DataTypes.STRING, allowNull: false },
    reviewText: { type: DataTypes.TEXT, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    serviceCenterId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: true },
}, { timestamps: true });

/* 9. Заявка на сервисное обслуживание велосипеда */
const ServiceRequest = sequelize.define('ServiceRequest', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    serviceCenterId: { type: DataTypes.INTEGER, allowNull: false },
    requestDate: { type: DataTypes.DATE, allowNull: false },
    status: {
        type: DataTypes.ENUM('запрошена', 'в работе', 'выполнена', 'отменена'),
        allowNull: false
    },
    bikeModel: { type: DataTypes.STRING, allowNull: true },
    problemDescription: { type: DataTypes.TEXT, allowNull: false },
    technicianNotes: { type: DataTypes.TEXT, allowNull: true },
}, { timestamps: true });

/* 10. Гарантия на товары/работы */
const WarrantyService = sequelize.define('WarrantyService', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderItemId: { type: DataTypes.INTEGER, allowNull: false },
    warrantyPeriod: { type: DataTypes.STRING, allowNull: false },
    serviceConditions: { type: DataTypes.TEXT, allowNull: false },
    serviceCenterContacts: { type: DataTypes.STRING, allowNull: false },
    validUntil: { type: DataTypes.DATE, allowNull: false },
}, { timestamps: true });

/* ================= Associations ================= */

/* User ↔ Cart */
User.hasOne(Cart, { foreignKey: 'userId' });
Cart.belongsTo(User, { foreignKey: 'userId' });

/* User ↔ Orders */
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

/* ServiceCenter ↔ Orders */
ServiceCenter.hasMany(Order, { foreignKey: 'serviceCenterId' });
Order.belongsTo(ServiceCenter, { foreignKey: 'serviceCenterId' });

/* ServiceCenter ↔ Products */
ServiceCenter.hasMany(Product, { foreignKey: 'serviceCenterId' });
Product.belongsTo(ServiceCenter, { foreignKey: 'serviceCenterId' });

/* ServiceCenter ↔ Reviews */
ServiceCenter.hasMany(Review, { foreignKey: 'serviceCenterId' });
Review.belongsTo(ServiceCenter, { foreignKey: 'serviceCenterId' });

/* Order ↔ Review */
Order.hasOne(Review, { foreignKey: 'orderId' });
Review.belongsTo(Order, { foreignKey: 'orderId' });

/* Cart ↔ Product через CartItem */
Cart.belongsToMany(Product, { through: CartItem, foreignKey: 'cartId', otherKey: 'productId' });
Product.belongsToMany(Cart, { through: CartItem, foreignKey: 'productId', otherKey: 'cartId' });

/* Order ↔ Product через OrderItem */
Order.belongsToMany(Product, { through: OrderItem, foreignKey: 'orderId', otherKey: 'productId' });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: 'productId', otherKey: 'orderId' });

/* Order ↔ OrderItem */
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

/* Cart ↔ CartItem */
Cart.hasMany(CartItem, { foreignKey: 'cartId' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
Product.hasMany(CartItem, { foreignKey: 'productId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });

/* User ↔ Review */
User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });

/* ServiceRequest */
User.hasMany(ServiceRequest, { foreignKey: 'userId' });
ServiceRequest.belongsTo(User, { foreignKey: 'userId' });
ServiceCenter.hasMany(ServiceRequest, { foreignKey: 'serviceCenterId' });
ServiceRequest.belongsTo(ServiceCenter, { foreignKey: 'serviceCenterId' });

/* WarrantyService ↔ OrderItem */
OrderItem.hasOne(WarrantyService, { foreignKey: 'orderItemId' });
WarrantyService.belongsTo(OrderItem, { foreignKey: 'orderItemId' });

/* Product ↔ Review */
Product.hasMany(Review, { foreignKey: 'productId' });
Review.belongsTo(Product, { foreignKey: 'productId' });

module.exports = {
    User,
    ServiceCenter,
    Product,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Review,
    ServiceRequest,
    WarrantyService,
    sequelize,
};
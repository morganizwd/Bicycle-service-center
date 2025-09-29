const { PriceList, PriceListItem, WorkshopService, Component, Product, sequelize } = require('../models/models');
const { Op } = require('sequelize');

const LIST_TYPES = ['services', 'components', 'products', 'combined'];
const ITEM_TYPES = ['service', 'component', 'product', 'custom'];

function parseBoolean(value, fallback = undefined) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(lowered)) return true;
        if (['false', '0', 'no', 'n'].includes(lowered)) return false;
    }
    return fallback;
}

function parseDate(value, fieldName) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${fieldName} ����� �������� ������ ����`);
    }
    return parsed;
}

async function prepareItems(serviceCenterId, items, transaction) {
    if (items === undefined || items === null) return [];
    if (typeof items === 'string') {
        try {
            items = JSON.parse(items);
        } catch (error) {
            throw new Error('items ������ ���� �������� JSON ��������');
        }
    }
    if (!Array.isArray(items)) {
        throw new Error('items ������ ���� ��������');
    }
    if (!items.length) return [];

    const normalized = items.map((item, index) => {
        const itemType = String(item.itemType || '').trim().toLowerCase();
        if (!ITEM_TYPES.includes(itemType)) {
            throw new Error(`items[${index}].itemType ����� ������������ ��������`);
        }
        const referenceId = item.referenceId === undefined || item.referenceId === null
            ? null
            : Number(item.referenceId);
        if (['service', 'component', 'product'].includes(itemType) && !Number.isInteger(referenceId)) {
            throw new Error(`items[${index}].referenceId ���������� ��� ���� ${itemType}`);
        }
        if (itemType === 'custom' && (!item.itemName || !item.unitPrice)) {
            throw new Error(`items[${index}] ��� ���� custom ������� itemName � unitPrice`);
        }

        const unit = item.unit ? String(item.unit).trim() : 'pcs';
        const duration = item.durationMinutes === undefined || item.durationMinutes === null || item.durationMinutes === ''
            ? null
            : Number(item.durationMinutes);
        if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) {
            throw new Error(`items[${index}].durationMinutes ������ ���� ������������� ������`);
        }
        const warrantyMonths = item.warrantyMonths === undefined || item.warrantyMonths === null || item.warrantyMonths === ''
            ? null
            : Number(item.warrantyMonths);
        if (warrantyMonths !== null && (!Number.isFinite(warrantyMonths) || warrantyMonths < 0)) {
            throw new Error(`items[${index}].warrantyMonths ������ ���� ��������������� ������`);
        }

        let unitPrice = item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === ''
            ? null
            : Number(item.unitPrice);
        if (unitPrice !== null && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
            throw new Error(`items[${index}].unitPrice ������ ���� ��������������� ������`);
        }

        const isActive = parseBoolean(item.isActive, true);

        return {
            itemType,
            referenceId,
            itemName: item.itemName ? String(item.itemName).trim() : null,
            description: item.description ? String(item.description).trim() : null,
            unit,
            unitPrice,
            durationMinutes: duration,
            warrantyMonths,
            isActive,
        };
    });

    const serviceIds = Array.from(new Set(normalized.filter((item) => item.itemType === 'service').map((item) => item.referenceId)));
    const componentIds = Array.from(new Set(normalized.filter((item) => item.itemType === 'component').map((item) => item.referenceId)));
    const productIds = Array.from(new Set(normalized.filter((item) => item.itemType === 'product').map((item) => item.referenceId)));

    const [services, components, products] = await Promise.all([
        serviceIds.length
            ? WorkshopService.findAll({ where: { id: serviceIds, serviceCenterId }, transaction })
            : Promise.resolve([]),
        componentIds.length
            ? Component.findAll({ where: { id: componentIds, serviceCenterId }, transaction })
            : Promise.resolve([]),
        productIds.length
            ? Product.findAll({ where: { id: productIds, serviceCenterId }, transaction })
            : Promise.resolve([]),
    ]);

    if (services.length !== serviceIds.length) {
        throw new Error('��������� ������ �� ������� ��� �� ����������� ���������� ������');
    }
    if (components.length !== componentIds.length) {
        throw new Error('��������� ������������� �� ������� ��� �� ����������� ���������� ������');
    }
    if (products.length !== productIds.length) {
        throw new Error('��������� ������ �� ������� ��� �� ����������� ���������� ������');
    }

    const serviceMap = new Map(services.map((item) => [item.id, item]));
    const componentMap = new Map(components.map((item) => [item.id, item]));
    const productMap = new Map(products.map((item) => [item.id, item]));

    return normalized.map((item) => {
        if (item.itemType === 'service') {
            const service = serviceMap.get(item.referenceId);
            if (!item.itemName) item.itemName = service.name;
            if (item.unitPrice === null) item.unitPrice = Number(service.basePrice);
            if (item.durationMinutes === null) item.durationMinutes = service.durationMinutes || null;
        }
        if (item.itemType === 'component') {
            const component = componentMap.get(item.referenceId);
            if (!item.itemName) item.itemName = component.name;
            if (item.unitPrice === null) item.unitPrice = Number(component.unitPrice);
            if (!item.description) item.description = component.description;
        }
        if (item.itemType === 'product') {
            const product = productMap.get(item.referenceId);
            if (!item.itemName) item.itemName = product.name;
            if (item.unitPrice === null) item.unitPrice = Number(product.price);
            if (!item.description) item.description = product.description;
        }

        if (item.itemType === 'custom' && item.itemName) {
            item.referenceId = null;
        }

        if (item.unitPrice === null) {
            throw new Error(`�� ������� ���������� ���� ��� ������ ${item.itemName || item.itemType}`);
        }

        return item;
    });
}

class PriceListController {
    async create(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: '��������� ����������� ���������� ������' });
            }

            const {
                name,
                description,
                listType = 'combined',
                effectiveFrom,
                effectiveTo,
                isDefault,
                items,
            } = req.body;

            if (!name) {
                return res.status(400).json({ message: '���� name �������� ������������' });
            }
            if (!LIST_TYPES.includes(listType)) {
                return res.status(400).json({ message: '������������ ��� �����-�����' });
            }

            const fromDate = parseDate(effectiveFrom, 'effectiveFrom');
            const toDate = parseDate(effectiveTo, 'effectiveTo');
            if (fromDate && toDate && fromDate > toDate) {
                return res.status(400).json({ message: 'effectiveFrom �� ����� ���� ����� effectiveTo' });
            }

            let preparedItems = [];
            try {
                preparedItems = await prepareItems(serviceCenterId, items, null);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }

            const priceList = await sequelize.transaction(async (transaction) => {
                const created = await PriceList.create({
                    serviceCenterId,
                    name: String(name).trim(),
                    description: description ? String(description).trim() : null,
                    listType,
                    effectiveFrom: fromDate,
                    effectiveTo: toDate,
                    isDefault: parseBoolean(isDefault, false),
                }, { transaction });

                if (preparedItems.length) {
                    const itemsWithList = preparedItems.map((item) => ({
                        ...item,
                        priceListId: created.id,
                    }));
                    await PriceListItem.bulkCreate(itemsWithList, { transaction });
                }

                if (created.isDefault) {
                    await PriceList.update(
                        { isDefault: false },
                        {
                            where: {
                                serviceCenterId,
                                id: { [Op.ne]: created.id },
                            },
                            transaction,
                        },
                    );
                }

                return created;
            });

            const withItems = await PriceList.findByPk(priceList.id, {
                include: [{ model: PriceListItem, as: 'items', separate: true, order: [['itemName', 'ASC']] }],
            });

            return res.status(201).json(withItems);
        } catch (error) {
            console.error('������ ��� �������� �����-�����:', error);
            return res.status(500).json({ message: error.message || '���������� ������ �������' });
        }
    }

    async findAll(req, res) {
        try {
            const {
                serviceCenterId,
                listType,
                isDefault,
                activeOnly,
                includeItems = 'true',
            } = req.query;

            const where = {};
            if (serviceCenterId !== undefined) {
                const scId = Number(serviceCenterId);
                if (!Number.isInteger(scId)) {
                    return res.status(400).json({ message: 'serviceCenterId ������ ���� ����� ������' });
                }
                where.serviceCenterId = scId;
            }
            if (listType) {
                if (!LIST_TYPES.includes(listType)) {
                    return res.status(400).json({ message: '������������ ��� �����-�����' });
                }
                where.listType = listType;
            }
            const defaultFlag = parseBoolean(isDefault, undefined);
            if (defaultFlag !== undefined) {
                where.isDefault = defaultFlag;
            }
            if (parseBoolean(activeOnly, false)) {
                const now = new Date();
                where[Op.and] = [
                    {
                        [Op.or]: [
                            { effectiveFrom: null },
                            { effectiveFrom: { [Op.lte]: now } },
                        ],
                    },
                    {
                        [Op.or]: [
                            { effectiveTo: null },
                            { effectiveTo: { [Op.gte]: now } },
                        ],
                    },
                ];
            }

            const include = parseBoolean(includeItems, true)
                ? [{ model: PriceListItem, as: 'items', separate: true, order: [['itemName', 'ASC']] }]
                : [];

            const priceLists = await PriceList.findAll({
                where,
                include,
                order: [['name', 'ASC']],
            });

            return res.json(priceLists);
        } catch (error) {
            console.error('������ ��� ��������� �����-������:', error);
            return res.status(500).json({ message: '���������� ������ �������' });
        }
    }

    async findOne(req, res) {
        try {
            const { id } = req.params;
            const includeItems = parseBoolean(req.query.includeItems, true);
            const priceList = await PriceList.findByPk(id, {
                include: includeItems ? [{ model: PriceListItem, as: 'items', separate: true, order: [['itemName', 'ASC']] }] : [],
            });
            if (!priceList) {
                return res.status(404).json({ message: '�����-���� �� ������' });
            }
            return res.json(priceList);
        } catch (error) {
            console.error('������ ��� ��������� �����-�����:', error);
            return res.status(500).json({ message: '���������� ������ �������' });
        }
    }

    async update(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: '��������� ����������� ���������� ������' });
            }

            const { id } = req.params;
            const priceList = await PriceList.findByPk(id);
            if (!priceList) {
                return res.status(404).json({ message: '�����-���� �� ������' });
            }
            if (priceList.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: '��� ������� � ��������� ����� �����-�����' });
            }

            const {
                name,
                description,
                listType,
                effectiveFrom,
                effectiveTo,
                isDefault,
                items,
            } = req.body;

            const payload = {};
            if (name !== undefined) payload.name = String(name).trim();
            if (description !== undefined) payload.description = description ? String(description).trim() : null;
            if (listType !== undefined) {
                if (!LIST_TYPES.includes(listType)) {
                    return res.status(400).json({ message: '������������ ��� �����-�����' });
                }
                payload.listType = listType;
            }
            if (effectiveFrom !== undefined) payload.effectiveFrom = parseDate(effectiveFrom, 'effectiveFrom');
            if (effectiveTo !== undefined) payload.effectiveTo = parseDate(effectiveTo, 'effectiveTo');
            if (payload.effectiveFrom && payload.effectiveTo && payload.effectiveFrom > payload.effectiveTo) {
                return res.status(400).json({ message: 'effectiveFrom �� ����� ���� ����� effectiveTo' });
            }
            if (isDefault !== undefined) payload.isDefault = parseBoolean(isDefault, priceList.isDefault);

            let preparedItems = null;
            if (items !== undefined) {
                try {
                    preparedItems = await prepareItems(serviceCenterId, items, null);
                } catch (error) {
                    return res.status(400).json({ message: error.message });
                }
            }

            const updatedList = await sequelize.transaction(async (transaction) => {
                await priceList.update(payload, { transaction });

                if (preparedItems !== null) {
                    await PriceListItem.destroy({ where: { priceListId: priceList.id }, transaction });
                    if (preparedItems.length) {
                        const itemsWithList = preparedItems.map((item) => ({
                            ...item,
                            priceListId: priceList.id,
                        }));
                        await PriceListItem.bulkCreate(itemsWithList, { transaction });
                    }
                }

                if (priceList.isDefault) {
                    await PriceList.update(
                        { isDefault: false },
                        {
                            where: {
                                serviceCenterId,
                                id: { [Op.ne]: priceList.id },
                            },
                            transaction,
                        },
                    );
                }

                return priceList;
            });

            const includeItemsFlag = parseBoolean(req.query.includeItems, true);
            const withItems = await PriceList.findByPk(updatedList.id, {
                include: includeItemsFlag ? [{ model: PriceListItem, as: 'items', separate: true, order: [['itemName', 'ASC']] }] : [],
            });

            return res.json(withItems);
        } catch (error) {
            console.error('������ ��� ���������� �����-�����:', error);
            return res.status(500).json({ message: error.message || '���������� ������ �������' });
        }
    }

    async delete(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: '��������� ����������� ���������� ������' });
            }

            const { id } = req.params;
            const priceList = await PriceList.findByPk(id);
            if (!priceList) {
                return res.status(404).json({ message: '�����-���� �� ������' });
            }
            if (priceList.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: '��� ������� � �������� ����� �����-�����' });
            }

            await sequelize.transaction(async (transaction) => {
                await PriceListItem.destroy({ where: { priceListId: priceList.id }, transaction });
                await priceList.destroy({ transaction });
            });

            return res.json({ message: '�����-���� ������' });
        } catch (error) {
            console.error('������ ��� �������� �����-�����:', error);
            return res.status(500).json({ message: '���������� ������ �������' });
        }
    }
}

module.exports = new PriceListController();

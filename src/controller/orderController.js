import model from '../model/orderModel.js';
const { orderModel, orderValidation, getOrderValidation } = model;
import response from '../utils/response.js';
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;
import userModelfile from '../model/userModel.js';
const { userModel } = userModelfile;
import { handleBackgroundTasks } from '../utils/commonfunction.js';
import orderNotificationMdl from '../model/orderNotificationModel.js'
const { orderNotificationModel, orderNotificationValidation } = orderNotificationMdl;

export async function placeOrder(req, res) {
    const {
        fname, lname, cartItems, couponId, paymentMethod,
        streetAddress, country, state, pincode,
        shippingAddress, shippingCountry, shippingState, shippingPincode,
        shippingCharge, mobile, email, orderNote, city, shippingCity
    } = req.body;

    const { error } = orderValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error?.details?.[0]?.message);
    };
    try {
        const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

        const lastOrder = await orderModel.findOne({}, { orderId: 1 }).sort({ orderId: -1 }).lean();
        const orderId = lastOrder ? (parseInt(lastOrder.orderId) + 2).toString() : Math.floor(100000 + Math.random() * 900000).toString();

        const order = await orderModel.create({
            orderId,
            userId: req.user.id,
            fname,
            lname,
            items: cartItems,
            couponId,
            paymentMethod,
            streetAddress,
            country,
            state,
            city,
            pincode,
            shippingAddress,
            shippingCountry,
            shippingState,
            shippingPincode,
            shippingCharge,
            shippingCity,
            mobile,
            email,
            totalAmount,
            orderNote: orderNote || ""
        });
        response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ORDER_PLACED, order);

        setImmediate(() => handleBackgroundTasks(order, req.user, cartItems));
    } catch (err) {
        console.error("Order Error:", err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, { error: err });
    };
};

export async function getAllUserOrders(req, res) {
    try {
        let orders = await orderModel.find({ userId: req.user.id }).populate("items.productId").sort({ createdAt: -1 });
        if (!orders || orders?.length === 0) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_ORDERS_FOUND, {});
        };
        // const updatedOrders = await Promise.all(orders.map(async (order) => {
        //     order.items.map(item => {
        //         if (item.productId && Array.isArray(item.productId.image)) {
        //             item.productId.image = item.productId.image.map(img =>
        //                 img.startsWith("/productImages/") ? img : `/productImages/${img}`
        //             );
        //         }
        //         return item;
        //     });
        //     return order
        // }));
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ORDERS_RETRIEVED, orders);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getOrderById(req, res) {
    const orderId = req.params.id;
    const { error } = getOrderValidation.validate(req.params);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const order = await orderModel.findOne({ orderId: orderId }).populate({
            path: 'items.productId',
            populate: {
                path: 'subCategoryId'
            },
        });
        if (!order) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_ORDERS_FOUND, {});
        };
        const user = await userModel.findById({ _id: order.userId }).select('-password');
        // const updatedItems = order.items.map(item => {
        //     if (item.productId && Array.isArray(item.productId.image)) {
        //         item.productId.image = item.productId.image.map(img =>
        //             img.startsWith("/productImages/")
        //                 ? img
        //                 : `/productImages/${img}`
        //         );
        //     };
        //     return item;
        // });
        const updatedOrder = {
            ...order._doc,
            user: user,
            // items: updatedItems
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ORDERS_RETRIEVED, updatedOrder);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

// admin
export async function getAllOrders(req, res) {
    try {
        const { status, search, startDate, endDate, page = 1, limit = 10, userId } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (userId) {
            filter.userId = userId;
        };

        if (search) {
            const orConditions = [];
            const searchTerms = search.trim().split(/\s+/);

            searchTerms.forEach(term => {
                orConditions.push(
                    { fname: { $regex: term, $options: 'i' } },
                    { lname: { $regex: term, $options: 'i' } }
                );
            });

            if (!isNaN(search.trim())) {
                orConditions.push({ orderId: Number(search.trim()) });
            };

            if (orConditions.length > 0) {
                filter.$or = orConditions;
            };
        };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const totalOrders = await orderModel.countDocuments(filter);

        const orders = await orderModel.find(filter).populate({ path: 'items.productId', populate: { path: 'subCategoryId' }, }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();

        if (!orders || orders.length === 0) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_ORDERS_FOUND, {});
        };

        // const updatedOrders = orders.map(order => {
        //     const updatedItems = order.items.map(item => {
        //         if (item.productId && Array.isArray(item.productId.image)) {
        //             item.productId.image = item.productId.image.map(img =>
        //                 img.startsWith('/productImages/') ? img : `/productImages/${img}`
        //             );
        //         };
        //         return item;
        //     });
        //     return {
        //         ...order,
        //         items: updatedItems,
        //     };
        // });
        const totalPages = Math.ceil(totalOrders / parseInt(limit));
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ORDERS_RETRIEVED, {
            orders: orders,
            page: parseInt(page),
            limit: parseInt(limit),
            totalRecords: totalOrders,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error(error);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateOrderStatusByAdmin(req, res) {
    try {
        return response.success(res, req?.languageCode, 200, 'Order status updated successfully', updatedOrder);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function assignOrderCourierPatner(req, res) {
    try {
        return response.success(res, req?.languageCode, 200, 'Courier partner assigned and order status updated successfully', updatedOrder);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function downloadOrdersCSV(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};
        if (startDate || endDate) {
            const createdAtFilter = {};
            if (startDate && !isNaN(Date.parse(startDate))) {
                createdAtFilter.$gte = new Date(startDate);
            };
            if (endDate && !isNaN(Date.parse(endDate))) {
                createdAtFilter.$lte = new Date(endDate);
            };
            if (Object.keys(createdAtFilter).length > 0) {
                filter.createdAt = createdAtFilter;
            };
        };

        const orders = await orderModel.find(filter).populate({ path: 'items.productId', populate: { path: 'subCategoryId', select: 'name' }, }).lean();

        if (!orders.length) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_ORDERS_FOUND, {});
        };
        const pad = (str, length) => {
            str = str == null ? '' : str.toString();
            return str.length > length ? str.slice(0, length - 3) + '...' : str.padEnd(length, ' ');
        };

        let table =
            pad('Order ID', 10) +
            pad('FName', 12) +
            pad('LName', 12) +
            pad('Email', 25) +
            pad('Status', 12) +
            pad('Total Amt', 12) +
            pad('Product Name', 20) +
            pad('SKU', 15) +
            pad('SubCategory', 15) +
            pad('Qty', 5) +
            pad('Shipping Address', 25) +
            pad('City', 15) +
            pad('State', 15) +
            pad('Pincode', 10) +
            pad('Created At', 20) +
            '\n';

        table += '-'.repeat(203) + '\n';

        orders.forEach(order => {
            order.items.forEach(item => {
                table +=
                    pad(order.orderId || '', 10) +
                    pad(order.fname || '', 12) +
                    pad(order.lname || '', 12) +
                    pad(order.email || '', 25) +
                    pad(order.status || '', 12) +
                    pad(order.totalAmount || '', 12) +
                    pad(item.productId?.name || '', 20) +
                    pad(item.productId?.sku || '', 15) +
                    pad(item.productId?.subCategoryId?.name || '', 15) +
                    pad(item.quantity || '', 5) +
                    pad(Array.isArray(order.streetAddress) ? order.streetAddress.join(', ') : (order.streetAddress || ''), 25) +
                    pad(order.city || '', 15) +
                    pad(order.state || '', 15) +
                    pad(order.pincode || '', 10) +
                    pad(order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 19).replace('T', ' ') : '', 20) +
                    '\n';
            });
        });
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="orders_${Date.now()}.txt"`);
        return res.status(200).send(table);
    } catch (error) {
        console.error('CSV Download Error:', error);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getOrderNotifications(req, res) {
    try {
        const notificationsList = await orderNotificationModel.find({ isMark: false }).populate({
            path: "orderId",
            populate: {
                path: "items.productId",
                model: "products",
            },
        }).sort({ createdAt: -1 });

        const flatData = notificationsList.flatMap(notification =>
            (notification.orderId?.items || [])
                .filter(item => item.productId)
                .map(item => ({
                    _id: notification._id,
                    orderId: notification?.orderId?.orderId,
                    productId: item?.productId?._id,
                    image: item?.productId?.image[0],
                    title: item?.productId?.title,
                    sku: item?.productId?.sku,
                    createdAt: notification.createdAt
                })),
        );
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ORDERS_RETRIEVED, flatData);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};


export async function deleteOrderNotification(req, res) {
    try {
        const { notificationIds } = req.body;
        const { error } = orderNotificationValidation.validate(req.body);
        if (error) {
            return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
        };
        const deleted = await orderNotificationModel.deleteMany({ _id: { $in: notificationIds } });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.NOTIFICATION_DELETE, deleted);
    } catch (error) {
        console.error("Delete Notification Error:", error);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

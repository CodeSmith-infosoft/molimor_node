import cartMdl from '../model/cartModel.js';
const { cartModel } = cartMdl
import generateInvoicePDF from '../utils/generateInvoicePDF.js'
import productModelfile from '../model/productModel.js';
const { productModel } = productModelfile;
import userModelfile from '../model/userModel.js';
const { userModel } = userModelfile;
import sendMail from '../../mailer/index.js';
import { sendNotification } from '../utils/sendNotification.js';
// import { Types } from 'mongoose';
import orderNotificationMdl from '../model/orderNotificationModel.js'
const { orderNotificationModel } = orderNotificationMdl;

export async function handleBackgroundTasks(order, user, cartItems) {
    try {
        const { orderId, paymentMethod, fname, lname, streetAddress, state, country, pincode, mobile, email, totalAmount } = order;


        const [admin, orderedProducts] = await Promise.all([
            userModel.find({ role: 'admin' }),
            productModel.find({ _id: { $in: cartItems.map(i => i.productId) } }).lean()
        ]);
        const productMap = new Map(orderedProducts.map(p => [p._id.toString(), p]));
        const fcmTokens = admin.map((a) => a.fcm).filter(Boolean)
        let subTotal = 0, csgst = 0;
        await orderNotificationModel.create({
            orderId: order._id,
            isMark: false
        });

        for (let item of cartItems) {
            const product = productMap.get(item.productId.toString());
            if (!product) continue;

            const gstRate = parseInt(product.gst.replace('%', '')) || 0;
            const quantity = parseInt(item.quantity);
            const price = parseFloat(item.price);
            const gstCharge = (price * gstRate / 100) * quantity;
            const itemTotal = price * quantity + gstCharge;

            Object.assign(item, {
                name: product.title,
                hsn: product.hsnCode,
                gst: gstRate,
                quantity,
                price,
                sku: product.sku,
                taxableValue: itemTotal
            });

            subTotal += itemTotal;
            csgst += gstCharge;
        };

        const invoiceDate = new Date().toISOString().split("T")[0];
        const fullName = `${fname} ${lname}`;

        const pdfBuffer = await generateInvoicePDF({
            base_URL: process.env.BASE_URL,
            payType: paymentMethod,
            custName: fullName,
            addressLine: streetAddress,
            state,
            country,
            zip: pincode,
            phone: mobile,
            email,
            invoiceCount: 1,
            orderId,
            invoiceDate,
            csgst,
            subTotal,
            name: user.fname,
            products: cartItems
        });
        await Promise.all([
            sendMail(
                "billingInvoice",
                "Molimor Purchase Invoice",
                user.email,
                {
                    custName: fullName,
                    addressLine: streetAddress,
                    state,
                    country,
                    zip: pincode,
                    phone: mobile,
                    email,
                    invoiceCount: 1,
                    orderId,
                    invoiceDate,
                    csgst,
                    subTotal,
                    name: user.fname,
                    products: cartItems
                },
                process.env.FROM_MAIL,
                "attachment",
                pdfBuffer,
                `invoice-${orderId}.pdf`
            ),

            sendNotification(
                fcmTokens,
                {
                    title: '🛒 New Order Placed!',
                    body: `Order #${orderId} by ${fullName} for ₹${totalAmount}`
                },
            ),
            cartModel.updateOne(
                { userId: user.id },
                { $pull: { items: { productId: { $in: cartItems.map(i => i.productId) } } } }
            ),
        ]);
    } catch (err) {
        console.error("Background tasks failed:", err);
    };
};
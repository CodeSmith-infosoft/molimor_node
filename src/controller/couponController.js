import model from '../model/couponModel.js';
const { couponModel, couponValidation, couponIdValidation } = model
import response from '../utils/response.js';
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;
import orderMdl from '../model/orderModel.js';
const { orderModel } = orderMdl;

export async function addCoupon(req, res) {
    const { code, description, discountType, discountValue, minPurchase, validFrom, validTo, } = req.body;
    const { error } = couponValidation.validate(req.body);

    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const existingCoupon = await couponModel.findOne({ code });
        if (existingCoupon) {
            return response.error(res, req.languageCode, resStatusCode.CONFLICT, resMessage.COUPON_CODE_EXISTS, {});
        };
        const newCoupon = new couponModel({ ...req.body });
        await newCoupon.save();
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.COUPON_CREATED, newCoupon);
    } catch (err) {
        console.error('Coupon creation failed:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getCouponById(req, res) {
    const { error } = couponIdValidation.validate({ ...req.params });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const coupon = await couponModel.findById({ _id: req.params.id, isActive: true });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.COUPON_FETCHED, coupon);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllCouponList(req, res) {
    try {
        const { isActive, isExpire, page = 1, limit = 10, search } = req.query;
        const currentDate = new Date();

        let filter = {};

        if (isActive === 'true') {
            filter = {
                isActive: true,
            };
        } else if (isExpire === 'true') {
            filter = {
                validTo: { $lt: currentDate },
            };
        };
        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [{ code: searchRegex }];
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const [coupons, totalRecords] = await Promise.all([
            couponModel.find(filter)
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            couponModel.countDocuments(filter)
        ]);

        const couponIds = coupons.map(c => c._id);

        const usageData = await orderModel.aggregate([
            { $match: { couponId: { $in: couponIds } } },
            {
                $group: {
                    _id: "$couponId",
                    usedCount: { $sum: 1 }
                }
            },
        ]);

        const usageMap = {};
        usageData.forEach(item => {
            usageMap[item._id.toString()] = item.usedCount;
        });

        const couponsWithUsage = coupons.map(coupon => ({
            ...coupon.toObject(),
            usedCount: usageMap[coupon._id.toString()] || 0
        }));

        const totalPages = Math.ceil(totalRecords / limitNum);

        const responseData = {
            page: pageNum,
            limit: limitNum,
            totalRecords,
            totalPages,
            records: couponsWithUsage,
        };

        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.COUPON_FETCHED, responseData);

    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateCouponById(req, res) {
    const { description, discountType, discountValue, minPurchase, validFrom, validTo } = req.body;
    let id = req.params.id;
    const { error } = couponIdValidation.validate({ id });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const updatedCoupon = await couponModel.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true }
        );
        if (!updatedCoupon) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.COUPON_NOT_FOUND, {});
        };
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.COUPON_UPDATED, updatedCoupon);
    } catch (err) {
        console.error('Coupon update failed:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function deleteCouponById(req, res) {
    let id = req.params.id;
    const { error } = couponIdValidation.validate({ id });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const deleteCoupon = await couponModel.findByIdAndUpdate(
            id,
            { $set: { isActive: false } },
            { new: true }
        );
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.COUPON_DELETED, deleteCoupon);
    } catch (err) {
        console.error('Coupon update failed:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function validateCoupon(req, res) {
    const { code, item } = req.body;
    const currentDate = new Date();
    try {
        const couponExits = await couponModel.findOne({
            code: code,
        });
        if (!couponExits) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.COUPON_EXPIRE, {});
        };
        let isCoupon = false;
        const validationResults = await Promise.all(item.map(async ({ price }) => {
            let productCoupon = null;
            const priceCoupon = await couponModel.findOne({
                code: code,
                isActive: true,
                validFrom: { $lte: currentDate },
                validTo: { $gte: currentDate },
                minPurchase: { $lte: price },
            });

            if (productCoupon || priceCoupon) {
                isCoupon = true;
            };
            return {
                price,
                isCoupon,
                ...priceCoupon?._doc,
                ...productCoupon?._doc
            };
        }));
        if (isCoupon) {
            return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.COUPON_VALID, validationResults);
        } else {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.COUPON_NOT_VALID, {});
        };
    } catch (err) {
        console.error('Coupon validation failed:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};


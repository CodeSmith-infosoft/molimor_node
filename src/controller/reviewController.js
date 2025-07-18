import model from '../model/reviewModel.js';
const { reviewModel, reviewValidation, inActiveValidation } = model;
import response from '../utils/response.js';
import constants from '../utils/constants.js';
import produMdl from '../model/productModel.js';
const { productModel } = produMdl;
const { resStatusCode, resMessage } = constants;

export async function addReview(req, res) {
    const { rating, productId, name, email, comment } = req.body;
    const userId = req.user.id;

    const { error } = reviewValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };

    try {
        const existsReview = await reviewModel.findOne({ productId, userId });
        if (existsReview) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.REVIEW_ALREADY_SUBMITTED);
        };
        const newReview = await reviewModel.create({
            rating,
            userId,
            productId,
            name,
            email,
            comment
        });
        const allReviews = await reviewModel.find({ productId });

        const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = parseFloat((totalRating / allReviews.length).toFixed(1));
        await productModel.updateOne(
            { _id: productId },
            {
                $set: {
                    ratingCount: averageRating,
                },
            },
        );
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.REVIEW_SUBMITTED, newReview);
    } catch (err) {
        console.error(err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR);
    };
};

export async function inActiveReview(req, res) {
    const { productId, isActive } = req.body;
    const userId = req.params.id

    const { error } = inActiveValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const updatedReview = await reviewModel.findOneAndUpdate(
            { productId, userId },
            { isActive },
            { new: true }
        );
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.REVIEW_INACTIVATED, updatedReview);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllReviewByProductId(req, res) {
    let productId = req.params.id;
    try {
        const reviewList = await reviewModel.find({ productId, isActive: true });
        if (reviewList === 0) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.REVIEW_NOT_FOUND, {});
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.REVIEW_LIST_FETCHED, reviewList);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function adminGetAllReviewByProductId(req, res) {
    let productId = req.params.id;
    try {
        const reviewList = await reviewModel.find({ productId });
        if (reviewList === 0) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.REVIEW_NOT_FOUND, {});
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.REVIEW_LIST_FETCHED, reviewList);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};
import model from "../model/categoryModel.js";
const { categoryModel, categoryValidation, categoryIdValidation, categoryInActiveValidation } = model;
import response from '../utils/response.js';
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;

export async function addCategory(req, res) {
    try {
        const { name, productId} = req.body;
        const banners = req?.uploadedImages?.map(file => file.s3Url) || [];
        req.body.banners = banners;
        const { error } = categoryValidation.validate(req.body);
        if (error) {
            return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
        };
        const newCategory = new categoryModel({
            name,
            banners,
            productId,
        });
        await newCategory.save();
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORY_ADDED, newCategory);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getCategoryList(req, res) {
    try {
        const page = req.query.page ? parseInt(req.query.page) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

        if (page === undefined || limit === undefined) {
            const categories = await categoryModel.find({ isActive: true }).sort({ createdAt: 1 });

            const updatedCategories = categories.map(category => ({
                ...category._doc,
                banners: category.banners
            }));
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORIES_FETCHED, updatedCategories);
        };
        const skip = (page - 1) * limit;
        const totalRecords = await categoryModel.countDocuments({});
        const categories = await categoryModel.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const updatedCategories = categories.map(category => ({
            ...category._doc,
            banners: category.banners
        }));

        const totalPages = Math.ceil(totalRecords / limit);
        const responseData = {
            page,
            limit,
            totalRecords,
            totalPages,
            data: updatedCategories
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORIES_FETCHED, responseData);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getCategoryById(req, res) {
    try {
        const { error } = categoryIdValidation.validate(req.params);
        if (error) {
            return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
        };
        const category = await categoryModel.findById(req.params.id);
        if (!category) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.CATEGORY_NOT_FOUND, {});
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORIES_FETCHED, category);
    } catch (error) {
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateCategory(req, res) {
    const { name } = req.body;
    const banners = req.files?.banners?.map(file => file.filename) || [];
    const { error } = categoryIdValidation.validate(req.params);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const updateCategory = await categoryModel.findByIdAndUpdate(
            req.params.id,
            { $set: { name, banners } },
            { new: false }
        );
        if (!updateCategory) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.CATEGORY_NOT_FOUND, {});
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORY_UPDATED, updateCategory);
    } catch (error) {
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function inActiveCategory(req, res) {
    const { isActive } = req.body;
    const { error } = categoryInActiveValidation.validate(req.params, req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const inActiveCategory = await categoryModel.findByIdAndUpdate(
            req.params.id,
            { isActive: isActive },
            { new: false, runValidators: false }
        );
        if (!inActiveCategory) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.CATEGORY_NOT_FOUND, {});
        } else if (isActive === false) {
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORY_INACTIVATED, inActiveCategory);
        } else if (isActive === true) {
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORY_ACTIVATED, inActiveCategory);
        }
    } catch (error) {
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

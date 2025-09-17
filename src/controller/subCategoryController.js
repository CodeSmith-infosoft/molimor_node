import model from "../model/subCategoryModel.js";
const { subCategoryModel, subCategoryValidation, subCategoryIdValidation, inActiveSubCategoryValidation } = model;
import subModel from "../model/categoryModel.js";
const { categoryModel } = subModel;
import response from '../utils/response.js';
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;

export async function addSubCategory(req, res) {
    console.log('req.uploadedImages', req.uploadedImages);
    const image = req.uploadedImages.find(file => file.field === 'image');
    console.log('imagesss', image);
    const { name, categoryId } = req.body;
    req.body.image = image.s3Url;
    const { error } = subCategoryValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const matchedName = await categoryModel.findById(categoryId);
        if (!matchedName) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.CATEGORY_NOT_FOUND, {});
        };
        const lastCategory = await subCategoryModel.findOne().sort({ subcategoryNum: -1 });
        const newSubcategoryNum = typeof lastCategory?.subcategoryNum === 'number' ? lastCategory?.subcategoryNum + 1 : 101;

        const newSubcategory = new subCategoryModel({ name, categoryId, subcategoryNum: newSubcategoryNum, image });
        await newSubcategory.save();
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.SUBCATEGORY_ADDED, newSubcategory);
    } catch (error) {
        console.log(error)
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getSubCategoryList(req, res) {
    try {
        const rawPage = parseInt(req.query.page);
        const rawLimit = parseInt(req.query.limit);
        const { categoryId } = req.query;

        const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (categoryId) {
            filter.categoryId = categoryId;
        };
        const totalRecords = await subCategoryModel.countDocuments(filter);
        const subCategories = await subCategoryModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalPages = Math.ceil(totalRecords / limit);
        const responseData = {
            page,
            limit,
            totalRecords,
            totalPages,
            data: subCategories,
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORIES_FETCHED, responseData);
    } catch (error) {
        console.error("getSubCategoryList error:", error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getActiveSubCategoryList(req, res) {
    try {
        const subCategories = await subCategoryModel.find({ isActive: true }).populate("categoryId").sort({ createdAt: -1 });
        const grouped = {};

        subCategories.forEach(subCat => {
            const category = subCat.categoryId;
            if (!category) {
                return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.CATEGORY_NOT_FOUND, {});
            };
            const categoryId = category._id.toString();

            if (!grouped[categoryId]) {
                grouped[categoryId] = { categoryId: category._id, categoryName: category.name, banners: category?.banners, subCategories: [], };
            };
            grouped[categoryId].subCategories.push({ _id: subCat._id, name: subCat.name, image: subCat.image, isActive: subCat.isActive, createdAt: subCat.createdAt, });
        });
        const result = Object.values(grouped);
        result.sort((a, b) => {
            if (a.categoryName === "Food") return -1;
            if (b.categoryName === "Food") return 1;
            return 0;
        });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.CATEGORIES_FETCHED, result);
    } catch (error) {
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getSubCategoryById(req, res) {
    const { error } = subCategoryIdValidation.validate(req.params);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const subcategory = await subCategoryModel.findById(req.params.id).populate("categoryId");
        if (!subcategory) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.SUBCATEGORY_NOT_FOUND, {});
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.SUBCATEGORY_FETCHED, subcategory);
    } catch (error) {
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateSubCategory(req, res) {
    const { name, categoryId } = req.body;
    const image = req.uploadedImages.find(file => file.field === 'image');
    req.body.image = image?.s3Url || "";

    const { error } = subCategoryValidation.validate(req.body, req.params);
    if (error) {
        return response.error(res, req?.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const updateSubCategory = await subCategoryModel.findByIdAndUpdate(
            { _id: req.params.id },
            { name, categoryId, image: req.body.image },
            { new: true }
        );
        if (!updateSubCategory) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.SUBCATEGORY_NOT_FOUND, {});
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.SUBCATEGORY_UPDATED, {});
    } catch (error) {
        console.log(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function inActiveSubcategory(req, res) {
    const { isActive } = req.body;
    const { id } = req.params;

    const { error } = inActiveSubCategoryValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const inActiveSubcategory = await subCategoryModel.findByIdAndUpdate(
            id,
            { isActive: isActive },
            { new: false, runValidators: false }
        );
        if (!inActiveSubcategory) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.SUBCATEGORY_NOT_FOUND, {});
        };
        if (isActive === false) {
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.SUBCATEGORY_INACTIVE, inActiveSubcategory);
        } else if (isActive === true) {
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.SUBCATEGORY_ACTIVE, inActiveSubcategory);
        };
    } catch (error) {
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};
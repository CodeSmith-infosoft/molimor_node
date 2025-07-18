import model from '../model/productModel.js';
const { productModel, productValidation, updateProductValidation, productFileSchema, productIdValidation, updateToggleActivetValidation } = model;
import response from '../utils/response.js';
import categoryMdl from '../model/categoryModel.js'
const { categoryModel } = categoryMdl;
import orderMdl from '../model/orderModel.js'
const { orderModel } = orderMdl;
import reviewMdl from '../model/reviewModel.js'
const { reviewModel } = reviewMdl;
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import wishModel from '../model/wishlistModel.js';
const { wishlistModel } = wishModel;
import subCategoryMdl from '../model/subCategoryModel.js';
const { subCategoryModel } = subCategoryMdl;
import mongoose from 'mongoose';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function addSingleProduct(req, res) {
    const mainImage = req.uploadedImages.find(file => file.field === 'mainImage');
    const image = req.uploadedImages.find(file => file.field === 'image');
    console.log('image', image)
    console.log('mainImage', mainImage)

    const { brand, title, isFeatured, variants, description, benefits, subCategoryId, sku, hsnCode, gst, stock, quantity, buyItWith, isActive } = req.body;

    req.body.variants = req.body.variants.map(variant => ({
        ...variant,
        price: parseInt(variant.price),
        mrp: parseInt(variant.mrp),

        discountPrice:
            variant.discountPrice
                ? parseInt(variant.discountPrice)
                : undefined,

        startSaleOn: variant.startSaleOn
            ? variant.startSaleOn
            : undefined,

        endSaleOn: variant.endSaleOn
            ? variant.endSaleOn
            : undefined,

        saleStatus: variant.saleStatus ?? undefined
    }));
    const { error } = productValidation.validate(req.body);
    if (error) {
        return response.error(res, req?.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const existingProduct = await productModel.findOne({ sku: sku });
        if (existingProduct) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.PRODUCT_SKU_EXISTS, {});
        };

        const createnewProduct = new productModel({
            ...req.body,
            gst: gst + "%",
            mainImage: mainImage,
            image: image,
            buyItWith
        });
        await createnewProduct.save();
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCT_ADDED, createnewProduct);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllProductsList(req, res) {
    try {
        const { brand, category, status, minPrice, maxPrice, review, minWeight, maxWeight, page = 1, limit = 10, userId, subcategoryId } = req.query;

        const filter = {
            isActive: true,
            isDelete: false
        };

        // 1. Review filter
        if (review) {
            const ratingValue = review;
            if (ratingValue >= 1 && ratingValue <= 5) {
                filter.ratingCount = { $gte: ratingValue };

                // console.log('ratingValue', ratingValue)
                // console.log('ratingValue', typeof (ratingValue))
                // const reviewedProducts = await reviewModel.aggregate([
                //     { $match: { isActive: true } },
                //     {
                //         $group: {
                //             _id: "$productId",
                //             averageRating: { $avg: "$rating" }
                //         }
                //     },
                //     { $match: { averageRating: { $gte: ratingValue } } }
                // ]);
                // console.log('reviewedProducts', reviewedProducts)
                // const matchingProductIds = reviewedProducts.map(item => item._id);
                // console.log('matchingProductIds', matchingProductIds)
                // if (matchingProductIds.length === 0) {
                //     return response.success(res, req.languageCode, 200, resMessage.NO_PRODUCTS_FOUND, {
                //         page: parseInt(page),
                //         limit: parseInt(limit),
                //         totalRecords: 0,
                //         totalPages: 0,
                //         products: []
                //     });
                // };
                // filter._id = { $in: matchingProductIds };
            };
        };
        // 2. Category filter
        if (category) {
            const categoryDoc = await categoryModel.findOne({ name: category });
            if (categoryDoc) {
                const subCategories = await subCategoryModel.find({ categoryId: categoryDoc._id }, { _id: 1 });
                const subCategoryIds = subCategories.map(sc => sc._id);

                if (subCategoryIds.length === 0) {
                    return response.success(res, req.languageCode, 200, resMessage.NO_PRODUCTS_FOUND, {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalRecords: 0,
                        totalPages: 0,
                        products: []
                    });
                };
                // Apply filter on subCategoryId
                filter.subCategoryId = { $in: subCategoryIds };
            };
        };

        if (subcategoryId) {
            filter.subCategoryId = new mongoose.Types.ObjectId(subcategoryId);
        };

        if (brand) {
            filter.brand = brand;
        };
        // 3. Stock status filter
        if (status === 'instock') {
            filter.quantity = { $gt: 0 };
        } else if (status === 'outofstock') {
            filter.quantity = 0;
        };

        const pipeline = [{ $match: filter }];
        const applyVariantFilters = minWeight || maxWeight || minPrice || maxPrice;
        if (applyVariantFilters) {
            pipeline.push({ $unwind: '$variants' });
            if (minWeight || maxWeight) {
                pipeline.push({
                    $addFields: {
                        numericWeight: {
                            $toInt: {
                                $arrayElemAt: [{ $split: ['$variants.weight', 'g'] }, 0]
                            },
                        },
                    },
                });

                // Weight filters
                // if (minWeight || maxWeight) {
                const weightFilter = {};
                if (minWeight) weightFilter.$gte = parseInt(minWeight);
                if (maxWeight) weightFilter.$lte = parseInt(maxWeight);
                pipeline.push({ $match: { numericWeight: weightFilter } });
            };

            // Price filters
            const priceFilter = {};
            const minPriceNum = minPrice !== undefined && minPrice !== 'undefined' ? parseFloat(minPrice) : null;
            const maxPriceNum = maxPrice !== undefined && maxPrice !== 'undefined' ? parseFloat(maxPrice) : null;
            if (minPriceNum !== null) priceFilter.$gte = minPriceNum;
            if (maxPriceNum !== null) priceFilter.$lte = maxPriceNum;
            if (Object.keys(priceFilter).length > 0) {
                pipeline.push({ $match: { 'variants.price': priceFilter } });
            };

            // Group by product again
            pipeline.push({
                $group: {
                    _id: '$_id',
                    doc: { $first: '$$ROOT' },
                    variants: { $push: '$variants' }
                },
            });

            pipeline.push({
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ['$doc', { variants: '$variants' }]
                    },
                },
            });
        };

        // Sort before pagination
        pipeline.push({ $sort: { createdAt: -1 } });

        // 4. Category lookup
        pipeline.push(
            {
                $lookup: {
                    from: 'sub_categorys',
                    localField: 'subCategoryId',
                    foreignField: '_id',
                    as: 'subCategory'
                }
            },
            {
                $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'subCategory.categoryId',
                    foreignField: '_id',
                    as: 'category1'
                }
            },
            {
                $unwind: { path: '$category1', preserveNullAndEmptyArrays: true }
            },
        );

        // Clone for counting
        const countPipeline = [...pipeline];
        // 6. Apply Pagination AFTER all grouping and lookups
        const skip = (parseInt(page) - 1) * parseInt(limit);
        pipeline.push(
            { $skip: skip },
            { $limit: parseInt(limit) }
        );

        // Execute main query
        const filteredProducts = await productModel.aggregate(pipeline);

        if (!filteredProducts.length) {
            return response.success(res, req.languageCode, 200, resMessage.NO_PRODUCTS_FOUND, {
                page: parseInt(page),
                limit: parseInt(limit),
                totalRecords: 0,
                totalPages: 0,
                products: []
            });
        };

        // Format product data
        const convertedProducts = await Promise.all(filteredProducts.map(async product => {

            let isWishListExists = false;
            if (userId) {
                const wish = await wishlistModel.findOne({
                    userId,
                    'items.productId': product._id,
                    isActive: true
                });
                isWishListExists = !!wish;
            };

            return {
                ...product,
                variants: product.variants || [],
                // image: product.image?.[0],
                stockStatus: product.quantity > 0 ? 'instock' : 'outofstock',
                isWishList: isWishListExists,
                category: product.category
            };
        }));

        // Count total records
        const totalFilteredProducts = await productModel.aggregate(countPipeline);
        const totalRecords = totalFilteredProducts.length;
        const totalPages = Math.ceil(totalRecords / parseInt(limit));

        return response.success(res, req.languageCode, 200, resMessage.PRODUCTS_RETRIEVED, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalRecords,
            totalPages,
            products: convertedProducts
        });
    } catch (error) {
        console.error('Error in getAllProductsList:', error);
        return response.error(res, req.languageCode, 500, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllAdminProductsList(req, res) {
    try {
        const { page, limit } = req.query;

        let products;
        let totalRecords;
        let totalPages = 1;
        let currentPage = 1;
        const perPage = parseInt(limit) || 10;

        const shouldPaginate = !(page === "false");

        if (shouldPaginate) {
            currentPage = parseInt(page) || 1;
            const skip = (currentPage - 1) * perPage;

            totalRecords = await productModel.countDocuments({ isDelete: false });

            products = await productModel
                .find({ isDelete: false })
                .populate("subCategoryId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage);

            totalPages = Math.ceil(totalRecords / perPage);
        } else {
            products = await productModel
                .find({ isDelete: false })
                .populate("subCategoryId", "name")
                .sort({ createdAt: -1 });

            totalRecords = products.length;
        }

        if (!products || products.length === 0) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_PRODUCTS_FOUND, {});
        };

        const convertedProducts = await Promise.all(
            products.map(async (product) => {
                let cleanedIsFeatured = [];
                let cleanedBenefits = [];
                const productsalesCount = await orderModel.countDocuments({ _id: product._id });

                // Clean isFeatured
                if (Array.isArray(product.isFeatured)) {
                    const firstItem = product.isFeatured[0];
                    if (typeof firstItem === "string" && firstItem.includes("\n")) {
                        cleanedIsFeatured = firstItem
                            .split("\n")
                            .map((item) => item.trim().replace(/^"(.*)"$/, "$1"));
                    } else {
                        cleanedIsFeatured = product.isFeatured;
                    }
                };

                // Clean benefits
                if (typeof product.benefits === "string" && product.benefits.includes("\n")) {
                    cleanedBenefits = product.benefits
                        .split("\n")
                        .map((item) => item.trim());
                } else if (Array.isArray(product.benefits)) {
                    cleanedBenefits = product.benefits;
                } else {
                    cleanedBenefits = [product.benefits];
                };

                return {
                    ...product._doc,
                    salesCount: productsalesCount ?? 0,
                    subCategoryName: product.subCategoryId?.name || null,
                    subCategoryId: product.subCategoryId?._id?.toString() || null,
                    // image: product.image?.[0] ? `/productImages/${product.image[0]}` : null,
                    isFeatured: cleanedIsFeatured,
                    benefits: cleanedBenefits,
                };
            })
        );

        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCTS_RETRIEVED, {
            page: shouldPaginate ? currentPage : null,
            limit: shouldPaginate ? perPage : null,
            totalRecords,
            totalPages: shouldPaginate ? totalPages : null,
            products: convertedProducts,
        }
        );
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getProductById(req, res) {
    const { subCategoryId, productId, userId } = req.query;
    const { error } = productIdValidation.validate(req.query);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        if (productId) {
            let product = await productModel.findById(productId).populate("subCategoryId");
            if (!product) {
                return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_PRODUCTS_FOUND, {});
            };

            const categoryDoc = await categoryModel.findById(product.subCategoryId?.categoryId);

            let isWishListExists = false;
            if (userId) {
                isWishListExists = await wishlistModel.findOne({ userId, 'items.productId': product._id, isActive: true });
            };
            if (Array.isArray(product.buyItWith) && product.buyItWith.length > 0) {
                const buyItWithItems = product.buyItWith.filter(item => item?.productId);
                const productIds = buyItWithItems.map(item => item.productId);
                console.log('buyItWithItems', productIds)

                const buyItWithProducts = await productModel.find({ _id: { $in: productIds } }).populate("subCategoryId").lean();
                const enrichedBuyItWith = buyItWithProducts.map(prod => {
                    const match = buyItWithItems.find(item => item.productId.toString() === prod._id.toString());
                    return {
                        ...prod,
                        buyItWithPrice: match?.price ?? null
                    };
                });
                product = product._doc;
                product.buyItWith = enrichedBuyItWith;
            } else {
                product = product._doc;
                product.buyItWith = [];
            };
            const updatedProduct = {
                ...product,
                isWishList: !!isWishListExists,
                category: categoryDoc,
            };
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCTS_RETRIEVED, updatedProduct);
        };

        // Get product by subCategoryId
        if (subCategoryId) {
            const product = await productModel.findOne({ subCategoryId }).populate("subCategoryId");
            const categoryDoc = await categoryModel.findById(product.subCategoryId?.categoryId);

            if (!product) {
                return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_PRODUCTS_FOUND, {});
            };

            let isWishListExists = false;
            if (userId) {
                isWishListExists = await wishlistModel.findOne({ userId, 'items.productId': product._id, isActive: true });
            };

            const updatedProduct = {
                ...product._doc,
                isWishList: !!isWishListExists,
                category: categoryDoc,
                // image: Array.isArray(product.image)
                //     ? product.image.map(img => `/productImages/${img}`)
                //     : []
            };
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCTS_RETRIEVED, updatedProduct);
        };
    } catch (error) {
        console.error("Error in getProductById:", error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateSingleProduct(req, res) {
    const { id } = req.params;

    req.body.variants = req.body.variants.map(variant => ({
        ...variant,
        price: parseInt(variant.price),
        mrp: parseInt(variant.mrp),

        discountPrice:
            variant.discountPrice
                ? parseInt(variant.discountPrice)
                : undefined,

        startSaleOn: variant.startSaleOn
            ? variant.startSaleOn
            : undefined,

        endSaleOn: variant.endSaleOn
            ? variant.endSaleOn
            : undefined,

        saleStatus: variant.saleStatus ?? undefined
    }));

    const { error } = updateProductValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };

    try {
        const existingProduct = await productModel.findById(id);
        if (!existingProduct) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_PRODUCTS_FOUND, {});
        };

        const mainImage = req.uploadedImages.find(file => file.field === 'mainImage');
        const image = req.uploadedImages.find(file => file.field === 'image');
        let mainImages = existingProduct.mainImage;
        let updatedImages = existingProduct.image;

        if (mainImage.length > 0) {
            mainImages = uploadedFiles;
        };
        if (image.length > 0) {
            updatedImages = uploadedFiles;
        };
        delete req.body.sku;
        const updatedData = {
            ...req.body,
            gst: req.body.gst,
            image: updatedImages,
            mainImages: mainImages,
        };
        const updatedProduct = await productModel.findByIdAndUpdate(id, updatedData, { new: true, });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCT_UPDATED, updatedProduct);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function toggleActiveStateById(req, res) {
    const { id } = req.params;

    try {
        const key = Object.keys(req.body)
        if (key.includes('isActive')) {
            const { error } = updateToggleActivetValidation.validate({ id, isActive: req.body.isActive });
            if (error) {
                return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
            };
            const updatedProduct = await productModel.findByIdAndUpdate(id, { isActive: req.body.isActive }, { new: false, runValidators: false });
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCT_UPDATED, updatedProduct);
        };
        if (key.includes('isPopular')) {
            const updatedProduct = await productModel.findByIdAndUpdate(id, { isPopular: req.body.isPopular }, { new: false, runValidators: false });
            return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ADD_PRODUCT_POPULER, updatedProduct);
        };
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function deleteProductById(req, res) {
    const { id } = req.params;
    try {
        const user = await productModel.findById({ _id: id });
        if (!user) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_PRODUCTS_FOUND, {});
        };
        const updatedData = {
            isDelete: true,
            isActive: false
        };
        const updatedProduct = await productModel.findByIdAndUpdate(id, updatedData, { new: false });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCT_DELETED, { updatedProduct });
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function searchProduct(req, res) {
    try {
        const { searchProduct } = req?.query;
        const { error } = productValidation.validate(req.body);
        if (error) {
            return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
        };
        const products = await productModel.find({
            $or: [
                { title: { $regex: searchProduct, $options: 'i' } },
                { shortDescription: { $regex: searchProduct, $options: 'i' } }
            ],
        });
        if (!products?.length) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_MATCHING_PRODUCTS, {});
        };

        let wishlistProductIds = [];
        if (req?.query?.userId) {
            const wishlist = await wishlistModel.findOne({
                userId: req.query.userId,
                isActive: true
            });
            if (wishlist) {
                wishlistProductIds = wishlist.items.map(item =>
                    item.productId.toString()
                );
            };
        };
        const productsWithWishlist = products.map(product => {
            const isWishlisted = wishlistProductIds.includes(product._id.toString());
            // const imagesWithPath = product.image.map(img => `/productImages/${img}`);
            return {
                ...product._doc,
                // image: imagesWithPath,
                isWishList: !!isWishlisted
            };
        });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCTS_RETRIEVED, productsWithWishlist);
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function downloadAddBulkProductTemplate(req, res) {
    try {
        const data = [
            {
                sku: "",
                title: "",
                isFeatured1: "",
                isFeatured2: "",
                isFeatured3: "",
                isFeatured4: "",
                isFeatured5: "",
                isFeatured6: "",
                weight: "",
                price: 0,
                mrp: 0,
                discountPrice: 0,
                startSaleOn: "",
                endSaleOn: "",
                saleStatus: false,
                description: "",
                benefits: "",
                subCategoryId: "",
                gst: "",
                hsnCode: "",
                image1: "",
                image2: "",
                image3: "",
                image4: "",
                image5: "",
                stock: 1,
                quantity: 1,
                isActive: true,
            },
        ];
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Products');

        const dir = path.join(__dirname, '../../public/file');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        };
        const filePath = path.join(dir, 'product_template.xlsx');

        xlsx.writeFile(wb, filePath, {
            bookType: 'xlsx',
            cellStyles: true,
        });
        const downloadUrl = `/product_template.xlsx`;
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.FILE_READY, {});
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};


function generateUniqueFilename(extension = 'jpg') {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
};
function getFileExtensionFromUrl(url) {
    if (!url) return 'jpg';
    const match = url.match(/\.(jpg|jpeg|png|gif|bmp|webp)(\?|$)/i);
    return match ? match[1] : 'jpg';
};

function convertGoogleDriveToDirectLink(url) {
    const match = url.match(/\/d\/(.+?)\//);
    if (!match) return url;
    const fileId = match[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

async function downloadImageFromUrl(imageUrl, filename) {
    const uploadDir = path.join(__dirname, '../../public/productImages');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    if (!imageUrl || !filename) {
        console.log('Invalid imageUrl or filename, skipping download');
        return null;
    };

    const filePath = path.join(uploadDir, filename);
    const directUrl = convertGoogleDriveToDirectLink(imageUrl);

    const response = await axios.get(directUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filename));
        writer.on('error', (err) => {
            console.error('Error writing file:', err);
            reject(err);
        });
    });
};

export async function uploadBulkProductsFile(req, res) {
    try {
        if (!req.file) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_FILE_UPLOADED, {});
        };
        const fileMimeType = req.file.mimetype;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        if (
            fileMimeType !== 'text/csv' &&
            fileMimeType !== 'application/vnd.ms-excel' &&
            fileExtension !== '.csv'
        ) {
            fs.unlinkSync(req.file.path);
            return response.error(res, req.languageCode, resStatusCode.UNSUPPORTED_MEDIA_TYPE, resMessage.FILE_TYPE_NOT_ACCEPTED, {});
        };
        const workbook = xlsx.readFile(req.file.path, { type: 'file' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const finalProducts = [];
        const subCategoryCache = {};

        for (let i = 0; i < rows.length; i++) {

            const row = rows[i];
            if (typeof row.gst === 'number') {
                row.gst = row.gst.toString();
            };
            const { error, value } = productFileSchema.validate(row);

            if (error) {
                fs.unlinkSync(req.file.path);
                return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, `Row ${i + 2} error: ${error.details[0].message}. Please fix the error and upload the file again.`);
            };

            let subCategory = subCategoryCache[value.subCategoryId];
            if (!subCategory) {
                subCategory = await subCategoryModel.findOne({ subcategoryNum: parseInt(value.subCategoryId) });
                if (!subCategory) {
                    fs.unlinkSync(req.file.path);
                    return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, `Row ${i + 2}: Subcategory ID ${value.subCategoryId} is invalid or does not exist.`);
                }
                subCategoryCache[value.subCategoryId] = subCategory;
            };

            const imageUrls = [value.image1, value.image2, value.image3, value.image4, value.image5].filter(Boolean);
            const downloadedImages = [];

            for (const url of imageUrls) {
                const ext = getFileExtensionFromUrl(url);
                const filename = generateUniqueFilename(ext);
                const downloadedFilename = await downloadImageFromUrl(url, filename);
                if (downloadedFilename) downloadedImages.push(downloadedFilename);
            };

            let gstValue = '';
            if (value.gst !== '' && value.gst !== null && value.gst !== undefined) {
                const gstNum = Number(value.gst);
                gstValue = !isNaN(gstNum) ? gstNum + '%' : String(value.gst);
            };

            const formattedProduct = {
                title: value.title,
                sku: value.sku,
                isFeatured: [
                    value.isFeatured1 || '',
                    value.isFeatured2 || '',
                    value.isFeatured3 || '',
                    value.isFeatured4 || '',
                    value.isFeatured5 || '',
                    value.isFeatured6 || '',
                ].filter(Boolean),
                variants: [
                    {
                        weight: value.weight,
                        price: Number(value.price),
                        mrp: Number(value.mrp),
                        discountPrice: Number(value.discountPrice || 0),
                        startSaleOn: value.startSaleOn ? new Date(value.startSaleOn) : null,
                        endSaleOn: value.endSaleOn ? new Date(value.endSaleOn) : null,
                        saleStatus: value.saleStatus === true || value.saleStatus === 'true',
                    },
                ],
                description: value.description,
                benefits: value.benefits,
                subCategoryId: subCategory._id,
                gst: gstValue,
                hsnCode: Number(value.hsnCode),
                image: downloadedImages,
                stock: Number(value.stock),
                quantity: Number(value.quantity),
                isPopular: false,
                isDelete: false,
                isActive: value.isActive === true || value.isActive === 'true',
                ratingCount: '5',
            };
            finalProducts.push(formattedProduct);
        };
        await productModel.insertMany(finalProducts);
        fs.unlinkSync(req.file.path);
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCTS_UPLOADED, {});
    } catch (error) {
        console.error('Error uploading file:', error);
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        };
        if (error.code === 11000 && error.errorResponse) {
            return response.error(res, req?.languageCode, resStatusCode.CLIENT_ERROR, `Duplicate key error: ${error.errorResponse?.message}`, error?.result || null);
        };
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getPopularProductList(req, res) {
    try {
        const topOrderedProducts = await orderModel.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalOrders: { $sum: "$items.quantity" },
                },
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 50 },
        ]);

        const topProductIds = topOrderedProducts.map((p) => p._id);

        const popularProductsRaw = await productModel.find({
            $or: [
                { _id: { $in: topProductIds } },
                { isPopular: true },
            ],
        });

        const uniqueProductsMap = new Map();
        for (const product of popularProductsRaw) {
            uniqueProductsMap.set(product._id.toString(), product);
        };

        const sortedProducts = Array.from(uniqueProductsMap.values()).sort((a, b) => {
            return b.isPopular - a.isPopular;
        });

        const selectedProducts = sortedProducts.slice(0, 8);

        const finalProducts = await Promise.all(
            selectedProducts.map(async (product) => {
                const orderCount = await orderModel.countDocuments({ 'items.productId': product._id });
                let isWishListExists = false;

                if (req?.query?.userId) {
                    isWishListExists = await wishlistModel.findOne({ userId: req.query.userId, 'items.productId': product._id, isActive: true, });
                };

                const category = await categoryModel.findById(product.categoryId);

                return {
                    ...product.toObject(),
                    salesCount: orderCount,
                    // image: product.image?.map((img) => `/productImages/${img}`) || [],
                    isWishList: !!isWishListExists,
                    category: category || null,
                };
            })
        );
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PRODUCTS_RETRIEVED, finalProducts);
    } catch (error) {
        console.error(error);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getBigSalesProducts(req, res) {
    try {
        const currentDate = new Date();

        // Query filters
        const { minPrice, maxPrice, review } = req.query;

        // Step 1: Get products with at least one active variant
        const products = await productModel.find({
            variants: {
                $elemMatch: {
                    saleStatus: true,
                    startSaleOn: { $lte: currentDate },
                    endSaleOn: { $gte: currentDate }
                }
            }
        }).lean();

        // Step 2: Flatten variants
        const allVariants = products.flatMap(product => {
            return product.variants
                .filter(variant =>
                    variant.saleStatus &&
                    new Date(variant.startSaleOn) <= currentDate &&
                    new Date(variant.endSaleOn) >= currentDate
                )
                .map(variant => {
                    const end = new Date(variant.endSaleOn);
                    const timeLeftHours = (end - currentDate) / (1000 * 60 * 60);

                    return {
                        ...product,
                        variant,
                        timeLeftHours
                    };
                });
        });

        // Step 3: Apply filters only for deal-based variants
        const filterByDealParams = item => {
            const price = item.variant.discountPrice || item.variant.price;
            const rating = parseFloat(item.ratingCount) || 0;

            if (minPrice && price < Number(minPrice)) return false;
            if (maxPrice && price > Number(maxPrice)) return false;
            if (review && rating < Number(review)) return false;

            return true;
        };

        const filteredVariants = allVariants.filter(filterByDealParams);

        // Step 4: Categorize filtered variants
        const dealOfTheDay = filteredVariants.filter(item => item.timeLeftHours <= 24);
        const dealOfTheWeek = filteredVariants.filter(item => item.timeLeftHours > 24 && item.timeLeftHours <= 168);
        const crazyDeal = filteredVariants.filter(item => item.timeLeftHours > 168);

        const formatOutput = deals => deals.map(({ timeLeftHours, ...rest }) => rest);

        // Step 5: Combo logic (filter only on price)
        const allComboProducts = await productModel.find({ isActive: true, isDelete: false })
            .populate("subCategoryId", "name")
            .lean();

        const filteredCombo = allComboProducts.filter(product => {
            if (!product.subCategoryId || product.subCategoryId.name?.toLowerCase() !== "combo") return false;

            const matchedVariants = product.variants?.filter(variant => {
                const price = variant.price;

                if (minPrice && price < Number(minPrice)) return false;
                if (maxPrice && price > Number(maxPrice)) return false;

                return true;
            });

            return matchedVariants && matchedVariants.length > 0;
        });

        // Step 6: Return the response
        return response.success(
            res,
            req?.languageCode,
            resStatusCode.ACTION_COMPLETE,
            resMessage.PRODUCTS_RETRIEVED,
            {
                dealOfTheDay: formatOutput(dealOfTheDay),
                dealOfTheWeek: formatOutput(dealOfTheWeek),
                crazyDeal: formatOutput(crazyDeal),
                combo: filteredCombo
            }
        );

    } catch (error) {
        console.error('getBigSalesProducts Error:', error);
        return response.error(
            res,
            req?.languageCode,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
};



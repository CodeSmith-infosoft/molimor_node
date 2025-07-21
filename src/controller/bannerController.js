import model from '../model/bannerModel.js';
const { bannerModel, bannerValidation, bannerIdValidation, bannerActiveValidation, shopBannerModel, shopBannerValidation } = model;
import response from '../utils/response.js';
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;

export async function addBanner(req, res) {
    const productId = req.body?.productId;
    const bannerType = req.body.bannerType;
    const image = req.uploadedImages.find(file => file.field === 'image');
    const { error } = bannerValidation.validate({ image: image.s3Url, productId, bannerType });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const addbanner = await bannerModel.create({
            image: image.s3Url,
            productId,
            bannerType,
        });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_ADDED, addbanner);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllBanner(req, res) {
    try {
        const bannerList = await bannerModel.find({ isActive: true, isDelete: false }).sort({ createdAt: -1 });

        if (!bannerList.length) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.BANNER_LIST_EMPTY, []);
        };
        const groupedBanners = bannerList.reduce((acc, banner) => {
            const type = banner.bannerType;
            if (!acc[type]) {
                acc[type] = [];
            };
            acc[type].push(banner);
            return acc;
        }, {});
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_LIST_FETCHED, groupedBanners);
    } catch (err) {
        console.error("Error in getAllBanner:", err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function adminGetAllBanner(req, res) {
    try {
        const bannerList = await bannerModel.find({ isDelete: false }).sort({ createdAt: -1 });
        if (!bannerList) {
            return response.error(res, resStatusCode.FORBIDDEN, resMessage.BANNER_LIST_EMPTY, []);
        };
        // const updatedBannerList = bannerList.map(banner => {
        //     return {
        //         ...banner._doc,
        //         image: banner.image.startsWith("/banner/")
        //             ? banner.image
        //             : `/banner/${banner.image}`
        //     };
        // });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_LIST_FETCHED, bannerList);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function deleteBannerById(req, res) {
    const bannerId = req.params.id;

    const { error } = bannerIdValidation.validate(req.params);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const deleteBanner = await bannerModel.findByIdAndUpdate(bannerId, { isDelete: true, isActive: false }, { new: true });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_DELETED, deleteBanner);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateBannerById(req, res) {
    const bannerId = req.params.id;
    const bannerType = req.body.bannerType;
    const image = req.uploadedImages.find(file => file.field === 'image');

    let { error } = bannerActiveValidation.validate({ image: image.s3Url, id: bannerId, bannerType });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const updateBannerById = await bannerModel.findByIdAndUpdate(bannerId, {
            image: image.s3Url,
            productId: req.body.productId
        }, { new: false });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_UPDATE, updateBannerById);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function addBannerForShopNow(req, res) {
    try {
        const productId = req.query?.productId;
        const deskimage = req.uploadedImages.find(file => file.field === 'image');
        const mobileImage = req.uploadedImages.find(file => file.field === 'mobileImage');
        // const deskimage = req.files?.image?.[0].filename;
        // const mobileImage = req.files?.mobileImage?.[0].filename;

        const { error } = shopBannerValidation.validate({ deskimage, mobileImage, productId });
        if (error) {
            return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
        };
        const newBanner = await shopBannerModel.create({
            productId,
            deskimage: deskimage.s3Url,
            mobileImage: mobileImage.s3Url,
        });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_ADDED, newBanner);
    } catch (err) {
        console.error('Error in addBannerForShopNow:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllBannerForShopNow(req, res) {
    try {
        const getAllBannerForShopNow = await shopBannerModel.find({ isActive: true, isDelete: false });
        // const updatedBannerList = getAllBannerForShopNow.map(banner => {
        //     return {
        //         ...banner._doc,
        //         deskimage: banner.deskimage.startsWith("/banner/")
        //             ? banner.deskimage
        //             : `/banner/${banner.deskimage}`,
        //         mobileImage: banner.mobileImage.startsWith("/banner/")
        //             ? banner.image
        //             : `/banner/${banner.mobileImage}`
        //     };
        // });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_LIST_FETCHED, getAllBannerForShopNow);
    } catch (err) {
        console.error('Error in addBannerForShopNow:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function deleteShopNowBannerById(req, res) {
    const bannerId = req.params.id;
    const { error } = bannerIdValidation.validate(req.params);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const deleteBanner = await shopBannerModel.findByIdAndUpdate(bannerId, { isDelete: true, isActive: false }, { new: true });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.BANNER_DELETED, deleteBanner);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};
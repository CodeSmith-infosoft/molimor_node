import model from '../model/mediaModel.js';
const { mediaModel, mediaValidation, videoValidation, mediaIdValidation, mediaActiveValidation, marketPlaceModel, marketPlaceValidation, instaShopModel, deleteMediaIDValidation } = model;
import response from '../utils/response.js';
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;

export async function addMedia(req, res) {
    const reqImage = req.uploadedImages;
    try {
        const savedMedia = await Promise.all(
            reqImage.map(async (file) => {
                const fileName = file.s3Url;
                const { error } = mediaValidation.validate({ image: fileName, type: 'img' });
                if (error) {
                    return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
                };
                return { file: fileName, type: 'img' };
            }),
        );
        await mediaModel.insertMany(savedMedia);
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MEDIA_UPLOADED, savedMedia);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, err.message || resMessage.INTERNAL_SERVER_ERROR, {});
    };
};


export async function adminGetAllMedia(req, res) {
    const { type } = req.params;
    try {
        const media = await mediaModel.find({ type: type, isDelete: false }).sort({ createdAt: -1 });

        if (!media.length) {
            return response.success(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_MEDIA_FOUND, []);
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MEDIA_RETRIEVED, media);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllMedia(req, res) {
    const { type } = req.params;
    try {
        const media = await mediaModel.find({ type: type, isActive: true, isDelete: false }).sort({ createdAt: -1 });

        if (!media.length) {
            return response.success(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_MEDIA_FOUND, []);
        };
        const updatedMedia = media.map(item => ({
            ...item.toObject(),
            file: type === 'img' ? `/media/${item.file}` : item.file,
        }));

        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MEDIA_RETRIEVED, updatedMedia);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function addVideoUrl(req, res) {
    const { vdoUrl } = req.body;
    const { error } = videoValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        mediaModel.create({
            file: vdoUrl,
            type: 'vdo'
        });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.VIDEO_URL_ADDED, { vdoUrl });
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function deleteMediaById(req, res) {
    const id = req.params.id;
    const { error } = mediaIdValidation.validate(req.params);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const deleteMediaById = await mediaModel.findByIdAndUpdate(id, { isDelete: true, isActive: false }, { new: true });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MEDIA_DELETED, deleteMediaById);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function inActiveMediaById(req, res) {
    const id = req.params.id;
    const isActive = req.body.isActive;
    req.body.id = id;
    let { error } = mediaActiveValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const inActiveMedia = await mediaModel.findByIdAndUpdate(id, { isActive }, { new: true });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MEDIA_INACTIVATED, inActiveMedia);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function addMarketPlace(req, res) {
    const { error } = marketPlaceValidation.validate({ image: req?.file?.filename, link: req.body.link });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const addOtherStore = await marketPlaceModel.create({
            image: req?.file.filename,
            link: req.body.link
        });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ADD_OTHER_STORE, addOtherStore);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getMarketPlace(req, res) {
    try {
        const bannerList = await marketPlaceModel.find({ isActive: true, isDelete: false }).sort({ createdAt: -1 });
        if (!bannerList) {
            return response.error(res, req?.languageCode, resStatusCode.FORBIDDEN, resMessage.MARKET_PLACE_LIST_EMPTY, []);
        };
        const updatedBannerList = bannerList.map(banner => {
            return {
                ...banner._doc,
                image: banner.image.startsWith("/marketPlace/")
                    ? banner.image
                    : `/marketPlace/${banner.image}`
            };
        });
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MARKET_PLACE_LIST_FETCHED, updatedBannerList);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateMarketPlace(req, res) {
    const id = req.params.id;
    const { error } = marketPlaceValidation.validate({ image: req?.file?.filename, link: req.body.link });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const updatedMarketPlace = await marketPlaceModel.findByIdAndUpdate(
            { _id: id },
            {
                $set: {
                    image: req?.file.filename,
                    link: req.body.link
                }
            },
            { new: false, runValidators: false }
        );
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ADD_OTHER_STORE, updatedMarketPlace);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function deleteMarketPlace(req, res) {
    const id = req.params.id;
    const { error } = deleteMediaIDValidation.validate({ id: id });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const deleteMarketPlace = await marketPlaceModel.findByIdAndUpdate(
            { _id: id },
            {
                $set: {
                    isActive: false,
                    isDelete: true
                }
            },
            { new: false, runValidators: false }
        );
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ADD_OTHER_STORE, deleteMarketPlace);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function addInstaShop(req, res) {
    try {
        const image = req.uploadedImages.find(file => file.field === 'image')
        const url = req.body.url;
        const addInstaShop = await instaShopModel({
            image: image.s3Url,
            url: url
        });
        await addInstaShop.save();

        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MEDIA_UPLOADED, addInstaShop);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllInstaShop(req, res) {
    try {
        const allInstaShops = await instaShopModel.find({ isActive: true }).sort({ createdAt: -1 });

        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.MEDIA_RETRIEVED, allInstaShops);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateInstaShop(req, res) {
    const id = req.params.id;
    const image = req?.uploadedImages.find(file => file.field === 'image');
    const url = req.body.url;
    try {
        const updateInstaShop = await instaShopModel.findByIdAndUpdate(
            { _id: id },
            {
                $set: {
                    image: image.s3Url,
                    url: url
                }
            },
            { new: false, runValidators: false }
        );
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.INSTASHOP_UPDATED, updateInstaShop);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function deleteInstaShop(req, res) {
    const id = req.params.id;
    const { error } = deleteMediaIDValidation.validate({ id: id });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const deleteInstaShop = await instaShopModel.findByIdAndUpdate(
            { _id: id },
            {
                $set: {
                    isActive: false,
                }
            },
            { new: false, runValidators: false }
        );
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.INSTASHOP_DELETED, deleteInstaShop);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

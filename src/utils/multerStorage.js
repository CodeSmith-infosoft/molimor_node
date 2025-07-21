import multer, { diskStorage } from 'multer';
import { mkdir, existsSync } from "fs";
import { extname, join } from 'path';
import path from 'path';





const excelFileStorage = diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploadFile';
        mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = extname(file.originalname);
        cb(null, `${timestamp}-excel${ext}`);
    },
});
export const uploadExcelFile = multer({ storage: excelFileStorage });


export function getAvailableFileName(dir, baseName, extension) {
    let counter = 1;
    let fileName = `${baseName}.${extension}`;
    let filePath = join(dir, fileName);

    while (existsSync(filePath)) {
        counter++;
        fileName = `${baseName}(${counter}).${extension}`;
        filePath = join(dir, fileName);
    };
    return filePath;
};

// const fileFilter = (req, file, cb) => {
//     const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

//     if (!allowedTypes.includes(file.mimetype)) {
//         return cb(new Error('Only images are allowed (jpeg, png, jpg, webp).'), false);
//     };
//     cb(null, true);
// };

// const bannerImageStorage = diskStorage({
//     destination: function (req, file, cb) {
//         const dir = './public/banner';
//         mkdir(dir, { recursive: true }, (error) => cb(error, dir));
//     },
//     filename: function (req, file, cb) {
//         const ext = path.extname(file.originalname);
//         const first4Chars = file.originalname.slice(0, 4);
//         cb(null, Date.now() + '-banner' + first4Chars + ext);
//     },
// });

// export const bannerImage = multer({
//     storage: bannerImageStorage,
//     limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
//     fileFilter,
// }).single('image');


// export const uploadBannerImages = multer({
//     storage: bannerImageStorage,
//     limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
//     fileFilter,
// }).fields([
//     { name: 'image', maxCount: 1 },
//     { name: 'mobileImage', maxCount: 1 },
// ]);

// const certificateImageStorage = diskStorage({
//     destination: function (req, file, cb) {
//         const dir = './public/certificate';
//         mkdir(dir, { recursive: true }, (error) => cb(error, dir));
//     },
//     filename: function (req, file, cb) {
//         const ext = path.extname(file.originalname);
//         const first4Chars = file.originalname.slice(0, 4);
//         cb(null, Date.now() + '-certificate' + first4Chars + ext);
//     },
// });
// export const certificateImage = multer({ storage: certificateImageStorage });





const marketPlaceStorage = diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/marketPlace';
        mkdir(dir, { recursive: true }, (error) => cb(error, dir));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const first4Chars = file.originalname.slice(0, 4);
        cb(null, Date.now() + '-marketPlace' + first4Chars + ext);
    },
});
export const marketPlacePhotos = multer({ storage: marketPlaceStorage });


// const categoryStorage = diskStorage({
//     destination: function (req, file, cb) {
//         const dir = './public/category';
//         mkdir(dir, { recursive: true }, (error) => cb(error, dir));
//     },
//     filename: function (req, file, cb) {
//         const ext = path.extname(file.originalname);
//         const first4Chars = file.originalname.slice(0, 4);
//         cb(null, Date.now() + '-categoryImage-' + first4Chars + ext);
//     },
// });

// export const categoryImage = multer({ storage: categoryStorage }).fields([
//     { name: 'banners', maxCount: 5 },
// ]);








// import multer from 'multer';
// import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();
import fs from 'fs';

const isProduction = process.env.ENVIRONMENT === 'production';
export const s3 = new S3Client({
    region: process.env.AWS_REGION || "",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const saveLocally = async (file, folderName, filePrefix, fieldname) => {
    const timestamp = Date.now();
    const first4Chars = file.originalname.slice(0, 4);
    const ext = file.originalname.includes('.') ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '.jpg';
    const filename = `${filePrefix}-${timestamp}-${first4Chars}${ext}`;
    const localFolder = `${process.cwd()}/public/${folderName}`;

    if (!fs.existsSync(localFolder)) {
        fs.mkdirSync(localFolder, { recursive: true });
    }

    const filePath = `${localFolder}/${filename}`;
    fs.writeFileSync(filePath, file.buffer);
    return {
        field: fieldname,
        fileName: filename,
        originalName: file.originalname,
        s3Url: `http://192.168.29.44:${process.env.PORT}/${folderName}/${filename}`,
    };
};



const storage = multer.memoryStorage();
export const createS3Uploader = ({ folderName, filePrefix = '', fieldType = 'single', fieldName, customFields = [], fileSizeMB, } = {}) => {
    const limits = {
        fileSize: fileSizeMB * 1024 * 1024,
    };

    const upload = multer({
        storage,
        limits,
    });

    let multerUpload;
    if (fieldType === 'single') {
        multerUpload = upload.single(fieldName);
    } else if (fieldType === 'array') {
        multerUpload = upload.array(fieldName, customFields?.[0]?.maxCount || 1);
    } else if (fieldType === 'fields') {
        multerUpload = upload.fields(customFields);
    } else {
        throw new Error("Invalid fieldType for uploader");
    };

    return [
        multerUpload,
        async (req, res, next) => {
            try {
                const files = req.files || (req.file ? { [fieldName]: [req.file] } : {});
                req.uploadedImages = [];
                for (const [key, fileArray] of Object.entries(files)) {
                    for (const file of fileArray) {
                        if (isProduction) {
                            const timestamp = Date.now();
                            const first4Chars = file.originalname.slice(0, 4);
                            const ext = path.extname(file.originalname);
                            const isBlob = ext === '.blob'; // or use mimetype check if needed
                            const finalExt = isBlob ? '.jpg' : ext; // Default to .jpg if it's a blob
                            const finalMime = isBlob ? 'image/jpeg' : file.mimetype; // Default to image/jpeg if it's a blob
                            const filename = `${filePrefix}-${timestamp}-${first4Chars}${finalExt}`;
                            const s3Key = `${folderName}/${filename}`;

                            const command = new PutObjectCommand({
                                Bucket: process.env.AWS_BUCKET_NAME,
                                Key: s3Key,
                                Body: file.buffer,
                                ContentType: finalMime,//file.mimetype,//ext,
                                ContentDisposition: "inline",
                            });
                            await s3.send(command);

                            const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

                            req.uploadedImages.push({
                                field: key,
                                fileName: filename,
                                originalName: file.originalname,
                                s3Url,
                            });
                            console.log('[S3 Upload] uploadedImages =>', req.uploadedImages);
                        } else {
                            console.log(file)
                            const localFile = await saveLocally(file, folderName, filePrefix, file.fieldname);
                            req.uploadedImages.push({
                                field: key,
                                ...localFile,
                            });
                        };
                    }
                };
                next();
            } catch (error) {
                console.error('[S3 Upload] Error occurred during file upload:', error);
                next(error);
            };
        },
    ];
};

export const categoryImage = createS3Uploader({
    folderName: 'category',
    filePrefix: 'category',
    fieldType: 'fields',
    customFields: [
        { name: 'banners', maxCount: 5 },
    ],
    fileSizeMB: 1,
});

export const subCategoryImage = createS3Uploader({
    folderName: 'subCategory',
    filePrefix: 'sub-category',
    fieldType: 'single',
    fieldName: 'image',
    fileSizeMB: 1,
});

export const productImage = createS3Uploader({
    folderName: 'productImage',
    filePrefix: 'productImage',
    fieldType: 'fields',
    customFields: [
        { name: 'image', maxCount: 5 },
        { name: 'mainImage', maxCount: 1 },
    ],
    fileSizeMB: 1,
});

export const bannerImage = createS3Uploader({
    folderName: 'banner',
    filePrefix: 'banner',
    fieldType: 'single',
    fieldName: 'image',
    fileSizeMB: 1,
});

export const uploadBannerImages = createS3Uploader({
    folderName: 'productImage',
    filePrefix: 'productImage',
    fieldType: 'fields',
    customFields: [
        { name: 'image', maxCount: 1 },
        { name: 'mobileImage', maxCount: 1 },
    ],
    fileSizeMB: 1,
});

export const mediaFile = createS3Uploader({
    folderName: 'media',
    filePrefix: 'media',
    fieldType: 'fields',
    customFields: [
        { name: 'image', maxCount: 10 },
    ],
    fileSizeMB: 1,
});

export const saveUserProfile = createS3Uploader({
    folderName: 'userProfile',
    filePrefix: 'userProfile',
    fieldType: 'single',
    fieldName: 'profilePhoto',
    fileSizeMB: 1,
});

export const instaShopImage = createS3Uploader({
    folderName: 'instaShop',
    filePrefix: 'instaShop',
    fieldType: 'single',
    fieldName: 'image',
    fileSizeMB: 1,
});

export const aboutusImage = createS3Uploader({
    folderName: 'aboutusImage',
    filePrefix: 'aboutusImage',
    fieldType: 'fields',
    customFields: [
        { name: 'img', maxCount: 1 },
        { name: 'box1Img', maxCount: 1 },
        { name: 'box2Img', maxCount: 1 },
        { name: 'box3Img', maxCount: 1 },
    ],
    fileSizeMB: 1,
});
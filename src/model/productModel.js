import Joi from 'joi';
import mongoose, { Schema as _Schema, model } from 'mongoose';
const { Schema } = mongoose;

const productSchema = new Schema({
    title: { type: String, required: true },
    isFeatured: { type: [String], required: true },
    variants: [
        {
            _id: false,
            weight: { type: String, required: true },
            price: { type: Number, required: true },
            mrp: { type: Number, required: true },
            discountPrice: { type: Number },
            startSaleOn: { type: Date, required: false, default: "" },
            endSaleOn: { type: Date, required: false, default: "" },
            saleStatus: { type: Boolean, required: false, default: false },
        }
    ],
    description: [
        {
            h: { type: String, required: true },
            p: { type: String, required: true }
        }
    ],
    benefits: { type: [String], required: true },
    subCategoryId: { type: _Schema.Types.ObjectId, ref: 'sub_categorys' },
    mainImage: [{ type: String }],
    image: [{ type: String }],
    sku: { type: String, required: true, unique: true },
    hsnCode: { type: Number, required: true },
    gst: { type: String, required: true, },
    stock: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    ratingCount: { type: String, default: "5" },
    buyItWith: [
        {
            _id: false,
            productId: { type: _Schema.Types.ObjectId, ref: 'products', required: false },
            price: { type: Number, required: false },
        }
    ],
    isPopular: { type: Boolean, default: false },
    isDelete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const productModel = model('products', productSchema);

const variantSchema = Joi.object({
    weight: Joi.string().required().messages({
        'string.base': 'Weight must be a string',
        'string.empty': 'Weight is required',
        'any.required': 'Weight is required',
    }),
    price: Joi.number().required().messages({
        'number.base': 'Price must be a number',
        'any.required': 'Price is required',
    }),
    mrp: Joi.number().required().messages({
        'number.base': 'MRP must be a number',
        'any.required': 'MRP is required',
    }),
    discountPrice: Joi.number().optional(),
    startSaleOn: Joi.string().optional(),
    endSaleOn: Joi.string().optional(),
    saleStatus: Joi.boolean().optional(),
});

const buyItWithSchema = Joi.object({
    productId: Joi.string().optional().messages({
        'string.base': 'Product ID must be a string',
        'string.empty': 'Product ID is required',
        'any.required': 'Product ID is required',
    }),
    price: Joi.number().optional().messages({
        'number.base': 'Price must be a number',
        'any.required': 'Price is required',
    })
});

// addProduct
const productValidation = Joi.object({
    title: Joi.string().min(3).max(200).required().messages({
        'string.base': 'Title must be a string',
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 3 characters',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
    }),
    isFeatured: Joi.array().items(Joi.string().required()).required().messages({
        'array.base': 'Is Featured must be an array of strings',
        'any.required': 'Is Featured is required',
        'string.empty': 'Each value in Is Featured must be a non-empty string',
        'string.base': 'Each value in Is Featured must be a string',
    }),
    variants: Joi.array().items(variantSchema).min(1).required().messages({
        'array.base': 'Variants must be an array',
        'array.min': 'At least one variant is required',
        'any.required': 'Variants are required',
    }),
    isPopular: Joi.boolean().valid(true, false).default(false).messages({
        'boolean.base': 'isPopular must be true or false',
    }),
    description: Joi.array().items(
        Joi.object({
            h: Joi.string().required().messages({
                'string.base': 'Heading must be a string',
                'string.empty': 'Heading is required',
                'any.required': 'Heading is required'
            }),
            p: Joi.string().required().messages({
                'string.base': 'Paragraph must be a string',
                'string.empty': 'Paragraph is required',
                'any.required': 'Paragraph is required'
            })
        })
    ).required().messages({
        'array.base': 'Description must be an array of objects',
        'array.includesRequiredUnknowns': 'Each description item must contain heading and paragraph',
        'any.required': 'Description is required'
    }),
    benefits: Joi.array().items(
        Joi.string().required().messages({
            'string.base': 'Each benefit must be a string',
            'string.empty': 'Benefit cannot be empty'
        })
    ).required().messages({
        'array.base': 'Benefits must be an array of strings',
        'any.required': 'Benefits are required'
    }),
    subCategoryId: Joi.string().required().messages({
        'string.base': 'Subcategory ID must be a string',
        'string.empty': 'Subcategory ID is required',
        'any.required': 'Subcategory ID is required',
    }),
    mainImage: Joi.string().required().messages({
        'string.pattern.base': 'Each image must be a valid image filename (jpg, jpeg, png, gif, webp)',
        'string.empty': 'Image name cannot be empty',
        'string.base': 'Each image must be a string',
    }),
    image: Joi.array().items(Joi.string().required().messages({
        'string.pattern.base': 'Each image must be a valid image filename (jpg, jpeg, png, gif, webp)',
        'string.empty': 'Image name cannot be empty',
        'string.base': 'Each image must be a string',
    })).max(5).messages({
        'array.base': 'Image must be an array',
        'array.max': 'You can upload a maximum of 5 images',
    }),
    sku: Joi.string().required().messages({
        'string.base': 'SKU must be a string',
        'string.empty': 'SKU is required',
        'any.required': 'SKU is required',
    }),
    hsnCode: Joi.string().required().messages({
        'string.base': 'hsnCode must be a string',
        'string.empty': 'hsnCode is required',
        'any.required': 'hsnCode is required',
    }),
    gst: Joi.string().required().messages({
        'string.base': 'gst must be a string',
        'string.empty': 'gst is required',
        'any.required': 'gst is required',
    }),
    stock: Joi.number().integer().min(0).default(0).messages({
        'number.base': 'Stock must be a number',
        'number.integer': 'Stock must be an integer',
        'number.min': 'Stock cannot be negative',
    }),
    quantity: Joi.number().integer().min(0).default(0).messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity cannot be negative',
    }),
    buyItWith: Joi.array().items(buyItWithSchema).messages({
        'array.base': 'Buy It With must be an array',
    }),
    salePrice: Joi.number().positive().optional().messages({
        'number.base': 'Sale Price must be a number',
        'number.positive': 'Sale Price must be greater than 0',
        'any.required': 'Sale Price is required',
    }),
    isSale: Joi.boolean().optional().messages({
        'boolean.base': 'isSale must be true or false',
        'any.required': 'isSale is required',
    }),
    startSaleOn: Joi.string().optional().messages({
        'date.base': 'startSaleOn must be a valid date',
    }),
    endSaleOn: Joi.string().optional().messages({
        'date.base': 'endSaleOn must be a valid date',
    }),
    isDelete: Joi.boolean().valid(true, false).default(false).messages({
        'any.only': 'Is Delete must be "true" or "false"',
    }),
    isActive: Joi.boolean().valid(true, false).default(true).messages({
        'boolean.base': 'Is Active must be true or false',
    }),
});

// upadte product
const updateProductValidation = Joi.object({
    title: Joi.string().min(3).max(200).required().messages({
        'string.base': 'Title must be a string',
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 3 characters',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
    }),
    isFeatured: Joi.array()
        .items(Joi.string().required())
        .required()
        .messages({
            'array.base': 'Is Featured must be an array of strings',
            'any.required': 'Is Featured is required',
            'string.empty': 'Each value in Is Featured must be a non-empty string',
            'string.base': 'Each value in Is Featured must be a string',
        }),
    variants: Joi.array()
        .items(variantSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'Variants must be an array',
            'array.min': 'At least one variant is required',
            'any.required': 'Variants are required',
        }),
    description: Joi.string().required().messages({
        'string.base': 'Description must be a string',
        'string.empty': 'Description is required',
        'any.required': 'Description is required',
    }),
    benefits: Joi.string().required().messages({
        'string.base': 'Benefits must be a string',
        'string.empty': 'Benefits is required',
        'any.required': 'Benefits is required',
    }),
    salePrice: Joi.number().optional().messages({
        'number.base': 'Sale price must be a number',
    }),
    isSale: Joi.boolean().valid(true, false).default(false).messages({
        'boolean.base': 'isSale must be true or false',
    }),
    startSaleOn: Joi.string().optional().messages({
        'date.base': 'startSaleOn must be a valid date',
    }),
    endSaleOn: Joi.string().optional().messages({
        'date.base': 'endSaleOn must be a valid date',
    }),
    hsnCode: Joi.string().required().messages({
        'string.base': 'hsnCode must be a string',
        'string.empty': 'hsnCode is required',
        'any.required': 'hsnCode is required',
    }),
    gst: Joi.string().required().messages({
        'string.base': 'gst must be a string',
        'string.empty': 'gst is required',
        'any.required': 'gst is required',
    }),
    mainImage: Joi.string().required().messages({
        'string.pattern.base': 'Each image must be a valid image filename (jpg, jpeg, png, gif, webp)',
        'string.empty': 'Image name cannot be empty',
        'string.base': 'Each image must be a string',
    }),
    image: Joi.array()
        .items(Joi.string().required().messages({
            'string.pattern.base': 'Each image must be a valid image filename (jpg, jpeg, png, gif, webp)',
            'string.empty': 'Image name cannot be empty',
            'string.base': 'Each image must be a string',
        })).max(5).messages({
            'array.base': 'Image must be an array',
            'array.max': 'You can upload a maximum of 5 images',
        }),
    stock: Joi.number().integer().min(0).default(0).messages({
        'number.base': 'Stock must be a number',
        'number.integer': 'Stock must be an integer',
        'number.min': 'Stock cannot be negative',
    }),
    buyItWith: Joi.array().items(buyItWithSchema).messages({
        'array.base': 'Buy It With must be an array',
    }),
    quantity: Joi.number().integer().min(0).default(0).messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity cannot be negative',
    }),
    isDelete: Joi.boolean().valid(true, false).default(false).messages({
        'any.only': 'Is Delete must be "true" or "false"',
    }),
    isActive: Joi.boolean().valid(true, false).default(true).messages({
        'boolean.base': 'Is Active must be true or false',
    }),
});

const productSearchValidation = Joi.object({
    searchProduct: Joi.string().required().messages({
        'string.empty': 'Search term is required.',
        'any.required': 'Search term is required.'
    }),
});

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const productIdValidation = Joi.object({
    userId: Joi.string()
        .pattern(objectIdPattern)
        .optional()
        .messages({
            'string.empty': 'User ID is required.',
            'any.required': 'User ID is required.',
            'string.pattern.base': 'User ID must be a valid MongoDB ObjectId.',
        }),
    subCategoryId: Joi.string()
        .pattern(objectIdPattern)
        .messages({
            'string.pattern.base': 'Sub-category ID must be a valid MongoDB ObjectId.',
        }),
    productId: Joi.string()
        .pattern(objectIdPattern)
        .messages({
            'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId.',
        }),
    lang: Joi.string().optional()
}).or('subCategoryId', 'productId').messages({
    'object.missing': 'Either Sub-category ID or Product ID is required.',
});


const updateToggleActivetValidation = Joi.object({
    id: Joi.string()
        .pattern(objectIdPattern)
        .optional()
        .messages({
            'string.empty': 'User ID is required.',
            'any.required': 'User ID is required.',
            'string.pattern.base': 'User ID must be a valid MongoDB ObjectId.',
        }),
    isActive: Joi.boolean().messages({
        'boolean.base': 'Is Active must be true or false',
    }),
});

const productFileSchema = Joi.object({
    sku: Joi.string().required().messages({
        "any.required": "SKU is required."
    }),
    title: Joi.string().required().messages({
        "any.required": "Title is required."
    }),
    isFeatured1: Joi.string().allow('', null),
    isFeatured2: Joi.string().allow('', null),
    isFeatured3: Joi.string().allow('', null),
    isFeatured4: Joi.string().allow('', null),
    isFeatured5: Joi.string().allow('', null),
    isFeatured6: Joi.string().allow('', null),
    weight: Joi.string().allow('', null),
    price: Joi.number().required().messages({
        "any.required": "Price is required."
    }),
    mrp: Joi.number().required().messages({
        "any.required": "MRP is required."
    }),
    discountPrice: Joi.number().allow(null, ''),
    startSaleOn: Joi.string().allow('', null),
    endSaleOn: Joi.string().allow('', null),
    saleStatus: Joi.boolean().truthy('TRUE').falsy('FALSE').default(false),
    description: Joi.string().allow('', null),
    benefits: Joi.string().allow('', null),
    subCategoryId: Joi.number().required().messages({
        "any.required": "Subcategory ID is required."
    }),
    gst: Joi.string().allow('', null),
    hsnCode: Joi.number().required().messages({
        "any.required": "HSN Code is required."
    }),
    image1: Joi.string().allow('', null),
    image2: Joi.string().allow('', null),
    image3: Joi.string().allow('', null),
    image4: Joi.string().allow('', null),
    image5: Joi.string().allow('', null),
    stock: Joi.number().default(1),
    quantity: Joi.number().default(1),
    isActive: Joi.boolean().truthy('TRUE').falsy('FALSE').default(true),
});


export default {
    productModel,
    productValidation,
    productSearchValidation,
    updateProductValidation,
    productFileSchema,
    productIdValidation,
    updateToggleActivetValidation
};

import Joi from 'joi';
import mongoose, { model } from 'mongoose';
const { Schema } = mongoose;

const bannerSchema = new Schema({
  image: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'products', require: false },
  bannerType: { type: String, required: true },
  isDelete: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const bannerModel = model('banners', bannerSchema);

const bannerValidation = Joi.object({
  image: Joi.string().required().messages({
    'string.base': 'Image must be a string',
    'any.required': 'Image is required'
  }),
  bannerType: Joi.string().required().messages({
    'string.base': 'BannerType must be a string',
    'any.required': 'BannerType is required'
  }),
  productId: Joi.string().optional().messages({
    'string.base': 'Product ID must be a string',
  }),
  isDelete: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true)
});

const bannerIdValidation = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'string.base': 'Banner ID must be a string',
      'any.required': 'Banner ID is required'
    })
});

const bannerActiveValidation = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'string.base': 'Banner ID must be a string',
      'any.required': 'Banner ID is required'
    }),
  image: Joi.string()
    .required()
    .messages({
      'string.base': 'image must be a string',
      'any.required': 'image is required',
    }),
  bannerType: Joi.string().required().messages({
    'string.base': 'BannerType must be a string',
    'any.required': 'BannerType is required'
  }),
});


const shopBannerSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'products' },
  deskimage: { type: String, required: true },
  mobileImage: { type: String, required: true },
  isDelete: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const shopBannerModel = model('shop_banners', shopBannerSchema);


const shopBannerValidation = Joi.object({
  deskimage: Joi.string().required().messages({
    'string.base': 'deskimage must be a string',
    'any.required': 'deskimage is required',
  }),
  mobileImage: Joi.string().required().messages({
    'string.base': 'mobileImage must be a string',
    'any.required': 'mobileImage is required',
  }),
  productId: Joi.string().optional().messages({
    'string.base': 'Product ID must be a string',
  }),
  isDelete: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});


export default {
  bannerModel,
  bannerValidation,
  bannerIdValidation,
  bannerActiveValidation,

  shopBannerModel,
  shopBannerValidation,
};

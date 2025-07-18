import Joi from 'joi';
import mongoose, { model } from 'mongoose';
const { Schema } = mongoose;

const userRegisterSchema = new Schema({
    fname: { type: String, required: true },
    lname: { type: String, default: "" },
    email: { type: String, required: true },
    mobile: { type: String, default: "" },
    password: { type: String, default: "" },
    gender: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    country: { type: String, default: "", },
    streetAddress: { type: [String], default: "", },
    state: { type: String, default: "", },
    city: { type: String, default: "", },
    pincode: { type: Number, default: "", },
    fcm: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    role: { type: String, required: true, default: "user" }
}, { timestamps: true });

const userModel = model('users', userRegisterSchema);

const userRegisterValidation = Joi.object({
    fname: Joi.string().required().messages({
        'string.base': 'First name must be a string',
        'string.empty': 'First name is required',
        'any.required': 'First name is required'
    }),
    lname: Joi.string().optional().messages({
        'string.base': 'Last name must be a string',
    }),
    email: Joi.string().email().trim().lowercase().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    mobile: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': 'Please provide a valid mobile number',
    }),
    password: Joi.string().min(6).max(30).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
    }),
    country: Joi.string().optional().messages({
        'string.base': 'country must be a string',
    }),
    streetAddress: Joi.array()
        .items(
            Joi.string().messages({
                'string.base': 'Each item in streetAddress must be a string',
            })
        )
        .optional()
        .messages({
            'array.base': 'streetAddress must be an array of strings',
        }),
    state: Joi.string().optional().messages({
        'string.base': 'state must be a string',
    }),
    city: Joi.string().optional().messages({
        'string.base': 'state must be a string',
    }),
    pincode: Joi.number().optional().messages({
        'string.base': 'state must be a string',
    }),
    gender: Joi.string().optional(),
    isActive: Joi.boolean().default(true),
});


const userLoginValidation = Joi.object({
    email: Joi.string().email().trim().lowercase().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).max(30).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
    }),
    fcm: Joi.string().optional(),
    isActive: Joi.boolean().default(true)
});

const googleOAuthValidation = Joi.object({
    code: Joi.string().trim().required().messages({
        'string.empty': 'Authorization code is required',
        'string.email': 'Please provide a valid Authorization code',
        'any.required': 'Authorization code is required'
    }),
});

const subscribeUserSchema = new Schema({
    email: { type: String, required: true },
    isRegistered: { type: Boolean },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const subscribeUserModel = model('subscribe_users', subscribeUserSchema);

const subscribeUserValidation = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required.',
        'string.email': 'Invalid email format.'
    }),
    isActive: Joi.boolean().optional(),
});

const emailShopNowButtonSchema = new Schema({
    url: { type: String, required: true },
    image: { type: [String], default: [] },
    for: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const shopNowEmailButtonModel = model('email_sends', emailShopNowButtonSchema);


const changePasswordValidation = Joi.object({
    oldPassword: Joi.string().min(6).max(30).required().messages({
        'string.empty': 'oldPassword is required',
        'string.min': 'oldPassword must be at least 6 characters',
        'any.required': 'oldPassword is required'
    }),
    newPassword: Joi.string().min(6).max(30).required().messages({
        'string.empty': 'newPassword is required',
        'string.min': 'newPassword must be at least 6 characters',
        'any.required': 'newPassword is required'
    }),
});

const forgetEmailValidation = Joi.object({
    email: Joi.string().email().trim().lowercase().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
});

export default {
    userModel,
    userRegisterValidation,
    userLoginValidation,
    googleOAuthValidation,
    subscribeUserModel,
    subscribeUserValidation,

    shopNowEmailButtonModel,

    changePasswordValidation,
    forgetEmailValidation
};

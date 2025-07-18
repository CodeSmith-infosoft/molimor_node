import mongoose, { model } from 'mongoose';
import Joi from 'joi';
const { Schema } = mongoose;

const orderNotificationSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'orders' },
    isMark: { type: Boolean, default: false },
}, { timestamps: true });

const orderNotificationModel = model('notifications', orderNotificationSchema);

const orderNotificationValidation = Joi.object({
    notificationIds: Joi.array()
        .items(Joi.string().required().messages({
            'string.base': 'Each Notification ID must be a string',
            'string.empty': 'Notification ID cannot be empty',
            'any.required': 'Notification ID is required',
        })
        ).min(1).required().messages({
            'array.base': 'Notification IDs must be an array',
            'array.min': 'At least one Notification ID is required',
            'any.required': 'Notification IDs are required',
        }),
});

export default {
    orderNotificationModel,
    orderNotificationValidation
};



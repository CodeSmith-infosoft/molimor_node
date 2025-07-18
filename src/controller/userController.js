import model from '../model/userModel.js';
const { userModel, userRegisterValidation, userLoginValidation, googleOAuthValidation, subscribeUserModel, subscribeUserValidation, shopNowEmailButtonModel, changePasswordValidation, forgetEmailValidation } = model
import auth from "../middeleware/auth.js";
const { generateJWToken, forgetPasswordJWToken, checkPasswordJWToken } = auth;
import response from '../utils/response.js';
import { hash, compare } from 'bcrypt';
import axios from 'axios';
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;
import sendMail from '../../mailer/index.js';
import orderMdl from '../model/orderModel.js';
const { orderModel } = orderMdl;

export async function register(req, res) {
    const { fname, email, password } = req.body;
    const { error } = userRegisterValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const userExists = await userModel.findOne({ email });
        if (userExists?.email) {
            return response.error(res, req?.languageCode, resStatusCode.CONFLICT, resMessage.USER_FOUND, {});
        };
        const hashedPassword = await hash(password, 10);
        const createNewUser = new userModel({
            ...req.body,
            password: hashedPassword
        });
        await createNewUser.save();
        const getEmailShopNowButton = await shopNowEmailButtonModel?.findOne({ isActive: true, for: "welcomeEmail" });

        sendMail("welcome-mail", "Welcome to Molimor Store", email, {
            productImage1: getEmailShopNowButton?.image[0], // process.env.BASE_URL + "/aboutusImage/" + getEmailShopNowButton?.image[0],
            productImage2: getEmailShopNowButton?.image[1], //process.env.BASE_URL + "/aboutusImage/" + getEmailShopNowButton?.image[1],
            shopNow: getEmailShopNowButton?.url,
            base_URL: process.env.BASE_URL
        });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_REGISTER, { _id: createNewUser._id });
    } catch (error) {
        console.error(error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function login(req, res) {
    const { email, password } = req.body;
    const { error } = userLoginValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const user = await userModel.findOne({ email, isActive: true });
        if (!user) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_ACCOUNT_NOT_FOUND, {});
        };
        const validPassword = await compare(password, user.password);
        if (!validPassword) {
            return response.error(res, req.languageCode, resStatusCode.UNAUTHORISED, resMessage.INCORRECT_PASSWORD, {});
        };
        const token = await generateJWToken({ id: user._id, role: 'user' });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.LOGIN_SUCCESS, { _id: user._id, token: token });
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function adminLogin(req, res) {
    const { email, password, fcm } = req.body;
    const { error } = userLoginValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const user = await userModel.findOne({ email: email, isActive: true, role: 'admin' });
        if (!user) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_ACCOUNT_NOT_FOUND, {});
        };
        const validPassword = await compare(password, user.password);
        if (!validPassword) {
            return response.error(res, req.languageCode, resStatusCode.UNAUTHORISED, resMessage.USER_ACCOUNT_NOT_FOUND, {});
        };
        await userModel.findByIdAndUpdate(user._id, { $set: { fcm } }, { new: true });
        const token = await generateJWToken({ id: user._id, role: 'admin' });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.LOGIN_SUCCESS, { _id: user._id, token: token });
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function profile(req, res) {
    try {
        const user = await userModel.findById({ _id: req.user.id }).select('-password');
        if (!user) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        };
        // const updatedUser = {
        //     ...user._doc,
        //     profilePhoto: user?.profilePhoto ? `/userProfile/${user?.profilePhoto}` : null
        // };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.RETRIEVE_PROFILE_SUCCESS, user);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function updateProfile(req, res) {
    try {
        const { fname, lname, mobile, gender, country, state, pincode, city, streetAddress } = req.body;
        console.log('req?.uploadedImages', req?.uploadedImages)
        const image = req?.uploadedImages[0]?.s3Url || "";

        const user = await userModel.findById({ _id: req.user.id });
        const updatedUser = await userModel.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    fname: fname ?? user?.fname,
                    lname: lname ?? user?.lname,
                    mobile: mobile ?? user?.mobile,
                    gender: gender ?? user?.gender,
                    country: country ?? user?.country,
                    streetAddress: streetAddress ?? user?.streetAddress,
                    state: state ?? user?.state,
                    city: city ?? user?.city,
                    pincode: pincode ?? user?.pincode,
                    profilePhoto: image ?? user?.profilePhoto,
                }
            },
            { new: true, runValidators: true }
        );
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_PROFILE_UPDATED, updatedUser);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getGoogleOAuthUrl(req, res) {
    try {
        const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URL}&scope=openid%20email%20profile`;
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.GOOGLE_OAUTH_URL_GENERATED, { url: redirectUrl });
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function googleOAuthLogin(req, res) {
    const { code } = req.body;

    const { error } = googleOAuthValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    const decodedCode = decodeURIComponent(code);
    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code: decodedCode,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URL,
            grant_type: 'authorization_code'
        });
        const { access_token } = tokenResponse.data;

        const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });
        const user = userInfoResponse.data;
        let createNewUser = await userModel.findOne({ email: user.email })
        if (!createNewUser) {
            let createNewUser = new userModel({
                fname: user.given_name,
                lname: user.family_name,
                email: user.email,
                profilePhoto: user.picture,
            });
            await createNewUser.save();
        };
        let token = await generateJWToken({ id: createNewUser._id });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.GOOGLE_AUTH_SUCCESS, { _id: createNewUser._id, token: token });
    } catch (error) {
        if (error.response?.data?.error === 'invalid_grant' || error.response?.data?.error_description === 'Bad Request') {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.AUTHORIZATION_CODE_EXPIRED, {});
        };
        console.error('Google signup error:', error.response?.data?.error);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getFacebookOAuthUrl(req, res) {
    try {
        const redirectUrl = `https://www.facebook.com/v13.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&scope=email`;
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, 'Facebook OAuth URL generated successfully. Please proceed with the login process', { url: redirectUrl });
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function facebookOAuthLogin(req, res) {
    // try {
    const code = req.body.code;

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code.' });
    };
    const tokenResponse = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token?', {
        params: {
            client_id: process.env.FACEBOOK_APP_ID,
            redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            code: code,
        },
    });

    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
            access_token
        },
    });

    const userData = userResponse.data;

    return res.status(200).json({
        id: userData.id,
        name: userData.name,
        email: userData.email,
    });
};

export async function getUserById(req, res) {
    const id = req.params.id;
    try {
        const user = await userModel.findById(id).select('-password');
        if (!user) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        };
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const monthlyOrderCount = await orderModel.countDocuments({ userId: user._id, createdAt: { $gte: startOfMonth, $lte: today } });

        const orderCount = await orderModel.countDocuments({ userId: user._id });
        const updatedUser = {
            ...user._doc,
            monthlyOrderCount: monthlyOrderCount,
            orderCount: orderCount,
            profilePhoto,
            // profilePhoto: user.profilePhoto ? `/userProfile/${user.profilePhoto}` : null
        };
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USERS_FETCHED, updatedUser);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};


export async function updateUserById(req, res) {
    const id = req.params.id;
    const updateData = req.body;
    try {
        const updatedUser = await userModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');

        if (!updatedUser) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        };
        return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_PROFILE_UPDATED, updatedUser);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function inActiveUserById(req, res) {
    const id = req.params.id;
    const isActive = req.body.isActive;
    try {
        const inActiveUser = await userModel.findByIdAndUpdate(id, { isActive: isActive }, { new: true, runValidators: true }).select('-password');
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_INACTIVE, inActiveUser);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllUsers(req, res) {
    try {
        const users = await userModel.find({ role: "user" }).select("-password");

        if (!users || users?.length === 0) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        };
        const usersWithOrderCount = await Promise.all(
            users.map(async (user) => {
                const orderCount = await orderModel.countDocuments({ userId: user?._id });
                const userObj = user.toObject();

                // userObj.profilePhoto = userObj.profilePhoto
                //     ? `/userProfile/${userObj.profilePhoto}`
                //     : "";

                return {
                    ...userObj,
                    orderCount,
                };
            }),
        );
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USERS_FETCHED, usersWithOrderCount);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function addSubscribeUser(req, res) {
    const { email } = req.body;

    const { error } = subscribeUserValidation.validate({ email });
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const existingUser = await userModel.findOne({ email });
        const isRegistered = !!existingUser;

        const userSubscribe = await subscribeUserModel.findOne({ email });
        let newSubscriber;
        if (!userSubscribe) {
            newSubscriber = new subscribeUserModel({
                email,
                isRegistered
            });
            await newSubscriber.save();
        };
        const getEmailShopNowButton = await shopNowEmailButtonModel?.findOne({ isActive: true, for: "subscribeEmail" });

        sendMail("subscribeEmail", "Thanks for Joining Molimor - You're Officially In", email, {
            productImage1: getEmailShopNowButton?.image[0], //process.env.BASE_URL + "/aboutusImage/" + getEmailShopNowButton?.image[0],
            productImage2: getEmailShopNowButton?.image[1], //process.env.BASE_URL + "/aboutusImage/" + getEmailShopNowButton?.image[1],
            shopNow: getEmailShopNowButton?.url,
        });

        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_SUBSCRIBE_SUCCESS, newSubscriber);
    } catch (err) {
        console.error(err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllSubscribedUsers(req, res) {
    try {
        const filter = {};
        if (req.query.isRegistered !== undefined) {
            filter.isRegistered = req.query.isRegistered === 'true';
        };
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [subscribers, totalCount] = await Promise.all([
            subscribeUserModel.find(filter).skip(skip).limit(limit),
            subscribeUserModel.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(totalCount / limit);

        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USERS_FETCHED,
            {
                page: page || 0,
                limit: limit || 0,
                totalRecords: totalCount,
                totalPages: totalPages || 0,
                records: subscribers || []
            }
        );
    } catch (err) {
        console.error(err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function addEmailShopNowButton(req, res) {
    const { url } = req.body;
    const images = req.files.image;
    try {
        let newSubscriber;
        const dataExist = await shopNowEmailButtonModel.findOne({ isActive: true, for: "welcomeEmail" });

        const newImageFilenames = images.map(img => img.filename);

        if (!dataExist) {
            const existingImages = dataExist[0].image || [];

            let combinedImages = [...existingImages, ...newImageFilenames];

            combinedImages = combinedImages.slice(-2);

            newSubscriber = await shopNowEmailButtonModel.findOneAndUpdate({ isActive: true, for: "welcomeEmail" }, {
                url,
                image: combinedImages
            }, { new: true });
        } else {
            newSubscriber = await shopNowEmailButtonModel.create({
                url,
                image: newImageFilenames.slice(0, 2)
            });
        };

        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_SUBSCRIBE_SUCCESS, newSubscriber);
    } catch (err) {
        console.error(err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function addsubscribeEmailTemp(req, res) {
    const { url } = req.body;
    const images = req.files.image;
    try {
        let newSubscriber;
        const dataExist = await shopNowEmailButtonModel.findOne({ isActive: true, for: "subscribeEmail" });
        const newImageFilenames = images.map(img => img.filename);

        if (dataExist !== null) {
            const existingImages = dataExist[0]?.image || [];;
            let combinedImages = [...existingImages, ...newImageFilenames];
            combinedImages = combinedImages.slice(-2);

            newSubscriber = await shopNowEmailButtonModel.findOneAndUpdate({ isActive: true, for: "subscribeEmail" }, {
                url,
                image: combinedImages
            }, { new: true });

        } else {
            newSubscriber = await shopNowEmailButtonModel.create({
                url,
                image: newImageFilenames.slice(0, 2),
                for: "subscribeEmail"
            });
        };
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_SUBSCRIBE_SUCCESS, newSubscriber);
    } catch (err) {
        console.error(err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getEmailShopNowButton(req, res) {
    try {
        const getEmailShopNowButton = await shopNowEmailButtonModel.findOne({ isActive: true });
        const resData = {
            image1: getEmailShopNowButton.image[0], // process.env.BASE_URL + "/aboutusImage/" + getEmailShopNowButton.image[0],
            image2: getEmailShopNowButton.image[1], //process.env.BASE_URL + "/aboutusImage/" + getEmailShopNowButton.image[1],
            url: getEmailShopNowButton.url,
        };
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.USER_SUBSCRIBE_SUCCESS, resData);
    } catch (err) {
        console.error(err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function downloadSubscribedUsersCSV(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};

        const start = startDate && !isNaN(Date.parse(startDate)) ? new Date(startDate) : undefined;
        const end = endDate && !isNaN(Date.parse(endDate)) ? new Date(endDate) : undefined;

        if (start || end) {
            filter.createdAt = {};
            if (start) filter.createdAt.$gte = start;
            if (end) filter.createdAt.$lte = end;
        };

        const subscribers = await subscribeUserModel.find(filter).lean();

        if (!subscribers.length) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_LIST_FOUND, {});
        };
        const pad = (value = '', length = 30) => {
            value = value.toString();
            return value.length > length ? value.slice(0, length - 3) + '...' : value.padEnd(length, ' ');
        };

        const formatDate = (date) => {
            if (!date) return ''.padEnd(35, ' ');
            const d = new Date(date);
            return d.toISOString().slice(0, 19).replace('T', ' ').padEnd(35, ' ');
        };

        let table =
            pad('Email', 30) +
            pad('Is Registered', 20) +
            pad('Created At', 35) +
            '\n';

        table += '-'.repeat(85) + '\n';

        subscribers.forEach(user => {
            table +=
                pad(user.email || '', 30) +
                pad(user.isRegistered ? 'Yes' : 'No', 20) +
                formatDate(user.createdAt) +
                '\n';
        });
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="subscribers_${Date.now()}.txt"`);
        return res.status(200).send(table);
    } catch (err) {
        console.error('CSV Download Error:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function downloadUsersCSV(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const filter = { role: "user" };
        if (startDate || endDate) {
            const createdAtFilter = {};
            if (startDate && !isNaN(Date.parse(startDate))) {
                createdAtFilter.$gte = new Date(startDate);
            };
            if (endDate && !isNaN(Date.parse(endDate))) {
                createdAtFilter.$lte = new Date(endDate);
            };
            if (Object.keys(createdAtFilter).length > 0) {
                filter.createdAt = createdAtFilter;
            };
        };

        const users = await userModel.find(filter).select("-password");

        if (!users.length) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.NO_LIST_FOUND, {});
        };

        const usersWithOrderCount = await Promise.all(
            users.map(async (user) => {
                const orderCount = await orderModel.countDocuments({ userId: user._id });
                const userObj = user.toObject();

                return {
                    Name: [userObj.fname, userObj.lname].filter(Boolean).join(' ') || '',
                    Email: userObj.email || '',
                    Phone: userObj.phone || '',
                    Profile_Photo: userObj.profilePhoto,
                    // Profile_Photo: userObj.profilePhoto ? `/userProfile/${userObj.profilePhoto}` : '',
                    Created_At: userObj.createdAt
                        ? new Date(userObj.createdAt).toISOString().replace('T', ' ').substring(0, 19)
                        : '',
                    Total_Orders: orderCount || 0,
                };
            })
        );
        const columns = [
            { key: 'Name', width: 25 },
            { key: 'Email', width: 30 },
            { key: 'Phone', width: 15 },
            { key: 'Profile_Photo', width: 60 },
            { key: 'Created_At', width: 25 },
            { key: 'Total_Orders', width: 15 }
        ];
        const pad = (str, length) => {
            const s = str?.toString() || '';
            if (s.length > length) return s.slice(0, length - 3) + '...';
            return s.padEnd(length, ' ');
        };
        let csv = columns.map(c => pad(c.key, c.width)).join(' ') + '\n';

        const totalWidth = columns.reduce((acc, c) => acc + c.width, 0) + (columns.length - 1);
        csv += '-'.repeat(totalWidth) + '\n';

        usersWithOrderCount.forEach(user => {
            const row = columns.map(c => pad(user[c.key] ?? '', c.width)).join(' ');
            csv += row + '\n';
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.txt"`);
        return res.status(200).send(csv);
    } catch (err) {
        console.error('CSV Download Error:', err);
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function changePassword(req, res) {
    const { oldPassword, newPassword } = req.body;
    const { error } = changePasswordValidation.validate(req.body);
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const userId = req.user._id;
        const user = await userModel.findById(userId);
        if (!user) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_ACCOUNT_NOT_FOUND);
        };
        const isPasswordMatch = await compare(oldPassword, user.password);
        if (!isPasswordMatch) {
            return response.error(res, req.languageCode, resStatusCode.UNAUTHORISED, resMessage.INCORRECT_PASSWORD, {});
        };
        const hashedPassword = await hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PASSWORD_CHANGED);
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function forgetEmail(req, res) {
    const { email } = req.body;
    console.log(email)
    const { error } = forgetEmailValidation.validate(req.body);
    console.log('error', error)
    if (error) {
        return response.error(res, req.languageCode, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const user = await userModel.findOne({ email, isActive: true });
        if (!user) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_ACCOUNT_NOT_FOUND, {});
        };
        const token = await forgetPasswordJWToken({ id: user._id, role: 'user' });
        sendMail("forgetPassword", "Reset Your Password – Molimor Store", email, {
            name: user.fname,
            forgetUrl: `${process.env.FRONTEND__BASE_URL}/change-password?token=${token}`,
            base_URL: process.env.BASE_URL
        });
        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.FORGET_PASSWORD_EMAIL_SENT, {});
    } catch (err) {
        console.error(err);
        return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function resetPassword(req, res) {
    const { token } = req.query;
    const { password } = req.body;
    try {
        const decoded = await checkPasswordJWToken(token);
        if (!decoded || !decoded.userId) {
            return response.error(res, req.languageCode, resStatusCode.UNAUTHORISED, resMessage.RESET_PASSWORD);
        };
        const user = await userModel.findById(decoded.userId);
        if (!user) {
            return response.error(res, req.languageCode, resStatusCode.FORBIDDEN, resMessage.USER_ACCOUNT_NOT_FOUND);
        };
        const hashedPassword = await hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        return response.success(res, req.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.PASSWORD_RESET_SUCCESS, {});
    } catch (err) {
        console.error(err);
        if (err.name === 'TokenExpiredError') {
            return response.error(res, req.languageCode, resStatusCode.UNAUTHORISED, resMessage.RESET_PASSWORD);
        };
        return response.error(res, req.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR);
    };
};

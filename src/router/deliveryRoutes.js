import { Router } from 'express';
const router = Router();
import { checkCourierServiceability } from '../controller/deliveryController.js';
import { saveUserProfile, aboutusImage } from '../utils/multerStorage.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;

router.post('/checkCourierServiceability', checkCourierServiceability);

export default router;
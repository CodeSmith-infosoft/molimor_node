import { Router } from 'express';
const router = Router();
import { addBanner, getAllBanner, adminGetAllBanner, deleteBannerById, updateBannerById, addBannerForShopNow, getAllBannerForShopNow, deleteShopNowBannerById } from '../controller/bannerController.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;
import { uploadBannerImages, bannerImage } from "../utils/multerStorage.js";

router.post('/admin/addBanner', bannerImage, validateAccessToken, authorizeRoles("admin"), addBanner); // admin
router.get('/getAllBanner', getAllBanner);  // user

router.get('/admin/adminGetAllBanner', validateAccessToken, authorizeRoles("admin"), adminGetAllBanner);  // admin
router.delete('/admin/deleteBannerById/:id', validateAccessToken, authorizeRoles("admin"), deleteBannerById); // admin
router.put('/admin/updateBannerById/:id', bannerImage, validateAccessToken, authorizeRoles("admin"), updateBannerById); // admin

router.post('/admin/addBannerForShopNow', uploadBannerImages, validateAccessToken, authorizeRoles("admin"), addBannerForShopNow); // admin
router.get('/getAllBannerForShopNow', getAllBannerForShopNow); // admin
router.delete('/admin/deleteShopNowBannerById', validateAccessToken, authorizeRoles("admin"), deleteShopNowBannerById); // admin

export default router;
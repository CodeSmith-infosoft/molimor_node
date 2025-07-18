import { Router } from 'express';
const router = Router();
import { addMedia, addVideoUrl, adminGetAllMedia, getAllMedia, deleteMediaById, inActiveMediaById, addMarketPlace, getMarketPlace, addInstaShop, getAllInstaShop, updateMarketPlace, deleteMarketPlace, updateInstaShop, deleteInstaShop } from '../controller/mediaController.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;
import { mediaFile, marketPlacePhotos, instaShopImage } from "../utils/multerStorage.js";


router.post('/admin/addMedia', mediaFile, validateAccessToken, authorizeRoles("admin"), addMedia); // admin
router.post('/admin/addVideoUrl', validateAccessToken, authorizeRoles("admin"), addVideoUrl); // admin

router.get('/admin/getAllMedia/:type', validateAccessToken, authorizeRoles("admin"), adminGetAllMedia); // admin
router.get('/getAllMedia/:type', getAllMedia); // user

router.delete('/admin/deleteMediaById/:id', validateAccessToken, authorizeRoles("admin"), deleteMediaById); // admin
router.put('/admin/inActiveMediaById/:id', validateAccessToken, authorizeRoles("admin"), inActiveMediaById); // admin

router.post("/admin/addMarketPlace", marketPlacePhotos.single('image'), validateAccessToken, authorizeRoles('admin'), addMarketPlace); // admin 
router.get("/getMarketPlace", getMarketPlace);  // user
router.put("/admin/updateMarketPlace/:id", marketPlacePhotos.single('image'), validateAccessToken, authorizeRoles('admin'), updateMarketPlace);  // user
router.delete("/admin/deleteMarketPlace/:id", validateAccessToken, authorizeRoles('admin'), deleteMarketPlace);  // user

// insta shop
router.post('/admin/addInstaShop', instaShopImage, validateAccessToken, authorizeRoles("admin"), addInstaShop); // admin
router.get('/getAllInstaShop', getAllInstaShop); // user
router.put("/admin/updateInstaShop/:id", instaShopImage, validateAccessToken, authorizeRoles('admin'), updateInstaShop);  // user
router.delete("/admin/deleteInstaShop/:id", validateAccessToken, authorizeRoles('admin'), deleteInstaShop);  // user


export default router;

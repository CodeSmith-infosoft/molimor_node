import { Router } from 'express';
const router = Router();
import { addSingleProduct, getAllProductsList, getAllAdminProductsList, getProductById, updateSingleProduct, deleteProductById, searchProduct, downloadAddBulkProductTemplate, uploadBulkProductsFile, getPopularProductList, getBigSalesProducts, toggleActiveStateById } from '../controller/productController.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;
import { productImage, uploadExcelFile } from '../utils/multerStorage.js';

router.post('/admin/addSingleProduct', productImage, validateAccessToken, authorizeRoles("admin"), addSingleProduct); // admin
router.get('/getAllProductsList', getAllProductsList); // user
router.get('/admin/getAllProductsList', validateAccessToken, getAllAdminProductsList); // admin
router.get('/getProduct', getProductById);  // both
router.put('/admin/updateProduct/:id', productImage, validateAccessToken, authorizeRoles("admin"), updateSingleProduct); // admin
router.put('/admin/toggleActiveStateById/:id', validateAccessToken, authorizeRoles("admin"), toggleActiveStateById); // admin
router.delete('/admin/deleteProduct/:id', validateAccessToken, authorizeRoles("admin"), deleteProductById); // admin
// router.put('/admin/inActiveProduct/:id', validateAccessToken, authorizeRoles("admin"), inActiveProductById); // admin


router.get('/searchProduct', searchProduct); // user 
router.get('/downloadAddBulkProductTemplate', validateAccessToken, authorizeRoles("admin"), downloadAddBulkProductTemplate); // admin
router.post('/uploadBulkProductsFile', [uploadExcelFile.single('file'),], validateAccessToken, authorizeRoles("admin"), uploadBulkProductsFile); // admin

router.get('/getPopularProductList', getPopularProductList); // user
router.get('/getBigSalesProducts', getBigSalesProducts); // user

export default router;
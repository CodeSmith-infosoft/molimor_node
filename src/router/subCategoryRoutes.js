import { Router } from 'express';
const router = Router();
import { addSubCategory, getSubCategoryList, getSubCategoryById, updateSubCategory, inActiveSubcategory, getActiveSubCategoryList } from '../controller/subCategoryController.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;
import { subCategoryImage } from '../utils/multerStorage.js';

router.post("/admin/addSubCategory", subCategoryImage, validateAccessToken, authorizeRoles("admin"), addSubCategory); // admin
router.get("/getSubCategoryList", validateAccessToken, authorizeRoles("admin"), getSubCategoryList); // admin
router.get("/getSubCategoryById/:id", validateAccessToken, getSubCategoryById); // both
router.put("/admin/updateSubCategory/:id", subCategoryImage, validateAccessToken, authorizeRoles("admin"), updateSubCategory); // admin
router.put("/admin/inActiveSubcategory/:id", validateAccessToken, authorizeRoles("admin"), inActiveSubcategory); // admin

router.get("/getActiveSubCategoryList", getActiveSubCategoryList); // user

export default router;

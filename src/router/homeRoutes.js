import { Router } from "express";
const router = Router();
import { getHomePage, exportHomePageCSV } from '../controller/homeController.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;

router.get("/admin/getHomePage", validateAccessToken, authorizeRoles('admin'), getHomePage);
router.get("/admin/exportHomePageCSV", validateAccessToken, authorizeRoles('admin'), exportHomePageCSV);


export default router;

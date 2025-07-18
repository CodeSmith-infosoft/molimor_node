import { Router } from "express";
const router = Router();
import { addAbout, getAbout } from '../controller/aboutController.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;
import { aboutusImage } from '../utils/multerStorage.js'

router.post("/addAbout", aboutusImage, validateAccessToken, authorizeRoles('admin'), addAbout);
router.get("/getAbout", getAbout);


export default router;

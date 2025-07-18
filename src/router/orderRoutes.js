import { Router } from 'express';
const router = Router();
import { placeOrder, getAllUserOrders, getOrderById, getAllOrders, updateOrderStatusByAdmin, assignOrderCourierPatner, downloadOrdersCSV, getOrderNotifications, deleteOrderNotification } from '../controller/orderController.js';
import auth from "../middeleware/auth.js";
const { validateAccessToken, authorizeRoles } = auth;

router.post('/placeOrder', validateAccessToken, placeOrder); // user
router.get('/getAllUserOrders', validateAccessToken, getAllUserOrders); // user
router.get('/getOrderById/:id', validateAccessToken, getOrderById); // both

router.get('/admin/getAllOrders', validateAccessToken, authorizeRoles('admin'), getAllOrders); // admin

router.get('/admin/updateOrderStatus', validateAccessToken, authorizeRoles('admin'), updateOrderStatusByAdmin); // admin 
router.get('/admin/assignOrderCourierPatner', validateAccessToken, authorizeRoles('admin'), assignOrderCourierPatner); // admin 
router.get('/admin/downloadOrdersCSV', validateAccessToken, authorizeRoles('admin'), downloadOrdersCSV); // admin 
router.get('/admin/getOrderNotifications', validateAccessToken, authorizeRoles('admin'), getOrderNotifications); // admin 
router.put('/admin/deleteOrderNotification', validateAccessToken, authorizeRoles('admin'), deleteOrderNotification); // admin 

export default router;
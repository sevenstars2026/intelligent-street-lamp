import { Router } from 'express';
import { ScenicController } from '../controllers/scenic.controller';

const router = Router();

router.get('/scenic/routes', ScenicController.getRoutes);
router.get('/scenic/spots', ScenicController.getSpots);
router.get('/scenic/events', ScenicController.getEvents);
router.get('/scenic/lamps', ScenicController.getLamps);

export default router;


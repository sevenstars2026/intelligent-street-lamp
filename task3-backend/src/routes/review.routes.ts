import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { requireReviewRole } from '../middleware/review-auth.middleware';

const router = Router();
router.get('/review/list', requireReviewRole, ReviewController.listReview);
router.get('/review/:id', requireReviewRole, ReviewController.getReview);
router.put('/review/:id/approve', requireReviewRole, ReviewController.approveReview);
router.put('/review/:id/reject', requireReviewRole, ReviewController.rejectReview);

export default router;

import express, { type Request, type Response } from 'express';

import authRouter from './modules/auth/authRouter.ts';

import adminRouter from './modules/admin/adminRouter.ts';

import userRouter from './modules/user/userRouter.ts';

import { userAuthenticator } from './middlewares/userAuth.middleware.ts';

import { adminAuthenticator } from './middlewares/adminAuth.middleware.ts';

const router = express.Router();

// Auth routes are here
router.use('/auth', authRouter);

// User routes are here
router.use('/user', userAuthenticator, userRouter);

// Admin routes are here
router.use('/admin', adminAuthenticator, adminRouter);

// Wild card route
router.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'API not found!' });
});

export default router;

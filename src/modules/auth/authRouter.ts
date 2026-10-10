import express, { type Request, type Response } from 'express';

const router = express.Router();

router.get('/user', (req: Request, res: Response) => {
    res.json({ "name": "nikhil", class: "BCA" });
});

export default router;

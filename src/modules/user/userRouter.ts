import express, { type Request, type Response } from 'express';

const router = express.Router();

router.get('/user', (req, res) => {
    res.json({ "name": "nikhil", class: "BCA" });
});

// Wild card route
router.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'API not found!' });
});

export default router;
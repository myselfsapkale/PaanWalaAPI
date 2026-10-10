import { type Request, type Response, type NextFunction } from 'express';

// Read JWT token from request and authenticate the API for admin
export const adminAuthenticator = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        next();

        const token = authHeader.split(' ')[1];

        // TODO: Verify JWT token here
        console.log(token);

        next();
    } else {
        res.status(401).json({
            message: 'Unauthorized: Bearer token missing'
        });
    }
};

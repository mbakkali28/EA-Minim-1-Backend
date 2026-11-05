import { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/User';
import RequestService from '../services/RequestService';

// Middleware que solo deja pasar a los usuarios con un rol concreto.
// Va siempre despues de VerifyToken, que es quien rellena req.user. Por ejemplo:
//
//     router.use('/exercises', VerifyToken, RequireRole('ADMIN'), exerciseRoutes);
//
// 401 (Unauthorized) quiere decir "no sé quién eres": no hay sesion.
// 403 (Forbidden) quiere decir "sé quién eres, pero no puedes hacer esto": falta el rol.
export const RequireRole = (role: UserRole) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Falta el token' });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ message: `Necesitas el rol ${role}` });
        }

        next();
    };
};

// Deja pasar al autor de la solicitud: para saber si quien
export const RequireOwnerOrAdmin = () => {
    return async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Falta el token' });
            }

            const isAdmin = req.user.role === 'ADMIN';

            const request = await RequestService.getRequestForAccess(req.params.requestId);

            if (!request || (request.isDeleted && !isAdmin)) {
                return res.status(404).json({ message: 'not found' });
            }

            if (!isAdmin && String(request.requester) !== req.user.id) {
                return res.status(403).json({ message: 'Solo el autor o un ADMIN pueden tocar esta solicitud' });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export default RequireRole;

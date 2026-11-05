import { NextFunction, Request, Response } from 'express';
import RequestService from '../services/RequestService';
import type { Viewer } from '../services/RequestService';

const viewerOf = (req: Request): Viewer => ({ id: req.user?.id ?? '', isAdmin: req.user?.role === 'ADMIN' });

const listRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await RequestService.listRequests(res.locals.query, viewerOf(req));

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Función para buscar una solicitud concreta a partir de su ID
const readRequest = async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
    const requestId = req.params.requestId;

    try {
        const request = await RequestService.getRequestById(requestId, viewerOf(req));

        // Comprobacion
        if (request) {
            res.status(200).json({ request });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para crear una solicitud nueva
const createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = await RequestService.createRequest(req.body, req.user!.id);

        res.status(201).json({ request });
    } catch (error) {
        next(error);
    }
};

export default { listRequests, readRequest, createRequest };

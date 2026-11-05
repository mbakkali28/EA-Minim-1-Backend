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

// Función para modificar los datos de una solicitud mientras sigue pendiente
const updateRequest = async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
    try {
        // El servicio decide si la solicitud se puede tocar: si no esta pendiente responde 409
        const request = await RequestService.updateRequest(req.params.requestId, req.body, viewerOf(req));

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

// Función para cambiar el estado de una solicitud y apuntar el paso en el historial
const changeStatus = async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
    try {
        const request = await RequestService.changeStatus(
            req.params.requestId,
            req.body.status,
            req.body.comment,
            viewerOf(req)
        );

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

// Función para soft-delete
const softDeleteRequest = async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
    try {
        const request = await RequestService.softDeleteRequest(req.params.requestId, viewerOf(req));

        if (request) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para hard-delete
const hardDeleteRequest = async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
    try {
        const request = await RequestService.hardDeleteRequest(req.params.requestId, viewerOf(req));

        if (request) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Borrado soft-delete de varias solicitudes.
const softDeleteManyRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deleted = await RequestService.softDeleteManyRequests(req.body.ids);

        res.status(200).json({ deleted });
    } catch (error) {
        next(error);
    }
};

// Borrado hard-delete de varias solcitudes.
const hardDeleteManyRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deleted = await RequestService.hardDeleteManyRequests(req.body.ids);

        res.status(200).json({ deleted });
    } catch (error) {
        next(error);
    }
};

export default {
    listRequests,
    readRequest,
    createRequest,
    updateRequest,
    changeStatus,
    softDeleteRequest,
    hardDeleteRequest,
    softDeleteManyRequests,
    hardDeleteManyRequests
};

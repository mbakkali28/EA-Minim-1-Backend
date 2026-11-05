import mongoose, { HydratedDocument } from 'mongoose';

import RequestModel, { IRequest, RequestStatus, RequestType } from '../models/Request';
import Workout from '../models/Workout';
import { buildPageInfo, buildSort, escapeRegex, getSkip } from '../utils/pagination';

export type NewRequest = Pick<IRequest, 'type' | 'subject' | 'workout'> & { description?: string; preferredDate?: Date };

export type Viewer = { id: string; isAdmin: boolean };

type RequestDocument = HydratedDocument<IRequest>;

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

// Crea una solicitud.
export const createRequest = async (data: NewRequest, requesterId: string): Promise<RequestDocument> => {
    const workoutId = new mongoose.Types.ObjectId(data.workout);

    const workout = await Workout.findOne({ _id: workoutId, isDeleted: false });

    if (!workout) {
        throw httpError(404, 'La rutina no existe');
    }

    const request = new RequestModel({
        ...data,
        workout: workoutId,
        requester: new mongoose.Types.ObjectId(requesterId),
        status: 'PENDING',
        // Pasa automaticamente al paso 1 al crearse.
        history: [{ status: 'PENDING', comment: 'Solicitud creada.', automatic: true, version: 1 }]
    });

    return request.save();
};


// Busca una solicitud por su id sin populate. Solo la usa el guard de acceso: necesita
// saber si la solicitud existe y de quien es antes de dejar pasar la peticion, pero no
// quiere traerse las relaciones solo para decidir un 404 o un 403.
export const getRequestForAccess = (requestId: string): Promise<RequestDocument | null> => {
    return RequestModel.findById(requestId);
};

const POPULATE_REQUEST = [
    { path: 'workout' },
    { path: 'requester', select: 'name email' },
    { path: 'history.by', select: 'name' }
];

// Busca una solicitud por su id.
export const getRequestById = (requestId: string, viewer: Viewer): Promise<RequestDocument | null> => {
    const query = viewer.isAdmin
        ? RequestModel.findById(requestId)
        : RequestModel.findOne({ _id: requestId, requester: viewer.id, isDeleted: false });

    return query.populate(POPULATE_REQUEST);
};

export type ListRequestsInput = {
    page: number;
    limit: number;
    search?: string;
    status?: RequestStatus;
    type?: RequestType;
    workout?: string;
    sort?: string;
    order?: 'asc' | 'desc';
};

// Devuelve una pagina de solicitudes.
export const listRequests = async (
    { page, limit, search, status, type, workout, sort, order }: ListRequestsInput,
    viewer: Viewer
) => {
    const filter: Record<string, unknown> = viewer.isAdmin ? {} : { isDeleted: false, requester: viewer.id };

    // Filtros
    if (status) {
        filter.status = status;
    }

    if (type) {
        filter.type = type;
    }

    if (workout) {
        filter.workout = workout;
    }

    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ subject: regex }, { description: regex }];
    }

    const [requests, total] = await Promise.all([
        RequestModel.find(filter)
            .sort(buildSort(sort, order, 'createdAt'))
            .skip(getSkip(page, limit))
            .limit(limit)
            .populate({ path: 'workout', select: 'name dayOfWeek' })
            .populate({ path: 'requester', select: 'name' }),
        RequestModel.countDocuments(filter)
    ]);

    return { requests, pagination: buildPageInfo(page, limit, total) };
};

export default {
    createRequest,
    getRequestForAccess,
    getRequestById,
    listRequests
};

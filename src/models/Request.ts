import mongoose, { Document, Schema } from 'mongoose';

// Tipos de solicitud que puede enviar un usuario sobre una rutina.
export const REQUEST_TYPES = ['RESERVA', 'INSCRIPCION', 'PETICION', 'INCIDENCIA'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface IRequestEvent {
    // Estado
    status: RequestStatus;

    // Motivo
    comment?: string;

    // Fecha
    at: Date;

    // Autor de la resolucion
    by?: mongoose.Types.ObjectId;

    // true si lo hizo el sistema y false si lo hizo una persona
    automatic: boolean;

    // Numero de paso
    version: number;
}

// Datos que puede tener
export interface IRequest {
    type: RequestType;

    subject: string;

    description?: string;

    // Fecha para la que se pide
    preferredDate?: Date;

    // Rutina sobre la que se hace la solicitud
    workout: mongoose.Types.ObjectId;

    // Usuario que la ha creado
    requester: mongoose.Types.ObjectId;

    status: RequestStatus;

    // Vector de pasos
    history: IRequestEvent[];

    isDeleted: boolean;

    deletedAt?: Date | null;
}

export interface IRequestModel extends IRequest, Document {}

const RequestEventSchema: Schema = new Schema(
    {
        status: { type: String, enum: REQUEST_STATUSES, required: true },

        comment: { type: String, trim: true, maxlength: 300 },

        at: { type: Date, default: Date.now },

        by: { type: Schema.Types.ObjectId, ref: 'User' },

        automatic: { type: Boolean, default: false },

        version: { type: Number, required: true, min: 1 }
    },
    {
        versionKey: false
    }
);

// Esquema que van a seguir en mongodb
const RequestSchema: Schema = new Schema(
    {
        type: { type: String, enum: REQUEST_TYPES, required: true },

        subject: { type: String, required: true, trim: true, maxlength: 100 },

        description: { type: String, trim: true, maxlength: 500 },

        preferredDate: { type: Date, default: null },

        workout: { type: Schema.Types.ObjectId, ref: 'Workout', required: true },

        requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        status: { type: String, enum: REQUEST_STATUSES, default: 'PENDING' },

        history: { type: [RequestEventSchema], default: [] },

        isDeleted: { type: Boolean, default: false },

        deletedAt: { type: Date, default: null }
    },
    {
        timestamps: true,

        versionKey: false
    }
);

RequestSchema.index({ requester: 1, isDeleted: 1, createdAt: -1 });

RequestSchema.index({ isDeleted: 1, status: 1, type: 1 });

RequestSchema.index({ workout: 1 });

export default mongoose.model<IRequestModel>('Request', RequestSchema);

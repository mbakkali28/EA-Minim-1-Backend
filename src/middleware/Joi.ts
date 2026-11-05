import Joi, { ObjectSchema } from 'joi';

import { NextFunction, Request, Response } from 'express';

import { EXERCISE_CATEGORIES,  IExercise } from '../models/Exercise';
import { IRequest, REQUEST_STATUSES, REQUEST_TYPES } from '../models/Request';
import { DAYS_OF_WEEK,  IWorkout } from '../models/Workout';
import { IUser, USER_ROLES } from '../models/User';

// Funcion que se encarga de validar los datos que llegan en una petición
// Recibe un esquema de Joi y comprueba que el body cumple sus condiciones
export const ValidateJoi = (schema: ObjectSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Comprobamos que los datos del body cumplen el esquema
            await schema.validateAsync(req.body);

            // Si la validacion es correcta continuamos con la siguiente funcion
            next();
        } catch (error) {
            // Si los datos no son validos pasamos el error al siguiente middleware
            next(error);
        }
    };
};

// Un id de MongoDB tiene 24 caracteres hexadecimales
// Esta expresion nos sirve para comprobar que tiene el formato correcto
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// Parametros que comparten todos los listados: pagina, elementos por pagina y texto a buscar.
// Joi convierte los textos de la URL ("2") a numero (2) y rellena los valores por defecto.
const listQuery = {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().trim().max(100).allow('')
};

// Parametros para ordenar: la columna (solo las permitidas) y el sentido (asc o desc)
const sortQuery = (fields: string[]) => ({
    // La columna tiene que ser una de la lista
    sort: Joi.string().valid(...fields),
    // Si no se pone, ordena de menor a mayor
    order: Joi.string().valid('asc', 'desc').default('asc')
});

// Valida los parametros de la URL (?page=2&search=ana).
// En Express 5 req.query es de solo lectura, asi que dejamos el resultado ya
// validado y convertido en res.locals.query para que lo lea el controlador.
export const ValidateQuery = (schema: ObjectSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            res.locals.query = await schema.validateAsync(req.query);
            next();
        } catch (error) {
            // Joi lanza un error con details: el ErrorHandler lo convierte en un 422
            next(error);
        }
    };
};

// Funcion que comprueba el id que llega en los parametros de la URL
// Si no tiene el formato de un id de MongoDB devolvemos un error 400
export const ValidateId = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Cogemos el parametro de la URL usando el nombre que hemos recibido
        const id = req.params[paramName];

        // Comprobamos que existe y que tiene el formato correcto
        if (typeof id !== 'string' || !OBJECT_ID.test(id)) {
            // Si no es valido devolvemos un error de peticion incorrecta
            return res.status(400).json({ message: `${paramName} no es un id válido` });
        }

        // Si el id es correcto continuamos con la siguiente funcion
        next();
    };
};

// Cuerpo del borrado multiple: lista de ids de MongoDB, sin repetidos (maximo 100 de una vez)
const bulkIds = Joi.object({
    ids: Joi.array().items(Joi.string().pattern(OBJECT_ID)).min(1).max(100).unique().required()
});

// Aqui tenemos todos los esquemas de validacion que utilizamos en la aplicacion
export const Schemas = {
    // Borrado multiple (lo usan las tres entidades)
    bulkDelete: bulkIds,
        // Validaciones de los parametros de la URL de los listados
    query: {
        exercise: Joi.object({
            ...listQuery,
            category: Joi.string().valid(...EXERCISE_CATEGORIES),
            // Columnas por las que se pueden ordenar los ejercicios
            ...sortQuery(['name', 'category', 'sets', 'reps'])
        }),
        workout: Joi.object({
            ...listQuery,
            dayOfWeek: Joi.string().valid(...DAYS_OF_WEEK),
            // Columnas por las que se pueden ordenar las rutinas
            ...sortQuery(['name', 'description', 'dayOfWeek'])
        }),
        // Listado de solicitudes: el texto se combina con el estado, el tipo o la rutina
        request: Joi.object({
            ...listQuery,
            status: Joi.string().valid(...REQUEST_STATUSES),
            type: Joi.string().valid(...REQUEST_TYPES),
            workout: Joi.string().regex(OBJECT_ID),
            ...sortQuery(['subject', 'status', 'type', 'preferredDate', 'createdAt']),
            // En las solicitudes lo natural es ver primero las mas nuevas
            order: Joi.string().valid('asc', 'desc').default('desc')
        }),
        user: Joi.object({
            ...listQuery,
            // Los usuarios solo se pueden ordenar por nombre
            ...sortQuery(['name'])
        })
    },
    // Validaciones de las rutas de autenticacion
    auth: {
        // Registro: nombre, email y contraseña.
        // No se acepta role: si alguien lo envia, Joi lo rechaza porque no esta en el esquema.
        // Asi nadie puede registrarse a si mismo como admin; todo usuario nuevo es user.
        register: Joi.object<IUser>({
            name: Joi.string().trim().required().example('Ana'),
            email: Joi.string().email().required().example('ana@example.com'),
            password: Joi.string().min(8).required().example('seminari7')
        }),

        // Login: el email y la contraseña. Aqui no se comprueba la longitud de la contraseña:
        // si es incorrecta, el servidor responde 401 igualmente
        login: Joi.object<IUser>({
            email: Joi.string().email().required().example('admin@example.com'),
            password: Joi.string().required().example('seminari7')
        }),

        // Refresh: el refresh token que se recibio al hacer login
        refresh: Joi.object<{ refreshToken: string }>({
            refreshToken: Joi.string().required()
        })
    },

    // Validaciones relacionadas con los ejercicios
    exercise: {
        // Esquema que se utiliza cuando queremos crear un ejercicio
        create: Joi.object<IExercise>({
            // El nombre es obligatorio y debe ser un texto
            name: Joi.string().trim().required().example('Press de banca'),

            // La categoria es obligatoria y solo puede ser una de las permitidas
            category: Joi.string().valid(...EXERCISE_CATEGORIES).required().example('CHEST'),

            // Las series son opcionales y no pueden ser negativas
            sets: Joi.number().integer().min(0).example(4),

            // Las repeticiones tambien son opcionales y no pueden ser negativas
            reps: Joi.number().integer().min(0).example(10)
        }),

        // Esquema que se utiliza para actualizar un ejercicio
        update: Joi.object<IExercise>({
            // Estos campos son obligatorios tambien al actualizar
            name: Joi.string().trim().required(),
            category: Joi.string().valid(...EXERCISE_CATEGORIES).required(),

            // El resto de campos son opcionales
            sets: Joi.number().integer().min(0),
            reps: Joi.number().integer().min(0)
        })
    },

    // Validaciones relacionadas con las rutinas
    workout: {
        // Esquema que se utiliza cuando queremos crear una rutina
        create: Joi.object<IWorkout>({
            // El nombre es obligatorio
            name: Joi.string().trim().required().example('Dia de pecho'),

            // La descripcion es opcional y puede ser un string vacio
            description: Joi.string().allow('').optional().example('Rutina corta para el gimnasio'),

            // El dia de la semana es obligatorio y solo puede ser uno de los permitidos
            dayOfWeek: Joi.string().valid(...DAYS_OF_WEEK).required().example('MONDAY'),

            // Los ejercicios son opcionales y cada uno tiene que ser un id valido de MongoDB
            exercises: Joi.array().items(Joi.string().regex(OBJECT_ID)).example(['6ab2d1ad9ada2730451295a7'])
        }),

        // Esquema que se utiliza para actualizar una rutina
        update: Joi.object<IWorkout>({
            // Estos campos son obligatorios tambien al actualizar
            name: Joi.string().trim().required(),
            dayOfWeek: Joi.string().valid(...DAYS_OF_WEEK).required(),

            // El resto de campos son opcionales
            description: Joi.string().allow('').optional(),
            exercises: Joi.array().items(Joi.string().regex(OBJECT_ID))
        })
    },

    // Validaciones relacionadas con las solicitudes sobre rutinas
    request: {
        // Alta de una solicitud
        create: Joi.object<IRequest>({
            type: Joi.string().valid(...REQUEST_TYPES).required().example('RESERVA'),
            subject: Joi.string().trim().min(3).max(100).required(),
            description: Joi.string().trim().max(500).allow('').optional(),
            preferredDate: Joi.date().iso().optional(),
            workout: Joi.string().regex(OBJECT_ID).required()
        })
    },

    // Validaciones relacionadas con los usuarios del backoffice
    user: {
        // Esquema que se utiliza cuando un admin crea un usuario
        create: Joi.object<IUser>({
            // El nombre y el email son obligatorios
            name: Joi.string().trim().required().example('Ana'),
            email: Joi.string().email().required().example('ana@example.com'),

            // La contraseña es obligatoria al crear y tiene que tener al menos 8 caracteres
            password: Joi.string().min(8).required().example('seminari7'),

            // El rol es opcional: si no se indica, el modelo asigna USER
            role: Joi.string().valid(...USER_ROLES).example('USER')
        }),

        // Esquema que se utiliza para actualizar un usuario.
        // La contraseña es opcional: si no llega, el hook pre-save no la vuelve a cifrar
        update: Joi.object<IUser>({
            // Estos campos son obligatorios tambien al actualizar
            name: Joi.string().trim().required(),
            email: Joi.string().email().required(),

            // El resto de campos son opcionales
            password: Joi.string().min(8),
            role: Joi.string().valid(...USER_ROLES)
        })
    }
};

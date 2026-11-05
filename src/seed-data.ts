import { IExercise } from './models/Exercise';
import { RequestStatus, RequestType } from './models/Request';
import { IUser } from './models/User';
import { IWorkout } from './models/Workout';

// Datos de ejemplo para llenar la base de datos del gimnasio.
// Los nombres de los ejercicios y de las rutinas son inventados.

// Usuarios para iniciar sesión en la aplicación: uno de cada rol.
// Las contraseñas están sin cifrar y son públicas a propósito (ver el README):
// el hook pre-save del modelo User las cifra al guardarlas.
export const usersSeed: IUser[] = [
    {
        name: 'Admin',
        email: 'admin@example.com',
        password: 'seminari7',
        role: 'ADMIN'
    },
    {
        name: 'Usuario',
        email: 'user@example.com',
        password: 'seminari7',
        role: 'USER'
    }
];

// El campo 'isDeleted' no se indica aquí: el esquema lo pone en false por defecto.
export type ExerciseSeed = Omit<IExercise, 'isDeleted' | 'deletedAt'>;

// Ejercicios repartidos entre todas las categorías de EXERCISE_CATEGORIES.
// En los ejercicios de fuerza, sets son las series y reps las repeticiones de cada serie.
export const exercisesSeed: ExerciseSeed[] = [
    {
        name: 'Press de banca',
        category: 'CHEST',
        sets: 4,
        reps: 10
    },
    {
        name: 'Aperturas con mancuernas',
        category: 'CHEST',
        sets: 3,
        reps: 12
    },
    {
        name: 'Dominadas',
        category: 'BACK',
        sets: 4,
        reps: 8
    },
    {
        name: 'Remo con barra',
        category: 'BACK',
        sets: 4,
        reps: 10
    },
    {
        name: 'Sentadilla',
        category: 'LEGS',
        sets: 5,
        reps: 5
    },
    {
        name: 'Prensa de piernas',
        category: 'LEGS',
        sets: 3,
        reps: 12
    },
    {
        name: 'Press militar',
        category: 'SHOULDERS',
        sets: 4,
        reps: 8
    },
    {
        name: 'Elevaciones laterales',
        category: 'SHOULDERS',
        sets: 3,
        reps: 15
    },
    {
        name: 'Curl de bíceps',
        category: 'ARMS',
        sets: 3,
        reps: 12
    },
    {
        name: 'Fondos en paralelas',
        category: 'ARMS',
        sets: 3,
        reps: 10
    },
    {
        name: 'Plancha abdominal',
        category: 'CORE',
        sets: 3,
        reps: 1
    },
    // En el cardio no hay repeticiones: sets son los minutos de trabajo y reps queda en 0.
    {
        name: 'Cinta a intervalos',
        category: 'CARDIO',
        sets: 20,
        reps: 0
    }
];

// Cada rutina dice de qué ejercicios está hecha con sus nombres. El script del seed los cambia
// por los ids que MongoDB les ha dado a los ejercicios, por eso primero se insertan los ejercicios.
// Los campos 'exercises' e 'isDeleted' tampoco se indican aquí: el esquema los pone por defecto.
export type WorkoutSeed = Omit<IWorkout, 'exercises' | 'isDeleted' | 'deletedAt'> & { exerciseNames: string[] };

export const workoutsSeed: WorkoutSeed[] = [
    {
        name: 'Día de pecho',
        description: 'Empuje con barra y mancuernas, y fondos para terminar de cansar el pecho.',
        dayOfWeek: 'MONDAY',
        exerciseNames: ['Press de banca', 'Aperturas con mancuernas', 'Fondos en paralelas']
    },
    {
        name: 'Día de espalda',
        description: 'Tirón vertical y horizontal, con bíceps al final.',
        dayOfWeek: 'TUESDAY',
        exerciseNames: ['Dominadas', 'Remo con barra', 'Curl de bíceps']
    },
    {
        name: 'Día de piernas',
        description: 'Sentadilla y prensa, con plancha para cerrar el entrenamiento.',
        dayOfWeek: 'THURSDAY',
        exerciseNames: ['Sentadilla', 'Prensa de piernas', 'Plancha abdominal']
    },
    {
        name: 'Día de hombro y brazos',
        description: 'Hombro completo y un bloque corto de brazos.',
        dayOfWeek: 'FRIDAY',
        exerciseNames: ['Press militar', 'Elevaciones laterales', 'Curl de bíceps', 'Fondos en paralelas']
    },
    {
        name: 'Cardio y core',
        description: 'Sesión corta de cardio y abdomen para el fin de semana.',
        dayOfWeek: 'SATURDAY',
        exerciseNames: ['Cinta a intervalos', 'Plancha abdominal']
    }
];

// Cada solicitud de ejemplo dice su rutina y su autor por nombre y email, y el script del seed
// los cambia por los ids que MongoDB les ha dado. Con los pasos del historial pasa lo mismo:
// el autor del paso se indica por email, y los pasos automaticos no lo llevan.
export type RequestSeed = {
    type: RequestType;
    subject: string;
    description?: string;
    status: RequestStatus;
    workoutName: string;
    requesterEmail: string;
    preferredDate?: string;
    history: { status: RequestStatus; comment?: string; at: string; byEmail?: string; automatic: boolean }[];
};

// Solicitudes repartidas entre los cuatro tipos y los cinco estados, para que el listado y el
// flujo de estados se puedan probar sin crear datos a mano. Los campos 'isDeleted' y 'deletedAt'
// no se indican: el esquema los pone por defecto.
export const requestsSeed: RequestSeed[] = [
    {
        type: 'RESERVA',
        subject: 'Reserva de plaza en el día de pecho',
        description: 'Quiero entrenar el lunes por la tarde, a ser posible a las 19:00.',
        status: 'PENDING',
        workoutName: 'Día de pecho',
        requesterEmail: 'user@example.com',
        preferredDate: '2026-11-09T19:00:00.000Z',
        history: [{ status: 'PENDING', at: '2026-11-02T09:15:00.000Z', automatic: true }]
    },
    {
        type: 'INSCRIPCION',
        subject: 'Inscripción al grupo de espalda',
        description: 'Me apunto al grupo de los martes si todavía queda plaza.',
        status: 'PENDING',
        workoutName: 'Día de espalda',
        requesterEmail: 'user@example.com',
        preferredDate: '2026-11-10T18:30:00.000Z',
        history: [{ status: 'PENDING', at: '2026-11-02T10:05:00.000Z', automatic: true }]
    },
    {
        type: 'PETICION',
        subject: 'Cambiar la hora del entrenamiento de piernas',
        description: '¿Se puede pasar el grupo de las 18:00 a las 19:00?',
        status: 'APPROVED',
        workoutName: 'Día de piernas',
        requesterEmail: 'user@example.com',
        history: [
            { status: 'PENDING', at: '2026-10-27T08:40:00.000Z', automatic: true },
            {
                status: 'APPROVED',
                comment: 'Aprobado: el grupo pasa a las 19:00 a partir de la semana que viene.',
                at: '2026-10-28T09:20:00.000Z',
                byEmail: 'admin@example.com',
                automatic: false
            }
        ]
    },
    {
        type: 'INCIDENCIA',
        subject: 'La cinta de la zona de cardio no arranca',
        description: 'Ayer por la tarde no arrancaba ninguna de las dos cintas.',
        status: 'REJECTED',
        workoutName: 'Cardio y core',
        requesterEmail: 'user@example.com',
        history: [
            { status: 'PENDING', at: '2026-10-30T17:10:00.000Z', automatic: true },
            {
                status: 'REJECTED',
                comment: 'Es una incidencia de mantenimiento, no del entrenamiento: recepción ha abierto parte de avería.',
                at: '2026-10-31T08:05:00.000Z',
                byEmail: 'admin@example.com',
                automatic: false
            }
        ]
    },
    {
        type: 'RESERVA',
        subject: 'Reserva de la sesión de hombro y brazos',
        description: 'Sesión para el viernes por la mañana.',
        status: 'COMPLETED',
        workoutName: 'Día de hombro y brazos',
        requesterEmail: 'admin@example.com',
        preferredDate: '2026-10-24T10:00:00.000Z',
        history: [
            { status: 'PENDING', at: '2026-10-20T07:30:00.000Z', automatic: true },
            {
                status: 'APPROVED',
                comment: 'Plaza confirmada para el viernes a las 10:00.',
                at: '2026-10-20T11:00:00.000Z',
                byEmail: 'admin@example.com',
                automatic: false
            },
            {
                status: 'COMPLETED',
                comment: 'Sesión realizada.',
                at: '2026-10-24T11:15:00.000Z',
                byEmail: 'admin@example.com',
                automatic: false
            }
        ]
    },
    {
        type: 'PETICION',
        subject: 'Pedir una sesión extra de cardio',
        description: 'Valorar abrir un grupo extra el sábado por la mañana.',
        status: 'CANCELLED',
        workoutName: 'Cardio y core',
        requesterEmail: 'admin@example.com',
        history: [
            { status: 'PENDING', at: '2026-11-01T12:00:00.000Z', automatic: true },
            {
                status: 'CANCELLED',
                comment: 'Cancelada: ya hay plaza en el grupo de los sábados.',
                at: '2026-11-02T08:45:00.000Z',
                byEmail: 'admin@example.com',
                automatic: false
            }
        ]
    }
];

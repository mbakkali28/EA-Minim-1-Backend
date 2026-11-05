import mongoose from 'mongoose';
import { config } from './config/config';
import Logging from './library/Logging';
import Exercise from './models/Exercise';
import Request from './models/Request';
import User from './models/User';
import Workout from './models/Workout';
import { exercisesSeed, requestsSeed, usersSeed, workoutsSeed } from './seed-data';

// Llena la base de datos con los datos de ejemplo de seed-data.ts.
//
//   npm run seed             inserta los datos solo si la base de datos está vacía
//   npm run seed -- --reset  borra usuarios, ejercicios, rutinas y solicitudes y vuelve a insertarlos
//
// Siempre trabaja sobre la base de datos del .env (MONGO_URL).

const reset = process.argv.includes('--reset');

const seed = async () => {
    await mongoose.connect(config.mongo.url);
    Logging.info(`Conectado a ${config.mongo.url}`);

    if (reset) {
        // Ojo: deleteMany({}) es un borrado fisico real y a proposito.
        // El reset del seed es el unico punto que hace borrado duro: asi tambien
        // se limpian los documentos que se habian borrado logicamente (soft delete).
        const users = await User.deleteMany({});
        const exercises = await Exercise.deleteMany({});
        const workouts = await Workout.deleteMany({});
        const requests = await Request.deleteMany({});
        Logging.warning(
            `Borrados ${users.deletedCount} usuarios, ${exercises.deletedCount} ejercicios, ${workouts.deletedCount} rutinas y ${requests.deletedCount} solicitudes`
        );
    }

    const usersInDb = await User.countDocuments();
    const exercisesInDb = await Exercise.countDocuments();
    const workoutsInDb = await Workout.countDocuments();
    const requestsInDb = await Request.countDocuments();

    if (usersInDb > 0 || exercisesInDb > 0 || workoutsInDb > 0 || requestsInDb > 0) {
        Logging.warning('La base de datos ya tiene datos. Para rehacerla: npm run seed -- --reset');
        return;
    }

    // create() dispara los hooks del modelo: la contrasena del usuario se guarda cifrada
    const createdUsers = await User.create(usersSeed);
    Logging.info(`Usuarios creados: ${createdUsers.length}`);

    // Primero los ejercicios, porque las rutinas los referencian por su id
    const createdExercises = await Exercise.create(exercisesSeed);
    Logging.info(`Ejercicios creados: ${createdExercises.length}`);

    // Cada rutina trae los nombres de sus ejercicios; aquí se cambian por los ids que les ha dado MongoDB
    const workoutsWithExercises = workoutsSeed.map(({ exerciseNames, ...workout }) => {
        const exercises = exerciseNames.map((name) => {
            const exercise = createdExercises.find((created) => created.name === name);

            if (!exercise) {
                throw new Error(`En seed-data.ts hay una rutina con un ejercicio que no existe: ${name}`);
            }

            return exercise._id;
        });

        return { ...workout, exercises };
    });

    const createdWorkouts = await Workout.insertMany(workoutsWithExercises);
    Logging.info(`Rutinas creadas: ${createdWorkouts.length}`);

    // Busca el id de un usuario por su email. Si la solicitud de ejemplo nombra a alguien que no
    // esta en usersSeed, el seed se para: es un error de los datos de ejemplo, no de la base.
    const userByEmail = (email: string) => {
        const user = createdUsers.find((created) => created.email === email);

        if (!user) {
            throw new Error(`En seed-data.ts hay una solicitud con un usuario que no existe: ${email}`);
        }

        return user._id;
    };

    // Cada solicitud trae el nombre de su rutina y el email de quien la pide; aqui se cambian por ids.
    // El historial se numera en orden: el paso 1 es el alta y el ultimo es el que deja el estado actual.
    const requestsWithRefs = requestsSeed.map(({ workoutName, requesterEmail, preferredDate, history, ...request }) => {
        const workout = createdWorkouts.find((created) => created.name === workoutName);

        if (!workout) {
            throw new Error(`En seed-data.ts hay una solicitud con una rutina que no existe: ${workoutName}`);
        }

        return {
            ...request,
            preferredDate: preferredDate ? new Date(preferredDate) : undefined,
            workout: workout._id,
            requester: userByEmail(requesterEmail),
            history: history.map((step, index) => ({
                status: step.status,
                comment: step.comment,
                at: new Date(step.at),
                by: step.byEmail ? userByEmail(step.byEmail) : undefined,
                automatic: step.automatic,
                version: index + 1
            }))
        };
    });

    // create() valida cada solicitud con el esquema: un estado o un tipo que no exista para el seed
    const createdRequests = await Request.create(requestsWithRefs);
    Logging.info(`Solicitudes creadas: ${createdRequests.length}`);
};

seed()
    .catch((error) => {
        Logging.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());

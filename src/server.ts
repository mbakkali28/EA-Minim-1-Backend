import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import { config } from './config/config';
import { Cors } from './middleware/Cors';
import Logging from './library/Logging';
import Logger from './middleware/Logger';
import ErrorHandler from './middleware/ErrorHandler';
import { VerifyToken } from './middleware/VerifyToken';
import authRoutes from './routes/Auth';
import exerciseRoutes from './routes/Exercise';
import workoutRoutes from './routes/Workout';
import requestRoutes from './routes/Request';
import swaggerUi from 'swagger-ui-express'; // permite mostrar Swagger en el navegador.
import swaggerDocument from './config/swagger'; // importa el documento que hemos creado en swagger.ts
import { Server } from 'socket.io';
import { VerifySocketToken } from './middleware/SocketAuth';
import Message from './models/Message';
import type { ChatJoinPayload, ChatMessagePayload } from './types/chat';
const router = express();
import userRoutes from './routes/Users';

/** Connect to Mongo */
mongoose
    .connect(config.mongo.url, { retryWrites: true, w: 'majority' })
    .then(() => {
        Logging.info('Mongo connected successfully.');
        StartServer();
    })
    .catch((error) => Logging.error(error));

/** Only Start Server if Mongoose Connects */
const StartServer = () => {
    router.use(Logger);

    router.use(express.urlencoded({ extended: true }));
    router.use(express.json());

    /** CORS */
    router.use(Cors);

    /** Routes */
    // Publicas: registro, login y refresh
    router.use('/auth', authRoutes);

    // Protegidas: VerifyToken comprueba el token (401 si falta o no vale) y deja el usuario
    // en req.user. La lectura de ejercicios y rutinas esta abierta a cualquier sesion: los
    // servicios ya devuelven solo los elementos activos a quien no es ADMIN (tarjeta SE-07).
    // Las escrituras siguen siendo solo de ADMIN y eso se comprueba en cada router.
    router.use('/exercises', VerifyToken, exerciseRoutes);
    router.use('/workouts', VerifyToken, workoutRoutes);
    router.use('/requests', VerifyToken, requestRoutes);
    // La lista de usuarios es para el chat, así que cualquier usuario autenticado puede consultarla.
    // Las escrituras (POST y PUT) y el detalle por id son solo para ADMIN, y eso se comprueba
    // en src/routes/Users.ts, porque aquí el montaje es el mismo para todas las rutas del router.
    router.use('/users', VerifyToken, userRoutes);

    // La documentacion y el healthcheck son publicos
    router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    /** Healthcheck */
    /**
     * @openapi
     * /ping:
     *   get:
     *     tags: [Health]
     *     summary: Comprueba que la API está viva
     *     security: []
     *     responses:
     *       200:
     *         description: La API responde
     *         content:
     *           application/json:
     *             example: { hello: world }
     */
    router.get('/ping', (req, res) => res.status(200).json({ hello: 'world' }));

    /** Error handling */
    router.use((req, res, next) => {
        next(new Error('Not found'));
    });

    router.use(ErrorHandler);

    const server = http.createServer(router);
const io = new Server(server, {
    cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST']
    }
});

io.use(VerifySocketToken);

io.on('connection', (socket) => {
    // El middleware JWT ya comprobó la identidad antes de permitir esta conexión.
    const userId = socket.data.user.id;
    Logging.info(`Socket connected for user ${userId}`);

    // El cliente pide entrar a una sala, por ejemplo "general".
    socket.on('chat:join', async (payload: ChatJoinPayload) => {
        // Los tipos de TypeScript no validan los datos que llegan por la red;
        // comprobamos también que la sala realmente sea un texto.
        if (!payload || typeof payload.room !== 'string' || payload.room.trim().length === 0) {
            socket.emit('chat:error', { message: 'La sala indicada no es válida.' });
            return;
        }

        const room = payload.room.trim();

        try {
            // Socket.IO se encarga de añadir esta conexión a la sala.
            await socket.join(room);

            // Buscamos los 50 mensajes más recientes y los ordenamos del más antiguo al más nuevo.
            const history = await Message.find({ room })
                .sort({ timestamp: -1 })
                .limit(50)
                .populate('user', 'name')
                .lean();

            // Devolvemos el historial solo a quien acaba de entrar, en orden cronológico.
            socket.emit('chat:history', history.reverse());
        } catch (error) {
            // Registramos el fallo en el servidor y avisamos al cliente sin exponer detalles internos.
            Logging.error(error);
            socket.emit('chat:error', { message: 'No se pudo cargar el historial de la sala.' });
        }
    });

        // El cliente envía el mensaje y la sala donde quiere publicarlo.
    socket.on('chat:message', async (payload: ChatMessagePayload) => {
        // Los tipos de TypeScript no comprueban los datos que llegan desde la red.
        if (
            !payload ||
            typeof payload.room !== 'string' ||
            typeof payload.text !== 'string' ||
            payload.room.trim().length === 0 ||
            payload.text.trim().length === 0
        ) {
            socket.emit('chat:error', { message: 'La sala y el texto del mensaje son obligatorios.' });
            return;
        }

        const room = payload.room.trim();
        const text = payload.text.trim();

        // Solo se permite escribir en salas a las que este socket ya se unió.
        if (!socket.rooms.has(room)) {
            socket.emit('chat:error', { message: 'Debes entrar a la sala antes de enviar mensajes.' });
            return;
        }

        try {
            // El usuario que escribe sale del JWT verificado, nunca de los datos enviados por el cliente.
            const message = await Message.create({
                room,
                user: userId,
                text
            });

            // Cargamos el nombre del usuario para enviar datos parecidos a los del historial.
            await message.populate('user', 'name');

            // Se emite el mensaje ya guardado a todos los sockets conectados a esa sala.
            io.to(room).emit('chat:message', message);
        } catch (error) {
            // El detalle queda en el log del servidor; al cliente solo le enviamos un aviso.
            Logging.error(error);
            socket.emit('chat:error', { message: 'No se pudo guardar el mensaje.' });
        }
    });

    // Dejamos registrado cuándo se desconecta un usuario.
    socket.on('disconnect', () => {
        Logging.info(`Socket disconnected for user ${userId}`);
    });
});

server.listen(config.server.port, () => Logging.info(`Server is running on port ${config.server.port}`));
};

import express from 'express';

import controller from '../controllers/Request';

import { Schemas, ValidateId, ValidateJoi, ValidateQuery } from '../middleware/Joi';
import { RequireOwnerOrAdmin } from '../middleware/RequireRole';

const router = express.Router();

// Ruta para listar solicitudes.
router.get('/', ValidateQuery(Schemas.query.request), controller.listRequests);

// Ruta para crear una solicitud nueva.
router.post('/', ValidateJoi(Schemas.request.create), controller.createRequest);

// Ruta para buscar una solicitud por su ID.
router.get('/:requestId', ValidateId('requestId'), RequireOwnerOrAdmin(), controller.readRequest);

export = router;

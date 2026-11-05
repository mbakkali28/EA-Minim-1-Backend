import express from 'express';

import controller from '../controllers/Request';

import { Schemas, ValidateId, ValidateJoi, ValidateQuery } from '../middleware/Joi';
import { RequireOwnerOrAdmin, RequireRole } from '../middleware/RequireRole';

const router = express.Router();

// listar solicitudes.
router.get('/', ValidateQuery(Schemas.query.request), controller.listRequests);

// crear una solicitud nueva.
router.post('/', ValidateJoi(Schemas.request.create), controller.createRequest);

// buscar una solicitud por su ID.
router.get('/:requestId', ValidateId('requestId'), RequireOwnerOrAdmin(), controller.readRequest);

// modificar una solicitud.
router.put('/:requestId', ValidateId('requestId'), RequireOwnerOrAdmin(), ValidateJoi(Schemas.request.update), controller.updateRequest);

// cambiar el estado de una solicitud.
router.patch('/:requestId/status', ValidateId('requestId'), RequireOwnerOrAdmin(), ValidateJoi(Schemas.request.status), controller.changeStatus);

// Borrado logico multiple. Va antes de las rutas con :requestId para que "hard" no se tome por un id
router.delete('/', RequireRole('ADMIN'), ValidateJoi(Schemas.bulkDelete), controller.softDeleteManyRequests);

router.delete('/hard', RequireRole('ADMIN'), ValidateJoi(Schemas.bulkDelete), controller.hardDeleteManyRequests);

// soft-delete
router.delete('/:requestId', ValidateId('requestId'), RequireOwnerOrAdmin(), controller.softDeleteRequest);

// hard-delete
router.delete('/:requestId/hard', RequireRole('ADMIN'), ValidateId('requestId'), controller.hardDeleteRequest);

export = router;

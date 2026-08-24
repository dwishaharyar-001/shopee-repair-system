const express = require('express');
const router = express.Router();
const diagnosticController = require('../controllers/diagnosticController');

// Technician submits diagnostic plan & requested parts proposal
router.post('/:id/submit-plan', diagnosticController.submitDiagnosticPlan);

// QC SEA views queue of pending diagnostic & budget approvals
router.get('/pending-approvals', diagnosticController.getPendingDiagnosticApprovals);

// QC SEA executes approval decision (Full_Approve, Partial_Approve, Not_Approve_Harvest, Revision_Requested)
router.post('/:id/process-approval', diagnosticController.processSeaDiagnosticApproval);

module.exports = router;

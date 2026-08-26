const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getBranches,
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchCategoryPrices,
  updateBranchCategoryPrices,
  updateBranchDiagnosticFee
} = require('../controllers/branchController');

// All branch routes require authentication
router.use(verifyToken);

// Public dropdown list for active branches
router.get('/', getBranches);

// Branch repair category prices
router.get('/repair-prices', getBranchCategoryPrices);
router.put('/:branchId/repair-prices', requireRole('Admin', 'Coordinator'), updateBranchCategoryPrices);

// Admin Master list
router.get('/admin', requireRole('Admin', 'Coordinator'), getAllBranches);

// Admin / Coordinator CRUD operations
router.post('/', requireRole('Admin', 'Coordinator'), createBranch);
router.put('/:id', requireRole('Admin', 'Coordinator'), updateBranch);
router.delete('/:id', requireRole('Admin', 'Coordinator'), deleteBranch);

// Diagnostic Fee adjustment per branch (Admin & Coordinator)
router.put('/:id/diagnostic-fee', requireRole('Admin', 'Coordinator'), updateBranchDiagnosticFee);

module.exports = router;

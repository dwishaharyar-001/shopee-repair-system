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
  updateBranchCategoryPrices
} = require('../controllers/branchController');

// All branch routes require authentication
router.use(verifyToken);

// Public dropdown list for active branches
router.get('/', getBranches);

// Branch repair category prices
router.get('/repair-prices', getBranchCategoryPrices);
router.put('/:branchId/repair-prices', requireRole('Admin'), updateBranchCategoryPrices);

// Admin Master list
router.get('/admin', requireRole('Admin', 'Coordinator'), getAllBranches);

// Admin CRUD operations
router.post('/', requireRole('Admin'), createBranch);
router.put('/:id', requireRole('Admin'), updateBranch);
router.delete('/:id', requireRole('Admin'), deleteBranch);

module.exports = router;

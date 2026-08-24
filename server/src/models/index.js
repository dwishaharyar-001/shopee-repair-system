const { sequelize } = require('../config/database');
const User = require('./User');
const Technician = require('./Technician');
const Customer = require('./Customer');
const Device = require('./Device');
const ServiceOrder = require('./ServiceOrder');
const RepairLog = require('./RepairLog');
const Part = require('./Part');
const PartConsumed = require('./PartConsumed');
const QCCheckpoint = require('./QCCheckpoint');
const HarvestLog = require('./HarvestLog');
const RoleMenuAccess = require('./RoleMenuAccess');
const Branch = require('./Branch');
const BranchCategoryPrice = require('./BranchCategoryPrice');
const BrokenPart = require('./BrokenPart');
const BastDocument = require('./BastDocument');
const BastItem = require('./BastItem');
const DiagnosticPlanItem = require('./DiagnosticPlanItem');

// Branch <-> BranchCategoryPrice
Branch.hasMany(BranchCategoryPrice, { foreignKey: 'branch_id', as: 'categoryPrices' });
BranchCategoryPrice.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// User <-> Technician
User.hasOne(Technician, { foreignKey: 'user_id', as: 'technicianProfile', onDelete: 'CASCADE' });
Technician.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Branch <-> ServiceOrder
Branch.hasMany(ServiceOrder, { foreignKey: 'branch_id', as: 'serviceOrders' });
ServiceOrder.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// Branch <-> User
Branch.hasMany(User, { foreignKey: 'branch_id', as: 'users' });
User.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// Branch <-> Part
Branch.hasMany(Part, { foreignKey: 'branch_id', as: 'parts' });
Part.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// Customer <-> Device
Customer.hasMany(Device, { foreignKey: 'customer_id', as: 'devices' });
Device.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// Customer <-> ServiceOrder
Customer.hasMany(ServiceOrder, { foreignKey: 'customer_id', as: 'serviceOrders' });
ServiceOrder.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// Device <-> ServiceOrder
Device.hasMany(ServiceOrder, { foreignKey: 'device_id', as: 'serviceOrders' });
ServiceOrder.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

// Technician <-> ServiceOrder
Technician.hasMany(ServiceOrder, { foreignKey: 'assigned_technician_id', as: 'assignedOrders' });
ServiceOrder.belongsTo(Technician, { foreignKey: 'assigned_technician_id', as: 'assignedTechnician' });

// User (Receiver) <-> ServiceOrder
User.hasMany(ServiceOrder, { foreignKey: 'received_by_user_id', as: 'receivedOrders' });
ServiceOrder.belongsTo(User, { foreignKey: 'received_by_user_id', as: 'receivedBy' });

// ServiceOrder <-> RepairLog
ServiceOrder.hasMany(RepairLog, { foreignKey: 'service_order_id', as: 'repairLogs' });
RepairLog.belongsTo(ServiceOrder, { foreignKey: 'service_order_id', as: 'serviceOrder' });

// Technician <-> RepairLog
Technician.hasMany(RepairLog, { foreignKey: 'technician_id', as: 'repairLogs' });
RepairLog.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });

// ServiceOrder <-> PartConsumed
ServiceOrder.hasMany(PartConsumed, { foreignKey: 'service_order_id', as: 'consumedParts' });
PartConsumed.belongsTo(ServiceOrder, { foreignKey: 'service_order_id', as: 'serviceOrder' });

// RepairLog <-> PartConsumed
RepairLog.hasMany(PartConsumed, { foreignKey: 'repair_log_id', as: 'consumedParts' });
PartConsumed.belongsTo(RepairLog, { foreignKey: 'repair_log_id', as: 'repairLog' });

// Part <-> PartConsumed
Part.hasMany(PartConsumed, { foreignKey: 'part_id', as: 'usages' });
PartConsumed.belongsTo(Part, { foreignKey: 'part_id', as: 'part' });

// User <-> PartConsumed
User.hasMany(PartConsumed, { foreignKey: 'requested_by_user_id', as: 'requestedParts' });
PartConsumed.belongsTo(User, { foreignKey: 'requested_by_user_id', as: 'requestedBy' });

// ServiceOrder <-> QCCheckpoint
ServiceOrder.hasMany(QCCheckpoint, { foreignKey: 'service_order_id', as: 'qcCheckpoints' });
QCCheckpoint.belongsTo(ServiceOrder, { foreignKey: 'service_order_id', as: 'serviceOrder' });

// User (Inspector) <-> QCCheckpoint
User.hasMany(QCCheckpoint, { foreignKey: 'inspector_id', as: 'inspectedCheckpoints' });
QCCheckpoint.belongsTo(User, { foreignKey: 'inspector_id', as: 'inspector' });

// Device (Source) <-> HarvestLog
Device.hasMany(HarvestLog, { foreignKey: 'source_device_id', as: 'harvestLogs' });
HarvestLog.belongsTo(Device, { foreignKey: 'source_device_id', as: 'sourceDevice' });

// Part <-> HarvestLog
Part.hasMany(HarvestLog, { foreignKey: 'part_id', as: 'harvestLogs' });
HarvestLog.belongsTo(Part, { foreignKey: 'part_id', as: 'part' });

// ServiceOrder <-> BrokenPart
ServiceOrder.hasMany(BrokenPart, { foreignKey: 'service_order_id', as: 'brokenParts' });
BrokenPart.belongsTo(ServiceOrder, { foreignKey: 'service_order_id', as: 'serviceOrder' });

// Device <-> BrokenPart
Device.hasMany(BrokenPart, { foreignKey: 'device_id', as: 'brokenParts' });
BrokenPart.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

// User <-> BrokenPart
User.hasMany(BrokenPart, { foreignKey: 'reported_by_user_id', as: 'reportedBrokenParts' });
BrokenPart.belongsTo(User, { foreignKey: 'reported_by_user_id', as: 'reportedBy' });

// BastDocument <-> BastItem
BastDocument.hasMany(BastItem, { foreignKey: 'bast_document_id', as: 'items', onDelete: 'CASCADE' });
BastItem.belongsTo(BastDocument, { foreignKey: 'bast_document_id', as: 'bastDocument' });

// ServiceOrder <-> BastItem
ServiceOrder.hasMany(BastItem, { foreignKey: 'service_order_id', as: 'bastItems' });
BastItem.belongsTo(ServiceOrder, { foreignKey: 'service_order_id', as: 'serviceOrder' });

// Device <-> BastItem
Device.hasMany(BastItem, { foreignKey: 'device_id', as: 'bastItems' });
BastItem.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

// Branch <-> BastDocument
Branch.hasMany(BastDocument, { foreignKey: 'branch_id', as: 'bastDocuments' });
BastDocument.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// User (First Party / Coordinator) <-> BastDocument
User.hasMany(BastDocument, { foreignKey: 'first_party_user_id', as: 'createdBasts' });
BastDocument.belongsTo(User, { foreignKey: 'first_party_user_id', as: 'firstPartyUser' });

// User (Second Party / QC SEA) <-> BastDocument
User.hasMany(BastDocument, { foreignKey: 'second_party_user_id', as: 'verifiedBasts' });
BastDocument.belongsTo(User, { foreignKey: 'second_party_user_id', as: 'secondPartyUser' });

// ServiceOrder <-> DiagnosticPlanItem
ServiceOrder.hasMany(DiagnosticPlanItem, { foreignKey: 'service_order_id', as: 'diagnosticPlanItems' });
DiagnosticPlanItem.belongsTo(ServiceOrder, { foreignKey: 'service_order_id', as: 'serviceOrder' });

// Part <-> DiagnosticPlanItem
Part.hasMany(DiagnosticPlanItem, { foreignKey: 'part_id', as: 'diagnosticPlanItems' });
DiagnosticPlanItem.belongsTo(Part, { foreignKey: 'part_id', as: 'part' });

module.exports = {
  sequelize,
  User,
  Technician,
  Customer,
  Device,
  ServiceOrder,
  RepairLog,
  Part,
  PartConsumed,
  QCCheckpoint,
  HarvestLog,
  RoleMenuAccess,
  Branch,
  BranchCategoryPrice,
  BrokenPart,
  BastDocument,
  BastItem,
  DiagnosticPlanItem
};

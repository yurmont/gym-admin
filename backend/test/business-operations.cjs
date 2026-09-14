const {
  withBusinessTransaction,
} = require("../dist/common/business/business-transactions.service");
const memberships = require("../dist/modules/memberships/memberships.transactions");
const payments = require("../dist/modules/payments/payments.transactions");
const attendance = require("../dist/modules/attendance/attendance.transactions");
const schemas = {
  ...require("../dist/modules/memberships/dto/memberships.schemas").schemas,
  ...require("../dist/modules/payments/dto/payments.schemas").schemas,
  ...require("../dist/modules/attendance/dto/attendance.schemas").schemas,
};
// Test adapter keeps existing scenario vocabulary; production services invoke their feature directly.
exports.createOperations = (database) => async (operation, input, actor) => {
  const body = schemas[operation].parse(input);
  const actions = {
    "create-membership": (ctx) => memberships.createMembership(ctx, body),
    "renew-membership": (ctx) => memberships.renewMembership(ctx, body),
    "cancel-membership": (ctx) => memberships.cancelMembership(ctx, body),
    "register-payment": (ctx) => payments.registerPayment(ctx, body),
    "void-payment": (ctx) => payments.voidPayment(ctx, body.payment_id),
    "attendance-check-in": (ctx) => attendance.checkIn(ctx, body),
    "attendance-check-out": (ctx) => attendance.checkOut(ctx, body),
  };
  return withBusinessTransaction(database, actor, actions[operation]);
};

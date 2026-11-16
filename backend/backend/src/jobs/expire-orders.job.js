const cron = require('node-cron');
const { expireOrders } = require('../services/expire-orders.service');
let task;
function startExpireOrdersJob() {
  if (task) return task;
  task = cron.schedule('* * * * *', () => expireOrders().catch(error => console.error('[expireOrdersJob]', error)));
  return task;
}
function stopExpireOrdersJob() { if (task) task.stop(); task = null; }
module.exports = { startExpireOrdersJob, stopExpireOrdersJob };

// config/plans.js
module.exports = {
  free: {
    dashboards: 1,
    widgetsPerDashboard: 3,
    playersLimit: 5,
    uploadLimit: 5,
    canUseChatbot: false,
    canSyncAPI: false,
    exportFormats: ['PNG'],
    dataHistoryDays: 7,
  },
  pro: {
    dashboards: Infinity,
    widgetsPerDashboard: 15,
    playersLimit: Infinity,
    uploadLimit: 50,
    canUseChatbot: true,
    canSyncAPI: true,
    exportFormats: ['PNG', 'PDF'],
    dataHistoryDays: 90,
  },
  custom: {
    dashboards: Infinity,
    widgetsPerDashboard: Infinity,
    playersLimit: Infinity,
    uploadLimit: Infinity,
    canUseChatbot: true,
    canSyncAPI: true,
    exportFormats: ['PNG', 'PDF', 'CSV'],
    dataHistoryDays: Infinity,
  },
};

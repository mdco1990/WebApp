import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Minimal isolated i18n instance for tests to avoid global mutations
export const createTestI18n = (lng: string = 'en') => {
  const instance = i18n.createInstance();
  instance.use(initReactI18next).init({
    lng,
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          'nav.adminPanel': '⚙️ Admin Panel',
          'nav.userManagement': '👥 User Management',
          'nav.pendingUsers': 'Pending Approvals',
          'nav.allUsers': 'All Users',
          'nav.approvedUsers': 'Approved Users',
          'nav.rejectedUsers': 'Rejected Users',
          'nav.apiDocs': '📚 API Documentation',
          'nav.adminTools': '🛠️ Admin Tools',
          'nav.applicationLogs': '📋 Application Logs',
          'nav.downloadLogs': '💾 Download Logs',
          'nav.dbAdmin': '🗃️ DB Admin',
          'btn.approve': 'Approve',
          'btn.reject': 'Reject',
          'btn.deleteUser': 'Delete User',
          'btn.clearCache': '🗑️ Clear Cache',
          'nav.noPendingUsers': 'No pending users',
        },
      },
      fr: {
        translation: {
          'nav.adminPanel': '⚙️ Panneau Admin',
          'nav.userManagement': '👥 Gestion Utilisateurs',
          'nav.pendingUsers': 'Approbations en attente',
          'nav.allUsers': 'Tous les utilisateurs',
          'nav.approvedUsers': 'Utilisateurs approuvés',
          'nav.rejectedUsers': 'Utilisateurs rejetés',
          'nav.apiDocs': '📚 Documentation API',
          'nav.adminTools': '🛠️ Outils Admin',
          'nav.applicationLogs': "📋 Journaux d'application",
          'nav.downloadLogs': '💾 Télécharger les journaux',
          'nav.dbAdmin': '🗃️ Admin BD',
          'btn.approve': 'Approuver',
          'btn.reject': 'Rejeter',
          'btn.deleteUser': "Supprimer l'utilisateur",
          'btn.clearCache': '🗑️ Vider le cache',
          'nav.noPendingUsers': 'Aucun utilisateur en attente',
        },
      },
    },
  });
  return instance;
};

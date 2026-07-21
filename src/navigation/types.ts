export type ScreenId =
  | 'overview'
  | 'calendar'
  | 'requests'
  | 'waitlist'
  | 'patients'
  | 'services'
  | 'workingHours'
  | 'settings'
  | 'leaves'
  | 'quickClose'
  | 'blogs'
  | 'reviews'
  | 'gallery'
  | 'finance'
  | 'financeIncomes'
  | 'financeExpenses'
  | 'financeCategories'
  | 'financeBalances'
  | 'financePatientAccount'
  | 'faq'
  | 'education'
  | 'educationApps'
  | 'profile'
  | 'password'
  | 'about'
  | 'website'
  | 'twoFactor'
  | 'clinic'
  | 'notifications'
  | 'packages'
  | 'menu';

export type ModuleProps = {
  onBack: () => void;
  onNavigate: (screen: ScreenId) => void;
  onSignOut?: () => void | Promise<void>;
};

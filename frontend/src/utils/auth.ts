export type UserRole = 'admin' | 'employee' | 'manager';

export const getUserRole = (): UserRole | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    const roleName = user.role_name?.toLowerCase();
    
    if (roleName === 'admin' || roleName === 'administrator') {
      return 'admin';
    } else if (roleName === 'manager') {
      return 'manager';
    } else {
      return 'employee';
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const hasAccess = (allowedRoles: UserRole[]): boolean => {
  const userRole = getUserRole();
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

export const isAdmin = (): boolean => {
  return getUserRole() === 'admin';
};

export const isEmployee = (): boolean => {
  return getUserRole() === 'employee';
};

export const isManager = (): boolean => {
  return getUserRole() === 'manager';
};

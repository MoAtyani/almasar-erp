export type SectionKey =
  | 'dashboard' | 'projects' | 'external_projects'
  | 'sales' | 'engineering' | 'tasks_production'
  | 'procurement' | 'warehouse' | 'qc' | 'logistics'
  | 'accounting' | 'hr' | 'dms' | 'helpdesk' | 'reports'
  | 'config' | 'profile'

export type AccessLevel = 'full' | 'view' | 'search' | 'hidden'

export interface UserPermission {
  name: string
  nameAr: string
  role: string
  specialPage?: '/steel' | '/hangar' | '/electrical'
  sections: Partial<Record<SectionKey, AccessLevel>>
  defaultAccess: AccessLevel
}

// All sections not listed get defaultAccess
export const USER_PERMISSIONS: Record<string, UserPermission> = {
  'yousef.basbous': {
    name: 'Eng. Yousef Basbous', nameAr: 'م. يوسف بصبوص', role: 'general_manager',
    defaultAccess: 'full', sections: {}
  },
  'ahmed.basbous': {
    name: 'Eng. Ahmed Basbous', nameAr: 'م. احمد بصبوص', role: 'deputy_manager',
    defaultAccess: 'full', sections: {}
  },
  'mohannad.ibdah.ops': {
    name: 'Eng. Mohannad Ibdah', nameAr: 'م. مهند ابداح', role: 'operations_manager',
    defaultAccess: 'full', sections: {}
  },
  'tariq.qasim': {
    name: 'Eng. Tariq Al-Qasim', nameAr: 'م. طارق القاسم', role: 'production_manager',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      tasks_production: 'full',
      projects: 'view',
      qc: 'view',
      logistics: 'view',
      warehouse: 'view',
      sales: 'view',
      procurement: 'view',
      external_projects: 'view',
      profile: 'full'
    }
  },
  'mohannad.ibdah.sales': {
    name: 'Eng. Mohannad Ibdah (Sales)', nameAr: 'م. مهند ابداح - مبيعات', role: 'sales_manager',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      sales: 'full',
      warehouse: 'search',
      profile: 'full'
    }
  },
  'aseel': {
    name: 'Eng. Aseel', nameAr: 'م. اسيل', role: 'design_manager',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      engineering: 'full',
      sales: 'full',
      procurement: 'view',
      tasks_production: 'view',
      warehouse: 'search',
      profile: 'full'
    }
  },
  'sara.atiyat': {
    name: 'Eng. Sara Atiyat', nameAr: 'م. سارة عطيات', role: 'pricing_engineer',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      engineering: 'full',
      sales: 'full',
      procurement: 'view',
      tasks_production: 'view',
      warehouse: 'search',
      profile: 'full'
    }
  },
  'jinan.dabaiba': {
    name: 'Eng. Jinan Al-Dabaiba', nameAr: 'م. جنان الدبايبة', role: 'pricing_engineer',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      engineering: 'full',
      sales: 'full',
      procurement: 'view',
      tasks_production: 'view',
      warehouse: 'search',
      profile: 'full'
    }
  },
  'mahmoud.zaatara': {
    name: 'Mahmoud Al-Zaatara', nameAr: 'محمود الزعاترة', role: 'procurement_manager',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      procurement: 'full',
      sales: 'view',
      warehouse: 'view',
      logistics: 'view',
      profile: 'full'
    }
  },
  'jihad': {
    name: 'Jihad', nameAr: 'جهاد', role: 'warehouse_manager',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      warehouse: 'full',
      profile: 'full'
    }
  },
  'omar.aqtash.qc': {
    name: 'Eng. Omar Al-Aqtash', nameAr: 'م. عمر الاقطش', role: 'qc_engineer',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      qc: 'full',
      tasks_production: 'view',
      profile: 'full'
    }
  },
  'abdulrahman.qc': {
    name: 'Eng. Abdulrahman', nameAr: 'م. عبد الرحمن', role: 'qc_engineer',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      qc: 'full',
      tasks_production: 'view',
      profile: 'full'
    }
  },
  'omar.aqtash.ext': {
    name: 'Eng. Omar Al-Aqtash (External)', nameAr: 'م. عمر الاقطش - خارجية', role: 'external_projects_engineer',
    defaultAccess: 'hidden',
    sections: {
      external_projects: 'full',
      profile: 'full'
    }
  },
  'abdulrahman.adawi': {
    name: 'Abdulrahman Al-Adawi', nameAr: 'عبد الرحمن عدوي', role: 'external_projects_engineer',
    defaultAccess: 'hidden',
    sections: {
      external_projects: 'full',
      profile: 'full'
    }
  },
  'abdullatif.hadir': {
    name: 'Abdullatif Hadir', nameAr: 'عبد اللطيف حاضر', role: 'steel_dept',
    defaultAccess: 'hidden',
    specialPage: '/steel',
    sections: { profile: 'full' }
  },
  'mohammad.duwairi': {
    name: 'Eng. Mohammad Al-Duwairi', nameAr: 'م. محمد الدويري', role: 'hangar_dept',
    defaultAccess: 'hidden',
    specialPage: '/hangar',
    sections: { profile: 'full' }
  },
  'basil.khuraiss': {
    name: 'Basil Khuraiss', nameAr: 'باسل خريس', role: 'electrical_dept',
    defaultAccess: 'hidden',
    specialPage: '/electrical',
    sections: { profile: 'full' }
  },
  'heba.musa.accounting': {
    name: 'Heba Musa (Accounting)', nameAr: 'هبة موسى - محاسبة', role: 'accountant',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      accounting: 'full',
      procurement: 'view',
      sales: 'view',
      profile: 'full'
    }
  },
  'heba.musa.hr': {
    name: 'Heba Musa (HR)', nameAr: 'هبة موسى - موارد بشرية', role: 'hr_manager',
    defaultAccess: 'hidden',
    sections: {
      dashboard: 'view',
      hr: 'full',
      profile: 'full'
    }
  }
}

export function getUserPermissions(profile: any): UserPermission | null {
  if (!profile) return null
  // Try matching by username key first
  const key = profile.username || profile.email?.split('@')[0] || ''
  if (USER_PERMISSIONS[key]) return USER_PERMISSIONS[key]
  // Try matching by role for super admins
  if (profile.role === 'admin' || profile.role === 'super_admin' || profile.is_manager) {
    return { name: profile.name || 'Admin', nameAr: profile.name || 'مدير', role: 'admin', defaultAccess: 'full', sections: {} }
  }
  // Default: full access (backward compat for existing users)
  return { name: profile.name || 'User', nameAr: profile.name || 'مستخدم', role: 'user', defaultAccess: 'full', sections: {} }
}

export function canAccess(profile: any, section: SectionKey, action: 'view' | 'edit' | 'search' = 'view'): boolean {
  const perms = getUserPermissions(profile)
  if (!perms) return false
  const level = perms.sections[section] ?? perms.defaultAccess
  if (level === 'hidden') return false
  if (action === 'edit') return level === 'full'
  if (action === 'search') return true
  return true
}

export function getAccessLevel(profile: any, section: SectionKey): AccessLevel {
  const perms = getUserPermissions(profile)
  if (!perms) return 'hidden'
  return perms.sections[section] ?? perms.defaultAccess
}

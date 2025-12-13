export type UserRole = 'admin' | 'student'

export interface Profile {
  id: string
  email: string
  role: UserRole
  parent_name: string
  student_name: string
  cost_per_hour: number
  balance: number
  timezone: string
  password_changed: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  student_id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_recurring: boolean
  recurring_group_id: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  cost: number
  notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  student?: Profile
}

export interface Transaction {
  id: string
  student_id: string
  type: 'deposit' | 'lesson_charge' | 'refund'
  amount: number
  description: string
  lesson_id: string | null
  stripe_payment_id: string | null
  created_at: string
  // Joined data
  student?: Profile
  lesson?: Lesson
}

export interface DashboardStats {
  totalStudents: number
  totalLessons: number
  lessonsThisWeek: number
  lessonsThisMonth: number
  earningsThisMonth: number
  totalBalance: number
  upcomingLessons: Lesson[]
}

export interface StudentDashboardStats {
  upcomingLessons: Lesson[]
  nextLesson: Lesson | null
  balance: number
  lessonsCompletedLastMonth: number
  totalSpent: number
}


import type { Lesson, Transaction } from '@/lib/types'

export function sumCredits(transactions: Pick<Transaction, 'type' | 'amount'>[]): number {
  return transactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
}

export function sumPastLessonCosts(
  lessons: Pick<Lesson, 'status' | 'end_time' | 'cost'>[],
  now: Date = new Date()
): number {
  return lessons
    .filter((l) => l.status !== 'cancelled' && new Date(l.end_time) < now)
    .reduce((sum, l) => sum + Number(l.cost || 0), 0)
}

export function calculateDerivedBalance(args: {
  credits: Pick<Transaction, 'type' | 'amount'>[]
  lessons: Pick<Lesson, 'status' | 'end_time' | 'cost'>[]
  now?: Date
}): number {
  const now = args.now ?? new Date()
  const creditsTotal = sumCredits(args.credits)
  const pastLessonCosts = sumPastLessonCosts(args.lessons, now)
  return creditsTotal - pastLessonCosts
}



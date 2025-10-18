import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') {
    return '₦0.00'
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return '₦0.00'
  }
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(numAmount)
}

export function formatNumber(count: number | string | undefined | null): string {
  if (count === undefined || count === null || count === '') {
    return '0'
  }
  
  const numCount = typeof count === 'string' ? parseInt(count) : count
  if (isNaN(numCount)) {
    return '0'
  }
  
  return new Intl.NumberFormat('en-NG').format(numCount)
}

export function formatDate(date: string | Date): string {
  if (!date) return 'N/A'
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return 'Invalid Date'
  
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export function formatDateTime(date: string | Date): string {
  if (!date) return 'N/A'
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return 'Invalid Date'
  
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

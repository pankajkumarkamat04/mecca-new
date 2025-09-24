import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

export default async function HomePage() {
  // In a real app, you'd check authentication here
  // For now, redirect to login
  redirect('/auth/login')
}

import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Redirect to login page
  redirect('/auth/login')
}

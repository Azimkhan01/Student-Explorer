import Link from 'next/link'
import React from 'react'

const page = () => {
  return (
    <div>
      <Link href={'/login'} >User Login</Link>
      <Link href={'/admin/login'} >Admin Login</Link>
    </div>
  )
}

export default page

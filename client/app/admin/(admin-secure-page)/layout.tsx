import Navbar from '@/components/common/Navbar'
import { adminNavbarLinks } from '@/config/admin-navbar'
import React from 'react'

function layout({children}:{children:React.ReactNode}) {
  return (
    <>
    {children}
    <Navbar links={adminNavbarLinks} />
    </>
  )
}

export default layout
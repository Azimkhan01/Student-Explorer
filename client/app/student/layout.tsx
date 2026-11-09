import Navbar from '@/components/common/Navbar'
import { studentNavbarLinks } from '@/config/student-navbar'
import React from 'react'

function layout({children}:{children:React.ReactNode}) {
  return (
    <>
    {children}
    <Navbar links={studentNavbarLinks} />
    </>
  )
}

export default layout
import Navbar from '@/components/common/Navbar'
import { teacherNavbarLinks } from '@/config/teacher-navbar'
import React from 'react'

function layout({children}:{children:React.ReactNode}) {
  return (
    <>
    {children}
    <Navbar links={teacherNavbarLinks}/>
    </>
  )
}

export default layout
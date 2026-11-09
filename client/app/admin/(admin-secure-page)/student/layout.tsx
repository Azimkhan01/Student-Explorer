import Navbar from '@/components/admin/student/Navbar'
import React from 'react'

function layout({children}:{children:React.ReactNode}) {
  return (
    <>
    <Navbar/>
    {children}
    </>
  )
}

export default layout
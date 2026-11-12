import QuickZyNavbar from '@/components/teacher/QuickZyNavbar'
import React from 'react'

function layout({children}:{children:React.ReactNode}) {
  return (
    <>
    <QuickZyNavbar/>
    {children}

    </>
  )
}

export default layout
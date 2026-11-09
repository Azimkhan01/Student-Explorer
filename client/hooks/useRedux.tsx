'use client'
import { store } from '@/redux/Store'
import React from 'react'
import { Provider } from 'react-redux'

function UseRedux({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>{children}</Provider>
  )
}

export default UseRedux
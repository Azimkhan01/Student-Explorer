import { configureStore } from '@reduxjs/toolkit'
import roleReducer from './user/User.Slice'

export const store = configureStore({
  reducer: {
    role:roleReducer
  }
})

// Infer the `RootState`, `AppDispatch`, and `AppStore` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
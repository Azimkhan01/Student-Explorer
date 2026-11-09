
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../Store";

export type UserRole = "student" | "teacher" | "admin";

interface RoleState {
    role: UserRole | null;
    email: string | null;
    username: string | null;
    isLoading: boolean;
    isError: boolean;
}

const initialState: RoleState = {
    role: null,
    email: null,
    username: null,
    isLoading: false,
    isError: false,
};

export const roleSlice = createSlice({
    name: "role",
    initialState,

    reducers: {
        clearAll: (state) => {
            state.email = null;
            state.username = null;
            state.role = null;
            state.isLoading = false;
            state.isError = false;
        },

        setAll: (state, action: PayloadAction<Partial<RoleState>>) => {
            Object.assign(state, action.payload);
        },

        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        setIsError: (state, action: PayloadAction<boolean>) => {
            state.isError = action.payload;
        },
    },
});

export const {
    setAll,
    clearAll,
    setIsLoading,
    setIsError,
} = roleSlice.actions;

export const selectRole = (state: RootState) => state.role.role;
export const selectUser = (state: RootState) => state.role;

export default roleSlice.reducer;

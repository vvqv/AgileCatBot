import { coreSlice } from '@reducers/core';
import { combineReducers } from '@reduxjs/toolkit';

export const rootReducer = combineReducers({
    core: coreSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

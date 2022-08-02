import {
    TypedUseSelectorHook,
    useDispatch as _useDispatch,
    useSelector as _useSelector,
} from 'react-redux';

import { CoreActionTypes } from '@reducers/core';
import { rootSaga } from '@reducers/rootSaga';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer, RootState } from '@src/reducers';
import createSagaMiddleware from 'redux-saga';
import devToolsEnhancer from 'remote-redux-devtools';

export type StoreEvent = CoreActionTypes;

export function useDispatch() {
    const dispatch = _useDispatch();
    return (event: StoreEvent) => {
        dispatch(event);
    };
}

export const useSelector: TypedUseSelectorHook<RootState> = _useSelector;

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
    reducer: rootReducer,
    middleware: [sagaMiddleware],
    devTools: false,
    enhancers: [
        devToolsEnhancer({
            realtime: true,
            port: 8000,
        }),
    ],
});
export type Store = typeof store;

sagaMiddleware.run(rootSaga);

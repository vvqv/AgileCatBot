import { watchCoreServices } from '@reducers/core/saga';
import { fork } from 'redux-saga/effects';

export function* rootSaga() {
    yield fork(watchCoreServices);
}

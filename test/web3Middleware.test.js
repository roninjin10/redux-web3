import Promise from 'bluebird'
import { MockPromiEvent, MockStore, MockNext } from './mocks'
import EventEmitter from 'events'

import { isPromiEvent } from '../src/isPromiEvent'
import { isPromise } from '../src/isPromise'
import web3Middleware from '../src'

describe ('test isPromiEvent', () => {
  it('should return false for null', () => {
    expect(isPromiEvent(null)).toBe(false);
  });

  it ('should return false for a non object', () => {
    expect(isPromiEvent(true)).toBe(false);
  });

  it ('should return false for a EventEmitter that is not a promise', () => {
    expect(isPromiEvent(new EventEmitter())).toBe(false);
  });

  it('should return false for a Promise that is not an EventEmitter', () => {
    expect(isPromiEvent(Promise.resolve(null))).toBe(false);
  });

  it ('should return true for a PromiEvent', () => {
    expect(isPromiEvent(new MockPromiEvent(Promise.resolve(null)))).toBe(true);
  });
});

describe ('test isPromise', () => {
  it('should return true for a Promise', () => {
    expect(isPromise(Promise.resolve(null))).toBe(true)
  })

  it('should not return true for a non Promise', () => {
    expect(isPromise({})).toBe(false)
  })
})

describe ('test web3Middleware', () => {
  let dispatchAction;
  let mockNext;
  let mockStore;

  const type = {type: 'TEST'}
  const CALLED_NEXT_ACTION = 'called next(action)';
  const unresolvedPromise = new Promise(() => {});

  beforeEach(() => {
    mockNext = new MockNext();
    mockStore = new MockStore();
    dispatchAction = web3Middleware()(mockStore)(mockNext.next);
  });

  it('should return next action if payload doesn\'t exist', () => {
    const result = CALLED_NEXT_ACTION;

    dispatchAction({result, ...type});

    expect(mockNext.actions[0].result).toBe(result);
  });

  it('should return next action if payload is not a promiEvent and payload.promiEvent is not a promievent', () => {
    const result = CALLED_NEXT_ACTION;

    dispatchAction({
      payload: {
        thisPayload: 'not promise',
        promiEvent: 'not a promiEvent'
      },
      result,
      ...type
    });

    expect(mockNext.actions[0].result).toBe(result);
  });

  it('should not call next if payload is a PromiEvent', () => {
    const promiEvent = new MockPromiEvent(Promise.resolve(null));

    dispatchAction({
      payload: promiEvent,
      ...type
    })

    expect(mockNext.actions.length).toBe(0);
  })

  it('should not call next if payload.promiEvent is a PromiEvent', () => {
    const promiEvent = new MockPromiEvent(Promise.resolve(null))

    dispatchAction({
      payload: {promiEvent},
      ...type
    });

    expect(mockNext.actions.length).toBe(0);
  });

  it('should dispatched _PENDING right away with the data in payload', () => {
    const promiEvent = new MockPromiEvent(Promise.resolve(null));
    const data = 'should be dispatched with _PENDING action';

    dispatchAction({
      payload: {
        promiEvent,
        data,
      },
      ...type
    });

    expect(mockStore.dispatched[0]).toEqual({
      type: `${type.type}_PENDING`,
      payload: data
    });
  });

  it('should dispatch _FULFILLED when fulfilled', async () => {
    const resolvedPayload = 'resolved payload'
    const promiEvent = new MockPromiEvent(Promise.resolve(resolvedPayload));

    await dispatchAction({
      payload: promiEvent,
      ...type
    });

    expect(mockStore.dispatched[0]).toEqual({
      type: `${type.type}_PENDING`
    });

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_FULFILLED`,
      payload: resolvedPayload
    });
  });



  it('should dispatch _REJECTED when rejected', async () => {
    const errorPayload = 'reason for rejection';
    const promiEvent = new MockPromiEvent(new Promise((resolve, reject) => {
        reject(errorPayload);
    }));

    await dispatchAction({
      payload: promiEvent,
      ...type
    });

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_REJECTED`,
      payload: errorPayload,
      error: true
    });
  });

  it('should dispatch _HASHED when hashed', () => {
    const promiEvent = new MockPromiEvent(unresolvedPromise);
    const transactionHash = 'transactionHash';

    dispatchAction({
      payload: promiEvent,
      ...type
    });

    promiEvent.emit('transactionHash', transactionHash);

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_HASHED`,
      payload: transactionHash
    });
  });

  it('should dispatch _CONFIRMATION when on a confirmation event with the number confirmation', () => {
    const promiEvent = new MockPromiEvent(unresolvedPromise);
    const confirmationNumber = 'confirmationNumber';
    const reciept = 'reciept';

    dispatchAction({
      payload: promiEvent,
      ...type
    });

    promiEvent.emit('confirmation', confirmationNumber, reciept);
    promiEvent.emit('confirmation', confirmationNumber, reciept);

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_CONFIRMED`,
      payload: {
        confirmationNumber,
        reciept,
        confirmationsCount: 1
      }
    });

    expect(mockStore.dispatched[2]).toEqual({
      type: `${type.type}_CONFIRMED`,
      payload: {
        confirmationNumber,
        reciept,
        confirmationsCount: 2
      }
    });
  });

  it ('should dispatch _RECEIPT on receipt', () => {
    const promiEvent = new MockPromiEvent(unresolvedPromise);
    const receipt = 'receipt';

    dispatchAction({
      payload: promiEvent,
      ...type
    });

    promiEvent.emit('receipt', receipt);

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_RECIEPT`,
      payload: receipt
    });
  });

  it ('should dispatch _ERROR on error', () => {
    const promiEvent = new MockPromiEvent(unresolvedPromise)
    const error = 'error'

    dispatchAction({
      payload: promiEvent,
      ...type
    });

    promiEvent.emit('error', error);

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_ERROR`,
      payload: error,
      error: true
    });
  });
});

describe('test middleware with Promise', () => {
  let dispatchAction;
  let mockNext;
  let mockStore;

  const type = {type: 'TEST'}
  const resolvedPromise = Promise.resolve('resolve');

  beforeEach(() => {
    mockNext = new MockNext();
    mockStore = new MockStore();
    dispatchAction = web3Middleware()(mockStore)(mockNext.next.bind(mockNext));
  });

  it('should not call next if payload is a Promise', () => {
    dispatchAction({
      payload: resolvedPromise,
      ...type
    })

    expect(mockNext.actions.length).toBe(0)
  })

  it('should not call next if payload.promiEvent is a Promise', () => {
    dispatchAction({
      payload: {promiEvent: resolvedPromise},
      ...type
    });

    expect(mockNext.actions.length).toBe(0);
  });

  it('should dispatched _PENDING right away with the data in payload', () => {
    const data = 'should be dispatched with _PENDING action';

    dispatchAction({
      payload: {
        promiEvent: resolvedPromise,
        data,
      },
      ...type
    });

    expect(mockStore.dispatched[0]).toEqual({
      type: `${type.type}_PENDING`,
      payload: data
    });
  });

  it('should dispatch _FULFILLED when fulfilled', async () => {
    const resolvedPayload = 'resolved payload';
    const promise = Promise.resolve(resolvedPayload);

    await dispatchAction({
      payload: promise,
      ...type
    });

    expect(mockStore.dispatched[0]).toEqual({
      type: `${type.type}_PENDING`
    });

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_FULFILLED`,
      payload: resolvedPayload
    });
  });



  it('should dispatch _REJECTED when rejected', async () => {
    const errorPayload = 'reason for rejection';
    const promise = new Promise((resolve, reject) => {
        reject(errorPayload);
    });

    await dispatchAction({
      payload: promise,
      ...type
    });

    expect(mockStore.dispatched[1]).toEqual({
      type: `${type.type}_REJECTED`,
      payload: errorPayload,
      error: true
    });
  });
})

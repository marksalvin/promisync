const test = require('tape');

test('that thenable is resolved and value is passed back into generator', t => {

  t.plan(2);

  const target = require('../src/async-runner');
  
  const fakeResolve = () => {
    t.pass('promise resolve called');
  };

  const fakeReject = () => {
    t.fail('this should not be called');
  };

  const fakeGenerator = function *() {
    const result = yield Promise.resolve('fake resolution reason');
    t.equals(result, 'fake resolution reason',
      'generator function next is called with promise resolution value');
  };

  const it = fakeGenerator();
  const fakeThenable = it.next().value;
  target(fakeThenable, fakeResolve, fakeReject, it);

});

test('that returned value from generator is passed into resolve', t => {

  t.plan(1);

  const target = require('../src/async-runner');
  
  const fakeResolve = value => {
    t.equals(value, 'fake generator return value', 'generator return value passed to promise resolution');
  };

  const fakeReject = () => {
    t.fail('this should not be called');
  };

  const fakeGenerator = function *() {
    // NB: This is necessary as function should not be called with an already completed iterator
    yield Promise.resolve();
    return 'fake generator return value';
  };

  const it = fakeGenerator();
  const next = it.next();
  const fakeThenable = next.value;

  target(fakeThenable, fakeResolve, fakeReject, it);

});

test('that multiple promises can be resolved', t => {

  t.plan(4);

  const target = require('../src/async-runner');
  
  const fakeResolve = value => {
    t.pass('promise resolved after multiple yielded promises');
  };

  const fakeReject = () => {
    t.fail('this should not be called');
  };

  const fakeGenerator = function *() {
    const firstResult = yield Promise.resolve('first resolution value');
    t.equals(firstResult, 'first resolution value', 'first promise is resolved');
    const secondResult = yield Promise.resolve('second resolution value');
    t.equals(secondResult, 'second resolution value', 'second promise is resolved');
    const thirdResult = yield Promise.resolve('third resolution value');
    t.equals(thirdResult, 'third resolution value', 'third promise is resolved');
  };

  const it = fakeGenerator();
  const next = it.next();
  const fakeThenable = next.value;

  target(fakeThenable, fakeResolve, fakeReject, it);

});

test('that an attempt to yield a non promises will reject the promise', t => {

  t.plan(1);

  const target = require('../src/async-runner');
  
  const fakeResolve = () => {
    t.fail('this should not be called');
  };

  const fakeReject = value => {
    t.equals(value, 'Only promises may be yielded, but "5" was yielded instead');
  };

  const fakeGenerator = function *() {
    const result = yield 5;
    t.fail('this should not be called');
  };

  const it = fakeGenerator();
  const next = it.next();
  const fakeThenable = next.value;

  target(fakeThenable, fakeResolve, fakeReject, it);

});

test('that when thenable is rejected an error is thrown, which can be caught within the generator, allowing the function to continue', t => {

  t.plan(2);

  const target = require('../src/async-runner');
  
  const fakeResolve = value => {
    t.equals(value, 'fake generator return value', 'generator return value passed to promise resolution');
  };

  const fakeReject = () => {
    t.fail('this should not be called');
  };

  const fakeGenerator = function *() {
    try {
      yield Promise.reject('fake rejection reason');
      t.fail('this should not be called, error should be caught below');
    } catch (error) {
      t.pass('error caught by try/catch block');
    }
    
    return 'fake generator return value';
  };

  const it = fakeGenerator();
  const fakeThenable = it.next().value;
  
  target(fakeThenable, fakeResolve, fakeReject, it);

});

test('that when thenable is rejected an error is thrown, which when uncaught by try/catch block in generator leads to promise being rejected', t => {

  t.plan(1);

  const target = require('../src/async-runner');
  
  const fakeResolve = value => {
    t.fail('this should not be called');
  };

  const fakeReject = value => {
    t.deepEquals(value, new Error('fake rejection reason'), 'generator thrown error passed to promise rejection when uncaught by try/catch block');
  };

  const fakeGenerator = function *() {
    yield Promise.reject('fake rejection reason');
    t.fail('this should not be called as generator should throw an error which is handled in runner function');
  };

  const it = fakeGenerator();
  const fakeThenable = it.next().value;

  target(fakeThenable, fakeResolve, fakeReject, it);

});

test('that when initial iterator next() throws an uncaught error, it should be caught by the external calling code, as this call is made externally. The promise should be rejected here too', t => {

  t.plan(2);

  const target = require('../src/async-runner');
  
  const fakeResolve = value => {
    t.fail('this should not be called');
  };

  const fakeReject = value => {
    t.deepEquals(value, new Error('fake thrown error'), 'generator thrown error passed to promise rejection when uncaught by try/catch block');
  };

  const fakeGenerator = function *() {
    throw new Error('fake thrown error');
    t.fail('this should not be called as generator should throw an error which is handled in runner function');
  };

  const it = fakeGenerator();
  
  // NB: This is how external code should consume the function
  // TODO: implement this error handling in calling code with associated test
  try {
    const fakeThenable = it.next().value;
    target(fakeThenable, fakeResolve, fakeReject, it);
  } catch (error) {
    fakeReject(error);
    t.deepEquals(error, new Error('fake thrown error'), 'uncaught error handled by external calling code');
  }

});

test('that assuming initial iterator next() does not throw an uncaught error, when subsequent uncaught errors are thrown they are caught in the runner and the promise is rejected', t => {

  t.plan(1);

  const target = require('../src/async-runner');
  
  const fakeResolve = value => {
    t.fail('this should not be called');
  };

  const fakeReject = value => {
    t.deepEquals(value, new Error('fake thrown error'), 'generator thrown error passed to promise rejection when uncaught by try/catch block');
  };

  const fakeGenerator = function *() {
    // Yield a promise to prevent initial iterator next() from throwing an uncaught error
    yield Promise.resolve();
    throw new Error('fake thrown error');
    t.fail('this should not be called as generator should throw an error which is handled in runner function');
  };

  const it = fakeGenerator();
  const fakeThenable = it.next().value;

  target(fakeThenable, fakeResolve, fakeReject, it);

});

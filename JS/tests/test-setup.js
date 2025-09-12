/**
 * Test Setup and Utilities
 * Basic testing infrastructure for the extension
 */

/**
 * Simple test runner
 */
export class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.isRunning = false;
    }

    /**
     * Add a test
     * @param {string} name - Test name
     * @param {Function} testFn - Test function
     */
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    /**
     * Run all tests
     * @returns {Promise<Object>} Test results
     */
    async run() {
        this.isRunning = true;
        this.results = [];

        console.log('🧪 Running tests...\n');

        for (const test of this.tests) {
            try {
                await this.runTest(test);
            } catch (error) {
                this.results.push({
                    name: test.name,
                    status: 'error',
                    error: error.message
                });
            }
        }

        this.isRunning = false;
        this.printResults();
        return this.getResults();
    }

    /**
     * Run a single test
     * @param {Object} test - Test object
     */
    async runTest(test) {
        const start = performance.now();
        
        try {
            await test.testFn();
            const duration = performance.now() - start;
            
            this.results.push({
                name: test.name,
                status: 'pass',
                duration
            });
            
            console.log(`✅ ${test.name} (${duration.toFixed(2)}ms)`);
        } catch (error) {
            const duration = performance.now() - start;
            
            this.results.push({
                name: test.name,
                status: 'fail',
                error: error.message,
                duration
            });
            
            console.log(`❌ ${test.name} (${duration.toFixed(2)}ms): ${error.message}`);
        }
    }

    /**
     * Print test results
     */
    printResults() {
        const passed = this.results.filter(r => r.status === 'pass').length;
        const failed = this.results.filter(r => r.status === 'fail').length;
        const errors = this.results.filter(r => r.status === 'error').length;
        const total = this.results.length;

        console.log('\n📊 Test Results:');
        console.log(`Total: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Errors: ${errors}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    }

    /**
     * Get test results
     * @returns {Object} Test results
     */
    getResults() {
        return {
            total: this.results.length,
            passed: this.results.filter(r => r.status === 'pass').length,
            failed: this.results.filter(r => r.status === 'fail').length,
            errors: this.results.filter(r => r.status === 'error').length,
            results: this.results
        };
    }
}

/**
 * Assertion utilities
 */
export const assert = {
    /**
     * Assert that a condition is true
     * @param {boolean} condition - Condition to check
     * @param {string} message - Error message
     */
    isTrue(condition, message = 'Expected condition to be true') {
        if (!condition) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a condition is false
     * @param {boolean} condition - Condition to check
     * @param {string} message - Error message
     */
    isFalse(condition, message = 'Expected condition to be false') {
        if (condition) {
            throw new Error(message);
        }
    },

    /**
     * Assert that two values are equal
     * @param {*} actual - Actual value
     * @param {*} expected - Expected value
     * @param {string} message - Error message
     */
    equal(actual, expected, message = `Expected ${actual} to equal ${expected}`) {
        if (actual !== expected) {
            throw new Error(message);
        }
    },

    /**
     * Assert that two values are not equal
     * @param {*} actual - Actual value
     * @param {*} expected - Expected value
     * @param {string} message - Error message
     */
    notEqual(actual, expected, message = `Expected ${actual} to not equal ${expected}`) {
        if (actual === expected) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a value is null
     * @param {*} value - Value to check
     * @param {string} message - Error message
     */
    isNull(value, message = `Expected ${value} to be null`) {
        if (value !== null) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a value is not null
     * @param {*} value - Value to check
     * @param {string} message - Error message
     */
    isNotNull(value, message = `Expected ${value} to not be null`) {
        if (value === null) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a value is undefined
     * @param {*} value - Value to check
     * @param {string} message - Error message
     */
    isUndefined(value, message = `Expected ${value} to be undefined`) {
        if (value !== undefined) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a value is not undefined
     * @param {*} value - Value to check
     * @param {string} message - Error message
     */
    isNotUndefined(value, message = `Expected ${value} to not be undefined`) {
        if (value === undefined) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a value is an instance of a constructor
     * @param {*} value - Value to check
     * @param {Function} constructor - Constructor function
     * @param {string} message - Error message
     */
    instanceOf(value, constructor, message = `Expected ${value} to be instance of ${constructor.name}`) {
        if (!(value instanceof constructor)) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a function throws an error
     * @param {Function} fn - Function to test
     * @param {string|Function} expectedError - Expected error message or constructor
     * @param {string} message - Error message
     */
    throws(fn, expectedError = null, message = 'Expected function to throw an error') {
        try {
            fn();
            throw new Error(message);
        } catch (error) {
            if (expectedError) {
                if (typeof expectedError === 'string') {
                    if (error.message !== expectedError) {
                        throw new Error(`Expected error message "${expectedError}", got "${error.message}"`);
                    }
                } else if (typeof expectedError === 'function') {
                    if (!(error instanceof expectedError)) {
                        throw new Error(`Expected error to be instance of ${expectedError.name}`);
                    }
                }
            }
        }
    }
};

/**
 * Mock utilities
 */
export const mock = {
    /**
     * Create a mock function
     * @param {*} returnValue - Return value
     * @returns {Function} Mock function
     */
    fn(returnValue = undefined) {
        const calls = [];
        const fn = (...args) => {
            calls.push(args);
            return returnValue;
        };
        
        fn.calls = calls;
        fn.callCount = () => calls.length;
        fn.lastCall = () => calls[calls.length - 1];
        fn.reset = () => calls.length = 0;
        
        return fn;
    },

    /**
     * Create a mock object
     * @param {Object} methods - Methods to mock
     * @returns {Object} Mock object
     */
    object(methods = {}) {
        const mockObj = {};
        
        Object.entries(methods).forEach(([key, value]) => {
            if (typeof value === 'function') {
                mockObj[key] = this.fn(value());
            } else {
                mockObj[key] = value;
            }
        });
        
        return mockObj;
    }
};

/**
 * Test utilities
 */
export const testUtils = {
    /**
     * Wait for a condition to be true
     * @param {Function} condition - Condition function
     * @param {number} timeout - Timeout in milliseconds
     * @param {number} interval - Check interval in milliseconds
     * @returns {Promise<void>}
     */
    async waitFor(condition, timeout = 1000, interval = 10) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            if (condition()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        throw new Error(`Condition not met within ${timeout}ms`);
    },

    /**
     * Create a test element
     * @param {string} tag - HTML tag
     * @param {Object} attributes - Element attributes
     * @returns {HTMLElement} Test element
     */
    createElement(tag = 'div', attributes = {}) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    },

    /**
     * Clean up test elements
     * @param {HTMLElement[]} elements - Elements to clean up
     */
    cleanup(...elements) {
        elements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
};

// Create global test runner
export const testRunner = new TestRunner();

// Export convenience functions
export const test = (name, testFn) => testRunner.test(name, testFn);
export const runTests = () => testRunner.run();

import { test, assert, mock, testUtils } from './test-setup.js';
import { urlUtils, timeUtils, validationUtils } from '../utils/utils-modern.js';

/**
 * Example tests for the extension
 */

// URL Utilities Tests
test('urlUtils.normalizeYouTubeUrl - should normalize YouTube URLs', () => {
    const url = 'https://www.youtube.com/watch?v=abc123&t=120s';
    const normalized = urlUtils.normalizeYouTubeUrl(url);
    assert.equal(normalized, 'https://www.youtube.com/watch?v=abc123', 'Should remove timestamp parameters');
});

test('urlUtils.normalizeYouTubeUrl - should handle youtu.be URLs', () => {
    const url = 'https://youtu.be/abc123?t=120s';
    const normalized = urlUtils.normalizeYouTubeUrl(url);
    assert.equal(normalized, 'https://youtu.be/abc123', 'Should remove timestamp parameters from youtu.be URLs');
});

test('urlUtils.normalizeYouTubeUrl - should return non-YouTube URLs unchanged', () => {
    const url = 'https://example.com/video';
    const normalized = urlUtils.normalizeYouTubeUrl(url);
    assert.equal(normalized, url, 'Should return non-YouTube URLs unchanged');
});

test('urlUtils.isYouTubeUrl - should identify YouTube URLs', () => {
    assert.isTrue(urlUtils.isYouTubeUrl('https://www.youtube.com/watch?v=abc123'), 'Should identify youtube.com URLs');
    assert.isTrue(urlUtils.isYouTubeUrl('https://youtu.be/abc123'), 'Should identify youtu.be URLs');
    assert.isFalse(urlUtils.isYouTubeUrl('https://example.com/video'), 'Should not identify non-YouTube URLs');
});

test('urlUtils.extractVideoId - should extract video ID from YouTube URLs', () => {
    assert.equal(urlUtils.extractVideoId('https://www.youtube.com/watch?v=abc123'), 'abc123', 'Should extract from youtube.com URLs');
    assert.equal(urlUtils.extractVideoId('https://youtu.be/abc123'), 'abc123', 'Should extract from youtu.be URLs');
    assert.isNull(urlUtils.extractVideoId('https://example.com/video'), 'Should return null for non-YouTube URLs');
});

// Time Utilities Tests
test('timeUtils.parseTimestamp - should parse MM:SS format', () => {
    assert.equal(timeUtils.parseTimestamp('2:30'), 150, 'Should parse MM:SS format correctly');
    assert.equal(timeUtils.parseTimestamp('0:05'), 5, 'Should parse single digit seconds');
});

test('timeUtils.parseTimestamp - should parse HH:MM:SS format', () => {
    assert.equal(timeUtils.parseTimestamp('1:02:30'), 3750, 'Should parse HH:MM:SS format correctly');
    assert.equal(timeUtils.parseTimestamp('0:00:05'), 5, 'Should parse single digit seconds in HH:MM:SS format');
});

test('timeUtils.formatTimestamp - should format seconds to MM:SS', () => {
    assert.equal(timeUtils.formatTimestamp(150), '2:30', 'Should format seconds to MM:SS');
    assert.equal(timeUtils.formatTimestamp(5), '0:05', 'Should format single digit seconds');
});

test('timeUtils.formatTimestamp - should format seconds to HH:MM:SS when includeHours is true', () => {
    assert.equal(timeUtils.formatTimestamp(3750, true), '1:02:30', 'Should format with hours when requested');
    assert.equal(timeUtils.formatTimestamp(5, true), '0:00:05', 'Should format single digit seconds with hours');
});

test('timeUtils.isTimeClose - should check if timestamps are close', () => {
    assert.isTrue(timeUtils.isTimeClose('2:30', '2:32', 5), 'Should identify close timestamps');
    assert.isFalse(timeUtils.isTimeClose('2:30', '2:40', 5), 'Should identify distant timestamps');
});

// Validation Utilities Tests
test('validationUtils.isValidHexColor - should validate hex colors', () => {
    assert.isTrue(validationUtils.isValidHexColor('#FF0000'), 'Should validate valid hex colors');
    assert.isTrue(validationUtils.isValidHexColor('#ff0000'), 'Should validate lowercase hex colors');
    assert.isFalse(validationUtils.isValidHexColor('red'), 'Should reject color names');
    assert.isFalse(validationUtils.isValidHexColor('#FF00'), 'Should reject invalid hex colors');
});

test('validationUtils.isValidTimestamp - should validate timestamp format', () => {
    assert.isTrue(validationUtils.isValidTimestamp('2:30'), 'Should validate MM:SS format');
    assert.isTrue(validationUtils.isValidTimestamp('1:02:30'), 'Should validate HH:MM:SS format');
    assert.isFalse(validationUtils.isValidTimestamp('2:60'), 'Should reject invalid timestamps');
    assert.isFalse(validationUtils.isValidTimestamp('2'), 'Should reject single number timestamps');
});

test('validationUtils.isValidNoteText - should validate note text', () => {
    assert.isTrue(validationUtils.isValidNoteText('Valid note text'), 'Should validate valid note text');
    assert.isFalse(validationUtils.isValidNoteText(''), 'Should reject empty note text');
    assert.isFalse(validationUtils.isValidNoteText('   '), 'Should reject whitespace-only note text');
    assert.isFalse(validationUtils.isValidNoteText('a'.repeat(1001)), 'Should reject overly long note text');
});

test('validationUtils.isValidGroupName - should validate group names', () => {
    assert.isTrue(validationUtils.isValidGroupName('Valid Group'), 'Should validate valid group names');
    assert.isFalse(validationUtils.isValidGroupName(''), 'Should reject empty group names');
    assert.isFalse(validationUtils.isValidGroupName('   '), 'Should reject whitespace-only group names');
    assert.isFalse(validationUtils.isValidGroupName('a'.repeat(51)), 'Should reject overly long group names');
});

// Mock Tests
test('mock.fn - should create mock function with return value', () => {
    const mockFn = mock.fn('test value');
    assert.equal(mockFn(), 'test value', 'Should return specified value');
    assert.equal(mockFn.callCount(), 1, 'Should track call count');
});

test('mock.fn - should track function calls', () => {
    const mockFn = mock.fn();
    mockFn('arg1', 'arg2');
    mockFn('arg3');
    
    assert.equal(mockFn.callCount(), 2, 'Should track multiple calls');
    assert.equal(mockFn.lastCall()[0], 'arg3', 'Should track last call arguments');
});

test('mock.object - should create mock object', () => {
    const mockObj = mock.object({
        method1: 'value1',
        method2: () => 'value2'
    });
    
    assert.equal(mockObj.method1, 'value1', 'Should set static values');
    assert.equal(mockObj.method2(), 'value2', 'Should create mock functions');
});

// Test Utilities Tests
test('testUtils.createElement - should create test element', () => {
    const element = testUtils.createElement('div', { id: 'test', class: 'test-class' });
    
    assert.instanceOf(element, HTMLDivElement, 'Should create HTML element');
    assert.equal(element.id, 'test', 'Should set element attributes');
    assert.equal(element.className, 'test-class', 'Should set element class');
});

test('testUtils.cleanup - should clean up test elements', () => {
    const element = testUtils.createElement('div');
    document.body.appendChild(element);
    
    assert.isTrue(document.body.contains(element), 'Element should be in DOM before cleanup');
    
    testUtils.cleanup(element);
    
    assert.isFalse(document.body.contains(element), 'Element should be removed after cleanup');
});

// Async Tests
test('testUtils.waitFor - should wait for condition', async () => {
    let condition = false;
    
    // Set condition to true after 100ms
    setTimeout(() => { condition = true; }, 100);
    
    await testUtils.waitFor(() => condition, 200);
    
    assert.isTrue(condition, 'Condition should be true after waiting');
});

test('testUtils.waitFor - should timeout if condition not met', async () => {
    let condition = false;
    
    try {
        await testUtils.waitFor(() => condition, 50);
        assert.isTrue(false, 'Should have thrown timeout error');
    } catch (error) {
        assert.isTrue(error.message.includes('Condition not met'), 'Should throw timeout error');
    }
});

// Error Handling Tests
test('Error handling - should handle invalid input gracefully', () => {
    assert.equal(urlUtils.normalizeYouTubeUrl(null), null, 'Should handle null input');
    assert.equal(urlUtils.normalizeYouTubeUrl(undefined), undefined, 'Should handle undefined input');
    assert.equal(urlUtils.normalizeYouTubeUrl(''), '', 'Should handle empty string input');
});

test('Error handling - should handle malformed URLs', () => {
    const malformedUrl = 'not-a-url';
    const result = urlUtils.normalizeYouTubeUrl(malformedUrl);
    assert.equal(result, malformedUrl, 'Should return original string for malformed URLs');
});

// Performance Tests
test('Performance - should handle large datasets efficiently', () => {
    const start = performance.now();
    
    // Test with large number of timestamps
    for (let i = 0; i < 1000; i++) {
        timeUtils.parseTimestamp(`${Math.floor(i / 60)}:${i % 60}`);
    }
    
    const end = performance.now();
    const duration = end - start;
    
    assert.isTrue(duration < 100, `Should process 1000 timestamps in less than 100ms (took ${duration.toFixed(2)}ms)`);
});

// Integration Tests
test('Integration - should work with real DOM elements', () => {
    const container = testUtils.createElement('div', { id: 'test-container' });
    const button = testUtils.createElement('button', { id: 'test-button' });
    
    container.appendChild(button);
    document.body.appendChild(container);
    
    try {
        assert.isTrue(document.body.contains(container), 'Container should be in DOM');
        assert.isTrue(container.contains(button), 'Button should be in container');
        assert.equal(container.children.length, 1, 'Container should have one child');
    } finally {
        testUtils.cleanup(container);
    }
});

console.log('📝 Example tests loaded. Run with: runTests()');

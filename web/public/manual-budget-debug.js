// Manual Budget localStorage Test
// Run this in browser console to diagnose localStorage issues

console.log('🔍 Manual Budget localStorage Diagnostic');

// Test 1: Check localStorage availability
try {
  const test = 'manual-budget-test';
  localStorage.setItem(test, 'test-value');
  const retrieved = localStorage.getItem(test);
  localStorage.removeItem(test);
  
  if (retrieved === 'test-value') {
    console.log('✅ localStorage is working correctly');
  } else {
    console.error('❌ localStorage set/get not working');
  }
} catch (error) {
  console.error('❌ localStorage not available:', error);
}

// Test 2: Check current manual budget keys
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;
const currentKey = `manualBudget:${currentYear}-${currentMonth}`;

console.log('📅 Current date info:', {
  currentDate: currentDate.toISOString(),
  currentYear,
  currentMonth,
  expectedKey: currentKey
});

// Test 3: List all manual budget keys
const allKeys = Object.keys(localStorage).filter(key => key.startsWith('manualBudget:'));
console.log('🗂️ All manual budget localStorage keys:', allKeys);

// Test 4: Show current month data
const currentData = localStorage.getItem(currentKey);
console.log('📱 Current month data:', {
  key: currentKey,
  data: currentData,
  parsed: currentData ? JSON.parse(currentData) : null
});

// Test 5: Show all stored manual budget data
allKeys.forEach(key => {
  const data = localStorage.getItem(key);
  console.log(`📝 ${key}:`, data ? JSON.parse(data) : null);
});

// Test 6: Create test data
const testData = {
  bankAmount: 1000,
  items: [
    { id: 'test-1', name: 'Test Salary', amount: 3000 },
    { id: 'test-2', name: 'Test Expense', amount: -500 }
  ]
};

try {
  localStorage.setItem(currentKey, JSON.stringify(testData));
  console.log('✅ Test data saved for current month');
  
  // Verify it was saved
  const verified = localStorage.getItem(currentKey);
  console.log('🔍 Verified test data:', verified ? JSON.parse(verified) : null);
} catch (error) {
  console.error('❌ Failed to save test data:', error);
}

console.log('🏁 Manual Budget localStorage diagnostic complete');
console.log('💡 Check the browser console logs above for results');
console.log('🔧 If data is not persisting, the issue may be:');
console.log('   1. Browser localStorage disabled/full');
console.log('   2. Private browsing mode');
console.log('   3. Date/month calculation differences');
console.log('   4. Component state not triggering saves correctly');

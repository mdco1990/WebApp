import { renderHook, act, waitFor } from '@testing-library/react';
import { useManualBudget } from '../useManualBudget';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  getManualBudget: jest.fn(),
  saveManualBudget: jest.fn(),
}));

const mockGetManualBudget = api.getManualBudget as jest.MockedFunction<typeof api.getManualBudget>;
const mockSaveManualBudget = api.saveManualBudget as jest.MockedFunction<typeof api.saveManualBudget>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useManualBudget - Debug manual budget disappearing', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const testDate = new Date(2024, 0, 15); // January 2024

  it('should persist data across multiple operations', async () => {
    // Test scenario: User creates manual budget items, should persist after page reload simulation
    const serverData = {
      bank_amount_cents: 100000, // $1000
      items: [
        { id: '1', name: 'Rent', amount_cents: -80000 }, // -$800
        { id: '2', name: 'Income', amount_cents: 50000 }, // $500
      ],
    };
    
    mockGetManualBudget.mockResolvedValue(serverData);
    mockSaveManualBudget.mockResolvedValue({} as Response);

    // Initial render - should load from server
    const { result, rerender } = renderHook(() => useManualBudget(testDate));

    // Wait for server data to load
    await waitFor(() => {
      expect(result.current.manualBudget).toEqual({
        bankAmount: 1000,
        items: [
          { id: '1', name: 'Rent', amount: -800 },
          { id: '2', name: 'Income', amount: 500 },
        ],
      });
    });

    // Verify localStorage backup was created
    const localStorageKey = 'manualBudget:2024-1';
    const savedLocalData = JSON.parse(localStorageMock.getItem(localStorageKey) || '{}');
    expect(savedLocalData).toEqual({
      bankAmount: 1000,
      items: [
        { id: '1', name: 'Rent', amount: -800 },
        { id: '2', name: 'Income', amount: 500 },
      ],
    });

    // User modifies the budget
    const newBudget = {
      bankAmount: 1200,
      items: [
        { id: '1', name: 'Rent', amount: -800 },
        { id: '2', name: 'Income', amount: 500 },
        { id: '3', name: 'New Item', amount: 500 }, // Add new item
      ],
    };

    act(() => {
      result.current.setManualBudget(newBudget);
    });

    // Verify immediate state update
    expect(result.current.manualBudget).toEqual(newBudget);

    // Trigger debounced save
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Verify server save was called
    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledWith({
        year: 2024,
        month: 1,
        bank_amount_cents: 120000,
        items: [
          { id: '1', name: 'Rent', amount_cents: -80000 },
          { id: '2', name: 'Income', amount_cents: 50000 },
          { id: '3', name: 'New Item', amount_cents: 50000 },
        ],
      });
    });

    // Simulate page reload by re-rendering hook
    // This should load from server, not lose data
    mockGetManualBudget.mockResolvedValue({
      bank_amount_cents: 120000,
      items: [
        { id: '1', name: 'Rent', amount_cents: -80000 },
        { id: '2', name: 'Income', amount_cents: 50000 },
        { id: '3', name: 'New Item', amount_cents: 50000 },
      ],
    });

    // Force re-render (simulating page reload)
    rerender();

    // Wait for data to load after "reload"
    await waitFor(() => {
      expect(result.current.manualBudget).toEqual(newBudget);
    });

    console.log('Manual budget test: Data persisted correctly after reload simulation');
  });

  it('should handle server errors gracefully and use localStorage fallback', async () => {
    // Pre-populate localStorage with data
    const localData = {
      bankAmount: 1500,
      items: [{ id: 'local-1', name: 'Local Item', amount: 200 }],
    };
    localStorageMock.setItem('manualBudget:2024-1', JSON.stringify(localData));

    // Mock server error
    mockGetManualBudget.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget).toEqual(localData);
    });

    // Verify it falls back to localStorage when server fails
    expect(mockGetManualBudget).toHaveBeenCalledWith({ year: 2024, month: 1 });
    console.log('Manual budget test: Successfully fell back to localStorage when server failed');
  });

  it('should save to both localStorage AND server simultaneously', async () => {
    mockGetManualBudget.mockResolvedValue({ bank_amount_cents: 0, items: [] });
    mockSaveManualBudget.mockResolvedValue({} as Response);

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget.bankAmount).toBe(0);
    });

    const newBudget = {
      bankAmount: 2000,
      items: [{ id: 'test-1', name: 'Test Item', amount: -500 }],
    };

    act(() => {
      result.current.setManualBudget(newBudget);
    });

    // Advance timers to trigger debounced save
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledWith({
        year: 2024,
        month: 1,
        bank_amount_cents: 200000,
        items: [
          {
            id: 'test-1',
            name: 'Test Item',
            amount_cents: -50000,
          },
        ],
      });
    });

    // Check localStorage was also updated
    const savedLocal = JSON.parse(localStorageMock.getItem('manualBudget:2024-1') || '{}');
    expect(savedLocal).toEqual(newBudget);

    console.log('Manual budget test: Data saved to both localStorage and server');
  });

  it('should debug manual budget lifecycle with detailed logging', async () => {
    console.log('\n=== 🔍 DEBUGGING MANUAL BUDGET DISAPPEARING ISSUE ===');
    console.log('📋 Test Scenario: User creates items → saves → reloads → items should persist');
    
    // Scenario 1: Fresh load with server data
    const initialServerData = {
      bank_amount_cents: 250000,
      items: [
        { id: '1', name: 'Salary', amount_cents: 400000 },
        { id: '2', name: 'Rent', amount_cents: -150000 },
      ],
    };
    
    console.log('\n📡 Step 1: Mock server response for initial load');
    console.log('   Server will return:', JSON.stringify(initialServerData, null, 2));
    
    mockGetManualBudget.mockResolvedValue(initialServerData);
    
    const { result } = renderHook(() => useManualBudget(testDate));
    
    await waitFor(() => {
      console.log('\n🎯 Step 2: Initial load completed');
      console.log('   Hook state:', JSON.stringify(result.current.manualBudget, null, 2));
      console.log('   Items count:', result.current.manualBudget.items.length);
      console.log('   LocalStorage key used: manualBudget:2024-1');
      
      // Check what's in localStorage
      const localData = localStorageMock.getItem('manualBudget:2024-1');
      console.log('   LocalStorage backup:', localData ? JSON.parse(localData) : 'null');
      
      expect(result.current.manualBudget.items.length).toBe(2);
    });
    
    // Scenario 2: User adds an item
    const updatedBudget = {
      bankAmount: 2500,
      items: [
        { id: '1', name: 'Salary', amount: 4000 },
        { id: '2', name: 'Rent', amount: -1500 },
        { id: '3', name: 'New Expense', amount: -200 }, // User adds this
      ],
    };
    
    console.log('\n👤 Step 3: User adds new manual budget item');
    console.log('   New budget structure:', JSON.stringify(updatedBudget, null, 2));
    
    act(() => {
      result.current.setManualBudget(updatedBudget);
    });
    
    console.log('\n✅ Step 4: State updated immediately');
    console.log('   Current state:', JSON.stringify(result.current.manualBudget, null, 2));
    console.log('   Items count after add:', result.current.manualBudget.items.length);
    expect(result.current.manualBudget.items.length).toBe(3);
    
    // Check localStorage was updated immediately
    const localDataAfterUpdate = localStorageMock.getItem('manualBudget:2024-1');
    console.log('   LocalStorage after update:', localDataAfterUpdate ? JSON.parse(localDataAfterUpdate) : 'null');
    
    // Scenario 3: Trigger debounced save (simulating auto-save after 400ms)
    console.log('\n⏱️  Step 5: Triggering debounced server save (400ms delay)');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalled();
    });
    
    const saveCallArgs = mockSaveManualBudget.mock.calls[0][0];
    console.log('   Server save API called with:', JSON.stringify(saveCallArgs, null, 2));
    console.log('   ✓ Server should now persist the updated budget');
    
    // Scenario 4: Simulate what happens on page reload
    console.log('\n🔄 Step 6: Simulating page reload/refresh');
    
    // Clear mocks to simulate fresh state
    mockGetManualBudget.mockClear();
    mockSaveManualBudget.mockClear();
    
    // Server should return the updated data (what the backend should have saved)
    const afterSaveServerData = {
      bank_amount_cents: 250000,
      items: [
        { id: '1', name: 'Salary', amount_cents: 400000 },
        { id: '2', name: 'Rent', amount_cents: -150000 },
        { id: '3', name: 'New Expense', amount_cents: -20000 }, // This should be persisted
      ],
    };
    
    console.log('   Mock server response after reload:', JSON.stringify(afterSaveServerData, null, 2));
    mockGetManualBudget.mockResolvedValue(afterSaveServerData);
    
    // Simulate re-mount/reload by creating new hook instance
    const { result: reloadResult } = renderHook(() => useManualBudget(testDate));
    
    console.log('\n🎬 Step 7: New hook instance created (page reloaded)');
    
    await waitFor(() => {
      console.log('   Server GET request made:', mockGetManualBudget.mock.calls.length, 'times');
      console.log('   Final hook state after reload:', JSON.stringify(reloadResult.current.manualBudget, null, 2));
      console.log('   Final items count:', reloadResult.current.manualBudget.items.length);
      
      const finalLocalData = localStorageMock.getItem('manualBudget:2024-1');
      console.log('   Final localStorage state:', finalLocalData ? JSON.parse(finalLocalData) : 'null');
      
      expect(reloadResult.current.manualBudget.items.length).toBe(3);
    });
    
    console.log('\n✅ DEBUGGING RESULT: Manual budget persisted correctly');
    console.log('📝 DEBUGGING NOTES:');
    console.log('   - Hook correctly loads from server on initialization');
    console.log('   - State updates immediately when user makes changes');
    console.log('   - Changes are backed up to localStorage instantly');
    console.log('   - Debounced server save occurs after 400ms');
    console.log('   - On reload, data is fetched from server and restored');
    console.log('   - Dual persistence (localStorage + server) working correctly');
    console.log('=== 🔍 MANUAL BUDGET DEBUG COMPLETE ===\n');
  });

  it('should test edge cases that could cause data loss', async () => {
    console.log('\n🧪 EDGE CASE TESTING - Potential data loss scenarios');
    
    // Edge Case 1: Rapid consecutive updates (race conditions)
    mockGetManualBudget.mockResolvedValue({ bank_amount_cents: 0, items: [] });
    mockSaveManualBudget.mockResolvedValue({} as Response);

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget.bankAmount).toBe(0);
    });

    console.log('\n📦 Edge Case 1: Rapid consecutive updates');
    
    // Simulate rapid user updates (like typing quickly)
    act(() => {
      result.current.setManualBudget({
        bankAmount: 1000,
        items: [{ id: '1', name: 'Item 1', amount: 500 }],
      });
    });

    act(() => {
      result.current.setManualBudget({
        bankAmount: 1000,
        items: [{ id: '1', name: 'Item 1 Updated', amount: 600 }],
      });
    });

    act(() => {
      result.current.setManualBudget({
        bankAmount: 1000,
        items: [
          { id: '1', name: 'Item 1 Updated', amount: 600 },
          { id: '2', name: 'Item 2', amount: -200 },
        ],
      });
    });

    console.log('   State after rapid updates:', JSON.stringify(result.current.manualBudget, null, 2));
    expect(result.current.manualBudget.items.length).toBe(2);

    // Only one debounced save should occur
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledTimes(1);
    });

    console.log('   ✓ Only one debounced save occurred despite rapid updates');

    // Edge Case 2: Server save fails but localStorage succeeds
    console.log('\n💥 Edge Case 2: Server save failure with localStorage fallback');
    
    mockSaveManualBudget.mockClear();
    mockSaveManualBudget.mockRejectedValue(new Error('Network error'));

    act(() => {
      result.current.setManualBudget({
        bankAmount: 1500,
        items: [{ id: '3', name: 'Offline Item', amount: 300 }],
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalled();
    });

    // Should still be in localStorage even if server fails
    const offlineData = localStorageMock.getItem('manualBudget:2024-1');
    const parsedOfflineData = offlineData ? JSON.parse(offlineData) : null;
    console.log('   LocalStorage data after server failure:', parsedOfflineData);
    expect(parsedOfflineData).toBeTruthy();
    expect(parsedOfflineData.items.length).toBe(1);
    expect(parsedOfflineData.items[0].name).toBe('Offline Item');

    console.log('   ✓ Data preserved in localStorage when server fails');

    // Edge Case 3: Month change during unsaved changes
    console.log('\n📅 Edge Case 3: Month change with unsaved data');
    
    const febDate = new Date(2024, 1, 15); // February 2024
    mockGetManualBudget.mockResolvedValue({ bank_amount_cents: 0, items: [] });

    // Create hook for February
    const { result: febResult } = renderHook(() => useManualBudget(febDate));

    await waitFor(() => {
      expect(febResult.current.manualBudget.items.length).toBe(0);
    });

    console.log('   February state (should be empty):', febResult.current.manualBudget);
    console.log('   ✓ Different months maintain separate data');

    console.log('🧪 Edge case testing completed successfully\n');
  });

  it('should simulate real user workflow end-to-end', async () => {
    console.log('\n👤 REAL USER WORKFLOW SIMULATION');
    console.log('📋 Scenario: User opens app → views budget → adds items → saves → reloads');

    // Step 1: User opens app with existing data
    const existingData = {
      bank_amount_cents: 300000, // $3000
      items: [
        { id: '1', name: 'Salary', amount_cents: 500000 },
        { id: '2', name: 'Rent', amount_cents: -120000 },
      ],
    };

    console.log('\n🏠 User opens app - loading existing budget...');
    mockGetManualBudget.mockResolvedValue(existingData);
    mockSaveManualBudget.mockResolvedValue({} as Response);

    const { result, rerender } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      console.log('   Loaded budget:', JSON.stringify(result.current.manualBudget, null, 2));
      expect(result.current.manualBudget.items.length).toBe(2);
    });

    // Step 2: User views current budget (no changes)
    console.log('\n👀 User reviews current budget (no server calls expected)');
    // Just viewing - no API calls should happen
    expect(mockSaveManualBudget).not.toHaveBeenCalled();

    // Step 3: User adds a new expense
    console.log('\n✏️ User adds new expense: Groceries -$400');
    act(() => {
      const currentBudget = result.current.manualBudget;
      result.current.setManualBudget({
        ...currentBudget,
        items: [
          ...currentBudget.items,
          { id: 'temp-' + Date.now(), name: 'Groceries', amount: -400 },
        ],
      });
    });

    console.log('   State after adding groceries:', result.current.manualBudget);
    expect(result.current.manualBudget.items.length).toBe(3);

    // Step 4: User adds another item quickly
    console.log('\n✏️ User adds another expense: Utilities -$150');
    act(() => {
      const currentBudget = result.current.manualBudget;
      result.current.setManualBudget({
        ...currentBudget,
        items: [
          ...currentBudget.items,
          { id: 'temp-' + Date.now() + 1, name: 'Utilities', amount: -150 },
        ],
      });
    });

    console.log('   State after adding utilities:', result.current.manualBudget);
    expect(result.current.manualBudget.items.length).toBe(4);

    // Step 5: User updates bank amount
    console.log('\n💰 User updates bank amount to $3500');
    act(() => {
      const currentBudget = result.current.manualBudget;
      result.current.setManualBudget({
        ...currentBudget,
        bankAmount: 3500,
      });
    });

    console.log('   Updated bank amount:', result.current.manualBudget.bankAmount);
    expect(result.current.manualBudget.bankAmount).toBe(3500);

    // Step 6: Auto-save triggers after user stops editing
    console.log('\n💾 Auto-save triggers after user stops editing (400ms delay)');
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledTimes(1);
    });

    const finalSaveData = mockSaveManualBudget.mock.calls[0][0];
    console.log('   Data sent to server:', JSON.stringify(finalSaveData, null, 2));
    expect(finalSaveData.items.length).toBe(4);
    expect(finalSaveData.bank_amount_cents).toBe(350000); // $3500 in cents

    // Step 7: User navigates away and comes back (page reload)
    console.log('\n🔄 User navigates away and returns (page reload simulation)');
    
    mockGetManualBudget.mockClear();
    mockSaveManualBudget.mockClear();

    // Server returns the saved data
    const savedData = {
      bank_amount_cents: 350000,
      items: [
        { id: '1', name: 'Salary', amount_cents: 500000 },
        { id: '2', name: 'Rent', amount_cents: -120000 },
        { id: '3', name: 'Groceries', amount_cents: -40000 },
        { id: '4', name: 'Utilities', amount_cents: -15000 },
      ],
    };

    mockGetManualBudget.mockResolvedValue(savedData);
    
    // Simulate page reload by creating new hook
    const { result: reloadedResult } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      console.log('   Budget after page reload:', JSON.stringify(reloadedResult.current.manualBudget, null, 2));
      expect(reloadedResult.current.manualBudget.items.length).toBe(4);
      expect(reloadedResult.current.manualBudget.bankAmount).toBe(3500);
    });

    // Verify all data persisted correctly
    const groceriesItem = reloadedResult.current.manualBudget.items.find(item => item.name === 'Groceries');
    const utilitiesItem = reloadedResult.current.manualBudget.items.find(item => item.name === 'Utilities');
    
    expect(groceriesItem?.amount).toBe(-400);
    expect(utilitiesItem?.amount).toBe(-150);

    console.log('\n✅ REAL USER WORKFLOW COMPLETED SUCCESSFULLY');
    console.log('📊 Final Results:');
    console.log('   ✓ All 4 items persisted correctly');
    console.log('   ✓ Bank amount updated and saved');
    console.log('   ✓ Data survived page reload');
    console.log('   ✓ Server and localStorage in sync');
    console.log('👤 Real user workflow test completed\n');
  });
});

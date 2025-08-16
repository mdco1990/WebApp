/**
 * Integration tests for useManualBudget hook
 * Focus: Real user workflows and edge cases that could cause data loss
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useManualBudget } from '../useManualBudget';
// import * as api from '../../services/api'; // Not used in this test

// Mock the API
jest.mock('../../services/api', () => ({
  ApiService: {
    getManualBudget: jest.fn(),
    saveManualBudget: jest.fn(),
  },
}));

const mockGetManualBudget = jest.fn();
const mockSaveManualBudget = jest.fn();

// Get the mocked functions
import { ApiService } from '../../services/api';

// Mock localStorage
type LocalStorageMock = {
  data: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const localStorageMock: LocalStorageMock = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string): string | null => localStorageMock.data[key] || null),
  setItem: jest.fn((key: string, value: string): void => {
    localStorageMock.data[key] = value;
  }),
  removeItem: jest.fn((key: string): void => {
    delete localStorageMock.data[key];
  }),
  clear: jest.fn((): void => {
    localStorageMock.data = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useManualBudget - Integration Tests', () => {
  const testDate = new Date(2024, 0, 15); // January 2024

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorageMock.clear();
    // Set up a mock session to enable server calls
    localStorageMock.setItem('session_id', 'test-session-id');
    
    // Assign mock functions to ApiService methods
    ApiService.getManualBudget = mockGetManualBudget;
    ApiService.saveManualBudget = mockSaveManualBudget;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle rapid consecutive updates without data loss', async () => {
    console.log('\n🧪 EDGE CASE: Rapid consecutive updates (race conditions)');

    mockGetManualBudget.mockResolvedValue({ data: { bank_amount_cents: 0, items: [] } });
    mockSaveManualBudget.mockResolvedValue({} as Response);

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget.bankAmount).toBe(0);
    });

    // Simulate rapid user updates (like typing quickly)
    console.log('⚡ Simulating rapid consecutive updates...');

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

    console.log('   Final state:', JSON.stringify(result.current.manualBudget, null, 2));
    expect(result.current.manualBudget.items.length).toBe(2);

    // Only one debounced save should occur
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledTimes(1);
    });

    console.log('   ✓ Only one debounced save occurred despite rapid updates');
  });

  it('should preserve data when server fails but localStorage succeeds', async () => {
    console.log('\n💥 EDGE CASE: Server save failure with localStorage fallback');

    mockGetManualBudget.mockResolvedValue({ data: { bank_amount_cents: 0, items: [] } });
    mockSaveManualBudget.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget.bankAmount).toBe(0);
    });

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
  });

  it('should maintain separate data for different months', async () => {
    console.log('\n📅 EDGE CASE: Month change with separate data');

    const janDate = new Date(2024, 0, 15); // January 2024
    const febDate = new Date(2024, 1, 15); // February 2024

    // January data
    mockGetManualBudget
      .mockResolvedValueOnce({
        data: {
          bank_amount_cents: 100000,
          items: [{ id: '1', name: 'Jan Item', amount_cents: 50000 }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          bank_amount_cents: 0,
          items: [],
        },
      });

    const { result: janResult } = renderHook(() => useManualBudget(janDate));
    const { result: febResult } = renderHook(() => useManualBudget(febDate));

    await waitFor(() => {
      expect(janResult.current.manualBudget.items.length).toBe(1);
      expect(febResult.current.manualBudget.items.length).toBe(0);
    });

    console.log('   January data:', janResult.current.manualBudget);
    console.log('   February data (empty):', febResult.current.manualBudget);
    console.log('   ✓ Different months maintain separate data');
  });

  it('should simulate complete real user workflow', async () => {
    console.log('\n👤 COMPLETE USER WORKFLOW SIMULATION');
    console.log('📋 Scenario: User opens app → adds items → saves → reloads → data persists');

    // Step 1: User opens app with existing data
    const existingData = {
      bank_amount_cents: 300000, // $3000
      items: [
        { id: '1', name: 'Salary', amount_cents: 500000 },
        { id: '2', name: 'Rent', amount_cents: -120000 },
      ],
    };

    console.log('\n🏠 Step 1: User opens app - loading existing budget...');
    mockGetManualBudget.mockResolvedValue({ data: existingData });
    mockSaveManualBudget.mockResolvedValue({} as Response);

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      console.log('   Loaded budget:', JSON.stringify(result.current.manualBudget, null, 2));
      expect(result.current.manualBudget.items.length).toBe(2);
    });

    // Step 2: User adds new items
    console.log('\n✏️ Step 2: User adds new expense: Groceries -$400');
    act(() => {
      const currentBudget = result.current.manualBudget;
      result.current.setManualBudget({
        ...currentBudget,
        items: [...currentBudget.items, { id: 'temp-groceries', name: 'Groceries', amount: -400 }],
      });
    });

    console.log('\n✏️ Step 3: User adds utilities: -$150');
    act(() => {
      const currentBudget = result.current.manualBudget;
      result.current.setManualBudget({
        ...currentBudget,
        items: [...currentBudget.items, { id: 'temp-utilities', name: 'Utilities', amount: -150 }],
      });
    });

    // Step 4: User updates bank amount
    console.log('\n💰 Step 4: User updates bank amount to $3500');
    act(() => {
      const currentBudget = result.current.manualBudget;
      result.current.setManualBudget({
        ...currentBudget,
        bankAmount: 3500,
      });
    });

    expect(result.current.manualBudget.items.length).toBe(4);
    expect(result.current.manualBudget.bankAmount).toBe(3500);

    // Step 5: Auto-save triggers
    console.log('\n💾 Step 5: Auto-save triggers after editing stops');
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledTimes(1);
    });

    const finalSaveData = mockSaveManualBudget.mock.calls[0][2];
    console.log('   Data sent to server:', JSON.stringify(finalSaveData, null, 2));
    expect(finalSaveData.items.length).toBe(4);
    expect(finalSaveData.bank_amount_cents).toBe(350000);

    // Step 6: User reloads page
    console.log('\n🔄 Step 6: User reloads page - testing data persistence');

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

    mockGetManualBudget.mockResolvedValue({ data: savedData });

    // Simulate page reload by creating new hook instance
    const { result: reloadedResult } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      console.log(
        '   Budget after reload:',
        JSON.stringify(reloadedResult.current.manualBudget, null, 2)
      );
      expect(reloadedResult.current.manualBudget.items.length).toBe(4);
      expect(reloadedResult.current.manualBudget.bankAmount).toBe(3500);
    });

    // Verify specific items persisted
    const groceriesItem = reloadedResult.current.manualBudget.items.find(
      (item) => item.name === 'Groceries'
    );
    const utilitiesItem = reloadedResult.current.manualBudget.items.find(
      (item) => item.name === 'Utilities'
    );

    expect(groceriesItem?.amount).toBe(-400);
    expect(utilitiesItem?.amount).toBe(-150);

    console.log('\n✅ COMPLETE WORKFLOW SUCCESS');
    console.log('📊 Results: ✓ All 4 items persisted ✓ Bank amount saved ✓ Data survived reload');
    console.log('👤 Real user workflow simulation completed successfully\n');
  });
});

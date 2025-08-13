import { renderHook, act, waitFor } from '@testing-library/react';
import { useManualBudget } from '../useManualBudget';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  getManualBudget: jest.fn(),
  saveManualBudget: jest.fn(),
}));

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

const mockGetManualBudget = api.getManualBudget as jest.MockedFunction<typeof api.getManualBudget>;
const mockSaveManualBudget = api.saveManualBudget as jest.MockedFunction<typeof api.saveManualBudget>;

describe('useManualBudget', () => {
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

  it('should initialize with empty state', async () => {
    mockGetManualBudget.mockResolvedValue({
      bank_amount_cents: 0,
      items: [],
    });

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget).toEqual({
        bankAmount: 0,
        items: [],
      });
    });
  });

  it('should load data from server', async () => {
    const serverData = {
      bank_amount_cents: 100000, // $1000
      items: [
        { id: '1', name: 'Rent', amount_cents: -80000 }, // -$800
        { id: '2', name: 'Income', amount_cents: 50000 }, // $500
      ],
    };
    mockGetManualBudget.mockResolvedValue(serverData);

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget).toEqual({
        bankAmount: 1000,
        items: [
          { id: '1', name: 'Rent', amount: -800 },
          { id: '2', name: 'Income', amount: 500 },
        ],
      });
    });

    expect(mockGetManualBudget).toHaveBeenCalledWith({ year: 2024, month: 1 });
  });

  it('should fallback to localStorage when server fails', async () => {
    mockGetManualBudget.mockRejectedValue(new Error('Server error'));
    const localData = {
      bankAmount: 500,
      items: [{ id: 'local-1', name: 'Local Item', amount: 100 }],
    };
    localStorageMock.setItem('manualBudget:2024-1', JSON.stringify(localData));

    const { result } = renderHook(() => useManualBudget(testDate));

    await waitFor(() => {
      expect(result.current.manualBudget).toEqual(localData);
    });
  });

  it('should save to both localStorage and server when data changes', async () => {
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

    expect(result.current.manualBudget).toEqual(newBudget);

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

    // Check localStorage
    const savedLocal = JSON.parse(localStorageMock.getItem('manualBudget:2024-1') || '{}');
    expect(savedLocal).toEqual(newBudget);
  });

  it('should handle month changes correctly', async () => {
    mockGetManualBudget.mockResolvedValue({ bank_amount_cents: 0, items: [] });

    const { result, rerender } = renderHook(
      ({ date }) => useManualBudget(date),
      { initialProps: { date: testDate } }
    );

    await waitFor(() => {
      expect(result.current.manualBudget.bankAmount).toBe(0);
    });

    // Change to February
    const febDate = new Date(2024, 1, 15);
    rerender({ date: febDate });

    await waitFor(() => {
      expect(mockGetManualBudget).toHaveBeenCalledWith({ year: 2024, month: 2 });
    });
  });

  it('should not save during initial load', async () => {
    mockGetManualBudget.mockResolvedValue({
      bank_amount_cents: 100000,
      items: [{ id: '1', name: 'Test', amount_cents: 5000 }],
    });
    mockSaveManualBudget.mockResolvedValue({} as Response);

    renderHook(() => useManualBudget(testDate));

    // Advance timers to see if save is called during load
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockGetManualBudget).toHaveBeenCalled();
    });

    // Should not save during initial load
    expect(mockSaveManualBudget).not.toHaveBeenCalled();
  });
});

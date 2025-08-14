/**
 * Integration tests for ManualBudgetSection component
 * Focus: Testing the useManualBudget hook integration with UI components
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useManualBudget } from '../../hooks/useManualBudget';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockGetManualBudget = api.getManualBudget as jest.MockedFunction<typeof api.getManualBudget>;
const mockSaveManualBudget = api.saveManualBudget as jest.MockedFunction<typeof api.saveManualBudget>;

// Mock localStorage
const localStorageMock = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => localStorageMock.data[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageMock.data[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageMock.data[key];
  }),
  clear: jest.fn(() => {
    localStorageMock.data = {};
  }),
} as any;

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component that uses the hook
const TestManualBudgetComponent: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
  const { manualBudget, setManualBudget } = useManualBudget(selectedDate);

  const addItem = () => {
    setManualBudget({
      ...manualBudget,
      items: [
        ...manualBudget.items,
        { id: `test-${Date.now()}`, name: 'Test Item', amount: -100 }
      ]
    });
  };

  const updateBankAmount = (amount: number) => {
    setManualBudget({
      ...manualBudget,
      bankAmount: amount
    });
  };

  return (
    <div>
      <h1>Manual Budget Test</h1>
      <div data-testid="bank-amount">Bank: ${manualBudget.bankAmount}</div>
      <div data-testid="items-count">Items: {manualBudget.items.length}</div>

      <div data-testid="items-list">
        {manualBudget.items.map(item => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            {item.name}: ${item.amount}
          </div>
        ))}
      </div>

      <button onClick={addItem} data-testid="add-item">Add Item</button>
      <button
        onClick={() => updateBankAmount(2000)}
        data-testid="update-bank"
      >
        Update Bank to $2000
      </button>
    </div>
  );
};

describe('ManualBudget - Component Integration Tests', () => {
  const testDate = new Date(2024, 0, 15); // January 2024

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorageMock.clear();

    // Default successful responses
    mockGetManualBudget.mockResolvedValue({
      bank_amount_cents: 150000, // $1500
      items: [
        { id: '1', name: 'Salary', amount_cents: 300000 },
        { id: '2', name: 'Rent', amount_cents: -120000 },
      ],
    });
    mockSaveManualBudget.mockResolvedValue({} as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should display initial data from server correctly', async () => {
    console.log('\n🎨 COMPONENT INTEGRATION: Initial data display');

    render(<TestManualBudgetComponent selectedDate={testDate} />);

    await waitFor(() => {
      expect(screen.getByTestId('bank-amount')).toHaveTextContent('Bank: $1500');
      expect(screen.getByTestId('items-count')).toHaveTextContent('Items: 2');
      expect(screen.getByText('Salary: $3000')).toBeInTheDocument();
      expect(screen.getByText('Rent: $-1200')).toBeInTheDocument();
    });

    console.log('   ✓ Initial data rendered correctly from server');
  });

  it('should handle user interactions and save data', async () => {
    console.log('\n👤 COMPONENT INTEGRATION: User interaction and data persistence');

    const user = userEvent.setup({ delay: null });
    render(<TestManualBudgetComponent selectedDate={testDate} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Salary: $3000')).toBeInTheDocument();
    });

    console.log('   🖱️ User clicks "Add Item" button');

    const addButton = screen.getByTestId('add-item');
    await user.click(addButton);

    // Check that item was added to UI immediately
    await waitFor(() => {
      expect(screen.getByTestId('items-count')).toHaveTextContent('Items: 3');
      expect(screen.getByText('Test Item: $-100')).toBeInTheDocument();
    });

    console.log('   ✓ New item appeared in UI immediately');
    console.log('   🖱️ User clicks "Update Bank" button');

    const updateBankButton = screen.getByTestId('update-bank');
    await user.click(updateBankButton);

    // Check bank amount updated immediately
    await waitFor(() => {
      expect(screen.getByTestId('bank-amount')).toHaveTextContent('Bank: $2000');
    });

    console.log('   ✓ Bank amount updated in UI immediately');
    console.log('   ⏳ Waiting for debounced server save...');

    // Advance timers to trigger debounced save
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          bank_amount_cents: 200000, // $2000
          items: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Item',
              amount_cents: -10000, // $-100
            }),
          ]),
        })
      );
    });

    console.log('   ✓ Data saved to server with correct values');
  });

  it('should maintain data after component remount (simulating page reload)', async () => {
    console.log('\n🔄 COMPONENT INTEGRATION: Page reload simulation');

    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<TestManualBudgetComponent selectedDate={testDate} />);

    // Wait for initial load and make changes
    await waitFor(() => {
      expect(screen.getByText('Salary: $3000')).toBeInTheDocument();
    });

    const addButton = screen.getByTestId('add-item');
    await user.click(addButton);

    // Wait for changes to be made
    await waitFor(() => {
      expect(screen.getByTestId('items-count')).toHaveTextContent('Items: 3');
    });

    console.log('   📝 Data modified - unmounting component (simulating page close)');

    // Force save before unmounting
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalled();
    });

    unmount();

    console.log('   🔄 Remounting component (simulating page reload)');

    // Update mock to return the saved data
    mockGetManualBudget.mockClear();
    mockSaveManualBudget.mockClear();
    mockGetManualBudget.mockResolvedValue({
      bank_amount_cents: 150000,
      items: [
        { id: '1', name: 'Salary', amount_cents: 300000 },
        { id: '2', name: 'Rent', amount_cents: -120000 },
        { id: '3', name: 'Test Item', amount_cents: -10000 },
      ],
    });

    render(<TestManualBudgetComponent selectedDate={testDate} />);

    await waitFor(() => {
      expect(screen.getByTestId('items-count')).toHaveTextContent('Items: 3');
      expect(screen.getByText('Test Item: $-100')).toBeInTheDocument();
      expect(screen.getByText('Salary: $3000')).toBeInTheDocument();
    });

    console.log('   ✅ All data including new item persisted after remount');
  });

  it('should handle server failures gracefully with localStorage fallback', async () => {
    console.log('\n💥 COMPONENT INTEGRATION: Server failure handling');

    // Initial load succeeds
    const user = userEvent.setup({ delay: null });
    render(<TestManualBudgetComponent selectedDate={testDate} />);

    await waitFor(() => {
      expect(screen.getByText('Salary: $3000')).toBeInTheDocument();
    });

    console.log('   📝 User makes changes...');

    const updateBankButton = screen.getByTestId('update-bank');
    await user.click(updateBankButton);

    // UI should update immediately
    await waitFor(() => {
      expect(screen.getByTestId('bank-amount')).toHaveTextContent('Bank: $2000');
    });

    console.log('   💥 Simulating server save failure...');

    // Make server save fail
    mockSaveManualBudget.mockRejectedValue(new Error('Network error'));

    // Trigger save
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalled();
    });

    console.log('   🔍 Checking localStorage fallback...');

    // Data should still be in localStorage
    const localData = localStorageMock.getItem('manualBudget:2024-1');
    expect(localData).toBeTruthy();

    const parsedData = JSON.parse(localData);
    expect(parsedData.bankAmount).toBe(2000);

    // UI should still show correct data
    expect(screen.getByTestId('bank-amount')).toHaveTextContent('Bank: $2000');

    console.log('   ✅ Data preserved in localStorage despite server failure');
    console.log('   ✅ UI remains consistent with user changes');
  });

  it('should handle rapid user interactions correctly', async () => {
    console.log('\n⚡ COMPONENT INTEGRATION: Rapid user interactions');

    const user = userEvent.setup({ delay: null }); // Remove delay for faster testing
    render(<TestManualBudgetComponent selectedDate={testDate} />);

    await waitFor(() => {
      expect(screen.getByText('Salary: $3000')).toBeInTheDocument();
    });

    console.log('   ⚡ Rapid button clicks...');

    const addButton = screen.getByTestId('add-item');

    // Rapid clicks without waiting
    await user.click(addButton);
    await user.click(addButton);
    await user.click(addButton);

    // Check UI updated correctly
    await waitFor(() => {
      expect(screen.getByTestId('items-count')).toHaveTextContent('Items: 5'); // 2 initial + 3 added
    }, { timeout: 3000 });

    console.log('   📱 UI updated correctly for all clicks');

    // Only one debounced save should occur
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSaveManualBudget).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });

    const saveCall = mockSaveManualBudget.mock.calls[0][0];
    expect(saveCall.items).toHaveLength(5); // Should save all 5 items

    console.log('   ✅ Only one debounced save occurred');
    console.log('   ✅ All items included in final save');
  }, 10000); // Increase timeout to 10 seconds
});

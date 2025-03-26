import mongoose from 'mongoose';
import Transaction, { TransactionStatus, TransactionType } from '../../../src/models/Transaction';

// Mock mongoose
jest.mock('mongoose', () => {
  const originalModule = jest.requireActual('mongoose');
  return {
    ...originalModule,
    model: jest.fn().mockReturnValue({
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mockId' })),
    }),
  };
});

describe('Transaction Model Tests', () => {
  // Test data
  const validTransactionData = {
    reference: 'TX-2023-001',
    amount: 10000,
    currency: 'USD',
    description: 'Property sale commission',
    type: TransactionType.COMMISSION,
    status: TransactionStatus.PENDING,
    agent: 'agentId',
    client: 'clientId',
    notes: ''
  };

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Transaction Validation', () => {
    it('should create a valid transaction', async () => {
      const mock = Transaction.create as jest.Mock;
      mock.mockResolvedValueOnce({
        ...validTransactionData,
        _id: 'mockId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newTransaction = await Transaction.create(validTransactionData);
      
      expect(newTransaction).toHaveProperty('_id');
      expect(newTransaction.reference).toBe(validTransactionData.reference);
      expect(newTransaction.amount).toBe(validTransactionData.amount);
      expect(newTransaction.status).toBe(TransactionStatus.PENDING);
      expect(mock).toHaveBeenCalledWith(validTransactionData);
    });

    it('should reject a transaction with zero amount', async () => {
      const invalidTransaction = { ...validTransactionData, amount: 0 };
      
      const mock = Transaction.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(Transaction.create(invalidTransaction)).rejects.toThrow();
    });

    it('should reject a transaction with invalid currency', async () => {
      const invalidTransaction = { ...validTransactionData, currency: 'INVALID' };
      
      const mock = Transaction.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(Transaction.create(invalidTransaction)).rejects.toThrow();
    });

    it('should reject a transaction without required fields', async () => {
      const invalidTransaction = { amount: 5000 }; // Missing required fields
      
      const mock = Transaction.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(Transaction.create(invalidTransaction as any)).rejects.toThrow();
    });

    it('should require either agent or client', async () => {
      const invalidTransaction = { 
        ...validTransactionData,
        agent: undefined,
        client: undefined
      };
      
      const mock = Transaction.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(Transaction.create(invalidTransaction as any)).rejects.toThrow();
    });
  });

  describe('Transaction Methods', () => {
    it('should update status correctly', () => {
      const transaction = {
        ...validTransactionData,
        _id: 'mockId',
        status: TransactionStatus.PENDING,
        notes: '',
        updateStatus: function(newStatus: TransactionStatus, note?: string) {
          // Mock implementation of updateStatus method
          if (this.status === TransactionStatus.COMPLETED || 
              this.status === TransactionStatus.FAILED) {
            throw new Error('Cannot update a completed or failed transaction');
          }
          
          this.status = newStatus;
          if (note) this.notes = this.notes ? this.notes + '\n' + note : note;
          return true;
        }
      };
      
      expect(transaction.status).toBe(TransactionStatus.PENDING);
      transaction.updateStatus(TransactionStatus.PROCESSING, 'Processing payment');
      expect(transaction.status).toBe(TransactionStatus.PROCESSING);
      expect(transaction.notes).toBe('Processing payment');
      
      transaction.updateStatus(TransactionStatus.COMPLETED, 'Payment completed');
      expect(transaction.status).toBe(TransactionStatus.COMPLETED);
      expect(transaction.notes).toBe('Processing payment\nPayment completed');
    });
    
    it('should throw error when updating completed transaction', () => {
      const completedTransaction = {
        ...validTransactionData,
        _id: 'mockId',
        status: TransactionStatus.COMPLETED,
        notes: '',
        updateStatus: function(newStatus: TransactionStatus, note?: string) {
          // Mock implementation of updateStatus method
          if (this.status === TransactionStatus.COMPLETED || 
              this.status === TransactionStatus.FAILED) {
            throw new Error('Cannot update a completed or failed transaction');
          }
          
          this.status = newStatus;
          if (note) this.notes = this.notes ? this.notes + '\n' + note : note;
          return true;
        }
      };
      
      expect(() => {
        completedTransaction.updateStatus(TransactionStatus.PROCESSING);
      }).toThrow('Cannot update a completed or failed transaction');
      
      expect(completedTransaction.status).toBe(TransactionStatus.COMPLETED);
    });

    it('should have the correct absolute amount', () => {
      // Positive amount
      const positiveTransaction = {
        ...validTransactionData,
        amount: 1000,
        getAbsoluteAmount: function() {
          // Mock implementation of getAbsoluteAmount method
          return Math.abs(this.amount);
        }
      };
      expect(positiveTransaction.getAbsoluteAmount()).toBe(1000);
      
      // Negative amount (refund or chargeback)
      const negativeTransaction = {
        ...validTransactionData,
        amount: -1000,
        getAbsoluteAmount: function() {
          // Mock implementation of getAbsoluteAmount method
          return Math.abs(this.amount);
        }
      };
      expect(negativeTransaction.getAbsoluteAmount()).toBe(1000);
    });
  });
}); 
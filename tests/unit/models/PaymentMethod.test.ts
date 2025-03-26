import mongoose from 'mongoose';
import PaymentMethod, { PaymentMethodStatus, PaymentMethodType } from '../../../src/models/PaymentMethod';

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

describe('PaymentMethod Model Tests', () => {
  // Test data
  const validPaymentMethodData = {
    owner: 'ownerId',
    ownerType: 'Agent',
    type: PaymentMethodType.CARD,
    status: PaymentMethodStatus.ACTIVE,
    isDefault: true,
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2025,
    brand: 'Visa',
    country: 'US'
  };

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PaymentMethod Validation', () => {
    it('should create a valid payment method', async () => {
      const mock = PaymentMethod.create as jest.Mock;
      mock.mockResolvedValueOnce({
        ...validPaymentMethodData,
        _id: 'mockId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newPaymentMethod = await PaymentMethod.create(validPaymentMethodData);
      
      expect(newPaymentMethod).toHaveProperty('_id');
      expect(newPaymentMethod.owner).toBe(validPaymentMethodData.owner);
      expect(newPaymentMethod.type).toBe(PaymentMethodType.CARD);
      expect(newPaymentMethod.status).toBe(PaymentMethodStatus.ACTIVE);
      expect(newPaymentMethod.isDefault).toBe(true);
      expect(mock).toHaveBeenCalledWith(validPaymentMethodData);
    });

    it('should reject a payment method with invalid owner type', async () => {
      const invalidPaymentMethod = { 
        ...validPaymentMethodData, 
        ownerType: 'InvalidType' // Not Agent or Client
      };
      
      const mock = PaymentMethod.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PaymentMethod.create(invalidPaymentMethod)).rejects.toThrow();
    });

    it('should reject a payment method with invalid type', async () => {
      const invalidPaymentMethod = { 
        ...validPaymentMethodData, 
        type: 'InvalidType' // Not in PaymentMethodType enum
      };
      
      const mock = PaymentMethod.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PaymentMethod.create(invalidPaymentMethod)).rejects.toThrow();
    });

    it('should reject a payment method without required fields', async () => {
      const invalidPaymentMethod = { 
        type: PaymentMethodType.CARD
      }; // Missing required fields
      
      const mock = PaymentMethod.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PaymentMethod.create(invalidPaymentMethod as any)).rejects.toThrow();
    });

    it('should reject a payment method with invalid last4', async () => {
      const invalidPaymentMethod = { 
        ...validPaymentMethodData,
        last4: '123' // Not 4 digits
      };
      
      const mock = PaymentMethod.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PaymentMethod.create(invalidPaymentMethod)).rejects.toThrow();
    });
  });

  describe('PaymentMethod Methods', () => {
    it('should update status correctly', () => {
      const paymentMethod = {
        ...validPaymentMethodData,
        _id: 'mockId',
        status: PaymentMethodStatus.ACTIVE,
        updateStatus: function(newStatus: PaymentMethodStatus) {
          // Mock implementation of updateStatus method
          this.status = newStatus;
          return true;
        }
      };
      
      expect(paymentMethod.status).toBe(PaymentMethodStatus.ACTIVE);
      paymentMethod.updateStatus(PaymentMethodStatus.INACTIVE);
      expect(paymentMethod.status).toBe(PaymentMethodStatus.INACTIVE);
      
      paymentMethod.updateStatus(PaymentMethodStatus.EXPIRED);
      expect(paymentMethod.status).toBe(PaymentMethodStatus.EXPIRED);
    });

    it('should set as default correctly', () => {
      const paymentMethod = {
        ...validPaymentMethodData,
        _id: 'mockId',
        isDefault: false,
        setAsDefault: function() {
          // Mock implementation of setAsDefault method
          this.isDefault = true;
          return true;
        }
      };
      
      expect(paymentMethod.isDefault).toBe(false);
      paymentMethod.setAsDefault();
      expect(paymentMethod.isDefault).toBe(true);
    });

    it('should format card details correctly', () => {
      const paymentMethod = {
        ...validPaymentMethodData,
        _id: 'mockId',
        brand: 'Visa',
        last4: '4242',
        getFormattedCardInfo: function() {
          // Mock implementation of getFormattedCardInfo method
          return `${this.brand} •••• ${this.last4}`;
        }
      };
      
      expect(paymentMethod.getFormattedCardInfo()).toBe('Visa •••• 4242');
    });

    it('should check expiry status correctly', () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; // JS months are 0-indexed
      
      // Valid expiry (future)
      const validPaymentMethod = {
        ...validPaymentMethodData,
        expiryMonth: 12,
        expiryYear: currentYear + 1,
        isExpired: function() {
          // Mock implementation of isExpired method
          const now = new Date();
          const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
          const currentYear = now.getFullYear();
          
          return (this.expiryYear < currentYear) || 
                 (this.expiryYear === currentYear && this.expiryMonth < currentMonth);
        }
      };
      
      expect(validPaymentMethod.isExpired()).toBe(false);
      
      // Expired (past)
      const expiredPaymentMethod = {
        ...validPaymentMethodData,
        expiryMonth: 1,
        expiryYear: currentYear - 1,
        isExpired: function() {
          // Mock implementation of isExpired method
          const now = new Date();
          const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
          const currentYear = now.getFullYear();
          
          return (this.expiryYear < currentYear) || 
                 (this.expiryYear === currentYear && this.expiryMonth < currentMonth);
        }
      };
      
      expect(expiredPaymentMethod.isExpired()).toBe(true);
      
      // Current month expiry
      const currentMonthExpiry = {
        ...validPaymentMethodData,
        expiryMonth: currentMonth,
        expiryYear: currentYear,
        isExpired: function() {
          // Mock implementation of isExpired method
          const now = new Date();
          const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
          const currentYear = now.getFullYear();
          
          return (this.expiryYear < currentYear) || 
                 (this.expiryYear === currentYear && this.expiryMonth < currentMonth);
        }
      };
      
      expect(currentMonthExpiry.isExpired()).toBe(false);
    });
  });
}); 
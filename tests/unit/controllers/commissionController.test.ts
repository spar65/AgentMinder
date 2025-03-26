import { Request, Response, NextFunction } from 'express';
import * as commissionController from '../../../src/controllers/commissionController';
import CommissionCalculationService from '../../../src/services/CommissionCalculationService';

// Mock dependencies
jest.mock('../../../src/services/CommissionCalculationService');

describe('Commission Controller Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      query: {},
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    nextFunction = jest.fn();
  });

  describe('calculateCommission', () => {
    it('should calculate commission and return 201 status', async () => {
      // Setup mock request
      mockRequest.body = {
        agent: 'mockAgentId',
        transaction: 'mockTransactionId',
        baseAmount: 100000
      };
      
      // Mock service response
      const mockCommission = {
        _id: 'mockCommissionId',
        agent: 'mockAgentId',
        transaction: 'mockTransactionId',
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000
      };
      
      (CommissionCalculationService.calculateCommission as jest.Mock).mockResolvedValue(mockCommission);
      
      // Call controller
      await commissionController.calculateCommission[1](
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      
      // Assertions
      expect(CommissionCalculationService.calculateCommission).toHaveBeenCalledWith(
        'mockAgentId',
        'mockTransactionId',
        100000,
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCommission
      });
    });
    
    it('should pass errors to the next function', async () => {
      // Setup mock request
      mockRequest.body = {
        agent: 'mockAgentId',
        transaction: 'mockTransactionId',
        baseAmount: 100000
      };
      
      // Mock service to throw an error
      const error = new Error('Test error');
      (CommissionCalculationService.calculateCommission as jest.Mock).mockRejectedValue(error);
      
      // Call controller
      await commissionController.calculateCommission[1](
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      
      // Assertions
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
}); 
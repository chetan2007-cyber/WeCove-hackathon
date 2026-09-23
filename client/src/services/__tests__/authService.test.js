import authService, { normalizeIndianPhone } from '../authService';

describe('authService - Phone Normalization & Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('normalizeIndianPhone', () => {
    it('should format a standard 10-digit mobile number starting with 9', () => {
      const result = normalizeIndianPhone('9876543210');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+919876543210');
    });

    it('should format an Indian number with spaces, hyphens, and parentheses', () => {
      const result = normalizeIndianPhone('+91 (98765) 43210');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+919876543210');
    });

    it('should handle a leading 0 prefix', () => {
      const result = normalizeIndianPhone('08123456789');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+918123456789');
    });

    it('should handle 91 prefix without plus', () => {
      const result = normalizeIndianPhone('917123456789');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+917123456789');
    });

    it('should reject invalid non-Indian numbers or numbers starting with 0-5', () => {
      const result = normalizeIndianPhone('1234567890');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/valid 10-digit Indian mobile number/);
    });

    it('should reject empty or null input', () => {
      const result = normalizeIndianPhone('');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/required/);
    });
  });

  describe('Session Storage & Role Management', () => {
    it('should retrieve stored user and token from localStorage', () => {
      const mockUser = { id: 'test-123', name: 'Dr. Baruah', role: 'HealthcareWorker' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-bearer-token');

      const user = authService.getStoredUser();
      const token = authService.getStoredToken();

      expect(user).toEqual(mockUser);
      expect(token).toBe('mock-bearer-token');
    });

    it('should clear user, token, and role upon logout', async () => {
      localStorage.setItem('user', JSON.stringify({ id: '123' }));
      localStorage.setItem('token', 'jwt-token');
      localStorage.setItem('user_role', 'Patient');

      await authService.logout();

      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user_role')).toBeNull();
    });
  });
});

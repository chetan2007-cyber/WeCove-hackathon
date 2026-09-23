import supabase, { isSupabaseConfigured } from './supabaseClient';
import apiClient from './apiClient';

/**
 * Validates and normalizes Indian phone numbers into E.164 (+91XXXXXXXXXX) format
 * @param {string} phone
 * @returns {{ isValid: boolean, normalized: string, error?: string }}
 */
export function normalizeIndianPhone(phone) {
  if (!phone) {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }

  // Remove whitespace, dashes, parens
  let cleaned = phone.replace(/[\s\-()]/g, '');

  // Handle leading 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Handle leading +91 or 91
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  // Valid Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    return {
      isValid: false,
      normalized: '',
      error: 'Please enter a valid 10-digit Indian mobile number.'
    };
  }

  return {
    isValid: true,
    normalized: `+91${cleaned}`
  };
}

/**
 * Validates an email address format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
}

class AuthService {
  /**
   * Request Phone OTP
   * @param {string} rawPhone 
   * @param {string} role
   */
  async sendPhoneOtp(rawPhone, role = 'Patient') {
    const { isValid, normalized, error } = normalizeIndianPhone(rawPhone);
    if (!isValid) {
      throw new Error(error);
    }

    try {
      if (isSupabaseConfigured) {
        const { error: supabaseError } = await supabase.auth.signInWithOtp({
          phone: normalized,
          options: {
            channel: 'sms',
          }
        });
        if (supabaseError) {
          if (supabaseError.message?.toLowerCase().includes('rate limit')) {
            throw new Error('Too many OTP requests. Please wait a few minutes before trying again.');
          }
          throw new Error(supabaseError.message);
        }
        return { success: true, phone: normalized };
      }

      // API Gateway fallback
      const response = await apiClient.post('/auth/send-otp', { phone: normalized, role });
      return { 
        success: true, 
        phone: normalized, 
        data: response.data,
        message: response.data?.message,
        smsDelivered: response.data?.smsDelivered,
        devOtp: response.data?.devOtp
      };
    } catch (err) {
      if (err.message) throw err;
      throw new Error('Could not send verification code. Please check your network and try again.');
    }
  }

  /**
   * Verify 6-digit Phone OTP
   * @param {string} phone Normalized phone
   * @param {string} token 6-digit code
   * @param {string} role User role ('Patient', 'Caregiver', 'HealthcareWorker')
   * @param {string} name Optional name for new registrations
   */
  async verifyPhoneOtp(phone, token, role = 'Patient', name = '') {
    if (!token || token.length !== 6) {
      throw new Error('Please enter the complete 6-digit code.');
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token,
          type: 'sms'
        });

        if (error) {
          if (error.message?.toLowerCase().includes('expired')) {
            throw new Error('Verification code has expired. Please request a new one.');
          }
          throw new Error('Invalid verification code. Please check and try again.');
        }

        const session = data.session;
        const user = data.user;

        // Idempotent user profile initialization in Supabase
        let profile = null;
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!profileData) {
            const newProfile = {
              id: user.id,
              phone: user.phone || phone,
              name: name || 'User',
              role: role.toUpperCase(),
              is_verified: true,
            };
            const { data: created } = await supabase
              .from('user_profiles')
              .insert(newProfile)
              .select()
              .single();
            profile = created || newProfile;
          } else {
            profile = profileData;
          }
        } catch (profileErr) {
          console.warn('Profile read/write deferred', profileErr);
        }

        const userPayload = {
          _id: user.id,
          id: user.id,
          phone,
          name: profile?.name || name || 'User',
          role: profile?.role ? this.normalizeRole(profile.role) : role,
          isVerified: true
        };

        this.persistSession(userPayload, session?.access_token || 'supabase-token');
        return userPayload;
      }

      // API Gateway fallback
      const response = await apiClient.post('/auth/verify-phone-otp', {
        phone,
        otp: token,
        role,
        name
      });

      const user = response.data.user || response.data;
      const authToken = response.data.token || response.data.accessToken || 'session-token';
      
      const userPayload = {
        _id: user._id || user.id,
        id: user._id || user.id,
        phone,
        name: user.name || name,
        role: this.normalizeRole(user.role || role),
        isVerified: true
      };

      this.persistSession(userPayload, authToken);
      return userPayload;

    } catch (err) {
      if (err.message) throw err;
      throw new Error('Verification failed. Please try again.');
    }
  }

  /**
   * Request Email OTP
   * @param {string} rawEmail
   * @param {string} role
   */
  async sendEmailOtp(rawEmail, role = 'Patient') {
    const cleanEmail = String(rawEmail || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. name@domain.com).');
    }

    try {
      if (isSupabaseConfigured) {
        const { error: supabaseError } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
        });
        if (supabaseError) {
          if (supabaseError.message?.toLowerCase().includes('rate limit')) {
            throw new Error('Too many OTP requests. Please wait a few minutes before trying again.');
          }
          throw new Error(supabaseError.message);
        }
        return { success: true, email: cleanEmail };
      }

      // API Gateway fallback
      const response = await apiClient.post('/auth/send-email-otp', { email: cleanEmail, role });
      return { 
        success: true, 
        email: cleanEmail, 
        data: response.data,
        message: response.data?.message,
        emailDelivered: response.data?.emailDelivered,
        devOtp: response.data?.devOtp
      };
    } catch (err) {
      if (err.message) throw err;
      throw new Error('Could not send verification email. Please check your network and try again.');
    }
  }

  /**
   * Verify 6-digit Email OTP
   * @param {string} email
   * @param {string} token
   * @param {string} role
   * @param {string} name
   */
  async verifyEmailOtp(email, token, role = 'Patient', name = '') {
    if (!token || token.length !== 6) {
      throw new Error('Please enter the complete 6-digit code.');
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token,
          type: 'email'
        });

        if (error) {
          if (error.message?.toLowerCase().includes('expired')) {
            throw new Error('Verification code has expired. Please request a new one.');
          }
          throw new Error('Invalid verification code. Please check and try again.');
        }

        const session = data.session;
        const user = data.user;

        let profile = null;
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!profileData) {
            const newProfile = {
              id: user.id,
              email: cleanEmail,
              name: name || cleanEmail.split('@')[0],
              role: role.toUpperCase(),
              is_verified: true,
            };
            const { data: created } = await supabase
              .from('user_profiles')
              .insert(newProfile)
              .select()
              .single();
            profile = created || newProfile;
          } else {
            profile = profileData;
          }
        } catch (profileErr) {
          console.warn('Profile read/write deferred', profileErr);
        }

        const userPayload = {
          _id: user.id,
          id: user.id,
          email: cleanEmail,
          name: profile?.name || name || cleanEmail.split('@')[0],
          role: profile?.role ? this.normalizeRole(profile.role) : role,
          isVerified: true
        };

        this.persistSession(userPayload, session?.access_token || 'supabase-token');
        return userPayload;
      }

      // API Gateway fallback
      const response = await apiClient.post('/auth/verify-email-otp', {
        email: cleanEmail,
        otp: token,
        role,
        name
      });

      const user = response.data.user || response.data;
      const authToken = response.data.token || response.data.accessToken || 'session-token';

      const userPayload = {
        _id: user._id || user.id,
        id: user._id || user.id,
        email: cleanEmail,
        name: user.name || name,
        role: this.normalizeRole(user.role || role),
        isVerified: true
      };

      this.persistSession(userPayload, authToken);
      return userPayload;

    } catch (err) {
      if (err.message) throw err;
      throw new Error('Verification failed. Please check your code.');
    }
  }

  /**
   * Verify session with the backend server
   * Clears storage and returns null if invalid
   */
  async verifySession() {
    const token = this.getStoredToken();
    if (!token) return null;

    try {
      const response = await apiClient.get('/auth/me');
      if (response.data && response.data.success && response.data.user) {
        const verifiedUser = response.data.user;
        this.persistSession(verifiedUser, token);
        return verifiedUser;
      }
      return null;
    } catch (err) {
      // If server explicitly returns 401 or 403, token is invalid
      if (err.status === 401 || err.status === 403) {
        await this.logout();
        return null;
      }
      // If temporary network failure, don't destroy local session if valid format
      return this.getCurrentUser();
    }
  }

  normalizeRole(role) {
    if (!role) return 'Patient';
    const lower = role.toLowerCase();
    if (lower.includes('caregiver')) return 'Caregiver';
    if (lower.includes('health') || lower.includes('clinic')) return 'HealthcareWorker';
    if (lower.includes('admin')) return 'Admin';
    return 'Patient';
  }

  persistSession(user, token) {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  getStoredUser() {
    return this.getCurrentUser();
  }

  getStoredToken() {
    try {
      return localStorage.getItem('token');
    } catch (e) {
      return null;
    }
  }

  isAuthenticated() {
    const user = this.getCurrentUser();
    const token = this.getStoredToken();
    return Boolean(
      user &&
      (user._id || user.id) &&
      user.role &&
      user.isVerified !== false &&
      token &&
      token !== 'null' &&
      token !== 'undefined'
    );
  }

  async logout() {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Sign out error', e);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('activePatient');
    }
  }
}

export const authService = new AuthService();
export default authService;

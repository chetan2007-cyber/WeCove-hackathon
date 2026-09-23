import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('mock-supabase.local') &&
  !supabaseUrl.includes('your-project')
);

// Production Supabase instance or mock client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOtp: async ({ phone }) => {
          console.info(`[MOCK SUPABASE] Mock SMS OTP sent to ${phone}. Use code: 123456 in dev mode.`);
          return { data: { message: 'OTP sent successfully (Dev Mock)' }, error: null };
        },
        verifyOtp: async ({ phone, token }) => {
          if (token === '123456' || token.length === 6) {
            return {
              data: {
                user: { id: '11111111-1111-1111-1111-111111111111', phone },
                session: { access_token: 'mock-supabase-jwt-token' }
              },
              error: null
            };
          }
          return { data: { user: null, session: null }, error: new Error('Invalid verification code.') };
        },
        signOut: async () => ({ error: null }),
      },
      from: (table) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            data: [],
            error: null
          }),
          data: [],
          error: null
        }),
        insert: async (data) => ({ data, error: null }),
        update: async (data) => ({ data, error: null }),
        delete: async () => ({ error: null }),
      }),
      storage: {
        from: (bucket) => ({
          upload: async (path, file) => ({ data: { path }, error: null }),
          getPublicUrl: (path) => ({ data: { publicUrl: path } }),
        })
      }
    };

export default supabase;

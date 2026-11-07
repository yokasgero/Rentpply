import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Publishable keys are designed for browser use. Never put a secret/service role key here.
export const supabase = url && publishableKey
  ? createClient(url, publishableKey)
  : null;

// Auth helpers
export const auth = {
  // Sign up with email/password and metadata (role)
  async signUp(email, password, metadata = {}) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name || email.split('@')[0],
          phone: metadata.phone || '',
          role: ['owner', 'student'].includes(metadata.role) ? metadata.role : 'tenant',
          is_student: metadata.role === 'student' || metadata.is_student === true
        },
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign in with email/password
  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  async getSession() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Get current user
  async getUser() {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Profile helpers
export const profiles = {
  // Get current user's profile
  async getCurrent() {
    if (!supabase) return null;
    const user = await auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  },

  // Get profile by ID
  async getById(id) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Update profile
  async update(id, updates) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Listings helpers
export const listings = {
  // Get all verified listings (public)
  async getVerified(filters = {}) {
    if (!supabase) return [];
    let query = supabase
      .from('listings')
      .select('*')
      .eq('verified', true);

    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }
    if (filters.area) {
      query = query.ilike('area', `%${filters.area}%`);
    }
    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,area.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get all listings (admin/owner)
  async getAll(filters = {}) {
    if (!supabase) return [];
    let query = supabase.from('listings').select('*');

    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }
    if (filters.ownerId) {
      query = query.eq('owner_id', filters.ownerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get listing by ID
  async getById(id) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Get listing with media
  async getWithMedia(id) {
    if (!supabase) return null;
    const [listingRes, mediaRes] = await Promise.all([
      supabase.from('listings').select('*').eq('id', id).single(),
      supabase.from('listing_media').select('*').eq('listing_id', id).order('sort_order')
    ]);
    if (listingRes.error) throw listingRes.error;
    return { ...listingRes.data, media: mediaRes.data || [] };
  },

  // Create listing (owner)
  async create(listing) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('listings')
      .insert({ ...listing, owner_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update listing (owner)
  async update(id, updates) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Units helpers
export const units = {
  // Get units for a listing
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('listing_id', listingId)
      .order('unit_code');
    if (error) throw error;
    return data || [];
  },

  // Get unit by ID
  async getById(id) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Update unit (owner)
  async update(id, updates) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('units')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Create unit (owner)
  async create(unit) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Bookings helpers
export const bookings = {
  // Get bookings for current user (tenant)
  async getMyBookings() {
    if (!supabase) return [];
    const user = await auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get bookings for a listing (owner)
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get booking by ID
  async getById(id) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Create booking
  async create(booking) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('bookings')
      .insert({ ...booking, tenant_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Payments helpers
export const payments = {
  // Get payments for current user (tenant)
  async getMyPayments() {
    if (!supabase) return [];
    const user = await auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get payments for a listing (owner)
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get pending payments for owner's listing
  async getPendingByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('listing_id', listingId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Create payment
  async create(payment) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('payments')
      .insert({ ...payment, tenant_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Confirm payment (owner)
  async confirm(id, updates = {}) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('payments')
      .update({ ...updates, status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Reject payment (owner)
  async reject(id) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Agreements helpers
export const agreements = {
  // Get agreements for current user (tenant)
  async getMyAgreements() {
    if (!supabase) return [];
    const user = await auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get agreements for a listing (owner)
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get agreement by ID
  async getById(id) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Create agreement (owner)
  async create(agreement) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('agreements')
      .insert(agreement)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update agreement
  async update(id, updates) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('agreements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Accept agreement (tenant)
  async accept(id) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('agreements')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Maintenance helpers
export const maintenance = {
  // Get maintenance requests for current user (tenant)
  async getMyRequests() {
    if (!supabase) return [];
    const user = await auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get maintenance requests for a listing (owner)
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get open maintenance requests for a listing
  async getOpenByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('listing_id', listingId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Create maintenance request (tenant)
  async create(request) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({ ...request, tenant_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update maintenance request status (owner)
  async updateStatus(id, status) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Bills helpers (owner)
export const bills = {
  // Get bills for a listing
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('listing_id', listingId)
      .order('due_date');
    if (error) throw error;
    return data || [];
  },

  // Create bill
  async create(bill) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('bills')
      .insert(bill)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update bill
  async update(id, updates) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('bills')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete bill
  async delete(id) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) throw error;
  }
};

// Roommate matching helpers
export const roommates = {
  // Get all verified roommate profiles
  async getProfiles(filters = {}) {
    if (!supabase) return [];
    let query = supabase
      .from('roommate_profiles')
      .select('*, profiles!inner(*)')
      .eq('is_verified', true);

    if (filters.gender && filters.gender !== 'any') {
      query = query.eq('gender', filters.gender);
    }
    if (filters.maxBudget) {
      query = query.lte('budget', filters.maxBudget);
    }
    if (filters.sleep) {
      query = query.eq('sleep', filters.sleep);
    }
    if (filters.study) {
      query = query.eq('study', filters.study);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get current user's roommate profile
  async getMyProfile() {
    if (!supabase) return null;
    const user = await auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('roommate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Create/update roommate profile
  async upsert(profile) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('roommate_profiles')
      .upsert({ ...profile, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Send roommate request
  async sendRequest(toUserId) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('roommate_requests')
      .insert({ from_user_id: user.id, to_user_id: toUserId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get roommate requests for current user
  async getMyRequests() {
    if (!supabase) return [];
    const user = await auth.getUser();
    if (!user) return [];
    const [sent, received] = await Promise.all([
      supabase.from('roommate_requests').select('*, to_user:profiles!to_user_id(*)').eq('from_user_id', user.id),
      supabase.from('roommate_requests').select('*, from_user:profiles!from_user_id(*)').eq('to_user_id', user.id)
    ]);
    return { sent: sent.data || [], received: received.data || [] };
  }
};

// Rent transfers helpers
export const rentTransfers = {
  // Get available transfers for a listing
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('rent_transfers')
      .select('*, bookings(*)')
      .eq('listing_id', listingId)
      .eq('status', 'listed')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Create rent transfer listing
  async create(transfer) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('rent_transfers')
      .insert({ ...transfer, requester_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Owner requests helpers (admin/owner)
export const ownerRequests = {
  // Get owner requests for a listing
  async getByListing(listingId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('owner_requests')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Update request status
  async updateStatus(id, status) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('owner_requests')
      .update({ status, resolved_at: status !== 'open' ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Admin queue helpers
export const adminQueue = {
  // Get all admin queue items
  async getAll() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('admin_queue')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Update queue item status
  async updateStatus(id, status) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('admin_queue')
      .update({ status, resolved_at: status !== 'open' ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Notifications helpers
export const notifications = {
  // Get notifications for current user
  async getMyNotifications(limit = 50) {
    if (!supabase) return [];
    const user = await auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // Mark as read
  async markRead(id) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Saved listings helpers
export const savedListings = {
  // Get saved listings for current user
  async getMySaved() {
    if (!supabase) return [];
    const user = await auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('saved_listings')
      .select('*, listings(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Save/unsave listing
  async toggle(listingId) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single();

    if (existing) {
      await supabase.from('saved_listings').delete().eq('id', existing.id);
      return false; // unsaved
    } else {
      await supabase.from('saved_listings').insert({ user_id: user.id, listing_id: listingId });
      return true; // saved
    }
  },

  // Check if saved
  async isSaved(listingId) {
    if (!supabase) return false;
    const user = await auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single();
    return !!data;
  }
};

// KYC helpers
export const kyc = {
  // Get current user's KYC status
  async getMyKyc() {
    if (!supabase) return null;
    const user = await auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('kyc_status, id_type, id_number_masked, id_document_url, selfie_url, student_proof_url, next_of_kin_name, next_of_kin_phone')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  },

  // Submit KYC (updates profile)
  async submit(data) {
    if (!supabase) throw new Error('Supabase not configured');
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: result, error } = await supabase
      .from('profiles')
      .update({
        ...data,
        kyc_status: 'review',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }
};

window.dispatchEvent(new CustomEvent('rentpply:supabase-ready', {
  detail: { configured: Boolean(supabase) },
}));

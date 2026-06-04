# FlowDesk Pro — Supabase Table Schema Reference

**Generated:** 2026-05-21  
**Purpose:** Compare and create missing tables in your new Supabase instance

---

## 🔴 CRITICAL: Missing Tables (Why Dashboard Stopped Working)

Your migrated site references these tables that may not exist in the new Supabase instance:

### 1. **`leads`** ← PRIMARY (Call Records)
**Used by:** `call.js`, `flowdesk-private-demo-leads.js`, `demo-dashboard.html`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT UNIQUE NOT NULL,
  caller_phone TEXT,
  caller_name TEXT,
  full_name TEXT,
  summary TEXT,
  intent TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  industry TEXT,
  transcript TEXT,
  language TEXT DEFAULT 'en',
  call_sid TEXT UNIQUE,
  is_demo BOOLEAN DEFAULT false,
  demo_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT urgency_valid CHECK (urgency IN ('low', 'medium', 'high'))
);

-- Add indexes
CREATE INDEX idx_leads_is_demo ON leads(is_demo);
CREATE INDEX idx_leads_demo_ref ON leads(demo_ref);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_call_sid ON leads(call_sid);
```

**Sample Record:**
```json
{
  "lead_id": "FD-abc123xyz789",
  "caller_phone": "+17025551234",
  "caller_name": "John Smith",
  "full_name": "John Smith",
  "summary": "Inquiry about AI receptionist for dental office",
  "intent": "Wants to schedule demo",
  "urgency": "high",
  "industry": "Healthcare",
  "transcript": "Hi, my name is John Smith. I'm calling about your AI receptionist...",
  "language": "en",
  "call_sid": "CA1234567890abcdefghijklmnop",
  "is_demo": true,
  "demo_ref": "john-smith-dental",
  "created_at": "2026-05-21T14:30:00Z"
}
```

---

### 2. **`call_logs`** ← Call Transcripts
**Used by:** `call.js` (detailed logging)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS call_logs (
  id BIGSERIAL PRIMARY KEY,
  call_sid TEXT UNIQUE NOT NULL,
  lead_id TEXT,
  caller_phone TEXT,
  to_phone TEXT,
  transcript_raw TEXT,
  transcript_cleaned TEXT,
  ai_extracted JSON,
  confidence NUMERIC(3,2),
  duration_seconds INTEGER,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE
);

CREATE INDEX idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX idx_call_logs_call_sid ON call_logs(call_sid);
```

---

### 3. **`flowdesk_intake_records`** ← Web Intake Forms
**Used by:** `flowdesk-submit-intake.js`, `flowdesk-voice-intake.js`, `flowdesk-leads.js`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS flowdesk_intake_records (
  id BIGSERIAL PRIMARY KEY,
  intake_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT NOT NULL,
  industry TEXT,
  request_type TEXT,
  service_needed TEXT,
  urgency TEXT DEFAULT 'Normal' CHECK (urgency IN ('Low', 'Normal', 'Time-sensitive', 'Urgent')),
  preferred_contact_method TEXT,
  preferred_callback_time TEXT,
  sms_consent BOOLEAN DEFAULT false,
  sms_consent_text TEXT,
  details TEXT,
  notes TEXT,
  ai_summary TEXT,
  category TEXT,
  lead_status TEXT DEFAULT 'New / Needs Review' CHECK (lead_status IN ('New / Needs Review', 'New / Priority Review', 'In Progress', 'Closed / Resolved')),
  follow_up_needed BOOLEAN DEFAULT true,
  next_action TEXT,
  source_page TEXT DEFAULT 'flowdesk-intake-engine',
  internal_notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intake_created_at ON flowdesk_intake_records(created_at DESC);
CREATE INDEX idx_intake_source_page ON flowdesk_intake_records(source_page);
CREATE INDEX idx_intake_status ON flowdesk_intake_records(lead_status);
```

---

### 4. **`demo_requests`** ← Demo Signup Profiles
**Used by:** `demo-request.js`, `flowdesk-voice-intake.js` (lookup)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS demo_requests (
  id BIGSERIAL PRIMARY KEY,
  ref_slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  demo_link_expires_at TIMESTAMP WITH TIME ZONE,
  contacted BOOLEAN DEFAULT false,
  contacted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_demo_ref_slug ON demo_requests(ref_slug);
CREATE INDEX idx_demo_phone ON demo_requests(phone);
```

---

## ✅ OPTIONAL: Additional Tables (for full feature set)

### 5. **`portal_users`** ← Dashboard Authentication
**Used by:** `auth-login.js`, `auth-claim.js`

```sql
CREATE TABLE IF NOT EXISTS portal_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);
```

---

### 6. **`subscriptions`** ← Stripe Payment Records
**Used by:** `stripe-webhook.js`

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  email TEXT NOT NULL,
  plan TEXT,
  status TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔍 Quick Comparison: Old vs New

```markdown
OLD INSTANCE (flowdeskpro-lead-manager)
├── ✓ flowdesk_intake_records
├── ? leads (may exist)
├── ? call_logs (may exist)
└── ? demo_requests (may exist)

NEW INSTANCE (NewAI-FLOWDESK-PRO) ← MIGRATE THESE
├── ✓ flowdesk_intake_records (MUST EXIST)
├── ❌ leads (MISSING - CREATES DASHBOARD FAILURE)
├── ❌ call_logs (MISSING - call details not logged)
└── ❌ demo_requests (MISSING - demo lookup fails)
```

---

## 📋 Setup Instructions

### Step 1: Check What Exists
In your **new Supabase instance**, go to **SQL Editor** and run:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public' 
ORDER BY table_name;
```

**Expected output if complete:**
- call_logs
- demo_requests
- flowdesk_intake_records
- leads
- portal_users (optional)
- subscriptions (optional)

### Step 2: Create Missing Tables

If `leads` table is missing, run this in SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT UNIQUE NOT NULL,
  caller_phone TEXT,
  caller_name TEXT,
  full_name TEXT,
  summary TEXT,
  intent TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  industry TEXT,
  transcript TEXT,
  language TEXT DEFAULT 'en',
  call_sid TEXT UNIQUE,
  is_demo BOOLEAN DEFAULT false,
  demo_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_is_demo ON leads(is_demo);
CREATE INDEX idx_leads_demo_ref ON leads(demo_ref);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_call_sid ON leads(call_sid);
```

If `call_logs` is missing:

```sql
CREATE TABLE IF NOT EXISTS call_logs (
  id BIGSERIAL PRIMARY KEY,
  call_sid TEXT UNIQUE NOT NULL,
  lead_id TEXT,
  caller_phone TEXT,
  to_phone TEXT,
  transcript_raw TEXT,
  transcript_cleaned TEXT,
  ai_extracted JSON,
  confidence NUMERIC(3,2),
  duration_seconds INTEGER,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_call_logs_lead_id ON call_logs(lead_id);
```

If `demo_requests` is missing:

```sql
CREATE TABLE IF NOT EXISTS demo_requests (
  id BIGSERIAL PRIMARY KEY,
  ref_slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_demo_ref_slug ON demo_requests(ref_slug);
```

### Step 3: Verify

Run the query from Step 1 again to confirm all tables exist.

### Step 4: Test the Dashboard

1. Go to your new site's demo dashboard
2. Make a test call to `(702) 710-2622`
3. Check if records appear in the dashboard
4. Check Netlify function logs for any errors

---

## 🐛 Troubleshooting

**Dashboard still empty?**
- Check Netlify function logs: `flowdesk-private-demo-leads`
- Verify `is_demo=true` records exist in `leads` table
- Confirm `demo_ref` parameter is being passed

**"Unable to load call records" error?**
- The `leads` table exists but is empty
- Check that `call.js` function is running (test call to 702-710-2622)
- Check Netlify logs for `call.js` errors

**Old records not showing?**
- You need to migrate records from old Supabase to new one
- Use Supabase export/import feature or run INSERT scripts

---

## ✅ Final Checklist

- [ ] Listed all tables in new Supabase
- [ ] Created missing `leads` table
- [ ] Created missing `call_logs` table
- [ ] Created missing `demo_requests` table
- [ ] Verified environment variables point to new instance
- [ ] Made test call to (702) 710-2622
- [ ] Dashboard displays new records

CREATE TYPE action_source AS ENUM ('HOUR_OF_ACTION', 'ANYTIME_ACTION');
CREATE TYPE action_intent AS ENUM ('ADVOCACY', 'ELECTORAL');
CREATE TYPE action AS ENUM (
  'PHONE_CALLS',
  'CONSTITUENT_LETTERS',
  'PERSONAL_MEETING',
  'SOCIAL_MEDIA_CONTACT',
  'TOWN_HALL',
  'LOBBY_MEETING',
  'RELATIONAL_ORGANIZING_PERSONAL_MESSAGE',
  'RELATIONAL_ORGANIZING_SOCIAL_MEDIA',
  'BLOG_POST',
  'ARTICLE_BY_REPORTER',
  'PODCAST',
  'TV_BROADCAST',
  'LETTER_TO_THE_EDITOR',
  'OP_ED',
  'EDITORIAL'
);
CREATE TYPE audience AS ENUM (
  'PERSONAL_NETWORK',
  'POLICYMAKER',
  'STAKEHOLDER',
  'PUBLIC'
);
CREATE TYPE hoa_event_type as ENUM (
  'ADV_PERSONALIZE_TALKING_POINTS_AND_PERSONAL_NETWORK_OUTREACH',
  'ADV_POLICYMAKER_OUTREACH',
  'ADV_KEY_STAKEHOLDER_AND_PUBLIC_OUTREACH',
  'ADV_CLIMATE_CONVERSATION_WITH_POLICYMAKER',
  'ELECTORAL'
);

CREATE TABLE IF NOT EXISTS actions_raw (
  email CITEXT,
  full_name VARCHAR(256),
  date DATE NOT NULL,
  action action NOT NULL,
  intent action_intent NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0),
  source action_source NOT NULL,
  audience audience,
  other_form_inputs JSONB,
  form_response_id VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS hoa_events (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  campaign VARCHAR(256) NOT NULL,
  type hoa_event_type NOT NULL
);

CREATE TABLE IF NOT EXISTS luma_attendance (
  event_id INTEGER REFERENCES hoa_events(id) ON DELETE RESTRICT,
  email CITEXT NOT NULL,
  signedup_at TIMESTAMPTZ,
  did_join_event BOOL NOT NULL,
  UNIQUE (event_id, email)
);

CREATE TABLE IF NOT EXISTS contacts (
  email VARCHAR(256),
  airtable_id VARCHAR(256),
  first_name VARCHAR(256),
  last_name VARCHAR(256),
  slack_member_id VARCHAR(256),
  signup_date TIMESTAMPTZ,
  slack_joined_date TIMESTAMPTZ,
  slack_last_active_date TIMESTAMPTZ,
  state VARCHAR(32),
  referred_by VARCHAR(256),
  1_1_status VARCHAR(256),
  1_1_greeter VARCHAR(256),
  is_experienced BOOLEAN,
);
CREATE UNIQUE INDEX idx_airtable_id ON contacts (airtable_id);
ALTER TABLE contacts ADD CONSTRAINT unique_airtable_id UNIQUE USING INDEX idx_airtable_id;

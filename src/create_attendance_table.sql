CREATE TABLE attendance_preview (
  airtable_id VARCHAR(256) REFERENCES contacts(airtable_id) ON DELETE RESTRICT,
  action_date DATE NOT NULL,
  action_source VARCHAR(256) NOT NULL,
  action VARCHAR(256) NOT NULL,
  hoa_week DATE NOT NULL
);
# CREATE UNIQUE INDEX idx_airtable_id ON contacts (airtable_id);
# ALTER TABLE contacts ADD CONSTRAINT unique_airtable_id UNIQUE USING INDEX idx_airtable_id;
  # email?
  # reference email instead? email as primary key?
  # email in contacts needs to be canonicalized
  # ideally hoa_week should be computed.

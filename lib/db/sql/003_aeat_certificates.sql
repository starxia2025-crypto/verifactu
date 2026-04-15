create table if not exists aeat_certificates (
  id serial primary key,
  taxpayer_id integer not null references taxpayer_profiles(id),
  status text not null default 'INACTIVE',
  original_file_name text not null,
  stored_file_path text not null,
  encrypted_password text not null,
  subject text,
  issuer text,
  serial_number text,
  valid_from timestamptz,
  valid_to timestamptz,
  nif text,
  has_private_key boolean not null default false,
  fingerprint_sha256 text,
  use_seal_certificate_endpoint boolean not null default false,
  uploaded_by_user_id integer references users(id),
  uploaded_at timestamptz not null default now(),
  activated_at timestamptz,
  deactivated_at timestamptz,
  last_validation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aeat_certificates_taxpayer_idx on aeat_certificates(taxpayer_id);
create index if not exists aeat_certificates_status_idx on aeat_certificates(status);
create index if not exists aeat_certificates_fingerprint_idx on aeat_certificates(fingerprint_sha256);

create unique index if not exists aeat_certificates_one_active_per_taxpayer
  on aeat_certificates(taxpayer_id)
  where status = 'ACTIVE';

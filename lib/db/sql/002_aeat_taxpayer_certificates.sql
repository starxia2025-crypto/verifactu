alter table taxpayer_profiles
  add column if not exists aeat_certificate_path text,
  add column if not exists aeat_certificate_file_name text,
  add column if not exists aeat_certificate_password_encrypted text,
  add column if not exists aeat_certificate_uploaded_at timestamptz,
  add column if not exists aeat_use_seal_certificate_endpoint boolean not null default false;

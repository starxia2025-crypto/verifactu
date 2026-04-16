update organizations
set type = 'asesoria'
where type = 'gestoria';

alter table taxpayer_profiles
add column if not exists is_primary boolean not null default false;

with first_taxpayer as (
  select distinct on (tp.organization_id)
    tp.id
  from taxpayer_profiles tp
  inner join organizations o on o.id = tp.organization_id
  where o.type in ('autonomo', 'empresa')
    and tp.is_active = true
  order by tp.organization_id, tp.created_at asc, tp.id asc
)
update taxpayer_profiles tp
set is_primary = true
from first_taxpayer ft
where tp.id = ft.id
  and not exists (
    select 1
    from taxpayer_profiles existing
    where existing.organization_id = tp.organization_id
      and existing.is_primary = true
  );

create unique index if not exists taxpayer_profiles_one_primary_per_org
on taxpayer_profiles(organization_id)
where is_primary = true;

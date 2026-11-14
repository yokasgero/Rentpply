-- The super user gets its own role, so the database can tell it apart from an administrator.
-- (A new enum value has to be committed before it can be used, so this runs on its own.)
alter type public.user_role add value if not exists 'super';

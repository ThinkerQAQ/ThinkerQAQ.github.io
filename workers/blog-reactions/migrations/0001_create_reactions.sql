create table if not exists reactions (
  content_type text not null,
  content_id text not null,
  reaction_type text not null default 'helpful',
  visitor_hash text not null,
  created_at integer not null default (unixepoch()),
  primary key (content_type, content_id, reaction_type, visitor_hash)
) without rowid;

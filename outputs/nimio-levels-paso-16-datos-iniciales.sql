insert into projects(name)
values
  ('NIO Modular Infrastructure'),
  ('Agencia'),
  ('Podcasts'),
  ('Audio and Waves'),
  ('Proyecto Taylor'),
  ('Productos y paquetes'),
  ('Branding NIO'),
  ('Registro de marca')
on conflict (name) do nothing;

insert into levels(rank, name, min_points, max_points, message)
values
  (1, 'Inicio', 0, 49, 'Primer modulo activado. Entra al sistema y empieza a sumar.'),
  (2, 'Activo', 50, 149, 'Ya estas generando traccion visible.'),
  (3, 'Pro', 150, 299, 'Tu consistencia ya pesa en el avance del equipo.'),
  (4, 'Elite', 300, 499, 'Ritmo alto, ejecucion solida y criterio propio.'),
  (5, 'Lider', 500, 799, 'Tu progreso empuja a otros a subir.'),
  (6, 'Leyenda', 800, null, 'Nivel maximo configurado. Tu historial ya habla fuerte.')
on conflict (rank) do update set
  name = excluded.name,
  min_points = excluded.min_points,
  max_points = excluded.max_points,
  message = excluded.message;

insert into rewards(name, description, reward_type, points_required, value_mxn, is_active)
values
  ('Bono basico', 'Bono economico inicial para canje rapido.', 'money', 100, 150, true),
  ('Bono medio', 'Recompensa economica para avances consistentes.', 'money', 250, 450, true),
  ('Bono alto', 'Bono para contribuciones fuertes o acumuladas.', 'money', 500, 1000, true),
  ('Bono premium', 'Canje premium por desempeño sostenido.', 'money', 800, 1800, true),
  ('Bono maximo', 'Canje superior para hitos grandes.', 'money', 1200, 3000, true)
on conflict do nothing;

insert into system_settings(key, value)
values ('point_value_mxn', '{"mxn": 0}'::jsonb)
on conflict (key) do nothing;

do $$
declare
  demian_member_id uuid;
  amy_id uuid;
  david_id uuid;
  jorge_id uuid;
  megg_id uuid;
  agencia_id uuid;
  podcasts_id uuid;
  nio_id uuid;
begin
  insert into members(full_name, area, role_title, email, status, private_notes)
  values
    ('Demian', 'Administracion', 'Administrador', null, 'active', 'Dato semilla. Puedes borrar o editar.'),
    ('Amy', 'Agencia', 'Contenido', null, 'active', 'Dato semilla. Codigo de prueba: AMY-4P9X'),
    ('David', 'Podcasts', 'Produccion', null, 'active', 'Dato semilla. Codigo de prueba: DAVID-7MQR'),
    ('Jorge', 'Diseno y renders', 'Renders', null, 'active', 'Dato semilla. Codigo de prueba: JORGE-8F2K'),
    ('Megg', 'Diseno y producto', 'Producto', null, 'active', 'Dato semilla. Codigo de prueba: MEGG-5NIO')
  on conflict do nothing;

  select id into demian_member_id from members where full_name = 'Demian' limit 1;
  select id into amy_id from members where full_name = 'Amy' limit 1;
  select id into david_id from members where full_name = 'David' limit 1;
  select id into jorge_id from members where full_name = 'Jorge' limit 1;
  select id into megg_id from members where full_name = 'Megg' limit 1;

  perform admin_issue_access_code(demian_member_id, 'DEMIAN-9ADM', null);
  perform admin_issue_access_code(amy_id, 'AMY-4P9X', null);
  perform admin_issue_access_code(david_id, 'DAVID-7MQR', null);
  perform admin_issue_access_code(jorge_id, 'JORGE-8F2K', null);
  perform admin_issue_access_code(megg_id, 'MEGG-5NIO', null);

  select id into agencia_id from projects where name = 'Agencia';
  select id into podcasts_id from projects where name = 'Podcasts';
  select id into nio_id from projects where name = 'NIO Modular Infrastructure';

  insert into point_movements(member_id, movement_type, points, project_id, reason, status, approved_by_admin_id, comment)
  values
    (amy_id, 'manual_points_added', 120, agencia_id, 'Puntos semilla por entregas de contenido', 'approved', null, 'Dato de prueba'),
    (david_id, 'manual_points_added', 80, podcasts_id, 'Puntos semilla por produccion de podcast', 'approved', null, 'Dato de prueba'),
    (jorge_id, 'manual_points_added', 240, nio_id, 'Puntos semilla por renders aprobados', 'approved', null, 'Dato de prueba'),
    (megg_id, 'manual_points_added', 180, nio_id, 'Puntos semilla por desarrollo de producto', 'approved', null, 'Dato de prueba')
  on conflict do nothing;

  insert into point_requests(member_id, project_id, activity, achievement_type, suggested_points, evidence_url, comment, request_fingerprint, status)
  values
    (jorge_id, nio_id, 'Render aprobado antes de fecha', 'Entrega antes de fecha', 15, 'https://example.com/evidencia-render', 'Solicitud semilla', encode(digest('jorge-render-seed', 'sha256'), 'hex'), 'pending_review'),
    (amy_id, agencia_id, 'Calendario de contenidos entregado', 'Entrega completa a tiempo', 10, 'https://example.com/evidencia-contenido', 'Solicitud semilla', encode(digest('amy-contenido-seed', 'sha256'), 'hex'), 'pending_review')
  on conflict do nothing;
end $$;

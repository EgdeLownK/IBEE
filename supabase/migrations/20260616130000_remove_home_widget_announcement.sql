-- Retrait du widget bannière + réordonnancement logique (positions réécrites côté app au prochain sync)

DELETE FROM entity_home_widgets
WHERE type = 'widget_announcement';

-- Ajoute le type vidéo aux médias de publication (news).
ALTER TYPE publication_media_type ADD VALUE IF NOT EXISTS 'video';

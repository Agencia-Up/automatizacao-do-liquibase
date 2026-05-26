-- Logos IA — campos extras para carrosséis
ALTER TABLE carousels ADD COLUMN contextExtra TEXT;
ALTER TABLE carousels ADD COLUMN channelName TEXT;
ALTER TABLE carousels ADD COLUMN channelHandle TEXT;
ALTER TABLE carousels ADD COLUMN profileUrl TEXT;
ALTER TABLE carousels ADD COLUMN coverUrl TEXT;
ALTER TABLE carousels ADD COLUMN ctaText TEXT;
ALTER TABLE carousels ADD COLUMN accent TEXT NOT NULL DEFAULT '#F97316';
ALTER TABLE carousels ADD COLUMN accent2 TEXT NOT NULL DEFAULT '#FDBA74';

-- Dernier ecart trouve lors de la preuve finale (re-diff d'empreintes apres
-- le merge de chore/capture-remaining-drift) : bookings_owner_select et
-- bookings_public_insert sont scopees TO anon, authenticated en prod, alors
-- que les migrations (20260415200000, 20260416100000) les creent sans
-- clause TO (donc role "public" implicite). Benin fonctionnellement -- seuls
-- anon/authenticated interrogent jamais via PostgREST avec RLS actif sur ce
-- projet -- mais aligne ici pour une empreinte de schema identique.

ALTER POLICY "bookings_owner_select" ON public.bookings TO anon, authenticated;
ALTER POLICY "bookings_public_insert" ON public.bookings TO anon, authenticated;

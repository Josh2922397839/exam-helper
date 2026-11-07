/* ExamForge settings.
   Leagues, schools, friends and cloud saves use the Supabase project below. The key is the PUBLIC
   publishable key (Supabase dashboard → Project Settings → API Keys): it's meant to be public, and the
   database only lets it call the safe ef_* functions in supabase/schema.sql.
   NEVER put a secret / service_role key here. Empty both values to run fully offline. */
window.EF_CONFIG = {
  supabaseUrl: 'https://waycwffzqqcbanuzunxr.supabase.co',
  supabaseKey: 'sb_publishable_S_lKOkEHfp11gKonwhSpog_FxsJbgxa'
};

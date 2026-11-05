/* ExamForge settings.
   To switch on leagues, schools, friends and cloud saves, paste your Supabase project's URL and its PUBLIC
   "anon" key below (Supabase dashboard → Project Settings → API). The anon key is meant to be public: the
   database only lets it call the safe ef_* functions in supabase/schema.sql.
   NEVER put the "service_role" key here. Leave both empty to run fully offline. */
window.EF_CONFIG = {
  supabaseUrl: '',
  supabaseKey: ''
};

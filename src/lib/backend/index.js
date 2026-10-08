import { supabase } from "../supabase";
import { local } from "./local";
import { remote } from "./remote";

// Supabase when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, otherwise the in-browser demo.
export const backend = supabase ? remote : local;

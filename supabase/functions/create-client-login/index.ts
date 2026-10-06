import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createClientLoginHandler } from './handler.ts';
Deno.serve(createClientLoginHandler(createClient, (key) => Deno.env.get(key)));

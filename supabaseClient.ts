import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnmlemprixvgbutacarp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubWxlbXByaXh2Z2J1dGFjYXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQzOTYsImV4cCI6MjA4NjQ2MDM5Nn0.pxFjVwp1HI7znGGon5KZztO0DINoZ9NJnj1HTcfXfH4';

export const supabase = createClient(supabaseUrl, supabaseKey);
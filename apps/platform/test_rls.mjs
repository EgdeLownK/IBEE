import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'; // Default for local, but this is a remote DB! Wait, I don't know the remote JWT secret!


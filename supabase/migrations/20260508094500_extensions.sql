-- Migration: extensions necessárias
-- pgcrypto: fornece gen_random_uuid() e digest() para SHA-256
-- pg_trgm: busca de texto por similaridade (útil em queries futuras)

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

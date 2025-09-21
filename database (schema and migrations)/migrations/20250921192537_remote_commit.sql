
\restrict 0LEH6V80NlhVf3ikkLeVtZ129p7KNRGZTadOGuf0EdPUCdlnANqY6V3q6rH95X0


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "user_id" integer,
    "action" character varying(50) NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "target_id" integer
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."file_shares" (
    "id" integer NOT NULL,
    "user_file_id" integer NOT NULL,
    "recipient_id" integer NOT NULL,
    "shared_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."file_shares" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."file_shares_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."file_shares_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."file_shares_id_seq" OWNED BY "public"."file_shares"."id";



CREATE TABLE IF NOT EXISTS "public"."physical_files" (
    "id" integer NOT NULL,
    "hash" character(64) NOT NULL,
    "storage_url" "text" NOT NULL,
    "public_id" "text" NOT NULL,
    "size" bigint NOT NULL,
    "mime_type" character varying(100) NOT NULL,
    "ref_count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."physical_files" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."physical_files_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."physical_files_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."physical_files_id_seq" OWNED BY "public"."physical_files"."id";



CREATE TABLE IF NOT EXISTS "public"."user_files" (
    "id" integer NOT NULL,
    "owner_id" integer NOT NULL,
    "physical_file_id" integer NOT NULL,
    "filename" character varying(255) NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "download_count" integer DEFAULT 0 NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_files" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_files_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_files_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_files_id_seq" OWNED BY "public"."user_files"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" integer NOT NULL,
    "username" character varying(50) NOT NULL,
    "password_hash" "text" NOT NULL,
    "name" character varying(100) NOT NULL,
    "role" character varying(20) DEFAULT 'user'::character varying NOT NULL,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."file_shares" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."file_shares_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."physical_files" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."physical_files_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_files" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_files_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_shares"
    ADD CONSTRAINT "file_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_shares"
    ADD CONSTRAINT "file_shares_user_file_id_recipient_id_key" UNIQUE ("user_file_id", "recipient_id");



ALTER TABLE ONLY "public"."physical_files"
    ADD CONSTRAINT "physical_files_hash_key" UNIQUE ("hash");



ALTER TABLE ONLY "public"."physical_files"
    ADD CONSTRAINT "physical_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "file_shares_recipient_id_idx" ON "public"."file_shares" USING "btree" ("recipient_id");



CREATE INDEX "physical_files_hash_idx" ON "public"."physical_files" USING "btree" ("hash");



CREATE INDEX "user_files_owner_id_idx" ON "public"."user_files" USING "btree" ("owner_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."file_shares"
    ADD CONSTRAINT "file_shares_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_shares"
    ADD CONSTRAINT "file_shares_user_file_id_fkey" FOREIGN KEY ("user_file_id") REFERENCES "public"."user_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_physical_file_id_fkey" FOREIGN KEY ("physical_file_id") REFERENCES "public"."physical_files"("id") ON DELETE RESTRICT;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."file_shares" TO "anon";
GRANT ALL ON TABLE "public"."file_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."file_shares" TO "service_role";



GRANT ALL ON SEQUENCE "public"."file_shares_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."file_shares_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."file_shares_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."physical_files" TO "anon";
GRANT ALL ON TABLE "public"."physical_files" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_files" TO "service_role";



GRANT ALL ON SEQUENCE "public"."physical_files_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."physical_files_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."physical_files_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_files" TO "anon";
GRANT ALL ON TABLE "public"."user_files" TO "authenticated";
GRANT ALL ON TABLE "public"."user_files" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_files_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_files_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_files_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























\unrestrict 0LEH6V80NlhVf3ikkLeVtZ129p7KNRGZTadOGuf0EdPUCdlnANqY6V3q6rH95X0

RESET ALL;

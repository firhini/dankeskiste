CREATE SEQUENCE "public"."order_nummer_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"marke" text DEFAULT '' NOT NULL,
	"groesse" text DEFAULT '' NOT NULL,
	"kategorie" text DEFAULT '' NOT NULL,
	"laden" text DEFAULT '' NOT NULL,
	"ersatz" text DEFAULT '' NOT NULL,
	"preis_cent" integer NOT NULL,
	"quelle_url" text DEFAULT '' NOT NULL,
	"quelle_hinweis" text DEFAULT '' NOT NULL,
	"geprueft_am" date NOT NULL,
	"status" text DEFAULT 'geschaetzt' NOT NULL,
	"gewicht_gramm" integer DEFAULT 0 NOT NULL,
	"mhd" text DEFAULT '' NOT NULL,
	"alkohol" boolean DEFAULT false NOT NULL,
	"alkohol_vol" text,
	"ersatz_ohne_alkohol_id" text,
	"allergene" text DEFAULT '' NOT NULL,
	"allergene_geprueft" boolean DEFAULT false NOT NULL,
	"zutaten" text DEFAULT '' NOT NULL,
	"saisonal" text,
	"bestand" integer DEFAULT 0 NOT NULL,
	"mindestbestand" integer DEFAULT 0 NOT NULL,
	"einstand_cent" integer,
	"render" jsonb,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "box_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"box_id" integer NOT NULL,
	"art" text DEFAULT 'foto' NOT NULL,
	"varianten" jsonb NOT NULL,
	"breite" integer NOT NULL,
	"hoehe" integer NOT NULL,
	"blur" text DEFAULT '' NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"platzhalter" boolean DEFAULT true NOT NULL,
	"sortierung" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "box_items" (
	"box_id" integer NOT NULL,
	"article_id" text NOT NULL,
	"menge" integer DEFAULT 1 NOT NULL,
	"sortierung" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "box_items_box_id_article_id_pk" PRIMARY KEY("box_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "box_packaging" (
	"box_id" integer NOT NULL,
	"packaging_id" text NOT NULL,
	"menge" numeric(8, 3) DEFAULT 1 NOT NULL,
	CONSTRAINT "box_packaging_box_id_packaging_id_pk" PRIMARY KEY("box_id","packaging_id")
);
--> statement-breakpoint
CREATE TABLE "boxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"collection_id" integer NOT NULL,
	"anlass" text DEFAULT '' NOT NULL,
	"zielgruppe" text DEFAULT '' NOT NULL,
	"kurz" text DEFAULT '' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"begruendung" text DEFAULT '' NOT NULL,
	"preis_cent" integer NOT NULL,
	"groesse" text DEFAULT 'mittel' NOT NULL,
	"pack_minuten" integer DEFAULT 6 NOT NULL,
	"bestseller" boolean DEFAULT false NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"sichtbar_von" date,
	"sichtbar_bis" date,
	"sortierung" integer DEFAULT 0 NOT NULL,
	"band" text DEFAULT 'oliv' NOT NULL,
	"seo_titel" text DEFAULT '' NOT NULL,
	"seo_beschreibung" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boxes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "campaign_scans" (
	"campaign_id" integer NOT NULL,
	"tag" date NOT NULL,
	"anzahl" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "campaign_scans_campaign_id_tag_pk" PRIMARY KEY("campaign_id","tag")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kanal" text DEFAULT 'flyer' NOT NULL,
	"ziel" text DEFAULT '/' NOT NULL,
	"kosten_cent" integer DEFAULT 0 NOT NULL,
	"rabatt_code" text,
	"notiz" text DEFAULT '' NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kurz" text DEFAULT '' NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"sortierung" integer DEFAULT 0 NOT NULL,
	"sichtbar_von" date,
	"sichtbar_bis" date,
	"aktiv" boolean DEFAULT true NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"art" text NOT NULL,
	"wert" integer NOT NULL,
	"gueltig_bis" timestamp with time zone,
	"max_einloesungen" integer,
	"stripe_coupon_id" text,
	"stripe_promotion_code_id" text,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"datum" date NOT NULL,
	"kategorie" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"betrag_cent" integer NOT NULL,
	"campaign_id" integer,
	"in_bestellkosten" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"art" text DEFAULT 'angebot' NOT NULL,
	"firma" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"telefon" text DEFAULT '' NOT NULL,
	"menge" text DEFAULT '' NOT NULL,
	"nachricht" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'offen' NOT NULL,
	"notiz" text DEFAULT '' NOT NULL,
	"kampagne" text
);
--> statement-breakpoint
CREATE TABLE "mail_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"an" text NOT NULL,
	"betreff" text NOT NULL,
	"art" text NOT NULL,
	"order_id" uuid,
	"status" text NOT NULL,
	"fehler" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"box_id" integer,
	"box_slug" text NOT NULL,
	"box_name" text NOT NULL,
	"groesse" text DEFAULT 'mittel' NOT NULL,
	"menge" integer NOT NULL,
	"listenpreis_cent" integer NOT NULL,
	"stueckpreis_cent" integer NOT NULL,
	"gewicht_gramm" integer DEFAULT 0 NOT NULL,
	"pack_minuten" integer DEFAULT 0 NOT NULL,
	"inhalt" jsonb NOT NULL,
	"verpackung" jsonb NOT NULL,
	"plan_artikel_cent" integer DEFAULT 0 NOT NULL,
	"plan_verpackung_cent" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"firma" text DEFAULT '' NOT NULL,
	"strasse" text NOT NULL,
	"zusatz" text DEFAULT '' NOT NULL,
	"plz" text NOT NULL,
	"ort" text NOT NULL,
	"box_slug" text NOT NULL,
	"menge" integer DEFAULT 1 NOT NULL,
	"sendungsnummer" text,
	"versendet_am" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nummer" text NOT NULL,
	"status" text DEFAULT 'offen' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bezahlt_am" timestamp with time zone,
	"eingekauft_am" timestamp with time zone,
	"gepackt_am" timestamp with time zone,
	"versendet_am" timestamp with time zone,
	"geliefert_am" timestamp with time zone,
	"firma" text NOT NULL,
	"ansprechpartner" text NOT NULL,
	"email" text NOT NULL,
	"telefon" text DEFAULT '' NOT NULL,
	"rechnung_strasse" text NOT NULL,
	"rechnung_zusatz" text DEFAULT '' NOT NULL,
	"rechnung_plz" text NOT NULL,
	"rechnung_ort" text NOT NULL,
	"lieferart" text NOT NULL,
	"liefer_name" text DEFAULT '' NOT NULL,
	"liefer_firma" text DEFAULT '' NOT NULL,
	"liefer_strasse" text DEFAULT '' NOT NULL,
	"liefer_zusatz" text DEFAULT '' NOT NULL,
	"liefer_plz" text DEFAULT '' NOT NULL,
	"liefer_ort" text DEFAULT '' NOT NULL,
	"termin" text DEFAULT 'schnell' NOT NULL,
	"ohne_alkohol" boolean DEFAULT false NOT NULL,
	"volljaehrig_bestaetigt" boolean DEFAULT false NOT NULL,
	"personalisierung" jsonb NOT NULL,
	"kunden_notiz" text DEFAULT '' NOT NULL,
	"interne_notiz" text DEFAULT '' NOT NULL,
	"waren_cent" integer NOT NULL,
	"staffel_rabatt_cent" integer DEFAULT 0 NOT NULL,
	"staffel_prozent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"personalisierung_cent" integer DEFAULT 0 NOT NULL,
	"rabatt_code_cent" integer DEFAULT 0 NOT NULL,
	"versand_cent" integer DEFAULT 0 NOT NULL,
	"summe_cent" integer NOT NULL,
	"rabatt_code" text,
	"pakete_anzahl" integer DEFAULT 0 NOT NULL,
	"gewicht_gramm" integer DEFAULT 0 NOT NULL,
	"plan_artikel_cent" integer DEFAULT 0 NOT NULL,
	"plan_verpackung_cent" integer DEFAULT 0 NOT NULL,
	"plan_perso_material_cent" integer DEFAULT 0 NOT NULL,
	"plan_versand_kosten_cent" integer DEFAULT 0 NOT NULL,
	"plan_gebuehr_cent" integer DEFAULT 0 NOT NULL,
	"bezahlt_cent" integer,
	"stripe_gebuehr_cent" integer,
	"echt_artikel_cent" integer,
	"echt_versand_kosten_cent" integer,
	"erstattet_cent" integer DEFAULT 0 NOT NULL,
	"stripe_session_id" text,
	"stripe_customer_id" text,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"stripe_rechnung_url" text,
	"stripe_rechnung_pdf" text,
	"campaign_id" integer,
	"utm" jsonb,
	"sendungsnummer" text,
	"b2b_bestaetigt" boolean DEFAULT false NOT NULL,
	"agb_akzeptiert_am" timestamp with time zone,
	CONSTRAINT "orders_nummer_unique" UNIQUE("nummer")
);
--> statement-breakpoint
CREATE TABLE "packaging_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"art" text DEFAULT 'karton' NOT NULL,
	"einheit" text DEFAULT 'Stück' NOT NULL,
	"preis_cent" integer NOT NULL,
	"gewicht_gramm" integer DEFAULT 0 NOT NULL,
	"lieferant" text DEFAULT '' NOT NULL,
	"quelle_url" text DEFAULT '' NOT NULL,
	"quelle_hinweis" text DEFAULT '' NOT NULL,
	"geprueft_am" date NOT NULL,
	"status" text DEFAULT 'geschaetzt' NOT NULL,
	"bestand" numeric(10, 3) DEFAULT 0 NOT NULL,
	"mindestbestand" numeric(10, 3) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"menge" integer NOT NULL,
	"stueckpreis_cent" integer NOT NULL,
	"laden" text DEFAULT '' NOT NULL,
	"gekauft_am" date NOT NULL,
	"notiz" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"schluessel" text NOT NULL,
	"fenster" timestamp with time zone NOT NULL,
	"anzahl" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_schluessel_fenster_pk" PRIMARY KEY("schluessel","fenster")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"wert" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" text,
	"packaging_id" text,
	"delta" numeric(10, 3) NOT NULL,
	"grund" text NOT NULL,
	"order_id" uuid,
	"notiz" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"typ" text NOT NULL,
	"verarbeitet_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_images" ADD CONSTRAINT "box_images_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_items" ADD CONSTRAINT "box_items_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_items" ADD CONSTRAINT "box_items_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_packaging" ADD CONSTRAINT "box_packaging_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_packaging" ADD CONSTRAINT "box_packaging_packaging_id_packaging_items_id_fk" FOREIGN KEY ("packaging_id") REFERENCES "public"."packaging_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_scans" ADD CONSTRAINT "campaign_scans_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_recipients" ADD CONSTRAINT "order_recipients_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "box_images_box_idx" ON "box_images" USING btree ("box_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_recipients_order_idx" ON "order_recipients" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_session_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "purchases_article_idx" ON "purchases" USING btree ("article_id");
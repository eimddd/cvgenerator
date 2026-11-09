# Monvia Office Docs

Web app for the office: client CVs (French, Arabic, English) and contracts built
from the office's Word templates (Arabic and French), saved in Supabase.

## Run locally

```
npm install
cp .env.example .env.local   # then put your Supabase URL and anon key in it
npm run dev
```

## Supabase setup (once)

1. SQL Editor → New query → paste `supabase/schema.sql` → Run.
2. Authentication → Sign In / Providers → Email: turn **off** "Allow new users to sign up".
3. Authentication → Users → **Add user** for each person in the office (email + password).
4. Authentication → URL Configuration: set the Site URL to the deployed address
   (needed for the "forgot password" e-mail).

## Contract templates

`src/templates/generated/` holds one JSON file per contract: the exact text,
fonts and layout extracted from the Word file, with the changing parts turned
into fields. They are produced by:

```
node scripts/dump-models.mjs <folder with the .docx copies>   # Word → layout models
node scripts/build-templates.mjs <same folder>                # models + specs → templates
```

`scripts/specs/` (kept out of git because it quotes the original filled-in
files) says, for each Word file, which text becomes which field.

## Printing and PDF

"Imprimer" and "PDF" both open the browser's print dialog with the document laid
out on A4 using the Word margins. To get a PDF, choose "Save as PDF" /
"Enregistrer au format PDF" as the printer.

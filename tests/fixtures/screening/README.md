# Synthetic screening documents

These PDF and DOCX files contain the same invented work history. They contain no real candidate data and are used only by the opt-in live extraction tests.

Expected evidence includes TypeScript API work, PostgreSQL, employment from 2020 to 2024, and Example University. Tests require those details to survive extraction and validate the resulting screening quotes against extracted text. The PDF was rendered and visually inspected; DOCX structure/text and actual provider extraction were checked, but local DOCX visual rendering was unavailable because bundled LibreOffice is absent.

Regenerate with `scripts/create-screening-document-fixtures.py` using the Codex bundled Python runtime with reportlab and python-docx. These are fixture-generation tools, not application dependencies.

`RECRUTA_RUN_AI_EVAL=1 npm run test:screening:live` runs six text screening cases and two document extraction/assessment cases, making ten billable provider calls. In PowerShell, set the variable with `$env:RECRUTA_RUN_AI_EVAL='1'` before the npm command. The dedicated command loads `.env.local` explicitly; Next.js otherwise excludes that file in test mode. The normal unit suite skips live calls.

On October 26, 2026, all eight cases passed against `gpt-6-luna` across separate screening and document runs. This narrow smoke evaluation is not a production accuracy or fairness benchmark.

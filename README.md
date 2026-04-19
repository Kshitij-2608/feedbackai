# FeedbackAI

This repository is prepared to move cleanly to another device. Installed libraries and generated build output can be recreated from the lockfiles and requirements already included in the project.

## Project Areas

- `frontend/`: Vite + React app
- `backend/`: Express + Prisma API
- `ml/`: Python ML workspace

## Move To Another Device

1. Copy the full `AI-CP` folder to the new machine.
2. Install the required runtimes:
   - Node.js 20+ and npm
   - Python 3.10+ with `pip`
   - PostgreSQL if you want to run the backend against a local database
3. Create environment files from the examples:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env`
4. Reinstall dependencies and start each part of the project.

## Reinstall Commands

### Backend

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### ML Workspace

```powershell
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python training/build_splits.py --source data/raw/feedback_turn_classification.jsonl --output-dir data/processed/feedback_turns
python training/train_multitask.py --train-file data/processed/feedback_turns/train.jsonl --val-file data/processed/feedback_turns/val.jsonl --model-name distilroberta-base --output-dir artifacts/distilroberta-feedback-model
```

## Notes

- Keep `package-lock.json` files and `ml/requirements.txt`; they are what make reinstalling reliable on another machine.
- Do not copy local `.env` files with real secrets unless you intentionally want the new device to use the same credentials.
- `PROJECT_STATUS.md` contains the current build status and recommended next steps for resuming work.

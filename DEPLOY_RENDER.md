# Deploy 1MINSPRINT on Render

## 1) Push code
- This repository must be on GitHub (already done).

## 2) Create service
- Open [Render Dashboard](https://dashboard.render.com/)
- Click **New +** -> **Blueprint**
- Select this GitHub repo: `dngkwon-prog/1MINSPRINT`
- Render will read `render.yaml` and create the web service.

## 3) Deploy
- Click **Apply** and wait for build/deploy.
- Open the generated service URL.

## 4) Verify app flow
- Register a new account
- Log in
- Subscribe newsletter
- (Admin account only) update user tier

## Notes
- SQLite is file-based and may reset on instance recycle in free environments.
- For production persistence, move to managed DB (PostgreSQL).

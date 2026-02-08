FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build /app/frontend/build ./static_frontend/

ENV FLASK_ENV=production
ENV DATABASE_URL=sqlite:///data/hausverwaltung.db

RUN sed -i "s|static_folder='../frontend/build'|static_folder='static_frontend'|" app.py

EXPOSE 5000
CMD ["python", "app.py"]

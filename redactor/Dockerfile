FROM python:3.7-alpine

WORKDIR /home/app

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY app.py app.py

ENV FLASK_APP app.py
EXPOSE 8000
CMD gunicorn -b :8000 --reload --access-logfile - --error-logfile - app:app
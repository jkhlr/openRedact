FROM python:3.7-alpine

WORKDIR /home/app

RUN apk add --upgrade python3-dev libstdc++ g++

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
RUN spacy download en_core_web_sm

COPY src redactor
COPY model model

ENV FLASK_APP app.py
EXPOSE 8000
CMD gunicorn -b :8000 --reload --access-logfile - --error-logfile - redactor.app:app
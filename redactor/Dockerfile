FROM python:3.7

WORKDIR /home/app

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
RUN spacy download en_core_web_sm

RUN pip install sklearn

COPY src redactor
COPY models model

EXPOSE 8000
CMD gunicorn -b :8000 --reload --access-logfile - --error-logfile - redactor.app:app
# openRedact - Automatic text redaction, powered by ML

## Dataset (`documents_100_annotated.json`)
This repository contains a dataset of 100 Wikipedia articles, which were redacted to remove personal identifiers. 
The dataset contains two levels of redaction:
- H0: Identifiers such as Name, E-Mail, Phonenumber etc., which can be used on their own to identify a person
- H1: Auxiluary information such as date of birth, employer or nationality, which can be combined to identify a person

## Data Format
The data is in JSON format, with 3 keys for each document:
- `text`: A list of words that comprises the document. The original text can be reconstructed by joining these words with a space character
- 'H0' A list of values (`0` or `1`), which indicates for each word if it is part of redaction level H0
- 'H1' A list of values (`0` or `1`), which indicates for each word if it is part of redaction level H1

## Redaction and Annotation Tool
THe tool that was built in order to create this dataset supports a collaborativ approach for data annotation. 
It can be used to redact example texts, and then train a classifier on this data. 
The output of this classifier can then interactively be tested on new texts
### Demo: https://annotator.jakobkoehler.de/
The application can be run out-of-the-box with Docker: `docker-compose up`

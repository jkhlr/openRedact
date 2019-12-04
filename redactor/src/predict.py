import string

import spacy
import pandas as pd

from . import MODEL_DIR


def predict_redaction_labels(words):
    # TODO: rewritten so that the last sentence without a period is not dropped
    myData = [
        sentence.strip()
        for sentence in ' '.join(words).split('.')
        if sentence.strip()
    ]
    data = pd.DataFrame(myData)
    print(data)
    data.columns=['Sentence']

    model_dir = f'{MODEL_DIR}/pretrained'
    nlp2 = spacy.load(model_dir)
    nlp = spacy.load('en_core_web_sm')

    table = str.maketrans(dict.fromkeys(string.punctuation))
    h0, h1 = [],  []
    for index, row in data.iterrows():
        sent_mymodel = nlp2(row['Sentence'])
        sent_inbuilt = nlp(row['Sentence'])
        entities = []
        for ent in sent_inbuilt.ents:
            if (ent.label_ == 'PERSON'):
                entities.append([ent, 'H0'])
            elif (ent.label_ == 'NORP'):
                entities.append([ent, 'H1'])
        for ent in sent_mymodel.ents:
            entities.append([ent, ent.label_])
        # TODO: strip() to avoid empty string for a sentence that ends with a space
        words = row['Sentence'].strip().split(" ")
        for word in words:
            entity_name = None
            for entity in entities:
                # TODO: because of check with 'in', the word 'a' is almost always redacted
                if (word.translate(table) in str(entity[0])):
                    entity_name = str(entity[1])
                    break

            if (entity_name != None):
                if (entity_name == 'H0'):
                    h0.append(1)
                else:
                    h0.append(0)
                h1.append(1)
            else:
                h0.append(0)
                h1.append(0)

    return h0, h1

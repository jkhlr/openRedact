import random
from collections import defaultdict

import joblib
import requests
import spacy
from dataclasses import dataclass

from sklearn.ensemble import RandomForestClassifier
from spacy.util import minibatch, compounding

from . import MODEL_DIR, get_label_vectors


def train_model(model_name, iterations):
    model_path = f'{MODEL_DIR}/{model_name}'
    print(f'Training {model_name}...')
    training_data = load_training_data()
    model = train_spacy(training_data, iterations=iterations)
    classifier = train_forest(training_data, model)
    model.meta["name"] = model_name
    model.to_disk(f'{model_path}/spacy')
    joblib.dump(classifier, f'{model_path}/randomforestmodel.pkl')
    print(f'Model {model_name} trained.')


def load_training_data():
    document_url = "http://frontend/jsonbox/documents/?limit=0"
    annotation_url = "http://frontend/jsonbox/annotations/?sort=_createdOn&limit=0"

    documents_data = requests.get(document_url).json()
    annotations_data = requests.get(annotation_url).json()

    annotation_map = defaultdict(list)
    for annotation in annotations_data:
        annotation_map[annotation['documentId']].append(annotation)

    documents = [
        {
            'text': d['text'],
            'annotations': [
                a['annotations']
                for a in annotation_map[d['_id']]
            ]
        }
        for d in documents_data
    ]

    def get_annotation_vector(text, annotations):
        annotation_vector = [0] * len(text.strip().split(' '))
        for annotation in annotations:
            if annotation['start'] == 0:
                start = 0
            else:
                start = len(text[:annotation['start']].strip().split(' '))
            num_words = len(annotation['text'].split(' '))
            for i in range(num_words):
                annotation_vector[start + i] = 1
        return annotation_vector

    fully_annotated_documents = [
        document for document in documents
        if len(document['annotations']) == 2
    ]

    documents_train = [{
        'text': document['text'].strip().split(' '),
        'H0': get_annotation_vector(document['text'], document['annotations'][0]),
        'H1': get_annotation_vector(document['text'], document['annotations'][1])
    } for document in fully_annotated_documents]

    for document in documents_train:
        document['H1'] = [
            int(bool(h0 + h1))
            for h0, h1 in zip(document['H0'], document['H1'])
        ]

    return documents_train


@dataclass
class Sentence:
    text: str
    entities: list


@dataclass
class Entity:
    label: str
    start_char: int
    end_char: int


def create_entities(words, annotation_dict):
    annotation_dict['H1'] = [
        0 if annotation_dict['H0'][i] else x
        for i, x in enumerate(annotation_dict['H1'])
    ]
    lengths = [0] + [len(word) + 1 for word in words]
    starts = [sum(lengths[:i + 1]) for i in range(len(lengths))]
    entity_start = None
    entities = []
    for label, annotations in annotation_dict.items():
        for i, annotation in enumerate(annotations):
            if entity_start is None:
                if annotation == 1:
                    entity_start = i
            else:
                if annotation == 0:
                    entities.append(
                        Entity(
                            label=label,
                            start_char=starts[entity_start],
                            end_char=starts[i] - 1
                        )
                    )
                    entity_start = None
        if entity_start is not None:
            entities.append(
                Entity(
                    label=label,
                    start_char=starts[entity_start],
                    end_char=starts[-1] - 1
                )
            )
    return ' '.join(words), entities


def transform_train_data(data):
    sentences = []
    for document in data:
        words = document['text']
        annotations = {
            'H0': document['H0'],
            'H1': document['H1']
        }

        sentence_start = 0
        sentence_words = []
        for i, word in enumerate(words):
            sentence_words.append(word)
            if word.endswith('.'):
                text, entities = create_entities(
                    words=sentence_words,
                    annotation_dict={
                        label: annotations[sentence_start:i + 1]
                        for label, annotations in annotations.items()
                    }
                )
                sentences.append(Sentence(text=text, entities=entities))
                sentence_words = []
                sentence_start = i + 1
        if sentence_words:
            text, entities = create_entities(
                words=sentence_words,
                annotation_dict={
                    label: annotations[sentence_start:]
                    for label, annotations in annotations.items()
                }
            )
            if text:
                sentences.append(Sentence(text=text, entities=entities))
    return sentences


def train_spacy(data, iterations):
    train_data = transform_train_data(data)

    nlp = spacy.blank("en")

    ner = nlp.create_pipe("ner")
    ner.add_label("H0")
    ner.add_label("H1")
    nlp.add_pipe(ner)

    optimizer = nlp.begin_training()

    # get names of other pipes to disable them during training
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    with nlp.disable_pipes(*other_pipes):  # only train NER
        sizes = compounding(1.0, 4.0, 1.001)
        # batch up the examples using spaCy's minibatch
        for _ in range(iterations):
            random.shuffle(train_data)
            batches = minibatch(train_data, size=sizes)
            losses = {}
            for batch in batches:
                texts = [sentence.text for sentence in batch]
                entities = [
                    {
                        'entities': [
                            (entity.start_char, entity.end_char, entity.label)
                            for entity in sentence.entities
                        ]
                    }
                    for sentence in batch
                ]
                nlp.update(texts, entities, sgd=optimizer, drop=0.35, losses=losses)

    return nlp


def train_forest(data, spacy_model, estimators=10):
    label_vectors = [
        vector
        for document in data
        for vector in get_label_vectors(
            words=document['text'],
            trained_model=spacy_model,
            ground_truth={'H0': document['H0'], 'H1': document['H1']}
        )
    ]
    x = [vector[:-1] for vector in label_vectors]
    y = [[vector[-1]] for vector in label_vectors]
    classifier = RandomForestClassifier(n_estimators=estimators, criterion='entropy')
    classifier.fit(x, y)
    return classifier




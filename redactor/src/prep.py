import spacy
import json
from dataclasses import dataclass

with open('../../documents_96_annotated.json') as f:
    documents = json.load(f)

tm = spacy.load('../models/pretrained')
sp = spacy.load('en_core_web_sm')

@dataclass
class Sentence:
    words: list
    start: int
    char_map: dict


def get_char_map(words):
    char_map = {}
    pos = 0
    for i, word in enumerate(words):
        for _ in word:
            char_map[pos] = i
            pos += 1
        # count space
        char_map[pos] = i + 1
        pos += 1
    return char_map

LABEL_POSITIONS = ['H0', 'H1', 'PERSON', 'NORP', 'FAC', 'ORG', 'GPE', 'LOC', 'PRODUCT', 'EVENT', 'WORK_OF_ART', 'LAW', 'LANGUAGE', 'DATE', 'TIME', 'PERCENT', 'MONEY', 'QUANTITY', 'ORDINAL', 'CARDINAL']

vectors = []
for document in documents:
    words = document['text']
    labels = [None]*len(words)
    sentences = []
    sentence_start = 0
    sentence_words = []
    for i, word in enumerate(words):
        sentence_words.append(word)
        if word.endswith('.'):
            sentences.append(Sentence(words=sentence_words, start=sentence_start, char_map=get_char_map(sentence_words)))
            sentence_words = []
            sentence_start = i + 1
    if sentence_words:
        sentences.append(Sentence(words=sentence_words, start=sentence_start, char_map=get_char_map(sentence_words)))

    for sentence in sentences:
        model = tm(' '.join(sentence.words))
        for entity in model.ents:
            for i in range(sentence.char_map[entity.start_char], sentence.char_map[entity.end_char]):
                start = sentence.start + i
                if labels[start] is None:
                    labels[start] = []
                labels[start].append(entity.label_)
        model = sp(' '.join(sentence.words))
        for entity in model.ents:
            for i in range(sentence.char_map[entity.start_char], sentence.char_map[entity.end_char]):
                start = sentence.start + i
                if labels[start] is None:
                    labels[start] = []
                if entity.label_ not in labels[start]:
                    labels[start].append(entity.label_)

    label_vector = [
        [
            int(label in label_list)
            if label_list
            else 0
            for label in LABEL_POSITIONS
        ] + [
            0 if document['H0'][i]
            else 1 if document['H1'][i]
            else 2
        ]
        for i, label_list in enumerate(labels)
    ]
    vectors.append(label_vector)

with open('../../labels_96_train.json', 'w') as f:
    json.dump(vectors, f)

